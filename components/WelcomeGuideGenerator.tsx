'use client';

import { useState, useRef } from 'react';
import { useBNB, Property, Booking } from '../contexts/BNBContext';

interface WelcomeGuideData {
  property: Property;
  booking: Booking;
  customContent: {
    wifiPassword: string;
    accessCodes: {
      mainDoor: string;
      apartmentDoor: string;
      elevator?: string;
      parking?: string;
    };
    emergencyContacts: {
      owner: { name: string; phone: string; email: string };
      localEmergency: string;
      propertyManager?: { name: string; phone: string };
    };
    neighborhood: {
      supermarkets: string[];
      pharmacies: string[];
      restaurants: string[];
      transport: string[];
      attractions: string[];
    };
    instructions: {
      heating: string;
      appliances: string;
      waste: string;
      parking: string;
    };
    services: {
      cleaning: string;
      laundry: string;
      concierge: string;
    };
  };
  template: 'modern' | 'classic' | 'minimal';
  language: 'fr' | 'en' | 'es' | 'it' | 'de';
}

const WelcomeGuideGenerator = () => {
  const { properties, bookings, getProperty, getBookingsByProperty } = useBNB();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [guideData, setGuideData] = useState<WelcomeGuideData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const guideRef = useRef<HTMLDivElement>(null);

  const selectedProperty = selectedPropertyId ? getProperty(selectedPropertyId) : null;
  const propertyBookings = selectedPropertyId ? getBookingsByProperty(selectedPropertyId) : [];

  const initializeGuide = () => {
    if (!selectedProperty || !selectedBookingId) return;

    const booking = bookings.find((b: Booking) => b.id === selectedBookingId);
    if (!booking) return;

    const newGuideData: WelcomeGuideData = {
      property: selectedProperty,
      booking,
      customContent: {
        wifiPassword: '',
        accessCodes: {
          mainDoor: '',
          apartmentDoor: '',
          elevator: '',
          parking: ''
        },
        emergencyContacts: {
          owner: { name: 'Propriétaire', phone: '', email: '' },
          localEmergency: '112',
          propertyManager: { name: '', phone: '' }
        },
        neighborhood: {
          supermarkets: [],
          pharmacies: [],
          restaurants: [],
          transport: [],
          attractions: []
        },
        instructions: {
          heating: '',
          appliances: '',
          waste: '',
          parking: ''
        },
        services: {
          cleaning: '',
          laundry: '',
          concierge: ''
        }
      },
      template: 'modern',
      language: 'fr'
    };

    setGuideData(newGuideData);
  };

  const updateCustomContent = (section: string, field: string, value: unknown) => {
    if (!guideData) return;

    const currentSection = guideData.customContent[section as keyof typeof guideData.customContent];

    if (typeof currentSection === 'object' && currentSection !== null && !Array.isArray(currentSection)) {
      setGuideData({
        ...guideData,
        customContent: {
          ...guideData.customContent,
          [section]: {
            ...currentSection,
            [field]: value
          }
        }
      });
    } else {
      setGuideData({
        ...guideData,
        customContent: {
          ...guideData.customContent,
          [section]: value
        }
      });
    }
  };

  const updateArrayField = (section: string, field: string, value: string[]) => {
    if (!guideData) return;

    const currentSection = guideData.customContent[section as keyof typeof guideData.customContent];

    if (typeof currentSection === 'object' && currentSection !== null && !Array.isArray(currentSection)) {
      setGuideData({
        ...guideData,
        customContent: {
          ...guideData.customContent,
          [section]: {
            ...currentSection,
            [field]: value
          }
        }
      });
    }
  };

  const generatePDF = async () => {
    if (!guideData || !guideRef.current) return;

    setIsGenerating(true);
    try {
      // Pour une vraie implémentation, utiliser une bibliothèque comme jsPDF ou html2pdf
      // Pour l'instant, on simule la génération
      const element = guideRef.current;
      const htmlContent = element.innerHTML;

      // Simulation de téléchargement
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guide-bienvenue-${guideData.property.name.replace(/\s+/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderGuidePreview = () => {
    if (!guideData) return null;

    const { property, booking, customContent, template, language } = guideData;

    const templates = {
      modern: 'bg-gradient-to-br from-[#FF385C]/5 to-[#FF385C]/10',
      classic: 'bg-white border-2 border-gray-300',
      minimal: 'bg-gray-50'
    };

    const translations = {
      fr: {
        welcome: 'Bienvenue',
        guide: 'Guide du séjour',
        property: 'Votre appartement',
        checkIn: 'Arrivée',
        checkOut: 'Départ',
        wifi: 'WiFi',
        access: 'Accès',
        emergency: 'Urgences',
        neighborhood: 'Quartier',
        instructions: 'Instructions',
        services: 'Services'
      },
      en: {
        welcome: 'Welcome',
        guide: 'Stay Guide',
        property: 'Your apartment',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        wifi: 'WiFi',
        access: 'Access',
        emergency: 'Emergency',
        neighborhood: 'Neighborhood',
        instructions: 'Instructions',
        services: 'Services'
      },
      es: {
        welcome: 'Bienvenido',
        guide: 'Guía de la estancia',
        property: 'Su apartamento',
        checkIn: 'Entrada',
        checkOut: 'Salida',
        wifi: 'WiFi',
        access: 'Acceso',
        emergency: 'Emergencias',
        neighborhood: 'Barrio',
        instructions: 'Instrucciones',
        services: 'Servicios'
      },
      it: {
        welcome: 'Benvenuto',
        guide: 'Guida del soggiorno',
        property: 'Il suo appartamento',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        wifi: 'WiFi',
        access: 'Accesso',
        emergency: 'Emergenze',
        neighborhood: 'Quartiere',
        instructions: 'Istruzioni',
        services: 'Servizi'
      },
      de: {
        welcome: 'Willkommen',
        guide: 'Aufenthaltsführer',
        property: 'Ihre Wohnung',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        wifi: 'WiFi',
        access: 'Zugang',
        emergency: 'Notfälle',
        neighborhood: 'Nachbarschaft',
        instructions: 'Anweisungen',
        services: 'Dienstleistungen'
      }
    };

    const t = translations[language];

    return (
      <div
        ref={guideRef}
        className={`max-w-4xl mx-auto p-8 ${templates[template]} shadow-lg`}
        style={{ fontFamily: template === 'classic' ? 'serif' : 'sans-serif' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t.welcome}</h1>
          <h2 className="text-2xl text-gray-600">{t.guide}</h2>
          <div className="mt-4 text-lg text-gray-700">
            {booking.guestInfo.name} • {property.name}
          </div>
        </div>

        {/* Property Information */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">{t.property}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Adresse</h4>
              <p className="text-gray-600">{property.address}</p>
              <p className="text-gray-600">{property.city}, {property.country}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Détails</h4>
              <p className="text-gray-600">{property.bedrooms} chambre(s) • {property.bathrooms} salle(s) de bain</p>
              <p className="text-gray-600">Max {property.maxGuests} personne(s)</p>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold text-gray-700 mb-2">Équipements</h4>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Check-in/out Information */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">Horaires</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">{t.checkIn}</h4>
              <p className="text-gray-600"> partir de {property.checkInTime}</p>
              <p className="text-sm text-gray-500">Le {new Date(booking.checkIn).toLocaleDateString(language)}</p>
            </div>
            <div>
              <h4 className="font-semibold text-red-700 mb-2">{t.checkOut}</h4>
              <p className="text-gray-600">Avant {property.checkOutTime}</p>
              <p className="text-sm text-gray-500">Le {new Date(booking.checkOut).toLocaleDateString(language)}</p>
            </div>
          </div>
        </div>

        {/* WiFi Information */}
        {customContent.wifiPassword && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">{t.wifi}</h3>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="font-mono text-lg">{customContent.wifiPassword}</p>
            </div>
          </div>
        )}

        {/* Access Codes */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">{t.access}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Porte d&apos;entrée</h4>
              <p className="font-mono text-lg bg-gray-100 p-2 rounded">
                {customContent.accessCodes.mainDoor || ' définir'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Appartement</h4>
              <p className="font-mono text-lg bg-gray-100 p-2 rounded">
                {customContent.accessCodes.apartmentDoor || ' définir'}
              </p>
            </div>
            {customContent.accessCodes.elevator && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Ascenseur</h4>
                <p className="font-mono text-lg bg-gray-100 p-2 rounded">
                  {customContent.accessCodes.elevator}
                </p>
              </div>
            )}
            {customContent.accessCodes.parking && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Parking</h4>
                <p className="font-mono text-lg bg-gray-100 p-2 rounded">
                  {customContent.accessCodes.parking}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 className="text-2xl font-semibold mb-4 text-red-800">{t.emergency}</h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-gray-700">Propriétaire</h4>
              <p className="text-gray-600">{customContent.emergencyContacts.owner.name}</p>
              <p className="text-gray-600">{customContent.emergencyContacts.owner.phone}</p>
              <p className="text-gray-600">{customContent.emergencyContacts.owner.email}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">Urgences locales</h4>
              <p className="text-red-600 font-bold">{customContent.emergencyContacts.localEmergency}</p>
            </div>
            {customContent.emergencyContacts.propertyManager && (
              <div>
                <h4 className="font-semibold text-gray-700">Gestionnaire</h4>
                <p className="text-gray-600">{customContent.emergencyContacts.propertyManager.name}</p>
                <p className="text-gray-600">{customContent.emergencyContacts.propertyManager.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Neighborhood Information */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">{t.neighborhood}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {customContent.neighborhood.supermarkets.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Supermarchés</h4>
                <ul className="text-gray-600 space-y-1">
                  {customContent.neighborhood.supermarkets.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {customContent.neighborhood.restaurants.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Restaurants</h4>
                <ul className="text-gray-600 space-y-1">
                  {customContent.neighborhood.restaurants.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {customContent.neighborhood.transport.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Transports</h4>
                <ul className="text-gray-600 space-y-1">
                  {customContent.neighborhood.transport.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {customContent.neighborhood.attractions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2"> voir</h4>
                <ul className="text-gray-600 space-y-1">
                  {customContent.neighborhood.attractions.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">{t.instructions}</h3>
          <div className="space-y-4">
            {customContent.instructions.heating && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Chauffage</h4>
                <p className="text-gray-600">{customContent.instructions.heating}</p>
              </div>
            )}
            {customContent.instructions.appliances && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Électroménagers</h4>
                <p className="text-gray-600">{customContent.instructions.appliances}</p>
              </div>
            )}
            {customContent.instructions.waste && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Déchets</h4>
                <p className="text-gray-600">{customContent.instructions.waste}</p>
              </div>
            )}
            {customContent.instructions.parking && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Parking</h4>
                <p className="text-gray-600">{customContent.instructions.parking}</p>
              </div>
            )}
          </div>
        </div>

        {/* Services */}
        {(customContent.services.cleaning || customContent.services.laundry || customContent.services.concierge) && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">{t.services}</h3>
            <div className="space-y-4">
              {customContent.services.cleaning && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Ménage</h4>
                  <p className="text-gray-600">{customContent.services.cleaning}</p>
                </div>
              )}
              {customContent.services.laundry && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Laverie</h4>
                  <p className="text-gray-600">{customContent.services.laundry}</p>
                </div>
              )}
              {customContent.services.concierge && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Conciergerie</h4>
                  <p className="text-gray-600">{customContent.services.concierge}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rules */}
        {property.rules && property.rules.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-800">Règles de la maison</h3>
            <ul className="text-gray-700 space-y-2">
              {property.rules.map((rule, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 mt-8 pt-6 border-t">
          <p>Profitez de votre séjour !</p>
          <p className="text-sm mt-2">Guide généré le {new Date().toLocaleDateString(language)}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Générateur de Guide de Bienvenue</h1>

      {/* Selection Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Sélection</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Propriété
            </label>
            <select
              value={selectedPropertyId || ''}
              onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner une propriété</option>
              {properties.map((property: Property) => (
                <option key={property.id} value={property.id}>
                  {property.name} - {property.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Réservation
            </label>
            <select
              value={selectedBookingId || ''}
              onChange={(e) => setSelectedBookingId(Number(e.target.value))}
              disabled={!selectedPropertyId}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Sélectionner une réservation</option>
              {propertyBookings.map((booking: Booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.guestInfo.name} - {new Date(booking.checkIn).toLocaleDateString()} au {new Date(booking.checkOut).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={initializeGuide}
          disabled={!selectedPropertyId || !selectedBookingId}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Initialiser le guide
        </button>
      </div>

      {guideData && (
        <>
          {/* Customization Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Personnalisation</h2>

            {/* Template and Language */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <select
                  value={guideData.template}
                  onChange={(e) => setGuideData({ ...guideData, template: e.target.value as 'modern' | 'classic' | 'minimal' })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="modern">Moderne</option>
                  <option value="classic">Classique</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Langue
                </label>
                <select
                  value={guideData.language}
                  onChange={(e) => setGuideData({ ...guideData, language: e.target.value as 'fr' | 'en' | 'es' | 'it' | 'de' })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="it">Italiano</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>

            {/* WiFi */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe WiFi
              </label>
              <input
                type="text"
                value={guideData.customContent.wifiPassword}
                onChange={(e) => updateCustomContent('wifiPassword', '', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Entrez le mot de passe WiFi"
              />
            </div>

            {/* Access Codes */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Codes d&apos;accès</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porte d&apos;entrée
                  </label>
                  <input
                    type="text"
                    value={guideData.customContent.accessCodes.mainDoor}
                    onChange={(e) => updateCustomContent('accessCodes', 'mainDoor', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appartement
                  </label>
                  <input
                    type="text"
                    value={guideData.customContent.accessCodes.apartmentDoor}
                    onChange={(e) => updateCustomContent('accessCodes', 'apartmentDoor', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ascenseur (optionnel)
                  </label>
                  <input
                    type="text"
                    value={guideData.customContent.accessCodes.elevator || ''}
                    onChange={(e) => updateCustomContent('accessCodes', 'elevator', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking (optionnel)
                  </label>
                  <input
                    type="text"
                    value={guideData.customContent.accessCodes.parking || ''}
                    onChange={(e) => updateCustomContent('accessCodes', 'parking', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Contacts d&apos;urgence</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du propriétaire
                  </label>
                  <input
                    type="text"
                    value={guideData.customContent.emergencyContacts.owner.name}
                    onChange={(e) => updateCustomContent('emergencyContacts', 'owner', {
                      ...guideData.customContent.emergencyContacts.owner,
                      name: e.target.value
                    })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone propriétaire
                  </label>
                  <input
                    type="tel"
                    value={guideData.customContent.emergencyContacts.owner.phone}
                    onChange={(e) => updateCustomContent('emergencyContacts', 'owner', {
                      ...guideData.customContent.emergencyContacts.owner,
                      phone: e.target.value
                    })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email propriétaire
                  </label>
                  <input
                    type="email"
                    value={guideData.customContent.emergencyContacts.owner.email}
                    onChange={(e) => updateCustomContent('emergencyContacts', 'owner', {
                      ...guideData.customContent.emergencyContacts.owner,
                      email: e.target.value
                    })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgences locales
                  </label>
                  <input
                    type="text"
                    value={guideData.customContent.emergencyContacts.localEmergency}
                    onChange={(e) => updateCustomContent('emergencyContacts', 'localEmergency', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="112"
                  />
                </div>
              </div>
            </div>

            {/* Neighborhood */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Informations quartier</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supermarchés (un par ligne)
                  </label>
                  <textarea
                    value={guideData.customContent.neighborhood.supermarkets.join('\n')}
                    onChange={(e) => updateArrayField('neighborhood', 'supermarkets', e.target.value.split('\n').filter(item => item.trim()))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Carrefour Market&#10;Monoprix&#10;Lidl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurants (un par ligne)
                  </label>
                  <textarea
                    value={guideData.customContent.neighborhood.restaurants.join('\n')}
                    onChange={(e) => updateArrayField('neighborhood', 'restaurants', e.target.value.split('\n').filter(item => item.trim()))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Le Petit Bistrot&#10;Pizza Roma&#10;Sushi Zen"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transports (un par ligne)
                  </label>
                  <textarea
                    value={guideData.customContent.neighborhood.transport.join('\n')}
                    onChange={(e) => updateArrayField('neighborhood', 'transport', e.target.value.split('\n').filter(item => item.trim()))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Métro ligne 1 - 5 min&#10;Bus 38 - arrêt devant&#10;Gare SNCF - 10 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                     voir / Attractions (un par ligne)
                  </label>
                  <textarea
                    value={guideData.customContent.neighborhood.attractions.join('\n')}
                    onChange={(e) => updateArrayField('neighborhood', 'attractions', e.target.value.split('\n').filter(item => item.trim()))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Tour Eiffel - 15 min&#10;Musée du Louvre - 20 min&#10;Jardin du Luxembourg - 10 min"
                  />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Instructions</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chauffage
                  </label>
                  <textarea
                    value={guideData.customContent.instructions.heating}
                    onChange={(e) => updateCustomContent('instructions', 'heating', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Le chauffage se règle avec le thermostat mural..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Électroménagers
                  </label>
                  <textarea
                    value={guideData.customContent.instructions.appliances}
                    onChange={(e) => updateCustomContent('instructions', 'appliances', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Lave-vaisselle : programme éco...&#10;Four : préchauffer 10 min..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Déchets
                  </label>
                  <textarea
                    value={guideData.customContent.instructions.waste}
                    onChange={(e) => updateCustomContent('instructions', 'waste', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Tri sélectif obligatoire...&#10;Conteneurs dans la cour..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking
                  </label>
                  <textarea
                    value={guideData.customContent.instructions.parking}
                    onChange={(e) => updateCustomContent('instructions', 'parking', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Parking gratuit dans la rue...&#10;Place réservée n°5..."
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Services</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ménage
                  </label>
                  <textarea
                    value={guideData.customContent.services.cleaning}
                    onChange={(e) => updateCustomContent('services', 'cleaning', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Service de ménage disponible...&#10;Tarif : 50€/heure..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Laverie
                  </label>
                  <textarea
                    value={guideData.customContent.services.laundry}
                    onChange={(e) => updateCustomContent('services', 'laundry', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Laverie automatique au sous-sol...&#10;Ouvert 24h/24..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conciergerie
                  </label>
                  <textarea
                    value={guideData.customContent.services.concierge}
                    onChange={(e) => updateCustomContent('services', 'concierge', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Conciergerie disponible 24h/24...&#10;Tél : 01 23 45 67 89..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview and Generate */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Aperçu et génération</h2>
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Génération...
                  </>
                ) : (
                  'Générer le guide'
                )}
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="font-medium text-gray-700">Aperçu du guide</h3>
              </div>
              <div className="max-h-96 overflow-y-auto p-4 bg-white">
                {renderGuidePreview()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WelcomeGuideGenerator;
