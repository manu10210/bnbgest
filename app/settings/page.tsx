'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, 
  Plug, 
  Bell, 
  User, 
  Shield, 
  Globe, 
  Database,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

interface SettingCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  available: boolean;
}

export default function SettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();

  const settingsCards: SettingCard[] = [
    {
      id: 'integrations',
      title: 'Intégrations API',
      description: 'Connectez Airbnb et Booking.com pour synchroniser vos réservations',
      icon: Plug,
      path: '/settings/integrations',
      color: 'from-purple-500 to-pink-500',
      available: true
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configurez les alertes email et SMS pour les réservations',
      icon: Bell,
      path: '/settings/notifications',
      color: 'from-blue-500 to-cyan-500',
      available: false
    },
    {
      id: 'profile',
      title: 'Profil & Compte',
      description: 'Gérez vos informations personnelles et préférences',
      icon: User,
      path: '/settings/profile',
      color: 'from-green-500 to-emerald-500',
      available: false
    },
    {
      id: 'security',
      title: 'Sécurité & Accès',
      description: 'Mots de passe, authentification et gestion des accès',
      icon: Shield,
      path: '/settings/security',
      color: 'from-red-500 to-orange-500',
      available: false
    },
    {
      id: 'language',
      title: 'Langue & Région',
      description: 'Définissez la langue, fuseau horaire et devise',
      icon: Globe,
      path: '/settings/language',
      color: 'from-indigo-500 to-purple-500',
      available: false
    },
    {
      id: 'database',
      title: 'Base de données',
      description: 'Sauvegarde, restauration et export des données',
      icon: Database,
      path: '/settings/database',
      color: 'from-yellow-500 to-orange-500',
      available: false
    }
  ];

  const handleCardClick = (card: SettingCard) => {
    if (card.available) {
      router.push(card.path);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
          
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' : 'bg-gradient-to-br from-purple-100 to-pink-100'}`}>
              <SettingsIcon size={40} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Paramètres
              </h1>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Gérez vos préférences et la configuration de l&apos;application
              </p>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`
                  relative overflow-hidden rounded-2xl p-6 transition-all duration-300
                  ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:shadow-xl'}
                  ${card.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                  group
                `}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                {/* Badge "Bientôt disponible" */}
                {!card.available && (
                  <div className="absolute top-4 right-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                      Bientôt
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`relative mb-4 w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon size={28} className="text-white" />
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {card.title}
                  </h3>
                  <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {card.description}
                  </p>

                  {/* Arrow */}
                  {card.available && (
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className={`bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                        Configurer
                      </span>
                      <ChevronRight 
                        size={16} 
                        className={`transform group-hover:translate-x-1 transition-transform bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className={`mt-8 p-6 rounded-2xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <SettingsIcon size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>
                💡 Configuration personnalisée
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Personnalisez BNBGest selon vos besoins. Les paramètres sont sauvegardés automatiquement 
                et synchronisés sur tous vos appareils. Les nouvelles fonctionnalités seront ajoutées 
                progressivement.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Intégrations actives</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Airbnb & Booking</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">5</span>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Fonctionnalités</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>En développement</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">∞</span>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Version</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>v1.0.0 Beta</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
