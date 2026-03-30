'use client';

import { useState, useCallback, useMemo } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  FileText,
  Database,
  CheckCircle,
  AlertCircle,
  X,
  Settings,
  Calendar,
  Users,
  Home,
  Star,
  Package,
  Wrench,
  FileCheck,
  RefreshCw,
  Trash2,
  Copy,
  Archive,
  Filter,
  Zap,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface ExportConfig {
  format: 'json' | 'csv' | 'excel' | 'pdf';
  dataTypes: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  includeArchived: boolean;
  includeStats: boolean;
  compression: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: number;
}

export default function DataExportImport() {
  const {
    properties,
    guests,
    bookings,
    reviews,
    inventory,
    maintenanceTasks,
    addProperty,
    addGuest,
    addBooking,
    addReview,
    addInventoryItem,
    addMaintenanceTask
  } = useBNB();
  
  const { isDark } = useTheme();
  const { showSuccess, showError, showWarning } = useNotification();

  // States
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'backup' | 'analytics'>('export');
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'json',
    dataTypes: ['properties', 'guests', 'bookings', 'reviews', 'inventory', 'maintenance'],
    includeArchived: false,
    includeStats: true,
    compression: false
  });

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Data type configurations
  const dataTypeConfig = [
    { id: 'properties', label: 'Propriétés', icon: Home, count: properties.length, color: 'blue' },
    { id: 'guests', label: 'Voyageurs', icon: Users, count: guests.length, color: 'purple' },
    { id: 'bookings', label: 'Réservations', icon: Calendar, count: bookings.length, color: 'green' },
    { id: 'reviews', label: 'Avis', icon: Star, count: reviews.length, color: 'yellow' },
    { id: 'inventory', label: 'Inventaire', icon: Package, count: inventory.length, color: 'orange' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, count: maintenanceTasks.length, color: 'red' }
  ];

  // Toggle data type selection
  const toggleDataType = (type: string) => {
    setExportConfig(prev => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(type)
        ? prev.dataTypes.filter(t => t !== type)
        : [...prev.dataTypes, type]
    }));
  };

  // Select all data types
  const selectAllDataTypes = () => {
    setExportConfig(prev => ({
      ...prev,
      dataTypes: dataTypeConfig.map(dt => dt.id)
    }));
  };

  // Deselect all data types
  const deselectAllDataTypes = () => {
    setExportConfig(prev => ({ ...prev, dataTypes: [] }));
  };

  // Prepare data for export
  const prepareExportData = useCallback(() => {
    const data: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        application: 'BNBGest',
        dataTypes: exportConfig.dataTypes,
        totalRecords: 0
      },
      data: {}
    };

    if (exportConfig.dataTypes.includes('properties')) {
      data.data.properties = properties;
      data.metadata.totalRecords += properties.length;
    }

    if (exportConfig.dataTypes.includes('guests')) {
      data.data.guests = guests;
      data.metadata.totalRecords += guests.length;
    }

    if (exportConfig.dataTypes.includes('bookings')) {
      data.data.bookings = bookings;
      data.metadata.totalRecords += bookings.length;
    }

    if (exportConfig.dataTypes.includes('reviews')) {
      data.data.reviews = reviews;
      data.metadata.totalRecords += reviews.length;
    }

    if (exportConfig.dataTypes.includes('inventory')) {
      data.data.inventory = inventory;
      data.metadata.totalRecords += inventory.length;
    }

    if (exportConfig.dataTypes.includes('maintenance')) {
      data.data.maintenance = maintenanceTasks;
      data.metadata.totalRecords += maintenanceTasks.length;
    }

    if (exportConfig.includeStats) {
      data.statistics = {
        totalProperties: properties.length,
        totalGuests: guests.length,
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
        averageRating: reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0,
        occupancyRate: properties.length > 0
          ? (bookings.filter(b => b.status === 'confirmed').length / properties.length) * 100
          : 0
      };
    }

    return data;
  }, [exportConfig, properties, guests, bookings, reviews, inventory, maintenanceTasks]);

  // Export as JSON
  const exportAsJSON = useCallback(() => {
    try {
      const data = prepareExportData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bnbgest-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess(`Export JSON réussi : ${data.metadata.totalRecords} enregistrements`);
    } catch (error) {
      showError('Erreur lors de l\'export JSON');
    }
  }, [prepareExportData, showSuccess, showError]);

  // Export as CSV
  const exportAsCSV = useCallback(() => {
    try {
      const data = prepareExportData();
      let csvContent = '';

      exportConfig.dataTypes.forEach(type => {
        if (data.data[type] && Array.isArray(data.data[type])) {
          csvContent += `\n${type.toUpperCase()}\n`;
          const items = data.data[type];
          
          if (items.length > 0) {
            // Headers
            const headers = Object.keys(items[0]);
            csvContent += headers.join(';') + '\n';
            
            // Rows
            items.forEach((item: any) => {
              const row = headers.map(header => {
                const value = item[header];
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value || '').replace(/;/g, ',');
              });
              csvContent += row.join(';') + '\n';
            });
          }
        }
      });

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bnbgest-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess('Export CSV réussi');
    } catch (error) {
      showError('Erreur lors de l\'export CSV');
    }
  }, [prepareExportData, exportConfig, showSuccess, showError]);

  // Export as Excel
  const exportAsExcel = useCallback(async () => {
    try {
      const data = prepareExportData();
      
      // Create workbook content
      let xmlContent = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
      xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
      
      // Styles
      xmlContent += '<Styles>';
      xmlContent += '<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#4F46E5" ss:Pattern="Solid"/></Style>';
      xmlContent += '</Styles>';

      exportConfig.dataTypes.forEach(type => {
        if (data.data[type] && Array.isArray(data.data[type])) {
          const items = data.data[type];
          
          if (items.length > 0) {
            xmlContent += `<Worksheet ss:Name="${type}">`;
            xmlContent += '<Table>';
            
            // Headers
            const headers = Object.keys(items[0]);
            xmlContent += '<Row>';
            headers.forEach(header => {
              xmlContent += `<Cell ss:StyleID="Header"><Data ss:Type="String">${header}</Data></Cell>`;
            });
            xmlContent += '</Row>';
            
            // Rows
            items.forEach((item: any) => {
              xmlContent += '<Row>';
              headers.forEach(header => {
                const value = item[header];
                const type = typeof value === 'number' ? 'Number' : 'String';
                const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value || '');
                xmlContent += `<Cell><Data ss:Type="${type}">${displayValue}</Data></Cell>`;
              });
              xmlContent += '</Row>';
            });
            
            xmlContent += '</Table>';
            xmlContent += '</Worksheet>';
          }
        }
      });

      xmlContent += '</Workbook>';

      const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bnbgest-export-${new Date().toISOString().split('T')[0]}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess('Export Excel réussi');
    } catch (error) {
      showError('Erreur lors de l\'export Excel');
    }
  }, [prepareExportData, exportConfig, showSuccess, showError]);

  // Handle export
  const handleExport = useCallback(() => {
    if (exportConfig.dataTypes.length === 0) {
      showWarning('Veuillez sélectionner au moins un type de données');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      switch (exportConfig.format) {
        case 'json':
          exportAsJSON();
          break;
        case 'csv':
          exportAsCSV();
          break;
        case 'excel':
          exportAsExcel();
          break;
        default:
          showError('Format non supporté');
      }
      setIsProcessing(false);
    }, 500);
  }, [exportConfig, exportAsJSON, exportAsCSV, exportAsExcel, showError, showWarning]);

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
      
      // Preview file
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          setPreviewData(data);
          setShowPreview(true);
        } catch (error) {
          showError('Fichier invalide ou format non supporté');
        }
      };
      reader.readAsText(file);
    }
  };

  // Handle import
  const handleImport = useCallback(async () => {
    if (!importFile || !previewData) {
      showWarning('Veuillez sélectionner un fichier');
      return;
    }

    setIsProcessing(true);
    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: 0
    };

    try {
      // Import properties
      if (previewData.data?.properties) {
        previewData.data.properties.forEach((prop: any) => {
          try {
            // Check for duplicates
            const exists = properties.find(p => p.id === prop.id);
            if (exists) {
              result.duplicates++;
              result.skipped++;
            } else {
              addProperty(prop);
              result.imported++;
            }
          } catch (error) {
            result.errors.push(`Propriété ${prop.id}: ${error}`);
            result.skipped++;
          }
        });
      }

      // Import guests
      if (previewData.data?.guests) {
        previewData.data.guests.forEach((guest: any) => {
          try {
            const exists = guests.find(g => g.id === guest.id || g.email === guest.email);
            if (exists) {
              result.duplicates++;
              result.skipped++;
            } else {
              addGuest(guest);
              result.imported++;
            }
          } catch (error) {
            result.errors.push(`Voyageur ${guest.id}: ${error}`);
            result.skipped++;
          }
        });
      }

      // Import bookings
      if (previewData.data?.bookings) {
        previewData.data.bookings.forEach((booking: any) => {
          try {
            const exists = bookings.find(b => b.id === booking.id);
            if (exists) {
              result.duplicates++;
              result.skipped++;
            } else {
              addBooking(booking);
              result.imported++;
            }
          } catch (error) {
            result.errors.push(`Réservation ${booking.id}: ${error}`);
            result.skipped++;
          }
        });
      }

      // Import reviews
      if (previewData.data?.reviews) {
        previewData.data.reviews.forEach((review: any) => {
          try {
            const exists = reviews.find(r => r.id === review.id);
            if (exists) {
              result.duplicates++;
              result.skipped++;
            } else {
              addReview(review);
              result.imported++;
            }
          } catch (error) {
            result.errors.push(`Avis ${review.id}: ${error}`);
            result.skipped++;
          }
        });
      }

      // Import inventory
      if (previewData.data?.inventory) {
        previewData.data.inventory.forEach((item: any) => {
          try {
            const exists = inventory.find(i => i.id === item.id);
            if (exists) {
              result.duplicates++;
              result.skipped++;
            } else {
              addInventoryItem(item);
              result.imported++;
            }
          } catch (error) {
            result.errors.push(`Article ${item.id}: ${error}`);
            result.skipped++;
          }
        });
      }

      // Import maintenance
      if (previewData.data?.maintenance) {
        previewData.data.maintenance.forEach((task: any) => {
          try {
            const exists = maintenanceTasks.find(t => t.id === task.id);
            if (exists) {
              result.duplicates++;
              result.skipped++;
            } else {
              addMaintenanceTask(task);
              result.imported++;
            }
          } catch (error) {
            result.errors.push(`Tâche ${task.id}: ${error}`);
            result.skipped++;
          }
        });
      }

      setImportResult(result);
      
      if (result.imported > 0) {
        showSuccess(`Import terminé : ${result.imported} importés, ${result.skipped} ignorés`);
      } else {
        showWarning(`Import terminé : ${result.imported} importés, ${result.skipped} ignorés`);
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Erreur générale: ${error}`);
      setImportResult(result);
      
      showError('Erreur lors de l\'import');
    } finally {
      setIsProcessing(false);
    }
  }, [importFile, previewData, properties, guests, bookings, reviews, inventory, maintenanceTasks, addProperty, addGuest, addBooking, addReview, addInventoryItem, addMaintenanceTask, showSuccess, showWarning, showError]);

  // Calculate total selected records
  const totalSelectedRecords = useMemo(() => {
    let total = 0;
    exportConfig.dataTypes.forEach(type => {
      const config = dataTypeConfig.find(dt => dt.id === type);
      if (config) total += config.count;
    });
    return total;
  }, [exportConfig.dataTypes, dataTypeConfig]);

  // Render data type card
  const renderDataTypeCard = (config: typeof dataTypeConfig[0]) => {
    const isSelected = exportConfig.dataTypes.includes(config.id);
    const Icon = config.icon;
    
    const colorClasses = {
      blue: isDark ? 'from-blue-500/20 to-blue-600/20 border-blue-500/30' : 'from-blue-50 to-blue-100 border-blue-200',
      purple: isDark ? 'from-purple-500/20 to-purple-600/20 border-purple-500/30' : 'from-purple-50 to-purple-100 border-purple-200',
      green: isDark ? 'from-green-500/20 to-green-600/20 border-green-500/30' : 'from-green-50 to-green-100 border-green-200',
      yellow: isDark ? 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30' : 'from-yellow-50 to-yellow-100 border-yellow-200',
      orange: isDark ? 'from-orange-500/20 to-orange-600/20 border-orange-500/30' : 'from-orange-50 to-orange-100 border-orange-200',
      red: isDark ? 'from-red-500/20 to-red-600/20 border-red-500/30' : 'from-red-50 to-red-100 border-red-200'
    };

    return (
      <motion.button
        key={config.id}
        onClick={() => toggleDataType(config.id)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative p-4 rounded-xl border-2 transition-all ${
          isSelected
            ? `bg-gradient-to-br ${colorClasses[config.color as keyof typeof colorClasses]} shadow-lg`
            : isDark
            ? 'bg-white/5 border-white/10 hover:bg-white/10'
            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        }`}
      >
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
          </motion.div>
        )}
        
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${
            isDark ? 'bg-white/10' : 'bg-white'
          }`}>
            <Icon className={`w-5 h-5 ${
              isSelected 
                ? config.color === 'blue' ? 'text-blue-600' 
                : config.color === 'purple' ? 'text-purple-600'
                : config.color === 'green' ? 'text-green-600'
                : config.color === 'yellow' ? 'text-yellow-600'
                : config.color === 'orange' ? 'text-orange-600'
                : 'text-red-600'
                : isDark ? 'text-gray-400' : 'text-gray-500'
            }`} />
          </div>
          <div className="text-left">
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {config.label}
            </h4>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {config.count} enregistrements
            </p>
          </div>
        </div>
      </motion.button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Export / Import de Données
          </h2>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Gérez vos données avec des exports et imports complets
          </p>
        </div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className={`p-4 rounded-2xl ${
            isDark
              ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30'
              : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200'
          }`}
        >
          <Database className={`w-8 h-8 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
        </motion.div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1.5 rounded-2xl ${
        isDark ? 'bg-white/5' : 'bg-gray-100'
      }`}>
        {[
          { id: 'export', label: 'Export', icon: Download },
          { id: 'import', label: 'Import', icon: Upload },
          { id: 'backup', label: 'Sauvegarde', icon: Archive },
          { id: 'analytics', label: 'Statistiques', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === tab.id
                ? isDark
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'bg-white text-gray-900 shadow-lg'
                : isDark
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Format Selection */}
          <div className={`p-6 rounded-2xl ${
            isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Format d'export
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { format: 'json', icon: FileJson, label: 'JSON', desc: 'Format complet' },
                { format: 'csv', icon: FileText, label: 'CSV', desc: 'Tableur simple' },
                { format: 'excel', icon: FileSpreadsheet, label: 'Excel', desc: 'Format Excel' },
                { format: 'pdf', icon: FileCheck, label: 'PDF', desc: 'Document imprimable', disabled: true }
              ].map(item => (
                <button
                  key={item.format}
                  onClick={() => !item.disabled && setExportConfig(prev => ({ ...prev, format: item.format as any }))}
                  disabled={item.disabled}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    exportConfig.format === item.format
                      ? isDark
                        ? 'bg-indigo-500/20 border-indigo-500 shadow-lg'
                        : 'bg-indigo-50 border-indigo-500 shadow-lg'
                      : item.disabled
                      ? isDark
                        ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                      : isDark
                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className={`w-8 h-8 mx-auto mb-2 ${
                    exportConfig.format === item.format
                      ? 'text-indigo-600'
                      : isDark ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.label}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Data Types Selection */}
          <div className={`p-6 rounded-2xl ${
            isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Types de données ({exportConfig.dataTypes.length}/6)
              </h3>
              
              <div className="flex gap-2">
                <button
                  onClick={selectAllDataTypes}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={deselectAllDataTypes}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataTypeConfig.map(renderDataTypeCard)}
            </div>
          </div>

          {/* Options */}
          <div className={`p-6 rounded-2xl ${
            isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Options d'export
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportConfig.includeStats}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, includeStats: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className={isDark ? 'text-white' : 'text-gray-900'}>
                  Inclure les statistiques
                </span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportConfig.includeArchived}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, includeArchived: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className={isDark ? 'text-white' : 'text-gray-900'}>
                  Inclure les données archivées
                </span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportConfig.compression}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, compression: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300"
                  disabled
                />
                <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} opacity-50`}>
                  Compression (bientôt disponible)
                </span>
              </label>
            </div>
          </div>

          {/* Summary & Export Button */}
          <div className={`p-6 rounded-2xl ${
            isDark
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30'
              : 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Prêt à exporter
                </h4>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {totalSelectedRecords} enregistrements • Format {exportConfig.format.toUpperCase()}
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                disabled={isProcessing || exportConfig.dataTypes.length === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${
                  isProcessing || exportConfig.dataTypes.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Exporter maintenant
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* File Upload */}
          <div className={`p-8 rounded-2xl border-2 border-dashed ${
            isDark
              ? 'bg-white/5 border-white/10 hover:bg-white/10'
              : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
          } transition-all`}>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <Upload className={`w-16 h-16 mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Cliquez pour sélectionner un fichier
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Format supporté : JSON
              </p>
              {importFile && (
                <p className={`mt-4 px-4 py-2 rounded-lg ${
                  isDark ? 'bg-white/10 text-white' : 'bg-white text-gray-900'
                }`}>
                  📄 {importFile.name}
                </p>
              )}
            </label>
          </div>

          {/* Preview */}
          {showPreview && previewData && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-6 rounded-2xl ${
                  isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
                }`}
              >
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Aperçu du fichier
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {Object.entries(previewData.data || {}).map(([key, value]: [string, any]) => {
                    const config = dataTypeConfig.find(dt => dt.id === key);
                    if (!config) return null;
                    
                    const Icon = config.icon;
                    const count = Array.isArray(value) ? value.length : 0;
                    
                    return (
                      <div
                        key={key}
                        className={`p-4 rounded-xl ${
                          isDark ? 'bg-white/5' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                          <div>
                            <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {config.label}
                            </p>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {count} enregistrements
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleImport}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${
                      isProcessing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Import en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Importer les données
                      </>
                    )}
                  </motion.button>
                  
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setImportFile(null);
                      setPreviewData(null);
                    }}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Import Result */}
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-2xl ${
                importResult.success
                  ? isDark
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-green-50 border border-green-200'
                  : isDark
                  ? 'bg-red-500/20 border border-red-500/30'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {importResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                
                <div className="flex-1">
                  <h4 className={`text-lg font-bold mb-2 ${
                    importResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {importResult.success ? 'Import réussi !' : 'Import terminé avec erreurs'}
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Importés
                      </p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {importResult.imported}
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Ignorés
                      </p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {importResult.skipped}
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Doublons
                      </p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {importResult.duplicates}
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Erreurs
                      </p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {importResult.errors.length}
                      </p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className={`p-4 rounded-lg ${
                      isDark ? 'bg-red-500/10' : 'bg-red-50'
                    }`}>
                      <p className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-red-900'}`}>
                        Erreurs détectées :
                      </p>
                      <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-red-800'}`}>
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>• ... et {importResult.errors.length - 5} autres erreurs</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className={`p-8 rounded-2xl text-center ${
            isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <Archive className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Sauvegarde automatique
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Fonctionnalité à venir : sauvegarde automatique quotidienne
            </p>
            
            <button
              disabled
              className={`px-6 py-3 rounded-xl font-bold ${
                isDark
                  ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Configurer la sauvegarde
            </button>
          </div>
        </motion.div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {dataTypeConfig.map(config => {
            const Icon = config.icon;
            return (
              <div
                key={config.id}
                className={`p-6 rounded-2xl ${
                  isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${
                    config.color === 'blue' ? 'bg-blue-500/20' :
                    config.color === 'purple' ? 'bg-purple-500/20' :
                    config.color === 'green' ? 'bg-green-500/20' :
                    config.color === 'yellow' ? 'bg-yellow-500/20' :
                    config.color === 'orange' ? 'bg-orange-500/20' :
                    'bg-red-500/20'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      config.color === 'blue' ? 'text-blue-600' :
                      config.color === 'purple' ? 'text-purple-600' :
                      config.color === 'green' ? 'text-green-600' :
                      config.color === 'yellow' ? 'text-yellow-600' :
                      config.color === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {config.label}
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Enregistrements totaux
                    </p>
                  </div>
                </div>
                
                <div className={`text-4xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {config.count}
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Disponible pour export
                  </span>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
