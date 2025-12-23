import React, { useState, useEffect } from 'react';
import { WorkoutRow, SessionLog, ExerciseLog, SetLog, SessionKey } from '../../types';
import { Save, Clock, ChevronDown, AlertTriangle, X, MessageSquare, Video } from 'lucide-react';

interface Props {
  sessionData: WorkoutRow[];
  history: SessionLog[];
  onSave: (log: SessionLog) => Promise<void>;
  onCancel: () => void;
  initialLog?: SessionLog | null;
}

export const ActiveSession: React.FC<Props> = ({ sessionData, history, onSave, onCancel, initialLog }) => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [startTime] = useState<number>(Date.now());
  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Initialize logs based on session data
  useEffect(() => {
    if (initialLog) {
      setLogs(initialLog.exercises);
      return;
    }

    const newLogs: ExerciseLog[] = sessionData.map(ex => {
      let numSets = 3;
      const setsStr = ex.TargetSets.trim();
      if (setsStr && !isNaN(parseInt(setsStr))) {
        const parts = setsStr.split('-');
        numSets = parseInt(parts[parts.length - 1]);
      }

      return {
        exerciseName: ex.Exercise,
        originalSession: ex.Code,
        notes: '',
        sets: Array.from({ length: numSets }).map((_, i) => ({
          setNumber: i + 1,
          reps: '',
          weight: '',
          completed: false
        }))
      };
    });
    setLogs(newLogs);
  }, [sessionData, initialLog]);

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetLog, value: any) => {
    const newLogs = [...logs];
    newLogs[exerciseIndex].sets[setIndex] = {
      ...newLogs[exerciseIndex].sets[setIndex],
      [field]: value
    };
    // Auto-complete if both fields are filled
    if (newLogs[exerciseIndex].sets[setIndex].reps && newLogs[exerciseIndex].sets[setIndex].weight) {
      newLogs[exerciseIndex].sets[setIndex].completed = true;
    }
    setLogs(newLogs);
  };

  const handleFinish = async () => {
    setSaving(true);

    const sessionKey: SessionKey = {
      annee: new Date().getFullYear().toString(),
      moisNum: (new Date().getMonth() + 1).toString(),
      semaine: Math.ceil(new Date().getDate() / 7).toString(),
      seance: sessionData[0]?.Code || 'S1'
    };

    const finalLog: SessionLog = {
      id: initialLog?.id || crypto.randomUUID(),
      date: new Date().toISOString(),
      sessionKey,
      exercises: logs,
      durationMinutes: Math.round((Date.now() - startTime) / 60000)
    };

    try {
      await onSave(finalLog);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSaving(false);
    }
  };

  if (!sessionData.length) return <div className="text-slate-400">Aucune donnée de session.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <h1 className="text-2xl font-bold text-white">Séance en cours</h1>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Clock className="w-4 h-4" />
          <span>En cours...</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex gap-4 bg-slate-900/80 p-4 rounded-xl backdrop-blur border border-slate-800 sticky top-0 z-30">
        <button 
          onClick={() => setShowCancelModal(true)}
          className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <X className="w-4 h-4" />
          Annuler
        </button>
        <button 
          onClick={handleFinish}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde...' : 'Terminer la séance'}
        </button>
      </div>

      {/* Exercises */}
      <div className="space-y-6">
        {logs.map((exLog, exIdx) => {
          const originalData = sessionData.find(d => d.Exercise === exLog.exerciseName);

          return (
            <div key={exIdx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {/* Exercise Header */}
              <div className="p-4 bg-slate-800/50 border-b border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 mr-4">
                    <h3 className="text-lg font-bold text-white leading-tight">{exLog.exerciseName}</h3>
                    {originalData && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>Objectif: <span className="text-slate-300">{originalData.TargetSets} x {originalData.TargetReps}</span></span>
                        <span>Repos: <span className="text-slate-300">{originalData.Rest}s</span></span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-mono text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded">
                    {exLog.originalSession}
                  </span>
                </div>

                {originalData?.Notes && (
                  <div className="mt-2 text-xs text-yellow-500/80 bg-yellow-900/10 p-2 rounded border border-yellow-900/20">
                    ⚠️ {originalData.Notes}
                  </div>
                )}
              </div>

              {/* Sets */}
              <div className="p-4 space-y-3">
                {exLog.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-mono text-slate-500">#{set.setNumber}</span>
                    <input 
                      type="text" 
                      placeholder="Reps"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-white focus:border-emerald-500 outline-none"
                      value={set.reps}
                      onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                    />
                    <span className="text-slate-600">x</span>
                    <input 
                      type="text" 
                      placeholder="Kg"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-white focus:border-emerald-500 outline-none"
                      value={set.weight}
                      onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                    />
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${set.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'}`}>
                      {set.completed && <ChevronDown className="w-4 h-4 text-slate-900" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Annuler la séance ?</h3>
              <p className="text-slate-400 text-sm">Toute ta progression sera perdue.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Retour
              </button>
              <button 
                onClick={() => { setShowCancelModal(false); onCancel(); }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
