'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';

interface PhotoFile {
  filename: string;
  url: string;
  session: string;
  uploadedAt: string;
  size: number;
}

export default function PhotosPage() {
  const { isDark } = useTheme();
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [sessions, setSessions] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PhotoFile | null>(null);
  const [totalSize, setTotalSize] = useState(0);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/photos');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const list: PhotoFile[] = data.photos ?? [];
      setPhotos(list);
      setSessions(data.sessions ?? []);
      setTotalSize(list.reduce((s: number, p: PhotoFile) => s + (p.size || 0), 0));
    } catch (e) {
      setError('Impossible de charger les photos. ' + String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const filtered = photos
    .filter((p) =>
      (sessionFilter === 'all' || p.session === sessionFilter) &&
      (search === '' || p.filename.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const diff = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      return sortOrder === 'newest' ? diff : -diff;
    });

  const lbPrev = useCallback(
    () => setLightbox((i) => (i !== null ? (i > 0 ? i - 1 : filtered.length - 1) : null)),
    [filtered.length]
  );
  const lbNext = useCallback(
    () => setLightbox((i) => (i !== null ? (i < filtered.length - 1 ? i + 1 : 0) : null)),
    [filtered.length]
  );

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (lightbox === null) return;
      if (e.key === 'ArrowLeft') lbPrev();
      if (e.key === 'ArrowRight') lbNext();
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [lightbox, lbPrev, lbNext]);

  const handleUpload = async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('images', f));
    try {
      const res = await fetch('/api/upload?session=' + sessionId, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      await loadPhotos();
    } catch (e) {
      setError('Erreur upload : ' + String(e));
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async (photo: PhotoFile) => {
    try {
      const res = await fetch('/api/photos?filename=' + encodeURIComponent(photo.filename), { method: 'DELETE' });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.filename !== photo.filename));
        setTotalSize((prev) => prev - photo.size);
        setDeleteTarget(null);
        if (lightbox !== null) setLightbox(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? 'Suppression echouee');
      }
    } catch {
      setError('Erreur reseau lors de la suppression');
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fmtSize = (bytes: number) => {
    if (!bytes) return '--';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' Ko';
    return (bytes / 1024 / 1024).toFixed(1) + ' Mo';
  };

  const shortSession = (s: string) => {
    const ts = parseInt(s.split('_')[1]);
    return isNaN(ts) ? s.slice(0, 18) : new Date(ts).toLocaleDateString('fr-FR');
  };

  // Theme-aware styling
  const bg = isDark ? 'bg-[#1a1a2e]' : 'bg-[#f7f7f7]';
  const txt = isDark ? 'text-white' : 'text-[#222222]';
  const txtSec = isDark ? 'text-white/60' : 'text-[#717171]';
  const txtMuted = isDark ? 'text-white/40' : 'text-gray-400';
  const cardCls = isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white border-gray-100';
  const hdrBg = isDark ? 'bg-[#1a1a2e]/95 border-white/[0.08]' : 'bg-white/80 border-white/20';
  const inputCls = isDark ? 'bg-white/[0.05] border-white/[0.12] text-white placeholder:text-white/30' : 'bg-white border-gray-200 text-[#222222]';
  const btnSec = isDark ? 'border-white/[0.12] text-white/60 hover:bg-white/[0.06]' : 'border-gray-200 text-gray-500 hover:bg-gray-50';
  const dividerCls = isDark ? 'divide-white/[0.04]' : 'divide-gray-50';
  const theadCls = isDark ? 'bg-white/[0.02] border-b border-white/[0.06]' : 'bg-gray-50 border-b border-gray-100';
  const hoverRow = isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-50';
  const modalBg = isDark ? 'bg-[#222244] border-white/[0.08]' : 'bg-white border-gray-100';
  const cancelBtn = isDark ? 'bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  return (
    <div className={`${bg} ${txt} min-h-screen transition-colors duration-300`}>
      <header className={`${hdrBg} backdrop-blur-lg shadow-sm border-b sticky top-0 z-30`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FF385C] p-2.5 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className={`${txt} text-xl font-bold`}>Galerie Photos</h1>
              <p className={`${txtSec} text-xs`}>{photos.length} photo{photos.length !== 1 ? 's' : ''} - {fmtSize(totalSize)}</p>
            </div>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/" className={`${txtSec} text-sm hover:text-[#FF385C] transition-colors`}>Accueil</Link>
            <Link href="/admin" className={`${txtSec} text-sm hover:text-[#FF385C] transition-colors`}>Dashboard</Link>
            <Link href="/upload" className="bg-[#FF385C] text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-lg transition-all">+ Upload</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`${cardCls} rounded-2xl shadow-sm border p-4 mb-6 flex flex-wrap items-center gap-3`}>
          <div className="relative flex-1 min-w-48">
            <svg className={`${txtMuted} absolute left-3 top-2.5 w-4 h-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Rechercher par nom de fichier..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#FF385C] focus:border-transparent outline-none`} />
          </div>
          <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className={`${inputCls} rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF385C] outline-none border`}>
            <option value="all">Toutes les sessions ({photos.length})</option>
            {sessions.map((s) => (<option key={s} value={s}>{shortSession(s)} ({photos.filter((p) => p.session === s).length})</option>))}
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')} className={`${inputCls} rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF385C] outline-none border`}>
            <option value="newest">Plus recentes</option>
            <option value="oldest">Plus anciennes</option>
          </select>
          <div className={`flex border rounded-xl overflow-hidden ${isDark ? 'border-white/[0.12]' : 'border-gray-200'}`}>
            {(['grid', 'list'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={viewMode === mode ? 'px-3 py-2 text-sm bg-[#FF385C] text-white' : `px-3 py-2 text-sm ${isDark ? 'text-white/60 hover:bg-white/[0.06]' : 'text-gray-500 hover:bg-gray-50'}`}>
                {mode === 'grid' ? 'Grille' : 'Liste'}
              </button>
            ))}
          </div>
          <button onClick={loadPhotos} className={`${btnSec} border rounded-xl px-3 py-2 text-sm transition-colors`}>Actualiser</button>
        </div>

        <label
          className={uploading
            ? 'block w-full mb-6 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer border-[#FF385C] bg-[#FF385C]/5'
            : `block w-full mb-6 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer ${isDark ? 'border-white/[0.12] hover:border-[#FF385C]/40 hover:bg-[#FF385C]/5' : 'border-gray-200 hover:border-[#FF385C]/30 hover:bg-[#FF385C]/5'}`
          }
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
        >
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          {uploading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#FF385C]" />
              <span className="text-[#FF385C] font-medium text-sm">Upload en cours...</span>
            </div>
          ) : (
            <div>
              <svg className={`${txtMuted} w-10 h-10 mx-auto mb-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className={`${txtSec} text-sm font-medium`}>Glissez des photos ici ou cliquez pour selectionner</p>
              <p className={`${txtMuted} text-xs mt-0.5`}>JPG, PNG, WEBP, GIF - plusieurs fichiers acceptes</p>
            </div>
          )}
        </label>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300 font-bold">X</button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto" />
              <p className={`${txtMuted} text-sm`}>Chargement des photos...</p>
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-24">
            <svg className={`${txtMuted} w-16 h-16 mx-auto mb-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <h3 className={`${txtSec} text-xl font-semibold mt-4 mb-2`}>{photos.length === 0 ? 'Aucune photo disponible' : 'Aucun resultat'}</h3>
            <p className={`${txtMuted} text-sm mb-6`}>{photos.length === 0 ? 'Glissez des photos ci-dessus ou utilisez la page Upload' : 'Modifiez vos criteres de filtre ou de recherche'}</p>
            {photos.length === 0 && (<Link href="/upload" className="bg-[#FF385C] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all">Aller a Upload</Link>)}
          </div>
        )}

        {!loading && filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map((photo, idx) => (
              <div key={photo.filename} className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-[1.03] ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} onClick={() => setLightbox(idx)}>
                <Image src={photo.url} alt={photo.filename} fill sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,17vw" className="object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col justify-end">
                  <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate leading-tight">{photo.filename}</p>
                    <p className="text-gray-300 text-xs">{fmtSize(photo.size)}</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(photo); }} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center z-10" title="Supprimer">X</button>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && viewMode === 'list' && (
          <div className={`${cardCls} rounded-2xl shadow-sm border overflow-hidden`}>
            <table className="w-full text-sm">
              <thead className={theadCls}>
                <tr>
                  <th className={`${txtSec} text-left px-4 py-3 font-medium`}>Apercu</th>
                  <th className={`${txtSec} text-left px-4 py-3 font-medium`}>Fichier</th>
                  <th className={`${txtSec} text-left px-4 py-3 font-medium hidden sm:table-cell`}>Session</th>
                  <th className={`${txtSec} text-left px-4 py-3 font-medium hidden md:table-cell`}>Date</th>
                  <th className={`${txtSec} text-left px-4 py-3 font-medium hidden md:table-cell`}>Taille</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${dividerCls}`}>
                {filtered.map((photo, idx) => (
                  <tr key={photo.filename} className={`${hoverRow} transition-colors`}>
                    <td className="px-4 py-2">
                      <div className={`relative w-14 h-14 rounded-lg overflow-hidden cursor-pointer ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} onClick={() => setLightbox(idx)}>
                        <Image src={photo.url} alt={photo.filename} fill sizes="56px" className="object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-2"><span className={`${txt} font-medium text-xs break-all`}>{photo.filename}</span></td>
                    <td className={`${txtSec} px-4 py-2 text-xs hidden sm:table-cell`}>{shortSession(photo.session)}</td>
                    <td className={`${txtSec} px-4 py-2 text-xs whitespace-nowrap hidden md:table-cell`}>{fmtDate(photo.uploadedAt)}</td>
                    <td className={`${txtSec} px-4 py-2 text-xs hidden md:table-cell`}>{fmtSize(photo.size)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setLightbox(idx)} className="text-[#FF385C] hover:text-[#E31C5F] text-xs font-medium">Voir</button>
                        <a href={photo.url} download={photo.filename} className="text-green-500 hover:text-green-400 text-xs font-medium">DL</a>
                        <button onClick={() => setDeleteTarget(photo)} className="text-red-500 hover:text-red-400 text-xs font-medium">Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && photos.length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total photos', value: String(photos.length), color: 'text-[#FF385C]' },
              { label: 'Affichees', value: String(filtered.length), color: 'text-blue-400' },
              { label: 'Sessions', value: String(sessions.length), color: 'text-[#FF385C]' },
              { label: 'Espace disque', value: fmtSize(totalSize), color: 'text-green-400' },
            ].map((stat, i) => (
              <div key={i} className={`${cardCls} rounded-2xl p-4 shadow-sm border text-center`}>
                <div className={'text-2xl font-bold ' + stat.color}>{stat.value}</div>
                <div className={`${txtSec} text-xs mt-0.5`}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox !== null && filtered[lightbox] && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10 leading-none" onClick={() => setLightbox(null)}>X</button>
          <button className="absolute left-2 sm:left-4 text-white/70 hover:text-white text-5xl z-10 p-2 leading-none" onClick={(e) => { e.stopPropagation(); lbPrev(); }}>{'<'}</button>
          <div className="relative max-w-[88vw] max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Image src={filtered[lightbox].url} alt={filtered[lightbox].filename} width={1200} height={900} className="object-contain max-h-[80vh] rounded-xl shadow-2xl" priority />
          </div>
          <button className="absolute right-2 sm:right-4 text-white/70 hover:text-white text-5xl z-10 p-2 leading-none" onClick={(e) => { e.stopPropagation(); lbNext(); }}>{'>'}</button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-center py-4 px-6">
            <p className="text-sm font-medium truncate">{filtered[lightbox].filename}</p>
            <p className="text-xs text-gray-300 mt-0.5">{fmtDate(filtered[lightbox].uploadedAt)} - {fmtSize(filtered[lightbox].size)} - {lightbox + 1} / {filtered.length}</p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <a href={filtered[lightbox].url} download={filtered[lightbox].filename} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors" onClick={(e) => e.stopPropagation()}>Télécharger</a>
              <button className="text-xs bg-red-500/80 hover:bg-red-600 px-3 py-1 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); setDeleteTarget(filtered[lightbox]); }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className={`${modalBg} rounded-2xl p-6 max-w-sm w-full shadow-2xl border`}>
            <h3 className={`${txt} text-lg font-bold mb-3`}>Supprimer cette photo ?</h3>
            <div className={`relative w-full h-44 rounded-xl overflow-hidden mb-3 ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
              <Image src={deleteTarget.url} alt={deleteTarget.filename} fill className="object-cover" />
            </div>
            <p className={`${txtSec} text-xs mb-1 break-all`}>{deleteTarget.filename}</p>
            <p className={`${txtMuted} text-xs mb-3`}>{fmtSize(deleteTarget.size)}</p>
            <p className="text-xs text-red-400 mb-4">Action irreversible - le fichier sera supprime du serveur.</p>
            <div className="flex gap-3">
              <button onClick={() => confirmDelete(deleteTarget)} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-colors">Supprimer</button>
              <button onClick={() => setDeleteTarget(null)} className={`${cancelBtn} flex-1 py-2.5 rounded-xl font-medium transition-colors`}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
