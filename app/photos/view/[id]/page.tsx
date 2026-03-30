'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

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

export default function PhotoViewPage() {
  const params = useParams();
  const photoId = params?.id as string;

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulation de récupération des données (à remplacer par un appel API réel)
  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        // Simulation d'un appel API
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Données de test (à remplacer par l'appel API réel)
        const mockPhotos: Photo[] = [
          {
            id: '1',
            entityType: 'property',
            entityId: 1,
            filename: 'appartement-paris-salon.jpg',
            url: '/api/photos/appartement-paris-salon.jpg',
            thumbnailUrl: '/api/photos/thumbnails/appartement-paris-salon-thumb.jpg',
            description: 'Salon de l\'appartement Paris - Vue moderne et confortable',
            category: 'intérieur',
            tags: ['salon', 'canapé', 'table', 'moderne', 'confortable'],
            uploadedBy: 'Admin',
            uploadedAt: '2026-03-15T10:00:00Z',
            qrCode: 'QR_PROP_1_SALON',
            isPublic: true
          },
          {
            id: '2',
            entityType: 'task',
            entityId: 1,
            filename: 'reparation-plomberie-avant.jpg',
            url: '/api/photos/reparation-plomberie-avant.jpg',
            thumbnailUrl: '/api/photos/thumbnails/reparation-plomberie-avant-thumb.jpg',
            description: 'État avant réparation plomberie - Fuite sous le lavabo',
            category: 'maintenance',
            tags: ['plomberie', 'réparation', 'avant', 'fuite', 'urgence'],
            uploadedBy: 'Employee2',
            uploadedAt: '2026-03-14T14:30:00Z',
            qrCode: 'QR_TASK_1_AVANT',
            isPublic: false
          }
        ];

        const foundPhoto = mockPhotos.find(p => p.id === photoId);

        if (foundPhoto && foundPhoto.isPublic) {
          setPhoto(foundPhoto);
        } else {
          setError('Photo non trouvée ou accès non autorisé');
        }
      } catch (_err) {
        setError('Erreur lors du chargement de la photo');
      } finally {
        setLoading(false);
      }
    };

    if (photoId) {
      fetchPhoto();
    }
  }, [photoId]);

  const getEntityTypeLabel = (type: string) => {
    const labels = {
      property: 'Propriété',
      task: 'Tâche de maintenance',
      inspection: 'Inspection',
      employee: 'Employé',
      inventory: 'Article d\'inventaire',
      booking: 'Réservation'
    };
    return labels[type as keyof typeof labels] || type;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#f7f7f7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la photo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-[#FF385C] text-white px-6 py-2 rounded-lg hover:bg-[#E31C5F] transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Photo non trouvée</h2>
          <p className="text-gray-600 mb-6">La photo demandée n&apos;existe pas ou n&apos;est plus disponible.</p>
          <button
            onClick={() => window.history.back()}
            className="bg-[#FF385C] text-white px-6 py-2 rounded-lg hover:bg-[#E31C5F] transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#f7f7f7]">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF385C] to-[#E31C5F] bg-clip-text text-transparent">
                  Visualisation Photo
                </h1>
                <p className="text-sm text-gray-600">Accès via QR Code</p>
              </div>
            </div>
            <button
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-[#FF385C] transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Photo principale */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="relative w-full max-h-96 h-96">
            <Image
              src={photo.url}
              alt={photo.description}
              fill
              className="object-contain bg-gray-50"
            />
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(photo.category)}`}>
                {photo.category}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{photo.description}</h2>
                <p className="text-gray-600">{photo.filename}</p>
              </div>
              <div className="text-right">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Photo publique
                </span>
              </div>
            </div>

            {/* Métadonnées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Informations</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{getEntityTypeLabel(photo.entityType)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID Entité:</span>
                    <span className="font-medium">#{photo.entityId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uploadé par:</span>
                    <span className="font-medium">{photo.uploadedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date(photo.uploadedAt).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {photo.tags.map((tag, index) => (
                    <span key={index} className="bg-[#FF385C]/10 text-[#FF385C] px-3 py-1 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button className="flex-1 bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] transition-colors flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Télécharger
              </button>
              <button className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Partager
              </button>
              <button className="flex-1 bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] transition-colors flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12l3-3m-3 3l-3-3m-3 6h2.01M12 12l-3 3m3-3l3 3" />
                </svg>
                Voir QR Code
              </button>
            </div>
          </div>
        </div>

        {/* Informations de sécurité */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Accès sécurisé</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Cette photo est accessible publiquement via QR code. Le lien expire automatiquement après 24 heures pour des raisons de sécurité.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}