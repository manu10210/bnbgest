'use client';

/**
 * PropertiesManager - Exemple d'utilisation des nouvelles APIs
 * 
 * Ce composant démontre :
 * - useApi pour fetch les données
 * - useMutation pour créer/modifier
 * - usePagination pour la pagination
 * - LoadingSpinner pour l'UX
 * - ErrorBoundary pour la gestion d'erreurs
 */

import { useState } from 'react';
import { useApi, useMutation, usePagination } from '@/hooks/useApi';
import { LoadingSpinner, LoadingTable, LoadingCard } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Home, Plus, Edit, Trash2, Eye, MapPin, Users, Download, Camera } from 'lucide-react';
import AirbnbCsvImporter from './AirbnbCsvImporter';

interface Property {
  id: number;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  images?: string[];
  _count: {
    bookings: number;
    reviews: number;
    photos: number;
  };
  owner?: {
    id: number;
    name: string;
    email: string;
  };
}

interface ApiResponse {
  success: boolean;
  count: number;
  properties: Property[];
}

export default function PropertiesManager() {
  const [filter, setFilter] = useState<'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'ALL'>('ACTIVE');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  // Fetch des propriétés avec filtres
  const url = filter === 'ALL' 
    ? '/api/properties' 
    : `/api/properties?status=${filter}`;
  
  const { data, loading, error, refetch } = useApi<ApiResponse>(url);

  // Pagination
  const {
    currentItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    hasNextPage,
    hasPrevPage
  } = usePagination(data?.properties || [], 10);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Home className="w-8 h-8" />
                Gestion des Propriétés
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {data?.count || 0} propriété(s) trouvée(s)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowImporter(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" />
                Importer depuis Airbnb (CSV)
              </button>

              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Nouvelle Propriete
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="mb-6 flex gap-2">
            {['ALL', 'ACTIVE', 'INACTIVE', 'MAINTENANCE'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {status === 'ALL' ? 'Toutes' : status}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && <LoadingTable rows={10} />}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400">
                Erreur: {error.message}
              </p>
              <button 
                onClick={refetch}
                className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Liste des propriétés */}
          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentItems.map((property) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property}
                    onUpdate={refetch}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-4">
                  <button
                    onClick={prevPage}
                    disabled={!hasPrevPage}
                    className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 rounded-lg ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={nextPage}
                    disabled={!hasNextPage}
                    className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}

          {/* Create Form Modal */}
          {showCreateForm && (
            <CreatePropertyModal
              onClose={() => setShowCreateForm(false)}
              onSuccess={() => {
                setShowCreateForm(false);
                refetch();
              }}
            />
          )}

          {/* Importer Modal */}
          {showImporter && (
            <AirbnbCsvImporter onClose={() => { setShowImporter(false); refetch(); }} />
          )}

        </div>
      </div>
    </ErrorBoundary>
  );
}

// Component: PropertyCard
function PropertyCard({ property, onUpdate }: { property: Property; onUpdate: () => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const { mutate: deleteProperty, loading: deleting } = useMutation(
    `/api/properties/${property.id}`,
    'DELETE'
  );

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${property.name}" ?`)) return;

    try {
      await deleteProperty({});
      onUpdate();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  };

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    MAINTENANCE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Image Banner */}
      <div 
        className="h-48 relative bg-gray-200 dark:bg-gray-700 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${property.images && property.images.length > 0 ? property.images[0] : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1000'})` 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${statusColors[property.status]}`}>
            {property.status}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 text-white">
          <div className="flex items-center gap-1 text-sm font-medium">
            <MapPin className="w-4 h-4" />
            {property.city}, {property.country}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {property.name}
        </h3>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {property.bedrooms}
            </div>
            <div className="text-xs text-gray-500">Chambres</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {property.maxGuests}
            </div>
            <div className="text-xs text-gray-500">Voyageurs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {property._count.bookings}
            </div>
            <div className="text-xs text-gray-500">Réservations</div>
          </div>
        </div>

        {/* Prix */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {property.pricePerNight}€
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/nuit</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Détails
          </button>

          <a
            href={`/photos/view/${property.id}`}
            className="flex items-center justify-center px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
            title="Gerer les photos"
          >
            <Camera className="w-4 h-4" />
          </a>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
          >
            {deleting ? '...' : <Trash2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Details Expanded */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
            <p className="text-gray-600 dark:text-gray-400">{property.description}</p>
            <div className="text-gray-500 dark:text-gray-400">
              📍 {property.address}
            </div>
            <div className="flex gap-4">
              <span>🛏️ {property.bathrooms} SDB</span>
              <span>📸 {property._count.photos} photos</span>
              <span>⭐ {property._count.reviews} avis</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component: CreatePropertyModal
function CreatePropertyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { mutate, loading, error } = useMutation('/api/properties', 'POST');
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    address: string;
    city: string;
    country: string;
    zipCode: string;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    pricePerNight: number;
    ownerId: number;
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  }>({
    name: '',
    description: '',
    address: '',
    city: '',
    country: 'France',
    zipCode: '',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    pricePerNight: 100,
    ownerId: 1, // TODO: Get from session
    status: 'ACTIVE'
  });  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await mutate(formData);
      onSuccess();
    } catch (err: any) {
      console.error('Create failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Nouvelle Propriété
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Adresse *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ville *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pays *</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Code Postal</label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chambres</label>
                <input
                  type="number"
                  min="1"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">SDB</label>
                <input
                  type="number"
                  min="1"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Voyageurs</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxGuests}
                  onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prix par nuit (€)</label>
              <input
                type="number"
                min="1"
                value={formData.pricePerNight}
                onChange={(e) => setFormData({ ...formData, pricePerNight: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error.message}
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

