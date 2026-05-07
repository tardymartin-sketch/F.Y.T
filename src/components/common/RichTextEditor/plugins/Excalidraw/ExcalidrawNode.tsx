import { DecoratorNode, DOMExportOutput, EditorConfig, LexicalEditor, LexicalNode, NodeKey, SerializedLexicalNode, Spread, $getNodeByKey } from 'lexical';
import React, { Suspense, useRef, useState } from 'react';
import ExcalidrawModal from './ExcalidrawModal';

export type SerializedExcalidrawNode = Spread<{ data: string; svgHtml: string }, SerializedLexicalNode>;

function ExcalidrawComponent({ nodeKey, data, svgHtml, editor }: { data: string; svgHtml: string; editor: LexicalEditor; nodeKey: NodeKey }) {
  const [isModalOpen, setModalOpen] = useState(false);

  let elements = [];
  let appState = {};
  try {
    const parsed = JSON.parse(data);
    elements = parsed.elements || [];
    appState = parsed.appState || {};
  } catch (e) {}

  const handleSave = (newElements: any[], newAppState: any, newSvg: SVGSVGElement) => {
    setModalOpen(false);
    newSvg.removeAttribute('width');
    newSvg.removeAttribute('height');
    newSvg.style.width = '100%';
    newSvg.style.height = '100%';
    newSvg.style.maxHeight = '400px';

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isExcalidrawNode(node)) {
        node.setData(JSON.stringify({ elements: newElements, appState: newAppState }));
        node.setSvgHtml(newSvg.outerHTML);
      }
    });
  };

  return (
    <div className="relative my-4 flex justify-center group">
      <div 
        className="w-full max-w-2xl border-2 border-slate-200 border-dashed rounded-lg p-4 bg-slate-50 relative min-h-[100px] flex items-center justify-center cursor-pointer hover:border-blue-300"
        onClick={() => setModalOpen(true)}
      >
        {svgHtml ? (
           <div className="w-full flex items-center justify-center pointer-events-none" dangerouslySetInnerHTML={{ __html: svgHtml }} />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2 py-8">
            <span className="font-medium">Cliquer pour créer un schéma</span>
          </div>
        )}
      </div>
      {isModalOpen && <ExcalidrawModal initialElements={elements} initialAppState={appState} onClose={() => setModalOpen(false)} onSave={handleSave} />}
    </div>
  );
}

export class ExcalidrawNode extends DecoratorNode<React.ReactNode> {
  __data: string;
  __svgHtml: string;

  static getType(): string { return 'excalidraw'; }
  static clone(node: ExcalidrawNode): ExcalidrawNode { return new ExcalidrawNode(node.__data, node.__svgHtml, node.__key); }
  static importJSON(serializedNode: SerializedExcalidrawNode): ExcalidrawNode { return new ExcalidrawNode(serializedNode.data, serializedNode.svgHtml); }
  
  exportJSON(): SerializedExcalidrawNode { return { data: this.__data, svgHtml: this.__svgHtml, type: 'excalidraw', version: 1 }; }

  constructor(data = '[]', svgHtml = '', key?: NodeKey) {
    super(key);
    this.__data = data;
    this.__svgHtml = svgHtml;
  }

  getData(): string { return this.getLatest().__data; }
  setData(data: string): void { const writable = this.getWritable(); writable.__data = data; }
  getSvgHtml(): string { return this.getLatest().__svgHtml; }
  setSvgHtml(svgHtml: string): void { const writable = this.getWritable(); writable.__svgHtml = svgHtml; }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.className = 'excalidraw-container block my-4';
    return span;
  }

  updateDOM(): false { return false; }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('div');
    element.className = 'excalidraw-container-readonly flex justify-center my-4';
    if (this.__svgHtml) element.innerHTML = this.__svgHtml;
    return { element };
  }

  decorate(editor: LexicalEditor, config: EditorConfig): React.ReactNode {
    return (
      <Suspense fallback={<div>Chargement...</div>}>
        <ExcalidrawComponent nodeKey={this.getKey()} data={this.__data} svgHtml={this.__svgHtml} editor={editor} />
      </Suspense>
    );
  }
}

export function $createExcalidrawNode(): ExcalidrawNode { return new ExcalidrawNode(); }
export function $isExcalidrawNode(node: LexicalNode | null | undefined): node is ExcalidrawNode { return node instanceof ExcalidrawNode; }
