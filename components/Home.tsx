
import React, { useState, useMemo } from 'react';
import { WorkoutRow, FilterState, WeekOrganizerLog, User } from '../types';
import { SessionSelector } from './SessionSelector';
import { SessionView } from './SessionView';
import { Play, Calendar, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface Props {
  data: WorkoutRow[];
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  onStartSession: () => void;
  user: User;
  organizerLogs: WeekOrganizerLog[];
}

export const Home: React.FC<Props> = ({ data, filters, setFilters, onStartSession, user, organizerLogs }) => {
  const [isOrganizerExpanded, setIsOrganizerExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  
  // Combine all selected sessions
  const currentSessionData = data.filter(d => 
    d.annee === filters.selectedAnnee && 
    d.moisNum === filters.selectedMois && 
    d.semaine === filters.selectedSemaine && 
    filters.selectedSeances.includes(d.seance)
  );

  // Filter Active Organizer Message
  const activeMessage = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      // Find log that matches coach and date range
      // Sort by newest created just in case
      const valid = organizerLogs
        .filter(l => l.coachId === user.coachId || l.coachId === user.id) // Show own if coach
        .filter(l => l.startDate <= today && l.endDate >= today)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return valid.length > 0 ? valid[0] : null;
  }, [organizerLogs, user]);

  // History Logs
  const historyLogs = useMemo(() => {
      return organizerLogs
        .filter(l => l.coachId === user.coachId || l.coachId === user.id)
        .filter(l => l.id !== activeMessage?.id) // Exclude currently shown
        .sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [organizerLogs, user, activeMessage]);

  return (
    <div className="space-y-8 animate-fade-in">
        
        {/* Welcome Header */}
        <div className="flex flex-col gap-1 border-b border-slate-800 pb-6">
            <h1 className="text-3xl font-bold text-white">
                Welcome, <span className="text-emerald-400">{user.firstName || user.username}</span>
            </h1>
            <p className="text-slate-400">Ready to crush your goals this week?</p>
        </div>

        {/* Week Organizer Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm">
            <div 
                className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setIsOrganizerExpanded(!isOrganizerExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-purple-900/30 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-sm uppercase tracking-wide">
                            {activeMessage ? activeMessage.title : "Coach's Week Organizer"}
                        </h2>
                        {activeMessage && (
                            <p className="text-xs text-slate-400">
                                Valid: {activeMessage.startDate} to {activeMessage.endDate}
                            </p>
                        )}
                    </div>
                </div>
                {isOrganizerExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            </div>

            {isOrganizerExpanded && (
                <div className="p-6 border-t border-slate-800/50 bg-slate-950/30">
                    {activeMessage ? (
                        <div 
                            className="prose prose-invert prose-sm max-w-none text-slate-300"
                            dangerouslySetInnerHTML={{ __html: activeMessage.message }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                            <p>No specific instructions from your coach for today.</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Week Organizer History */}
        {historyLogs.length > 0 && (
             <div className="border border-slate-800 rounded-xl overflow-hidden">
                <button 
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="w-full flex items-center justify-between p-4 bg-slate-950 hover:bg-slate-900 transition-colors"
                >
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organizer History</span>
                    {isHistoryExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                
                {isHistoryExpanded && (
                    <div className="divide-y divide-slate-800">
                        {historyLogs.map(log => (
                            <details key={log.id} className="group bg-slate-900/50">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900 transition-colors list-none">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-200">{log.title}</span>
                                            <span className="text-xs text-slate-500">
                                                {log.startDate} <span className="text-slate-600">to</span> {log.endDate}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-slate-600 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-4 pt-0 pl-8 text-sm text-slate-400 border-t border-dashed border-slate-800/50">
                                    <div dangerouslySetInnerHTML={{ __html: log.message }} />
                                </div>
                            </details>
                        ))}
                    </div>
                )}
             </div>
        )}

        <div className="h-px bg-slate-800 my-8"></div>

        {/* Standard Session Selector */}
        <div>
             <div className="mb-4">
                 <h2 className="text-xl font-bold text-white">Training Preview</h2>
                 <p className="text-slate-400 text-sm">Combine sessions to prepare your workout.</p>
             </div>

            <SessionSelector 
                data={data} 
                filters={filters} 
                onChange={setFilters} 
            />

            {currentSessionData.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 z-10 pointer-events-auto">
                        <button 
                            onClick={onStartSession}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Start Session
                        </button>
                    </div>
                    
                    <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                        <SessionView 
                            sessionData={currentSessionData} 
                            selectedSessionsOrder={filters.selectedSeances} 
                        />
                    </div>
                </div>
            )}

            {currentSessionData.length === 0 && (
                <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                    <p className="text-slate-500">No session selected.</p>
                </div>
            )}
        </div>
    </div>
  );
};
