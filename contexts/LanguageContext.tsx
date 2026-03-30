'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type Lang = 'fr' | 'en' | 'de' | 'es';

export const LANGUAGES: { code: Lang; name: string; flag: string }[] = [
  { code: 'fr', name: 'Francais', flag: 'FR' },
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'es', name: 'Espanol', flag: 'ES' },
];

// ─── Dictionnaire de traductions ───
const translations: Record<string, Record<Lang, string>> = {
  // Navigation & Layout
  'nav.home': { fr: 'Accueil', en: 'Home', de: 'Startseite', es: 'Inicio' },
  'nav.admin': { fr: 'Administration', en: 'Administration', de: 'Verwaltung', es: 'Administracion' },
  'nav.login': { fr: 'Connexion', en: 'Login', de: 'Anmelden', es: 'Iniciar sesion' },
  'nav.logout': { fr: 'Deconnexion', en: 'Logout', de: 'Abmelden', es: 'Cerrar sesion' },
  'nav.allProperties': { fr: 'Toutes les proprietes', en: 'All properties', de: 'Alle Immobilien', es: 'Todas las propiedades' },

  // Tabs
  'tab.bookings': { fr: 'Reservations', en: 'Bookings', de: 'Buchungen', es: 'Reservas' },
  'tab.properties': { fr: 'Proprietes', en: 'Properties', de: 'Immobilien', es: 'Propiedades' },
  'tab.guests': { fr: 'Clients', en: 'Guests', de: 'Gaste', es: 'Huespedes' },
  'tab.maintenance': { fr: 'Maintenance', en: 'Maintenance', de: 'Wartung', es: 'Mantenimiento' },
  'tab.cleaning': { fr: 'Menage', en: 'Cleaning', de: 'Reinigung', es: 'Limpieza' },
  'tab.inventory': { fr: 'Inventaire', en: 'Inventory', de: 'Inventar', es: 'Inventario' },
  'tab.financial': { fr: 'Finances', en: 'Finances', de: 'Finanzen', es: 'Finanzas' },
  'tab.qrcheckin': { fr: 'QR Check-in', en: 'QR Check-in', de: 'QR Check-in', es: 'QR Check-in' },
  'tab.contract': { fr: 'Contrats', en: 'Contracts', de: 'Vertrage', es: 'Contratos' },
  'tab.reviews': { fr: 'Avis', en: 'Reviews', de: 'Bewertungen', es: 'Opiniones' },
  'tab.welcome': { fr: 'Accueil', en: 'Welcome', de: 'Willkommen', es: 'Bienvenida' },
  'tab.pricing': { fr: 'Tarifs', en: 'Pricing', de: 'Preise', es: 'Tarifas' },
  'tab.notifications': { fr: 'Notifications', en: 'Notifications', de: 'Benachrichtigungen', es: 'Notificaciones' },
  'tab.settings': { fr: 'Parametres', en: 'Settings', de: 'Einstellungen', es: 'Configuracion' },
  'tab.cleaningGallery': { fr: 'Galerie Menage', en: 'Cleaning Gallery', de: 'Reinigungs-Galerie', es: 'Galeria Limpieza' },
  'tab.shareLinks': { fr: 'Liens Partage', en: 'Share Links', de: 'Teilen-Links', es: 'Enlaces Compartir' },
  'tab.forecasting': { fr: 'Previsions', en: 'Forecasting', de: 'Prognosen', es: 'Previsiones' },
  'tab.videoguides': { fr: 'Videos Equipements', en: 'Equipment Videos', de: 'Geratevideos', es: 'Videos Equipos' },

  // Stats
  'stats.properties': { fr: 'Proprietes', en: 'Properties', de: 'Immobilien', es: 'Propiedades' },
  'stats.bookings': { fr: 'Reservations', en: 'Bookings', de: 'Buchungen', es: 'Reservas' },
  'stats.revenue': { fr: 'Revenus', en: 'Revenue', de: 'Einnahmen', es: 'Ingresos' },
  'stats.avgRating': { fr: 'Note moyenne', en: 'Avg. rating', de: 'Durchschn. Bewertung', es: 'Nota media' },

  // Common actions
  'action.add': { fr: 'Ajouter', en: 'Add', de: 'Hinzufugen', es: 'Anadir' },
  'action.edit': { fr: 'Modifier', en: 'Edit', de: 'Bearbeiten', es: 'Editar' },
  'action.delete': { fr: 'Supprimer', en: 'Delete', de: 'Loschen', es: 'Eliminar' },
  'action.save': { fr: 'Sauvegarder', en: 'Save', de: 'Speichern', es: 'Guardar' },
  'action.cancel': { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen', es: 'Cancelar' },
  'action.close': { fr: 'Fermer', en: 'Close', de: 'Schliessen', es: 'Cerrar' },
  'action.export': { fr: 'Exporter', en: 'Export', de: 'Exportieren', es: 'Exportar' },
  'action.send': { fr: 'Envoyer', en: 'Send', de: 'Senden', es: 'Enviar' },
  'action.confirm': { fr: 'Confirmer', en: 'Confirm', de: 'Bestatigen', es: 'Confirmar' },
  'action.search': { fr: 'Rechercher', en: 'Search', de: 'Suchen', es: 'Buscar' },
  'action.filter': { fr: 'Filtrer', en: 'Filter', de: 'Filtern', es: 'Filtrar' },
  'action.copy': { fr: 'Copier', en: 'Copy', de: 'Kopieren', es: 'Kopieren' },
  'action.download': { fr: 'Telecharger', en: 'Download', de: 'Herunterladen', es: 'Descargar' },
  'action.generate': { fr: 'Generer', en: 'Generate', de: 'Generieren', es: 'Generar' },
  'action.create': { fr: 'Creer', en: 'Create', de: 'Erstellen', es: 'Crear' },
  'action.upload': { fr: 'Telecharger', en: 'Upload', de: 'Hochladen', es: 'Subir' },

  // Bookings
  'booking.new': { fr: 'Nouvelle Reservation', en: 'New Booking', de: 'Neue Buchung', es: 'Nueva Reserva' },
  'booking.none': { fr: 'Aucune reservation', en: 'No bookings', de: 'Keine Buchungen', es: 'Sin reservas' },
  'booking.createFirst': { fr: 'Creez votre premiere reservation', en: 'Create your first booking', de: 'Erstellen Sie Ihre erste Buchung', es: 'Crea tu primera reserva' },
  'booking.confirmed': { fr: 'Confirme', en: 'Confirmed', de: 'Bestatigt', es: 'Confirmada' },
  'booking.pending': { fr: 'En attente', en: 'Pending', de: 'Ausstehend', es: 'Pendiente' },
  'booking.cancelled': { fr: 'Annule', en: 'Cancelled', de: 'Storniert', es: 'Cancelada' },
  'booking.completed': { fr: 'Termine', en: 'Completed', de: 'Abgeschlossen', es: 'Completada' },
  'booking.guest': { fr: 'Client', en: 'Guest', de: 'Gast', es: 'Huesped' },
  'booking.checkIn': { fr: 'Arrivee', en: 'Check-in', de: 'Anreise', es: 'Llegada' },
  'booking.checkOut': { fr: 'Depart', en: 'Check-out', de: 'Abreise', es: 'Salida' },
  'booking.guests': { fr: 'Voyageurs', en: 'Guests', de: 'Gaste', es: 'Huespedes' },
  'booking.total': { fr: 'Total', en: 'Total', de: 'Gesamt', es: 'Total' },
  'booking.specialRequests': { fr: 'Demandes speciales', en: 'Special requests', de: 'Sonderwunsche', es: 'Solicitudes especiales' },

  // Properties
  'property.new': { fr: 'Nouvelle Propriete', en: 'New Property', de: 'Neue Immobilie', es: 'Nueva Propiedad' },
  'property.none': { fr: 'Aucune propriete', en: 'No properties', de: 'Keine Immobilien', es: 'Sin propiedades' },
  'property.createFirst': { fr: 'Configurez votre premiere propriete', en: 'Set up your first property', de: 'Richten Sie Ihre erste Immobilie ein', es: 'Configure su primera propiedad' },
  'property.delete': { fr: 'Supprimer la Propriete', en: 'Delete Property', de: 'Immobilie loschen', es: 'Eliminar Propiedad' },
  'property.deleteWarning': { fr: 'Cette action est irreversible. Toutes les donnees associees seront perdues.', en: 'This action is irreversible. All associated data will be lost.', de: 'Diese Aktion ist unwiderruflich. Alle zugehorigen Daten gehen verloren.', es: 'Esta accion es irreversible. Todos los datos asociados se perderan.' },

  // Guests
  'guest.new': { fr: 'Nouveau Client', en: 'New Guest', de: 'Neuer Gast', es: 'Nuevo Huesped' },
  'guest.none': { fr: 'Aucun client', en: 'No guests', de: 'Keine Gaste', es: 'Sin huespedes' },
  'guest.name': { fr: 'Nom', en: 'Name', de: 'Name', es: 'Nombre' },
  'guest.email': { fr: 'Email', en: 'Email', de: 'E-Mail', es: 'Correo' },
  'guest.phone': { fr: 'Telephone', en: 'Phone', de: 'Telefon', es: 'Telefono' },
  'guest.nationality': { fr: 'Nationalite', en: 'Nationality', de: 'Nationalitat', es: 'Nacionalidad' },
  'guest.language': { fr: 'Langue', en: 'Language', de: 'Sprache', es: 'Idioma' },
  'guest.status': { fr: 'Statut', en: 'Status', de: 'Status', es: 'Estado' },

  // Maintenance
  'maintenance.new': { fr: 'Nouvelle Tache', en: 'New Task', de: 'Neue Aufgabe', es: 'Nueva Tarea' },
  'maintenance.title': { fr: 'Titre', en: 'Title', de: 'Titel', es: 'Titulo' },
  'maintenance.description': { fr: 'Description', en: 'Description', de: 'Beschreibung', es: 'Descripcion' },
  'maintenance.priority': { fr: 'Priorite', en: 'Priority', de: 'Prioritat', es: 'Prioridad' },
  'maintenance.category': { fr: 'Categorie', en: 'Category', de: 'Kategorie', es: 'Categoria' },
  'maintenance.scheduledDate': { fr: 'Date prevue', en: 'Scheduled date', de: 'Geplantes Datum', es: 'Fecha prevista' },
  'maintenance.estimatedCost': { fr: 'Cout estime', en: 'Estimated cost', de: 'Geschatzte Kosten', es: 'Costo estimado' },

  // Cleaning Gallery
  'cleaningGallery.title': { fr: 'Galerie Avant/Apres Menage', en: 'Before/After Cleaning Gallery', de: 'Vorher/Nachher Reinigungs-Galerie', es: 'Galeria Antes/Despues Limpieza' },
  'cleaningGallery.before': { fr: 'Avant', en: 'Before', de: 'Vorher', es: 'Antes' },
  'cleaningGallery.after': { fr: 'Apres', en: 'After', de: 'Nachher', es: 'Despues' },
  'cleaningGallery.addSession': { fr: 'Nouvelle Session', en: 'New Session', de: 'Neue Sitzung', es: 'Nueva Sesion' },
  'cleaningGallery.room': { fr: 'Piece', en: 'Room', de: 'Zimmer', es: 'Habitacion' },
  'cleaningGallery.notes': { fr: 'Notes', en: 'Notes', de: 'Notizen', es: 'Notas' },
  'cleaningGallery.completedBy': { fr: 'Realise par', en: 'Completed by', de: 'Durchgefuhrt von', es: 'Realizado por' },
  'cleaningGallery.validated': { fr: 'Valide', en: 'Validated', de: 'Validiert', es: 'Validado' },
  'cleaningGallery.pending': { fr: 'En attente', en: 'Pending', de: 'Ausstehend', es: 'Pendiente' },
  'cleaningGallery.validate': { fr: 'Valider', en: 'Validate', de: 'Validieren', es: 'Validar' },
  'cleaningGallery.timestamp': { fr: 'Horodatage', en: 'Timestamp', de: 'Zeitstempel', es: 'Marca de tiempo' },
  'cleaningGallery.rooms.bedroom': { fr: 'Chambre', en: 'Bedroom', de: 'Schlafzimmer', es: 'Dormitorio' },
  'cleaningGallery.rooms.bathroom': { fr: 'Salle de bain', en: 'Bathroom', de: 'Badezimmer', es: 'Bano' },
  'cleaningGallery.rooms.kitchen': { fr: 'Cuisine', en: 'Kitchen', de: 'Kuche', es: 'Cocina' },
  'cleaningGallery.rooms.livingRoom': { fr: 'Salon', en: 'Living Room', de: 'Wohnzimmer', es: 'Salon' },
  'cleaningGallery.rooms.terrace': { fr: 'Terrasse', en: 'Terrace', de: 'Terrasse', es: 'Terraza' },
  'cleaningGallery.rooms.entrance': { fr: 'Entree', en: 'Entrance', de: 'Eingang', es: 'Entrada' },

  // Share Links
  'shareLink.title': { fr: 'Liens de Partage Client', en: 'Guest Share Links', de: 'Gaste-Freigabelinks', es: 'Enlaces para Compartir' },
  'shareLink.generate': { fr: 'Generer un lien', en: 'Generate link', de: 'Link generieren', es: 'Generar enlace' },
  'shareLink.copy': { fr: 'Copier le lien', en: 'Copy link', de: 'Link kopieren', es: 'Copiar enlace' },
  'shareLink.copied': { fr: 'Lien copie !', en: 'Link copied!', de: 'Link kopiert!', es: 'Enlace copiado!' },
  'shareLink.active': { fr: 'Actif', en: 'Active', de: 'Aktiv', es: 'Activo' },
  'shareLink.expired': { fr: 'Expire', en: 'Expired', de: 'Abgelaufen', es: 'Caducado' },
  'shareLink.includes': { fr: 'Contenu inclus', en: 'Included content', de: 'Enthaltener Inhalt', es: 'Contenido incluido' },
  'shareLink.instructions': { fr: 'Instructions', en: 'Instructions', de: 'Anweisungen', es: 'Instrucciones' },
  'shareLink.qrCode': { fr: 'QR Code', en: 'QR Code', de: 'QR-Code', es: 'Codigo QR' },
  'shareLink.guide': { fr: 'Guide', en: 'Guide', de: 'Anleitung', es: 'Guia' },
  'shareLink.wifiInfo': { fr: 'Info WiFi', en: 'WiFi Info', de: 'WLAN-Info', es: 'Info WiFi' },
  'shareLink.houseRules': { fr: 'Reglement', en: 'House Rules', de: 'Hausordnung', es: 'Normas' },
  'shareLink.checkInDetails': { fr: 'Details check-in', en: 'Check-in details', de: 'Check-in Details', es: 'Detalles check-in' },
  'shareLink.emergencyContacts': { fr: 'Contacts urgence', en: 'Emergency contacts', de: 'Notfallkontakte', es: 'Contactos emergencia' },

  // Forecasting
  'forecast.title': { fr: 'Previsions de Revenus', en: 'Revenue Forecasting', de: 'Umsatzprognosen', es: 'Previsiones de Ingresos' },
  'forecast.3months': { fr: '3 mois', en: '3 months', de: '3 Monate', es: '3 meses' },
  'forecast.6months': { fr: '6 mois', en: '6 months', de: '6 Monate', es: '6 meses' },
  'forecast.12months': { fr: '12 mois', en: '12 months', de: '12 Monate', es: '12 meses' },
  'forecast.projected': { fr: 'Revenu projete', en: 'Projected revenue', de: 'Prognostizierter Umsatz', es: 'Ingreso proyectado' },
  'forecast.actual': { fr: 'Revenu reel', en: 'Actual revenue', de: 'Tatsachlicher Umsatz', es: 'Ingreso real' },
  'forecast.occupancy': { fr: 'Taux occupation', en: 'Occupancy rate', de: 'Belegungsrate', es: 'Tasa ocupacion' },
  'forecast.avgNightly': { fr: 'Prix moyen/nuit', en: 'Avg. nightly rate', de: 'Durchschn. Nachtpreis', es: 'Precio medio/noche' },
  'forecast.growth': { fr: 'Croissance', en: 'Growth', de: 'Wachstum', es: 'Crecimiento' },
  'forecast.scenario.optimistic': { fr: 'Optimiste', en: 'Optimistic', de: 'Optimistisch', es: 'Optimista' },
  'forecast.scenario.realistic': { fr: 'Realiste', en: 'Realistic', de: 'Realistisch', es: 'Realista' },
  'forecast.scenario.pessimistic': { fr: 'Pessimiste', en: 'Pessimistic', de: 'Pessimistisch', es: 'Pesimista' },
  'forecast.confirmedBookings': { fr: 'Reservations confirmees', en: 'Confirmed bookings', de: 'Bestatigte Buchungen', es: 'Reservas confirmadas' },
  'forecast.estimatedRevenue': { fr: 'Revenus estimes', en: 'Estimated revenue', de: 'Geschatzte Einnahmen', es: 'Ingresos estimados' },
  'forecast.byProperty': { fr: 'Par propriete', en: 'By property', de: 'Nach Immobilie', es: 'Por propiedad' },
  'forecast.monthly': { fr: 'Mensuel', en: 'Monthly', de: 'Monatlich', es: 'Mensual' },

  // Common
  'common.property': { fr: 'Propriete', en: 'Property', de: 'Immobilie', es: 'Propiedad' },
  'common.loading': { fr: 'Chargement...', en: 'Loading...', de: 'Laden...', es: 'Cargando...' },
  'common.date': { fr: 'Date', en: 'Date', de: 'Datum', es: 'Fecha' },
  'common.status': { fr: 'Statut', en: 'Status', de: 'Status', es: 'Estado' },
  'common.active': { fr: 'Actif', en: 'Active', de: 'Aktiv', es: 'Activo' },
  'common.inactive': { fr: 'Inactif', en: 'Inactive', de: 'Inaktiv', es: 'Inactivo' },
  'common.blocked': { fr: 'Bloque', en: 'Blocked', de: 'Gesperrt', es: 'Bloqueado' },
  'common.total': { fr: 'Total', en: 'Total', de: 'Gesamt', es: 'Total' },
  'common.period': { fr: 'Periode', en: 'Period', de: 'Zeitraum', es: 'Periodo' },
  'common.thisMonth': { fr: 'Ce mois', en: 'This month', de: 'Diesen Monat', es: 'Este mes' },
  'common.thisQuarter': { fr: 'Ce trimestre', en: 'This quarter', de: 'Dieses Quartal', es: 'Este trimestre' },
  'common.thisYear': { fr: 'Cette annee', en: 'This year', de: 'Dieses Jahr', es: 'Este ano' },
  'common.noData': { fr: 'Aucune donnee', en: 'No data', de: 'Keine Daten', es: 'Sin datos' },
  'common.selectProperty': { fr: 'Selectionner une propriete', en: 'Select a property', de: 'Immobilie auswahlen', es: 'Seleccionar una propiedad' },

  // Home page
  'home.welcome': { fr: 'Bienvenue sur BNBGest', en: 'Welcome to BNBGest', de: 'Willkommen bei BNBGest', es: 'Bienvenido a BNBGest' },
  'home.subtitle': { fr: 'La solution complete pour gerer votre activite de location saisonniere.', en: 'The complete solution to manage your vacation rental business.', de: 'Die komplette Losung fur die Verwaltung Ihrer Ferienvermietung.', es: 'La solucion completa para gestionar su negocio de alquiler vacacional.' },
  'home.dashboardWelcome': { fr: 'Bienvenue sur votre tableau de bord', en: 'Welcome to your dashboard', de: 'Willkommen in Ihrem Dashboard', es: 'Bienvenido a su panel de control' },
  'home.dashboardSubtitle': { fr: 'Votre application BNBGest est maintenant operationnelle !', en: 'Your BNBGest application is now operational!', de: 'Ihre BNBGest-Anwendung ist jetzt einsatzbereit!', es: 'Su aplicacion BNBGest esta ahora operativa!' },
  'home.clientManagement': { fr: 'Gestion clients', en: 'Guest Management', de: 'Gasteverwaltung', es: 'Gestion de huespedes' },
  'home.clientDesc': { fr: 'Gerer vos clients et reservations', en: 'Manage your guests and bookings', de: 'Verwalten Sie Ihre Gaste und Buchungen', es: 'Gestione sus huespedes y reservas' },
  'home.employeeManagement': { fr: 'Gestion employes', en: 'Staff Management', de: 'Personalverwaltung', es: 'Gestion de empleados' },
  'home.employeeDesc': { fr: 'Suivre les taches et le personnel', en: 'Track tasks and staff', de: 'Aufgaben und Personal verfolgen', es: 'Seguimiento de tareas y personal' },
  'home.calendar': { fr: 'Calendrier', en: 'Calendar', de: 'Kalender', es: 'Calendario' },
  'home.calendarDesc': { fr: 'Planifier les maintenances', en: 'Schedule maintenance', de: 'Wartung planen', es: 'Programar mantenimiento' },
  'home.photos': { fr: 'Photos', en: 'Photos', de: 'Fotos', es: 'Fotos' },
  'home.photosDesc': { fr: 'Gerer les galeries photo', en: 'Manage photo galleries', de: 'Fotogalerien verwalten', es: 'Gestionar galerias de fotos' },
  'home.connect': { fr: 'Se connecter', en: 'Sign in', de: 'Anmelden', es: 'Conectarse' },
  'home.connectPrompt': { fr: 'Connectez-vous pour acceder a votre tableau de bord.', en: 'Sign in to access your dashboard.', de: 'Melden Sie sich an, um auf Ihr Dashboard zuzugreifen.', es: 'Inicie sesion para acceder a su panel.' },
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
