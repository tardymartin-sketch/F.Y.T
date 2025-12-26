// ============================================================
// ULTIPREPA - STRAVA ACTIVITY MAP
// src/components/StravaActivityMap.tsx
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Maximize2 } from 'lucide-react';

interface StravaActivityMapProps {
  polyline: string;
  sportColor?: string;
  className?: string;
}

/**
 * Décode une polyline Google en tableau de coordonnées [lat, lng]
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Variable globale pour tracker si Leaflet est en cours de chargement
let leafletLoadPromise: Promise<void> | null = null;

async function loadLeafletOnce(): Promise<void> {
  if ((window as any).L) {
    return Promise.resolve();
  }

  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }

  leafletLoadPromise = new Promise<void>((resolve, reject) => {
    // Charger le CSS
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    linkEl.crossOrigin = '';
    document.head.appendChild(linkEl);

    // Charger le JS
    const scriptEl = document.createElement('script');
    scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptEl.crossOrigin = '';
    
    scriptEl.onload = () => {
      // Attendre un peu que le CSS soit appliqué
      setTimeout(() => {
        if ((window as any).L) {
          resolve();
        } else {
          reject(new Error('Leaflet not loaded'));
        }
      }, 100);
    };
    
    scriptEl.onerror = () => {
      leafletLoadPromise = null;
      reject(new Error('Failed to load Leaflet'));
    };
    
    document.head.appendChild(scriptEl);
  });

  return leafletLoadPromise;
}

export const StravaActivityMap: React.FC<StravaActivityMapProps> = ({
  polyline,
  sportColor = '#FC4C02',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const boundsRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!polyline) {
      setStatus('error');
      setErrorMsg('Pas de tracé GPS');
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      try {
        await loadLeafletOnce();
        
        if (!isMounted || !mapContainerRef.current) return;

        const L = (window as any).L;
        const points = decodePolyline(polyline);
        
        if (points.length === 0) {
          setStatus('error');
          setErrorMsg('Tracé invalide');
          return;
        }

        // Nettoyer l'ancienne carte si elle existe
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Créer la carte avec toutes les interactions activées
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
          boxZoom: true,
          keyboard: true,
        });

        mapInstanceRef.current = map;

        // Positionner les contrôles de zoom en haut à droite
        map.zoomControl.setPosition('topright');

        // Ajouter les tuiles (OpenStreetMap comme fallback)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // Ajouter la polyline
        const polylineLayer = L.polyline(points, {
          color: sportColor,
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Marqueur de départ (vert)
        const startIcon = L.divIcon({
          className: 'leaflet-marker-start',
          html: `<div style="
            width: 14px;
            height: 14px;
            background-color: #22c55e;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        // Marqueur d'arrivée (rouge)
        const endIcon = L.divIcon({
          className: 'leaflet-marker-end',
          html: `<div style="
            width: 14px;
            height: 14px;
            background-color: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        L.marker(points[0], { icon: startIcon }).addTo(map);
        L.marker(points[points.length - 1], { icon: endIcon }).addTo(map);

        // Sauvegarder les bounds pour le bouton recentrer
        boundsRef.current = polylineLayer.getBounds();

        // Ajuster la vue
        map.fitBounds(boundsRef.current, {
          padding: [30, 30],
        });

        // Forcer un refresh après un court délai (fix pour certains bugs d'affichage)
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 250);

        setStatus('ready');
      } catch (err) {
        console.error('Map error:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMsg('Erreur de chargement');
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      boundsRef.current = null;
    };
  }, [polyline, sportColor]);

  if (status === 'error') {
    return (
      <div className={`flex items-center justify-center bg-slate-800/50 text-slate-500 text-sm h-full min-h-[150px] rounded-xl ${className}`}>
        <MapPin className="w-5 h-5 mr-2 opacity-50" />
        {errorMsg || 'Carte indisponible'}
      </div>
    );
  }

  return (
    <div className={`relative h-full min-h-[150px] ${className}`}>
      <div 
        ref={mapContainerRef} 
        className="w-full h-full rounded-xl"
        style={{ minHeight: '150px', background: '#1e293b' }}
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/90 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="ml-2 text-slate-400 text-sm">Chargement de la carte...</span>
        </div>
      )}
      {status === 'ready' && (
        <button
          onClick={() => {
            if (mapInstanceRef.current && boundsRef.current) {
              mapInstanceRef.current.fitBounds(boundsRef.current, { padding: [30, 30] });
            }
          }}
          className="absolute bottom-3 right-3 z-[1000] bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg transition-colors"
          title="Recentrer la vue"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
      {/* Style pour les contrôles Leaflet */}
      <style>{`
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
        }
        .leaflet-control-zoom a {
          background-color: #1e293b !important;
          color: white !important;
          border: none !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 18px !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #334155 !important;
        }
        .leaflet-control-zoom-in {
          border-radius: 8px 8px 0 0 !important;
        }
        .leaflet-control-zoom-out {
          border-radius: 0 0 8px 8px !important;
        }
      `}</style>
    </div>
  );
};

export default StravaActivityMap;
