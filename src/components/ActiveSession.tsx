// ============================================================
// F.Y.T - ACTIVE SESSION (Version avec RPE)
// src/components/ActiveSession.tsx
// Séance d'entraînement active avec suivi RPE par exercice
// ============================================================

import React, { useState, useEffect } from 'react';
import { WorkoutRow, SessionLog, ExerciseLog, SetLog, SessionKey } from '../../types';
import { 
  Save, 
  Clock, 
  ChevronDown,
  X, 
  AlertTriangle, 
  Video, 
  ExternalLink, 
  Calendar,
  History,
  Plus,
  Minus,
  Check,
  MessageSquare,
  Send
} from 'lucide-react';
import { RpeSelector, SessionRpeModal, RpeBadge } from './RpeSelector';

interface Props {
  sessionData: WorkoutRow[];
  history: SessionLog[];
  onSave: (log: SessionLog) => Promise<void>;
  onCancel: () => void;
  initialLog?: SessionLog | null;
  userId?: string;
  onSaveComment?: (exerciseName: string, comment: string, sessionId: string) => Promise<void>;
}

export const ActiveSession: React.FC<Props> = ({ 
  sessionData, 
  history, 
  onSave, 
  onCancel, 
  initialLog,
  userId,
  onSaveComment
}) => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [startTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);
  
  // Mode rétroactif
  const [isRetroMode, setIsRetroMode] = useState(false);
  const [retroDate, setRetroDate] = useState({ year: '', month: '', day: '' });
  
  // Modal historique
  const [historyModalExercise, setHistoryModalExercise] = useState<string | null>(null);

  // Comments state
  const [exerciseComments, setExerciseComments] = useState<Record<string, string>>({});
  const [commentSending, setCommentSending] = useState<string | null>(null);
  const [sentComments, setSentComments] = useState<Set<string>>(new Set());

  // ← NOUVEAU: État pour le modal RPE de fin de séance
  const [showSessionRpeModal, setShowSessionRpeModal] = useState(false);
  const [pendingSessionLog, setPendingSessionLog] = useState<SessionLog | null>(null);

  const isEditMode = !!(initialLog && initialLog.id && initialLog.id !== 'temp');

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Initialisation des logs
  useEffect(() => {
    if (initialLog) {
      setLogs(initialLog.exercises);
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
        })),
        rpe: undefined // ← NOUVEAU: Initialiser le RPE
      };
    });
    setLogs(newLogs);
  }, [sessionData, initialLog]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetLog, value: any) => {
    const newLogs = [...logs];
    newLogs[exerciseIndex].sets[setIndex] = {
      ...newLogs[exerciseIndex].sets[setIndex],
      [field]: value
    };
    
    const set = newLogs[exerciseIndex].sets[setIndex];
    if (set.reps && set.weight) {
      set.completed = true;
    }
    
    setLogs(newLogs);
    saveToLocalStorage(newLogs);
  };

  // ← NOUVEAU: Mettre à jour le RPE d'un exercice
  const updateExerciseRpe = (exerciseIndex: number, rpe: number | undefined) => {
    const newLogs = [...logs];
    newLogs[exerciseIndex] = {
      ...newLogs[exerciseIndex],
      rpe
    };
    setLogs(newLogs);
    saveToLocalStorage(newLogs);
  };

  const saveToLocalStorage = (logsToSave: ExerciseLog[]) => {
    localStorage.setItem('F.Y.T_active_session', JSON.stringify({
      logs: logsToSave,
      sessionData: sessionData.map(s => ({ seance: s.seance, annee: s.annee, moisNum: s.moisNum, semaine: s.semaine })),
      startTime
    }));
  };

  const addSet = (exerciseIndex: number) => {
    const newLogs = [...logs];
    const currentSets = newLogs[exerciseIndex].sets;
    currentSets.push({
      setNumber: currentSets.length + 1,
      reps: '',
      weight: '',
      completed: false
    });
    setLogs(newLogs);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newLogs = [...logs];
    newLogs[exerciseIndex].sets.splice(setIndex, 1);
    newLogs[exerciseIndex].sets.forEach((s, i) => s.setNumber = i + 1);
    setLogs(newLogs);
  };

  // ← MODIFIÉ: handleFinish prépare maintenant le log et affiche le modal RPE
  const handleFinish = async () => {
    if (isRetroMode && (!retroDate.year || !retroDate.month || !retroDate.day)) {
      alert("Veuillez remplir la date complète pour enregistrer une séance passée.");
      return;
    }

    const sessionKey: SessionKey = {
      annee: sessionData[0]?.annee || '',
      moisNum: sessionData[0]?.moisNum || '',
      semaine: sessionData[0]?.semaine || '',
      seance: Array.from(new Set(sessionData.map(d => d.seance))).join('+')
    };

    let finalDate = new Date().toISOString();
    
    if (isEditMode && !isRetroMode && initialLog) {
      finalDate = initialLog.date;
    }
    
    if (isRetroMode) {
      const d = new Date(
        parseInt(retroDate.year), 
        parseInt(retroDate.month) - 1, 
        parseInt(retroDate.day), 
        12, 0, 0
      );
      finalDate = d.toISOString();
    }

    const finalLog: SessionLog = {
      id: isEditMode && initialLog ? initialLog.id : crypto.randomUUID(),
      date: finalDate,
      sessionKey,
      exercises: logs,
      durationMinutes: isRetroMode ? 60 : Math.round(elapsedTime / 60),
      sessionRpe: undefined // Sera défini via le modal
    };

    // Afficher le modal RPE de séance
    setPendingSessionLog(finalLog);
    setShowSessionRpeModal(true);
  };

  // ← NOUVEAU: Soumettre avec le RPE de séance
  const handleSessionRpeSubmit = async (sessionRpe: number) => {
    if (!pendingSessionLog) return;
    
    setSaving(true);
    const finalLog = { ...pendingSessionLog, sessionRpe };

    try {
      await onSave(finalLog);
      localStorage.removeItem('F.Y.T_active_session');
      setShowSessionRpeModal(false);
    } catch (e) {
      console.error("Erreur sauvegarde:", e);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  // ← NOUVEAU: Passer le RPE de séance
  const handleSkipSessionRpe = async () => {
    if (!pendingSessionLog) return;
    
    setSaving(true);

    try {
      await onSave(pendingSessionLog);
      localStorage.removeItem('F.Y.T_active_session');
      setShowSessionRpeModal(false);
    } catch (e) {
      console.error("Erreur sauvegarde:", e);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const getLastExerciseHistory = (name: string) => {
    for (const session of history) {
      const ex = session.exercises.find(e => e.exerciseName === name);
      if (ex) {
        return { date: session.date, sets: ex.sets, rpe: ex.rpe };
      }
    }
    return null;
  };

  const getProgress = (): number => {
    const totalSets = logs.reduce((acc, ex) => acc + ex.sets.length, 0);
    const completedSets = logs.reduce((acc, ex) => 
      acc + ex.sets.filter(s => s.completed).length, 0
    );
    return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  };

  const handleSendComment = async (exerciseName: string) => {
    const comment = exerciseComments[exerciseName]?.trim();
    if (!comment || !onSaveComment) return;
    
    setCommentSending(exerciseName);
    try {
      const sessionId = initialLog?.id || 'pending-session';
      await onSaveComment(exerciseName, comment, sessionId);
      setSentComments(prev => new Set([...prev, exerciseName]));
      setExerciseComments(prev => ({ ...prev, [exerciseName]: '' }));
    } catch (e) {
      console.error("Erreur envoi commentaire:", e);
      alert("Erreur lors de l'envoi du commentaire");
    } finally {
      setCommentSending(null);
    }
  };

  const sessionTitle = Array.from(new Set(sessionData.map(d => d.seance))).join(' + ');
  const progress = getProgress();
  const currentHistoryData = historyModalExercise ? getLastExerciseHistory(historyModalExercise) : null;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header fixe */}
      <div className="sticky top-0 z-30 -mx-4 px-4 lg:-mx-8 lg:px-8 py-4 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Session {sessionTitle}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-slate-400">{progress}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRetroMode(!isRetroMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isRetroMode 
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isRetroMode ? 'Annuler' : 'Séance passée'}
              </span>
            </button>
            
            <button 
              onClick={() => setShowCancelModal(true)}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Terminer'}
            </button>
          </div>
        </div>

        {/* Date rétroactive */}
        {isRetroMode && (
          <div className="mt-4 grid grid-cols-3 gap-3 max-w-md">
            <select 
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              value={retroDate.day}
              onChange={(e) => setRetroDate({...retroDate, day: e.target.value})}
            >
              <option value="">Jour</option>
              {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select 
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              value={retroDate.month}
              onChange={(e) => setRetroDate({...retroDate, month: e.target.value})}
            >
              <option value="">Mois</option>
              {['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select 
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              value={retroDate.year}
              onChange={(e) => setRetroDate({...retroDate, year: e.target.value})}
            >
              <option value="">Année</option>
              {[2025, 2024, 2023].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Liste des exercices */}
      <div className="space-y-4">
        {logs.map((exLog, exIdx) => {
          const originalData = sessionData.find(d => 
            d.exercice === exLog.exerciseName && d.seance === exLog.originalSession
          );
          const hasVideo = originalData?.video && isValidUrl(originalData.video);
          const isExpanded = expandedExercise === exIdx;
          const completedSets = exLog.sets.filter(s => s.completed).length;

          return (
            <div 
              key={exIdx} 
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
                isExpanded ? 'border-blue-500/50' : 'border-slate-800'
              }`}
            >
              {/* Header exercice */}
              <button
                onClick={() => setExpandedExercise(isExpanded ? null : exIdx)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    completedSets === exLog.sets.length 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {completedSets}/{exLog.sets.length}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{exLog.exerciseName}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      {originalData?.series && <span>{originalData.series} séries</span>}
                      {originalData?.repsDuree && <span>• {originalData.repsDuree}</span>}
                      {/* ← NOUVEAU: Afficher le RPE si défini */}
                      {exLog.rpe && (
                        <RpeBadge rpe={exLog.rpe} size="sm" showLabel={false} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {hasVideo && <Video className="w-5 h-5 text-blue-400" />}
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Contenu expandé */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-800">
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4">
                    {hasVideo && (
                      <a 
                        href={originalData?.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        Voir la démo
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => setHistoryModalExercise(exLog.exerciseName)}
                      className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      <History className="w-4 h-4" />
                      Historique
                    </button>
                  </div>

                  {/* Notes coach */}
                  {originalData?.notes && (
                    <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-200/80">{originalData.notes}</p>
                    </div>
                  )}

                  {/* Sets */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-3 text-xs font-medium text-slate-500 uppercase tracking-wider px-2">
                      <div className="col-span-2">Série</div>
                      <div className="col-span-4">Reps</div>
                      <div className="col-span-4">Poids (kg)</div>
                      <div className="col-span-2"></div>
                    </div>

                    {exLog.sets.map((set, setIdx) => (
                      <div 
                        key={setIdx} 
                        className={`grid grid-cols-12 gap-3 items-center p-3 rounded-xl transition-colors ${
                          set.completed ? 'bg-emerald-500/10' : 'bg-slate-800/50'
                        }`}
                      >
                        <div className="col-span-2">
                          <span className={`font-mono font-medium ${set.completed ? 'text-emerald-400' : 'text-slate-400'}`}>
                            #{set.setNumber}
                          </span>
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={set.reps}
                            onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                            placeholder={originalData?.repsDuree || '—'}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={set.weight}
                            onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                            placeholder="—"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateSet(exIdx, setIdx, 'completed', !set.completed)}
                            className={`p-2 rounded-lg transition-colors ${
                              set.completed 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          {exLog.sets.length > 1 && (
                            <button
                              onClick={() => removeSet(exIdx, setIdx)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => addSet(exIdx)}
                      className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une série
                    </button>
                  </div>

                  {/* ← NOUVEAU: Sélecteur RPE pour l'exercice */}
                  <div className="pt-4 border-t border-slate-800">
                    <RpeSelector
                      value={exLog.rpe}
                      onChange={(rpe) => updateExerciseRpe(exIdx, rpe)}
                      label="Difficulté ressentie (RPE)"
                      size="md"
                    />
                  </div>

                  {/* Section commentaires */}
                  {onSaveComment && (
                    <div className="pt-4 border-t border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">Message au coach</span>
                        {sentComments.has(exLog.exerciseName) && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Envoyé
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={exerciseComments[exLog.exerciseName] || ''}
                          onChange={(e) => setExerciseComments(prev => ({
                            ...prev,
                            [exLog.exerciseName]: e.target.value
                          }))}
                          placeholder="Ex: Douleur à l'épaule, poids trop léger..."
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <button
                          onClick={() => handleSendComment(exLog.exerciseName)}
                          disabled={!exerciseComments[exLog.exerciseName]?.trim() || commentSending === exLog.exerciseName}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                        >
                          {commentSending === exLog.exerciseName ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Historique */}
      {historyModalExercise && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{historyModalExercise}</h3>
              <button 
                onClick={() => setHistoryModalExercise(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {currentHistoryData ? (
              <div>
                <p className="text-sm text-slate-400 mb-3">
                  Dernière séance : {new Date(currentHistoryData.date).toLocaleDateString('fr-FR')}
                  {/* ← NOUVEAU: Afficher le RPE historique */}
                  {currentHistoryData.rpe && (
                    <span className="ml-2">
                      <RpeBadge rpe={currentHistoryData.rpe} size="sm" />
                    </span>
                  )}
                </p>
                <div className="space-y-2">
                  {currentHistoryData.sets.map((set, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-3">
                      <span className="text-sm text-slate-400">Série {set.setNumber}</span>
                      <span className="text-white font-medium">{set.reps} reps</span>
                      <span className="text-emerald-400">{set.weight} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">
                Aucun historique pour cet exercice
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal Annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Abandonner la séance ?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Votre progression ne sera pas sauvegardée.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Continuer
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← NOUVEAU: Modal RPE de séance */}
      {showSessionRpeModal && pendingSessionLog && (
        <SessionRpeModal
          onSubmit={handleSessionRpeSubmit}
          onSkip={handleSkipSessionRpe}
          sessionName={sessionTitle}
          durationMinutes={pendingSessionLog.durationMinutes || 0}
          exerciseCount={logs.length}
        />
      )}
    </div>
  );
};

export default ActiveSession;
