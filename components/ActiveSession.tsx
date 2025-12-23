
import React, { useState, useEffect } from 'react';
import { WorkoutRow, SessionLog, ExerciseLog, SetLog, SessionKey } from '../types';
import { Save, Clock, ChevronDown, ChevronUp, AlertTriangle, X, MessageSquare, Video, ExternalLink, Calendar, History } from 'lucide-react';
import { AICoach } from './AICoach';

interface Props {
  sessionData: WorkoutRow[];
  history: SessionLog[]; // Added history prop
  onSave: (log: SessionLog, comments: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  initialLog?: SessionLog | null;
}

export const ActiveSession: React.FC<Props> = ({ sessionData, history, onSave, onCancel, initialLog }) => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [startTime] = useState<number>(Date.now());
  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Retroactive Mode
  const [isRetroMode, setIsRetroMode] = useState(false);
  const [retroDate, setRetroDate] = useState({ year: '', month: '', day: '' });
  
  // History Modal
  const [historyModalExercise, setHistoryModalExercise] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<Record<string, string>>({});
  const [revealedComments, setRevealedComments] = useState<Set<number>>(new Set());

  // Determine if this is an Edit session (existing ID) or New (or recovered temp)
  const isEditMode = !!(initialLog && initialLog.id && initialLog.id !== 'temp');

  // Initialize logs based on session data
  useEffect(() => {
    if (initialLog) {
        setLogs(initialLog.exercises);
        // If it's a temp log (not saved to DB yet), we might not have a date. 
        // If it is an edited log, it might have a date.
        return;
    }

    const newLogs: ExerciseLog[] = sessionData.map(ex => {
        let numSets = 3; 
        const setsStr = ex.series.trim();
        if (setsStr && !isNaN(parseInt(setsStr))) {
            const parts = setsStr.split('-');
            numSets = parseInt(parts[parts.length - 1]); 
        }

        return {
            exerciseName: ex.exercice,
            originalSession: ex.seance, 
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
    if (newLogs[exerciseIndex].sets[setIndex].reps && newLogs[exerciseIndex].sets[setIndex].weight) {
        newLogs[exerciseIndex].sets[setIndex].completed = true;
    }
    setLogs(newLogs);
    
    // Save to local storage
    const tempLog: SessionLog = {
        id: initialLog?.id || 'temp',
        athleteName: '', 
        date: new Date().toISOString(),
        sessionKey: { 
            annee: sessionData[0].annee,
            moisNum: sessionData[0].moisNum,
            semaine: sessionData[0].semaine,
            seance: sessionData.map(s => s.seance).join('+') 
        },
        exercises: newLogs
    };
    localStorage.setItem('protrack_active_session_log', JSON.stringify(tempLog));
  };

  const handleFinish = async () => {
    // Validation for Retroactive Mode
    if (isRetroMode) {
        if (!retroDate.year || !retroDate.month || !retroDate.day) {
            alert("Please fill in the full date (Day, Month, Year) to register an old session.");
            return;
        }
    }

    setSaving(true);
    const compositeSeance = Array.from(new Set(sessionData.map(d => d.seance))).join('+');

    const sessionKey: SessionKey = {
        annee: sessionData[0].annee,
        moisNum: sessionData[0].moisNum,
        semaine: sessionData[0].semaine,
        seance: compositeSeance
    };

    // Determine final date
    // Use ISO Format for DB Consistency as requested
    let finalDateStr = new Date().toISOString(); 
    
    if (isEditMode && !isRetroMode) {
        // Preserving date if editing an existing session and NOT overriding with retro date
        finalDateStr = initialLog!.date; 
    }
    
    if (isRetroMode) {
        const d = new Date(parseInt(retroDate.year), parseInt(retroDate.month) - 1, parseInt(retroDate.day), 12, 0, 0);
        finalDateStr = d.toISOString();
    }

    // Preserve ID if editing, otherwise generate new
    const finalId = isEditMode ? initialLog!.id : crypto.randomUUID();

    const finalLog: SessionLog = {
        id: finalId,
        athleteName: '', 
        date: finalDateStr,
        sessionKey,
        exercises: logs,
        durationMinutes: isRetroMode ? 60 : Math.round((Date.now() - startTime) / 60000)
    };

    try {
        await onSave(finalLog, comments);
    } catch (e) {
        console.error("Save failed", e);
    } finally {
        setSaving(false);
    }
  };

  const isValidUrl = (urlString: string) => {
      try { 
        const url = new URL(urlString);
        return url.protocol === "http:" || url.protocol === "https:";
      }
      catch(e){ return false; }
  };

  const toggleCommentBox = (idx: number) => {
      const newSet = new Set(revealedComments);
      if(newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      setRevealedComments(newSet);
  };

  // Helper to get years for dropdown
  const getYears = () => {
      const current = new Date().getFullYear();
      return Array.from({length: 5}, (_, i) => current - i);
  };

  // Handle Retroactive Mode Toggle and Default Values
  const toggleRetroMode = () => {
      const nextState = !isRetroMode;
      setIsRetroMode(nextState);

      if (nextState) {
          // If editing an existing log, use its date
          if (initialLog && initialLog.date) {
              const d = new Date(initialLog.date);
              if (!isNaN(d.getTime())) {
                  setRetroDate({
                      year: d.getFullYear().toString(),
                      month: (d.getMonth() + 1).toString(),
                      day: d.getDate().toString()
                  });
                  return;
              }
          }
          
          // Otherwise, fill from Session Plan Data (The "Stored" date of the training)
          if (sessionData.length > 0) {
              const planYear = sessionData[0].annee;
              const planMonth = sessionData[0].moisNum;
              
              // For Day: default to Today if Month/Year match today, otherwise default to 1 or empty
              const today = new Date();
              let defaultDay = '';
              
              if (planYear === today.getFullYear().toString() && parseInt(planMonth) === (today.getMonth() + 1)) {
                  defaultDay = today.getDate().toString();
              } else {
                  // Default to 1st of month if training plan date is in past/future
                  defaultDay = '1'; 
              }

              setRetroDate({
                  year: planYear || today.getFullYear().toString(),
                  // Ensure we parse to int to remove leading zeros for the select value matching
                  month: planMonth ? parseInt(planMonth).toString() : (today.getMonth() + 1).toString(),
                  day: defaultDay
              });
          }
      }
  };

  // Helper to find last occurrence of an exercise
  const getLastExerciseHistory = (name: string) => {
      const matches: { date: string, sets: SetLog[] }[] = [];
      
      history.forEach(session => {
          const ex = session.exercises.find(e => e.exerciseName === name);
          if (ex) {
              matches.push({ date: session.date, sets: ex.sets });
          }
      });

      matches.sort((a, b) => {
           // Sort descending by ISO Date
           return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      return matches.length > 0 ? matches[0] : null;
  };
  
  const formatDateBracket = (dateStr: string) => {
      try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) {
              // Fallback for old custom format
               const cleanDate = dateStr.split(' - ')[0].replace(/\//g, '-');
               return `${cleanDate}`;
          }
          
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
      } catch (e) {
          return `${dateStr}`;
      }
  };

  const currentHistoryData = historyModalExercise ? getLastExerciseHistory(historyModalExercise) : null;
  const sessionTitle = Array.from(new Set(sessionData.map(d => d.seance))).join(' + ');

  if (!sessionData.length) return <div>No active session data.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      
      {/* Session Title Header */}
      <div className="flex items-center justify-between mb-2 px-2">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Session {sessionTitle}</h1>
      </div>

      <div className="flex flex-col gap-4 bg-slate-900/80 p-4 rounded-xl backdrop-blur border border-slate-800 sticky top-16 z-30 shadow-xl">
        <div className="flex justify-between items-center">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-200">{isEditMode ? 'Editing Session...' : 'Recording...'}</h2>
                    <button 
                        onClick={toggleRetroMode}
                        className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${isRetroMode ? 'bg-orange-900/30 text-orange-400 border-orange-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                        <Calendar className="w-3 h-3" />
                        {isRetroMode ? 'Cancel Retroactive' : 'This is an old session?'}
                    </button>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 px-4 py-2 rounded-lg font-bold transition-colors"
                >
                    <X className="w-4 h-4" />
                    Cancel
                </button>
                <button 
                    onClick={handleFinish}
                    disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Finish'}
                </button>
            </div>
        </div>

        {/* Retroactive Date Pickers */}
        {isRetroMode && (
            <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
                <select 
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-orange-500 outline-none"
                    value={retroDate.day}
                    onChange={(e) => setRetroDate({...retroDate, day: e.target.value})}
                >
                    <option value="">Day</option>
                    {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
                <select 
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-orange-500 outline-none"
                    value={retroDate.month}
                    onChange={(e) => setRetroDate({...retroDate, month: e.target.value})}
                >
                    <option value="">Month</option>
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>
                <select 
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-orange-500 outline-none"
                    value={retroDate.year}
                    onChange={(e) => setRetroDate({...retroDate, year: e.target.value})}
                >
                    <option value="">Year</option>
                    {getYears().map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
        )}
      </div>

      <div className="space-y-6">
        {logs.map((exLog, exIdx) => {
            const originalData = sessionData.find(d => d.exercice === exLog.exerciseName && d.seance === exLog.originalSession);
            const hasValidVideo = originalData?.video && isValidUrl(originalData.video);
            const isCommentRevealed = revealedComments.has(exIdx) || !!comments[exLog.exerciseName];

            return (
                <div key={exIdx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 bg-slate-800/50 border-b border-slate-800">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 mr-4">
                                <h3 className="text-lg font-bold text-white leading-tight">{exLog.exerciseName}</h3>
                                {originalData && (
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                                        <span>Target: <span className="text-slate-300">{originalData.series} x {originalData.repsDuree}</span></span>
                                        <span>Rest: <span className="text-slate-300">{originalData.repos}s</span></span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-xs font-mono text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded">S{exLog.originalSession}</span>
                            </div>
                        </div>

                        {/* Action Buttons Section */}
                        <div className="flex flex-wrap gap-2 mb-2">
                            {/* Video Button */}
                            {hasValidVideo ? (
                                <a 
                                    href={originalData?.video} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 px-3 py-1.5 rounded-full transition-colors border border-blue-900/50"
                                >
                                    <Video className="w-3 h-3" />
                                    Watch Demo
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            ) : (
                                <span className="inline-flex items-center gap-2 text-xs text-slate-600 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800 cursor-not-allowed">
                                    No demo available 😞
                                </span>
                            )}

                            {/* History Button */}
                            <button
                                onClick={() => setHistoryModalExercise(exLog.exerciseName)}
                                className="inline-flex items-center gap-2 text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 px-3 py-1.5 rounded-full transition-colors border border-purple-900/50"
                            >
                                <History className="w-3 h-3" />
                                Exercise history
                            </button>
                        </div>

                        {originalData?.notes && (
                            <div className="mt-2 text-xs text-yellow-500/80 bg-yellow-900/10 p-2 rounded border border-yellow-900/20">
                                ⚠️ {originalData.notes}
                            </div>
                        )}
                    </div>

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
                                    placeholder="Kg / lbs"
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-white focus:border-emerald-500 outline-none"
                                    value={set.weight}
                                    onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                                />
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${set.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'}`}>
                                    {set.completed && <ChevronDown className="w-4 h-4 text-slate-900" />}
                                </div>
                            </div>
                        ))}
                        
                        {/* Comments Toggle */}
                        <div className="pt-2 border-t border-slate-800/50 mt-2">
                             {!isCommentRevealed ? (
                                 <button 
                                    onClick={() => toggleCommentBox(exIdx)}
                                    className="w-full py-2 text-xs text-slate-500 hover:text-blue-400 hover:bg-slate-800/50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-800"
                                 >
                                    <MessageSquare className="w-3 h-3" />
                                    Make a comment to the coach here
                                 </button>
                             ) : (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                     <div className="flex items-center gap-2 text-slate-500 mb-1">
                                        <MessageSquare className="w-3 h-3" />
                                        <span className="text-xs uppercase font-bold">Comments</span>
                                     </div>
                                     <textarea
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none"
                                        placeholder="Add note for coach..."
                                        rows={2}
                                        value={comments[exLog.exerciseName] || ''}
                                        onChange={(e) => setComments(prev => ({...prev, [exLog.exerciseName]: e.target.value}))}
                                        autoFocus
                                    />
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      {/* History Modal */}
      {historyModalExercise && (
           <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                    <button 
                        onClick={() => setHistoryModalExercise(null)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h3 className="text-lg font-bold text-white mb-4 pr-6">{historyModalExercise}</h3>
                    
                    {currentHistoryData ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-300">
                                Last time you did <span className="font-semibold text-emerald-400">{historyModalExercise}</span>, on <span className="font-semibold text-white">{formatDateBracket(currentHistoryData.date)}</span>, you made:
                            </p>
                            <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-2 max-h-60 overflow-y-auto">
                                {currentHistoryData.sets.map((set, i) => (
                                    <div key={i} className="flex justify-between text-sm text-slate-400 border-b border-slate-800/50 last:border-0 pb-1 last:pb-0">
                                        <span>Set #{set.setNumber}</span>
                                        <span className="font-mono text-white">{set.reps || '-'} <span className="text-slate-600">x</span> {set.weight || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No previous history found for this exercise.</p>
                        </div>
                    )}
                </div>
           </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {isEditMode ? "Cancel modification?" : "Cancel Session?"}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {isEditMode 
                            ? "Modifications will be lost." 
                            : "All progress will be lost. This cannot be undone."}
                      </p>
                  </div>
                  <div className="flex gap-3">
                        <button 
                          onClick={() => setShowCancelModal(false)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
                      >
                          {isEditMode ? "Go back" : "Go Back"}
                      </button>
                      <button 
                          onClick={() => { setShowCancelModal(false); onCancel(); }}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
                      >
                          {isEditMode ? "Yes, cancel current modification" : "Discard"}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* AI Coach Overlay */}
      <AICoach sessionData={sessionData} />
    </div>
  );
};
