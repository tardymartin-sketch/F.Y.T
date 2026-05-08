import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, SELECTION_CHANGE_COMMAND, CommandListenerPriority } from 'lexical';
import { $patchStyleText } from '@lexical/selection';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { Bold, Italic, Underline, Strikethrough, Palette, SmilePlus, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Heading1, Heading2, Heading3, Quote, PenTool } from 'lucide-react';
import { INSERT_EXCALIDRAW_COMMAND } from './plugins/Excalidraw/ExcalidrawPlugin';

const LowPriority: CommandListenerPriority = 1;

export interface ToolbarPluginProps {
  showFullToolbar?: boolean;
}

const SYMBOLS = ['→', '←', '↑', '↓', '★', '☆', '■', '□', '▲', '▼', '●', '○', '✔', '✘', '⚠', '⚡'];
const COLORS = ['#000000', '#475569', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];

export default function ToolbarPlugin({ showFullToolbar = false }: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => { editorState.read(() => updateToolbar()); }),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, (_payload, newEditor) => { updateToolbar(); setActiveEditor(newEditor); return false; }, LowPriority),
    );
  }, [editor, updateToolbar]);

  const toggleFormat = (formatType: string) => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, formatType as any);
  const toggleAlign = (alignType: string) => activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignType as any);
  const formatHeading = (headingSize: 'h1'|'h2'|'h3') => { activeEditor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createHeadingNode(headingSize)); }); };
  const formatQuote = () => { activeEditor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createQuoteNode()); }); };
  const applyColor = (color: string) => { activeEditor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $patchStyleText(selection, { color }); }); setShowColorPicker(false); };
  const insertSymbol = (symbol: string) => { activeEditor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) selection.insertText(symbol); }); setShowSymbolPicker(false); };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
      
      <div className={`flex items-center space-x-1 mr-2 pr-2 ${showFullToolbar ? 'border-r border-slate-300' : ''}`}>
        <button onClick={() => toggleFormat('bold')} className={`p-1.5 rounded hover:bg-slate-200 ${isBold ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`} title="Gras"><Bold size={18} /></button>
        <button onClick={() => toggleFormat('italic')} className={`p-1.5 rounded hover:bg-slate-200 ${isItalic ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`} title="Italique"><Italic size={18} /></button>
        <button onClick={() => toggleFormat('underline')} className={`p-1.5 rounded hover:bg-slate-200 ${isUnderline ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`} title="Souligné"><Underline size={18} /></button>
        
        <div className="w-px h-5 bg-slate-300 mx-1"></div>

        <div className="relative">
          <button onClick={() => { setShowColorPicker(!showColorPicker); setShowSymbolPicker(false); }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 relative z-20" title="Couleur du texte"><Palette size={18} /></button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded shadow-lg z-30 grid grid-cols-5 gap-1 w-[140px]">
              {COLORS.map((color) => ( <button key={color} onClick={() => applyColor(color)} className="w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} /> ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => { setShowSymbolPicker(!showSymbolPicker); setShowColorPicker(false); }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 relative z-20" title="Insérer un symbole"><SmilePlus size={18} /></button>
          {showSymbolPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded shadow-lg z-30 grid grid-cols-4 gap-1 w-[160px]">
              {SYMBOLS.map((symbol) => ( <button key={symbol} onClick={() => insertSymbol(symbol)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded text-lg text-slate-700">{symbol}</button> ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button 
          onClick={() => activeEditor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined)} 
          className="p-1.5 rounded hover:bg-slate-200 text-slate-600" 
          title="Dessiner un schéma (Excalidraw)"
        >
          <PenTool size={18} />
        </button>

      </div>

      {showFullToolbar && (
        <>
          <div className="flex items-center space-x-1 mr-2 pr-2 border-r border-slate-300">
            <button onClick={() => toggleFormat('strikethrough')} className={`p-1.5 rounded hover:bg-slate-200 ${isStrikethrough ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`} title="Barré"><Strikethrough size={18} /></button>
          </div>
          <div className="flex items-center space-x-1 mr-2 pr-2 border-r border-slate-300">
            <button onClick={() => activeEditor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Liste à puces"><List size={18} /></button>
            <button onClick={() => activeEditor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Liste numérotée"><ListOrdered size={18} /></button>
            <button onClick={() => formatQuote()} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Citation"><Quote size={18} /></button>
          </div>
          <div className="flex items-center space-x-1 mr-2 pr-2 border-r border-slate-300">
            <button onClick={() => formatHeading('h1')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Titre 1"><Heading1 size={18} /></button>
            <button onClick={() => formatHeading('h2')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Titre 2"><Heading2 size={18} /></button>
            <button onClick={() => formatHeading('h3')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Titre 3"><Heading3 size={18} /></button>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={() => toggleAlign('left')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Aligner à gauche"><AlignLeft size={18} /></button>
            <button onClick={() => toggleAlign('center')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Centrer"><AlignCenter size={18} /></button>
            <button onClick={() => toggleAlign('right')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Aligner à droite"><AlignRight size={18} /></button>
            <button onClick={() => toggleAlign('justify')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Justifier"><AlignJustify size={18} /></button>
          </div>
        </>
      )}

      {(showColorPicker || showSymbolPicker) && <div className="fixed inset-0 z-10" onClick={() => { setShowColorPicker(false); setShowSymbolPicker(false); }} />}
    </div>
  );
}
