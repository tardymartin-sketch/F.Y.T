import React, { useState } from 'react';
import { SessionLog } from '../../types';
import { Calendar, Clock, ChevronDown, ChevronUp, Dumbbell, Trash2, AlertTriangle, Edit2 } from 'lucide-react';

interface Props {
  history: SessionLog[];
  onDelete: (id: string) => void;
  onEdit: (log: SessionLog) => void;
}

export const History: React.FC<Props> = ({ history, onDelete, onEdit }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const parseDate = (dateStr: string) => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return { 
          isValid: true, 
          month: months[d.getMonth()], 
          day: d.getDate(), 
          year: d.getFullYear() 
        };
      }
      return { isValid: false, month: '---', day: '--', year: 0 };
    } catch (e) {
      return { isValid: false, month: '---', day: '--', year: 0 };
    }
  };

  const sortedHistory = [...history].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeB - timeA;
  });

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleEditClick = (e: React.MouseEvent, log: SessionLog) => {
    e.stopPropagation();
    onEdit(log);
  };

  const confirmDelete = () => {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-4">Historique des séances</h2>
      
      {sortedHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <Dumbbell className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-lg font-medium">Aucune séance enregistrée</p>
          <p className="text-sm text-slate-600">Lance ta première séance pour commencer !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedHistory.map((log) => {
            const isExpanded = expandedId === log.id;
            const dateInfo = parseDate(log.date);

            return (
              <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                <button 
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-800 p-3 rounded-lg text-center min-w-[60px]">
                      <div className="text-xs text-slate-400 uppercase font-bold">{dateInfo.month}</div>
                      <div className="text-xl font-bold text-white">{dateInfo.day}</div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-200">Session {log.sessionKey.seance}</h3>
                      <p className="text-sm text-slate-400">
                        Semaine {log.sessionKey.semaine} • {log.exercises.length} exercices
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    {log.durationMinutes && (
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3" />
                        {log.durationMinutes} min
                      </div>
                    )}
                    <div 
                      onClick={(e) => handleEditClick(e, log)} 
                      className="p-2 hover:bg-emerald-900/20 hover:text-emerald-400 rounded-full transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <div 
                      onClick={(e) => handleDeleteClick(e, log.id)} 
                      className="p-2 hover:bg-red-900/20 hover:text-red-400 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/50 p-5 space-y-4">
                    {log.exercises.map((ex, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex justify-between mb-2">
                          <span className="font-semibold text-emerald-400">{ex.exerciseName}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-slate-400 text-xs mb-1 font-mono uppercase tracking-wide">
                          <div>Set</div>
                          <div>Reps</div>
                          <div>Poids</div>
                          <div>Status</div>
                        </div>
                        {ex.sets.map((set, j) => (
                          <div key={j} className="grid grid-cols-4 gap-2 py-1 border-b border-slate-800/50 last:border-0 text-slate-300">
                            <div className="text-slate-500">#{set.setNumber}</div>
                            <div>{set.reps || '-'}</div>
                            <div>{set.weight || '-'}</div>
                            <div>{set.completed ? '✓' : '-'}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Supprimer cette séance ?</h3>
              <p className="text-slate-400 text-sm">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
