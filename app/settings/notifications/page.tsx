'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import PushNotificationButton from '@/components/PushNotificationButton';
import { toast } from 'sonner';
import { loadClientSetting, saveClientSetting } from '@/lib/client-settings';
import { fetchServerSettings, saveServerSettings } from '@/lib/settings-api';
import {
  ArrowLeft,
  Bell,
  Mail,
  MessageSquare,
  Calendar,
  AlertCircle,
  Users,
  Home,
  Save
} from 'lucide-react';

interface NotificationSetting {
  id: string;
  category: string;
  icon: React.ElementType;
  settings: {
    id: string;
    name: string;
    description: string;
    email: boolean;
    sms: boolean;
    push: boolean;
  }[];
}

const DEFAULT_NOTIFICATIONS: NotificationSetting[] = [
  {
    id: 'bookings',
    category: 'Réservations',
    icon: Calendar,
    settings: [
      {
        id: 'new_booking',
        name: 'Nouvelle réservation',
        description: 'Recevoir une notification lors d\'une nouvelle réservation',
        email: true,
        sms: true,
        push: true
      },
      {
        id: 'booking_cancelled',
        name: 'Annulation de réservation',
        description: 'Être alerté en cas d\'annulation',
        email: true,
        sms: true,
        push: false
      },
      {
        id: 'booking_modified',
        name: 'Modification de réservation',
        description: 'Notification lorsqu\'une réservation est modifiée',
        email: true,
        sms: false,
        push: false
      },
      {
        id: 'checkin_reminder',
        name: 'Rappel check-in',
        description: 'Rappel 24h avant l\'arrivée d\'un client',
        email: true,
        sms: false,
        push: true
      },
      {
        id: 'checkout_reminder',
        name: 'Rappel check-out',
        description: 'Rappel le jour du départ',
        email: true,
        sms: false,
        push: true
      }
    ]
  },
  {
    id: 'guests',
    category: 'Clients',
    icon: Users,
    settings: [
      {
        id: 'new_message',
        name: 'Nouveau message client',
        description: 'Notification pour les messages des clients',
        email: true,
        sms: false,
        push: true
      },
      {
        id: 'review_received',
        name: 'Nouvel avis reçu',
        description: 'Être notifié des nouveaux avis clients',
        email: true,
        sms: false,
        push: true
      },
      {
        id: 'payment_received',
        name: 'Paiement reçu',
        description: 'Confirmation de réception de paiement',
        email: true,
        sms: true,
        push: false
      }
    ]
  },
  {
    id: 'property',
    category: 'Propriété',
    icon: Home,
    settings: [
      {
        id: 'cleaning_scheduled',
        name: 'Nettoyage programmé',
        description: 'Rappel de nettoyage prévu',
        email: true,
        sms: false,
        push: true
      },
      {
        id: 'cleaning_completed',
        name: 'Nettoyage terminé',
        description: 'Confirmation de fin de nettoyage',
        email: false,
        sms: false,
        push: true
      },
      {
        id: 'maintenance_due',
        name: 'Maintenance à effectuer',
        description: 'Alerte pour les tâches de maintenance',
        email: true,
        sms: false,
        push: true
      },
      {
        id: 'inventory_low',
        name: 'Stock faible',
        description: 'Alerte quand un article est en rupture',
        email: true,
        sms: false,
        push: false
      }
    ]
  },
  {
    id: 'system',
    category: 'Système',
    icon: AlertCircle,
    settings: [
      {
        id: 'system_updates',
        name: 'Mises à jour système',
        description: 'Notifications des nouvelles fonctionnalités',
        email: true,
        sms: false,
        push: false
      },
      {
        id: 'system_alerts',
        name: 'Alertes système',
        description: 'Alertes de sécurité et problèmes techniques',
        email: true,
        sms: true,
        push: true
      },
      {
        id: 'backup_completed',
        name: 'Sauvegardes',
        description: 'Confirmation des sauvegardes automatiques',
        email: true,
        sms: false,
        push: false
      }
    ]
  }
];

export default function NotificationsSettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationSetting[]>(DEFAULT_NOTIFICATIONS);

  const [emailAddress, setEmailAddress] = useState('admin@bnbgest.com');
  const [smsNumber, setSmsNumber] = useState('+33 6 12 34 56 78');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const localLoaded = loadClientSetting('notifications', {
      notifications: DEFAULT_NOTIFICATIONS,
      emailAddress: 'admin@bnbgest.com',
      smsNumber: '+33 6 12 34 56 78',
    });

    setNotifications(localLoaded.notifications);
    setEmailAddress(localLoaded.emailAddress);
    setSmsNumber(localLoaded.smsNumber);

    const loadFromServer = async () => {
      const server = await fetchServerSettings();
      const serverNotif = server?.notifications;
      if (!serverNotif) return;

      if (Array.isArray(serverNotif.matrix)) {
        setNotifications(serverNotif.matrix as NotificationSetting[]);
      } else {
        setNotifications((prev) => prev.map((cat) => ({
          ...cat,
          settings: cat.settings.map((setting) => ({
            ...setting,
            email: Boolean(serverNotif.emailNotifications),
            sms: Boolean(serverNotif.smsNotifications),
            push: Boolean(serverNotif.pushNotifications),
          })),
        })));
      }

      const contacts = serverNotif.contacts as { emailAddress?: string; smsNumber?: string } | null;
      if (contacts?.emailAddress) {
        setEmailAddress(contacts.emailAddress);
      }
      if (contacts?.smsNumber) {
        setSmsNumber(contacts.smsNumber);
      }
    };

    loadFromServer();
  }, []);

  const handleToggle = (categoryId: string, settingId: string, channel: 'email' | 'sms' | 'push') => {
    setNotifications(notifications.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          settings: cat.settings.map(setting => {
            if (setting.id === settingId) {
              return {
                ...setting,
                [channel]: !setting[channel]
              };
            }
            return setting;
          })
        };
      }
      return cat;
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    const firstSetting = notifications[0]?.settings?.[0];
    const response = await saveServerSettings({
      notifications: {
        emailNotifications: firstSetting?.email ?? true,
        smsNotifications: firstSetting?.sms ?? false,
        pushNotifications: firstSetting?.push ?? true,
        matrix: notifications,
        contacts: {
          emailAddress,
          smsNumber,
        },
      },
    });

    if (!response.ok) {
      setSaving(false);
      toast.error(response.error || 'Impossible de sauvegarder les notifications');
      return;
    }

    setSaving(false);
    saveClientSetting('notifications', {
      notifications,
      emailAddress,
      smsNumber,
    });
    toast.success('Préférences de notifications sauvegardées');
  };

  const getTotalEnabled = () => {
    let total = 0;
    notifications.forEach(cat => {
      cat.settings.forEach(setting => {
        if (setting.email || setting.sms || setting.push) total++;
      });
    });
    return total;
  };

  const getTotalByChannel = (channel: 'email' | 'sms' | 'push') => {
    let total = 0;
    notifications.forEach(cat => {
      cat.settings.forEach(setting => {
        if (setting[channel]) total++;
      });
    });
    return total;
  };

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-2 mb-4 px-4 py-2 rounded-lg ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 text-white' 
                : 'bg-white hover:bg-gray-50 text-gray-900'
            } transition-colors`}
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <Bell size={40} className="text-white" />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Notifications
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configurez vos alertes email, SMS et push
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-colors disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-blue-500`}>
            <div className="flex items-center justify-between mb-3">
              <Bell size={24} className="text-blue-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {getTotalEnabled()}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Notifications actives
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-green-500`}>
            <div className="flex items-center justify-between mb-3">
              <Mail size={24} className="text-green-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {getTotalByChannel('email')}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Alertes email
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-orange-500`}>
            <div className="flex items-center justify-between mb-3">
              <MessageSquare size={24} className="text-orange-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {getTotalByChannel('sms')}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Alertes SMS
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-purple-500`}>
            <div className="flex items-center justify-between mb-3">
              <Bell size={24} className="text-purple-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {getTotalByChannel('push')}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Notifications push
            </p>
          </div>
        </div>

        {/* Push Notifications PWA */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Notifications push (PWA)
          </h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Recevez des alertes instantanées même quand l&apos;application est fermée.
          </p>
          <PushNotificationButton />
        </div>

        {/* Contact Info */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Coordonnées de contact
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Adresse email
              </label>
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-blue-500" />
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className={`flex-1 px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Numéro de téléphone
              </label>
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-orange-500" />
                <input
                  type="tel"
                  value={smsNumber}
                  onChange={(e) => setSmsNumber(e.target.value)}
                  className={`flex-1 px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Categories */}
        {notifications.map((category) => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className={`mb-6 p-6 rounded-2xl ${
                isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <Icon size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {category.category}
                </h2>
              </div>

              <div className="space-y-4">
                {category.settings.map((setting) => (
                  <div
                    key={setting.id}
                    className={`p-4 rounded-xl ${
                      isDark ? 'bg-white/5' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {setting.name}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {setting.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 ml-6">
                        {/* Email Toggle */}
                        <button
                          onClick={() => handleToggle(category.id, setting.id, 'email')}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className={`p-2 rounded-lg ${
                            setting.email 
                              ? 'bg-green-500 text-white' 
                              : isDark ? 'bg-white/10 text-gray-500' : 'bg-gray-200 text-gray-400'
                          } transition-colors`}>
                            <Mail size={20} />
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Email
                          </span>
                        </button>

                        {/* SMS Toggle */}
                        <button
                          onClick={() => handleToggle(category.id, setting.id, 'sms')}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className={`p-2 rounded-lg ${
                            setting.sms 
                              ? 'bg-orange-500 text-white' 
                              : isDark ? 'bg-white/10 text-gray-500' : 'bg-gray-200 text-gray-400'
                          } transition-colors`}>
                            <MessageSquare size={20} />
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            SMS
                          </span>
                        </button>

                        {/* Push Toggle */}
                        <button
                          onClick={() => handleToggle(category.id, setting.id, 'push')}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className={`p-2 rounded-lg ${
                            setting.push 
                              ? 'bg-purple-500 text-white' 
                              : isDark ? 'bg-white/10 text-gray-500' : 'bg-gray-200 text-gray-400'
                          } transition-colors`}>
                            <Bell size={20} />
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Push
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Info Box */}
        <div className={`p-6 rounded-2xl ${
          isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Bell size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>
                🔔 Gestion intelligente des notifications
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Les notifications sont envoyées selon vos préférences. Les alertes critiques (annulations, problèmes système)
                sont toujours envoyées par email. Les notifications push nécessitent l&apos;installation de l&apos;application
                mobile. Les SMS peuvent engendrer des frais selon votre opérateur.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}