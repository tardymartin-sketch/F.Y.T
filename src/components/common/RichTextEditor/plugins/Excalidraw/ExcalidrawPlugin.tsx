import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_EDITOR, createCommand, LexicalCommand } from 'lexical';
import { useEffect } from 'react';
import { $createExcalidrawNode, ExcalidrawNode } from './ExcalidrawNode';
import { $insertNodeToNearestRoot } from '@lexical/utils';

export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<void> = createCommand();

export default function ExcalidrawPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ExcalidrawNode])) {
      throw new Error('ExcalidrawPlugin: ExcalidrawNode not registered on editor');
    }

    return editor.registerCommand(
      INSERT_EXCALIDRAW_COMMAND,
      () => {
        const excalidrawNode = $createExcalidrawNode();
        $insertNodeToNearestRoot(excalidrawNode);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
