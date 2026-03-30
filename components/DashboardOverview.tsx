'use client';

import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  BarChart3,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';

export default function DashboardOverview() {
  const { bookings, guests, properties, maintenanceTasks } = useBNB();
  const { isDark } = useTheme();

  // Calculate Stats
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  const activeBookings = bookings.filter(b => {
    const today = new Date();
    const start = new Date(b.checkIn);
    const end = new Date(b.checkOut);
    return start <= today && end >= today && b.status === 'confirmed';
  }).length;

  const pendingMaintenance = maintenanceTasks.filter(t => t.status !== 'completed').length;
  const occupancyRate = properties.length > 0 ? (activeBookings / properties.length) * 100 : 0;

  // Mock data for charts
  const revenueData = [
    { name: 'Lun', value: 4000 },
    { name: 'Mar', value: 3000 },
    { name: 'Mer', value: 2000 },
    { name: 'Jeu', value: 2780 },
    { name: 'Ven', value: 1890 },
    { name: 'Sam', value: 2390 },
    { name: 'Dim', value: 3490 },
  ];

  return (
    <div className="space-y-8 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 pb-2">
            Vue d'ensemble
          </h2>
          <p className={`mt-1 text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Votre cockpit de pilotage en temps réel
          </p>
        </div>
        <div className={`px-6 py-3 rounded-2xl text-sm font-bold border backdrop-blur-xl shadow-lg ${
          isDark ? 'bg-white/[0.03] border-white/[0.08] text-white shadow-indigo-500/10' : 'bg-white/80 border-gray-100 text-gray-700 shadow-xl'
        }`}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Bento Grid Layout - WAOUH Effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Revenue Card - Large & Glowing */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`col-span-1 md:col-span-2 row-span-2 p-8 rounded-[2rem] border relative overflow-hidden group ${
            isDark 
              ? 'bg-[#1a1a2e] border-white/[0.08]' 
              : 'bg-white border-gray-100 shadow-2xl shadow-indigo-100'
          }`}
        >
          {/* Background Gradient Blurs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-500/30 transition-all duration-700" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] group-hover:bg-purple-500/30 transition-all duration-700" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'} backdrop-blur-md`}>
                    <Wallet className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <h3 className={`font-bold text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Revenu Total</h3>
                </div>
                <div className="text-5xl font-black tracking-tight" style={{ 
                  color: isDark ? '#fff' : '#1a1a1a'
                }}>
                  {totalRevenue.toLocaleString('fr-FR')} <span className="text-2xl text-gray-400 font-bold">€</span>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
                isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <TrendingUp className="w-4 h-4" /> +24%
              </div>
            </div>

            <div className="h-[250px] w-full mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1a1a2e' : '#fff', 
                      borderRadius: '16px', 
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none', 
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ color: '#6366f1', fontWeight: 600, marginBottom: '4px' }}
                    itemStyle={{ color: isDark ? '#fff' : '#1a1a1a', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Stats Card: Active Bookings */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`p-6 rounded-[2rem] border relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${
            isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100 shadow-xl shadow-blue-100/50'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          
          <div className="flex items-center gap-4 mb-6 relative">
            <div className={`p-4 rounded-2xl ${
              isDark ? 'bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-blue-50 text-blue-600'
            }`}>
              <Calendar className="w-6 h-6" />
            </div>
            <span className={`text-md font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Réservations</span>
          </div>
          
          <div className="relative">
            <div className={`text-4xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeBookings}</div>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-500">
              <Activity className="w-4 h-4" /> En cours
            </div>
          </div>
        </motion.div>

        {/* Stats Card: Occupancy */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`p-6 rounded-[2rem] border relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${
            isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100 shadow-xl shadow-orange-100/50'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          
          <div className="flex items-center gap-4 mb-6 relative">
            <div className={`p-4 rounded-2xl ${
              isDark ? 'bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-orange-50 text-orange-600'
            }`}>
              <Users className="w-6 h-6" />
            </div>
            <span className={`text-md font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Occupation</span>
          </div>
          
          <div className="relative">
            <div className={`text-4xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.round(occupancyRate)}%</div>
            <div className="w-full bg-gray-200/20 rounded-full h-1.5 mt-2">
              <div 
                className="bg-gradient-to-r from-orange-400 to-orange-600 h-1.5 rounded-full" 
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Card: Maintenance */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`p-6 rounded-[2rem] border relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${
            isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100 shadow-xl shadow-rose-100/50'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          
          <div className="flex items-center gap-4 mb-6 relative">
            <div className={`p-4 rounded-2xl ${
              isDark ? 'bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-rose-50 text-rose-600'
            }`}>
              <Zap className="w-6 h-6" />
            </div>
            <span className={`text-md font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Maintenance</span>
          </div>
          
          <div className="relative">
            <div className={`text-4xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{pendingMaintenance}</div>
            <div className="flex items-center gap-2 text-sm text-rose-500 font-bold">
              <AlertCircle className="w-4 h-4" /> &Agrave; traiter
            </div>
          </div>
        </motion.div>

        {/* Recent Activity List - Stylish */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`col-span-1 md:col-span-2 row-span-1 p-8 rounded-[2rem] border ${
            isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100 shadow-xl'
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Activités Récentes</h3>
            <button className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}>
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {bookings.slice(0, 3).map((booking, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-2xl transition-all hover:scale-[1.02] ${
                isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
                    i % 3 === 0 ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-indigo-500/30' : 
                    i % 3 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-purple-500/30' :
                    'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/30'
                  }`}>
                    {booking.guestInfo?.name?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {booking.guestInfo?.name || 'Invité Inconnu'}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Nouvelle réservation • {booking.totalPrice}€
                    </p>
                  </div>
                </div>
                <div className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                  isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
                }`}>
                  Il y a 2h
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
