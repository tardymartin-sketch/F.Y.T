import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Type
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// Couleurs disponibles pour le texte
const TEXT_COLORS = [
  { name: 'Blanc', color: '#ffffff' },
  { name: 'Rouge', color: '#ef4444' },
  { name: 'Vert', color: '#10b981' },
  { name: 'Bleu', color: '#3b82f6' },
  { name: 'Jaune', color: '#eab308' },
  { name: 'Violet', color: '#a855f7' },
];

export const RichTextEditor: React.FC<Props> = ({ 
  value, 
  onChange, 
  placeholder = "Écrivez votre message ici..." 
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Désactiver les fonctionnalités non utilisées pour réduire le bundle
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      TextStyle,
      Color,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none p-4 min-h-[150px] focus:outline-none text-slate-200',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Synchroniser le contenu externe (utile si le parent met à jour `value`)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 min-h-[150px] animate-pulse bg-slate-900" />
      </div>
    );
  }

  // Bouton de la toolbar
  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, isActive, disabled, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  // Bouton de couleur
  const ColorButton: React.FC<{ color: string; name: string }> = ({ color, name }) => (
    <button
      type="button"
      onClick={() => editor.chain().focus().setColor(color).run()}
      title={name}
      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
        editor.isActive('textStyle', { color }) 
          ? 'border-white scale-110' 
          : 'border-slate-600'
      }`}
      style={{ backgroundColor: color }}
    />
  );

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-900 border-b border-slate-700">
        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Annuler (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rétablir (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Formatage texte */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Gras (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italique (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Titres */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Grand titre"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Sous-titre"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive('paragraph')}
          title="Paragraphe normal"
        >
          <Type className="w-4 h-4" />
        </ToolbarButton>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Listes */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Liste à puces"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Liste numérotée"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Couleurs */}
        <div className="flex items-center gap-1">
          {TEXT_COLORS.map((c) => (
            <ColorButton key={c.color} color={c.color} name={c.name} />
          ))}
        </div>
      </div>

      {/* Zone d'édition */}
      <EditorContent 
        editor={editor} 
        className="[&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none"
      />

      {/* Styles pour le contenu de l'éditeur */}
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: "${placeholder}";
          color: #64748b;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: white;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: white;
        }
        .ProseMirror p {
          margin-bottom: 0.5rem;
          color: #e2e8f0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          margin-bottom: 0.25rem;
        }
        .ProseMirror strong {
          font-weight: 700;
        }
        .ProseMirror em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

// Composant pour afficher le HTML rendu (lecture seule)
// À utiliser côté athlète pour afficher le message du coach
export const RichTextDisplay: React.FC<{ html: string; className?: string }> = ({ 
  html, 
  className = '' 
}) => {
  return (
    <div 
      className={`rich-text-display ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        // Styles inline pour garantir le rendu même sans CSS global
      }}
    />
  );
};

// Styles CSS à ajouter dans index.css pour le RichTextDisplay
export const RICH_TEXT_DISPLAY_STYLES = `
.rich-text-display h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}
.rich-text-display h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}
.rich-text-display p {
  margin-bottom: 0.5rem;
}
.rich-text-display ul,
.rich-text-display ol {
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}
.rich-text-display ul {
  list-style-type: disc;
}
.rich-text-display ol {
  list-style-type: decimal;
}
.rich-text-display li {
  margin-bottom: 0.25rem;
}
.rich-text-display strong {
  font-weight: 700;
}
.rich-text-display em {
  font-style: italic;
}
`;
