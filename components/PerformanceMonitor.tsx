'use client';

import { useEffect, useState } from 'react';
import { Activity, Zap, Shield, TrendingUp, Clock, Server } from 'lucide-react';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  responseTime: string;
  services: {
    database: boolean;
    api: boolean;
    auth: boolean;
  };
  memory?: {
    used: number;
    total: number;
  };
}

export default function PerformanceMonitor() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError('Impossible de récupérer les données');
        console.error('Health check error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh toutes les 30s

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10';
      case 'degraded':
        return 'bg-yellow-500/10';
      case 'unhealthy':
        return 'bg-red-500/10';
      default:
        return 'bg-gray-500/10';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="text-red-500 text-center">
          <Activity className="w-8 h-8 mx-auto mb-2" />
          <p>{error || 'Données non disponibles'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Performance & Monitoring
          </h2>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusBg(health.status)}`}>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(health.status)} animate-pulse`}></div>
          <span className={`text-sm font-medium ${getStatusColor(health.status)}`}>
            {health.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {/* Response Time */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {health.responseTime}
          </p>
        </div>

        {/* Uptime */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatUptime(health.uptime)}
          </p>
        </div>

        {/* Memory */}
        {health.memory && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Mémoire</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {health.memory.used}MB
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              / {health.memory.total}MB
            </p>
          </div>
        )}
      </div>

      {/* Services Status */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          État des Services
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(health.services).map(([service, status]) => (
            <div
              key={service}
              className={`flex items-center gap-2 p-3 rounded-lg ${
                status ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  status ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {service}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            <span>Version {health.version}</span>
          </div>
          <span>
            Dernière mise à jour : {new Date(health.timestamp).toLocaleTimeString('fr-FR')}
          </span>
        </div>
      </div>
    </div>
  );
}
