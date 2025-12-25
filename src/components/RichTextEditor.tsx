import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Type } from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder = "Écris ici..." }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Synchroniser la valeur externe uniquement si pas focus (évite le saut du curseur)
  useEffect(() => {
    if (contentRef.current && !isFocused && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value;
    }
  }, [value, isFocused]);

  const exec = (command: string, val: string | undefined = undefined) => {
    if (contentRef.current) {
      contentRef.current.focus();
    }
    document.execCommand(command, false, val);
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  // Empêcher le blur lors du clic sur les boutons
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
      {/* Barre d'outils */}
      <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-700">
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onClick={() => exec('bold')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Gras"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onClick={() => exec('italic')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Italique"
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <div className="h-4 w-px bg-slate-700 mx-1"></div>

        <button
          type="button"
          onMouseDown={handleMouseDown}
          onClick={() => exec('fontSize', '5')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Grand texte"
        >
          <Type className="w-5 h-5" />
        </button>
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onClick={() => exec('fontSize', '3')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Texte normal"
        >
          <Type className="w-3 h-3" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1"></div>

        {/* Couleurs */}
        <div className="flex items-center gap-1">
          <button 
            type="button" 
            onMouseDown={handleMouseDown} 
            onClick={() => exec('foreColor', '#ef4444')} 
            className="w-5 h-5 rounded-full bg-red-500 border border-slate-700 hover:scale-110 transition-transform"
            title="Rouge"
          />
          <button 
            type="button" 
            onMouseDown={handleMouseDown} 
            onClick={() => exec('foreColor', '#10b981')} 
            className="w-5 h-5 rounded-full bg-emerald-500 border border-slate-700 hover:scale-110 transition-transform"
            title="Vert"
          />
          <button 
            type="button" 
            onMouseDown={handleMouseDown} 
            onClick={() => exec('foreColor', '#3b82f6')} 
            className="w-5 h-5 rounded-full bg-blue-500 border border-slate-700 hover:scale-110 transition-transform"
            title="Bleu"
          />
          <button 
            type="button" 
            onMouseDown={handleMouseDown} 
            onClick={() => exec('foreColor', '#ffffff')} 
            className="w-5 h-5 rounded-full bg-white border border-slate-700 hover:scale-110 transition-transform"
            title="Blanc"
          />
        </div>
      </div>

      {/* Zone d'édition */}
      <div
        ref={contentRef}
        contentEditable
        className="p-4 min-h-[150px] text-sm text-slate-200 focus:outline-none"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        style={{
          position: 'relative'
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #64748b;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};