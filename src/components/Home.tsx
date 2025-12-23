import React from 'react';
import { Play } from 'lucide-react';

interface Props {
  onStartSession: () => void;
  lastSession: any;
  weeklyFrequency: number;
}

export const Home: React.FC<Props> = ({ onStartSession }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Prêt à t'entraîner ?</h2>
          <p className="text-blue-100 mb-6 max-w-md">Ta séance "Pectoraux + Dos" t'attend. Pas d'excuses aujourd'hui.</p>
          <button 
            onClick={onStartSession}
            className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors"
          >
            <Play size={20} fill="currentColor" />
            Lancer la séance
          </button>
        </div>
      </div>
    </div>
  );
};