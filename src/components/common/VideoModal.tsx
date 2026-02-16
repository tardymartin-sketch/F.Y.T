// ============================================================
// F.Y.T - VIDEO MODAL
// src/components/common/VideoModal.tsx
// Modal/Popover pour afficher une vidéo en embed
// Supporte YouTube, Vimeo et vidéos directes
// ============================================================

import React from 'react';
import { X, ExternalLink, Video } from 'lucide-react';
import { Popover } from './Popover';

// ===========================================
// TYPES
// ===========================================

interface Props {
  url: string;
  exerciseName: string;
  onClose: () => void;
  /** Ref vers le bouton déclencheur pour mode popover (desktop) */
  anchorRef?: React.RefObject<HTMLElement>;
  /** z-index optionnel pour le mode modal (défaut: 50) */
  zIndex?: number;
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Extrait l'ID YouTube d'une URL
 */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extrait l'ID Vimeo d'une URL
 */
function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Détermine le type de vidéo et retourne l'URL d'embed
 */
function getEmbedInfo(url: string): { type: 'youtube' | 'vimeo' | 'direct' | 'unknown'; embedUrl: string | null } {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`
    };
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
    };
  }

  // Check if it's a direct video file
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return {
      type: 'direct',
      embedUrl: url
    };
  }

  return {
    type: 'unknown',
    embedUrl: null
  };
}

// ===========================================
// COMPONENT
// ===========================================

export const VideoModal: React.FC<Props> = ({
  url,
  exerciseName,
  onClose,
  anchorRef,
  zIndex = 50
}) => {
  const embedInfo = getEmbedInfo(url);

  // Contenu partagé entre les deux modes
  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-theme/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Video className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-theme truncate">{exerciseName}</h3>
            <p className="text-sm text-theme-muted">Vidéo démonstration</p>
          </div>
        </div>
        {!anchorRef && (
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme hover:bg-theme-secondary rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Video Content */}
      <div className="p-4">
        {embedInfo.embedUrl ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            {embedInfo.type === 'direct' ? (
              <video
                src={embedInfo.embedUrl}
                controls
                autoPlay
                className="absolute inset-0 w-full h-full rounded-xl bg-black"
              >
                Votre navigateur ne supporte pas la lecture de vidéos.
              </video>
            ) : (
              <iframe
                src={embedInfo.embedUrl}
                title={`Vidéo ${exerciseName}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full rounded-xl"
              />
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-theme-muted mb-4">
              Ce format de vidéo ne peut pas être intégré directement.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-xl font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir la vidéo
            </a>
          </div>
        )}
      </div>

      {/* Footer avec lien externe */}
      <div className="p-4 pt-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-theme-secondary hover:bg-theme-tertiary text-theme hover:text-theme rounded-xl text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ouvrir dans un nouvel onglet
        </a>
      </div>
    </>
  );

  // Mode Popover (desktop avec anchorRef)
  if (anchorRef) {
    return (
      <Popover
        anchorRef={anchorRef}
        isOpen={true}
        onClose={onClose}
        position="bottom-left"
        maxWidth={480}
        showCloseButton={true}
      >
        {content}
      </Popover>
    );
  }

  // Mode Modal classique (mobile ou sans anchorRef)
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      <div className="bg-theme border border-theme rounded-2xl max-w-lg w-full shadow-2xl">
        {content}
      </div>
    </div>
  );
};

export default VideoModal;
