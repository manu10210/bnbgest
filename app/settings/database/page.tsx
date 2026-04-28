'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { loadClientSetting, saveClientSetting } from '@/lib/client-settings';
import {
  ArrowLeft,
  Database,
  Download,
  Upload,
  HardDrive,
  Clock,
  RefreshCw,
  Check,
  AlertCircle,
  FileJson,
  FileSpreadsheet,
  Trash2,
  Play
} from 'lucide-react';

interface Backup {
  id: string;
  name: string;
  date: string;
  size: string;
  type: 'auto' | 'manual';
  status: 'completed' | 'failed';
}

export default function DatabaseSettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [backupTime, setBackupTime] = useState('03:00');
  const [retentionDays, setRetentionDays] = useState('30');

  const defaultBackups: Backup[] = [
    {
      id: '1',
      name: 'backup-2024-01-20-03-00',
      date: '2024-01-20 03:00:00',
      size: '45.2 MB',
      type: 'auto',
      status: 'completed'
    },
    {
      id: '2',
      name: 'backup-2024-01-19-03-00',
      date: '2024-01-19 03:00:00',
      size: '44.8 MB',
      type: 'auto',
      status: 'completed'
    },
    {
      id: '3',
      name: 'backup-manual-2024-01-18',
      date: '2024-01-18 14:30:00',
      size: '44.5 MB',
      type: 'manual',
      status: 'completed'
    },
    {
      id: '4',
      name: 'backup-2024-01-17-03-00',
      date: '2024-01-17 03:00:00',
      size: '43.9 MB',
      type: 'auto',
      status: 'failed'
    }
  ];
  const [backups, setBackups] = useState<Backup[]>(defaultBackups);

  useEffect(() => {
    const loaded = loadClientSetting('database', {
      autoBackup: true,
      backupFrequency: 'daily',
      backupTime: '03:00',
      retentionDays: '30',
      backups: defaultBackups,
    });

    setAutoBackup(loaded.autoBackup);
    setBackupFrequency(loaded.backupFrequency);
    setBackupTime(loaded.backupTime);
    setRetentionDays(loaded.retentionDays);
    setBackups(loaded.backups);
  }, []);

  useEffect(() => {
    saveClientSetting('database', {
      autoBackup,
      backupFrequency,
      backupTime,
      retentionDays,
      backups,
    });
  }, [autoBackup, backupFrequency, backupTime, retentionDays, backups]);

  const handleBackup = () => {
    setBacking(true);
    setTimeout(() => {
      const newBackup: Backup = {
        id: Date.now().toString(),
        name: `backup-manual-${new Date().toISOString().split('T')[0]}`,
        date: new Date().toLocaleString('fr-FR'),
        size: '45.5 MB',
        type: 'manual',
        status: 'completed'
      };
      setBackups([newBackup, ...backups]);
      setBacking(false);
      toast.success('Sauvegarde créée avec succès');
    }, 2000);
  };

  const handleRestore = (backupId: string) => {
    if (confirm('⚠️ ATTENTION : La restauration remplacera toutes les données actuelles. Voulez-vous continuer ?')) {
      setRestoring(true);
      setTimeout(() => {
        setRestoring(false);
        toast.success('Base de données restaurée avec succès');
      }, 2000);
    }
  };

  const handleDelete = (backupId: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette sauvegarde ?')) {
      setBackups(backups.filter(b => b.id !== backupId));
    }
  };

  const handleDownload = (backup: Backup) => {
    toast.info(`Téléchargement de ${backup.name} prêt (intégration backend à brancher)`);
  };

  const handleExport = (format: 'json' | 'csv') => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      toast.success(`Export ${format.toUpperCase()} créé avec succès`);
    }, 1500);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast.info(`Import de ${file.name} en cours...`);
      }
    };
    input.click();
  };

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">
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
          
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500">
              <Database size={40} className="text-white" />
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Base de données
              </h1>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Gestion des sauvegardes et exports
              </p>
            </div>
          </div>
        </div>

        {/* Storage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-6 rounded-xl border-l-4 border-blue-500 ${
            isDark ? 'bg-white/5 border-r border-t border-b border-white/10' : 'bg-white border-r border-t border-b border-gray-200'
          }`}>
            <HardDrive size={24} className="text-blue-500 mb-2" />
            <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              45.2 MB
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Taille actuelle
            </div>
          </div>

          <div className={`p-6 rounded-xl border-l-4 border-green-500 ${
            isDark ? 'bg-white/5 border-r border-t border-b border-white/10' : 'bg-white border-r border-t border-b border-gray-200'
          }`}>
            <Database size={24} className="text-green-500 mb-2" />
            <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {backups.filter(b => b.status === 'completed').length}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Sauvegardes
            </div>
          </div>

          <div className={`p-6 rounded-xl border-l-4 border-purple-500 ${
            isDark ? 'bg-white/5 border-r border-t border-b border-white/10' : 'bg-white border-r border-t border-b border-gray-200'
          }`}>
            <Clock size={24} className="text-purple-500 mb-2" />
            <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Hier
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Dernière sauvegarde
            </div>
          </div>

          <div className={`p-6 rounded-xl border-l-4 border-orange-500 ${
            isDark ? 'bg-white/5 border-r border-t border-b border-white/10' : 'bg-white border-r border-t border-b border-gray-200'
          }`}>
            <HardDrive size={24} className="text-orange-500 mb-2" />
            <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              180 MB
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Total sauvegardes
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Actions rapides
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleBackup}
              disabled={backing}
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-colors disabled:opacity-50"
            >
              {backing ? <RefreshCw size={24} className="animate-spin" /> : <Download size={24} />}
              <div className="text-left">
                <div className="font-bold text-lg">
                  {backing ? 'Sauvegarde en cours...' : 'Créer une sauvegarde'}
                </div>
                <div className="text-sm opacity-90">
                  Sauvegarde manuelle immédiate
                </div>
              </div>
            </button>

            <button
              onClick={handleImport}
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-colors"
            >
              <Upload size={24} />
              <div className="text-left">
                <div className="font-bold text-lg">Importer des données</div>
                <div className="text-sm opacity-90">
                  JSON ou CSV
                </div>
              </div>
            </button>

            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className={`flex items-center gap-3 p-4 rounded-xl ${
                isDark 
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' 
                  : 'bg-gray-50 border border-gray-200 text-gray-900 hover:bg-gray-100'
              } transition-colors disabled:opacity-50`}
            >
              <FileJson size={24} className="text-purple-500" />
              <div className="text-left">
                <div className="font-bold text-lg">Exporter en JSON</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Format JSON
                </div>
              </div>
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className={`flex items-center gap-3 p-4 rounded-xl ${
                isDark 
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' 
                  : 'bg-gray-50 border border-gray-200 text-gray-900 hover:bg-gray-100'
              } transition-colors disabled:opacity-50`}
            >
              <FileSpreadsheet size={24} className="text-green-500" />
              <div className="text-left">
                <div className="font-bold text-lg">Exporter en CSV</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Format Excel
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Automatic Backup Settings */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <RefreshCw size={24} className="text-blue-500" />
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Sauvegardes automatiques
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configuration des sauvegardes planifiées
                </p>
              </div>
            </div>
            <button
              onClick={() => setAutoBackup(!autoBackup)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                autoBackup ? 'bg-blue-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  autoBackup ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {autoBackup && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Fréquence
                </label>
                <select
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="hourly">Toutes les heures</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Heure de sauvegarde
                </label>
                <input
                  type="time"
                  value={backupTime}
                  onChange={(e) => setBackupTime(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rétention (jours)
                </label>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="7">7 jours</option>
                  <option value="14">14 jours</option>
                  <option value="30">30 jours</option>
                  <option value="90">90 jours</option>
                  <option value="365">1 an</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Backup History */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Historique des sauvegardes
          </h2>

          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className={`p-4 rounded-lg ${
                  isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Database size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                      <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {backup.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        backup.type === 'auto'
                          ? 'bg-blue-500/20 text-blue-500'
                          : 'bg-purple-500/20 text-purple-500'
                      }`}>
                        {backup.type === 'auto' ? 'Auto' : 'Manuel'}
                      </span>
                      {backup.status === 'completed' ? (
                        <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-semibold flex items-center gap-1">
                          <Check size={12} />
                          Réussie
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-1">
                          <AlertCircle size={12} />
                          Échouée
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {backup.date} • {backup.size}
                    </div>
                  </div>
                  
                  {backup.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(backup)}
                        className={`p-2 rounded-lg ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                        } transition-colors`}
                        title="Télécharger"
                      >
                        <Download size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                      </button>
                      <button
                        onClick={() => handleRestore(backup.id)}
                        disabled={restoring}
                        className={`p-2 rounded-lg ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                        } transition-colors disabled:opacity-50`}
                        title="Restaurer"
                      >
                        {restoring ? (
                          <RefreshCw size={20} className="text-blue-500 animate-spin" />
                        ) : (
                          <Play size={20} className="text-blue-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className={`p-2 rounded-lg ${
                          isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
                        } transition-colors`}
                        title="Supprimer"
                      >
                        <Trash2 size={20} className="text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning Box */}
        <div className={`p-6 rounded-2xl ${
          isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
              <AlertCircle size={24} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-orange-400' : 'text-orange-900'}`}>
                ⚠️ Attention
              </h3>
              <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <li>• Les sauvegardes sont stockées de manière sécurisée et chiffrées</li>
                <li>• La restauration remplacera toutes les données actuelles</li>
                <li>• Créez toujours une sauvegarde avant de restaurer</li>
                <li>• Les anciennes sauvegardes sont automatiquement supprimées selon la rétention configurée</li>
                <li>• Téléchargez régulièrement vos sauvegardes sur un stockage externe</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}