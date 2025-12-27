import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, User, Dumbbell, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/5 to-emerald-600/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-2xl shadow-blue-600/25 mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">F.Y.T</h1>
          <p className="text-slate-400">
            {isRegistering ? 'Créez votre compte pour commencer' : 'Content de vous revoir !'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Prénom</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Jean"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Nom</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Dupont"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Nom d'utilisateur</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="jeanfit"
                      required
                    />
                  </div>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="nom@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`p-4 rounded-xl text-sm ${error.startsWith('✓') ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 group shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegistering ? "Créer mon compte" : "Se connecter"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="w-full text-slate-400 hover:text-white text-sm transition-colors py-2"
            >
              {isRegistering ? (
                <>Déjà un compte ? <span className="text-blue-400 font-medium">Connectez-vous</span></>
              ) : (
                <>Pas encore de compte ? <span className="text-blue-400 font-medium">Inscrivez-vous</span></>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-sm mt-8">
          © 2024 F.Y.T — Votre coach numérique
        </p>
      </div>
    </div>
  );
};

