'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

interface Property {
  id?: number;
  name: string;
  address: string;
  type: 'apartment' | 'house' | 'studio' | 'villa' | 'room';
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  price: number;
  description: string;
  images: string[];
  status: 'active' | 'inactive' | 'maintenance';
  createdAt?: string;
}

interface PropertyConfiguratorProps {
  onPropertyCreated: (property: Property) => void;
  onCancel: () => void;
  initialProperty?: Property;
  mode?: 'create' | 'edit';
}

const PROPERTY_TYPES = [
  {
    id: 'apartment',
    label: 'Appartement',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    description: 'Appartement moderne en ville',
    color: 'from-[#FF385C] to-[#E31C5F]'
  },
  {
    id: 'house',
    label: 'Maison',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    description: 'Maison familiale spacieuse',
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'studio',
    label: 'Studio',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Studio compact et cosy',
    color: 'from-[#FF385C] to-[#E31C5F]'
  },
  {
    id: 'villa',
    label: 'Villa',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14M3 21l3-3m0 0l3 3m-3-3V7m12 14l-3-3m0 0l3 3m-3-3V7M9 7h6m-6 4h6m-6 4h6" />
      </svg>
    ),
    description: 'Villa de luxe avec piscine',
    color: 'from-yellow-500 to-orange-600'
  },
  {
    id: 'room',
    label: 'Chambre',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    description: 'Chambre d\'hôte privative',
    color: 'from-red-500 to-rose-600'
  }
];

const AMENITIES_CATEGORIES = [
  {
    name: 'Essentiels',
    icon: '⚡',
    color: 'from-blue-500 to-blue-600',
    items: [
      { id: 'wifi', label: 'WiFi Haut Débit', icon: '📶', description: 'Connexion internet rapide' },
      { id: 'kitchen', label: 'Cuisine Équipée', icon: '👨‍🍳', description: 'Tout pour cuisiner' },
      { id: 'heating', label: 'Chauffage', icon: '🔥', description: 'Chauffage central' },
      { id: 'ac', label: 'Climatisation', icon: '❄️', description: 'Air frais' },
      { id: 'tv', label: 'Smart TV', icon: '📺', description: 'Télévision connectée' },
      { id: 'washer', label: 'Lave-linge', icon: '🧺', description: 'Machine à laver' }
    ]
  },
  {
    name: 'Confort',
    icon: '🛋️',
    color: 'from-green-500 to-green-600',
    items: [
      { id: 'pool', label: 'Piscine', icon: '🏊‍♂️', description: 'Piscine privée' },
      { id: 'jacuzzi', label: 'Jacuzzi', icon: '🛁', description: 'Spa privatif' },
      { id: 'gym', label: 'Salle de Sport', icon: '💪', description: 'Équipements fitness' },
      { id: 'parking', label: 'Parking Privé', icon: '🅿', description: 'Place de parking' },
      { id: 'garden', label: 'Jardin', icon: '🌳', description: 'Espace extérieur' },
      { id: 'balcony', label: 'Balcon/Terrasse', icon: '🌅', description: 'Espace extérieur privatif' }
    ]
  },
  {
    name: 'Sécurité',
    icon: '🔒',
    color: 'from-red-500 to-red-600',
    items: [
      { id: 'smoke_detector', label: 'Détecteur de Fumée', icon: '🚨', description: 'Sécurité incendie' },
      { id: 'first_aid', label: 'Trousse de Secours', icon: '🏥', description: 'Premiers soins' },
      { id: 'fire_extinguisher', label: 'Extincteur', icon: '🧯', description: 'Protection incendie' },
      { id: 'security_camera', label: 'Caméras', icon: '📹', description: 'Vidéosurveillance' },
      { id: 'safe', label: 'Coffre-fort', icon: '🔐', description: 'Sécurisation des valeurs' }
    ]
  }
];

export default function PropertyConfigurator({ onPropertyCreated, onCancel, initialProperty, mode = 'create' }: PropertyConfiguratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [property, setProperty] = useState<Property>(initialProperty ?? {
    name: '',
    address: '',
    type: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    amenities: [],
    price: 0,
    description: '',
    images: [],
    status: 'active'
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [mobileImages, setMobileImages] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [networkUploadUrl, setNetworkUploadUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Récupérer l'URL réseau réelle (IP locale) pour le QR code
  useEffect(() => {
    fetch(`/api/network-url?session=${sessionId}`)
      .then(r => r.json())
      .then(data => setNetworkUploadUrl(data.networkUrl || ''))
      .catch(() => setNetworkUploadUrl(`http://localhost:3000/upload?session=${sessionId}`));
  }, [sessionId]);

  const totalSteps = 5;

  const nextStep = async () => {
    if (currentStep < totalSteps) {
      // À l'étape 4 (photos), synchroniser les uploads mobiles avant de continuer
      if (currentStep === 4) {
        try {
          const response = await fetch(`/api/upload?session=${sessionId}`);
          const data = await response.json();
          if (data.images && data.images.length > mobileImages.length) {
            const newImages = data.images.slice(mobileImages.length);
            setMobileImages(data.images);
            setProperty(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
          }
        } catch (_e) {
          // Ignorer les erreurs réseau, on passe quand même
        }
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateProperty = useCallback((updates: Partial<Property>) => {
    setProperty(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleAmenity = (amenityId: string) => {
    const newAmenities = property.amenities.includes(amenityId)
      ? property.amenities.filter(id => id !== amenityId)
      : [...property.amenities, amenityId];
    updateProperty({ amenities: newAmenities });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedImages([...selectedImages, ...files]);
    const newImageUrls = files.map(file => URL.createObjectURL(file));
    updateProperty({ images: [...property.images, ...newImageUrls] });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setSelectedImages([...selectedImages, ...files]);
      const newImageUrls = files.map(file => URL.createObjectURL(file));
      updateProperty({ images: [...property.images, ...newImageUrls] });
    }
  };

  const removeImage = (index: number) => {
    const newImages = property.images.filter((_, i) => i !== index);
    const newSelectedImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newSelectedImages);
    updateProperty({ images: newImages });
  };

  const checkMobileUploads = useCallback(async () => {
    try {
      const response = await fetch(`/api/upload?session=${sessionId}`);
      const data = await response.json();
      if (data.images && data.images.length > mobileImages.length) {
        const newImages = data.images.slice(mobileImages.length);
        setMobileImages(data.images);
        // Ajouter les nouvelles images à la propriété
        updateProperty({ images: [...property.images, ...newImages] });
        // Afficher une notification
        setNotification(`+${newImages.length} photo(s) ajoutée(s) depuis mobile !`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Erreur vérification uploads:', error);
    }
  }, [sessionId, mobileImages, property.images, updateProperty]);

  // Vérifier les uploads mobiles toutes les 3 secondes quand le QR code est affiché
  React.useEffect(() => {
    if (showQRCode) {
      const interval = setInterval(checkMobileUploads, 3000);
      return () => clearInterval(interval);
    }
  }, [showQRCode, checkMobileUploads]);

  const createProperty = () => {
    const newProperty: Property = {
      ...property,
      id: mode === 'edit' ? property.id : Date.now(),
      createdAt: mode === 'edit' ? property.createdAt : new Date().toISOString()
    };
    onPropertyCreated(newProperty);
  };

  const getStepTitle = (step: number) => {
    const titles = {
      1: 'Type de propriété',
      2: 'Informations de base',
      3: 'Équipements',
      4: 'Photos',
      5: 'Tarifs et finalisation'
    };
    return titles[step as keyof typeof titles] || '';
  };

  const getStepDescription = (step: number) => {
    const descriptions = {
      1: 'Choisissez le type de propriété que vous souhaitez proposer',
      2: 'Renseignez les caractéristiques principales de votre location',
      3: 'Sélectionnez les équipements disponibles pour vos voyageurs',
      4: 'Ajoutez des photos de qualité pour mettre en valeur votre propriété',
      5: 'Définissez le prix et finalisez la création de votre annonce'
    };
    return descriptions[step as keyof typeof descriptions] || '';
  };

  const renderStepIndicator = () => (
    <div className="px-6 pt-6">
      <div className="flex items-center justify-center mb-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                step < currentStep
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : step === currentStep
                  ? 'bg-[#FF385C] text-white shadow-xl scale-110'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step < currentStep ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
              {step === currentStep && (
                <div className="absolute inset-0 rounded-full bg-[#FF385C] animate-ping opacity-20"></div>
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`w-16 h-1 mx-3 rounded transition-all duration-500 ${
                  step < currentStep ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
          {getStepTitle(currentStep)}
        </h2>
        <p className="text-gray-600">{getStepDescription(currentStep)}</p>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROPERTY_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              updateProperty({ type: type.id as Property['type'] });
              nextStep();
            }}
            className={`group relative overflow-hidden rounded-xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
              property.type === type.id
                ? `bg-gradient-to-br ${type.color} text-white shadow-2xl scale-105`
                : `bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white/90 shadow-lg border border-white/50`
            }`}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className={`p-4 rounded-xl transition-all duration-300 ${
                property.type === type.id
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
              }`}>
                {type.icon}
              </div>
              <div className="text-center">
                <h3 className={`font-bold text-lg transition-colors duration-300 ${
                  property.type === type.id ? 'text-white' : 'text-gray-900'
                }`}>
                  {type.label}
                </h3>
                <p className={`text-sm mt-1 transition-colors duration-300 ${
                  property.type === type.id ? 'text-white/90' : 'text-gray-600'
                }`}>
                  {type.description}
                </p>
              </div>
            </div>

            {/* Active indicator */}
            {property.type === type.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl"></div>
            )}

            {/* Hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          </button>
        ))}
      </div>

      {property.type && (
        <div className="mt-8 bg-gradient-to-r from-[#FF385C]/5 to-[#FF385C]/10 rounded-xl p-6 border border-[#FF385C]/10">
          <div className="flex items-center space-x-3">
            <div className="bg-[#FF385C] p-3 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Type sélectionné</p>
              <p className="text-[#FF385C]">
                {PROPERTY_TYPES.find(t => t.id === property.type)?.label}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="px-6 py-8 space-y-8">
      {/* Informations principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
            <svg className="w-4 h-4 text-[#FF385C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Nom de la propriété *</span>
          </label>
          <input
            type="text"
            value={property.name}
            onChange={(e) => updateProperty({ name: e.target.value })}
            placeholder="Ex: Villa Méditerranée"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
            <svg className="w-4 h-4 text-[#FF385C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Adresse complète *</span>
          </label>
          <input
            type="text"
            value={property.address}
            onChange={(e) => updateProperty({ address: e.target.value })}
            placeholder="123 Avenue des Palmiers, Nice"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Caractéristiques numériques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Chambres</span>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => updateProperty({ bedrooms: Math.max(0, property.bedrooms - 1) })}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-2xl font-bold text-gray-900">{property.bedrooms}</span>
            <button
              onClick={() => updateProperty({ bedrooms: property.bedrooms + 1 })}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16l4-4h12l4-4V4H4z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Salles de bain</span>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => updateProperty({ bathrooms: Math.max(0, property.bathrooms - 1) })}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-2xl font-bold text-gray-900">{property.bathrooms}</span>
            <button
              onClick={() => updateProperty({ bathrooms: property.bathrooms + 1 })}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Voyageurs max</span>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => updateProperty({ maxGuests: Math.max(1, property.maxGuests - 1) })}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-2xl font-bold text-gray-900">{property.maxGuests}</span>
            <button
              onClick={() => updateProperty({ maxGuests: property.maxGuests + 1 })}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
          <svg className="w-4 h-4 text-[#FF385C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Description</span>
        </label>
        <textarea
          value={property.description}
          onChange={(e) => updateProperty({ description: e.target.value })}
          placeholder="Décrivez votre propriété, son ambiance, ses points forts... (minimum 50 caractères)"
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm resize-none"
        />
        <p className="text-sm text-gray-500">
          {property.description.length}/500 caractères
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="px-6 py-8 space-y-8">
      <div className="bg-gradient-to-r from-[#FF385C]/5 to-[#FF385C]/10 rounded-xl p-6 border border-[#FF385C]/10">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] p-3 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Étape optionnelle</p>
            <p className="text-sm text-blue-700">
              Sélectionnez les équipements disponibles. Vous pouvez en sélectionner autant que vous voulez ou <strong>passer directement à l&apos;étape suivante</strong>.
            </p>
          </div>
        </div>
      </div>

      {AMENITIES_CATEGORIES.map((category) => (
        <div key={category.name} className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
          <div className="flex items-center space-x-3 mb-6">
            <div className={`p-3 rounded-xl bg-gradient-to-r ${category.color}`}>
              <span className="text-xl">{category.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{category.name}</h3>
              <p className="text-sm text-gray-600">Équipements disponibles dans votre propriété</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.items.map((amenity) => (
              <button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-200 hover:shadow-lg ${
                  property.amenities.includes(amenity.id)
                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                    : `bg-gray-50 hover:bg-gray-100 border border-gray-200`
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg transition-all duration-200 ${
                    property.amenities.includes(amenity.id)
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-gray-600 group-hover:bg-gray-50'
                  }`}>
                    <span className="text-lg">{amenity.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium transition-colors duration-200 ${
                      property.amenities.includes(amenity.id) ? 'text-white' : 'text-gray-900'
                    }`}>
                      {amenity.label}
                    </p>
                    <p className={`text-sm transition-colors duration-200 ${
                      property.amenities.includes(amenity.id) ? 'text-white/80' : 'text-gray-600'
                    }`}>
                      {amenity.description}
                    </p>
                  </div>
                  {property.amenities.includes(amenity.id) && (
                    <div className="bg-white/20 rounded-full p-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">
              Équipements sélectionnés : {property.amenities.length}
            </p>
            <p className="text-sm text-green-700">
              ✅ Les équipements sont <strong>optionnels</strong> - vous pouvez passer à l&apos;étape suivante !
            </p>
          </div>
          <button
            onClick={nextStep}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm font-medium"
          >
            Continuer →
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="px-6 py-8 space-y-6">
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          isDragging
            ? 'border-[#FF385C] bg-[#FF385C]/5 scale-105'
            : 'border-gray-300 hover:border-gray-400 bg-white/50 backdrop-blur-sm'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-6">
          <div className={`text-6xl transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
            📷
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {isDragging ? 'Déposez vos photos ici' : 'Ajoutez des photos'}
            </p>
            <p className="text-gray-600 mb-6">
              Formats acceptés: JPG, PNG, WEBP • Max 10MB par photo • Glissez-déposez ou cliquez pour sélectionner
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#FF385C] text-white px-8 py-4 rounded-xl hover:bg-[#E31C5F] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
          >
            <span className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Sélectionner des photos</span>
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      {property.images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              Photos sélectionnées ({property.images.length})
            </h3>
            <span className="text-sm font-medium">
              {property.images.length === 0
                ? <span className="text-red-500">⚠️ Au moins 1 photo obligatoire</span>
                : property.images.length < 5
                  ? <span className="text-orange-500">✅ OK — 5 photos recommandées ({property.images.length}/5)</span>
                  : <span className="text-green-600">✅ {property.images.length} photos</span>
              }
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {property.images.map((image, index) => (
              <div key={index} className="group relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <Image
                  src={image}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-600 transform hover:scale-110"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                    Photo principale
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {property.images.length === 0 && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 flex items-center space-x-3">
          <span className="text-2xl">📱</span>
          <p className="text-sm font-semibold text-red-700">
            Vous devez ajouter au moins <strong>1 photo</strong> pour continuer. Utilisez le bouton ci-dessus ou le QR code mobile.
          </p>
        </div>
      )}

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Conseils pour de belles photos</p>
            <p className="text-sm text-yellow-700">
              Commencez par l&apos;extérieur, puis intérieur, cuisine, chambres, salle de bain. Les bonnes photos augmentent les réservations de 30% !
            </p>
          </div>
        </div>
      </div>

      {/* QR Code pour upload mobile */}
      <div className="bg-gradient-to-r from-[#FF385C]/5 to-[#FF385C]/10 rounded-xl p-6 border border-[#FF385C]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] p-3 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Upload depuis mobile</p>
              <p className="text-sm text-blue-700">
                Scannez le QR code avec votre téléphone pour uploader des photos directement
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowQRCode(!showQRCode)}
            className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm font-medium"
          >
            {showQRCode ? 'Masquer QR' : 'Afficher QR'}
          </button>
        </div>

        {showQRCode && (
          <div className="mt-6 space-y-4">
            {networkUploadUrl ? (
              <>
                <div className="flex flex-col items-center space-y-3">
                  <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-blue-100">
                    <QRCodeSVG
                      value={networkUploadUrl}
                      size={200}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      📷 Scannez avec l&apos;appareil photo de votre iPhone
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      (pas besoin d&apos;application, l&apos;appareil photo iOS suffit)
                    </p>
                  </div>
                </div>

                {/* URL cliquable / copiable */}
                <div className="bg-white rounded-xl p-4 border border-blue-200">
                  <p className="text-xs text-gray-500 mb-2 font-medium">URL réseau :</p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-xs bg-gray-50 rounded-lg px-3 py-2 text-blue-700 break-all font-mono border">
                      {networkUploadUrl}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(networkUploadUrl);
                        setNotification('URL copiée !');
                        setTimeout(() => setNotification(null), 2000);
                      }}
                      className="shrink-0 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      Copier
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800 mb-2">⚠️ Prérequis</p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• Votre iPhone doit être sur le <strong>même Wi-Fi</strong> que ce PC</li>
                    <li>• Le serveur Next.js doit tourner (port 3000)</li>
                    <li>• Si le QR ne fonctionne pas, copiez l&apos;URL et collez-la dans Safari</li>
                  </ul>
                </div>

                {mobileImages.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-3 border border-green-200 text-center">
                    <p className="text-sm font-semibold text-green-700">
                      ✅ {mobileImages.length} photo(s) reçue(s) depuis mobile
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="px-6 py-8 space-y-8">
      {/* Prix */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-white/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Prix par nuit</h3>
            <p className="text-gray-600">Définissez le tarif de base de votre location</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <input
            type="number"
            value={property.price}
            onChange={(e) => updateProperty({ price: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className="text-3xl font-bold text-center w-32 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
          />
          <span className="text-2xl font-medium text-gray-700">€</span>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Prix moyen dans la région pour ce type de propriété:
            <span className="font-semibold text-green-600 ml-2">
              {property.type === 'apartment' ? '85-120' : property.type === 'house' ? '120-180' : property.type === 'studio' ? '65-95' : property.type === 'villa' ? '250-400' : '45-75'}€
            </span>
          </p>
        </div>
      </div>

      {/* Aperçu final */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-white/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-[#FF385C] p-3 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Aperçu de votre propriété</h3>
            <p className="text-gray-600">Vérifiez que toutes les informations sont correctes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Type:</span>
              <span className="font-semibold text-gray-900">
                {PROPERTY_TYPES.find(t => t.id === property.type)?.label}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Capacité:</span>
              <span className="font-semibold text-gray-900">
                {property.maxGuests} voyageur{property.maxGuests > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Chambres:</span>
              <span className="font-semibold text-gray-900">{property.bedrooms}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Salles de bain:</span>
              <span className="font-semibold text-gray-900">{property.bathrooms}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Équipements:</span>
              <span className="font-semibold text-gray-900">{property.amenities.length} sélectionnés</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Photos:</span>
              <span className="font-semibold text-gray-900">{property.images.length} ajoutées</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-900 font-semibold">Prix par nuit:</span>
              <span className="text-2xl font-bold text-green-600">{property.price}€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message de succès */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Prêt à publier !</p>
            <p className="text-sm text-green-700">
              Votre propriété sera visible par les voyageurs dès validation. Vous pourrez la modifier à tout moment depuis votre dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return property.type;
      case 2: return property.name && property.address && property.description.length >= 50;
      case 3: return true; // Les équipements sont optionnels
      case 4: return property.images.length >= 1; // Au moins 1 photo obligatoire
      case 5: return property.price > 0;
      default: return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-white/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-[#FF385C] p-3 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {mode === 'edit' ? `Modifier : ${property.name}` : 'Nouvelle propriété'}
              </h1>
              <p className="text-sm text-gray-600">{mode === 'edit' ? 'Modifiez les informations de votre propriété' : 'Créateur de propriété intuitif et graphique'}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 rounded-xl hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div className="mx-6 mt-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg animate-pulse">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{notification}</span>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-xl hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Précédent</span>
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Étape {currentStep} sur {totalSteps}
            </span>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#FF385C] h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {currentStep < totalSteps ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center space-x-2 px-6 py-3 bg-[#FF385C] text-white rounded-xl hover:bg-[#E31C5F] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>Suivant</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={createProperty}
              disabled={!canProceed()}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{mode === 'edit' ? 'Mettre à jour' : 'Créer la propriété'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
