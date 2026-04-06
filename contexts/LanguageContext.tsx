'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type Lang = 'fr' | 'en' | 'de' | 'es';

export const LANGUAGES: { code: Lang; name: string; flag: string }[] = [
  { code: 'fr', name: 'Français', flag: 'FR' },
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'es', name: 'Español', flag: 'ES' },
];

// ─── Dictionnaire de traductions ───
const translations: Record<string, Record<Lang, string>> = {
  // Navigation & Layout
  'nav.home': { fr: 'Accueil', en: 'Home', de: 'Startseite', es: 'Inicio' },
  'nav.admin': { fr: 'Administration', en: 'Administration', de: 'Verwaltung', es: 'Administración' },
  'nav.login': { fr: 'Connexion', en: 'Login', de: 'Anmelden', es: 'Iniciar sesión' },
  'nav.logout': { fr: 'Déconnexion', en: 'Logout', de: 'Abmelden', es: 'Cerrar sesión' },
  'nav.allProperties': { fr: 'Toutes les propriétés', en: 'All properties', de: 'Alle Immobilien', es: 'Todas las propiedades' },

  // Tabs
  'tab.bookings': { fr: 'Réservations', en: 'Bookings', de: 'Buchungen', es: 'Reservas' },
  'tab.properties': { fr: 'Propriétés', en: 'Properties', de: 'Immobilien', es: 'Propiedades' },
  'tab.guests': { fr: 'Clients', en: 'Guests', de: 'Gäste', es: 'Huéspedes' },
  'tab.maintenance': { fr: 'Maintenance', en: 'Maintenance', de: 'Wartung', es: 'Mantenimiento' },
  'tab.cleaning': { fr: 'Ménage', en: 'Cleaning', de: 'Reinigung', es: 'Limpieza' },
  'tab.inventory': { fr: 'Inventaire', en: 'Inventory', de: 'Inventar', es: 'Inventario' },
  'tab.financial': { fr: 'Finances', en: 'Finances', de: 'Finanzen', es: 'Finanzas' },
  'tab.qrcheckin': { fr: 'QR Check-in', en: 'QR Check-in', de: 'QR Check-in', es: 'QR Check-in' },
  'tab.contract': { fr: 'Contrats', en: 'Contracts', de: 'Verträge', es: 'Contratos' },
  'tab.reviews': { fr: 'Avis', en: 'Reviews', de: 'Bewertungen', es: 'Opiniones' },
  'tab.welcome': { fr: 'Accueil', en: 'Welcome', de: 'Willkommen', es: 'Bienvenida' },
  'tab.pricing': { fr: 'Tarifs', en: 'Pricing', de: 'Preise', es: 'Tarifas' },
  'tab.notifications': { fr: 'Notifications', en: 'Notifications', de: 'Benachrichtigungen', es: 'Notificaciones' },
  'tab.settings': { fr: 'Paramètres', en: 'Settings', de: 'Einstellungen', es: 'Configuración' },
  'tab.cleaningGallery': { fr: 'Galerie Ménage', en: 'Cleaning Gallery', de: 'Reinigungs-Galerie', es: 'Galería Limpieza' },
  'tab.shareLinks': { fr: 'Liens Partagé', en: 'Share Links', de: 'Teilen-Links', es: 'Enlaces Compartir' },
  'tab.forecasting': { fr: 'Prévisions', en: 'Forecasting', de: 'Prognosen', es: 'Previsiones' },
  'tab.videoguides': { fr: 'Vidéos Équipements', en: 'Equipment Videos', de: 'Gerätevideos', es: 'Vídeos Equipos' },

  // Stats
  'stats.properties': { fr: 'Propriétés', en: 'Properties', de: 'Immobilien', es: 'Propiedades' },
  'stats.bookings': { fr: 'Réservations', en: 'Bookings', de: 'Buchungen', es: 'Reservas' },
  'stats.revenue': { fr: 'Revenus', en: 'Revenue', de: 'Einnahmen', es: 'Ingresos' },
  'stats.avgRating': { fr: 'Note moyenne', en: 'Avg. rating', de: 'Durchschn. Bewertung', es: 'Nota media' },

  // Common actions
  'action.add': { fr: 'Ajouter', en: 'Add', de: 'Hinzufügen', es: 'Añadir' },
  'action.edit': { fr: 'Modifier', en: 'Edit', de: 'Bearbeiten', es: 'Editar' },
  'action.delete': { fr: 'Supprimer', en: 'Delete', de: 'Löschen', es: 'Eliminar' },
  'action.save': { fr: 'Sauvegarder', en: 'Save', de: 'Speichern', es: 'Guardar' },
  'action.cancel': { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen', es: 'Cancelar' },
  'action.close': { fr: 'Fermer', en: 'Close', de: 'Schließen', es: 'Cerrar' },
  'action.export': { fr: 'Exporter', en: 'Export', de: 'Exportieren', es: 'Exportar' },
  'action.send': { fr: 'Envoyer', en: 'Send', de: 'Senden', es: 'Enviar' },
  'action.confirm': { fr: 'Confirmer', en: 'Confirm', de: 'Bestätigen', es: 'Confirmar' },
  'action.search': { fr: 'Rechercher', en: 'Search', de: 'Suchen', es: 'Buscar' },
  'action.filter': { fr: 'Filtrer', en: 'Filter', de: 'Filtern', es: 'Filtrar' },
  'action.copy': { fr: 'Copier', en: 'Copy', de: 'Kopieren', es: 'Kopieren' },
  'action.download': { fr: 'Télécharger', en: 'Download', de: 'Herunterladen', es: 'Descargar' },
  'action.generate': { fr: 'Générer', en: 'Generate', de: 'Generieren', es: 'Generar' },
  'action.create': { fr: 'Créer', en: 'Create', de: 'Erstellen', es: 'Crear' },
  'action.upload': { fr: 'Télécharger', en: 'Upload', de: 'Hochladen', es: 'Subir' },

  // Bookings
  'booking.new': { fr: 'Nouvelle Réservation', en: 'New Booking', de: 'Neue Buchung', es: 'Nueva Reserva' },
  'booking.none': { fr: 'Aucune réservation', en: 'No bookings', de: 'Keine Buchungen', es: 'Sin reservas' },
  'booking.createFirst': { fr: 'Créez votre première réservation', en: 'Create your first booking', de: 'Erstellen Sie Ihre erste Buchung', es: 'Crea tu primera reserva' },
  'booking.confirmed': { fr: 'Confirmé', en: 'Confirmed', de: 'Bestätigt', es: 'Confirmada' },
  'booking.pending': { fr: 'En attente', en: 'Pending', de: 'Ausstehend', es: 'Pendiente' },
  'booking.cancelled': { fr: 'Annulé', en: 'Cancelled', de: 'Storniert', es: 'Cancelada' },
  'booking.completed': { fr: 'Terminé', en: 'Completed', de: 'Abgeschlossen', es: 'Completada' },
  'booking.guest': { fr: 'Client', en: 'Guest', de: 'Gast', es: 'Huésped' },
  'booking.checkIn': { fr: 'Arrivée', en: 'Check-in', de: 'Anreise', es: 'Llegada' },
  'booking.checkOut': { fr: 'Départ', en: 'Check-out', de: 'Abreise', es: 'Salida' },
  'booking.guests': { fr: 'Voyageurs', en: 'Guests', de: 'Gäste', es: 'Huéspedes' },
  'booking.total': { fr: 'Total', en: 'Total', de: 'Gesamt', es: 'Total' },
  'booking.specialRequests': { fr: 'Demandes spéciales', en: 'Special requests', de: 'Sonderwünsche', es: 'Solicitudes especiales' },

  // Properties
  'property.new': { fr: 'Nouvelle Propriété', en: 'New Property', de: 'Neue Immobilie', es: 'Nueva Propiedad' },
  'property.none': { fr: 'Aucune propriété', en: 'No properties', de: 'Keine Immobilien', es: 'Sin propiedades' },
  'property.createFirst': { fr: 'Configurez votre première propriété', en: 'Set up your first property', de: 'Richten Sie Ihre erste Immobilie ein', es: 'Configure su primera propiedad' },
  'property.delete': { fr: 'Supprimer la Propriété', en: 'Delete Property', de: 'Immobilie löschen', es: 'Eliminar Propiedad' },
  'property.deleteWarning': { fr: 'Cette action est irréversible. Toutes les données associées seront perdues.', en: 'This action is irreversible. All associated data will be lost.', de: 'Diese Aktion ist unwiderruflich. Alle zugehörigen Daten gehen verloren.', es: 'Esta acción es irreversible. Todos los datos asociados se perderán.' },

  // Guests
  'guest.new': { fr: 'Nouveau Client', en: 'New Guest', de: 'Neuer Gast', es: 'Nuevo Huésped' },
  'guest.none': { fr: 'Aucun client', en: 'No guests', de: 'Keine Gäste', es: 'Sin huéspedes' },
  'guest.name': { fr: 'Nom', en: 'Name', de: 'Name', es: 'Nombre' },
  'guest.email': { fr: 'Email', en: 'Email', de: 'E-Mail', es: 'Correo' },
  'guest.phone': { fr: 'Téléphone', en: 'Phone', de: 'Telefon', es: 'Teléfono' },
  'guest.nationality': { fr: 'Nationalité', en: 'Nationality', de: 'Nationalität', es: 'Nacionalidad' },
  'guest.language': { fr: 'Langue', en: 'Language', de: 'Sprache', es: 'Idioma' },
  'guest.status': { fr: 'Statut', en: 'Status', de: 'Status', es: 'Estado' },

  // Maintenance
  'maintenance.new': { fr: 'Nouvelle Tâche', en: 'New Task', de: 'Neue Aufgabe', es: 'Nueva Tarea' },
  'maintenance.title': { fr: 'Titre', en: 'Title', de: 'Titel', es: 'Título' },
  'maintenance.description': { fr: 'Description', en: 'Description', de: 'Beschreibung', es: 'Descripción' },
  'maintenance.priority': { fr: 'Priorité', en: 'Priority', de: 'Priorität', es: 'Prioridad' },
  'maintenance.category': { fr: 'Catégorie', en: 'Category', de: 'Kategorie', es: 'Categoría' },
  'maintenance.scheduledDate': { fr: 'Date prévue', en: 'Scheduled date', de: 'Geplantes Datum', es: 'Fecha prevista' },
  'maintenance.estimatedCost': { fr: 'Coût estimé', en: 'Estimated cost', de: 'Geschätzte Kosten', es: 'Costo estimado' },

  // Cleaning Gallery
  'cleaningGallery.title': { fr: 'Galerie Avant/Après Ménage', en: 'Before/After Cleaning Gallery', de: 'Vorher/Nachher Reinigungs-Galerie', es: 'Galería Antes/Después Limpieza' },
  'cleaningGallery.before': { fr: 'Avant', en: 'Before', de: 'Vorher', es: 'Antes' },
  'cleaningGallery.after': { fr: 'Après', en: 'After', de: 'Nachher', es: 'Después' },
  'cleaningGallery.addSession': { fr: 'Nouvelle Session', en: 'New Session', de: 'Neue Sitzung', es: 'Nueva Sesión' },
  'cleaningGallery.room': { fr: 'Pièce', en: 'Room', de: 'Zimmer', es: 'Habitación' },
  'cleaningGallery.notes': { fr: 'Notes', en: 'Notes', de: 'Notizen', es: 'Notas' },
  'cleaningGallery.completedBy': { fr: 'Réalisé par', en: 'Completed by', de: 'Durchgeführt von', es: 'Realizado por' },
  'cleaningGallery.validated': { fr: 'Validé', en: 'Validated', de: 'Validiert', es: 'Validado' },
  'cleaningGallery.pending': { fr: 'En attente', en: 'Pending', de: 'Ausstehend', es: 'Pendiente' },
  'cleaningGallery.validate': { fr: 'Valider', en: 'Validate', de: 'Validieren', es: 'Validar' },
  'cleaningGallery.timestamp': { fr: 'Horodatage', en: 'Timestamp', de: 'Zeitstempel', es: 'Marca de tiempo' },
  'cleaningGallery.rooms.bedroom': { fr: 'Chambre', en: 'Bedroom', de: 'Schlafzimmer', es: 'Dormitorio' },
  'cleaningGallery.rooms.bathroom': { fr: 'Salle de bain', en: 'Bathroom', de: 'Badezimmer', es: 'Baño' },
  'cleaningGallery.rooms.kitchen': { fr: 'Cuisine', en: 'Kitchen', de: 'Küche', es: 'Cocina' },
  'cleaningGallery.rooms.livingRoom': { fr: 'Salon', en: 'Living Room', de: 'Wohnzimmer', es: 'Salón' },
  'cleaningGallery.rooms.terrace': { fr: 'Terrasse', en: 'Terrace', de: 'Terrasse', es: 'Terraza' },
  'cleaningGallery.rooms.entrance': { fr: 'Entrée', en: 'Entrance', de: 'Eingang', es: 'Entrada' },

  // Share Links
  'shareLink.title': { fr: 'Liens de Partage Client', en: 'Guest Share Links', de: 'Gäste-Freigabelinks', es: 'Enlaces para Compartir' },
  'shareLink.generate': { fr: 'Générer un lien', en: 'Generate link', de: 'Link generieren', es: 'Generar enlace' },
  'shareLink.copy': { fr: 'Copier le lien', en: 'Copy link', de: 'Link kopieren', es: 'Copiar enlace' },
  'shareLink.copied': { fr: 'Lien copié !', en: 'Link copied!', de: 'Link kopiert!', es: '¡Enlace copiado!' },
  'shareLink.active': { fr: 'Actif', en: 'Active', de: 'Aktiv', es: 'Activo' },
  'shareLink.expired': { fr: 'Expiré', en: 'Expired', de: 'Abgelaufen', es: 'Caducado' },
  'shareLink.includes': { fr: 'Contenu inclus', en: 'Included content', de: 'Enthaltener Inhalt', es: 'Contenido incluido' },
  'shareLink.instructions': { fr: 'Instructions', en: 'Instructions', de: 'Anweisungen', es: 'Instrucciones' },
  'shareLink.qrCode': { fr: 'QR Code', en: 'QR Code', de: 'QR-Code', es: 'Código QR' },
  'shareLink.guide': { fr: 'Guide', en: 'Guide', de: 'Anleitung', es: 'Guía' },
  'shareLink.wifiInfo': { fr: 'Info WiFi', en: 'WiFi Info', de: 'WLAN-Info', es: 'Info WiFi' },
  'shareLink.houseRules': { fr: 'Règlement', en: 'House Rules', de: 'Hausordnung', es: 'Normas' },
  'shareLink.checkInDetails': { fr: 'Détails check-in', en: 'Check-in details', de: 'Check-in Details', es: 'Detalles check-in' },
  'shareLink.emergencyContacts': { fr: 'Contacts urgence', en: 'Emergency contacts', de: 'Notfallkontakte', es: 'Contactos emergencia' },

  // Forecasting
  'forecast.title': { fr: 'Prévisions de Revenus', en: 'Revenue Forecasting', de: 'Umsatzprognosen', es: 'Previsiones de Ingresos' },
  'forecast.3months': { fr: '3 mois', en: '3 months', de: '3 Monate', es: '3 meses' },
  'forecast.6months': { fr: '6 mois', en: '6 months', de: '6 Monate', es: '6 meses' },
  'forecast.12months': { fr: '12 mois', en: '12 months', de: '12 Monate', es: '12 meses' },
  'forecast.projected': { fr: 'Revenu projeté', en: 'Projected revenue', de: 'Prognostizierter Umsatz', es: 'Ingreso proyectado' },
  'forecast.actual': { fr: 'Revenu réel', en: 'Actual revenue', de: 'Tatsächlicher Umsatz', es: 'Ingreso real' },
  'forecast.occupancy': { fr: 'Taux occupation', en: 'Occupancy rate', de: 'Belegungsrate', es: 'Tasa ocupación' },
  'forecast.avgNightly': { fr: 'Prix moyen/nuit', en: 'Avg. nightly rate', de: 'Durchschn. Nachtpreis', es: 'Precio medio/noche' },
  'forecast.growth': { fr: 'Croissance', en: 'Growth', de: 'Wachstum', es: 'Crecimiento' },
  'forecast.scenario.optimistic': { fr: 'Optimiste', en: 'Optimistic', de: 'Optimistisch', es: 'Optimista' },
  'forecast.scenario.realistic': { fr: 'Réaliste', en: 'Realistic', de: 'Realistisch', es: 'Realista' },
  'forecast.scenario.pessimistic': { fr: 'Pessimiste', en: 'Pessimistic', de: 'Pessimistisch', es: 'Pesimista' },
  'forecast.confirmedBookings': { fr: 'Réservations confirmées', en: 'Confirmed bookings', de: 'Bestätigte Buchungen', es: 'Reservas confirmadas' },
  'forecast.estimatedRevenue': { fr: 'Revenus estimés', en: 'Estimated revenue', de: 'Geschätzte Einnahmen', es: 'Ingresos estimados' },
  'forecast.byProperty': { fr: 'Par propriété', en: 'By property', de: 'Nach Immobilie', es: 'Por propiedad' },
  'forecast.monthly': { fr: 'Mensuel', en: 'Monthly', de: 'Monatlich', es: 'Mensual' },

  // Common
  'common.property': { fr: 'Propriété', en: 'Property', de: 'Immobilie', es: 'Propiedad' },
  'common.loading': { fr: 'Chargement...', en: 'Loading...', de: 'Laden...', es: 'Cargando...' },
  'common.date': { fr: 'Date', en: 'Date', de: 'Datum', es: 'Fecha' },
  'common.status': { fr: 'Statut', en: 'Status', de: 'Status', es: 'Estado' },
  'common.active': { fr: 'Actif', en: 'Active', de: 'Aktiv', es: 'Activo' },
  'common.inactive': { fr: 'Inactif', en: 'Inactive', de: 'Inaktiv', es: 'Inactivo' },
  'common.blocked': { fr: 'Bloqué', en: 'Blocked', de: 'Gesperrt', es: 'Bloqueado' },
  'common.total': { fr: 'Total', en: 'Total', de: 'Gesamt', es: 'Total' },
  'common.period': { fr: 'Période', en: 'Period', de: 'Zeitraum', es: 'Período' },
  'common.thisMonth': { fr: 'Ce mois', en: 'This month', de: 'Diesen Monat', es: 'Este mes' },
  'common.thisQuarter': { fr: 'Ce trimestre', en: 'This quarter', de: 'Dieses Quartal', es: 'Este trimestre' },
  'common.thisYear': { fr: 'Cette année', en: 'This year', de: 'Dieses Jahr', es: 'Este año' },
  'common.noData': { fr: 'Aucune donnée', en: 'No data', de: 'Keine Daten', es: 'Sin datos' },
  'common.selectProperty': { fr: 'Sélectionner une propriété', en: 'Select a property', de: 'Immobilie auswählen', es: 'Seleccionar una propiedad' },

  // Home page
  'home.welcome': { fr: 'Bienvenue sur BNBGest', en: 'Welcome to BNBGest', de: 'Willkommen bei BNBGest', es: 'Bienvenido a BNBGest' },
  'home.subtitle': { fr: 'La solution complète pour gérer votre activité de location saisonnière.', en: 'The complete solution to manage your vacation rental business.', de: 'Die komplette Lösung für die Verwaltung Ihrer Ferienvermietung.', es: 'La solución completa para gestionar su negocio de alquiler vacacional.' },
  'home.dashboardWelcome': { fr: 'Bienvenue sur votre tableau de bord', en: 'Welcome to your dashboard', de: 'Willkommen in Ihrem Dashboard', es: 'Bienvenido a su panel de control' },
  'home.dashboardSubtitle': { fr: 'Votre application BNBGest est maintenant opérationnelle !', en: 'Your BNBGest application is now operational!', de: 'Ihre BNBGest-Anwendung ist jetzt einsatzbereit!', es: '¡Su aplicación BNBGest está ahora operativa!' },
  'home.clientManagement': { fr: 'Gestion clients', en: 'Guest Management', de: 'Gästeverwaltung', es: 'Gestión de huéspedes' },
  'home.clientDesc': { fr: 'Gérer vos clients et réservations', en: 'Manage your guests and bookings', de: 'Verwalten Sie Ihre Gäste und Buchungen', es: 'Gestione sus huéspedes y reservas' },
  'home.employeeManagement': { fr: 'Gestion employés', en: 'Staff Management', de: 'Personalverwaltung', es: 'Gestión de empleados' },
  'home.employeeDesc': { fr: 'Suivre les tâches et le personnel', en: 'Track tasks and staff', de: 'Aufgaben und Personal verfolgen', es: 'Seguimiento de tareas y personal' },
  'home.calendar': { fr: 'Calendrier', en: 'Calendar', de: 'Kalender', es: 'Calendario' },
  'home.calendarDesc': { fr: 'Planifier les maintenances', en: 'Schedule maintenance', de: 'Wartung planen', es: 'Programar mantenimiento' },
  'home.photos': { fr: 'Photos', en: 'Photos', de: 'Fotos', es: 'Fotos' },
  'home.photosDesc': { fr: 'Gérer les galeries photo', en: 'Manage photo galleries', de: 'Fotogalerien verwalten', es: 'Gestionar galerías de fotos' },
  'home.connect': { fr: 'Se connecter', en: 'Sign in', de: 'Anmelden', es: 'Conectarse' },
  'home.connectPrompt': { fr: 'Connectez-vous pour accéder à votre tableau de bord.', en: 'Sign in to access your dashboard.', de: 'Melden Sie sich an, um auf Ihr Dashboard zuzugreifen.', es: 'Inicie sesión para acceder a su panel.' },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bnbgest_lang');
      if (saved && ['fr', 'en', 'de', 'es'].includes(saved)) {
        setLangState(saved as Lang);
      }
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bnbgest_lang', newLang);
    }
  }, []);

  const t = useCallback((key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['fr'] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
