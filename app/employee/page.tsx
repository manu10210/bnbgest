'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  User,
  Home,
  Navigation,
  ClipboardList,
  Clock,
  BarChart3,
  Search,
  Plus,
  CheckCircle,
  Clock as ClockIcon,
  Euro,
  Star,
  Wrench,
  Calendar,
  AlertTriangle,
  Play,
  Square,
  Eye,
  XCircle
} from 'lucide-react';
import PhotoManager from '../../components/PhotoManager';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface Task {
  id: number;
  propertyId: number;
  property: string;
  description: string;
  date: string;
  status: string;
  assignedTo: string;
  priority: string;
  cost: number;
  notes: string;
  timeSpent?: number; // en minutes
  startedAt?: string;
  completedAt?: string;
}

interface TimeEntry {
  id: number;
  taskId: number;
  date: string;
  hours: number;
  description: string;
}

interface EmployeeStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  totalHours: number;
  avgTaskTime: number;
  monthlyEarnings: number;
  rating: number;
}

export default function EmployeePage() {
  const employeeName = 'Employee1'; // Nom de l'employé connecté
  const [activeTab, setActiveTab] = useState('tasks');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [currentTimeEntry, setCurrentTimeEntry] = useState({
    taskId: 0,
    hours: 0,
    description: ''
  });
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([
    { id: 1, taskId: 1, date: '2026-03-20', hours: 2.5, description: 'Nettoyage complet appartement' },
    { id: 2, taskId: 3, date: '2026-03-25', hours: 1.5, description: 'Changement literie' },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, propertyId: 1, property: 'Appartement Paris', description: 'Nettoyage complet après départ des locataires', date: '2026-03-20', status: 'Planifiée', assignedTo: 'Employee1', priority: 'normal', cost: 50, notes: 'Utiliser produits écologiques', timeSpent: 150 },
    { id: 2, propertyId: 2, property: 'Maison Lyon', description: 'Réparation fuite dans la salle de bain', date: '2026-03-22', status: 'En cours', assignedTo: 'Employee1', priority: 'urgent', cost: 120, notes: 'Fuite importante sous le lavabo', startedAt: '2026-03-22T09:00' },
    { id: 3, propertyId: 1, property: 'Appartement Paris', description: 'Changement complet de la literie', date: '2026-03-25', status: 'Terminée', assignedTo: 'Employee1', priority: 'normal', cost: 30, notes: 'Draps neufs, oreillers changés', timeSpent: 90, completedAt: '2026-03-25T11:30' },
    { id: 4, propertyId: 3, property: 'Studio Marseille', description: 'Révision climatisation', date: '2026-03-28', status: 'Planifiée', assignedTo: 'Employee1', priority: 'low', cost: 80, notes: 'Vérifier filtres et niveau gaz' },
  ]);

  const myTasks = tasks.filter(t => t.assignedTo === employeeName);

  const filteredTasks = myTasks.filter(task => {
    const matchesSearch = task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.property.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Statistiques de l'employé
  const stats: EmployeeStats = {
    totalTasks: myTasks.length,
    completedTasks: myTasks.filter(t => t.status === 'Terminée').length,
    inProgressTasks: myTasks.filter(t => t.status === 'En cours').length,
    pendingTasks: myTasks.filter(t => t.status === 'Planifiée').length,
    totalHours: timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
    avgTaskTime: myTasks.filter(t => t.timeSpent).length > 0
      ? myTasks.filter(t => t.timeSpent).reduce((sum, t) => sum + (t.timeSpent || 0), 0) / myTasks.filter(t => t.timeSpent).length / 60
      : 0,
    monthlyEarnings: myTasks.filter(t => t.status === 'Terminée').reduce((sum, t) => sum + t.cost, 0),
    rating: 4.8
  };

  const updateTaskStatus = (id: number, status: string) => {
    const now = new Date().toISOString();
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const updatedTask = { ...task, status };
        if (status === 'En cours' && !task.startedAt) {
          updatedTask.startedAt = now;
        } else if (status === 'Terminée' && !task.completedAt) {
          updatedTask.completedAt = now;
          // Calculer le temps passé automatiquement
          if (task.startedAt) {
            const startTime = new Date(task.startedAt).getTime();
            const endTime = new Date(now).getTime();
            updatedTask.timeSpent = Math.round((endTime - startTime) / (1000 * 60)); // en minutes
          }
        }
        return updatedTask;
      }
      return task;
    }));
  };

  const addTimeEntry = () => {
    if (currentTimeEntry.taskId && currentTimeEntry.hours > 0) {
      const newEntry: TimeEntry = {
        id: timeEntries.length + 1,
        taskId: currentTimeEntry.taskId,
        date: new Date().toISOString().split('T')[0],
        hours: currentTimeEntry.hours,
        description: currentTimeEntry.description
      };
      setTimeEntries([...timeEntries, newEntry]);
      setCurrentTimeEntry({ taskId: 0, hours: 0, description: '' });
      setShowTimeModal(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'Planifiée': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-yellow-100 text-yellow-800',
      'Terminée': 'bg-green-100 text-green-800',
      'Annulée': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-[#f7f7f7] text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      normal: 'bg-[#f7f7f7] text-gray-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#f7f7f7]">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm border-b border-gray-100 mb-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] p-3 rounded-xl">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF385C] to-[#E31C5F] bg-clip-text text-transparent">
                  Espace Employé
                </h1>
                <p className="text-[#717171]">Bienvenue, {employeeName}</p>
              </div>
            </div>
            <nav className="flex space-x-4">
              <Link href="/" className="flex items-center text-[#717171] hover:text-[#FF385C] transition-colors">
                <Home className="w-4 h-4 mr-1" />
                Accueil
              </Link>
              <Link href="/admin" className="flex items-center text-[#717171] hover:text-[#FF385C] transition-colors">
                <Navigation className="w-4 h-4 mr-1" />
                Administration
              </Link>
              <Link href="/calendar" className="flex items-center text-[#717171] hover:text-[#FF385C] transition-colors">
                <Calendar className="w-4 h-4 mr-1" />
                Calendrier
              </Link>
              <Link href="/client" className="flex items-center text-[#717171] hover:text-[#FF385C] transition-colors">
                <User className="w-4 h-4 mr-1" />
                Client
              </Link>
            </nav>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Tâches terminées</p>
                  <p className="text-3xl font-bold">{stats.completedTasks}/{stats.totalTasks}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-white/60" />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm">Heures travaillées</p>
                  <p className="text-3xl font-bold">{stats.totalHours.toFixed(1)}h</p>
                </div>
                <ClockIcon className="w-12 h-12 text-pink-200" />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Revenus du mois</p>
                  <p className="text-3xl font-bold">{stats.monthlyEarnings}�,�</p>
                </div>
                <Euro className="w-12 h-12 text-white/60" />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Note moyenne</p>
                  <p className="text-3xl font-bold">{stats.rating}/5</p>
                </div>
                <Star className="w-12 h-12 text-green-200" />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Onglets de navigation */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex space-x-1 mb-6">
              {[
                { id: 'tasks', label: 'Mes tâches', icon: ClipboardList },
                { id: 'time', label: 'Suivi temps', icon: Clock },
                { id: 'reports', label: 'Rapports', icon: BarChart3 }
              ].map(tab => (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  variant={activeTab === tab.id ? 'primary' : 'outline'}
                  className={`flex-1 ${activeTab === tab.id ? 'bg-[#FF385C] text-white shadow-sm transform scale-105' : 'bg-[#f7f7f7] text-[#717171] hover:bg-gray-200'}`}
                  icon={tab.icon}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Barre de recherche et filtres */}
            {activeTab === 'tasks' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher une tâche..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="Planifiée">Planifiée</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminée">Terminée</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                >
                  <option value="all">Toutes priorités</option>
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
                <Button
                  onClick={() => setShowTimeModal(true)}
                  className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:bg-[#E31C5F]"
                  icon={Plus}
                >
                  Ajouter temps
                </Button>
              </motion.div>
            )}
          </div>
        </Card>

        {/* Contenu selon l'onglet actif */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Wrench className="w-5 h-5 text-[#FF385C]" />
                        <h3 className="text-lg font-semibold text-[#222222]">{task.description}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadge(task.priority)} flex items-center`}>
                          {task.priority === 'urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-[#717171] mb-2 flex items-center">
                        <Home className="w-4 h-4 mr-1" />
                        {task.property} - {new Date(task.date).toLocaleDateString('fr-FR')}
                      </p>
                      {task.notes && <p className="text-sm text-[#717171] italic">{task.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                      <div className="text-right">
                        <p className="text-sm text-[#717171] flex items-center">
                          <Euro className="w-3 h-3 mr-1" />
                          Coût: <span className="font-bold text-green-600 ml-1">{task.cost}�,�</span>
                        </p>
                        {task.timeSpent && (
                          <p className="text-sm text-[#717171] flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            Temps: <span className="font-bold ml-1">{formatTime(task.timeSpent)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {task.status === 'Planifiée' && (
                      <Button
                        onClick={() => updateTaskStatus(task.id, 'En cours')}
                        className="bg-yellow-500 hover:bg-yellow-600"
                        icon={Play}
                      >
                        Commencer
                      </Button>
                    )}
                    {task.status === 'En cours' && (
                      <Button
                        onClick={() => updateTaskStatus(task.id, 'Terminée')}
                        className="bg-green-500 hover:bg-green-600"
                        icon={CheckCircle}
                      >
                        Terminer
                      </Button>
                    )}
                    <Button
                      onClick={() => setSelectedTask(task)}
                      variant="outline"
                      icon={Eye}
                    >
                      Détails
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Gestion des photos des tâches */}
        <div className="mt-8">
          <PhotoManager
            entityType="task"
            entityId={1} // Pour l'exemple, on utilise la première tâche de l'employé
            entityName="Mes Tâches"
            onPhotoAdded={(photo) => console.log('Photo ajoutée:', photo)}
            onPhotoDeleted={(photoId) => console.log('Photo supprimée:', photoId)}
          />
        </div>

        {activeTab === 'time' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <Clock className="w-6 h-6 mr-2 text-[#FF385C]" />
                  Suivi du temps de travail
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#ebebeb]">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Tâche</th>
                        <th className="text-left py-3 px-4">Heures</th>
                        <th className="text-left py-3 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map((entry) => {
                        const task = tasks.find(t => t.id === entry.taskId);
                        return (
                          <tr key={entry.id} className="border-b border-gray-100">
                            <td className="py-3 px-4">{new Date(entry.date).toLocaleDateString('fr-FR')}</td>
                            <td className="py-3 px-4">{task?.description || 'Tâche inconnue'}</td>
                            <td className="py-3 px-4">{entry.hours}h</td>
                            <td className="py-3 px-4">{entry.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="text-center">
                  <h4 className="text-lg font-semibold mb-2 flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-[#FF385C]" />
                    Temps moyen par tâche
                  </h4>
                  <p className="text-3xl font-bold text-[#FF385C]">{stats.avgTaskTime.toFixed(1)}h</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="text-center">
                  <h4 className="text-lg font-semibold mb-2 flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-pink-600" />
                    Heures ce mois
                  </h4>
                  <p className="text-3xl font-bold text-pink-600">{stats.totalHours.toFixed(1)}h</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="text-center">
                  <h4 className="text-lg font-semibold mb-2 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Tâches terminées
                  </h4>
                  <p className="text-3xl font-bold text-green-600">{stats.completedTasks}</p>
                </Card>
              </motion.div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2 text-[#FF385C]" />
                  Rapport de performance mensuel
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      <ClipboardList className="w-5 h-5 mr-2 text-[#FF385C]" />
                      Statistiques générales
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total des tâches:</span>
                        <span className="font-bold">{stats.totalTasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tâches terminées:</span>
                        <span className="font-bold text-green-600">{stats.completedTasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tâches en cours:</span>
                        <span className="font-bold text-yellow-600">{stats.inProgressTasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tâches en attente:</span>
                        <span className="font-bold text-blue-600">{stats.pendingTasks}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-[#FF385C]" />
                      Métriques de performance
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Heures travaillées:</span>
                        <span className="font-bold">{stats.totalHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Temps moyen par tâche:</span>
                        <span className="font-bold">{stats.avgTaskTime.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenus générés:</span>
                        <span className="font-bold text-green-600">{stats.monthlyEarnings}�,�</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Note de performance:</span>
                        <span className="font-bold flex items-center">
                          {stats.rating}/5 <Star className="w-4 h-4 ml-1 text-yellow-500" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h4 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-[#FF385C]" />
                  Répartition des tâches par priorité
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-center p-4 bg-blue-50 rounded-lg"
                  >
                    <p className="text-2xl font-bold text-blue-600">{myTasks.filter(t => t.priority === 'low').length}</p>
                    <p className="text-sm text-blue-800">Priorité basse</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center p-4 bg-[#f7f7f7] rounded-lg"
                  >
                    <p className="text-2xl font-bold text-[#717171]">{myTasks.filter(t => t.priority === 'normal').length}</p>
                    <p className="text-sm text-gray-800">Priorité normale</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center p-4 bg-orange-50 rounded-lg"
                  >
                    <p className="text-2xl font-bold text-orange-600">{myTasks.filter(t => t.priority === 'high').length}</p>
                    <p className="text-sm text-orange-800">Priorité haute</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center p-4 bg-red-50 rounded-lg"
                  >
                    <p className="text-2xl font-bold text-red-600 flex items-center justify-center">
                      {myTasks.filter(t => t.priority === 'urgent').length}
                      <AlertTriangle className="w-4 h-4 ml-1" />
                    </p>
                    <p className="text-sm text-red-800">Priorité urgente</p>
                  </motion.div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Modal détails tâche */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl"
            >
              <Card>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#222222] flex items-center">
                        <Wrench className="w-6 h-6 mr-2 text-[#FF385C]" />
                        {selectedTask.description}
                      </h3>
                      <p className="text-[#717171] flex items-center">
                        <Home className="w-4 h-4 mr-1" />
                        {selectedTask.property}
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedTask(null)}
                      variant="ghost"
                      size="sm"
                      icon={XCircle}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <ClipboardList className="w-4 h-4 mr-1 text-[#FF385C]" />
                        Informations générales
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center">
                          <Calendar className="w-3 h-3 mr-2 text-[#717171]" />
                          <span className="font-medium">Date:</span>
                          <span className="ml-2">{new Date(selectedTask.date).toLocaleDateString('fr-FR')}</span>
                        </p>
                        <p className="flex items-center">
                          <span className="font-medium">Statut:</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedTask.status)}`}>
                            {selectedTask.status}
                          </span>
                        </p>
                        <p className="flex items-center">
                          <span className="font-medium">Priorité:</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getPriorityBadge(selectedTask.priority)} flex items-center`}>
                            {selectedTask.priority === 'urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {selectedTask.priority}
                          </span>
                        </p>
                        <p className="flex items-center">
                          <Euro className="w-3 h-3 mr-2 text-green-600" />
                          <span className="font-medium">Coût:</span>
                          <span className="ml-2 text-green-600 font-bold">{selectedTask.cost}�,�</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1 text-[#FF385C]" />
                        Suivi du temps
                      </h4>
                      <div className="space-y-2 text-sm">
                        {selectedTask.startedAt && (
                          <p className="flex items-center">
                            <Play className="w-3 h-3 mr-2 text-green-500" />
                            <span className="font-medium">Début:</span>
                            <span className="ml-2">{new Date(selectedTask.startedAt).toLocaleString('fr-FR')}</span>
                          </p>
                        )}
                        {selectedTask.completedAt && (
                          <p className="flex items-center">
                            <Square className="w-3 h-3 mr-2 text-red-500" />
                            <span className="font-medium">Fin:</span>
                            <span className="ml-2">{new Date(selectedTask.completedAt).toLocaleString('fr-FR')}</span>
                          </p>
                        )}
                        {selectedTask.timeSpent && (
                          <p className="flex items-center">
                            <ClockIcon className="w-3 h-3 mr-2 text-blue-500" />
                            <span className="font-medium">Temps passé:</span>
                            <span className="ml-2 font-bold">{formatTime(selectedTask.timeSpent)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedTask.notes && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-[#222222] bg-[#f7f7f7] p-3 rounded-lg">{selectedTask.notes}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    {selectedTask.status === 'Planifiée' && (
                      <Button
                        onClick={() => {
                          updateTaskStatus(selectedTask.id, 'En cours');
                          setSelectedTask(null);
                        }}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                        icon={Play}
                      >
                        Commencer la tâche
                      </Button>
                    )}
                    {selectedTask.status === 'En cours' && (
                      <Button
                        onClick={() => {
                          updateTaskStatus(selectedTask.id, 'Terminée');
                          setSelectedTask(null);
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        icon={CheckCircle}
                      >
                        Marquer terminée
                      </Button>
                    )}
                    <Button
                      onClick={() => setSelectedTask(null)}
                      variant="outline"
                      className="flex-1"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Modal ajout temps */}
        {showTimeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Card>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-6 flex items-center">
                    <Plus className="w-6 h-6 mr-2 text-[#FF385C]" />
                    Ajouter du temps travaillé
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#222222] mb-2 flex items-center">
                        <Wrench className="w-4 h-4 mr-1" />
                        Tâche
                      </label>
                      <select
                        value={currentTimeEntry.taskId}
                        onChange={(e) => setCurrentTimeEntry({ ...currentTimeEntry, taskId: parseInt(e.target.value) })}
                        className="w-full p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                      >
                        <option value={0}>Sélectionner une tâche</option>
                        {myTasks.map(task => (
                          <option key={task.id} value={task.id}>{task.description}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#222222] mb-2 flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        Heures travaillées
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0.0"
                        value={currentTimeEntry.hours || ''}
                        onChange={(e) => setCurrentTimeEntry({ ...currentTimeEntry, hours: parseFloat(e.target.value) || 0 })}
                        className="w-full p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#222222] mb-2 flex items-center">
                        <ClipboardList className="w-4 h-4 mr-1" />
                        Description du travail
                      </label>
                      <textarea
                        placeholder="Décrivez le travail effectué..."
                        value={currentTimeEntry.description}
                        onChange={(e) => setCurrentTimeEntry({ ...currentTimeEntry, description: e.target.value })}
                        className="w-full p-3 border border-[#dddddd] rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <Button
                      onClick={addTimeEntry}
                      className="flex-1 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:bg-[#E31C5F]"
                      icon={Plus}
                    >
                      Ajouter
                    </Button>
                    <Button
                      onClick={() => setShowTimeModal(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}


