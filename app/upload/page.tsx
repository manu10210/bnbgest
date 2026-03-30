'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

function MobileUploadContent() {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const loadExistingImages = useCallback(async () => {
    try {
      const response = await fetch(`/api/upload?session=${sessionId}`);
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Erreur chargement images:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadExistingImages();
    }
  }, [sessionId, loadExistingImages]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/upload?session=${sessionId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadedCount(prev => prev + result.uploaded);
        await loadExistingImages(); // Recharger les images
        alert(`${result.uploaded} photo(s) uploadée(s) avec succès !`);
      } else {
        alert('Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = () => {
    const input = document.getElementById('camera-input') as HTMLInputElement;
    input?.click();
  };

  const selectFromGallery = () => {
    const input = document.getElementById('gallery-input') as HTMLInputElement;
    input?.click();
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">�O</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session invalide</h1>
          <p className="text-gray-600">QR code invalide ou expiré</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#f7f7f7] p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="text-center">
            <div className="text-4xl mb-4">�Y"�</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload de photos</h1>
            <p className="text-gray-600 text-sm">
              Scannez ce QR code depuis votre ordinateur pour uploader vos photos de propriété
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600">{images.length}</div>
              <div className="text-sm text-blue-600">Photos uploadées</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-600">{uploadedCount}</div>
              <div className="text-sm text-green-600">Cette session</div>
            </div>
          </div>
        </div>

        {/* Upload Options */}
        <div className="space-y-4 mb-6">
          <button
            onClick={takePhoto}
            disabled={uploading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Prendre une photo</span>
          </button>

          <button
            onClick={selectFromGallery}
            disabled={uploading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Choisir depuis la galerie</span>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          id="camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          id="gallery-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Loading indicator */}
        {uploading && (
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Upload en cours...</p>
          </div>
        )}

        {/* Image preview */}
        {images.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos uploadées</h3>
            <div className="grid grid-cols-2 gap-4">
              {images.map((image, index) => (
                <div key={index} className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
                  <Image
                    src={image}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 rounded-2xl p-6 mt-6 border border-yellow-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-yellow-500 rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-yellow-800">Conseils</h4>
          </div>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>�?� Prenez des photos en haute qualité</li>
            <li>�?� Commencez par l&apos;extérieur de la propriété</li>
            <li>�?� Incluez cuisine, chambres et salle de bain</li>
            <li>�?� Les bonnes photos attirent plus de réservations !</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function MobileUpload() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#f7f7f7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <MobileUploadContent />
    </Suspense>
  );
}
