import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Image,
  Camera,
  Heart
} from 'lucide-react';
import { clientPortal } from '../../lib/api';

import { API_URL } from '../../lib/api';

interface GalleryViewProps {
  token: string;
  photographerName: string;
  onBack: () => void;
}

interface GalleryPhoto {
  id: string;
  original_name: string;
  url: string;
}

const GalleryView: React.FC<GalleryViewProps> = ({ token, photographerName, onBack }) => {
  const [gallery, setGallery] = useState<any>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGallery();
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null && prev < photos.length - 1 ? prev + 1 : prev);
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : prev);
    };

    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, photos.length]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await clientPortal.getGallery(token);
      setGallery(data);
      setPhotos(data.photos || []);
    } catch (err: any) {
      setError(err.message || 'Galerie non disponible');
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (photo: GalleryPhoto) => {
    return `${API_URL}${photo.url}`;
  };

  const handleImageLoaded = (photoId: string) => {
    setLoadedImages(prev => new Set(prev).add(photoId));
  };

  const toggleFavorite = (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm tracking-wider uppercase">Chargement de la galerie...</p>
        </div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Galerie indisponible</h2>
          <p className="text-white/40 mb-6">{error || 'Vos photos seront disponibles prochainement.'}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Elegant Header */}
      <header className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>

          <div className="text-center">
            <h1 className="text-white text-lg font-bold tracking-tight">
              {gallery?.title || 'Galerie'}
            </h1>
            <p className="text-white/30 text-xs tracking-widest uppercase mt-0.5">
              par {photographerName}
            </p>
          </div>

          <div className="text-right">
            <span className="text-white/30 text-sm">
              {photos.length} photo{photos.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      {photos.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Camera className="w-20 h-20 text-white/10 mx-auto mb-4" />
            <h2 className="text-white/60 text-lg font-medium">La galerie est en préparation</h2>
            <p className="text-white/30 text-sm mt-2">Vos photos seront disponibles prochainement</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Masonry-style grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="break-inside-avoid group relative rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => setLightboxIndex(index)}
              >
                {/* Skeleton loader */}
                {!loadedImages.has(photo.id) && (
                  <div className="absolute inset-0 bg-white/5 animate-pulse rounded-2xl" style={{ minHeight: 200 }} />
                )}

                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.original_name}
                  className={`w-full block rounded-2xl transition-all duration-700 ${
                    loadedImages.has(photo.id) ? 'opacity-100' : 'opacity-0'
                  } group-hover:scale-[1.02] group-hover:brightness-110`}
                  onLoad={() => handleImageLoaded(photo.id)}
                  loading="lazy"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                  <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                    <button
                      onClick={(e) => toggleFavorite(e, photo.id)}
                      className={`p-2 rounded-full transition-all ${
                        favorites.has(photo.id)
                          ? 'bg-red-500 text-white scale-110'
                          : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${favorites.has(photo.id) ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(index);
                      }}
                      className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Favorite indicator */}
                {favorites.has(photo.id) && (
                  <div className="absolute top-3 right-3 p-1.5 bg-red-500 rounded-full">
                    <Heart className="w-3 h-3 text-white fill-current" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Photo count footer */}
          <div className="text-center mt-12 pb-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full">
              <Camera className="w-4 h-4 text-white/30" />
              <span className="text-white/40 text-sm tracking-wider">
                {photos.length} photo{photos.length > 1 ? 's' : ''}
                {favorites.size > 0 && ` · ${favorites.size} favori${favorites.size > 1 ? 's' : ''}`}
              </span>
            </div>
            <p className="text-white/20 text-xs mt-4">
              Photos protégées par le droit d'auteur. Toute reproduction non autorisée est interdite.
            </p>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col">
          {/* Lightbox header */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="text-white/50 text-sm">
              {lightboxIndex + 1} / {photos.length}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => toggleFavorite(e, photos[lightboxIndex].id)}
                className={`p-2.5 rounded-full transition-all ${
                  favorites.has(photos[lightboxIndex].id)
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
                }`}
              >
                <Heart className={`w-5 h-5 ${favorites.has(photos[lightboxIndex].id) ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2.5 bg-white/10 text-white/60 rounded-full hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox image */}
          <div className="flex-1 flex items-center justify-center relative px-4">
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-4 md:left-8 z-10 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={getPhotoUrl(photos[lightboxIndex])}
              alt={photos[lightboxIndex].original_name}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              style={{ animation: 'fadeIn 0.3s ease-out' }}
            />

            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-4 md:right-8 z-10 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox thumbnails strip */}
          {photos.length > 1 && (
            <div className="px-6 py-4 flex justify-center gap-2 overflow-x-auto">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                    i === lightboxIndex
                      ? 'ring-2 ring-white opacity-100 scale-105'
                      : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  <img
                    src={getPhotoUrl(photo)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default GalleryView;
