'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Mail,
  Webhook,
  Save,
  X
} from 'lucide-react';

interface Alert {
  id: string;
  name: string;
  metric: 'responseTime' | 'errorRate' | 'uptime' | 'requestCount';
  condition: 'above' | 'below' | 'equals';
  threshold: number;
  enabled: boolean;
  notificationMethod: 'email' | 'webhook';
  notificationTarget: string;
  createdAt: string;
  lastTriggered?: string;
}

export default function AlertsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      name: 'Temps de réponse élevé',
      metric: 'responseTime',
      condition: 'above',
      threshold: 200,
      enabled: true,
      notificationMethod: 'email',
      notificationTarget: 'admin@bnbgest.com',
      createdAt: '2026-03-30T10:00:00Z',
      lastTriggered: '2026-03-31T08:15:00Z'
    },
    {
      id: '2',
      name: 'Taux d\'erreur critique',
      metric: 'errorRate',
      condition: 'above',
      threshold: 1,
      enabled: true,
      notificationMethod: 'webhook',
      notificationTarget: 'https://hooks.slack.com/services/xxx',
      createdAt: '2026-03-30T10:30:00Z'
    },
    {
      id: '3',
      name: 'Uptime faible',
      metric: 'uptime',
      condition: 'below',
      threshold: 99.5,
      enabled: false,
      notificationMethod: 'email',
      notificationTarget: 'admin@bnbgest.com',
      createdAt: '2026-03-30T11:00:00Z'
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [newAlert, setNewAlert] = useState<Partial<Alert>>({
    name: '',
    metric: 'responseTime',
    condition: 'above',
    threshold: 0,
    enabled: true,
    notificationMethod: 'email',
    notificationTarget: ''
  });

  const metricLabels = {
    responseTime: 'Temps de réponse',
    errorRate: 'Taux d\'erreur',
    uptime: 'Uptime',
    requestCount: 'Nombre de requêtes'
  };

  const metricUnits = {
    responseTime: 'ms',
    errorRate: '%',
    uptime: '%',
    requestCount: 'req'
  };

  const conditionLabels = {
    above: 'supérieur à',
    below: 'inférieur à',
    equals: 'égal à'
  };

  const handleCreateAlert = () => {
    if (!newAlert.name || !newAlert.notificationTarget) return;

    const alert: Alert = {
      id: Date.now().toString(),
      name: newAlert.name,
      metric: newAlert.metric || 'responseTime',
      condition: newAlert.condition || 'above',
      threshold: newAlert.threshold || 0,
      enabled: newAlert.enabled ?? true,
      notificationMethod: newAlert.notificationMethod || 'email',
      notificationTarget: newAlert.notificationTarget,
      createdAt: new Date().toISOString()
    };

    setAlerts([...alerts, alert]);
    setShowCreateModal(false);
    setNewAlert({
      name: '',
      metric: 'responseTime',
      condition: 'above',
      threshold: 0,
      enabled: true,
      notificationMethod: 'email',
      notificationTarget: ''
    });
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500">
                <Bell size={40} className="text-white" />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Alertes Personnalisées
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configurez des alertes pour surveiller vos métriques
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-colors"
            >
              <Plus size={20} />
              Nouvelle alerte
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-green-500`}>
            <div className="flex items-center justify-between mb-3">
              <CheckCircle size={24} className="text-green-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {alerts.filter(a => a.enabled).length}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Alertes actives
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-orange-500`}>
            <div className="flex items-center justify-between mb-3">
              <Bell size={24} className="text-orange-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {alerts.filter(a => a.lastTriggered).length}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Déclenchées récemment
            </p>
          </div>

          <div className={`p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border-l-4 border-blue-500`}>
            <div className="flex items-center justify-between mb-3">
              <Mail size={24} className="text-blue-500" />
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {alerts.filter(a => a.notificationMethod === 'email').length}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Notifications email
            </p>
          </div>
        </div>

        {/* Alerts List */}
        <div className={`p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Mes Alertes
          </h2>

          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-6 rounded-xl ${
                  isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
                } ${alert.enabled ? '' : 'opacity-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {alert.name}
                      </h3>
                      {alert.enabled ? (
                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-semibold">
                          Activée
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-500 text-xs font-semibold">
                          Désactivée
                        </span>
                      )}
                    </div>

                    <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Déclencher quand <span className="font-semibold text-orange-500">{metricLabels[alert.metric]}</span> est{' '}
                      <span className="font-semibold">{conditionLabels[alert.condition]}</span>{' '}
                      <span className="font-semibold text-orange-500">{alert.threshold} {metricUnits[alert.metric]}</span>
                    </p>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        {alert.notificationMethod === 'email' ? (
                          <Mail size={16} className="text-blue-500" />
                        ) : (
                          <Webhook size={16} className="text-purple-500" />
                        )}
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          {alert.notificationTarget}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-500" />
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Créée le {formatDate(alert.createdAt)}
                        </span>
                      </div>

                      {alert.lastTriggered && (
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-orange-500" />
                          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                            Dernière: {formatDate(alert.lastTriggered)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAlert(alert.id)}
                      className={`p-2 rounded-lg ${
                        isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                      } transition-colors`}
                      title={alert.enabled ? 'Désactiver' : 'Activer'}
                    >
                      {alert.enabled ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : (
                        <CheckCircle size={20} className="text-gray-500" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className={`p-2 rounded-lg ${
                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'
                      } transition-colors`}
                      title="Supprimer"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="text-center py-12">
                <Bell size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Aucune alerte configurée
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-6 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-colors"
                >
                  Créer votre première alerte
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={`w-full max-w-2xl rounded-2xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } p-8`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Nouvelle Alerte
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`p-2 rounded-lg ${
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  } transition-colors`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nom de l&apos;alerte
                  </label>
                  <input
                    type="text"
                    value={newAlert.name}
                    onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                    placeholder="Ex: Temps de réponse élevé"
                    className={`w-full px-4 py-3 rounded-lg ${
                      isDark 
                        ? 'bg-white/5 border border-white/10 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Métrique
                    </label>
                    <select
                      value={newAlert.metric}
                      onChange={(e) => setNewAlert({ ...newAlert, metric: e.target.value as any })}
                      className={`w-full px-4 py-3 rounded-lg ${
                        isDark 
                          ? 'bg-white/5 border border-white/10 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="responseTime">Temps de réponse</option>
                      <option value="errorRate">Taux d&apos;erreur</option>
                      <option value="uptime">Uptime</option>
                      <option value="requestCount">Nombre de requêtes</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Condition
                    </label>
                    <select
                      value={newAlert.condition}
                      onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as any })}
                      className={`w-full px-4 py-3 rounded-lg ${
                        isDark 
                          ? 'bg-white/5 border border-white/10 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="above">Supérieur à</option>
                      <option value="below">Inférieur à</option>
                      <option value="equals">Égal à</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Seuil
                    </label>
                    <input
                      type="number"
                      value={newAlert.threshold}
                      onChange={(e) => setNewAlert({ ...newAlert, threshold: Number(e.target.value) })}
                      placeholder="200"
                      className={`w-full px-4 py-3 rounded-lg ${
                        isDark 
                          ? 'bg-white/5 border border-white/10 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Méthode de notification
                  </label>
                  <select
                    value={newAlert.notificationMethod}
                    onChange={(e) => setNewAlert({ ...newAlert, notificationMethod: e.target.value as any })}
                    className={`w-full px-4 py-3 rounded-lg ${
                      isDark 
                        ? 'bg-white/5 border border-white/10 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="email">Email</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {newAlert.notificationMethod === 'email' ? 'Adresse email' : 'URL Webhook'}
                  </label>
                  <input
                    type={newAlert.notificationMethod === 'email' ? 'email' : 'url'}
                    value={newAlert.notificationTarget}
                    onChange={(e) => setNewAlert({ ...newAlert, notificationTarget: e.target.value })}
                    placeholder={newAlert.notificationMethod === 'email' ? 'admin@bnbgest.com' : 'https://hooks.slack.com/...'}
                    className={`w-full px-4 py-3 rounded-lg ${
                      isDark 
                        ? 'bg-white/5 border border-white/10 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={newAlert.enabled ?? true}
                    onChange={(e) => setNewAlert({ ...newAlert, enabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="enabled" className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Activer immédiatement cette alerte
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={handleCreateAlert}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-colors"
                >
                  <Save size={20} />
                  Créer l&apos;alerte
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`px-6 py-3 rounded-lg ${
                    isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
                  } transition-colors`}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className={`mt-6 p-6 rounded-2xl ${
          isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
              <Bell size={24} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-orange-400' : 'text-orange-900'}`}>
                🔔 Alertes intelligentes
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Les alertes sont vérifiées toutes les 5 minutes. Vous recevrez une notification uniquement lors du premier
                déclenchement pour éviter le spam. Les alertes sont automatiquement réactivées après 1 heure sans déclenchement.
                Configurez plusieurs méthodes de notification pour ne jamais manquer un incident critique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
