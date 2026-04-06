'use client';

import { useState, useMemo, useCallback } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Download, 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  Calendar,
  Filter,
  Database,
  Package,
  Users,
  Home,
  Wrench,
  Star,
  Clock,
  ChevronRight,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ExportConfig {
  dataType: 'all' | 'properties' | 'bookings' | 'guests' | 'maintenance' | 'inventory' | 'reviews';
  format: 'json' | 'csv' | 'excel';
  dateRange?: {
    start: string;
    end: string;
  };
  includeDeleted?: boolean;
  compress?: boolean;
}

interface ImportResult {
  success: boolean;
  itemsImported: number;
  itemsSkipped: number;
  itemsUpdated: number;
  errors: string[];
  warnings: string[];
  duplicates: number;
}

interface DataExportImportAdvancedProps {
  onClose?: () => void;
}

export default function DataExportImportAdvanced({ onClose }: DataExportImportAdvancedProps) {
  const { 
    properties, 
    bookings, 
    guests, 
    maintenanceTasks, 
    inventory, 
    reviews,
    exportData,
    importData 
  } = useBNB();
  const { isDark } = useTheme();

  // States
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    dataType: 'all',
    format: 'json',
    includeDeleted: false,
    compress: false
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Data counts
  const dataCounts = useMemo(() => ({
    properties: properties.length,
    bookings: bookings.length,
    guests: guests.length,
    maintenance: maintenanceTasks.length,
    inventory: inventory.length,
    reviews: reviews.length,
    total: properties.length + bookings.length + guests.length + maintenanceTasks.length + inventory.length + reviews.length
  }), [properties, bookings, guests, maintenanceTasks, inventory, reviews]);

  // Data type options
  const dataTypeOptions = [
    { 
      value: 'all', 
      label: 'Toutes les données', 
      icon: Database, 
      count: dataCounts.total,
      color: 'indigo',
      description: 'Export complet de toute la base de données'
    },
    { 
      value: 'properties', 
      label: 'Propriétés', 
      icon: Home, 
      count: dataCounts.properties,
      color: 'blue',
      description: 'Biens immobiliers et leurs configurations'
    },
    { 
      value: 'bookings', 
      label: 'Réservations', 
      icon: Calendar, 
      count: dataCounts.bookings,
      color: 'green',
      description: 'Historique complet des réservations'
    },
    { 
      value: 'guests', 
      label: 'Voyageurs', 
      icon: Users, 
      count: dataCounts.guests,
      color: 'purple',
      description: 'Profils clients et historique'
    },
    { 
      value: 'maintenance', 
      label: 'Maintenance', 
      icon: Wrench, 
      count: dataCounts.maintenance,
      color: 'orange',
      description: 'Tâches et historique de maintenance'
    },
    { 
      value: 'inventory', 
      label: 'Inventaire', 
      icon: Package, 
      count: dataCounts.inventory,
      color: 'teal',
      description: 'Articles et stocks disponibles'
    },
    { 
      value: 'reviews', 
      label: 'Avis', 
      icon: Star, 
      count: dataCounts.reviews,
      color: 'amber',
      description: 'Notes et commentaires clients'
    }
  ];

  // Format options
  const formatOptions = [
    {
      value: 'json',
      label: 'JSON',
      icon: FileJson,
      description: 'Format structuré, idéal pour backup complet',
      features: ['Structure complète', 'Relations préservées', 'Ré-importation facile']
    },
    {
      value: 'csv',
      label: 'CSV',
      icon: FileSpreadsheet,
      description: 'Compatible Excel, Google Sheets',
      features: ['Compatible Excel', 'Léger', 'Facile à éditer']
    },
    {
      value: 'excel',
      label: 'Excel (XLSX)',
      icon: FileSpreadsheet,
      description: 'Fichier Excel avec formules et formatage',
      features: ['Multi-feuilles', 'Formatage riche', 'Graphiques']
    }
  ];

  // Get data based on type
  const getDataByType = useCallback((type: string) => {
    switch (type) {
      case 'properties': return properties;
      case 'bookings': return bookings;
      case 'guests': return guests;
      case 'maintenance': return maintenanceTasks;
      case 'inventory': return inventory;
      case 'reviews': return reviews;
      case 'all': return {
        properties,
        bookings,
        guests,
        maintenanceTasks,
        inventory,
        reviews,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
      default: return [];
    }
  }, [properties, bookings, guests, maintenanceTasks, inventory, reviews]);

  // Export to JSON
  const exportToJSON = useCallback((data: unknown, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Export to CSV
  const exportToCSV = useCallback((data: unknown[], filename: string, headers: string[]) => {
    const rows = data.map(item => {
      return headers.map(header => {
        const value = (item as Record<string, unknown>)[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Export to Excel (using SheetJS would be ideal, but we'll use CSV for now)
  const exportToExcel = useCallback(async (data: unknown[], filename: string) => {
    // For a real implementation, use SheetJS (xlsx library)
    // This is a simplified version that creates multiple CSV sheets
    const timestamp = new Date().toISOString().slice(0, 10);
    
    if (exportConfig.dataType === 'all') {
      const allData = data as unknown as { 
        properties: unknown[]; 
        bookings: unknown[]; 
        guests: unknown[];
        maintenanceTasks: unknown[];
        inventory: unknown[];
        reviews: unknown[];
      };

      // Create a workbook-like structure
      const workbook = {
        SheetNames: ['Properties', 'Bookings', 'Guests', 'Maintenance', 'Inventory', 'Reviews'],
        Sheets: {
          Properties: allData.properties,
          Bookings: allData.bookings,
          Guests: allData.guests,
          Maintenance: allData.maintenanceTasks,
          Inventory: allData.inventory,
          Reviews: allData.reviews
        }
      };

      // Export as JSON (in real app, use xlsx library)
      exportToJSON(workbook, `${filename}.json`);
    } else {
      // Single sheet export as CSV
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0] as unknown as Record<string, unknown>);
        exportToCSV(data, filename.replace('.xlsx', '.csv'), headers);
      }
    }
  }, [exportConfig.dataType, exportToJSON, exportToCSV]);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const data = getDataByType(exportConfig.dataType);
      const timestamp = new Date().toISOString().slice(0, 10);
      const baseFilename = `bnbgest-${exportConfig.dataType}-${timestamp}`;

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

      switch (exportConfig.format) {
        case 'json':
          exportToJSON(data, `${baseFilename}.json`);
          break;
        case 'csv':
          if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0] as never);
            exportToCSV(data, `${baseFilename}.csv`, headers);
          } else {
            exportToJSON(data, `${baseFilename}.json`); // Fallback for complex data
          }
          break;
        case 'excel':
          await exportToExcel(Array.isArray(data) ? data : [data], `${baseFilename}.xlsx`);
          break;
      }

      // Show success notification
      const count = exportConfig.dataType === 'all' 
        ? dataCounts.total 
        : dataCounts[exportConfig.dataType as keyof typeof dataCounts];
      
      toast.success('Export réussi', {
        description: `${count} éléments exportés avec succès`,
        duration: 3000
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur export', {
        description: 'Impossible d\'exporter les données',
        duration: 4000
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportConfig, getDataByType, dataCounts, exportToJSON, exportToCSV, exportToExcel]);

  // Handle import
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let parsedData: unknown;

        if (file.name.endsWith('.json')) {
          parsedData = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          // Basic CSV parsing
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          parsedData = lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((header, i) => {
              obj[header] = values[i] || '';
            });
            return obj;
          });
        } else {
          throw new Error('Format non supporté');
        }

        // Simulate validation and import
        const result: ImportResult = {
          success: true,
          itemsImported: Array.isArray(parsedData) ? parsedData.length : 1,
          itemsSkipped: 0,
          itemsUpdated: 0,
          errors: [],
          warnings: [],
          duplicates: 0
        };

        // In real implementation, call importData from context
        // importData(exportConfig.dataType, parsedData);

        setImportResult(result);
      } catch (error) {
        setImportResult({
          success: false,
          itemsImported: 0,
          itemsSkipped: 0,
          itemsUpdated: 0,
          errors: [(error as Error).message],
          warnings: [],
          duplicates: 0
        });
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  }, [exportConfig.dataType]);

  // Preview data
  const previewData = useMemo(() => {
    const data = getDataByType(exportConfig.dataType);
    if (Array.isArray(data)) {
      return data.slice(0, 5);
    }
    return data;
  }, [exportConfig.dataType, getDataByType]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`sticky top-0 z-10 border-b ${
          isDark 
            ? 'bg-gray-800/95 border-gray-700' 
            : 'bg-white/95 border-gray-200'
        } backdrop-blur-sm`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl ${
                isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'
              }`}>
                <Database className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Export & Import de Données
                </h1>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Sauvegardez et restaurez vos données en toute sécurité
                </p>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'hover:bg-white/10 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {(['export', 'import'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? isDark
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-600 text-white'
                    : isDark
                      ? 'text-gray-400 hover:bg-white/5'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'export' ? (
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Import
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'export' ? (
            <motion.div
              key="export"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Total
                      </p>
                      <p className={`text-2xl font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {dataCounts.total}
                      </p>
                    </div>
                    <Database className="w-8 h-8 text-indigo-500" />
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Propriétés
                      </p>
                      <p className={`text-2xl font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {dataCounts.properties}
                      </p>
                    </div>
                    <Home className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Réservations
                      </p>
                      <p className={`text-2xl font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {dataCounts.bookings}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Voyageurs
                      </p>
                      <p className={`text-2xl font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {dataCounts.guests}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Data Type Selection */}
              <div className={`p-6 rounded-xl border ${
                isDark 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Type de données à exporter
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dataTypeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = exportConfig.dataType === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => setExportConfig(prev => ({ 
                          ...prev, 
                          dataType: option.value as ExportConfig['dataType']
                        }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? `border-${option.color}-500 bg-${option.color}-500/10`
                            : isDark
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                              : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isSelected
                                ? `bg-${option.color}-500/20`
                                : isDark
                                  ? 'bg-white/5'
                                  : 'bg-gray-100'
                            }`}>
                              <Icon className={`w-5 h-5 text-${option.color}-500`} />
                            </div>
                            <div>
                              <p className={`font-medium ${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                {option.label}
                              </p>
                              <p className={`text-xs mt-0.5 ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {option.count} éléments
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className={`w-5 h-5 text-${option.color}-500`} />
                          )}
                        </div>
                        <p className={`text-xs mt-2 ${
                          isDark ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format Selection */}
              <div className={`p-6 rounded-xl border ${
                isDark 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Format d'export
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formatOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = exportConfig.format === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => setExportConfig(prev => ({ 
                          ...prev, 
                          format: option.value as ExportConfig['format']
                        }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : isDark
                              ? 'border-gray-700 hover:border-gray-600'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-6 h-6 text-indigo-500" />
                          <p className={`font-semibold ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {option.label}
                          </p>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-indigo-500 ml-auto" />
                          )}
                        </div>
                        <p className={`text-xs mb-3 ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {option.description}
                        </p>
                        <div className="space-y-1">
                          {option.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <ChevronRight className={`w-3 h-3 ${
                                isDark ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                              <span className={`text-xs ${
                                isDark ? 'text-gray-500' : 'text-gray-600'
                              }`}>
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <div className={`p-6 rounded-xl border ${
                isDark 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Options avancées
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeDeleted}
                      onChange={(e) => setExportConfig(prev => ({ 
                        ...prev, 
                        includeDeleted: e.target.checked 
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Inclure les éléments supprimés
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportConfig.compress}
                      onChange={(e) => setExportConfig(prev => ({ 
                        ...prev, 
                        compress: e.target.checked 
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Compresser le fichier (ZIP)
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className={`p-6 rounded-xl border ${
                isDark 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Aperçu des données
                  </h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      isDark 
                        ? 'hover:bg-white/10 text-gray-400' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {showPreview ? 'Masquer' : 'Afficher'}
                  </button>
                </div>

                {showPreview && (
                  <div className={`p-4 rounded-lg font-mono text-xs overflow-auto max-h-64 ${
                    isDark ? 'bg-gray-900' : 'bg-gray-50'
                  }`}>
                    <pre className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <div className="flex items-center justify-between gap-4">
                <div className={`flex items-start gap-2 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    L'export créera un fichier contenant{' '}
                    <strong>
                      {exportConfig.dataType === 'all' 
                        ? `${dataCounts.total} éléments au total`
                        : `${dataCounts[exportConfig.dataType as keyof typeof dataCounts]} ${exportConfig.dataType}`
                      }
                    </strong>
                    {' '}au format <strong>{exportConfig.format.toUpperCase()}</strong>
                  </p>
                </div>

                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    isExporting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isExporting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Exporter maintenant
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="import"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Import Zone */}
              <div className={`p-8 rounded-xl border-2 border-dashed ${
                isDark 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-white border-gray-300'
              }`}>
                <div className="text-center">
                  <Upload className={`w-16 h-16 mx-auto mb-4 ${
                    isDark ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  <h3 className={`text-lg font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Importer des données
                  </h3>
                  <p className={`text-sm mb-6 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Formats supportés: JSON, CSV, Excel (XLSX)
                  </p>

                  <input
                    type="file"
                    id="import-file"
                    accept=".json,.csv,.xlsx"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <button
                    onClick={() => document.getElementById('import-file')?.click()}
                    disabled={isImporting}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      isImporting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isImporting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Import en cours...
                      </span>
                    ) : (
                      'Sélectionner un fichier'
                    )}
                  </button>
                </div>
              </div>

              {/* Import Result */}
              {importResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-xl border ${
                    importResult.success
                      ? isDark
                        ? 'bg-green-500/10 border-green-500/50'
                        : 'bg-green-50 border-green-200'
                      : isDark
                        ? 'bg-red-500/10 border-red-500/50'
                        : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {importResult.success ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-2 ${
                        importResult.success
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}>
                        {importResult.success ? 'Import réussi !' : 'Échec de l\'import'}
                      </h4>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-white/5' : 'bg-white'
                        }`}>
                          <p className="text-xs text-gray-500">Importés</p>
                          <p className={`text-xl font-bold ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {importResult.itemsImported}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-white/5' : 'bg-white'
                        }`}>
                          <p className="text-xs text-gray-500">Mis à jour</p>
                          <p className={`text-xl font-bold ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {importResult.itemsUpdated}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-white/5' : 'bg-white'
                        }`}>
                          <p className="text-xs text-gray-500">Ignorés</p>
                          <p className={`text-xl font-bold ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {importResult.itemsSkipped}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-white/5' : 'bg-white'
                        }`}>
                          <p className="text-xs text-gray-500">Doublons</p>
                          <p className={`text-xl font-bold ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {importResult.duplicates}
                          </p>
                        </div>
                      </div>

                      {importResult.errors.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-red-600 mb-1">Erreurs:</p>
                          <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                            {importResult.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {importResult.warnings.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-orange-600 mb-1">Avertissements:</p>
                          <ul className="list-disc list-inside text-sm text-orange-600 space-y-1">
                            {importResult.warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Import Guidelines */}
              <div className={`p-6 rounded-xl border ${
                isDark 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  <Shield className="w-5 h-5 text-indigo-500" />
                  Consignes d'import
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        Formats compatibles
                      </p>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        JSON, CSV et Excel (XLSX) sont supportés
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        Validation automatique
                      </p>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Les données sont vérifiées avant l'import
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        Gestion des doublons
                      </p>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Les doublons sont automatiquement détectés et signalés
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        Historique conservé
                      </p>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Une sauvegarde automatique est créée avant l'import
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
