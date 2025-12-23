import React from 'react';
import { WorkoutRow } from '../../types';

interface Props {
  sessionData: WorkoutRow[];
  history: any[];
  onSave: (log: any) => Promise<void>;
  onCancel: () => void;
  initialLog?: any;
}

export const ActiveSession: React.FC<Props> = ({ onCancel, onSave }) => {
  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
      <h2 className="text-2xl font-bold mb-4">Séance en cours</h2>
      <p className="text-slate-400 mb-4">Interface de séance en cours de construction...</p>
      <div className="flex gap-4">
        <button onClick={() => onSave({})} className="bg-emerald-600 px-4 py-2 rounded">Terminer (Test)</button>
        <button onClick={onCancel} className="bg-red-600 px-4 py-2 rounded">Annuler</button>
      </div>
    </div>
  );
};