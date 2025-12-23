import React from 'react';
import { Play, Dumbbell, TrendingUp, Calendar } from 'lucide-react';

interface Props {
  onStartSession: () => void;
  lastSession: any;
  weeklyFrequency: number;
}

export const Home: React.FC<Props> = ({ onStartSession, lastSession, weeklyFrequency }) => {
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-6 h-6" />
            <span className="text-blue-200 text-sm font-medium">Séance du jour</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">Prêt à t'entraîner ?</h2>
          <p className="text-blue-100 mb-6 max-w-md">
            Ta séance t'attend. C'est le moment de donner le meilleur de toi-même !
          </p>
          <button 
            onClick={onStartSession}
            className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg"
          >
            <Play size={20} fill="currentColor" />
            Lancer la séance
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-900/30 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-slate-400 text-sm">Cette semaine</span>
          </div>
          <p className="text-3xl font-bold text-white">{weeklyFrequency}</p>
          <p className="text-slate-500 text-sm">séances complétées</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-900/30 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-slate-400 text-sm">Dernière séance</span>
          </div>
          <p className="text-xl font-bold text-white">
            {lastSession ? new Date(lastSession.date).toLocaleDateString('fr-FR') : 'Aucune'}
          </p>
          <p className="text-slate-500 text-sm">
            {lastSession ? `Session ${lastSession.sessionKey?.seance || '-'}` : 'Commence maintenant !'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-900/30 p-2 rounded-lg">
              <Dumbbell className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-slate-400 text-sm">Objectif</span>
          </div>
          <p className="text-3xl font-bold text-white">4</p>
          <p className="text-slate-500 text-sm">séances / semaine</p>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">💡 Conseil du jour</h3>
        <p className="text-slate-300">
          N'oublie pas de bien t'échauffer avant chaque séance. 5-10 minutes de mobilité 
          et d'activation musculaire peuvent faire toute la différence !
        </p>
      </div>
    </div>
  );
};
