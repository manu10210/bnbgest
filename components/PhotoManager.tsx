'use client';

import { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import QrCode, { generateQrData } from './QrCode';

interface Photo {
  id: string;
  entityType: 'property' | 'task' | 'inspection' | 'employee' | 'inventory' | 'booking';
  entityId: number;
  filename: string;
  url: string;
  thumbnailUrl: string;
  description: string;
  category: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  qrCode: string;
  isPublic: boolean;
}

interface PhotoManagerProps {
  entityType: Photo['entityType'];
  entityId: number;
  entityName: string;
  onPhotoAdded?: (photo: Photo) => void;
  onPhotoDeleted?: (photoId: string) => void;
}

export default function PhotoManager({
  entityType,
  entityId,
  entityName,
  onPhotoAdded,
  onPhotoDeleted
}: PhotoManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedQrPhoto, setSelectedQrPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculer la date d'expiration des QR codes (24h à partir de maintenant)
  const qrExpirationDate = useMemo(() => {
    return new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toLocaleString('fr-FR');
  }, []);

  const [newPhoto, setNewPhoto] = useState({
    description: '',
    category: 'intérieur',
    tags: '',
    isPublic: false
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadPhoto = () => {
    if (!selectedFile) return;

    const photoId = `photo_${Date.now()}`;
    const filename = selectedFile.name;
    const photo: Photo = {
      id: photoId,
      entityType,
      entityId,
      filename,
      url: `/api/photos/${filename}`,
      thumbnailUrl: `/api/photos/thumbnails/${filename.replace(/\.[^/.]+$/, '-thumb$&')}`,
      description: newPhoto.description || filename,
      category: newPhoto.category,
      tags: newPhoto.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      uploadedBy: 'Current User', // À remplacer par l'utilisateur connecté
      uploadedAt: new Date().toISOString(),
      qrCode: generateQrData(entityType, entityId, `${window.location.origin}/photos/view/${photoId}`),
      isPublic: newPhoto.isPublic
    };

    setPhotos([...photos, photo]);
    onPhotoAdded?.(photo);

    // Reset form
    setNewPhoto({
      description: '',
      category: 'intérieur',
      tags: '',
      isPublic: false
    });
    setSelectedFile(null);
    setShowUploadModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deletePhoto = (photoId: string) => {
    setPhotos(photos.filter(p => p.id !== photoId));
    onPhotoDeleted?.(photoId);
    setSelectedPhoto(null);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      intérieur: 'bg-blue-100 text-blue-800',
      extérieur: 'bg-green-100 text-green-800',
      maintenance: 'bg-red-100 text-red-800',
      profil: 'bg-[#FF385C]/10 text-[#FF385C]',
      inspection: 'bg-yellow-100 text-yellow-800',
      'avant-après': 'bg-orange-100 text-orange-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Header avec bouton d'ajout */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Photos de {entityName}
        </h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] transition-colors flex items-center text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Ajouter photo
        </button>
      </div>

      {/* Galerie de photos */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div
                className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-[#FF385C]/30 transition-colors relative"
                onClick={() => setSelectedPhoto(photo)}
              >
                <Image
                  src={photo.thumbnailUrl}
                  alt={photo.description}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-2 right-2 flex flex-col space-y-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(photo.category)}`}>
                  {photo.category}
                </span>
                {photo.isPublic && (
                  <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                    QR
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="absolute bottom-2 left-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhoto(photo);
                  }}
                  className="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                >
                  Voir
                </button>
                {photo.isPublic && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQrPhoto(photo);
                      setShowQrModal(true);
                    }}
                    className="flex-1 bg-[#FF385C] text-white px-2 py-1 rounded text-xs hover:bg-[#E31C5F]"
                  >
                    QR
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePhoto(photo.id);
                  }}
                  className="flex-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-[#dddddd]">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 mb-2">Aucune photo pour le moment</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="text-[#FF385C] hover:text-[#E31C5F] font-medium"
          >
            Ajouter la première photo
          </button>
        </div>
      )}

      {/* Modal d'upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Ajouter une photo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier image
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C]"
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Fichier sélectionné: {selectedFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newPhoto.description}
                  onChange={(e) => setNewPhoto({ ...newPhoto, description: e.target.value })}
                  placeholder="Description de la photo"
                  className="w-full p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={newPhoto.category}
                  onChange={(e) => setNewPhoto({ ...newPhoto, category: e.target.value })}
                  className="w-full p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C]"
                >
                  <option value="intérieur">Intérieur</option>
                  <option value="extérieur">Extérieur</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="profil">Profil</option>
                  <option value="inspection">Inspection</option>
                  <option value="avant-après">Avant/Après</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={newPhoto.tags}
                  onChange={(e) => setNewPhoto({ ...newPhoto, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                  className="w-full p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newPhoto.isPublic}
                  onChange={(e) => setNewPhoto({ ...newPhoto, isPublic: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Rendre accessible via QR code
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={uploadPhoto}
                  disabled={!selectedFile}
                  className="flex-1 bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Uploader
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de visualisation photo */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedPhoto.description}</h3>
                <p className="text-gray-600">{selectedPhoto.filename}</p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 relative w-full h-96">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.description}
                fill
                className="object-contain bg-gray-50 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold mb-2">Informations</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Catégorie:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(selectedPhoto.category)}`}>
                      {selectedPhoto.category}
                    </span>
                  </p>
                  <p><span className="font-medium">Uploadé par:</span> {selectedPhoto.uploadedBy}</p>
                  <p><span className="font-medium">Date:</span> {new Date(selectedPhoto.uploadedAt).toLocaleString('fr-FR')}</p>
                  <p><span className="font-medium">Statut:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${selectedPhoto.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {selectedPhoto.isPublic ? 'Public' : 'Privé'}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPhoto.tags.map((tag, index) => (
                    <span key={index} className="bg-[#FF385C]/10 text-[#FF385C] px-3 py-1 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                Télécharger
              </button>
              {selectedPhoto.isPublic && (
                <button
                  onClick={() => {
                    setSelectedQrPhoto(selectedPhoto);
                    setShowQrModal(true);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1 bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F]"
                >
                  Voir QR Code
                </button>
              )}
              <button
                onClick={() => deletePhoto(selectedPhoto.id)}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQrModal && selectedQrPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">QR Code d&apos;accès</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Ce QR code permet d&apos;accéder à la photo depuis n&apos;importe quel appareil.
              Il expire automatiquement après 24 heures.
            </p>

            <div className="flex justify-center mb-6">
              <QrCode
                data={selectedQrPhoto.qrCode}
                size={200}
                className="border-2 border-gray-200 rounded-lg p-2"
              />
            </div>

            <div className="text-xs text-gray-500 mb-4">
              <p><strong>ID:</strong> {selectedQrPhoto.qrCode}</p>
              <p><strong>Expire:</strong> {qrExpirationDate}</p>
            </div>

            <div className="flex space-x-3">
              <button className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                Télécharger QR
              </button>
              <button className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                Imprimer
              </button>
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setSelectedQrPhoto(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
