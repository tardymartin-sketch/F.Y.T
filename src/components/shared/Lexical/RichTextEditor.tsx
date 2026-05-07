import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { EditorState } from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { ExcalidrawNode, $createExcalidrawNode } from './ExcalidrawNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Image as ImageIcon, 
  Square,
  Undo,
  Redo
} from 'lucide-react';
import * as React from 'react';

// Thème personnalisé avec Tailwind CSS 4
const theme = {
  paragraph: 'mb-2 text-slate-900',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
  list: {
    ul: 'list-disc pl-5 mb-2',
    ol: 'list-decimal pl-5 mb-2',
    listitem: 'mb-1',
  },
};

interface RichTextEditorProps {
  initialValue?: string;
  onChange?: (json: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

// Plugin pour la barre d'outils
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const insertExcalidraw = () => {
    editor.update(() => {
      const excalidrawNode = $createExcalidrawNode();
      $getRoot().append(excalidrawNode);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
      <button
        onClick={() => editor.dispatchCommand(import('lexical').then(m => m.FORMAT_TEXT_COMMAND), 'bold')}
        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
        title="Gras"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(import('lexical').then(m => m.FORMAT_TEXT_COMMAND), 'italic')}
        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
        title="Italique"
      >
        <Italic size={18} />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1" />
      <button
        onClick={() => editor.dispatchCommand(import('@lexical/list').then(m => m.INSERT_UNORDERED_LIST_COMMAND), undefined)}
        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
        title="Liste à puces"
      >
        <List size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(import('@lexical/list').then(m => m.INSERT_ORDERED_LIST_COMMAND), undefined)}
        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
        title="Liste ordonnée"
      >
        <ListOrdered size={18} />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1" />
      <button
        onClick={insertExcalidraw}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
        title="Ajouter un schéma"
      >
        <Square size={16} />
        <span>Schéma</span>
      </button>
      <div className="flex-grow" />
      <button
        onClick={() => editor.dispatchCommand(import('lexical').then(m => m.UNDO_COMMAND), undefined)}
        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
        title="Annuler"
      >
        <Undo size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(import('lexical').then(m => m.REDO_COMMAND), undefined)}
        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
        title="Refaire"
      >
        <Redo size={18} />
      </button>
    </div>
  );
}

export function RichTextEditor({
  initialValue,
  onChange,
  placeholder = "Commencez à rédiger...",
  readOnly = false,
}: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'FYTRichEditor',
    theme,
    onError: (error: Error) => console.error(error),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, ExcalidrawNode],
    editorState: initialValue,
    editable: !readOnly,
  };

  return (
    <div className="rich-text-editor border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
      <LexicalComposer initialConfig={initialConfig}>
        {!readOnly && <ToolbarPlugin />}
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="min-h-[150px] p-4 outline-none prose prose-slate max-w-none" 
              />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-slate-400 pointer-events-none italic">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin 
            onChange={(editorState) => {
              if (onChange) {
                const json = JSON.stringify(editorState.toJSON());
                onChange(json);
              }
            }} 
          />
        </div>
      </LexicalComposer>
    </div>
  );
}
