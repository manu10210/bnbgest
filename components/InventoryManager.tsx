'use client';

import { useState, useMemo } from 'react';
import { useBNB, InventoryItem } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  MapPin,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
  QrCode,
  RefreshCw,
  FileText,
  ShoppingCart,
  Calendar,
  DollarSign,
  MinusCircle,
  PlusCircle
} from 'lucide-react';

interface StockMovement {
  id: number;
  itemId: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  date: string;
  reason: string;
  user: string;
}

interface InventoryManagerProps {
  propertyId?: number;
}

export default function InventoryManager({ propertyId }: InventoryManagerProps) {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getLowStockItems,
    properties
  } = useBNB();
  const { isDark } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [movementReason, setMovementReason] = useState('');
  const [restockQuantity, setRestockQuantity] = useState(0);

  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'other',
    quantity: 0,
    minimumQuantity: 0,
    unit: '',
    location: '',
    supplier: '',
    propertyId: propertyId || 1
  });

  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (propertyId) {
      filtered = filtered.filter(item => item.propertyId === propertyId);
    }

    return filtered;
  }, [inventory, searchTerm, categoryFilter, statusFilter, propertyId]);

  const categories = [
    'Nettoyage',
    'Entretien',
    'Literie',
    'Électroménager',
    'Décoration',
    'Cuisine',
    'Salle de bain',
    'Jardin',
    'Autre'
  ];

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category) return;

    const itemToAdd: InventoryItem = {
      id: Date.now(),
      name: newItem.name,
      category: newItem.category as InventoryItem['category'],
      quantity: newItem.quantity || 0,
      minimumQuantity: newItem.minimumQuantity || 0,
      unit: newItem.unit || '',
      location: newItem.location || '',
      supplier: newItem.supplier || '',
      propertyId: newItem.propertyId || 1,
      status: (newItem.quantity || 0) <= (newItem.minimumQuantity || 0) ? 'low_stock' : 'in_stock',
      lastRestocked: new Date().toISOString().split('T')[0],
      notes: newItem.notes || ''
    };

    addInventoryItem(itemToAdd);
    setNewItem({
      name: '',
      category: 'other',
      quantity: 0,
      minimumQuantity: 0,
      unit: '',
      location: '',
      supplier: '',
      propertyId: propertyId || 1
    });
    setShowAddModal(false);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewItem(item);
    setShowEditModal(true);
  };

  const handleUpdateItem = () => {
    if (!selectedItem || !newItem.name || !newItem.category) return;

    const updatedItem: InventoryItem = {
      ...selectedItem,
      name: newItem.name,
      category: newItem.category as InventoryItem['category'],
      quantity: newItem.quantity || 0,
      minimumQuantity: newItem.minimumQuantity || 0,
      unit: newItem.unit || '',
      location: newItem.location || '',
      supplier: newItem.supplier || '',
      status: (newItem.quantity || 0) <= (newItem.minimumQuantity || 0) ? 'low_stock' : 'in_stock',
      notes: newItem.notes || ''
    };

    updateInventoryItem(selectedItem.id, updatedItem);
    setShowEditModal(false);
    setSelectedItem(null);
    setNewItem({
      name: '',
      category: 'other',
      quantity: 0,
      minimumQuantity: 0,
      unit: '',
      location: '',
      supplier: '',
      propertyId: propertyId || 1
    });
  };

  const handleDeleteItem = (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      deleteInventoryItem(id);
    }
  };

  // Nouvelle fonction: Ajustement rapide de stock
  const handleQuickAdjust = (item: InventoryItem, delta: number) => {
    const newQuantity = Math.max(0, item.quantity + delta);
    const updatedItem: InventoryItem = {
      ...item,
      quantity: newQuantity,
      status: newQuantity <= item.minimumQuantity 
        ? (newQuantity === 0 ? 'out_of_stock' : 'low_stock')
        : 'in_stock'
    };
    
    updateInventoryItem(item.id, updatedItem);
    
    // Enregistrer le mouvement
    const movement: StockMovement = {
      id: Date.now(),
      itemId: item.id,
      type: delta > 0 ? 'in' : 'out',
      quantity: Math.abs(delta),
      date: new Date().toISOString(),
      reason: delta > 0 ? 'Réapprovisionnement rapide' : 'Consommation rapide',
      user: 'Admin'
    };
    setStockMovements([movement, ...stockMovements]);
  };

  // Nouvelle fonction: Export CSV
  const handleExportCSV = () => {
    const headers = ['Nom', 'Catégorie', 'Quantité', 'Seuil Min', 'Unité', 'Statut', 'Emplacement', 'Fournisseur', 'Dernière MAJ'];
    const rows = filteredInventory.map(item => [
      item.name,
      item.category,
      item.quantity,
      item.minimumQuantity,
      item.unit,
      getStatusText(item.status),
      item.location,
      item.supplier || '',
      item.lastRestocked || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventaire_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Nouvelle fonction: Réapprovisionnement en masse
  const handleBulkRestock = () => {
    const itemsToRestock = lowStockItems.filter(item => 
      propertyId ? item.propertyId === propertyId : true
    );

    itemsToRestock.forEach(item => {
      const targetQuantity = item.minimumQuantity * 2; // 2x le seuil minimum
      const updatedItem: InventoryItem = {
        ...item,
        quantity: targetQuantity,
        status: 'in_stock',
        lastRestocked: new Date().toISOString().split('T')[0]
      };
      updateInventoryItem(item.id, updatedItem);

      // Enregistrer le mouvement
      const movement: StockMovement = {
        id: Date.now() + item.id,
        itemId: item.id,
        type: 'in',
        quantity: targetQuantity - item.quantity,
        date: new Date().toISOString(),
        reason: 'Réapprovisionnement en masse',
        user: 'Admin'
      };
      setStockMovements([movement, ...stockMovements]);
    });

    setShowRestockModal(false);
    alert(`${itemsToRestock.length} articles réapprovisionnés avec succès !`);
  };

  // Nouvelle fonction: Voir les détails d'un article
  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  // Calculer les statistiques
  const stats = useMemo(() => {
    const items = propertyId 
      ? inventory.filter(item => item.propertyId === propertyId)
      : inventory;

    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0);
    const lowStockCount = items.filter(item => item.status === 'low_stock').length;
    const outOfStockCount = items.filter(item => item.status === 'out_of_stock').length;
    
    const categoryBreakdown = categories.map(cat => ({
      category: cat,
      count: items.filter(item => item.category === cat).length,
      value: items.filter(item => item.category === cat)
        .reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0)
    })).filter(item => item.count > 0);

    return {
      totalItems,
      totalValue,
      lowStockCount,
      outOfStockCount,
      categoryBreakdown,
      inStockCount: totalItems - lowStockCount - outOfStockCount
    };
  }, [inventory, propertyId, categories]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':    return isDark ? 'bg-green-500/15 text-green-400'  : 'bg-green-100 text-green-800';
      case 'low_stock':   return isDark ? 'bg-yellow-500/15 text-yellow-400': 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':return isDark ? 'bg-red-500/15 text-red-400'      : 'bg-red-100 text-red-800';
      default:            return isDark ? 'bg-white/10 text-gray-400'        : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_stock': return 'En stock';
      case 'low_stock': return 'Stock faible';
      case 'out_of_stock': return 'Rupture';
      default: return status;
    }
  };

  const lowStockItems = getLowStockItems();

  return (
    <div className={`max-w-7xl mx-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className='flex justify-between items-center mb-6'>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Gestion de l&apos;inventaire</h1>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowStatsModal(true)}
            icon={BarChart3}
            variant="outline"
            className="hover:bg-blue-50 hover:border-blue-200"
          >
            Statistiques
          </Button>
          <Button
            onClick={handleExportCSV}
            icon={Download}
            variant="outline"
            className="hover:bg-green-50 hover:border-green-200"
          >
            Export CSV
          </Button>
          {lowStockItems.length > 0 && (
            <Button
              onClick={() => setShowRestockModal(true)}
              icon={RefreshCw}
              variant="outline"
              className="hover:bg-orange-50 hover:border-orange-200"
            >
              Réappro. masse
            </Button>
          )}
          <Button
            onClick={() => setShowAddModal(true)}
            icon={Plus}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Ajouter
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total articles</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalItems}</p>
                </div>
                <Package className="h-10 w-10 text-blue-500 opacity-50" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">En stock</p>
                  <p className="text-2xl font-bold text-green-900">{stats.inStockCount}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Stock faible</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.lowStockCount}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-yellow-500 opacity-50" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Rupture</p>
                  <p className="text-2xl font-bold text-red-900">{stats.outOfStockCount}</p>
                </div>
                <TrendingDown className="h-10 w-10 text-red-500 opacity-50" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Alertes stock faible */}
      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-yellow-200 bg-yellow-50 mb-6">
            <div className="p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className='text-lg font-semibold text-yellow-800'>Alertes de stock</h3>
              </div>
              <div className='space-y-2'>
                {lowStockItems.slice(0, 5).map(item => (
                  <div key={item.id} className='text-sm text-yellow-700 flex items-center'>
                    <Package className="h-4 w-4 mr-2" />
                    {item.name} ({item.quantity}/{item.minimumQuantity} {item.unit})
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <div className='text-sm text-yellow-600'>
                    ... et {lowStockItems.length - 5} autres articles
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Filtres */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="mb-6">
          <div className="p-6">
            <h2 className='text-xl font-semibold mb-4 flex items-center'>
              <Search className="h-5 w-5 mr-2 text-gray-600" />
              Filtres
            </h2>
            <div className='grid md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type='text'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Nom ou emplacement...'
                    className='w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Catégorie
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value=''>Toutes les catégories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value=''>Tous les statuts</option>
                  <option value='in_stock'>En stock</option>
                  <option value='low_stock'>Stock faible</option>
                  <option value='out_of_stock'>Rupture</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Liste des articles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <div className='px-6 py-4 border-b border-gray-200'>
            <h2 className='text-xl font-semibold flex items-center'>
              <Package className="h-5 w-5 mr-2 text-gray-600" />
              Articles ({filteredInventory.length})
            </h2>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Article
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Catégorie
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Stock
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Statut
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Emplacement
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredInventory.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    className='hover:bg-gray-50'
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div>
                        <div className='text-sm font-medium text-gray-900'>{item.name}</div>
                        {item.notes && (
                          <div className='text-sm text-gray-500'>{item.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='text-sm text-gray-900'>{item.category}</span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900'>
                        {item.quantity} / {item.minimumQuantity} {item.unit}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center'>
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {item.location}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleViewDetails(item)}
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          className="hover:bg-purple-50 hover:border-purple-200"
                        >
                          Détails
                        </Button>
                        <Button
                          onClick={() => handleQuickAdjust(item, -1)}
                          variant="outline"
                          size="sm"
                          icon={MinusCircle}
                          className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                        >
                          -1
                        </Button>
                        <Button
                          onClick={() => handleQuickAdjust(item, 1)}
                          variant="outline"
                          size="sm"
                          icon={PlusCircle}
                          className="hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                        >
                          +1
                        </Button>
                        <Button
                          onClick={() => handleEditItem(item)}
                          variant="outline"
                          size="sm"
                          icon={Edit}
                          className="hover:bg-blue-50 hover:border-blue-200"
                        >
                          Modifier
                        </Button>
                        <Button
                          onClick={() => handleDeleteItem(item.id)}
                          variant="outline"
                          size="sm"
                          icon={Trash2}
                          className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInventory.length === 0 && (
            <div className='text-center py-12'>
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className='text-gray-500'>Aucun article trouvé</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal ajout */}
      {showAddModal && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50'>
          <div className='relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white'>
            <div className='mt-3'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Ajouter un article</h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Nom *
                  </label>
                  <input
                    type='text'
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Ex: Draps queen size'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Catégorie *
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as InventoryItem['category'] })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value=''>Sélectionner une catégorie</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Quantité
                  </label>
                  <input
                    type='number'
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    min='0'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Seuil minimum
                  </label>
                  <input
                    type='number'
                    value={newItem.minimumQuantity}
                    onChange={(e) => setNewItem({ ...newItem, minimumQuantity: Number(e.target.value) })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    min='0'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Unité
                  </label>
                  <input
                    type='text'
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Ex: pièces, litres, kg'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Emplacement
                  </label>
                  <input
                    type='text'
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Ex: Armoire chambre principale'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Fournisseur
                  </label>
                  <input
                    type='text'
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Ex: Amazon, Ikea'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Coût unitaire (€)
                  </label>
                  <input
                    type='number'
                    value={newItem.cost || ''}
                    onChange={(e) => setNewItem({ ...newItem, cost: Number(e.target.value) })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='0.00'
                    step='0.01'
                    min='0'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Propriété
                  </label>
                  <select
                    value={newItem.propertyId}
                    onChange={(e) => setNewItem({ ...newItem, propertyId: Number(e.target.value) })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='md:col-span-2'>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Notes
                  </label>
                  <textarea
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    rows={3}
                    placeholder='Informations supplémentaires...'
                  />
                </div>
              </div>

              <div className='flex justify-end space-x-3 mt-6'>
                <button
                  onClick={() => setShowAddModal(false)}
                  className='px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50'
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddItem}
                  className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition */}
      {showEditModal && selectedItem && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50'>
          <div className='relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white'>
            <div className='mt-3'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Modifier l&apos;article</h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Nom *
                  </label>
                  <input
                    type='text'
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Catégorie *
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as InventoryItem['category'] })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value=''>Sélectionner une catégorie</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Quantité
                  </label>
                  <input
                    type='number'
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    min='0'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Seuil minimum
                  </label>
                  <input
                    type='number'
                    value={newItem.minimumQuantity}
                    onChange={(e) => setNewItem({ ...newItem, minimumQuantity: Number(e.target.value) })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    min='0'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Unité
                  </label>
                  <input
                    type='text'
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Emplacement
                  </label>
                  <input
                    type='text'
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Fournisseur
                  </label>
                  <input
                    type='text'
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Ex: Amazon, Ikea'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Coût unitaire (€)
                  </label>
                  <input
                    type='number'
                    value={newItem.cost || ''}
                    onChange={(e) => setNewItem({ ...newItem, cost: Number(e.target.value) })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='0.00'
                    step='0.01'
                    min='0'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Propriété
                  </label>
                  <select
                    value={newItem.propertyId}
                    onChange={(e) => setNewItem({ ...newItem, propertyId: Number(e.target.value) })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='md:col-span-2'>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Notes
                  </label>
                  <textarea
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    rows={3}
                    placeholder='Informations supplémentaires...'
                  />
                </div>
              </div>

              <div className='flex justify-end space-x-3 mt-6'>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedItem(null);
                  }}
                  className='px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50'
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateItem}
                  className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal des détails d'un article */}
      <AnimatePresence>
        {showDetailsModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center'
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className='relative p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='mt-3'>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className='text-2xl font-bold text-gray-900'>{selectedItem.name}</h3>
                    <span className={`inline-flex mt-2 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedItem.status)}`}>
                      {getStatusText(selectedItem.status)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center mb-2">
                      <Package className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Quantité</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedItem.quantity} {selectedItem.unit}
                    </p>
                    <p className="text-sm text-gray-500">Seuil minimum: {selectedItem.minimumQuantity}</p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center mb-2">
                      <MapPin className="h-5 w-5 text-purple-500 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Emplacement</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{selectedItem.location || 'Non spécifié'}</p>
                    <p className="text-sm text-gray-500">Catégorie: {selectedItem.category}</p>
                  </Card>

                  {selectedItem.supplier && (
                    <Card className="p-4">
                      <div className="flex items-center mb-2">
                        <ShoppingCart className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-gray-600">Fournisseur</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{selectedItem.supplier}</p>
                    </Card>
                  )}

                  {selectedItem.lastRestocked && (
                    <Card className="p-4">
                      <div className="flex items-center mb-2">
                        <Calendar className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm font-medium text-gray-600">Dernier réappro.</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(selectedItem.lastRestocked).toLocaleDateString('fr-FR')}
                      </p>
                    </Card>
                  )}
                </div>

                {selectedItem.notes && (
                  <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
                    <div className="flex items-start">
                      <FileText className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 mb-1">Notes</p>
                        <p className="text-sm text-yellow-700">{selectedItem.notes}</p>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="flex items-center justify-center mb-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <QrCode className="h-32 w-32 text-gray-400" />
                    <p className="text-center text-xs text-gray-500 mt-2">ID: {selectedItem.id}</p>
                  </div>
                </div>

                <div className="flex justify-between space-x-3">
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleQuickAdjust(selectedItem, -5)}
                      variant="outline"
                      icon={MinusCircle}
                      className="hover:bg-red-50"
                    >
                      -5
                    </Button>
                    <Button
                      onClick={() => handleQuickAdjust(selectedItem, -1)}
                      variant="outline"
                      icon={MinusCircle}
                      className="hover:bg-red-50"
                    >
                      -1
                    </Button>
                    <Button
                      onClick={() => handleQuickAdjust(selectedItem, 1)}
                      variant="outline"
                      icon={PlusCircle}
                      className="hover:bg-green-50"
                    >
                      +1
                    </Button>
                    <Button
                      onClick={() => handleQuickAdjust(selectedItem, 5)}
                      variant="outline"
                      icon={PlusCircle}
                      className="hover:bg-green-50"
                    >
                      +5
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleEditItem(selectedItem);
                      }}
                      icon={Edit}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Modifier
                    </Button>
                    <Button
                      onClick={() => setShowDetailsModal(false)}
                      variant="outline"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal des statistiques */}
      <AnimatePresence>
        {showStatsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center'
            onClick={() => setShowStatsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className='relative p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='mt-3'>
                <div className="flex justify-between items-center mb-6">
                  <h3 className='text-2xl font-bold text-gray-900 flex items-center'>
                    <BarChart3 className="h-6 w-6 mr-2 text-blue-500" />
                    Statistiques de l&apos;inventaire
                  </h3>
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                    <div className="text-center">
                      <Package className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-blue-900">{stats.totalItems}</p>
                      <p className="text-sm text-blue-600">Articles totaux</p>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                    <div className="text-center">
                      <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-green-900">{stats.totalValue.toFixed(2)}€</p>
                      <p className="text-sm text-green-600">Valeur totale estimée</p>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-purple-900">
                        {stats.inStockCount > 0 ? ((stats.inStockCount / stats.totalItems) * 100).toFixed(0) : 0}%
                      </p>
                      <p className="text-sm text-purple-600">Taux de disponibilité</p>
                    </div>
                  </Card>
                </div>

                <Card className="p-4 mb-4">
                  <h4 className="text-lg font-semibold mb-4 text-gray-900">Répartition par catégorie</h4>
                  <div className="space-y-3">
                    {stats.categoryBreakdown.map((cat, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                          <span className="text-sm text-gray-600">{cat.count} articles</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                            style={{ width: `${(cat.count / stats.totalItems) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowStatsModal(false)}
                    variant="outline"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de réapprovisionnement en masse */}
      <AnimatePresence>
        {showRestockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center'
            onClick={() => setShowRestockModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className='relative p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='mt-3'>
                <div className="flex justify-between items-center mb-4">
                  <h3 className='text-xl font-bold text-gray-900 flex items-center'>
                    <RefreshCw className="h-6 w-6 mr-2 text-orange-500" />
                    Réapprovisionnement en masse
                  </h3>
                  <button
                    onClick={() => setShowRestockModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <Card className="p-4 mb-4 bg-orange-50 border-orange-200">
                  <p className="text-sm text-orange-800">
                    Cette action va réapprovisionner automatiquement tous les articles en stock faible 
                    à 2× leur seuil minimum.
                  </p>
                </Card>

                <div className="max-h-96 overflow-y-auto mb-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock actuel</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seuil min</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nouveau stock</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lowStockItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.minimumQuantity} {item.unit}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">
                            {item.minimumQuantity * 2} {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => setShowRestockModal(false)}
                    variant="outline"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleBulkRestock}
                    icon={RefreshCw}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Réapprovisionner ({lowStockItems.length} articles)
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
