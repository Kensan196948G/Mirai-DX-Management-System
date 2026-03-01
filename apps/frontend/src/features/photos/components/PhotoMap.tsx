import React from 'react';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import type { Photo } from '@/types';

L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow });

function hasGps(photo: Photo): photo is Photo & { latitude: number; longitude: number } {
  return photo.latitude != null && photo.longitude != null;
}

interface PhotoMapProps {
  photos: Photo[];
}

const PhotoMap: React.FC<PhotoMapProps> = ({ photos }) => {
  const geoPhotos = photos.filter(hasGps);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={[36.2048, 138.2529]}
        zoom={5}
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoPhotos.map((photo) => (
          <Marker key={photo.id} position={[photo.latitude, photo.longitude]}>
            <Popup>
              <div className="text-center">
                <img
                  src={photo.thumbnailUrl ?? photo.url}
                  alt={photo.originalName}
                  style={{ maxWidth: 150, maxHeight: 150, objectFit: 'cover' }}
                />
                <p className="mt-1 text-xs text-gray-700 max-w-[150px] truncate">{photo.originalName}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {geoPhotos.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-400">GPS情報のある写真がありません</div>
      )}
    </div>
  );
};

export default PhotoMap;
