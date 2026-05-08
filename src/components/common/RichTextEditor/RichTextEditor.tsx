import React, { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes, EditorState, LexicalEditor } from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import ToolbarPlugin from './ToolbarPlugin';
import { sanitizeHtml } from '@/utils/sanitize';

import { ExcalidrawNode } from './plugins/Excalidraw/ExcalidrawNode';
import ExcalidrawPlugin from './plugins/Excalidraw/ExcalidrawPlugin';

const CustomErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

function onLexicalError(error: Error) {
  console.error("Erreur de Lexical Composer :", error);
}

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'mb-2 leading-relaxed text-slate-800',
  quote: 'border-l-4 border-slate-300 pl-4 italic text-slate-600 my-4',
  heading: { h1: 'text-2xl font-bold mb-4 mt-6', h2: 'text-xl font-bold mb-3 mt-5', h3: 'text-lg font-bold mb-2 mt-4' },
  list: { ul: 'list-disc ml-6 mb-4', ol: 'list-decimal ml-6 mb-4', listitem: 'mb-1' },
  text: { bold: 'font-bold', italic: 'italic', underline: 'underline', strikethrough: 'line-through' },
};

interface RichTextEditorProps {
  initialHtml?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  showFullToolbar?: boolean;
}

function HtmlPlugin({ initialHtml }: { initialHtml: string }) {
  const [editor] = useLexicalComposerContext();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!initialHtml || isLoaded) return;
    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(initialHtml, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.select();
      $insertNodes(nodes);
    });
    setIsLoaded(true);
  }, [editor, initialHtml, isLoaded]);
  return null;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialHtml = '',
  onChange,
  placeholder = 'Saisissez votre texte...',
  readOnly = false,
  showFullToolbar = false,
}) => {
  const initialConfig = {
    namespace: 'FYT-Editor',
    theme,
    editable: !readOnly,
    nodes: [
      HeadingNode, ListNode, ListItemNode, QuoteNode, AutoLinkNode, LinkNode,
      ExcalidrawNode
    ],
    onError: onLexicalError,
  };

  const handleChange = (editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor, null);
      const cleanHtml = sanitizeHtml(htmlString);
      onChange(cleanHtml);
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`relative border rounded-lg overflow-hidden bg-white ${readOnly ? 'border-transparent' : 'border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'}`}>
        {!readOnly && <ToolbarPlugin showFullToolbar={showFullToolbar} />}
        <div className="relative p-4">
          
          {!readOnly && <ExcalidrawPlugin />}
          
          <RichTextPlugin
            contentEditable={<ContentEditable className="min-h-[150px] outline-none text-slate-800" />}
            placeholder={<div className="absolute top-4 left-4 text-slate-400 pointer-events-none">{placeholder}</div>}
            ErrorBoundary={CustomErrorBoundary}
          />
          <HistoryPlugin />
          {!readOnly && <OnChangePlugin onChange={handleChange} ignoreSelectionChange />}
          <HtmlPlugin initialHtml={initialHtml} />
        </div>
      </div>
    </LexicalComposer>
  );
};

export default RichTextEditor;
