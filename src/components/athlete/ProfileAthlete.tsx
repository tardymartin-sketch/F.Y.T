// ============================================================
// F.Y.T - PROFILE ATHLETE (Mobile-First)
// src/components/athlete/ProfileAthlete.tsx
// Vue profil de l'athlète avec stats et paramètres
// ============================================================

import React, { useMemo } from 'react';
import { User, SessionLog } from '../../../types';
import { Card, CardContent } from '../shared/Card';
import {
  User as UserIcon,
  Settings,
  LogOut,
  Calendar,
  Clock,
  Activity,
  TrendingUp,
  Award,
  ChevronRight
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  user: User;
  history: SessionLog[];
  coachName?: string;
  onOpenSettings: () => void;
  onLogout: () => void;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function getInitials(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return user.username.substring(0, 2).toUpperCase();
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}`;
}

// ===========================================
// COMPONENT
// ===========================================

export const ProfileAthlete: React.FC<Props> = ({
  user,
  history,
  coachName,
  onOpenSettings,
  onLogout
}) => {
  // ===========================================
  // COMPUTED STATS
  // ===========================================
  
  const stats = useMemo(() => {
    const totalSessions = history.length;
    const totalMinutes = history.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    
    // RPE moyen (uniquement sessions avec RPE)
    const sessionsWithRpe = history.filter(s => s.sessionRpe !== undefined && s.sessionRpe !== null);
    const avgRpe = sessionsWithRpe.length > 0
      ? sessionsWithRpe.reduce((sum, s) => sum + (s.sessionRpe || 0), 0) / sessionsWithRpe.length
      : null;
    
    // Séries totales
    const totalSets = history.reduce((sum, session) => {
      return sum + session.exercises.reduce((exSum, ex) => {
        return exSum + ex.sets.filter(s => s.completed).length;
      }, 0);
    }, 0);
    
    // Streak (jours consécutifs d'entraînement)
    let currentStreak = 0;
    const sortedDates = [...new Set(history.map(s => s.date.split('T')[0]))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    return {
      totalSessions,
      totalMinutes,
      avgRpe,
      totalSets,
      currentStreak
    };
  }, [history]);

  // ===========================================
  // RENDER
  // ===========================================
  
  return (
    <div className="space-y-6 pb-4">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center pt-4">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
          <span className="text-3xl font-bold text-white">
            {getInitials(user)}
          </span>
        </div>
        
        {/* Name */}
        <h1 className="text-2xl font-bold text-white">
          {user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.username
          }
        </h1>
        
        {/* Username */}
        {user.firstName && user.lastName && (
          <p className="text-slate-400 text-sm">@{user.username}</p>
        )}
        
        {/* Email */}
        {user.email && (
          <p className="text-slate-500 text-sm mt-1">{user.email}</p>
        )}
      </div>

      {/* Coach Info */}
      {coachName && (
        <Card variant="gradient" className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Mon coach</p>
                <p className="font-semibold text-white">{coachName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4" />
          Mes statistiques
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Total Sessions */}
          <Card variant="default" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
                <p className="text-xs text-slate-400">séances</p>
              </div>
            </div>
          </Card>
          
          {/* Total Time */}
          <Card variant="default" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formatDuration(stats.totalMinutes)}</p>
                <p className="text-xs text-slate-400">total</p>
              </div>
            </div>
          </Card>
          
          {/* Average RPE */}
          <Card variant="default" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats.avgRpe !== null ? stats.avgRpe.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-slate-400">RPE moyen</p>
              </div>
            </div>
          </Card>
          
          {/* Total Sets */}
          <Card variant="default" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalSets}</p>
                <p className="text-xs text-slate-400">séries</p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Streak */}
        {stats.currentStreak > 0 && (
          <Card variant="gradient" className="mt-3 p-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">🔥</span>
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {stats.currentStreak} jour{stats.currentStreak > 1 ? 's' : ''} consécutif{stats.currentStreak > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-slate-400">Continue comme ça !</p>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Actions */}
      <section className="space-y-2">
        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="text-white font-medium">Paramètres</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
        
        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-medium">Déconnexion</span>
          </div>
        </button>
      </section>
    </div>
  );
};

export default ProfileAthlete;
