import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/Button';

interface PropertyMergerProps {
  onClose: () => void;
  onMerged: () => void;
  properties: Array<{ id: number; name: string; status?: string; address?: string }>;
}

const NAME_STOP_WORDS = new Set([
  'appartement', 'appart', 'maison', 'villa', 'studio', 'chambre',
  'logement', 'airbnb', 'location', 'de', 'du', 'des', 'la', 'le', 'les', 'et',
]);

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeName(value: string): string[] {
  return normalizeName(value)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !NAME_STOP_WORDS.has(t));
}

function jaccardScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

function areLikelyDuplicates(left: string, right: string): boolean {
  const l = normalizeName(left);
  const r = normalizeName(right);
  if (!l || !r) return false;
  if (l === r && l.length >= 6) return true;

  const minLen = Math.min(l.length, r.length);
  if (minLen >= 8 && (l.includes(r) || r.includes(l))) return true;

  const lt = tokenizeName(left);
  const rt = tokenizeName(right);
  const score = jaccardScore(lt, rt);
  return score >= 0.72 && Math.min(lt.length, rt.length) >= 2;
}

export default function PropertyMerger({ onClose, onMerged, properties }: PropertyMergerProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const activeProperties = useMemo(
    () => properties.filter((p) => String(p.status || '').toUpperCase() !== 'INACTIVE'),
    [properties],
  );

  const recommendedIds = useMemo(() => {
    const ids = new Set<number>();
    for (let i = 0; i < activeProperties.length; i += 1) {
      for (let j = i + 1; j < activeProperties.length; j += 1) {
        const left = activeProperties[i];
        const right = activeProperties[j];
        if (areLikelyDuplicates(left.name, right.name)) {
          ids.add(left.id);
          ids.add(right.id);
        }
      }
    }
    return Array.from(ids).slice(0, 10);
  }, [activeProperties]);

  useEffect(() => {
    if (hasAutoSelected) return;
    if (recommendedIds.length >= 2) {
      setSelectedIds(recommendedIds);
      setHasAutoSelected(true);
    }
  }, [hasAutoSelected, recommendedIds]);

  const handleMerge = async () => {
    if (selectedIds.length < 2) {
      setError("Veuillez sélectionner au moins 2 annonces à fusionner.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/properties/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds: selectedIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la fusion');
      onMerged();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 dark:text-white text-gray-900">Fusionner des annonces (Doublons)</h2>
      <div className="text-sm dark:text-gray-400 text-gray-500 mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
        <p>Sélectionnez les annonces que vous souhaitez fusionner.</p>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Le système conservera toutes les informations financières (revenus, dépenses).</li>
          <li>La propriété principale sera automatiquement celle ayant la <strong>réservation la plus récente</strong>.</li>
          <li>Les autres propriétés basculeront en statut <strong>Inactif</strong>.</li>
        </ul>
      </div>

      {recommendedIds.length >= 2 && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/50 rounded-xl p-3">
          <p className="text-xs md:text-sm text-violet-700 dark:text-violet-300">
            Doublons probables détectés : <strong>{recommendedIds.length}</strong> annonce(s) pré-cochée(s).
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedIds(recommendedIds);
              setError(null);
            }}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
          >
            Recocher la suggestion
          </button>
        </div>
      )}

      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      <div className="mb-8 max-h-[40vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {activeProperties.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Aucune annonce active trouvée.</p>
        ) : (
          activeProperties.map(p => (
            <label key={p.id} className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
              selectedIds.includes(p.id) 
                ? 'border-[#FF385C] bg-[#FF385C]/5 dark:bg-[#FF385C]/10 shadow-sm' 
                : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}>
              <div className="flex-shrink-0">
                <input 
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-[#FF385C] focus:ring-[#FF385C] transition-all"
                  checked={selectedIds.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds([...selectedIds, p.id]);
                    else setSelectedIds(selectedIds.filter(id => id !== p.id));
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-base truncate ${selectedIds.includes(p.id) ? 'text-[#FF385C]' : 'dark:text-gray-200 text-gray-800'}`}>
                  {p.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                  {p.address || 'Adresse non renseignée'}
                </div>
              </div>
              {selectedIds.includes(p.id) && (
                <div className="flex-shrink-0 text-[#FF385C]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </label>
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="text-sm text-gray-500 font-medium">
          {selectedIds.length} sélectionnée(s)
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button 
            onClick={handleMerge} 
            disabled={loading || selectedIds.length < 2} 
            className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white hover:shadow-lg transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Fusion en cours...
              </span>
            ) : (
              'Fusionner'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}