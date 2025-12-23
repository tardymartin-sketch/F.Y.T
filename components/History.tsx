
import React, { useState } from 'react';
import { SessionLog } from '../types';
import { Calendar, Clock, ChevronDown, ChevronUp, Dumbbell, Trash2, AlertTriangle, ChevronLeft, ChevronRight, ZoomIn, Edit2 } from 'lucide-react';

interface Props {
  history: SessionLog[];
  onDelete: (id: string) => void;
  onEdit: (log: SessionLog) => void;
}

export const History: React.FC<Props> = ({ history, onDelete, onEdit }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // View State: 'year' or 'month' - Default to MONTH as requested
  const [viewMode, setViewMode] = useState<'year' | 'month'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // --- Calendar Logic ---
  const workoutDates = history.map(h => {
      const d = new Date(h.date);
      if (isNaN(d.getTime())) {
          // Fallback parsing for legacy non-iso dates
          if (h.date.includes('/')) {
              const parts = h.date.split(' - ')[0].split('/');
              return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
          return '';
      }
      return d.toISOString().split('T')[0];
  });

  const hasWorkout = (year: number, month: number, day: number) => {
      const m = String(month + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const dateKey = `${year}-${m}-${d}`;
      return workoutDates.includes(dateKey);
  };

  // --- Render Single Month (Zoomed In) ---
  const renderSingleMonthView = () => {
      const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
      const startDay = new Date(currentYear, selectedMonth, 1).getDay(); // 0=Sun
      const monthName = new Date(currentYear, selectedMonth).toLocaleString('default', { month: 'long' });
      const days = [];

      // Empty slots
      for (let i = 0; i < startDay; i++) {
          days.push(<div key={`empty-${i}`} className="h-10"></div>);
      }

      // Days
      for (let i = 1; i <= daysInMonth; i++) {
          const active = hasWorkout(currentYear, selectedMonth, i);
          days.push(
              <div key={i} className={`h-10 flex flex-col items-center justify-center rounded-lg relative border ${active ? 'bg-slate-800 border-slate-700' : 'border-transparent'}`}>
                  <span className={`text-sm ${active ? 'text-white font-bold' : 'text-slate-500'}`}>{i}</span>
                  {active && (
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 shadow-[0_0_4px_rgba(59,130,246,0.8)]"></span>
                  )}
              </div>
          );
      }

      return (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                   <button onClick={() => {
                       const newM = selectedMonth - 1;
                       if (newM < 0) { setSelectedMonth(11); setCurrentYear(currentYear - 1); }
                       else { setSelectedMonth(newM); }
                   }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5"/></button>
                   
                   <h3 className="text-xl font-bold text-white capitalize">{monthName} {currentYear}</h3>

                   <button onClick={() => {
                       const newM = selectedMonth + 1;
                       if (newM > 11) { setSelectedMonth(0); setCurrentYear(currentYear + 1); }
                       else { setSelectedMonth(newM); }
                   }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronRight className="w-5 h-5"/></button>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => (
                       <div key={i} className="text-xs text-slate-500 font-bold uppercase tracking-wider">{d}</div>
                   ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                  {days}
              </div>
              <div className="mt-4 text-center">
                  <button onClick={() => setViewMode('year')} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 mx-auto">
                      View Full Year
                  </button>
              </div>
          </div>
      );
  };

  // --- Render Year Grid (Zoomed Out) ---
  const renderYearGridMonth = (monthIndex: number) => {
      const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
      const startDay = new Date(currentYear, monthIndex, 1).getDay(); // 0=Sun
      const days = [];
      const monthName = new Date(currentYear, monthIndex).toLocaleString('default', { month: 'short' });

      for (let i = 0; i < startDay; i++) {
          days.push(<div key={`empty-${i}`} className="h-1 w-1"></div>);
      }
      for (let i = 1; i <= daysInMonth; i++) {
          const active = hasWorkout(currentYear, monthIndex, i);
          days.push(
              <div key={i} className="flex items-center justify-center h-4 w-4 relative">
                  <span className={`text-[9px] ${active ? 'text-white font-bold' : 'text-slate-600'}`}>{i}</span>
                  {active && (
                      <span className="absolute bottom-0 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_2px_rgba(59,130,246,0.8)]"></span>
                  )}
              </div>
          );
      }

      return (
          <div key={monthIndex} className="bg-slate-900 border border-slate-800 rounded-lg p-2 hover:border-slate-600 transition-colors">
              <button 
                onClick={() => { setSelectedMonth(monthIndex); setViewMode('month'); }}
                className="w-full text-xs font-bold text-slate-400 mb-2 uppercase text-center hover:text-emerald-400 flex items-center justify-center gap-1"
              >
                  {monthName} <ZoomIn className="w-3 h-3 opacity-50" />
              </button>
              <div className="grid grid-cols-7 gap-0.5 justify-items-center cursor-pointer" onClick={() => { setSelectedMonth(monthIndex); setViewMode('month'); }}>
                   {['S','M','T','W','T','F','S'].map((d,i) => (
                       <div key={i} className="text-[8px] text-slate-700">{d}</div>
                   ))}
                   {days}
              </div>
          </div>
      );
  };

  const renderYearCalendar = () => {
      const months = [];
      for(let i=0; i<12; i++) {
          months.push(renderYearGridMonth(i));
      }
      return months;
  };

  // --- List Parsing Logic ---
  const parseCustomDate = (dateStr: string) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    try {
        if (!dateStr) return { isValid: false, month: '---', day: '--', year: 0 };
        // Normalize
        let d: Date;
        const d_iso = new Date(dateStr);
        if(!isNaN(d_iso.getTime())) {
            d = d_iso;
        } else if (dateStr.includes('/')) {
            // Legacy handling
             const parts = dateStr.split(' - ')[0].replace(/\//g, '-');
             d = new Date(parts);
        } else {
             d = new Date(dateStr);
        }

        if (!isNaN(d.getTime())) {
            return { isValid: true, month: months[d.getMonth()], day: d.getDate(), year: d.getFullYear() };
        }
        return { isValid: false, month: '---', day: '--', year: 0 };
    } catch (e) {
        return { isValid: false, month: '---', day: '--', year: 0 };
    }
  };

  // Strictly sort descending by time
  const sortedHistory = [...history].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) return timeB - timeA;
      return b.date.localeCompare(a.date);
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
    <div className="space-y-6 animate-fade-in pb-20">
        <h2 className="text-2xl font-bold text-white mb-2">Workout History</h2>
        
        {/* Calendar Section - Added Max Width */}
        <div className="mb-8 max-w-4xl mx-auto">
            {viewMode === 'year' ? (
                <>
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => setCurrentYear(currentYear - 1)} className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronLeft className="w-5 h-5"/></button>
                        <span className="text-xl font-bold text-white cursor-pointer hover:text-emerald-400 transition-colors" title="Year View">{currentYear}</span>
                        <button onClick={() => setCurrentYear(currentYear + 1)} className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronRight className="w-5 h-5"/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {renderYearCalendar()}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setViewMode('year')} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                            <ChevronLeft className="w-4 h-4" /> Back to {currentYear}
                        </button>
                    </div>
                    {renderSingleMonthView()}
                </>
            )}
        </div>

        {/* History List */}
        {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                 <Dumbbell className="w-8 h-8 mb-2 opacity-20" />
                 <p className="text-sm">No workout history yet.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {sortedHistory.map((log, index) => {
                    const isExpanded = expandedId === log.id;
                    const dateInfo = parseCustomDate(log.date);
                    
                    // Logic for Year Separator
                    const prevLog = index > 0 ? sortedHistory[index - 1] : null;
                    const prevYear = prevLog ? parseCustomDate(prevLog.date).year : null;
                    const showSeparator = prevYear !== 0 && dateInfo.year !== 0 && prevYear !== dateInfo.year;

                    return (
                        <React.Fragment key={log.id}>
                            {showSeparator && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="h-px bg-slate-800 flex-1"></div>
                                    <span className="px-4 text-slate-500 font-bold text-sm">{dateInfo.year}</span>
                                    <div className="h-px bg-slate-800 flex-1"></div>
                                </div>
                            )}

                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors group relative">
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
                                                Week {log.sessionKey.semaine} • {log.exercises.length} Exercises
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-500">
                                        {log.durationMinutes ? (
                                            <div className="flex items-center gap-1 text-xs">
                                                <Clock className="w-3 h-3" />
                                                {log.durationMinutes} min
                                            </div>
                                        ) : null}
                                        <div onClick={(e) => handleEditClick(e, log)} className="p-2 hover:bg-emerald-900/20 hover:text-emerald-400 rounded-full transition-colors z-10" title="Edit Session">
                                            <Edit2 className="w-4 h-4" />
                                        </div>
                                        <div onClick={(e) => handleDeleteClick(e, log.id)} className="p-2 hover:bg-red-900/20 hover:text-red-400 rounded-full transition-colors z-10" title="Delete Session">
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
                                                    <div className="col-span-1">Set</div>
                                                    <div className="col-span-1">Reps</div>
                                                    <div className="col-span-1">Weight</div>
                                                </div>
                                                {ex.sets.map((set, j) => (
                                                    <div key={j} className="grid grid-cols-4 gap-2 py-1 border-b border-slate-800/50 last:border-0 text-slate-300">
                                                        <div className="col-span-1 text-slate-500">#{set.setNumber}</div>
                                                        <div className="col-span-1">{set.reps || '-'}</div>
                                                        <div className="col-span-1">{set.weight || '-'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingId && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Session?</h3>
                        <p className="text-slate-400 text-sm">Are you sure you want to remove this session from your history?</p>
                    </div>
                    <div className="flex gap-3">
                         <button 
                            onClick={() => setDeletingId(null)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
