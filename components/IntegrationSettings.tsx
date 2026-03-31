'use client';

import { useState } from 'react';
import { Save, RefreshCw, Link } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function IntegrationSettings() {
  const { isDark } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingAirbnb, setIsTestingAirbnb] = useState(false);
  const [isTestingBooking, setIsTestingBooking] = useState(false);
  const [message, setMessage] = useState('');

  // Airbnb
  const [airbnbEnabled, setAirbnbEnabled] = useState(false);
  const [airbnbIcalUrl, setAirbnbIcalUrl] = useState('');
  
  // Booking.com
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [bookingHotelId, setBookingHotelId] = useState('');
  const [bookingUsername, setBookingUsername] = useState('');
  const [bookingPassword, setBookingPassword] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airbnb: {
            enabled: airbnbEnabled,
            credentials: { icalUrl: airbnbIcalUrl }
          },
          booking: {
            enabled: bookingEnabled,
            credentials: {
              hotelId: bookingHotelId,
              username: bookingUsername,
              password: bookingPassword
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to save');

      setMessage('✅ Paramètres sauvegardés avec succès !');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const testAirbnbConnection = async () => {
    setIsTestingAirbnb(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/integrations/airbnb/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { icalUrl: airbnbIcalUrl }
        })
      });

      const data = await response.json();
      setMessage(data.success ? '✅ Connexion Airbnb réussie !' : `❌ ${data.error}`);
    } catch (error) {
      setMessage('❌ Erreur de connexion Airbnb');
    } finally {
      setIsTestingAirbnb(false);
    }
  };

  const testBookingConnection = async () => {
    setIsTestingBooking(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/integrations/booking/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { 
            hotelId: bookingHotelId, 
            username: bookingUsername, 
            password: bookingPassword 
          }
        })
      });

      const data = await response.json();
      setMessage(data.success ? '✅ Connexion Booking réussie !' : `❌ ${data.error}`);
    } catch (error) {
      setMessage('❌ Erreur de connexion Booking');
    } finally {
      setIsTestingBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl ${message.includes('✅') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {message}
        </div>
      )}

      {/* Airbnb */}
      <div className={`glass-pro rounded-2xl p-6 ${isDark ? '' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#FF385C] to-[#E31C5F] flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Airbnb</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Synchronisation via iCal</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={airbnbEnabled}
              onChange={(e) => setAirbnbEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF385C]"></div>
          </label>
        </div>

        {airbnbEnabled && (
          <div className="space-y-4 animate-fadeInUp">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                URL iCal
              </label>
              <input
                type="url"
                value={airbnbIcalUrl}
                onChange={(e) => setAirbnbIcalUrl(e.target.value)}
                placeholder="https://www.airbnb.com/calendar/ical/XXXXX.ics"
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                📍 Trouvez votre URL iCal : Airbnb → Annonce → Calendrier → Exporter le calendrier
              </p>
            </div>
            <button
              onClick={testAirbnbConnection}
              disabled={isTestingAirbnb || !airbnbIcalUrl}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 transition-all"
            >
              {isTestingAirbnb ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Link size={16} />
              )}
              {isTestingAirbnb ? 'Test en cours...' : 'Tester la connexion'}
            </button>
          </div>
        )}
      </div>

      {/* Booking.com */}
      <div className={`glass-pro rounded-2xl p-6 ${isDark ? '' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Booking.com</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>API XML</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={bookingEnabled}
              onChange={(e) => setBookingEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {bookingEnabled && (
          <div className="space-y-4 animate-fadeInUp">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Hotel ID
              </label>
              <input
                type="text"
                value={bookingHotelId}
                onChange={(e) => setBookingHotelId(e.target.value)}
                placeholder="12345678"
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Username
              </label>
              <input
                type="text"
                value={bookingUsername}
                onChange={(e) => setBookingUsername(e.target.value)}
                placeholder="votre-username"
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Password
              </label>
              <input
                type="password"
                value={bookingPassword}
                onChange={(e) => setBookingPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <button
              onClick={testBookingConnection}
              disabled={isTestingBooking || !bookingHotelId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {isTestingBooking ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Link size={16} />
              )}
              {isTestingBooking ? 'Test en cours...' : 'Tester la connexion'}
            </button>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:shadow-xl disabled:opacity-50 transition-all"
      >
        {isSaving ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            Sauvegarde en cours...
          </>
        ) : (
          <>
            <Save size={16} />
            Sauvegarder les paramètres
          </>
        )}
      </button>
    </div>
  );
}
