'use client';

import { useState } from 'react';
import { useCustomization, CustomizationSettings } from '../contexts/CustomizationContext';

interface CustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomizationPanel({ isOpen, onClose }: CustomizationPanelProps) {
  const { settings, themes, updateSettings, updateTheme, resetToDefaults, getThemeClasses, hasUnsavedChanges, saveChanges } = useCustomization();
  const [activeTab, setActiveTab] = useState('theme');

  if (!isOpen) return null;

  const themeClasses = getThemeClasses();

  const tabs = [
    { id: 'theme', label: 'ThÃ¨me', icon: 'ðŸŽ¨' },
    { id: 'layout', label: 'Interface', icon: 'ðŸ“' },
    { id: 'preferences', label: 'PrÃ©fÃ©rences', icon: 'âš™ï¸' },
    { id: 'dashboard', label: 'Tableau de bord', icon: 'ðŸ“Š' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-[#FF385C] p-2 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Personnalisation</h2>
              <p className="text-sm text-gray-600">Adaptez l&apos;application Ã  vos prÃ©fÃ©rences</p>
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-orange-600 font-medium">Modifications non sauvegardÃ©es</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 bg-gray-50">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#FF385C] text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="absolute bottom-4 left-4 right-4 space-y-2">
              <button
                onClick={resetToDefaults}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                ðŸ”„ RÃ©initialiser
              </button>
              <button
                onClick={() => {
                  saveChanges();
                  onClose();
                }}
                disabled={!hasUnsavedChanges}
                className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  hasUnsavedChanges
                    ? 'bg-[#FF385C] text-white hover:bg-[#E31C5F]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                âœ“ {hasUnsavedChanges ? 'Appliquer' : 'Aucune modification'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">ThÃ¨mes prÃ©dÃ©finis</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(themes).map(([key, theme]) => (
                      <button
                        key={key}
                        onClick={() => updateTheme(key)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          settings.theme.name === theme.name
                            ? 'border-[#FF385C] bg-[#FF385C]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full bg-${theme.primary}-500`}></div>
                          <div className={`w-4 h-4 rounded-full bg-${theme.secondary}-500`}></div>
                          <div className={`w-4 h-4 rounded-full bg-${theme.accent}-500`}></div>
                        </div>
                        <p className="font-medium text-gray-900 mt-2">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">AperÃ§u du thÃ¨me actuel</h3>
                  <div className={`p-6 rounded-xl ${themeClasses.background} border ${themeClasses.border}`}>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${themeClasses.surface} ${themeClasses.border}`}>
                        <h4 className={`font-bold ${themeClasses.text}`}>Titre d&apos;exemple</h4>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>Texte secondaire d&apos;exemple</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className={`px-4 py-2 rounded-lg ${themeClasses.primary}`}>Primaire</button>
                        <button className={`px-4 py-2 rounded-lg ${themeClasses.secondary}`}>Secondaire</button>
                        <button className={`px-4 py-2 rounded-lg ${themeClasses.success}`}>SuccÃ¨s</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'layout' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Taille de police</h3>
                  <div className="space-y-2">
                    {[
                      { value: 'small', label: 'Petite', size: 'text-sm' },
                      { value: 'medium', label: 'Moyenne', size: 'text-base' },
                      { value: 'large', label: 'Grande', size: 'text-lg' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateSettings({ fontSize: option.value as 'small' | 'medium' | 'large' })}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          settings.fontSize === option.value
                            ? 'border-[#FF385C] bg-[#FF385C]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`font-medium ${option.size}`}>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Espacement</h3>
                  <div className="space-y-2">
                    {[
                      { value: 'compact', label: 'Compact', desc: 'Interface dense' },
                      { value: 'comfortable', label: 'Confortable', desc: 'Ã‰quilibre parfait' },
                      { value: 'spacious', label: 'AÃ©rÃ©', desc: 'Plus d\'espace' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateSettings({ layout: option.value as 'compact' | 'comfortable' | 'spacious' })}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          settings.layout === option.value
                            ? 'border-[#FF385C] bg-[#FF385C]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <span className="font-medium">{option.label}</span>
                          <p className="text-sm text-gray-600">{option.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Langue</h3>
                  <div className="space-y-2">
                    {[
                      { value: 'fr', label: 'FranÃ§ais', flag: 'ðŸ‡«ðŸ‡·' },
                      { value: 'en', label: 'English', flag: 'ðŸ‡¬ðŸ‡§' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateSettings({ language: option.value as 'fr' | 'en' })}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          settings.language === option.value
                            ? 'border-[#FF385C] bg-[#FF385C]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg mr-3">{option.flag}</span>
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Comportement</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'animations' as keyof CustomizationSettings, label: 'Animations', desc: 'Activer les transitions et animations' },
                      { key: 'notifications' as keyof CustomizationSettings, label: 'Notifications', desc: 'Recevoir des notifications' },
                      { key: 'autoSave' as keyof CustomizationSettings, label: 'Sauvegarde automatique', desc: 'Sauvegarder automatiquement les modifications' }
                    ].map((option) => (
                      <div key={option.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <span className="font-medium">{option.label}</span>
                          <p className="text-sm text-gray-600">{option.desc}</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ [option.key]: !settings[option.key] })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings[option.key] ? 'bg-[#FF385C]' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings[option.key] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Widgets du tableau de bord</h3>
                  <p className="text-gray-600 mb-4">SÃ©lectionnez les widgets Ã  afficher sur votre tableau de bord</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'stats', label: 'Statistiques', icon: 'ðŸ“Š' },
                      { id: 'tasks', label: 'TÃ¢ches', icon: 'ðŸ“‹' },
                      { id: 'properties', label: 'PropriÃ©tÃ©s', icon: 'ðŸ ' },
                      { id: 'calendar', label: 'Calendrier', icon: 'ðŸ“…' },
                      { id: 'guests', label: 'Clients', icon: 'ðŸ'¥' },
                      { id: 'reviews', label: 'Avis', icon: 'â­' }
                    ].map((widget) => (
                      <button
                        key={widget.id}
                        onClick={() => {
                          const newWidgets = settings.dashboardWidgets.includes(widget.id)
                            ? settings.dashboardWidgets.filter(w => w !== widget.id)
                            : [...settings.dashboardWidgets, widget.id];
                          updateSettings({ dashboardWidgets: newWidgets });
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          settings.dashboardWidgets.includes(widget.id)
                            ? 'border-[#FF385C] bg-[#FF385C]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{widget.icon}</span>
                          <span className="font-medium">{widget.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Disposition</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <span className="font-medium">Barre latÃ©rale rÃ©duite</span>
                        <p className="text-sm text-gray-600">RÃ©duire l&apos;espace occupÃ© par la navigation</p>
                      </div>
                      <button
                        onClick={() => updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.sidebarCollapsed ? 'bg-[#FF385C]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.sidebarCollapsed ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
