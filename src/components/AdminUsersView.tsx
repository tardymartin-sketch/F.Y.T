import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { 
  Users, 
  Shield, 
  User as UserIcon, 
  Dumbbell, 
  Save, 
  Edit2, 
  Check, 
  X,
  Search,
  ChevronDown,
  AlertCircle
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
      cancelEditing();
    } catch (e) {
      console.error("Erreur mise à jour coach:", e);
    } finally {
      setLoading(false);
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return { icon: Shield, label: 'Admin', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      case 'coach':
        return { icon: Users, label: 'Coach', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      default:
        return { icon: Dumbbell, label: 'Athlète', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Administration</h1>
        <p className="text-slate-400 mt-1">Gestion des utilisateurs et des rôles</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          {[null, 'admin', 'coach', 'athlete'].map((role) => (
            <button
              key={role || 'all'}
              onClick={() => setFilterRole(role)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                filterRole === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {!role ? 'Tous' : getRoleConfig(role).label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Chargement...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">Aucun utilisateur trouvé</p>
          </div>
        ) : (
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
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveCoach(user.id)}
                              className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(user)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
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
    </div>
  );
};

export default AdminUsersView;
