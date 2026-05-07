import * as React from 'react';
import { RichTextEditor } from './RichTextEditor';

export default {
  title: 'Shared/Lexical/RichTextEditor',
  component: RichTextEditor,
};

export const Default = () => {
  const [content, setContent] = React.useState<string>('');

  return (
    <div className="p-8 max-w-4xl mx-auto bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Éditeur Riche F.Y.T (Lexical + Excalidraw)</h1>
      
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Interface Coach</h2>
        <RichTextEditor 
          onChange={(json) => setContent(json)} 
          placeholder="Décrivez l'exercice ou ajoutez un schéma tactique..."
        />
      </div>

      <div className="mt-12 p-6 bg-white border border-slate-200 rounded-xl">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Aperçu des données JSON (Debug)</h2>
        <pre className="bg-slate-900 text-blue-400 p-4 rounded-lg overflow-x-auto text-xs">
          {content ? JSON.stringify(JSON.parse(content), null, 2) : 'Aucun contenu pour le moment...'}
        </pre>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Mode Lecture seule (Athlète)</h2>
        <div className="opacity-75 pointer-events-none">
          <RichTextEditor 
            initialValue={content} 
            readOnly={true} 
          />
        </div>
      </div>
    </div>
  );
};
