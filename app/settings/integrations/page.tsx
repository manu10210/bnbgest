'use client';

import IntegrationSettings from '@/components/IntegrationSettings';
import AdminSidebar from '@/components/AdminSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function IntegrationsPage() {
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">
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
          
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🔌 Intégrations API
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Connectez Airbnb et Booking.com pour synchroniser automatiquement vos réservations
          </p>
        </div>

        {/* Integration Settings Component */}
        <IntegrationSettings />

        {/* Info Box */}
        <div className={`mt-6 p-6 rounded-2xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
          <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>
            💡 Comment obtenir vos credentials ?
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                🏠 Airbnb (iCal)
              </h4>
              <ol className={`list-decimal list-inside space-y-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <li>Connectez-vous à votre compte Airbnb</li>
                <li>Allez dans votre annonce</li>
                <li>Cliquez sur "Calendrier"</li>
                <li>Cherchez "Exporter le calendrier"</li>
                <li>Copiez l&apos;URL du calendrier (.ics)</li>
              </ol>
            </div>

            <div>
              <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                🏨 Booking.com (API)
              </h4>
              <ol className={`list-decimal list-inside space-y-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <li>Connectez-vous à Booking.com Extranet</li>
                <li>Allez dans &quot;Connectivity&quot; ou &quot;API&quot;</li>
                <li>Demandez l&apos;accès à l&apos;API XML</li>
                <li>Récupérez votre Hotel ID, Username et Password</li>
                <li>La validation peut prendre quelques jours</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Features Box */}
        <div className={`mt-6 p-6 rounded-2xl ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
          <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-green-400' : 'text-green-900'}`}>
            ✨ Fonctionnalités de synchronisation
          </h3>
          
          <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Synchronisation automatique des réservations toutes les heures
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Blocage automatique des dates réservées sur les autres plateformes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Import des informations client (nom, dates, nombre de personnes)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Évite les doubles réservations entre plateformes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Notifications en cas d&apos;erreur de synchronisation
            </li>
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
}