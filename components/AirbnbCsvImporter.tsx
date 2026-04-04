'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Check, Save, FileText, AlertCircle, Home, Database } from 'lucide-react';
import { useBNB } from '@/contexts/BNBContext';
import { useSession } from 'next-auth/react';

interface CSVProperty {
  name: string;
  address: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  price: number;
  description: string;
}

export default function AirbnbCsvImporter({ onClose }: { onClose: () => void }) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<CSVProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { properties } = useBNB();
  const { data: session } = useSession();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError("Veuillez importer un fichier CSV d'Airbnb");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
      setFileName(file.name);
      setError(null);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  // Parsing CSV simplifié
  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) throw new Error("Fichier vide ou invalide");

      const _headers = lines[0].split(',').map(h => h.trim());
      const data: CSVProperty[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Un découpage rapide, à adapter selon le vrai CSV Airbnb
        // Si CSV complexes avec guillemets, on pourra améliorer la regex
        const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const cleanVal = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : '';
        
        // Ceci est une simulation de colonnes standard Airbnb : Nom, Adresse, Lits, etc.
        data.push({
          name: cleanVal(values[0] || '') || `Propriété Importée ${i}`,
          address: cleanVal(values[1] || '') || "Adresse Inconnue",
          city: cleanVal(values[2] || '') || "Ville",
          bedrooms: parseInt(cleanVal(values[3] || '')) || 1,
          bathrooms: parseInt(cleanVal(values[4] || '')) || 1,
          capacity: parseInt(cleanVal(values[5] || '')) || 2,
          price: parseInt(cleanVal(values[6] || '')) || 100,
          description: cleanVal(values[7] || '') || "Importé depuis Airbnb",
        });
      }

      setParsedData(data);
    } catch (e: any) {
      setError("Erreur lors de l'analyse du CSV : " + e.message);
    }
  };

  const handleImportToDatabase = async () => {
    setIsImporting(true);
    let successCount = 0;

    try {
      const userId = session?.user?.id || 'demo-user-id';
      
      // Ici on boucle sur les logements et on tape l'API de base
      for (const item of parsedData) {
        try {
          const res = await fetch('/api/properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              name: item.name,
              address: item.address,
              city: item.city,
              country: "France",
              bedrooms: item.bedrooms,
              bathrooms: item.bathrooms,
              capacity: item.capacity,
              price: item.price,
              description: item.description,
              status: 'ACTIVE',
              externalSource: 'airbnb'
            })
          });

          if (res.ok) {
            successCount++;
            // Refresh is enough, we don't need a dispatch
            // const newProp = await res.json();
          }
        } catch (e) {
          console.error("Erreur ajout", item.name, e);
        }
      }

      alert(`✅ Importation terminée ! ${successCount} annonces ont été créées dans la base de données.`);
      onClose();
      // On rafraîchit la page pour voir les nouvelles annonces
      window.location.reload(); 
    } catch (e) {
      setError("Un problème serveur est survenu pendant l'importation.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl w-full border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold dark:text-white">Importateur Airbnb CSV</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 dark:text-gray-400" />
          </button>
        </div>

        {!fileContent ? (
          <div 
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 text-center font-medium">
              Cliquez ici pour sélectionner le fichier CSV Airbnb<br/>ou glissez-le ici
            </p>
            <p className="text-gray-400 text-sm mt-2 text-center">
              Allez sur Airbnb {'>'} Annonces {'>'} Exporter au format CSV
            </p>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-lg flex items-center gap-3">
              <Check className="w-5 h-5" />
              <div>
                <p className="font-medium">Fichier "{fileName}" analysé avec succès !</p>
                <p className="text-sm opacity-90">{parsedData.length} annonces détectées prêtes à l'importation.</p>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-2">
              {parsedData.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.capacity} pers • {item.bedrooms} lits • {item.price}€ / nuit
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => { setFileContent(null); setParsedData([]); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                disabled={isImporting}
              >
                Annuler
              </button>
              <button 
                onClick={handleImportToDatabase}
                disabled={isImporting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-all"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Importation en cours...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Créer ces Annonces dans BNBGEST
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
