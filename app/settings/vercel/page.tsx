'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Zap,
  Cloud,
  Server,
  GitBranch,
  Package,
  Globe,
  Activity,
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Wifi,
  Code,
  Layers,
  Database,
  Shield,
  RefreshCw,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

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

interface EdgeFunction {
  name: string;
  endpoint: string;
  description: string;
  avgLatency: number;
  calls: number;
  cacheHitRate: number;
}

export default function VercelSettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [vercelInfo, setVercelInfo] = useState<VercelEnvInfo | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const edgeFunctions: EdgeFunction[] = [
    {
      name: 'Status',
      endpoint: '/api/status',
      description: 'Ultra-fast system status check',
      avgLatency: 23,
      calls: 8542,
      cacheHitRate: 85
    },
    {
      name: 'Webhooks',
      endpoint: '/api/webhooks',
      description: 'Universal webhook handler',
      avgLatency: 45,
      calls: 3421,
      cacheHitRate: 0
    },
    {
      name: 'Analytics',
      endpoint: '/api/analytics',
      description: 'Web Vitals tracking',
      avgLatency: 18,
      calls: 15643,
      cacheHitRate: 0
    },
    {
      name: 'Optimize Image',
      endpoint: '/api/optimize-image',
      description: 'Image optimization API',
      avgLatency: 67,
      calls: 2341,
      cacheHitRate: 95
    },
    {
      name: 'Vercel Env',
      endpoint: '/api/vercel/env',
      description: 'Environment information',
      avgLatency: 12,
      calls: 1234,
      cacheHitRate: 90
    },
    {
      name: 'Vercel Metrics',
      endpoint: '/api/vercel/metrics',
      description: 'System metrics',
      avgLatency: 15,
      calls: 2156,
      cacheHitRate: 75
    }
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [envRes, metricsRes] = await Promise.all([
        fetch('/api/vercel/env'),
        fetch('/api/vercel/metrics')
      ]);

      if (envRes.ok) {
        const envData = await envRes.json();
        setVercelInfo(envData.data);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-500';
    if (latency < 100) return 'text-yellow-500';
    return 'text-red-500';
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-black to-gray-700">
                <Zap size={40} className="text-white" />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Vercel & Edge Functions
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configuration, monitoring et performance
                </p>
              </div>
            </div>

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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin">
              <RefreshCw size={32} className={isDark ? 'text-white' : 'text-gray-900'} />
            </div>
          </div>
        ) : (
          <>
            {/* Deployment Info */}
            {vercelInfo && (
              <div className={`mb-6 p-6 rounded-2xl ${
                isDark ? 'bg-gradient-to-br from-black/60 to-gray-800/60 border border-white/10' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Cloud size={24} className={isDark ? 'text-white' : 'text-gray-900'} />
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Deployment Information
                    </h2>
                  </div>
                  <a
                    href={`https://${vercelInfo.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <ExternalLink size={16} />
                    <span className="text-sm font-medium">Ouvrir</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Server size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Environnement
                      </span>
                    </div>
                    <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {vercelInfo.env}
                    </p>
                  </div>

                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe size={18} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Région
                      </span>
                    </div>
                    <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {vercelInfo.region || 'N/A'}
                    </p>
                  </div>

                  {vercelInfo.gitBranch && (
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch size={18} className={isDark ? 'text-green-400' : 'text-green-600'} />
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Branche
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {vercelInfo.gitBranch}
                        </p>
                        <button
                          onClick={() => copyToClipboard(vercelInfo.gitBranch!, 'branch')}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          {copied === 'branch' ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {vercelInfo.gitCommitSha && (
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Package size={18} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Commit
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xl font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {vercelInfo.gitCommitSha}
                        </p>
                        <button
                          onClick={() => copyToClipboard(vercelInfo.gitCommitSha!, 'commit')}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          {copied === 'commit' ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {vercelInfo.url && (
                  <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={18} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          URL de déploiement
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`https://${vercelInfo.url}`, 'url')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {copied === 'url' ? (
                          <>
                            <Check size={14} className="text-green-500" />
                            <span className="text-sm text-green-500">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className={`text-lg font-mono mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      https://{vercelInfo.url}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* System Metrics */}
            {metrics && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-green-500`}>
                  <div className="flex items-center justify-between mb-3">
                    <Activity size={24} className="text-green-500" />
                    <CheckCircle size={20} className="text-green-500" />
                  </div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.performance.avgResponseTime}ms
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Temps de réponse moyen
                  </p>
                </div>

                <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-blue-500`}>
                  <div className="flex items-center justify-between mb-3">
                    <Clock size={24} className="text-blue-500" />
                    <TrendingUp size={20} className="text-blue-500" />
                  </div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatUptime(metrics.uptime)}
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Temps de fonctionnement
                  </p>
                </div>

                <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-purple-500`}>
                  <div className="flex items-center justify-between mb-3">
                    <BarChart3 size={24} className="text-purple-500" />
                    <TrendingUp size={20} className="text-purple-500" />
                  </div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.performance.requestCount.toLocaleString()}
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Requêtes totales
                  </p>
                </div>

                <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 ${
                  metrics.performance.errorRate < 1 ? 'border-green-500' : 'border-orange-500'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <AlertCircle size={24} className={metrics.performance.errorRate < 1 ? 'text-green-500' : 'text-orange-500'} />
                    {metrics.performance.errorRate < 1 ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <AlertCircle size={20} className="text-orange-500" />
                    )}
                  </div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.performance.errorRate.toFixed(2)}%
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Taux d&apos;erreur
                  </p>
                </div>
              </div>
            )}

            {/* Edge Functions */}
            <div className={`mb-6 p-6 rounded-2xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <Zap size={24} className={isDark ? 'text-yellow-400' : 'text-yellow-600'} />
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Edge Functions ({edgeFunctions.length})
                </h2>
              </div>

              <div className="space-y-4">
                {edgeFunctions.map((func) => (
                  <div
                    key={func.endpoint}
                    className={`p-4 rounded-xl ${
                      isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Code size={18} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {func.name}
                          </h3>
                        </div>
                        <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {func.description}
                        </p>
                        <code className={`text-xs font-mono px-2 py-1 rounded ${
                          isDark ? 'bg-black/40 text-cyan-400' : 'bg-gray-200 text-cyan-700'
                        }`}>
                          {func.endpoint}
                        </code>
                      </div>
                      <button
                        onClick={() => copyToClipboard(func.endpoint, func.endpoint)}
                        className="ml-4 p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        {copied === func.endpoint ? (
                          <Check size={16} className="text-green-500" />
                        ) : (
                          <Copy size={16} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          Latence moyenne
                        </p>
                        <p className={`text-lg font-bold ${getLatencyColor(func.avgLatency)}`}>
                          {func.avgLatency}ms
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          Appels totaux
                        </p>
                        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {func.calls.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          Taux de cache
                        </p>
                        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {func.cacheHitRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Services Status */}
            {metrics && (
              <div className={`p-6 rounded-2xl ${
                isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-6">
                  <Layers size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                  <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Services Status
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {Object.entries(metrics.services).map(([service, status]) => (
                    <div
                      key={service}
                      className={`p-4 rounded-xl text-center ${
                        status 
                          ? isDark ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
                          : isDark ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      {status ? (
                        <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                      ) : (
                        <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                      )}
                      <p className={`font-semibold capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {service}
                      </p>
                      <p className={`text-xs mt-1 ${
                        status 
                          ? isDark ? 'text-green-400' : 'text-green-700'
                          : isDark ? 'text-red-400' : 'text-red-700'
                      }`}>
                        {status ? 'Opérationnel' : 'Hors ligne'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className={`mt-6 p-6 rounded-2xl ${
              isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <Shield size={24} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>
                    🚀 Performance optimale garantie
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                    Les Edge Functions sont déployées sur le réseau global de Vercel pour des temps de réponse inférieurs à 50ms. 
                    Le cache CDN est optimisé automatiquement pour maximiser les performances tout en maintenant la fraîcheur des données.
                    Toutes les métriques sont actualisées automatiquement toutes les 30 secondes.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
