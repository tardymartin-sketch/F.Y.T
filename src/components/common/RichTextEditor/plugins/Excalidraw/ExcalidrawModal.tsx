import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Excalidraw, exportToSvg } from '@excalidraw/excalidraw';
import { X, Check } from 'lucide-react';

interface ExcalidrawModalProps {
  initialElements?: any[];
  initialAppState?: any;
  onClose: () => void;
  onSave: (elements: readonly any[], appState: any, svg: SVGSVGElement) => void;
}

export default function ExcalidrawModal({
  initialElements,
  initialAppState,
  onClose,
  onSave,
}: ExcalidrawModalProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();

    if (!elements || elements.length === 0) {
      onClose();
      return;
    }

    try {
      const svg = await exportToSvg({ elements, appState, exportPadding: 16 });
      onSave(elements, appState, svg);
    } catch (e) {
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Éditeur de schéma (Excalidraw)</h2>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
              <X size={18} /> Annuler
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Check size={18} /> Insérer le schéma
            </button>
          </div>
        </div>
        <div className="flex-1 w-full h-full relative" style={{ minHeight: '400px' }}>
          <Excalidraw
            initialData={{ elements: initialElements, appState: initialAppState }}
            excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
            langCode="fr-FR"
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
