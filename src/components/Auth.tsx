import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Mail, Lock, Dumbbell } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });
      if (error) alert(error.message);
      else alert("Compte créé ! Vérifiez vos emails pour confirmer.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-lg">
            <Dumbbell className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white">UltiPrepa</h1>
          <p className="text-slate-400 mt-2">
            {isRegistering ? 'Créez votre compte athlète' : 'Bon retour à la salle !'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Nom d'utilisateur</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: JeanFit"
                required
              />
            </div>
          )}
          
          <div>
            <label className="text-slate-400 text-sm mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="nom@exemple.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Chargement...' : isRegistering ? 'S\'inscrire' : 'Se connecter'}
          </button>
        </form>

        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-6 text-slate-400 hover:text-white text-sm transition-colors"
        >
          {isRegistering ? "Déjà un compte ? Connectez-vous" : "Pas encore de compte ? Inscrivez-vous"}
        </button>
      </div>
    </div>
  );
};
