import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Users, Shield, User as UserIcon, Dumbbell, Edit2, Check, X } from 'lucide-react';

interface Props {
  fetchAllUsers: () => Promise<User[]>;
  onUpdateCoach: (userId: string, newCoachId: string) => Promise<void>;
}

export const AdminUsersView: React.FC<Props> = ({ fetchAllUsers, onUpdateCoach }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedCoachMap, setSelectedCoachMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const availableCoaches = users.filter(u => u.role === 'coach');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-purple-400" />;
      case 'coach': return <Dumbbell className="w-4 h-4 text-emerald-400" />;
      default: return <UserIcon className="w-4 h-4 text-blue-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestion des utilisateurs</h2>
        <span className="text-sm text-slate-400">{users.length} utilisateurs</span>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <Users className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-xs font-semibold">
                <th className="p-4">Utilisateur</th>
                <th className="p-4">Rôle</th>
                <th className="p-4">Coach</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map(u => {
                const currentCoach = users.find(c => c.id === u.coachId);
                const isEditing = editingUserId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-slate-500">@{u.username}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 bg-slate-950 w-fit px-3 py-1 rounded-full border border-slate-800">
                        {getRoleIcon(u.role)}
                        <span className="capitalize text-slate-300">{u.role}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">
                      {isEditing ? (
                        <select 
                          className="bg-slate-950 border border-slate-700 rounded p-2 text-white w-full outline-none focus:border-emerald-500"
                          value={selectedCoachMap[u.id || ''] || ''}
                          onChange={(e) => setSelectedCoachMap({...selectedCoachMap, [u.id || '']: e.target.value})}
                        >
                          <option value="">Aucun coach</option>
                          {availableCoaches.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.firstName} {c.lastName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={currentCoach ? 'text-emerald-400 font-medium' : 'text-slate-600 italic'}>
                          {currentCoach ? `${currentCoach.firstName} ${currentCoach.lastName}` : 'Non assigné'}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {u.role !== 'admin' && (
                        isEditing ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={async () => {
                                if (u.id) {
                                  await onUpdateCoach(u.id, selectedCoachMap[u.id] || '');
                                  setEditingUserId(null);
                                  loadUsers();
                                }
                              }}
                              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingUserId(null)}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingUserId(u.id || null);
                              setSelectedCoachMap({...selectedCoachMap, [u.id || '']: u.coachId || ''});
                            }}
                            className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors"
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
      )}
    </div>
  );
};
