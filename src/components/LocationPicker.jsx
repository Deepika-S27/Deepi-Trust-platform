import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_URL  = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:36px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));transform:translateY(-8px)">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

function MapEvents({ onLocationClick }) {
  useMapEvents({
    click(e) {
      onLocationClick(e.latlng);
    },
  });
  return null;
}

export default function LocationPicker({ onChange, defaultLocation, height = '300px' }) {
  const [position, setPosition] = useState(defaultLocation || null);
  // Default to Chennai center if no default is provided
  const center = defaultLocation || { lat: 13.0827, lng: 80.2707 };

  const handleLocationClick = (latlng) => {
    setPosition(latlng);
    if (onChange) onChange(latlng);
  };

  // Invalidate size to prevent Leaflet glitch when rendered inside display:none or flex panels initially
  function MapFix() {
    const map = useMapEvents({});
    useEffect(() => {
      setTimeout(() => map.invalidateSize(), 150);
    }, [map]);
    return null;
  }

  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--surface-border)', zIndex: 0, position: 'relative' }}>
      {!position && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: 'rgba(255,255,255,0.95)', padding: '6px 12px', borderRadius: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)',
          pointerEvents: 'none'
        }}>
          👇 Click on the map to place pin
        </div>
      )}
      {position && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: 'rgba(16,185,129,0.95)', padding: '6px 12px', borderRadius: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)', fontSize: '0.8rem', fontWeight: 600, color: '#fff',
          pointerEvents: 'none'
        }}>
          ✅ Location Pinned!
        </div>
      )}
      <MapContainer center={[center.lat, center.lng]} zoom={12} style={{ height, width: '100%', zIndex: 1 }}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <MapEvents onLocationClick={handleLocationClick} />
        <MapFix />
        {position && <Marker position={position} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
