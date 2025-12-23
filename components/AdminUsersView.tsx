
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Users, Shield, User as UserIcon, Dumbbell, Save, Edit2, Check, ArrowUpDown } from 'lucide-react';

interface Props {
  fetchAllUsers: () => Promise<User[]>;
  onUpdateCoach: (userId: string, newCoachId: string) => Promise<void>;
}

type SortKey = 'name' | 'role' | 'coach';

export const AdminUsersView: React.FC<Props> = ({ fetchAllUsers, onUpdateCoach }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedCoachMap, setSelectedCoachMap] = useState<Record<string, string>>({});
  
  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
      loadUsers();
  }, []);

  const loadUsers = async () => {
      setLoading(true);
      try {
          const data = await fetchAllUsers();
          // Filter out invalid data where name is missing
          const validUsers = data.filter(u => u.firstName && u.username);
          setUsers(validUsers);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const availableCoaches = users.filter(u => u.role === 'coach');

  const startEditing = (user: User) => {
      setEditingUserId(user.id);
      setSelectedCoachMap(prev => ({...prev, [user.id]: user.coachId || ''}));
  };

  const saveCoach = async (userId: string) => {
      const newCoachId = selectedCoachMap[userId];
      setLoading(true);
      try {
          await onUpdateCoach(userId, newCoachId);
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, coachId: newCoachId } : u));
          setEditingUserId(null);
      } catch (e) {
          alert("Failed to update coach");
      } finally {
          setLoading(false);
      }
  };

  const handleSort = (key: SortKey) => {
      if (sortKey === key) {
          setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
          setSortKey(key);
          setSortDir('asc');
      }
  };

  const getSortedUsers = () => {
      // Create a shallow copy to sort, do not mutate state directly
      const usersCopy = [...users];
      
      return usersCopy.sort((a, b) => {
          let valA = '';
          let valB = '';

          if (sortKey === 'name') {
              valA = (a.firstName + ' ' + a.lastName).toLowerCase();
              valB = (b.firstName + ' ' + b.lastName).toLowerCase();
          } else if (sortKey === 'role') {
              valA = a.role.toLowerCase();
              valB = b.role.toLowerCase();
          } else if (sortKey === 'coach') {
              const coachA = users.find(u => u.id === a.coachId);
              const coachB = users.find(u => u.id === b.coachId);
              valA = coachA ? (coachA.firstName + ' ' + coachA.lastName).toLowerCase() : 'zzzz'; 
              valB = coachB ? (coachB.firstName + ' ' + coachB.lastName).toLowerCase() : 'zzzz';
              
              if (!coachA) valA = ''; // Empty string for no coach (sorts to top in asc)
              if (!coachB) valB = '';
          }

          if (valA < valB) return sortDir === 'asc' ? -1 : 1;
          if (valA > valB) return sortDir === 'asc' ? 1 : -1;
          return 0;
      });
  };

  const getRoleIcon = (role: string) => {
      switch(role) {
          case 'admin': return <Shield className="w-4 h-4 text-purple-400" />;
          case 'coach': return <Dumbbell className="w-4 h-4 text-emerald-400" />;
          default: return <UserIcon className="w-4 h-4 text-blue-400" />;
      }
  };

  const sortedUsers = getSortedUsers();

  return (
    <div className="animate-fade-in space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <div className="text-sm text-slate-400">Total: {sortedUsers.length}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-xs font-semibold">
                            <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-2">
                                    User 
                                    <ArrowUpDown className={`w-3 h-3 ${sortKey === 'name' ? 'text-emerald-400' : 'text-slate-600'}`} />
                                </div>
                            </th>
                            <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('role')}>
                                <div className="flex items-center gap-2">
                                    Role 
                                    <ArrowUpDown className={`w-3 h-3 ${sortKey === 'role' ? 'text-emerald-400' : 'text-slate-600'}`} />
                                </div>
                            </th>
                            <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('coach')}>
                                <div className="flex items-center gap-2">
                                    Coach Link 
                                    <ArrowUpDown className={`w-3 h-3 ${sortKey === 'coach' ? 'text-emerald-400' : 'text-slate-600'}`} />
                                </div>
                            </th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sortedUsers.map(u => {
                            const currentCoach = users.find(c => c.id === u.coachId);
                            const isEditing = editingUserId === u.id;

                            return (
                                <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{u.firstName} {u.lastName}</div>
                                        <div className="text-xs text-slate-500">@{u.username}</div>
                                        <div className="text-xs text-slate-600 font-mono mt-0.5">{u.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 bg-slate-950 w-fit px-3 py-1 rounded-full border border-slate-800">
                                            {getRoleIcon(u.role)}
                                            <span className="capitalize text-slate-300">{u.role}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-400 min-w-[200px]">
                                        {isEditing ? (
                                            <select 
                                                className="bg-slate-950 border border-slate-700 rounded p-2 text-white w-full outline-none focus:border-emerald-500"
                                                value={selectedCoachMap[u.id] || ''}
                                                onChange={(e) => setSelectedCoachMap({...selectedCoachMap, [u.id]: e.target.value})}
                                            >
                                                <option value="">No Coach</option>
                                                {availableCoaches.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.firstName} {c.lastName} ({c.username})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {currentCoach ? (
                                                    <span className="text-emerald-400 font-medium">
                                                        {currentCoach.firstName} {currentCoach.lastName}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 italic">No Coach Linked</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {u.role !== 'admin' && (
                                            isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => saveCoach(u.id)}
                                                        disabled={loading}
                                                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                                        title="Save"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditingUserId(null)}
                                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <XIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => startEditing(u)}
                                                    className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors"
                                                    title="Edit Coach"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

const XIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
);
