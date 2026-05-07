import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { DecoratorNode } from 'lexical';
import * as React from 'react';
import { Suspense, lazy } from 'react';

// Chargement dynamique d'Excalidraw (Lazy Loading)
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((module) => ({
    default: module.Excalidraw,
  }))
);

export type SerializedExcalidrawNode = Spread<
  {
    data: string; // JSON sérialisé d'Excalidraw
    width?: number;
    height?: number;
  },
  SerializedLexicalNode
>;

export class ExcalidrawNode extends DecoratorNode<JSX.Element> {
  __data: string;
  __width: number;
  __height: number;

  static getType(): string {
    return 'excalidraw';
  }

  static clone(node: ExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(
      node.__data,
      node.__width,
      node.__height,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedExcalidrawNode): ExcalidrawNode {
    return $createExcalidrawNode(
      serializedNode.data,
      serializedNode.width,
      serializedNode.height
    );
  }

  exportJSON(): SerializedExcalidrawNode {
    return {
      data: this.__data,
      height: this.__height,
      type: 'excalidraw',
      version: 1,
      width: this.__width,
    };
  }

  constructor(
    data = '[]',
    width = 600,
    height = 400,
    key?: NodeKey
  ) {
    super(key);
    this.__data = data;
    this.__width = width;
    this.__height = height;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.excalidraw;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  setData(data: string): void {
    const writable = this.getWritable();
    writable.__data = data;
  }

  decorate(): JSX.Element {
    return (
      <ExcalidrawComponent
        nodeKey={this.getKey()}
        data={this.__data}
        width={this.__width}
        height={this.__height}
      />
    );
  }
}

function ExcalidrawComponent({
  nodeKey,
  data,
  width,
  height,
}: {
  nodeKey: NodeKey;
  data: string;
  width: number;
  height: number;
}) {
  const initialData = React.useMemo(() => {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }, [data]);

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        position: 'relative',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '1rem 0'
      }}
      className="excalidraw-container"
    >
      <Suspense fallback={<div className="flex items-center justify-center h-full bg-slate-50">Chargement du schéma...</div>}>
        <Excalidraw
          initialData={{
            elements: initialData,
            appState: { viewBackgroundColor: '#ffffff', currentItemFontFamily: 1 },
            scrollToContent: true,
          }}
          onChange={(elements) => {
            // Note: On pourrait optimiser en ne mettant à jour que si les éléments ont changé
            // lexicalEditor.update(() => {
            //   const node = $getNodeByKey(nodeKey);
            //   if ($isExcalidrawNode(node)) {
            //     node.setData(JSON.stringify(elements));
            //   }
            // });
          }}
        />
      </Suspense>
    </div>
  );
}

export function $createExcalidrawNode(
  data?: string,
  width?: number,
  height?: number
): ExcalidrawNode {
  return new ExcalidrawNode(data, width, height);
}

export function $isExcalidrawNode(
  node: LexicalNode | null | undefined
): node is ExcalidrawNode {
  return node instanceof ExcalidrawNode;
}
