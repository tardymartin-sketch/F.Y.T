import React from 'react';
import { Users, UserPlus } from 'lucide-react';

export const TeamView: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-4">Mon Équipe</h2>

      <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <Users className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium mb-2">Fonctionnalité à venir</p>
        <p className="text-sm text-slate-600 text-center max-w-md">
          La gestion d'équipe sera disponible dans une prochaine mise à jour.
          Tu pourras inviter des athlètes et suivre leur progression.
        </p>
      </div>
    </div>
  );
};
