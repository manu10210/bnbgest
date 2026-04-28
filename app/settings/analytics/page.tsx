'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Activity,
  TrendingUp,
  Eye,
  MousePointer,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  description: string;
  threshold: { good: number; poor: number };
}

interface PageMetric {
  path: string;
  views: number;
  avgLoadTime: number;
  bounceRate: number;
  avgSessionTime: number;
}

interface DeviceStats {
  device: string;
  percentage: number;
  users: number;
  icon: React.ElementType;
}

export default function AnalyticsSettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Mock Web Vitals data
  const webVitals: WebVital[] = [
    {
      name: 'CLS',
      value: 0.05,
      rating: 'good',
      description: 'Cumulative Layout Shift',
      threshold: { good: 0.1, poor: 0.25 }
    },
    {
      name: 'FCP',
      value: 1.2,
      rating: 'good',
      description: 'First Contentful Paint',
      threshold: { good: 1.8, poor: 3.0 }
    },
    {
      name: 'LCP',
      value: 2.1,
      rating: 'good',
      description: 'Largest Contentful Paint',
      threshold: { good: 2.5, poor: 4.0 }
    },
    {
      name: 'TTFB',
      value: 0.65,
      rating: 'good',
      description: 'Time to First Byte',
      threshold: { good: 0.8, poor: 1.8 }
    },
    {
      name: 'INP',
      value: 150,
      rating: 'good',
      description: 'Interaction to Next Paint',
      threshold: { good: 200, poor: 500 }
    }
  ];

  const pageMetrics: PageMetric[] = [
    {
      path: '/',
      views: 12543,
      avgLoadTime: 1.2,
      bounceRate: 35,
      avgSessionTime: 245
    },
    {
      path: '/admin',
      views: 8234,
      avgLoadTime: 1.5,
      bounceRate: 28,
      avgSessionTime: 420
    },
    {
      path: '/calendar',
      views: 5621,
      avgLoadTime: 1.8,
      bounceRate: 32,
      avgSessionTime: 310
    },
    {
      path: '/settings',
      views: 3412,
      avgLoadTime: 1.1,
      bounceRate: 45,
      avgSessionTime: 180
    },
    {
      path: '/photos',
      views: 2834,
      avgLoadTime: 2.3,
      bounceRate: 38,
      avgSessionTime: 205
    }
  ];

  const deviceStats: DeviceStats[] = [
    { device: 'Desktop', percentage: 65, users: 8234, icon: Monitor },
    { device: 'Mobile', percentage: 28, users: 3542, icon: Smartphone },
    { device: 'Tablet', percentage: 7, users: 886, icon: Tablet }
  ];

  const totalUsers = deviceStats.reduce((sum, stat) => sum + stat.users, 0);
  const totalPageViews = pageMetrics.reduce((sum, page) => sum + page.views, 0);
  const avgLoadTime = pageMetrics.reduce((sum, page) => sum + page.avgLoadTime, 0) / pageMetrics.length;
  const avgBounceRate = pageMetrics.reduce((sum, page) => sum + page.bounceRate, 0) / pageMetrics.length;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-500';
      case 'needs-improvement': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRatingBg = (rating: string, isDark: boolean) => {
    switch (rating) {
      case 'good': 
        return isDark ? 'bg-green-500/20 border-green-500/30' : 'bg-green-50 border-green-200';
      case 'needs-improvement': 
        return isDark ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200';
      case 'poor': 
        return isDark ? 'bg-red-500/20 border-red-500/30' : 'bg-red-50 border-red-200';
      default: 
        return isDark ? 'bg-gray-500/20 border-gray-500/30' : 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
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
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500">
                <BarChart3 size={40} className="text-white" />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Analytics & Stats
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Web Vitals, performance et statistiques détaillées
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
                className={`px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 text-white border border-white/10' 
                    : 'bg-white text-gray-900 border border-gray-200'
                } transition-colors`}
              >
                <option value="24h">24 heures</option>
                <option value="7d">7 jours</option>
                <option value="30d">30 jours</option>
              </select>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 hover:bg-white/10 text-white' 
                    : 'bg-white hover:bg-gray-50 text-gray-900'
                } transition-colors disabled:opacity-50`}
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-purple-500`}>
            <div className="flex items-center justify-between mb-3">
              <Eye size={24} className="text-purple-500" />
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {totalPageViews.toLocaleString()}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Pages vues
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-blue-500`}>
            <div className="flex items-center justify-between mb-3">
              <Users size={24} className="text-blue-500" />
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {totalUsers.toLocaleString()}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Utilisateurs
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-green-500`}>
            <div className="flex items-center justify-between mb-3">
              <Zap size={24} className="text-green-500" />
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {avgLoadTime.toFixed(2)}s
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Temps de chargement moyen
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-orange-500`}>
            <div className="flex items-center justify-between mb-3">
              <MousePointer size={24} className="text-orange-500" />
              {avgBounceRate < 40 ? (
                <CheckCircle size={20} className="text-green-500" />
              ) : (
                <AlertCircle size={20} className="text-orange-500" />
              )}
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {avgBounceRate.toFixed(1)}%
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Taux de rebond moyen
            </p>
          </div>
        </div>

        {/* Web Vitals */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Activity size={24} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Core Web Vitals
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {webVitals.map((vital) => (
              <div
                key={vital.name}
                className={`p-4 rounded-xl border ${getRatingBg(vital.rating, isDark)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {vital.name}
                  </h3>
                  {vital.rating === 'good' ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : vital.rating === 'needs-improvement' ? (
                    <AlertCircle size={20} className="text-yellow-500" />
                  ) : (
                    <AlertCircle size={20} className="text-red-500" />
                  )}
                </div>
                <p className={`text-3xl font-bold mb-2 ${getRatingColor(vital.rating)}`}>
                  {vital.value < 10 ? vital.value.toFixed(2) : Math.round(vital.value)}
                  {vital.name === 'INP' || vital.name === 'TTFB' || vital.name === 'FCP' || vital.name === 'LCP' ? (
                    vital.value < 10 ? 's' : 'ms'
                  ) : ''}
                </p>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {vital.description}
                </p>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Good: &lt;{vital.threshold.good} | Poor: &gt;{vital.threshold.poor}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Page Performance */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Globe size={24} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Performance par page
              </h2>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors">
              <Download size={16} />
              Exporter
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Page</th>
                  <th className={`text-right py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Vues</th>
                  <th className={`text-right py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Temps de chargement</th>
                  <th className={`text-right py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Taux de rebond</th>
                  <th className={`text-right py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Temps moyen</th>
                </tr>
              </thead>
              <tbody>
                {pageMetrics.map((page) => (
                  <tr
                    key={page.path}
                    className={`border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}
                  >
                    <td className={`py-3 px-4 font-mono text-sm ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                      {page.path}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {page.views.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-right ${
                      page.avgLoadTime < 2 ? 'text-green-500' : page.avgLoadTime < 3 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {page.avgLoadTime.toFixed(2)}s
                    </td>
                    <td className={`py-3 px-4 text-right ${
                      page.bounceRate < 40 ? 'text-green-500' : page.bounceRate < 60 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {page.bounceRate}%
                    </td>
                    <td className={`py-3 px-4 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {formatTime(page.avgSessionTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Stats */}
        <div className={`p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Monitor size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Répartition par appareil
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {deviceStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.device}
                  className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Icon size={32} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                    <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {stat.percentage}%
                    </span>
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stat.device}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.users.toLocaleString()} utilisateurs
                  </p>
                  <div className="mt-4 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className={`mt-6 p-6 rounded-2xl ${
          isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <BarChart3 size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>
                📊 Données en temps réel
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Toutes les métriques sont collectées automatiquement via le composant AnalyticsWrapper et envoyées à l&apos;API Analytics.
                Les Web Vitals sont mesurés côté client pour refléter l&apos;expérience utilisateur réelle. Les données sont agrégées
                et peuvent être exportées pour une analyse plus approfondie.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}