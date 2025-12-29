import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Maximize2, Minimize2, X } from 'lucide-react';

interface StravaActivityMapProps {
  polyline: string;
  sportColor?: string;
  className?: string;
}

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

let leafletLoadPromise: Promise<void> | null = null;

async function loadLeafletOnce(): Promise<void> {
  if ((window as any).L) {
    return Promise.resolve();
  }

  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }

  leafletLoadPromise = new Promise<void>((resolve, reject) => {
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    linkEl.crossOrigin = '';
    document.head.appendChild(linkEl);

    const scriptEl = document.createElement('script');
    scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptEl.crossOrigin = '';
    
    scriptEl.onload = () => {
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

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
        });

        mapInstanceRef.current = map;
        map.zoomControl.setPosition('topright');

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        const polylineLayer = L.polyline(points, {
          color: sportColor,
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

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

        map.fitBounds(polylineLayer.getBounds(), { padding: [30, 30] });
        
        setStatus('ready');
      } catch (error) {
        console.error('Map init error:', error);
        if (isMounted) {
          setStatus('error');
          setErrorMsg('Erreur de chargement de la carte');
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
    };
  }, [polyline, sportColor]);

  if (status === 'error') {
    return (
      <div className={`flex items-center justify-center h-full bg-slate-800/50 rounded-xl ${className}`}>
        <div className="text-center text-slate-500">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 z-10 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      )}
      <div 
        ref={mapContainerRef} 
        className="h-full w-full rounded-xl overflow-hidden"
        style={{ minHeight: '200px' }}
      />
    </div>
  );
};

export default StravaActivityMap;
