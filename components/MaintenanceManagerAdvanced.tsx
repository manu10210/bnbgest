'use client';

import { useState, useMemo, useEffect } from 'react';
import { useBNB, MaintenanceTask, Property } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, AlertTriangle, Calendar, Home, Play, CheckCircle,
  Clock, DollarSign, FileText, Image, Repeat, Users,
  Download, Upload, Filter, TrendingUp, Bell, Settings,
  ChevronDown, ChevronRight, Paperclip, Star, BarChart,
  PieChart, LineChart, Phone, Mail, MapPin, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== INTERFACES AVANCÉES ====================

interface Supplier {
  id: number;
  name: string;
  category: 'plumbing' | 'electrical' | 'cleaning' | 'gardening' | 'general';
  phone: string;
  email: string;
  address: string;
  rating: number;
  completedJobs: number;
  totalCost: number;
  notes: string;
}

interface TaskTemplate {
  id: number;
  name: string;
  category: MaintenanceTask['category'];
  priority: MaintenanceTask['priority'];
  description: string;
  estimatedCost: number;
  estimatedDuration: number; // en heures
  checklistItems: string[];
}

interface RecurringRule {
  id: number;
  taskTemplateId: number;
  propertyId: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6 pour weekly
  dayOfMonth?: number; // 1-31 pour monthly
  monthOfYear?: number; // 1-12 pour yearly
  nextDueDate: string;
  autoCreate: boolean;
  active: boolean;
}

interface Attachment {
  id: number;
  taskId: number;
  type: 'image' | 'document' | 'invoice';
  name: string;
  url: string;
  uploadedAt: string;
  size: number; // en bytes
}

interface TaskHistory {
  id: number;
  taskId: number;
  action: 'created' | 'updated' | 'started' | 'completed' | 'cancelled' | 'comment';
  user: string;
  timestamp: string;
  details: string;
  oldValue?: string;
  newValue?: string;
}

interface MaintenanceStats {
  totalTasks: number;
  completedTasks: number;
  avgCompletionTime: number; // en jours
  totalCost: number;
  avgCost: number;
  costVariance: number; // % différence estimé vs réel
  onTimeCompletion: number; // %
  overdueCount: number;
  byCategory: Record<MaintenanceTask['category'], number>;
  byPriority: Record<MaintenanceTask['priority'], number>;
  byProperty: Record<number, { count: number; cost: number }>;
  monthlyTrend: { month: string; count: number; cost: number }[];
}

interface NotificationRule {
  id: number;
  type: 'overdue' | 'upcoming' | 'highCost' | 'recurring';
  enabled: boolean;
  daysBeforeDue?: number;
  costThreshold?: number;
  recipients: string[];
  emailTemplate: string;
}

interface MaintenanceManagerAdvancedProps {
  tasksData?: MaintenanceTask[];
  propertiesData?: Property[];
}

// ==================== COMPOSANT PRINCIPAL ====================

export default function MaintenanceManagerAdvanced({ tasksData, propertiesData }: MaintenanceManagerAdvancedProps = {}) {
  const { isDark } = useTheme();
  const {
    properties: ctxProperties,
    maintenanceTasks: ctxMaintenanceTasks,
    addMaintenanceTask,
    updateMaintenanceTask,
    completeMaintenanceTask,
  } = useBNB();

  const properties = propertiesData ?? ctxProperties;
  const maintenanceTasks = tasksData ?? ctxMaintenanceTasks;

  // ========== ÉTATS ==========
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'suppliers' | 'templates' | 'recurring' | 'analytics' | 'settings'>('tasks');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'kanban' | 'timeline'>('cards');
  
  // Modales
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  // Formulaires
  const [newTask, setNewTask] = useState<Partial<MaintenanceTask>>({
    title: '',
    description: '',
    category: 'repair',
    priority: 'medium',
    status: 'pending',
    propertyId: 0,
    scheduledDate: '',
    estimatedCost: 0,
    assignedTo: undefined
  });

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '',
    category: 'general',
    phone: '',
    email: '',
    address: '',
    rating: 0,
    completedJobs: 0,
    totalCost: 0,
    notes: ''
  });

  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({
    name: '',
    category: 'repair',
    priority: 'medium',
    description: '',
    estimatedCost: 0,
    estimatedDuration: 0,
    checklistItems: []
  });

  // Focus management pour les modals (accessibilité)
  useEffect(() => {
    if (showNewTaskModal || showEditTaskModal || showNewSupplierModal || showNewTemplateModal) {
      const timer = setTimeout(() => {
        const modalSelector = `[aria-labelledby$="-modal-title"]`;
        const firstInput = document.querySelector<HTMLInputElement>(
          `${modalSelector} input:not([disabled])`
        );
        const firstButton = document.querySelector<HTMLButtonElement>(
          `${modalSelector} button:not([disabled])`
        );
        // Form modals: input prioritaire
        (firstInput || firstButton)?.focus();
      }, 150);
      
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowNewTaskModal(false);
          setShowEditTaskModal(false);
          setShowNewSupplierModal(false);
          setShowNewTemplateModal(false);
        }
      };
      document.addEventListener('keydown', handleEsc);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [showNewTaskModal, showEditTaskModal, showNewSupplierModal, showNewTemplateModal]);
  
  // Filtres
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    property: 'all',
    supplier: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  // Données simulées
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: 1,
      name: "Plomberie Dupont",
      category: 'plumbing',
      phone: "+33 1 23 45 67 89",
      email: "contact@dupont-plomberie.fr",
      address: "12 Rue de la Réparation, 75001 Paris",
      rating: 4.5,
      completedJobs: 28,
      totalCost: 12450,
      notes: "Excellent service, très réactif"
    },
    {
      id: 2,
      name: "Électricité Martin",
      category: 'electrical',
      phone: "+33 1 98 76 54 32",
      email: "martin.elec@example.com",
      address: "34 Avenue des Travaux, 75002 Paris",
      rating: 4.8,
      completedJobs: 42,
      totalCost: 18900,
      notes: "Tarifs compétitifs, travail soigné"
    },
    {
      id: 3,
      name: "Clean & Shine",
      category: 'cleaning',
      phone: "+33 1 11 22 33 44",
      email: "info@cleanshine.fr",
      address: "78 Boulevard du Nettoyage, 75003 Paris",
      rating: 4.2,
      completedJobs: 156,
      totalCost: 9800,
      notes: "Service rapide, équipe professionnelle"
    }
  ]);

  const [templates, setTemplates] = useState<TaskTemplate[]>([
    {
      id: 1,
      name: "Inspection chauffage annuelle",
      category: 'inspection',
      priority: 'medium',
      description: "Vérification complète du système de chauffage",
      estimatedCost: 150,
      estimatedDuration: 2,
      checklistItems: [
        "Vérifier la chaudière",
        "Contrôler les radiateurs",
        "Tester le thermostat",
        "Purger le système",
        "Vérifier la pression"
      ]
    },
    {
      id: 2,
      name: "Nettoyage approfondi",
      category: 'cleaning',
      priority: 'low',
      description: "Nettoyage complet de l'appartement entre deux locations",
      estimatedCost: 120,
      estimatedDuration: 4,
      checklistItems: [
        "Aspirer tous les sols",
        "Laver les sols",
        "Nettoyer la salle de bain",
        "Nettoyer la cuisine",
        "Changer les draps",
        "Vider les poubelles"
      ]
    },
    {
      id: 3,
      name: "Réparation plomberie standard",
      category: 'repair',
      priority: 'high',
      description: "Intervention plomberie pour fuite ou problème sanitaire",
      estimatedCost: 250,
      estimatedDuration: 3,
      checklistItems: [
        "Diagnostic du problème",
        "Couper l'eau si nécessaire",
        "Réparation",
        "Test de fonctionnement",
        "Nettoyage de la zone"
      ]
    }
  ]);

  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([
    {
      id: 1,
      taskTemplateId: 1,
      propertyId: 1,
      frequency: 'yearly',
      monthOfYear: 9,
      nextDueDate: '2026-09-01',
      autoCreate: true,
      active: true
    },
    {
      id: 2,
      taskTemplateId: 2,
      propertyId: 1,
      frequency: 'weekly',
      dayOfWeek: 6,
      nextDueDate: '2026-04-05',
      autoCreate: true,
      active: true
    }
  ]);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [notifications, setNotifications] = useState<NotificationRule[]>([
    {
      id: 1,
      type: 'upcoming',
      enabled: true,
      daysBeforeDue: 3,
      recipients: ['admin@bnbgest.com'],
      emailTemplate: 'Tâche à venir dans {days} jours'
    },
    {
      id: 2,
      type: 'overdue',
      enabled: true,
      recipients: ['admin@bnbgest.com'],
      emailTemplate: 'Tâche en retard : {taskName}'
    }
  ]);

  const [showTaskDetails, setShowTaskDetails] = useState(false);

  // ========== FONCTIONS DE GESTION DES TÂCHES ==========
  
  const handleCreateTask = () => {
    if (!newTask.title || !newTask.propertyId) {
      toast.error('Formulaire incomplet', {
        description: 'Veuillez remplir tous les champs requis',
        duration: 4000
      });
      return;
    }

    const task: MaintenanceTask = {
      id: Date.now(),
      title: newTask.title!,
      description: newTask.description || '',
      category: newTask.category || 'repair',
      priority: newTask.priority || 'medium',
      status: 'pending',
      propertyId: newTask.propertyId!,
      scheduledDate: newTask.scheduledDate || new Date().toISOString().split('T')[0],
      estimatedCost: newTask.estimatedCost || 0,
      assignedTo: newTask.assignedTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addMaintenanceTask(task);
    setShowNewTaskModal(false);
    setNewTask({
      title: '',
      description: '',
      category: 'repair',
      priority: 'medium',
      status: 'pending',
      propertyId: 0,
      scheduledDate: '',
      estimatedCost: 0,
      assignedTo: undefined
    });
  };

  const handleUpdateTask = () => {
    if (!selectedTask) return;
    updateMaintenanceTask(selectedTask.id, selectedTask);
    setShowEditTaskModal(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      const task = maintenanceTasks.find(t => t.id === taskId);
      if (task) {
        updateMaintenanceTask(taskId, { ...task, status: 'cancelled' });
      }
    }
  };

  const handleCompleteTask = (taskId: number) => {
    const task = maintenanceTasks.find(t => t.id === taskId);
    if (task) {
      completeMaintenanceTask(taskId);
    }
  };

  const handleStartTask = (taskId: number) => {
    const task = maintenanceTasks.find(t => t.id === taskId);
    if (task) {
      updateMaintenanceTask(taskId, { ...task, status: 'in_progress' });
    }
  };

  // ========== FONCTIONS DE GESTION DES FOURNISSEURS ==========
  
  const handleCreateSupplier = () => {
    if (!newSupplier.name) {
      toast.error('Nom requis', {
        description: 'Veuillez entrer un nom de fournisseur',
        duration: 4000
      });
      return;
    }

    const supplier: Supplier = {
      id: Date.now(),
      name: newSupplier.name!,
      category: newSupplier.category || 'general',
      phone: newSupplier.phone || '',
      email: newSupplier.email || '',
      address: newSupplier.address || '',
      rating: newSupplier.rating || 0,
      completedJobs: 0,
      totalCost: 0,
      notes: newSupplier.notes || ''
    };

    setSuppliers([...suppliers, supplier]);
    setShowNewSupplierModal(false);
    setNewSupplier({
      name: '',
      category: 'general',
      phone: '',
      email: '',
      address: '',
      rating: 0,
      completedJobs: 0,
      totalCost: 0,
      notes: ''
    });
  };

  const handleUpdateSupplier = () => {
    if (!selectedSupplier) return;
    setSuppliers(suppliers.map(s => s.id === selectedSupplier.id ? selectedSupplier : s));
    setSelectedSupplier(null);
  };

  const handleDeleteSupplier = (supplierId: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      setSuppliers(suppliers.filter(s => s.id !== supplierId));
    }
  };

  // ========== FONCTIONS DE GESTION DES MODÈLES ==========
  
  const handleCreateTemplate = () => {
    if (!newTemplate.name) {
      toast.error('Nom requis', {
        description: 'Veuillez entrer un nom de modèle',
        duration: 4000
      });
      return;
    }

    const template: TaskTemplate = {
      id: Date.now(),
      name: newTemplate.name!,
      category: newTemplate.category || 'repair',
      priority: newTemplate.priority || 'medium',
      description: newTemplate.description || '',
      estimatedCost: newTemplate.estimatedCost || 0,
      estimatedDuration: newTemplate.estimatedDuration || 0,
      checklistItems: newTemplate.checklistItems || []
    };

    setTemplates([...templates, template]);
    setShowNewTemplateModal(false);
    setNewTemplate({
      name: '',
      category: 'repair',
      priority: 'medium',
      description: '',
      estimatedCost: 0,
      estimatedDuration: 0,
      checklistItems: []
    });
  };

  const handleUseTemplate = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewTask({
        title: template.name,
        description: template.description,
        category: template.category,
        priority: template.priority,
        estimatedCost: template.estimatedCost,
        status: 'pending',
        propertyId: 0,
        scheduledDate: '',
        assignedTo: undefined
      });
      setShowNewTaskModal(true);
    }
  };

  const handleDeleteTemplate = (templateId: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      setTemplates(templates.filter(t => t.id !== templateId));
    }
  };

  // ========== GESTION DES TÂCHES RÉCURRENTES ==========
  
  useEffect(() => {
    // Vérifier les tâches récurrentes à créer
    const checkRecurring = () => {
      const today = new Date().toISOString().split('T')[0];
      recurringRules.forEach(rule => {
        if (rule.active && rule.autoCreate && rule.nextDueDate <= today) {
          const template = templates.find(t => t.id === rule.taskTemplateId);
          if (template) {
            // Créer la tâche
            const task: MaintenanceTask = {
              id: Date.now(),
              title: template.name,
              description: template.description,
              category: template.category,
              priority: template.priority,
              status: 'pending',
              propertyId: rule.propertyId,
              scheduledDate: rule.nextDueDate,
              estimatedCost: template.estimatedCost,
              assignedTo: undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            addMaintenanceTask(task);
            
            // Calculer la prochaine date
            const nextDate = new Date(rule.nextDueDate);
            switch (rule.frequency) {
              case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
              case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
              case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
              case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
              case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            }
            
            // Mettre à jour la règle
            setRecurringRules(recurringRules.map(r =>
              r.id === rule.id ? { ...r, nextDueDate: nextDate.toISOString().split('T')[0] } : r
            ));
          }
        }
      });
    };

    checkRecurring();
    const interval = setInterval(checkRecurring, 1000 * 60 * 60); // Vérifier toutes les heures
    return () => clearInterval(interval);
  }, [recurringRules, templates, addMaintenanceTask]);

  // ========== CALCUL DES STATISTIQUES ==========
  const stats = useMemo((): MaintenanceStats => {
    const completed = maintenanceTasks.filter(t => t.status === 'completed');
    const totalEstimated = maintenanceTasks.reduce((sum, t) => sum + t.estimatedCost, 0);
    const totalActual = completed.reduce((sum, t) => sum + (t.actualCost || 0), 0);
    
    const byCategory = maintenanceTasks.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<MaintenanceTask['category'], number>);

    const byPriority = maintenanceTasks.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {} as Record<MaintenanceTask['priority'], number>);

    const byProperty = maintenanceTasks.reduce((acc, t) => {
      if (!acc[t.propertyId]) acc[t.propertyId] = { count: 0, cost: 0 };
      acc[t.propertyId].count++;
      acc[t.propertyId].cost += t.actualCost || t.estimatedCost;
      return acc;
    }, {} as Record<number, { count: number; cost: number }>);

    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthTasks = maintenanceTasks.filter(t => 
        t.createdAt.startsWith(monthKey)
      );
      monthlyTrend.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short' }),
        count: monthTasks.length,
        cost: monthTasks.reduce((sum, t) => sum + (t.actualCost || t.estimatedCost), 0)
      });
    }

    return {
      totalTasks: maintenanceTasks.length,
      completedTasks: completed.length,
      avgCompletionTime: completed.length > 0
        ? completed.reduce((sum, t) => {
            const start = new Date(t.createdAt);
            const end = new Date(t.completedDate || t.updatedAt);
            return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / completed.length
        : 0,
      totalCost: totalActual,
      avgCost: completed.length > 0 ? totalActual / completed.length : 0,
      costVariance: totalEstimated > 0 
        ? ((totalActual - totalEstimated) / totalEstimated) * 100 
        : 0,
      onTimeCompletion: completed.length > 0
        ? (completed.filter(t => {
            const dueDate = new Date(t.scheduledDate);
            const completedDate = new Date(t.completedDate || t.updatedAt);
            return completedDate <= dueDate;
          }).length / completed.length) * 100
        : 0,
      overdueCount: maintenanceTasks.filter(t => 
        t.status !== 'completed' && 
        t.status !== 'cancelled' && 
        new Date(t.scheduledDate) < new Date()
      ).length,
      byCategory,
      byPriority,
      byProperty,
      monthlyTrend
    };
  }, [maintenanceTasks]);

  // ========== FONCTIONS UTILITAIRES ==========
  const getCategoryIcon = (category: MaintenanceTask['category']) => {
    const icons = {
      cleaning: '🧹',
      repair: '🔧',
      inspection: '🔍',
      supplies: '📦',
      other: '⚙️'
    };
    return icons[category];
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      plumbing: 'from-blue-500 to-blue-600',
      electrical: 'from-yellow-500 to-yellow-600',
      cleaning: 'from-green-500 to-green-600',
      gardening: 'from-emerald-500 to-emerald-600',
      general: 'from-gray-500 to-gray-600'
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // ========== EXPORT / IMPORT ==========
  const handleExport = () => {
    const data = {
      tasks: maintenanceTasks,
      suppliers,
      templates,
      recurringRules,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // Ici vous pouvez implémenter la logique d'import
        toast.success('Import réussi', {
          description: 'Données importées avec succès',
          duration: 3000
        });
      } catch (error) {
        toast.error('Erreur import', {
          description: 'Impossible de lire le fichier',
          duration: 4000
        });
      }
    };
    reader.readAsText(file);
  };

  // ========== GESTION DES TÂCHES RÉCURRENTES ==========
  const checkRecurringTasks = () => {
    const today = new Date();
    recurringRules.filter(rule => rule.active && rule.autoCreate).forEach(rule => {
      const nextDue = new Date(rule.nextDueDate);
      if (nextDue <= today) {
        const template = templates.find(t => t.id === rule.taskTemplateId);
        if (template) {
          // Créer une nouvelle tâche
          addMaintenanceTask({
            propertyId: rule.propertyId,
            title: template.name,
            description: template.description,
            category: template.category,
            priority: template.priority,
            estimatedCost: template.estimatedCost,
            scheduledDate: rule.nextDueDate,
            notes: `Tâche récurrente créée automatiquement`,
            status: 'pending'
          });

          // Mettre à jour la prochaine échéance
          const newNextDueDate = calculateNextDueDate(rule);
          // Mise à jour de la règle (à implémenter)
        }
      }
    });
  };

  const calculateNextDueDate = (rule: RecurringRule): string => {
    const current = new Date(rule.nextDueDate);
    
    switch (rule.frequency) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quarterly':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
    
    return current.toISOString().slice(0, 10);
  };

  // Vérifier les tâches récurrentes au chargement
  useEffect(() => {
    checkRecurringTasks();
  }, []);

  // ========== RENDU ==========
  return (
    <div className={`min-h-screen p-3 sm:p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className={`text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 shrink-0" />
              Maintenance
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {stats.totalTasks} tâches · {stats.overdueCount} en retard · {stats.completedTasks} terminées
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              icon={Download}
              size="sm"
            >
              <span className="hidden sm:inline">Exporter</span>
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              variant="outline"
              icon={Upload}
              size="sm"
              onClick={() => document.getElementById('import-file')?.click()}
            >
              <span className="hidden sm:inline">Importer</span>
            </Button>
            <Button
              variant="primary"
              icon={Wrench}
              data-testid="new-maintenance-button"
              onClick={() => setShowNewTaskModal(true)}
            >
              <span className="hidden sm:inline">Nouvelle </span>tâche
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Tâches
                </p>
                <p className={`text-2xl sm:text-3xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalTasks}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.completedTasks} terminées ({Math.round((stats.completedTasks / stats.totalTasks) * 100)}%)
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Coût Total
                </p>
                <p className={`text-xl sm:text-3xl font-bold mt-1 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(stats.totalCost)}
                </p>
                <p className={`text-xs mt-1 ${stats.costVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.costVariance >= 0 ? '+' : ''}{stats.costVariance.toFixed(1)}% vs estimé
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Délai Moyen
                </p>
                <p className={`text-2xl sm:text-3xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.avgCompletionTime.toFixed(1)}
                  <span className="text-base sm:text-lg ml-1">j</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.onTimeCompletion.toFixed(0)}% à temps
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  En Retard
                </p>
                <p className={`text-2xl sm:text-3xl font-bold mt-1 ${stats.overdueCount > 0 ? 'text-red-600' : isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.overdueCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Nécessite attention
                </p>
              </div>
              <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl ${stats.overdueCount > 0 ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'} flex items-center justify-center shrink-0`}>
                <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* NAVIGATION TABS */}
        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex overflow-x-auto scrollbar-hide gap-0 -mb-px">
            {[
              { key: 'tasks', label: 'Tâches', icon: Wrench },
              { key: 'calendar', label: 'Calendrier', icon: Calendar },
              { key: 'suppliers', label: 'Fournisseurs', icon: Users },
              { key: 'templates', label: 'Modèles', icon: FileText },
              { key: 'recurring', label: 'Récurrences', icon: Repeat },
              { key: 'analytics', label: 'Analyses', icon: TrendingUp },
              { key: 'settings', label: 'Paramètres', icon: Settings }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 py-3 px-2 sm:px-3 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : isDark
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span className="font-medium text-xs sm:text-sm hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* CONTENT DYNAMIQUE */}
        <div className="mt-6">
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'suppliers' && <SuppliersView suppliers={suppliers} />}
          {activeTab === 'templates' && <TemplatesView templates={templates} />}
          {activeTab === 'recurring' && <RecurringView rules={recurringRules} />}
          {activeTab === 'analytics' && <AnalyticsView stats={stats} />}
          {activeTab === 'settings' && <SettingsView notifications={notifications} />}
        </div>

        {/* MODAL NOUVELLE TÂCHE */}
        <AnimatePresence>
          {showNewTaskModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-task-modal-title"
              aria-describedby="new-task-modal-desc"
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowNewTaskModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${
                  isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
              >
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 id="new-task-modal-title" className="text-xl sm:text-2xl font-bold">Nouvelle tâche de maintenance</h3>
                </div>

                <div id="new-task-modal-desc" className="p-4 sm:p-6 space-y-4">
                  {/* Titre */}
                  <div>
                    <label htmlFor="task-title-input" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Titre <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="task-title-input"
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      aria-required="true"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Ex: Réparation fuite cuisine"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="task-description-input" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Description
                    </label>
                    <textarea
                      id="task-description-input"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Détails de la tâche..."
                    />
                  </div>

                  {/* Propriété */}
                  <div>
                    <label htmlFor="task-property-select" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Propriété <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="task-property-select"
                      value={newTask.propertyId}
                      onChange={(e) => setNewTask({ ...newTask, propertyId: parseInt(e.target.value) })}
                      aria-required="true"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value={0}>Sélectionner une propriété</option>
                      {properties.map(prop => (
                        <option key={prop.id} value={prop.id}>{prop.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Catégorie */}
                    <div>
                      <label htmlFor="task-category-select" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Catégorie
                      </label>
                      <select
                        id="task-category-select"
                        value={newTask.category}
                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value as MaintenanceTask['category'] })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="cleaning">🧹 Nettoyage</option>
                        <option value="repair">🔧 Réparation</option>
                        <option value="inspection">🔍 Inspection</option>
                        <option value="supplies">📦 Fournitures</option>
                        <option value="other">⚙️ Autre</option>
                      </select>
                    </div>

                    {/* Priorité */}
                    <div>
                      <label htmlFor="task-priority-select" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Priorité
                      </label>
                      <select
                        id="task-priority-select"
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as MaintenanceTask['priority'] })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="low">🟢 Basse</option>
                        <option value="medium">🟡 Moyenne</option>
                        <option value="high">🔴 Haute</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Date d'échéance */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date d'échéance
                      </label>
                      <input
                        type="date"
                        value={newTask.scheduledDate}
                        onChange={(e) => setNewTask({ ...newTask, scheduledDate: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    {/* Coût estimé */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Coût estimé (€)
                      </label>
                      <input
                        type="number"
                        value={newTask.estimatedCost}
                        onChange={(e) => setNewTask({ ...newTask, estimatedCost: parseFloat(e.target.value) })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Assigné à */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Assigné à (ID employé)
                    </label>
                    <input
                      type="number"
                      value={newTask.assignedTo || ''}
                      onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value ? parseInt(e.target.value) : undefined })}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="ID de l'employé (optionnel)"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewTaskModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateTask}
                    icon={CheckCircle}
                  >
                    Créer la tâche
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL DÉTAILS TÂCHE */}
        <AnimatePresence>
          {showTaskDetails && selectedTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowTaskDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${
                  isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto`}
              >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl sm:text-3xl">{getCategoryIcon(selectedTask.category)}</span>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-2xl font-bold">{selectedTask.title}</h3>
                        <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Tâche #{selectedTask.id} • Créée le {formatDate(selectedTask.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTaskDetails(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Statut et badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full font-bold text-xs sm:text-sm ${
                      selectedTask.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : selectedTask.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : selectedTask.status === 'cancelled'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedTask.status === 'pending' && '⏳ En attente'}
                      {selectedTask.status === 'in_progress' && '🔄 En cours'}
                      {selectedTask.status === 'completed' && '✅ Terminée'}
                      {selectedTask.status === 'cancelled' && '✕ Annulée'}
                    </span>
                    
                    <span className={`px-3 py-1 rounded-full font-bold text-xs sm:text-sm ${
                      selectedTask.priority === 'urgent'
                        ? 'bg-red-100 text-red-700'
                        : selectedTask.priority === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : selectedTask.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedTask.priority === 'urgent' && '🔴 Urgente'}
                      {selectedTask.priority === 'high' && '🟠 Haute'}
                      {selectedTask.priority === 'medium' && '🟡 Moyenne'}
                      {selectedTask.priority === 'low' && '🟢 Basse'}
                    </span>

                    {new Date(selectedTask.scheduledDate) < new Date() && selectedTask.status !== 'completed' && (
                      <span className="px-3 py-1 rounded-full font-bold text-xs sm:text-sm bg-red-100 text-red-700">
                        ⚠️ EN RETARD
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {selectedTask.description && (
                    <div>
                      <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Description
                      </h4>
                      <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {selectedTask.description}
                      </p>
                    </div>
                  )}

                  {/* Informations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Date d'échéance
                        </span>
                      </div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatDate(selectedTask.scheduledDate)}
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Coût estimé
                        </span>
                      </div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(selectedTask.estimatedCost)}
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="w-4 h-4" />
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Propriété
                        </span>
                      </div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {properties.find(p => p.id === selectedTask.propertyId)?.name || 'N/A'}
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4" />
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Assigné à
                        </span>
                      </div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {selectedTask.assignedTo ? `Employé #${selectedTask.assignedTo}` : 'Non assigné'}
                      </p>
                    </div>
                  </div>

                  {/* Coûts réels si complété */}
                  {selectedTask.actualCost && (
                    <div className={`p-4 rounded-lg border-2 ${
                      selectedTask.actualCost > selectedTask.estimatedCost
                        ? 'border-red-200 bg-red-50'
                        : 'border-green-200 bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Coût réel</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(selectedTask.actualCost)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-600">Variance</p>
                          <p className={`text-lg font-bold ${
                            selectedTask.actualCost > selectedTask.estimatedCost
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}>
                            {selectedTask.actualCost > selectedTask.estimatedCost ? '+' : ''}
                            {formatCurrency(selectedTask.actualCost - selectedTask.estimatedCost)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer - Boutons d'action */}
                <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-3">
                    {selectedTask.status === 'pending' && (
                      <Button
                        variant="primary"
                        icon={Play}
                        onClick={() => {
                          handleStartTask(selectedTask.id);
                          setShowTaskDetails(false);
                        }}
                      >
                        Démarrer
                      </Button>
                    )}

                    {(selectedTask.status === 'pending' || selectedTask.status === 'in_progress') && (
                      <Button
                        variant="primary"
                        icon={CheckCircle}
                        onClick={() => {
                          handleCompleteTask(selectedTask.id);
                          setShowTaskDetails(false);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Marquer comme terminée
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEditTaskModal(true);
                        setShowTaskDetails(false);
                      }}
                    >
                      Modifier
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
                          handleDeleteTask(selectedTask.id);
                          setShowTaskDetails(false);
                        }
                      }}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Supprimer
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowTaskDetails(false)}
                      className="ml-auto"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL MODIFIER TÂCHE */}
        <AnimatePresence>
          {showEditTaskModal && selectedTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowEditTaskModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${
                  isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
              >
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl sm:text-2xl font-bold">Modifier la tâche</h3>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  {/* Titre */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Titre
                    </label>
                    <input
                      type="text"
                      value={selectedTask.title}
                      onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Description
                    </label>
                    <textarea
                      value={selectedTask.description}
                      onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                      rows={3}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Catégorie */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Catégorie
                      </label>
                      <select
                        value={selectedTask.category}
                        onChange={(e) => setSelectedTask({ ...selectedTask, category: e.target.value as MaintenanceTask['category'] })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="cleaning">🧹 Nettoyage</option>
                        <option value="repair">🔧 Réparation</option>
                        <option value="inspection">🔍 Inspection</option>
                        <option value="supplies">📦 Fournitures</option>
                        <option value="other">⚙️ Autre</option>
                      </select>
                    </div>

                    {/* Priorité */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Priorité
                      </label>
                      <select
                        value={selectedTask.priority}
                        onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value as MaintenanceTask['priority'] })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="low">🟢 Basse</option>
                        <option value="medium">🟡 Moyenne</option>
                        <option value="high">🔴 Haute</option>
                        <option value="urgent">🔴🔴 Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Date */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date d'échéance
                      </label>
                      <input
                        type="date"
                        value={selectedTask.scheduledDate}
                        onChange={(e) => setSelectedTask({ ...selectedTask, scheduledDate: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    {/* Coût estimé */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Coût estimé (€)
                      </label>
                      <input
                        type="number"
                        value={selectedTask.estimatedCost}
                        onChange={(e) => setSelectedTask({ ...selectedTask, estimatedCost: parseFloat(e.target.value) })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditTaskModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUpdateTask}
                    icon={CheckCircle}
                  >
                    Enregistrer
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // ========== SOUS-COMPOSANTS ==========

  function TasksView() {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Liste des tâches
          </h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {['cards', 'table', 'kanban', 'timeline'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === mode
                    ? 'bg-indigo-600 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={`px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={`px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminées</option>
            <option value="cancelled">Annulées</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className={`px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="all">Toutes priorités</option>
            <option value="urgent">Urgente</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className={`px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="all">Toutes catégories</option>
            <option value="cleaning">Nettoyage</option>
            <option value="repair">Réparation</option>
            <option value="inspection">Inspection</option>
            <option value="supplies">Fournitures</option>
            <option value="other">Autre</option>
          </select>
        </div>

        {/* Liste des tâches */}
        <div className="space-y-4">
          {maintenanceTasks.slice(0, 5).map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 sm:p-5 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${
                isDark
                  ? 'bg-gray-800 border-gray-700 hover:border-indigo-500'
                  : 'bg-white border-gray-200 hover:border-indigo-300'
              }`}
              onClick={() => {
                setSelectedTask(task);
                setShowTaskDetails(true);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getCategoryIcon(task.category)}</span>
                    <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    {new Date(task.scheduledDate) < new Date() && task.status !== 'completed' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        EN RETARD
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {task.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : task.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status === 'pending' && '⏳ En attente'}
                      {task.status === 'in_progress' && '🔄 En cours'}
                      {task.status === 'completed' && '✅ Terminée'}
                      {task.status === 'cancelled' && '✕ Annulée'}
                    </span>
                    
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      task.priority === 'urgent'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {task.priority === 'urgent' && '🔴 Urgente'}
                      {task.priority === 'high' && '🟠 Haute'}
                      {task.priority === 'medium' && '🟡 Moyenne'}
                      {task.priority === 'low' && '🟢 Basse'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      📅 {formatDate(task.scheduledDate)}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      💶 {formatCurrency(task.estimatedCost)}
                    </span>
                  </div>
                </div>

                <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    );
  }

  function CalendarView() {
    return (
      <Card className="p-6">
        <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Vue Calendrier
        </h2>
        <div className={`h-96 flex items-center justify-center border-2 border-dashed rounded-xl ${
          isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
        }`}>
          <div className="text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Calendrier interactif</p>
            <p className="text-sm mt-2">À implémenter avec react-calendar ou fullcalendar</p>
          </div>
        </div>
      </Card>
    );
  }

  function SuppliersView({ suppliers }: { suppliers: Supplier[] }) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Fournisseurs
          </h2>
          <Button
            variant="primary"
            icon={Users}
            onClick={() => setShowNewSupplierModal(true)}
          >
            <span className="hidden sm:inline">Ajouter un fournisseur</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(supplier => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 sm:p-5 rounded-xl border ${
                isDark
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColor(supplier.category)} flex items-center justify-center text-white font-bold text-lg`}>
                  {supplier.name[0]}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {supplier.rating}
                  </span>
                </div>
              </div>

              <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {supplier.name}
              </h3>

              <div className="space-y-2 text-sm">
                <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Phone className="w-4 h-4" />
                  <span>{supplier.phone}</span>
                </div>
                <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{supplier.address}</span>
                </div>
              </div>

              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} grid grid-cols-2 gap-4 text-sm`}>
                <div>
                  <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Interventions</p>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {supplier.completedJobs}
                  </p>
                </div>
                <div>
                  <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Coût total</p>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(supplier.totalCost)}
                  </p>
                </div>
              </div>

              {supplier.notes && (
                <p className={`mt-3 text-xs italic ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  "{supplier.notes}"
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </Card>
    );
  }

  function TemplatesView({ templates }: { templates: TaskTemplate[] }) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Modèles de tâches
          </h2>
          <Button
            variant="primary"
            icon={FileText}
            onClick={() => setShowNewTemplateModal(true)}
          >
            Créer un modèle
          </Button>
        </div>

        <div className="space-y-4">
          {templates.map(template => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-5 rounded-xl border ${
                isDark
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {template.name}
                    </h3>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {template.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Créer une tâche à partir du template
                    toast.info('Modèle sélectionné', {
                      description: 'Création d\'une tâche à partir du modèle',
                      duration: 3000
                    });
                  }}
                >
                  Utiliser
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  template.priority === 'urgent'
                    ? 'bg-red-100 text-red-700'
                    : template.priority === 'high'
                    ? 'bg-orange-100 text-orange-700'
                    : template.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {template.priority}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  ⏱️ {template.estimatedDuration}h
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  💶 {formatCurrency(template.estimatedCost)}
                </span>
              </div>

              <div>
                <p className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Checklist ({template.checklistItems.length} items)
                </p>
                <div className="space-y-1">
                  {template.checklistItems.map((item, index) => (
                    <div key={index} className={`text-sm flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="w-4 h-4 rounded border border-current flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    );
  }

  function RecurringView({ rules }: { rules: RecurringRule[] }) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tâches récurrentes
          </h2>
          <Button
            variant="primary"
            icon={Repeat}
            onClick={() => setShowRecurringForm(true)}
          >
            Nouvelle règle
          </Button>
        </div>

        <div className="space-y-4">
          {rules.map(rule => {
            const template = templates.find(t => t.id === rule.taskTemplateId);
            const property = properties.find(p => p.id === rule.propertyId);
            
            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-5 rounded-xl border ${
                  rule.active
                    ? isDark
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                    : isDark
                    ? 'bg-gray-900 border-gray-800 opacity-60'
                    : 'bg-gray-50 border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Repeat className={`w-5 h-5 ${rule.active ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {template?.name || 'Modèle inconnu'}
                      </h3>
                      {!rule.active && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                          DÉSACTIVÉE
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        🏠 {property?.name || `Propriété #${rule.propertyId}`}
                      </span>
                      <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        🔄 {rule.frequency === 'daily' && 'Quotidien'}
                        {rule.frequency === 'weekly' && 'Hebdomadaire'}
                        {rule.frequency === 'monthly' && 'Mensuel'}
                        {rule.frequency === 'quarterly' && 'Trimestriel'}
                        {rule.frequency === 'yearly' && 'Annuel'}
                      </span>
                      <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        📅 Prochaine: {formatDate(rule.nextDueDate)}
                      </span>
                      {rule.autoCreate && (
                        <span className="px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
                          ⚡ Création automatique
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Toggle active status
                        toast.info('Règle modifiée', {
                          description: 'Statut de la règle mis à jour',
                          duration: 2000
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        rule.active
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {rule.active ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    );
  }

  function AnalyticsView({ stats }: { stats: MaintenanceStats }) {
    return (
      <div className="space-y-6">
        {/* Graphique de tendance */}
        <Card className="p-6">
          <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tendance des 6 derniers mois
          </h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {stats.monthlyTrend.map((month, index) => {
              const maxCount = Math.max(...stats.monthlyTrend.map(m => m.count));
              const height = (month.count / maxCount) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center">
                    <span className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {month.count}
                    </span>
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-purple-600 rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${height}%`, minHeight: '20px' }}
                    />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {month.month}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Répartition par catégorie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Par catégorie
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.byCategory).map(([category, count]) => {
                const total = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
                const percentage = (count / total) * 100;
                
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span>{getCategoryIcon(category as MaintenanceTask['category'])}</span>
                        {category}
                      </span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Par priorité
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.byPriority).map(([priority, count]) => {
                const total = Object.values(stats.byPriority).reduce((a, b) => a + b, 0);
                const percentage = (count / total) * 100;
                const colors = {
                  urgent: 'from-red-500 to-red-600',
                  high: 'from-orange-500 to-orange-600',
                  medium: 'from-yellow-500 to-yellow-600',
                  low: 'from-green-500 to-green-600'
                };
                
                return (
                  <div key={priority}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {priority}
                      </span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full bg-gradient-to-r ${colors[priority as keyof typeof colors]} rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Performance par propriété */}
        <Card className="p-6">
          <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Performance par propriété
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.byProperty).map(([propertyId, data]) => {
              const property = properties.find(p => p.id === parseInt(propertyId));
              
              return (
                <div key={propertyId} className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {property?.name || `Propriété #${propertyId}`}
                    </span>
                    <div className="flex gap-4 text-sm">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        {data.count} tâches
                      </span>
                      <span className="font-bold text-indigo-600">
                        {formatCurrency(data.cost)}
                      </span>
                    </div>
                  </div>
                  <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all"
                      style={{ 
                        width: `${(data.count / stats.totalTasks) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  function SettingsView({ notifications }: { notifications: NotificationRule[] }) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Notifications
          </h2>
          <div className="space-y-4">
            {notifications.map(rule => (
              <div
                key={rule.id}
                className={`p-4 rounded-lg border ${
                  isDark
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Bell className={`w-5 h-5 ${rule.enabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {rule.type === 'overdue' && 'Tâches en retard'}
                      {rule.type === 'upcoming' && 'Tâches à venir'}
                      {rule.type === 'highCost' && 'Coût élevé'}
                      {rule.type === 'recurring' && 'Rappels récurrents'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => {
                        // Toggle notification
                        toast.info('Notification mise à jour', {
                          description: 'Préférences de notification modifiées',
                          duration: 2000
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                {rule.daysBeforeDue && (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Alerte {rule.daysBeforeDue} jours avant l'échéance
                  </p>
                )}
                
                {rule.costThreshold && (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Alerte si coût supérieur à {formatCurrency(rule.costThreshold)}
                  </p>
                )}

                <div className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Destinataires: {rule.recipients.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Préférences
          </h2>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Devise
              </label>
              <select className={`w-full px-4 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Format de date
              </label>
              <select className={`w-full px-4 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}>
                <option value="fr">JJ/MM/AAAA</option>
                <option value="us">MM/DD/YYYY</option>
                <option value="iso">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Langue
              </label>
              <select className={`w-full px-4 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
    );
  }

}
