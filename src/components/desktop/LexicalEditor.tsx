/**
 * LexicalEditor — Éditeur de texte riche basé sur Lexical (Meta).
 *
 * Remplace RichTextEditor (Tiptap) dans TextBlockCard pour les modifications de séance.
 * - Input/Output en HTML (compatibilité avec les données existantes et RichTextDisplay)
 * - Fonctionnalités : Gras, Italique, H1, H2, listes, couleurs prédéfinies, Undo/Redo
 * - TypeScript natif, headless (styles Tailwind)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  createEditor,
  type LexicalEditor,
} from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingNode,
} from '@lexical/rich-text';
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $setBlocksType } from '@lexical/selection';
import { $getNearestNodeOfType } from '@lexical/utils';
import {
  Bold,
  Check,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo,
  Type,
  Undo,
  X,
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface LexicalEditorProps {
  /** Contenu HTML initial */
  value: string;
  /** Callback quand le contenu change (retourne du HTML) */
  onChange: (html: string) => void;
  /** Placeholder affiché quand l'éditeur est vide */
  placeholder?: string;
}

// ===========================================
// CONSTANTES
// ===========================================

const TEXT_COLORS = [
  { name: 'Blanc', color: '#ffffff' },
  { name: 'Rouge', color: '#ef4444' },
  { name: 'Vert', color: '#10b981' },
  { name: 'Bleu', color: '#3b82f6' },
  { name: 'Jaune', color: '#eab308' },
  { name: 'Violet', color: '#a855f7' },
] as const;

// ===========================================
// PLUGIN : initialisation du contenu HTML
// ===========================================

/**
 * Plugin interne qui hydrate l'éditeur avec le HTML initial au montage.
 * Nécessaire car Lexical ne peut pas directement recevoir du HTML comme état initial.
 */
const InitialHtmlPlugin: React.FC<{ html: string }> = ({ html }) => {
  const [editor] = useLexicalComposerContext();
  const initialized = useRef(false);

  useEffect(() => {
    // Ne s'exécute qu'une seule fois au montage
    if (initialized.current || !html) return;
    initialized.current = true;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.append(...nodes);
    });
  }, [editor, html]);

  return null;
};

// ===========================================
// PLUGIN : synchronisation HTML externe → éditeur
// ===========================================

/**
 * Plugin qui synchronise le contenu lorsque `value` change depuis l'extérieur
 * (ex: reset du formulaire).
 */
const SyncExternalValuePlugin: React.FC<{ value: string }> = ({ value }) => {
  const [editor] = useLexicalComposerContext();
  const prevValueRef = useRef<string>(value);

  useEffect(() => {
    // On ne re-synchronise que si la valeur externe a changé et diffère
    // de ce qu'on a déjà chargé (évite les boucles infinies)
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(value || '<p></p>', 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      if (nodes.length > 0) {
        root.append(...nodes);
      }
    });
  }, [editor, value]);

  return null;
};

// ===========================================
// PLUGIN : Toolbar
// ===========================================

/**
 * Toolbar de l'éditeur Lexical — equivalent visuel de la toolbar Tiptap.
 * Actions : Undo/Redo, Gras, Italique, H1, H2, Paragraphe, Listes, Couleurs.
 */
const ToolbarPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  // État de la sélection courante pour l'affichage actif des boutons
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [blockType, setBlockType] = useState<string>('paragraph');
  const [activeColor, setActiveColor] = useState<string | null>(null);

  // Mise à jour des états selon la sélection
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    setIsBold(selection.hasFormat('bold'));
    setIsItalic(selection.hasFormat('italic'));

    // Détecter le type de bloc
    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isHeadingNode(element)) {
      setBlockType(element.getTag()); // 'h1' | 'h2'
    } else if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType(anchorNode, ListNode);
      setBlockType(parentList ? parentList.getListType() : 'bullet');
    } else {
      setBlockType('paragraph');
    }

    // Détecter la couleur active (via le style inline)
    const node = selection.anchor.getNode();
    const domElement = editor.getElementByKey(node.getKey());
    if (domElement) {
      const computedColor = domElement.style?.color || null;
      setActiveColor(computedColor);
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  // --- Handlers ---

  const formatHeading = (level: 'h1' | 'h2') => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      // Si déjà ce niveau, repasser en paragraphe
      if (blockType === level) {
        $setBlocksType(selection, () => $createParagraphNode());
      } else {
        $setBlocksType(selection, () => $createHeadingNode(level));
      }
    });
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () => $createParagraphNode());
    });
  };

  const formatBulletList = () => {
    if (blockType === 'bullet') {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatOrderedList = () => {
    if (blockType === 'number') {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const applyColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      // Appliquer la couleur sur chaque noeud de la sélection
      const nodes = selection.getNodes();
      nodes.forEach((node) => {
        if ('setStyle' in node && typeof (node as any).setStyle === 'function') {
          (node as any).setStyle(`color: ${color}`);
        }
      });
    });
  };

  // --- Composants internes ---

  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, isActive, disabled, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Évite de perdre le focus de l'éditeur
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`p-2 rounded transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-theme-muted hover:text-theme hover:bg-theme-tertiary'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  const ColorButton: React.FC<{ color: string; name: string }> = ({ color, name }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        applyColor(color);
      }}
      title={name}
      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
        activeColor === color ? 'border-white scale-110' : 'border-theme'
      }`}
      style={{ backgroundColor: color }}
    />
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-theme-secondary border-b border-theme">
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        title="Annuler (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        title="Rétablir (Ctrl+Y)"
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>

      <div className="h-4 w-px bg-theme-tertiary mx-1" />

      {/* Gras / Italique */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        isActive={isBold}
        title="Gras (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        isActive={isItalic}
        title="Italique (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <div className="h-4 w-px bg-theme-tertiary mx-1" />

      {/* Titres */}
      <ToolbarButton
        onClick={() => formatHeading('h1')}
        isActive={blockType === 'h1'}
        title="Grand titre"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatHeading('h2')}
        isActive={blockType === 'h2'}
        title="Sous-titre"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={formatParagraph}
        isActive={blockType === 'paragraph'}
        title="Paragraphe normal"
      >
        <Type className="w-4 h-4" />
      </ToolbarButton>

      <div className="h-4 w-px bg-theme-tertiary mx-1" />

      {/* Listes */}
      <ToolbarButton
        onClick={formatBulletList}
        isActive={blockType === 'bullet'}
        title="Liste à puces"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={formatOrderedList}
        isActive={blockType === 'number'}
        title="Liste numérotée"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <div className="h-4 w-px bg-theme-tertiary mx-1" />

      {/* Couleurs */}
      <div className="flex items-center gap-1">
        {TEXT_COLORS.map((c) => (
          <ColorButton key={c.color} color={c.color} name={c.name} />
        ))}
      </div>
    </div>
  );
};

// ===========================================
// PLUGIN : conversion HTML → onChange
// ===========================================

/**
 * Plugin qui convertit l'état interne Lexical en HTML à chaque changement
 * et appelle le callback onChange du parent.
 */
const HtmlOutputPlugin: React.FC<{
  onChange: (html: string) => void;
  onHtmlRef: React.MutableRefObject<string>;
}> = ({ onChange, onHtmlRef }) => {
  const [editor] = useLexicalComposerContext();

  const handleChange = useCallback(() => {
    editor.getEditorState().read(() => {
      const html = $generateHtmlFromNodes(editor, null);
      // Évite les updates inutiles si le HTML n'a pas changé
      if (html !== onHtmlRef.current) {
        onHtmlRef.current = html;
        onChange(html);
      }
    });
  }, [editor, onChange, onHtmlRef]);

  return <OnChangePlugin onChange={handleChange} />;
};

// ===========================================
// COMPOSANT PRINCIPAL : LexicalRichTextEditor
// ===========================================

export const LexicalRichTextEditor: React.FC<LexicalEditorProps> = ({
  value,
  onChange,
  placeholder = 'Écrivez votre message ici...',
}) => {
  // Référence pour éviter les boucles onChange → value → onChange
  const currentHtmlRef = useRef<string>(value);

  const initialConfig = {
    namespace: 'FYTEditor',
    nodes: [HeadingNode, ListNode, ListItemNode],
    onError: (error: Error) => {
      console.error('[LexicalEditor] Erreur interne :', error);
    },
    theme: {
      // Classes Tailwind appliquées directement sur les éléments HTML
      heading: {
        h1: 'text-2xl font-bold text-white mt-4 mb-2',
        h2: 'text-xl font-semibold text-white mt-3 mb-2',
      },
      text: {
        bold: 'font-bold',
        italic: 'italic',
      },
      list: {
        ul: 'list-disc pl-6 mb-2',
        ol: 'list-decimal pl-6 mb-2',
        listitem: 'mb-1',
      },
    },
  };

  return (
    <>
      {/* Styles spécifiques pour le comportement de l'éditeur (placeholder, focus) */}
      <style>{`
        .lexical-content-editable {
          outline: none;
          min-height: 150px;
          padding: 1rem;
          color: #e2e8f0;
        }
        .lexical-content-editable p {
          margin-bottom: 0.5rem;
        }
        /* Placeholder */
        .lexical-placeholder {
          color: #64748b;
          overflow: hidden;
          position: absolute;
          text-overflow: ellipsis;
          top: 1rem;
          left: 1rem;
          font-size: 1rem;
          user-select: none;
          pointer-events: none;
        }
      `}</style>

      <LexicalComposer initialConfig={initialConfig}>
        <div className="lexical-editor-container bg-theme border border-theme rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors relative">
          {/* Toolbar */}
          <ToolbarPlugin />

          {/* Zone d'édition */}
          <div className="relative bg-theme-secondary/20">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="lexical-content-editable" />
              }
              placeholder={
                <div className="lexical-placeholder">
                  {placeholder}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          {/* Plugins fonctionnels */}
          <HistoryPlugin />
          <ListPlugin />
          <InitialHtmlPlugin html={value} />
          <SyncExternalValuePlugin value={value} />
          <HtmlOutputPlugin onChange={onChange} onHtmlRef={currentHtmlRef} />
        </div>
      </LexicalComposer>
    </>
  );
};

export default LexicalRichTextEditor;
