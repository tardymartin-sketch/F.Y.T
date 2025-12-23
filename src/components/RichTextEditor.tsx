
import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Type, Palette } from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export const RichTextEditor: React.FC<Props> = ({ value, onChange }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external value changes to innerHTML only if not focused
  // This prevents the cursor from jumping to the beginning when typing (which happens if we re-render innerHTML while focused)
  useEffect(() => {
    if (contentRef.current && !isFocused && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value;
    }
  }, [value, isFocused]);

  const exec = (command: string, val: string | undefined = undefined) => {
    // We must restore focus or ensure focus is on the editor before executing
    if (contentRef.current) {
        contentRef.current.focus();
    }
    document.execCommand(command, false, val);
    if (contentRef.current) onChange(contentRef.current.innerHTML);
  };

  // Prevent button click from causing the editor to blur immediately
  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
  };

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-700">
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onClick={() => exec('bold')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onClick={() => exec('italic')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <div className="h-4 w-px bg-slate-700 mx-1"></div>

        <button
           type="button"
           onMouseDown={handleMouseDown}
           onClick={() => exec('fontSize', '5')} // Large
           className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
           title="Large Text"
        >
           <Type className="w-5 h-5" />
        </button>
         <button
           type="button"
           onMouseDown={handleMouseDown}
           onClick={() => exec('fontSize', '3')} // Normal
           className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
           title="Normal Text"
        >
           <Type className="w-3 h-3" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1"></div>

        <div className="flex items-center gap-1">
            <button type="button" onMouseDown={handleMouseDown} onClick={() => exec('foreColor', '#ef4444')} className="w-5 h-5 rounded-full bg-red-500 border border-slate-700 hover:scale-110 transition-transform"></button>
            <button type="button" onMouseDown={handleMouseDown} onClick={() => exec('foreColor', '#10b981')} className="w-5 h-5 rounded-full bg-emerald-500 border border-slate-700 hover:scale-110 transition-transform"></button>
            <button type="button" onMouseDown={handleMouseDown} onClick={() => exec('foreColor', '#3b82f6')} className="w-5 h-5 rounded-full bg-blue-500 border border-slate-700 hover:scale-110 transition-transform"></button>
            <button type="button" onMouseDown={handleMouseDown} onClick={() => exec('foreColor', '#ffffff')} className="w-5 h-5 rounded-full bg-white border border-slate-700 hover:scale-110 transition-transform"></button>
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={contentRef}
        contentEditable
        className="p-4 min-h-[150px] text-sm text-slate-200 focus:outline-none"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        // IMPORTANT: removed dangerouslySetInnerHTML here to avoid re-render loops while typing
      />
    </div>
  );
};
