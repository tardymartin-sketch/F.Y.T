// ============================================================
// F.Y.T - STRAVA IMPORT COMPONENT
// src/components/StravaImport.tsx
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Link, 
  Unlink, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download,
  User as UserIcon
} from 'lucide-react';
import { stravaService } from '../services/stravaService';
import type { User } from '../../types';
import type { StravaConnection } from '../types/strava';

interface StravaImportProps {
  user: User;
}

export const StravaImport: React.FC<StravaImportProps> = ({ user }) => {
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --------------------------------------------------------
  // Load connection status
  // --------------------------------------------------------
  const loadConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const conn = await stravaService.getConnection(user.id);
      setConnection(conn);
    } catch (err: any) {
      console.error('Failed to load Strava connection:', err);
      setError('Erreur lors du chargement de la connexion Strava');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // --------------------------------------------------------
  // Handle OAuth callback
  // --------------------------------------------------------
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const state = urlParams.get('state');

      if (error) {
        setError("Autorisation Strava refusée");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code && state === 'strava_connect') {
        try {
          setLoading(true);
          setSyncProgress('Connexion à Strava...');
          
          const tokenResponse = await stravaService.exchangeCodeForTokens(code);
          await stravaService.saveConnection(user.id, tokenResponse);
          
          setSuccess('Connexion Strava réussie !');
          await loadConnection();
          
          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err: any) {
          console.error('OAuth callback error:', err);
          setError(err.message || "Erreur lors de la connexion à Strava");
        } finally {
          setLoading(false);
          setSyncProgress(null);
        }
      }
    };

    handleCallback();
  }, [user.id, loadConnection]);

  // --------------------------------------------------------
  // Connect to Strava
  // --------------------------------------------------------
  const handleConnect = () => {
    const authUrl = stravaService.getAuthorizationUrl('strava_connect');
    window.location.href = authUrl;
  };

  // --------------------------------------------------------
  // Disconnect from Strava
  // --------------------------------------------------------
  const handleDisconnect = async () => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter votre compte Strava ?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await stravaService.disconnect(user.id);
      setConnection(null);
      setSuccess('Compte Strava déconnecté');
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------
  // Sync activities
  // --------------------------------------------------------
  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);
      setSyncProgress('Récupération des activités...');

      const count = await stravaService.syncInitialActivities(user.id, true);
      
      setSuccess(`${count} activité${count > 1 ? 's' : ''} synchronisée${count > 1 ? 's' : ''} !`);
      await loadConnection();
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(err.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------
  if (loading && !syncProgress) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Connexion Strava</h2>
          <p className="text-gray-400 text-sm">
            Importez vos activités depuis Strava
          </p>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {syncProgress && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />
          <p className="text-blue-400">{syncProgress}</p>
        </div>
      )}

      {/* Connection status */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        {connection ? (
          <div className="space-y-4">
            {/* Connected profile */}
            <div className="flex items-center gap-4">
              {connection.strava_profile_pic ? (
                <img
                  src={connection.strava_profile_pic}
                  alt="Strava profile"
                  className="w-14 h-14 rounded-full border-2 border-orange-500"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center border-2 border-orange-500">
                  <UserIcon className="h-7 w-7 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">
                    {connection.strava_firstname} {connection.strava_lastname}
                  </span>
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                    Connecté
                  </span>
                </div>
                {connection.strava_username && (
                  <p className="text-gray-400 text-sm">@{connection.strava_username}</p>
                )}
                {connection.last_sync_at && (
                  <p className="text-gray-500 text-xs mt-1">
                    Dernière sync : {new Date(connection.last_sync_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-colors"
              >
                {syncing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {syncing ? 'Synchronisation...' : 'Synchroniser les activités'}
              </button>
              
              <button
                onClick={handleDisconnect}
                disabled={syncing}
                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-colors"
              >
                <Unlink className="h-5 w-5" />
                Déconnecter
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-white font-semibold mb-2">
              Non connecté à Strava
            </h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              Connectez votre compte Strava pour importer automatiquement vos activités sportives.
            </p>
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Link className="h-5 w-5" />
              Connecter Strava
            </button>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          À propos de l'import Strava
        </h4>
        <ul className="text-gray-400 text-sm space-y-1.5">
          <li>• Les 6 derniers mois d'activités sont importés</li>
          <li>• Les données GPS et métriques sont incluses</li>
          <li>• Vos activités restent privées et visibles uniquement par vous et vos coachs</li>
          <li>• Vous pouvez déconnecter Strava à tout moment</li>
        </ul>
      </div>
    </div>
  );
};

export default StravaImport;
