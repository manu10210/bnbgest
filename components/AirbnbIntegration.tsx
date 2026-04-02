/**
 * 🏠 Airbnb Integration Component
 * Interface utilisateur pour gérer l'intégration Airbnb
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Link2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Home,
  Calendar,
  MessageSquare,
  DollarSign,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStats {
  listings?: { synced: number; created: number; updated: number };
  reservations?: { synced: number; created: number; updated: number };
}

export default function AirbnbIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error' | null>(null);
  const [stats, setStats] = useState<SyncStats>({});

  // Charger le statut au montage
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/settings/integrations');
      if (response.ok) {
        const data = await response.json();
        const airbnbSettings = data.settings?.airbnb;
        if (airbnbSettings) {
          setIsConnected(airbnbSettings.enabled);
          setLastSync(airbnbSettings.lastSync ? new Date(airbnbSettings.lastSync) : null);
        }
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/integrations/airbnb/connect');
      const data = await response.json();

      if (data.success && data.authUrl) {
        // Rediriger vers la page d'autorisation Airbnb
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || 'Failed to initiate connection');
      }
    } catch (error) {
      toast.error('Connection failed');
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncListings = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/integrations/airbnb/listings');
      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Synced ${data.stats.synced} listings (${data.stats.created} created, ${data.stats.updated} updated)`);
        setStats(prev => ({ ...prev, listings: data.stats }));
        setSyncStatus('success');
        setLastSync(new Date());
      } else {
        toast.error(data.error || 'Sync failed');
        setSyncStatus('error');
      }
    } catch (error) {
      toast.error('Sync failed');
      setSyncStatus('error');
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncReservations = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/integrations/airbnb/reservations');
      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Synced ${data.stats.synced} reservations (${data.stats.created} created, ${data.stats.updated} updated)`);
        setStats(prev => ({ ...prev, reservations: data.stats }));
        setSyncStatus('success');
        setLastSync(new Date());
      } else {
        toast.error(data.error || 'Sync failed');
        setSyncStatus('error');
      }
    } catch (error) {
      toast.error('Sync failed');
      setSyncStatus('error');
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    await handleSyncListings();
    await handleSyncReservations();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF385C] to-[#E61E4D] rounded-xl flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Airbnb API Integration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connect and sync your Airbnb listings and reservations
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Connected
            </span>
          </div>
        )}
      </div>

      {/* Status Card */}
      {isConnected ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6"
        >
          {/* Last Sync */}
          {lastSync && (
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last synchronization</p>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                  {lastSync.toLocaleString()}
                </p>
              </div>
              {syncStatus === 'success' && (
                <CheckCircle className="w-6 h-6 text-green-500" />
              )}
              {syncStatus === 'error' && (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
            </div>
          )}

          {/* Statistics */}
          {(stats.listings || stats.reservations) && (
            <div className="grid grid-cols-2 gap-4">
              {stats.listings && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.listings.synced}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Listings synced</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {stats.listings.created} created, {stats.listings.updated} updated
                  </p>
                </div>
              )}

              {stats.reservations && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {stats.reservations.synced}
                    </span>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Reservations synced</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {stats.reservations.created} created, {stats.reservations.updated} updated
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSyncListings}
              disabled={isSyncing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSyncing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Home className="w-5 h-5" />
              )}
              <span>Sync Listings</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSyncReservations}
              disabled={isSyncing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSyncing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
              <span>Sync Reservations</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#FF385C] to-[#E61E4D] text-white rounded-lg font-medium hover:from-[#E61E4D] hover:to-[#D11B47] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSyncing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              <span>Sync All</span>
            </motion.button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Listings Sync</p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Calendar Sync</p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Messages</p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Dynamic Pricing</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start space-x-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Automatic Synchronization</p>
              <p className="text-blue-600 dark:text-blue-400">
                Your Airbnb listings and reservations are automatically synced every hour via cron job.
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        // Connection Card
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#FF385C] to-[#E61E4D] rounded-xl p-8 text-white"
        >
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto">
              <Link2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-2">Connect Your Airbnb Account</h3>
              <p className="text-white/80">
                Sync your Airbnb listings, reservations, and calendar in real-time.
                Manage everything from one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Auto Sync</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Real-time Updates</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Secure OAuth</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Webhooks</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConnect}
              disabled={isConnecting}
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-[#FF385C] rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5" />
                  <span>Connect with Airbnb</span>
                </>
              )}
            </motion.button>

            <p className="text-xs text-white/60">
              You'll be redirected to Airbnb to authorize access. Your credentials are never stored.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
