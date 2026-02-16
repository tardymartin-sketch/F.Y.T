// ============================================================
// F.Y.T - AUTH COMPONENT
// src/components/Auth.tsx
// Authentification (Login / Register) avec support Multi-Rôles
// ============================================================

import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Mail, Lock, User, Dumbbell, ArrowRight, Loader2, Eye, EyeOff, Users, Play } from 'lucide-react';
import { canAccessCoachMode } from '../../../types';
import type { ProfileRow, User as UserType } from '../../../types';
import { createDemoSession } from '../../services/demoService';

// Constante pour le stockage du mode actif
const ACTIVE_MODE_KEY = 'F.Y.T_active_mode';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lancer le mode démo
  const handleDemoMode = async () => {
    setLoadingDemo(true);
    setError(null);

    try {
      const result = await createDemoSession();
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création de la démo');
      }
      localStorage.setItem(ACTIVE_MODE_KEY, 'athlete');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Erreur lors du lancement de la démo");
    } finally {
      setLoadingDemo(false);
    }
  };

  // Connexion standard (mode par défaut = rôle principal)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin('default');
  };

  // Connexion en mode coach
  const handleCoachLogin = async () => {
    await performLogin('coach');
  };

  // Logique de connexion commune
  const performLogin = async (mode: 'default' | 'coach') => {
    const isCoachMode = mode === 'coach';
    
    if (isCoachMode) {
      setLoadingCoach(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (isRegistering) {
        // Inscription
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              username,
              first_name: firstName,
              last_name: lastName 
            }
          }
        });
        if (error) throw error;
        setError("✓ Compte créé ! Vérifiez vos emails pour confirmer.");
      } else {
        // Connexion
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (authError) throw authError;

        // Récupérer le profil pour vérifier les droits
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;

        const profile = profileData as ProfileRow;
        
        // Construire l'objet user pour vérification
        const user: UserType = {
          id: profile.id,
          username: profile.username ?? profile.email ?? 'unknown',
          role: (profile.role as 'admin' | 'coach' | 'athlete') ?? 'athlete',
          secondaryRoles: (profile.secondary_roles as ('admin' | 'coach' | 'athlete')[]) ?? [],
        };

        // Si mode coach demandé, vérifier les droits
        if (isCoachMode) {
          if (!canAccessCoachMode(user)) {
            // Déconnecter l'utilisateur car il n'a pas les droits
            await supabase.auth.signOut();
            throw new Error("Ce compte n'a pas accès à l'interface coach. Contactez votre administrateur.");
          }
          // Stocker le mode coach
          localStorage.setItem(ACTIVE_MODE_KEY, user.role === 'admin' ? 'admin' : 'coach');
        } else {
          // Mode par défaut = rôle principal
          localStorage.setItem(ACTIVE_MODE_KEY, user.role);
        }

        // La redirection se fait automatiquement via onAuthStateChange dans App.tsx
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
      setLoadingCoach(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[var(--color-primary)]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[var(--color-accent)]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[var(--color-primary)]/5 to-[var(--color-accent)]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl shadow-2xl shadow-[var(--shadow-color)] mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-theme mb-2">F.Y.T</h1>
          <p className="text-theme-muted">
            {isRegistering ? 'Créez votre compte pour commencer' : 'Content de vous revoir !'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-theme-secondary/80 backdrop-blur-xl border border-theme rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-muted mb-2">Prénom</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-theme-tertiary border border-theme rounded-xl py-3 px-4 text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                      placeholder="Jean"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-muted mb-2">Nom</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-theme-tertiary border border-theme rounded-xl py-3 px-4 text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                      placeholder="Dupont"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-2">Nom d'utilisateur</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-theme-tertiary border border-theme rounded-xl py-3 pl-12 pr-4 text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                      placeholder="jeanfit"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-theme-tertiary border border-theme rounded-xl py-3 pl-12 pr-4 text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  placeholder="nom@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-theme-tertiary border border-theme rounded-xl py-3 pl-12 pr-12 text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`p-4 rounded-xl text-sm ${error.startsWith('✓') ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/30'}`}>
                {error}
              </div>
            )}

            {/* Bouton principal - Connexion standard */}
            <button
              type="submit"
              disabled={loading || loadingCoach}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 group shadow-lg shadow-[var(--shadow-color)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegistering ? "Créer mon compte" : "Me connecter"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Bouton secondaire - Connexion en tant que coach (masqué en mode inscription) */}
            {!isRegistering && (
              <button
                type="button"
                onClick={handleCoachLogin}
                disabled={loading || loadingCoach || loadingDemo}
                className="w-full bg-transparent hover:bg-theme-tertiary text-theme hover:text-theme py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 border border-theme hover:border-theme disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCoach ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Me connecter en tant que coach
                  </>
                )}
              </button>
            )}
          </form>

          {/* Séparateur */}
          {!isRegistering && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-theme"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-theme-secondary text-theme-muted">ou</span>
              </div>
            </div>
          )}

          {/* Bouton Démo */}
          {!isRegistering && (
            <button
              type="button"
              onClick={handleDemoMode}
              disabled={loading || loadingCoach || loadingDemo}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 group shadow-lg shadow-[var(--shadow-color)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingDemo ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Essayer la démo
                </>
              )}
            </button>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-theme-muted hover:text-theme transition-colors"
            >
              {isRegistering ? (
                <>Déjà un compte ? <span className="text-[var(--color-primary)] font-medium">Se connecter</span></>
              ) : (
                <>Pas de compte ? <span className="text-[var(--color-primary)] font-medium">S'inscrire</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
