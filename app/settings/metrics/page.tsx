'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  LineChart
} from 'lucide-react';
import {
  LineChart as RechartsLine,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface MetricDataPoint {
  timestamp: string;
  responseTime: number;
  requestCount: number;
  errorRate: number;
  uptime: number;
}

interface EdgeFunctionMetric {
  timestamp: string;
  status: number;
  webhooks: number;
  analytics: number;
  optimizeImage: number;
  vercelEnv: number;
  vercelMetrics: number;
}

export default function MetricsHistoryPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'responseTime' | 'requests' | 'errors'>('all');

  // Mock historical data - System Metrics
  const systemMetrics: MetricDataPoint[] = [
    { timestamp: '00:00', responseTime: 145, requestCount: 234, errorRate: 0.5, uptime: 99.9 },
    { timestamp: '04:00', responseTime: 132, requestCount: 189, errorRate: 0.3, uptime: 99.9 },
    { timestamp: '08:00', responseTime: 156, requestCount: 312, errorRate: 0.4, uptime: 99.8 },
    { timestamp: '12:00', responseTime: 178, requestCount: 421, errorRate: 0.6, uptime: 99.7 },
    { timestamp: '16:00', responseTime: 165, requestCount: 389, errorRate: 0.5, uptime: 99.8 },
    { timestamp: '20:00', responseTime: 142, requestCount: 298, errorRate: 0.3, uptime: 99.9 },
    { timestamp: '23:59', responseTime: 138, requestCount: 245, errorRate: 0.4, uptime: 99.9 }
  ];

  // Mock historical data - Edge Functions
  const edgeFunctionMetrics: EdgeFunctionMetric[] = [
    { timestamp: '00:00', status: 23, webhooks: 45, analytics: 18, optimizeImage: 67, vercelEnv: 12, vercelMetrics: 15 },
    { timestamp: '04:00', status: 21, webhooks: 42, analytics: 16, optimizeImage: 65, vercelEnv: 11, vercelMetrics: 14 },
    { timestamp: '08:00', status: 25, webhooks: 48, analytics: 19, optimizeImage: 71, vercelEnv: 13, vercelMetrics: 16 },
    { timestamp: '12:00', status: 27, webhooks: 52, analytics: 21, optimizeImage: 75, vercelEnv: 14, vercelMetrics: 17 },
    { timestamp: '16:00', status: 24, webhooks: 47, analytics: 18, optimizeImage: 69, vercelEnv: 12, vercelMetrics: 15 },
    { timestamp: '20:00', status: 22, webhooks: 44, analytics: 17, optimizeImage: 66, vercelEnv: 11, vercelMetrics: 14 },
    { timestamp: '23:59', status: 23, webhooks: 45, analytics: 18, optimizeImage: 67, vercelEnv: 12, vercelMetrics: 15 }
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const exportData = () => {
    const data = {
      systemMetrics,
      edgeFunctionMetrics,
      exportedAt: new Date().toISOString(),
      timeRange
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${timeRange}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate trends
  const calculateTrend = (data: MetricDataPoint[], key: keyof MetricDataPoint) => {
    if (data.length < 2) return 0;
    const first = data[0][key] as number;
    const last = data[data.length - 1][key] as number;
    return ((last - first) / first) * 100;
  };

  const responseTimeTrend = calculateTrend(systemMetrics, 'responseTime');
  const requestCountTrend = calculateTrend(systemMetrics, 'requestCount');
  const errorRateTrend = calculateTrend(systemMetrics, 'errorRate');

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
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
                <LineChart size={40} className="text-white" />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Métriques Historiques
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Graphiques et évolution des performances
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className={`px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 text-white border border-white/10' 
                    : 'bg-white text-gray-900 border border-gray-200'
                } transition-colors`}
              >
                <option value="1h">1 heure</option>
                <option value="24h">24 heures</option>
                <option value="7d">7 jours</option>
                <option value="30d">30 jours</option>
              </select>

              <button
                onClick={exportData}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 hover:bg-white/10 text-white' 
                    : 'bg-white hover:bg-gray-50 text-gray-900'
                } transition-colors`}
              >
                <Download size={16} />
                Exporter
              </button>

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

        {/* Trend Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-blue-500`}>
            <div className="flex items-center justify-between mb-3">
              <Clock size={24} className="text-blue-500" />
              {responseTimeTrend < 0 ? (
                <TrendingDown size={20} className="text-green-500" />
              ) : (
                <TrendingUp size={20} className="text-red-500" />
              )}
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {Math.abs(responseTimeTrend).toFixed(1)}%
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Temps de réponse {responseTimeTrend < 0 ? '↓' : '↑'}
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-purple-500`}>
            <div className="flex items-center justify-between mb-3">
              <Activity size={24} className="text-purple-500" />
              {requestCountTrend > 0 ? (
                <TrendingUp size={20} className="text-green-500" />
              ) : (
                <TrendingDown size={20} className="text-red-500" />
              )}
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {Math.abs(requestCountTrend).toFixed(1)}%
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Requêtes {requestCountTrend > 0 ? '↑' : '↓'}
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-orange-500`}>
            <div className="flex items-center justify-between mb-3">
              <AlertCircle size={24} className="text-orange-500" />
              {errorRateTrend < 0 ? (
                <TrendingDown size={20} className="text-green-500" />
              ) : (
                <TrendingUp size={20} className="text-red-500" />
              )}
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {Math.abs(errorRateTrend).toFixed(1)}%
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Taux d&apos;erreur {errorRateTrend < 0 ? '↓' : '↑'}
            </p>
          </div>
        </div>

        {/* Response Time Chart */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Temps de Réponse Moyen
              </h2>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              Objectif: &lt; 200ms
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={systemMetrics}>
              <defs>
                <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis 
                dataKey="timestamp" 
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ fontSize: '12px' }}
                label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: isDark ? '#F3F4F6' : '#111827' }}
              />
              <Area 
                type="monotone" 
                dataKey="responseTime" 
                stroke="#3B82F6" 
                fillOpacity={1} 
                fill="url(#colorResponseTime)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Request Count Chart */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity size={24} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Nombre de Requêtes
              </h2>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'
            }`}>
              Total: {systemMetrics.reduce((sum, m) => sum + m.requestCount, 0).toLocaleString()}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={systemMetrics}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis 
                dataKey="timestamp" 
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: isDark ? '#F3F4F6' : '#111827' }}
              />
              <Area 
                type="monotone" 
                dataKey="requestCount" 
                stroke="#A855F7" 
                fillOpacity={1} 
                fill="url(#colorRequests)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Edge Functions Performance Chart */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap size={24} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Performance des Edge Functions
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMetric('all')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  selectedMetric === 'all'
                    ? 'bg-cyan-500 text-white'
                    : isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
                } transition-colors`}
              >
                Toutes
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <RechartsLine data={edgeFunctionMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis 
                dataKey="timestamp" 
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ fontSize: '12px' }}
                label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: isDark ? '#F3F4F6' : '#111827' }}
              />
              <Legend />
              <Line type="monotone" dataKey="status" stroke="#10B981" strokeWidth={2} name="Status" />
              <Line type="monotone" dataKey="webhooks" stroke="#F59E0B" strokeWidth={2} name="Webhooks" />
              <Line type="monotone" dataKey="analytics" stroke="#3B82F6" strokeWidth={2} name="Analytics" />
              <Line type="monotone" dataKey="optimizeImage" stroke="#EF4444" strokeWidth={2} name="Optimize Image" />
              <Line type="monotone" dataKey="vercelEnv" stroke="#8B5CF6" strokeWidth={2} name="Vercel Env" />
              <Line type="monotone" dataKey="vercelMetrics" stroke="#EC4899" strokeWidth={2} name="Vercel Metrics" />
            </RechartsLine>
          </ResponsiveContainer>
        </div>

        {/* Error Rate Chart */}
        <div className={`p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Taux d&apos;Erreur
              </h2>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-600'
            }`}>
              Objectif: &lt; 1%
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={systemMetrics}>
              <defs>
                <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis 
                dataKey="timestamp" 
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ fontSize: '12px' }}
                label={{ value: '%', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: isDark ? '#F3F4F6' : '#111827' }}
              />
              <Area 
                type="monotone" 
                dataKey="errorRate" 
                stroke="#F97316" 
                fillOpacity={1} 
                fill="url(#colorErrors)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Info Box */}
        <div className={`mt-6 p-6 rounded-2xl ${
          isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
              <BarChart3 size={24} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-900'}`}>
                📊 Graphiques en temps réel
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Les graphiques sont mis à jour automatiquement toutes les 30 secondes. Les données historiques sont conservées
                pendant 90 jours. Utilisez le sélecteur de période pour analyser différentes plages temporelles et le bouton
                &quot;Exporter&quot; pour télécharger les données au format JSON.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}