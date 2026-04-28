'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { 
  Settings as SettingsIcon, 
  Plug, 
  Bell, 
  User, 
  Shield, 
  Globe, 
  Database,
  ArrowLeft,
  ChevronRight,
  Activity,
  Zap,
  Cloud,
  Server,
  GitBranch,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Wifi,
  WifiOff,
  LineChart
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

interface VercelEnvInfo {
  region?: string;
  env: string;
  url: string;
  deploymentId?: string;
  gitBranch?: string;
  gitCommitSha?: string;
}

interface SystemMetrics {
  uptime: number;
  services: {
    api: boolean;
    auth: boolean;
    database: boolean;
    storage: boolean;
    edge: boolean;
  };
  performance: {
    avgResponseTime: number;
    requestCount: number;
    errorRate: number;
  };
}

export default function SettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [vercelInfo, setVercelInfo] = useState<VercelEnvInfo | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

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
      id: 'vercel',
      title: 'Vercel & Edge',
      description: 'Configuration Vercel, Edge Functions et monitoring',
      icon: Zap,
      path: '/settings/vercel',
      color: 'from-black to-gray-700',
      available: true
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configurez les alertes email et SMS pour les réservations',
      icon: Bell,
      path: '/settings/notifications',
      color: 'from-blue-500 to-cyan-500',
      available: true
    },
    {
      id: 'profile',
      title: 'Profil & Compte',
      description: 'Gérez vos informations personnelles et préférences',
      icon: User,
      path: '/settings/profile',
      color: 'from-green-500 to-emerald-500',
      available: true
    },
    {
      id: 'security',
      title: 'Sécurité & Accès',
      description: 'Mots de passe, authentification et gestion des accès',
      icon: Shield,
      path: '/settings/security',
      color: 'from-red-500 to-orange-500',
      available: true
    },
    {
      id: 'language',
      title: 'Langue & Région',
      description: 'Définissez la langue, fuseau horaire et devise',
      icon: Globe,
      path: '/settings/language',
      color: 'from-indigo-500 to-purple-500',
      available: true
    },
    {
      id: 'database',
      title: 'Base de données',
      description: 'Sauvegarde, restauration et export des données',
      icon: Database,
      path: '/settings/database',
      color: 'from-yellow-500 to-orange-500',
      available: true
    },
    {
      id: 'analytics',
      title: 'Analytics & Stats',
      description: 'Web Vitals, performance et statistiques détaillées',
      icon: BarChart3,
      path: '/settings/analytics',
      color: 'from-cyan-500 to-blue-500',
      available: true
    },
    {
      id: 'metrics',
      title: 'Métriques Historiques',
      description: 'Graphiques et évolution des performances',
      icon: LineChart,
      path: '/settings/metrics',
      color: 'from-purple-500 to-pink-500',
      available: true
    },
    {
      id: 'alerts',
      title: 'Alertes Personnalisées',
      description: 'Configuration des alertes et notifications',
      icon: Bell,
      path: '/settings/alerts',
      color: 'from-orange-500 to-red-500',
      available: true
    }
  ];

  useEffect(() => {
    const fetchVercelInfo = async () => {
      try {
        const [envRes, metricsRes] = await Promise.all([
          fetch('/api/vercel/env'),
          fetch('/api/vercel/metrics')
        ]);

        if (envRes.ok) {
          const envData = await envRes.json();
          setVercelInfo(envData.data);
          setConnected(true);
        }

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData.data);
        }
      } catch (error) {
        console.error('Failed to fetch Vercel info:', error);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchVercelInfo();
    
    // Rafraîchir les métriques toutes les 30s
    const interval = setInterval(fetchVercelInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (card: SettingCard) => {
    if (card.available) {
      router.push(card.path);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
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
            <div className="flex-1">
              <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Paramètres
              </h1>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Gérez vos préférences et la configuration de l&apos;application
              </p>
            </div>
            
            {/* Vercel Status Badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              connected 
                ? isDark ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
                : isDark ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
            }`}>
              {connected ? (
                <>
                  <Wifi size={16} className="text-green-500" />
                  <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    Vercel Connected
                  </span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-red-500" />
                  <span className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                    Disconnected
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Vercel Info Card */}
        {connected && vercelInfo && (
          <div className={`mb-6 p-6 rounded-2xl ${
            isDark ? 'bg-gradient-to-br from-black/40 to-gray-800/40 border border-white/10' : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <Cloud size={24} className={isDark ? 'text-white' : 'text-gray-900'} />
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Vercel Deployment Info
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Environnement</p>
                <div className="flex items-center gap-2">
                  <Server size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                  <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {vercelInfo.env}
                  </span>
                </div>
              </div>
              
              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Région</p>
                <div className="flex items-center gap-2">
                  <Globe size={14} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
                  <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {vercelInfo.region || 'N/A'}
                  </span>
                </div>
              </div>
              
              {vercelInfo.gitBranch && (
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Branche Git</p>
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className={isDark ? 'text-green-400' : 'text-green-600'} />
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {vercelInfo.gitBranch}
                    </span>
                  </div>
                </div>
              )}
              
              {vercelInfo.gitCommitSha && (
                <div>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Commit</p>
                  <div className="flex items-center gap-2">
                    <Package size={14} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                    <span className={`text-sm font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {vercelInfo.gitCommitSha}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Metrics */}
        {metrics && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <Activity size={20} className={isDark ? 'text-green-400' : 'text-green-600'} />
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {metrics.performance.avgResponseTime}ms
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avg Response</p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <Clock size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                <TrendingUp size={16} className="text-blue-500" />
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatUptime(metrics.uptime)}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Uptime</p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <BarChart3 size={20} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
                <TrendingUp size={16} className="text-purple-500" />
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {metrics.performance.requestCount.toLocaleString()}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Requests</p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <AlertCircle size={20} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                {metrics.performance.errorRate < 1 ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <AlertCircle size={16} className="text-orange-500" />
                )}
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {metrics.performance.errorRate.toFixed(2)}%
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Error Rate</p>
            </div>
          </div>
        )}

        {/* Services Status */}
        {metrics && (
          <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Services Status
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(metrics.services).map(([service, status]) => (
                <div
                  key={service}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    status 
                      ? isDark ? 'bg-green-500/20' : 'bg-green-50'
                      : isDark ? 'bg-red-500/20' : 'bg-red-50'
                  }`}
                >
                  {status ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <AlertCircle size={14} className="text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className={`relative mb-4 w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon size={24} className="text-white" />
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {card.title}
                  </h3>
                  <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
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
                et synchronisés sur tous vos appareils via Vercel Edge Network. Toutes les fonctionnalités 
                sont optimisées pour des performances maximales avec des temps de réponse &lt;50ms globalement.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle size={20} className="text-white" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Intégrations actives</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>3 Services</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Edge Functions</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>6 actives</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Package size={20} className="text-white" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Version</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>v2.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
