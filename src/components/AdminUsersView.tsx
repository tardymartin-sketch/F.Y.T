import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { 
  Users, 
  Shield, 
  User as UserIcon, 
  Dumbbell, 
  Edit2, 
  Check, 
  X,
  Search
} from 'lucide-react';

interface Props {
  fetchAllUsers: () => Promise<User[]>;
  onUpdateCoach: (userId: string, newCoachId: string | null) => Promise<void>;
}

export const AdminUsersView: React.FC<Props> = ({ fetchAllUsers, onUpdateCoach }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (e) {
      console.error("Erreur chargement utilisateurs:", e);
    } finally {
      setLoading(false);
    }
  };

  const coaches = users.filter(u => u.role === 'coach');

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      u.firstName?.toLowerCase().includes(term) ||
      u.lastName?.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term);
    
    const matchesRole = !filterRole || u.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setSelectedCoachId(user.coachId || null);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setSelectedCoachId(null);
  };

  const saveCoach = async (userId: string) => {
    setLoading(true);
    try {
      await onUpdateCoach(userId, selectedCoachId);
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, coachId: selectedCoachId || undefined } : u
      ));
      setEditingUserId(null);
    } catch (e) {
      alert("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return { 
          icon: Shield, 
          color: 'text-purple-400', 
          bg: 'bg-purple-500/20',
          label: 'Admin'
        };
      case 'coach':
        return { 
          icon: Dumbbell, 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-500/20',
          label: 'Coach'
        };
      default:
        return { 
          icon: UserIcon, 
          color: 'text-blue-400', 
          bg: 'bg-blue-500/20',
          label: 'Athlète'
        };
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    coaches: users.filter(u => u.role === 'coach').length,
    athletes: users.filter(u => u.role === 'athlete').length,
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Administration</h1>
        <p className="text-slate-400 text-sm mt-1">Gérer les utilisateurs</p>
      </div>

      {/* Stats - Horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
        <div className="flex-shrink-0 min-w-[120px] sm:min-w-0 bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs sm:text-sm text-slate-400">Total</p>
        </div>
        <div className="flex-shrink-0 min-w-[120px] sm:min-w-0 bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-purple-400">{stats.admins}</p>
          <p className="text-xs sm:text-sm text-slate-400">Admins</p>
        </div>
        <div className="flex-shrink-0 min-w-[120px] sm:min-w-0 bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-emerald-400">{stats.coaches}</p>
          <p className="text-xs sm:text-sm text-slate-400">Coachs</p>
        </div>
        <div className="flex-shrink-0 min-w-[120px] sm:min-w-0 bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
          <p className="text-xl sm:text-2xl font-bold text-blue-400">{stats.athletes}</p>
          <p className="text-xs sm:text-sm text-slate-400">Athlètes</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Role Filters - Horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {['Tous', 'admin', 'coach', 'athlete'].map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role === 'Tous' ? null : role)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              (role === 'Tous' && !filterRole) || filterRole === role
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {role === 'Tous' ? 'Tous' : getRoleConfig(role).label}
          </button>
        ))}
      </div>

      {/* Loading / Empty State */}
      {loading && users.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Chargement...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="space-y-2 md:hidden">
            {filteredUsers.map((user) => {
              const roleConfig = getRoleConfig(user.role);
              const Icon = roleConfig.icon;
              const assignedCoach = coaches.find(c => c.id === user.coachId);
              const isEditing = editingUserId === user.id;

              return (
                <div 
                  key={user.id} 
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 font-medium text-sm flex-shrink-0">
                      {user.firstName?.[0]}{user.lastName?.[0] || user.username[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <div className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded ${roleConfig.bg}`}>
                          <Icon className={`w-3 h-3 ${roleConfig.color}`} />
                          <span className={`text-xs font-medium ${roleConfig.color}`}>
                            {roleConfig.label}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 truncate">@{user.username}</p>
                      
                      {/* Coach assignment */}
                      {isEditing ? (
                        <select
                          value={selectedCoachId || ''}
                          onChange={(e) => setSelectedCoachId(e.target.value || null)}
                          className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Aucun coach</option>
                          {coaches.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.firstName} {c.lastName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        assignedCoach && (
                          <p className="text-xs text-slate-400 mt-1">
                            Coach: {assignedCoach.firstName} {assignedCoach.lastName}
                          </p>
                        )
                      )}
                    </div>

                    {/* Actions */}
                    {user.role !== 'admin' && (
                      <div className="flex-shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => saveCoach(user.id)}
                              disabled={loading}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 bg-slate-700 text-white rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(user)}
                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr className="text-left text-sm text-slate-400">
                    <th className="px-6 py-4 font-medium">Utilisateur</th>
                    <th className="px-6 py-4 font-medium">Rôle</th>
                    <th className="px-6 py-4 font-medium">Coach assigné</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.map((user) => {
                    const roleConfig = getRoleConfig(user.role);
                    const Icon = roleConfig.icon;
                    const assignedCoach = coaches.find(c => c.id === user.coachId);
                    const isEditing = editingUserId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-medium">
                              {user.firstName?.[0]}{user.lastName?.[0] || user.username[0]}
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-slate-500">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${roleConfig.bg}`}>
                            <Icon className={`w-4 h-4 ${roleConfig.color}`} />
                            <span className={`text-sm font-medium ${roleConfig.color}`}>
                              {roleConfig.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={selectedCoachId || ''}
                              onChange={(e) => setSelectedCoachId(e.target.value || null)}
                              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Aucun coach</option>
                              {coaches.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.firstName} {c.lastName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400">
                              {assignedCoach 
                                ? `${assignedCoach.firstName} ${assignedCoach.lastName}`
                                : '—'
                              }
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.role !== 'admin' && (
                            isEditing ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveCoach(user.id)}
                                  disabled={loading}
                                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditing(user)}
                                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
        </>
      )}
    </div>
  );
};

