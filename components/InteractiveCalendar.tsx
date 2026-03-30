'use client';

import { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import { format, isSameDay, isWithinInterval, addDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useBNB, Booking, MaintenanceTask } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Wrench,
  Lock,
  Unlock,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  Home,
  Eye,
  Trash2,
  Edit
} from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

type ViewMode = 'month' | 'year';
type EventType = 'booking' | 'maintenance' | 'blocked';

interface CalendarEvent {
  id: string | number;
  type: EventType;
  startDate: Date;
  endDate: Date;
  title: string;
  color: string;
  data: Booking | MaintenanceTask | any;
}

export default function InteractiveCalendar() {
  const { properties, bookings, maintenanceTasks, updateProperty } = useBNB();
  const { isDark } = useTheme();

  const [selectedPropertyId, setSelectedPropertyId] = useState<number>(
    properties.length > 0 ? properties[0].id : 0
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [selectedRange, setSelectedRange] = useState<Date[] | null>(null);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Construire tous les événements du calendrier
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // 1. Réservations
    bookings
      .filter(b => b.propertyId === selectedPropertyId && b.status !== 'cancelled')
      .forEach(booking => {
        allEvents.push({
          id: booking.id,
          type: 'booking',
          startDate: parseISO(booking.checkIn),
          endDate: parseISO(booking.checkOut),
          title: booking.guestInfo.name,
          color: booking.status === 'confirmed' ? '#3b82f6' : booking.status === 'completed' ? '#10b981' : '#f59e0b',
          data: booking
        });
      });

    // 2. Tâches de maintenance
    maintenanceTasks
      .filter(t => t.propertyId === selectedPropertyId)
      .forEach(task => {
        allEvents.push({
          id: task.id,
          type: 'maintenance',
          startDate: parseISO(task.scheduledDate),
          endDate: parseISO(task.scheduledDate),
          title: task.title,
          color: task.priority === 'urgent' ? '#ef4444' : task.status === 'completed' ? '#10b981' : '#8b5cf6',
          data: task
        });
      });

    // 3. Dates bloquées
    if (selectedProperty?.availabilityCalendar) {
      selectedProperty.availabilityCalendar
        .filter(slot => slot.status === 'blocked')
        .forEach((slot, index) => {
          allEvents.push({
            id: `blocked-${index}`,
            type: 'blocked',
            startDate: parseISO(slot.startDate),
            endDate: parseISO(slot.endDate),
            title: 'Bloqué',
            color: '#ef4444',
            data: slot
          });
        });
    }

    return allEvents;
  }, [bookings, maintenanceTasks, selectedPropertyId, selectedProperty]);

  // Obtenir les événements pour une date donnée
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      if (isSameDay(event.startDate, date) || isSameDay(event.endDate, date)) {
        return true;
      }
      return isWithinInterval(date, { start: event.startDate, end: event.endDate });
    });
  };

  // Personnaliser l'affichage des tuiles du calendrier
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 0) return null;

    return (
      <div className="flex flex-col gap-0.5 mt-1">
        {dayEvents.slice(0, 3).map((event, index) => (
          <div
            key={`${event.id}-${index}`}
            className="w-full h-1 rounded-full"
            style={{ backgroundColor: event.color }}
          />
        ))}
        {dayEvents.length > 3 && (
          <div className="text-[10px] text-center font-bold" style={{ color: isDark ? '#fff' : '#000' }}>
            +{dayEvents.length - 3}
          </div>
        )}
      </div>
    );
  };

  // Personnaliser les classes CSS des tuiles
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';

    const dayEvents = getEventsForDate(date);
    const classes = ['calendar-tile'];

    if (dayEvents.some(e => e.type === 'booking')) {
      classes.push('has-booking');
    }
    if (dayEvents.some(e => e.type === 'maintenance')) {
      classes.push('has-maintenance');
    }
    if (dayEvents.some(e => e.type === 'blocked')) {
      classes.push('is-blocked');
    }

    return classes.join(' ');
  };

  // Gérer le clic sur une date
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    setSelectedEvents(dayEvents);
    if (dayEvents.length > 0) {
      setShowEventDetails(true);
    }
  };

  // Bloquer des dates
  const handleBlockDates = () => {
    if (!blockStartDate || !blockEndDate || !selectedProperty) return;

    const updatedCalendar = [...(selectedProperty.availabilityCalendar || [])];
    updatedCalendar.push({
      id: Date.now(),
      propertyId: selectedPropertyId,
      startDate: blockStartDate,
      endDate: blockEndDate,
      status: 'blocked',
      notes: blockReason
    });

    updateProperty(selectedPropertyId, {
      ...selectedProperty,
      availabilityCalendar: updatedCalendar
    });

    setShowBlockModal(false);
    setBlockStartDate('');
    setBlockEndDate('');
    setBlockReason('');
  };

  // Statistiques du mois
  const monthStats = useMemo(() => {
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    const monthBookings = bookings.filter(b => {
      const checkIn = parseISO(b.checkIn);
      return (
        b.propertyId === selectedPropertyId &&
        checkIn.getMonth() === currentMonth &&
        checkIn.getFullYear() === currentYear &&
        b.status !== 'cancelled'
      );
    });

    const monthTasks = maintenanceTasks.filter(t => {
      const scheduled = parseISO(t.scheduledDate);
      return (
        t.propertyId === selectedPropertyId &&
        scheduled.getMonth() === currentMonth &&
        scheduled.getFullYear() === currentYear
      );
    });

    return {
      bookings: monthBookings.length,
      tasks: monthTasks.length,
      revenue: monthBookings.reduce((sum, b) => sum + b.totalPrice, 0),
      pendingTasks: monthTasks.filter(t => t.status === 'pending').length
    };
  }, [selectedDate, bookings, maintenanceTasks, selectedPropertyId]);

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-[#1a1a2e]' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              📅 Calendrier Interactif
            </h1>
            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Gérez vos réservations, maintenances et disponibilités
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
              className={`px-4 py-2 rounded-xl border transition-all ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <Button
              variant="primary"
              icon={Lock}
              onClick={() => setShowBlockModal(true)}
            >
              Bloquer des dates
            </Button>
          </div>
        </div>

        {/* Statistiques du mois */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={`p-4 ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Réservations</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {monthStats.bookings}
                </p>
              </div>
            </div>
          </Card>

          <Card className={`p-4 ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Revenus</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {monthStats.revenue}€
                </p>
              </div>
            </div>
          </Card>

          <Card className={`p-4 ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Wrench className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Maintenances</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {monthStats.tasks}
                </p>
              </div>
            </div>
          </Card>

          <Card className={`p-4 ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>En attente</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {monthStats.pendingTasks}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Calendrier principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className={`p-6 ${isDark ? 'bg-white/5' : 'bg-white'}`}>
              <style jsx global>{`
                .react-calendar {
                  width: 100%;
                  border: none;
                  font-family: inherit;
                  background: transparent;
                }
                .react-calendar__navigation {
                  display: flex;
                  height: 44px;
                  margin-bottom: 1em;
                }
                .react-calendar__navigation button {
                  min-width: 44px;
                  background: ${isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb'};
                  border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
                  color: ${isDark ? '#fff' : '#1f2937'};
                  border-radius: 0.75rem;
                  font-size: 16px;
                  font-weight: 600;
                  transition: all 0.2s;
                }
                .react-calendar__navigation button:enabled:hover {
                  background: ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
                }
                .react-calendar__navigation button:disabled {
                  opacity: 0.4;
                }
                .react-calendar__month-view__weekdays {
                  text-align: center;
                  text-transform: uppercase;
                  font-weight: 600;
                  font-size: 0.75rem;
                  color: ${isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'};
                  padding-bottom: 1rem;
                }
                .react-calendar__month-view__weekdays__weekday {
                  padding: 0.5em;
                }
                .react-calendar__month-view__days__day {
                  padding: 1rem 0.5rem;
                  border-radius: 0.75rem;
                  transition: all 0.2s;
                  color: ${isDark ? '#fff' : '#1f2937'};
                  position: relative;
                  min-height: 80px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .react-calendar__month-view__days__day:hover {
                  background: ${isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)'};
                  cursor: pointer;
                }
                .react-calendar__tile--active {
                  background: ${isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'};
                  border: 2px solid #6366f1;
                }
                .react-calendar__tile--now {
                  background: ${isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)'};
                }
                .react-calendar__month-view__days__day--neighboringMonth {
                  color: ${isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af'};
                }
                .react-calendar__tile.has-booking {
                  border-left: 3px solid #3b82f6;
                }
                .react-calendar__tile.has-maintenance {
                  border-right: 3px solid #8b5cf6;
                }
                .react-calendar__tile.is-blocked {
                  background: ${isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)'};
                }
              `}</style>

              <Calendar
                onChange={(value) => handleDateClick(value as Date)}
                value={selectedDate}
                locale="fr-FR"
                tileContent={tileContent}
                tileClassName={tileClassName}
                next2Label={null}
                prev2Label={null}
                navigationLabel={({ date }) => format(date, 'MMMM yyyy', { locale: fr })}
              />

              {/* Légende */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Légende
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Réservation
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500" />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Maintenance
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Bloqué
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500" />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Terminé
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Panneau latéral - Événements du jour sélectionné */}
          <div className="space-y-4">
            <Card className={`p-6 ${isDark ? 'bg-white/5' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {format(selectedDate, 'd MMMM yyyy', { locale: fr })}
                </h3>
                <CalendarIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </div>

              {selectedEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Aucun événement ce jour
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((event, index) => (
                    <motion.div
                      key={`${event.id}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl border ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {event.title}
                          </p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {event.type === 'booking' && '👤 Réservation'}
                            {event.type === 'maintenance' && '🔧 Maintenance'}
                            {event.type === 'blocked' && '🔒 Bloqué'}
                          </p>
                          {event.type === 'booking' && (
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                              {format(event.startDate, 'dd/MM')} → {format(event.endDate, 'dd/MM')}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Modal de blocage de dates */}
        <AnimatePresence>
          {showBlockModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowBlockModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${
                  isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } rounded-2xl shadow-2xl w-full max-w-md`}
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Bloquer des dates</h3>
                    <button
                      onClick={() => setShowBlockModal(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={blockStartDate}
                      onChange={(e) => setBlockStartDate(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={blockEndDate}
                      onChange={(e) => setBlockEndDate(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Raison (optionnel)
                    </label>
                    <textarea
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      rows={3}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Ex: Travaux de rénovation"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowBlockModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleBlockDates}
                    icon={Lock}
                    disabled={!blockStartDate || !blockEndDate}
                  >
                    Bloquer
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
