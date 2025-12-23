
import React, { useState, useEffect } from 'react';
import { User, SessionLog, WeekOrganizerLog } from '../types';
import { History } from './History';
import { Users, ChevronRight, Activity, Search, MessageSquare, List, CheckSquare, X, EyeOff, Calendar, Save, Type } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

interface Comment {
    date: string;
    userId: string;
    username: string;
    year: string;
    month: string;
    week: string;
    session: string;
    exercise: string;
    comment: string;
}

interface Props {
  coachId: string;
  fetchTeam: (coachId: string) => Promise<User[]>;
  fetchAthleteHistory: (username: string) => Promise<SessionLog[]>;
  fetchTeamComments?: (coachId: string) => Promise<Comment[]>;
  onDeleteSession: (id: string) => Promise<void>; 
  onMarkCommentsRead?: (comments: Comment[]) => Promise<void>;
  
  // New props for Week Organizer
  organizerLogs: WeekOrganizerLog[];
  onSaveOrganizerLog: (log: WeekOrganizerLog) => Promise<void>;
}

export const TeamView: React.FC<Props> = ({ 
    coachId, 
    fetchTeam, 
    fetchAthleteHistory, 
    fetchTeamComments, 
    onDeleteSession, 
    onMarkCommentsRead,
    organizerLogs,
    onSaveOrganizerLog
}) => {
  const [activeTab, setActiveTab] = useState<'athletes' | 'comments' | 'organizer'>('athletes');
  const [athletes, setAthletes] = useState<User[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Feedback Selection State
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set());

  // Week Organizer State
  const [orgTitle, setOrgTitle] = useState('');
  const [orgMessage, setOrgMessage] = useState('');
  const [orgStartDate, setOrgStartDate] = useState('');
  const [orgEndDate, setOrgEndDate] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    loadData();
  }, [coachId, activeTab]);

  const loadData = async () => {
      setLoading(true);
      try {
          if (activeTab === 'athletes' && athletes.length === 0) {
              const team = await fetchTeam(coachId);
              setAthletes(team);
          } else if (activeTab === 'comments' && fetchTeamComments) {
              const comms = await fetchTeamComments(coachId);
              // Sort by date desc
              comms.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setComments(comms);
              setSelectedComments(new Set()); // Reset selection on reload
          }
      } catch (e) {
          console.error("Failed to load team data");
      } finally {
          setLoading(false);
      }
  };

  const handleSelectAthlete = async (athlete: User) => {
      setSelectedAthlete(athlete);
      setLoading(true);
      try {
          const hist = await fetchAthleteHistory(athlete.username);
          setHistory(hist);
      } catch (e) {
          console.error("Failed to load athlete history");
      } finally {
          setLoading(false);
      }
  };

  const toggleCommentSelection = (index: number) => {
      const newSelection = new Set(selectedComments);
      if (newSelection.has(index)) {
          newSelection.delete(index);
      } else {
          newSelection.add(index);
      }
      setSelectedComments(newSelection);
  };

  const handleMarkAsRead = async () => {
      if (!onMarkCommentsRead) return;
      const commentsToMark = Array.from(selectedComments).map(idx => comments[idx]);
      setComments(prev => prev.filter((_, idx) => !selectedComments.has(idx)));
      setSelectedComments(new Set());
      await onMarkCommentsRead(commentsToMark);
  };

  const handleSaveOrganizer = async () => {
      if (!orgTitle || !orgMessage || !orgStartDate || !orgEndDate) {
          alert("Please fill in Title, Message and Dates.");
          return;
      }
      if (orgStartDate > orgEndDate) {
          alert("Start date must be before end date.");
          return;
      }

      setSavingOrg(true);
      try {
          const newLog: WeekOrganizerLog = {
              id: crypto.randomUUID(),
              coachId: coachId,
              title: orgTitle,
              startDate: orgStartDate,
              endDate: orgEndDate,
              message: orgMessage,
              createdAt: new Date().toISOString()
          };
          await onSaveOrganizerLog(newLog);
          setOrgTitle('');
          setOrgMessage('');
          setOrgStartDate('');
          setOrgEndDate('');
          alert("Week Organizer Updated!");
      } catch (e) {
          alert("Failed to save.");
      } finally {
          setSavingOrg(false);
      }
  };

  if (selectedAthlete) {
      return (
          <div className="animate-fade-in">
              <button 
                onClick={() => setSelectedAthlete(null)}
                className="mb-6 flex items-center text-slate-400 hover:text-white transition-colors text-sm"
              >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
                  Back to Team
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-xl font-bold text-white">
                      {selectedAthlete.firstName?.[0]}{selectedAthlete.lastName?.[0]}
                  </div>
                  <div>
                      <h1 className="text-2xl font-bold text-white">{selectedAthlete.firstName} {selectedAthlete.lastName}</h1>
                      <p className="text-slate-400 text-sm">@{selectedAthlete.username}</p>
                  </div>
              </div>

              <History history={history} onDelete={onDeleteSession} />
          </div>
      );
  }

  // Filter logs for this coach
  const myOrganizerLogs = organizerLogs
    .filter(l => l.coachId === coachId)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="animate-fade-in space-y-6 pb-20 relative">
        <div className="flex justify-between items-center">
             <h1 className="text-2xl font-bold text-white">My Team</h1>
        </div>
        
        {/* Carousel / Tab Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit overflow-x-auto">
            <button 
                onClick={() => setActiveTab('athletes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'athletes' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Users className="w-4 h-4" />
                Athletes
            </button>
            <button 
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'comments' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <MessageSquare className="w-4 h-4" />
                Feedback
            </button>
            <button 
                onClick={() => setActiveTab('organizer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'organizer' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Calendar className="w-4 h-4" />
                Week Organizer
            </button>
        </div>
        
        {loading && <div className="text-slate-500 text-sm animate-pulse">Loading data...</div>}

        {/* View 1: Athletes List */}
        {activeTab === 'athletes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-left-4 fade-in duration-300">
                {athletes.map(athlete => (
                    <button
                        key={athlete.id}
                        onClick={() => handleSelectAthlete(athlete)}
                        className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-bold group-hover:bg-emerald-900/50 group-hover:text-emerald-400 transition-colors">
                                {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                    {athlete.firstName} {athlete.lastName}
                                </div>
                                <div className="text-xs text-slate-500">@{athlete.username}</div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-500 transition-colors" />
                    </button>
                ))}
                
                {!loading && athletes.length === 0 && (
                    <div className="col-span-full py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                        <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500">No athletes linked to your account yet.</p>
                        <p className="text-xs text-slate-600 mt-1">Use Settings to invite athletes.</p>
                    </div>
                )}
            </div>
        )}

        {/* View 2: Feedback (Comments) Feed */}
        {activeTab === 'comments' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                 {comments.length === 0 && !loading && (
                    <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                        <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500">No new feedback found.</p>
                    </div>
                 )}
                 {comments.map((c, i) => {
                     const isSelected = selectedComments.has(i);
                     return (
                         <div key={i} className={`bg-slate-900 border rounded-xl p-4 transition-all ${isSelected ? 'border-emerald-500 shadow-md shadow-emerald-900/20' : 'border-slate-800'}`}>
                             <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-2">
                                     <div className="w-8 h-8 bg-emerald-900/30 text-emerald-400 rounded-full flex items-center justify-center font-bold text-xs">
                                         {c.username.substring(0, 2).toUpperCase()}
                                     </div>
                                     <div>
                                         <div className="text-sm font-bold text-white">{c.username}</div>
                                         <div className="text-xs text-slate-500">{new Date(c.date).toLocaleDateString()}</div>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-400">
                                         S{c.session}
                                     </div>
                                     <button 
                                        onClick={() => toggleCommentSelection(i)}
                                        className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-600 hover:border-slate-400'}`}
                                     >
                                        {isSelected && <CheckSquare className="w-4 h-4" />}
                                     </button>
                                 </div>
                             </div>
                             <div className="pl-10">
                                 <div className="text-xs text-emerald-500 font-semibold mb-1">{c.exercise}</div>
                                 <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                                     "{c.comment}"
                                 </p>
                             </div>
                         </div>
                     );
                 })}
            </div>
        )}

        {/* View 3: Week Organizer */}
        {activeTab === 'organizer' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        Create New Message
                    </h2>

                    {/* Title Input */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-400 mb-2">Message Title</label>
                        <div className="relative">
                            <Type className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input 
                                type="text"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:border-purple-500 outline-none placeholder:text-slate-600"
                                placeholder="e.g. Focus for Week 4"
                                value={orgTitle}
                                onChange={(e) => setOrgTitle(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Rich Text Editor */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-400 mb-2">Message Content</label>
                        <RichTextEditor value={orgMessage} onChange={setOrgMessage} />
                    </div>

                    {/* Validity Dates */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
                            <input 
                                type="date" 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none"
                                value={orgStartDate}
                                onChange={(e) => setOrgStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">End Date</label>
                            <input 
                                type="date" 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none"
                                value={orgEndDate}
                                onChange={(e) => setOrgEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveOrganizer}
                        disabled={savingOrg}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {savingOrg ? 'Saving...' : 'Publish Message'}
                        <Save className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Previous Messages</h3>
                    {myOrganizerLogs.length === 0 ? (
                        <p className="text-slate-600 text-sm italic">No history yet.</p>
                    ) : (
                        myOrganizerLogs.map(log => (
                            <details key={log.id} className="group bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                                <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800 transition-colors list-none">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-mono text-purple-400 bg-purple-900/20 px-2 py-1 rounded">
                                            {log.startDate} &rarr; {log.endDate}
                                        </div>
                                        <div className="text-sm font-bold text-white">{log.title}</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600 group-open:rotate-90 transition-transform" />
                                </summary>
                                <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-sm text-slate-300">
                                    <div dangerouslySetInnerHTML={{ __html: log.message }} />
                                    <div className="text-xs text-slate-600 mt-2 text-right">Created: {new Date(log.createdAt).toLocaleDateString()}</div>
                                </div>
                            </details>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* Floating Action Bar for Selected Comments */}
        {selectedComments.size > 0 && activeTab === 'comments' && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-2 flex items-center gap-2 z-50 animate-in slide-in-from-bottom-4 zoom-in-95">
                <span className="text-sm font-bold text-white px-3">{selectedComments.size} selected</span>
                <div className="h-6 w-px bg-slate-700 mx-1"></div>
                <button 
                    onClick={() => setSelectedComments(new Set())}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors text-sm font-medium"
                >
                    <X className="w-4 h-4" />
                    Cancel
                </button>
                <button 
                    onClick={handleMarkAsRead}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition-colors text-sm font-bold"
                >
                    <EyeOff className="w-4 h-4" />
                    Mark as Read
                </button>
            </div>
        )}
    </div>
  );
};
