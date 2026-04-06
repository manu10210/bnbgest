'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Video, ArrowLeft, ExternalLink, AlertCircle, Play, Home, Clock, ChevronRight } from 'lucide-react';

interface EquipmentGuide {
  id: string;
  propertyId: number;
  equipmentName: string;
  category: string;
  videoUrl: string;
  description: string;
  createdAt: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    let videoId = '';
    if (url.includes('youtube.com/watch')) {
      videoId = new URL(url).searchParams.get('v') || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0] || '';
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;
  } catch { return null; }
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  } catch { return null; }
}

const CATEGORY_LABELS: Record<string, string> = {
  chauffage: 'Chauffage',
  climatisation: 'Climatisation',
  electromenager: 'Électroménager',
  multimedia: 'Multimédia / TV',
  securite: 'Sécurité / Accès',
  salle_de_bain: 'Salle de bain',
  cuisine: 'Cuisine',
  buanderie: 'Buanderie',
  exterieur: 'Extérieur',
  autre: 'Équipement',
};

export default function GuidePage() {
  const params = useParams();
  const [guide, setGuide] = useState<EquipmentGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadGuide() {
      try {
        // Charger depuis l'API serveur
        const response = await fetch(`/api/guides?id=${params.id}`);
        
        if (response.ok) {
          const data = await response.json();
          setGuide(data);
        } else {
          // Fallback: essayer localStorage pour compatibilité
          let saved = localStorage.getItem('bnbgest_equipment_guides_v2');
          if (!saved) {
            saved = localStorage.getItem('bnbgest_equipment_guides');
          }
          
          if (saved) {
            const guides: EquipmentGuide[] = JSON.parse(saved);
            const found = guides.find(g => g.id === params.id);
            if (found) {
              setGuide(found);
            } else {
              setNotFound(true);
            }
          } else {
            setNotFound(true);
          }
        }
      } catch {
        // En cas d'erreur API, essayer localStorage
        try {
          let saved = localStorage.getItem('bnbgest_equipment_guides_v2');
          if (!saved) {
            saved = localStorage.getItem('bnbgest_equipment_guides');
          }
          
          if (saved) {
            const guides: EquipmentGuide[] = JSON.parse(saved);
            const found = guides.find(g => g.id === params.id);
            if (found) {
              setGuide(found);
            } else {
              setNotFound(true);
            }
          } else {
            setNotFound(true);
          }
        } catch {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    }

    loadGuide();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#FF385C] border-t-transparent" />
          <span className="text-[#717171] text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  if (notFound || !guide) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-[#222222] mb-2">Guide introuvable</h1>
          <p className="text-[#717171] text-sm mb-6">
            Ce guide vidéo n&apos;existe pas ou a été supprimé.
          </p>
          <a href="/" className="inline-flex items-center gap-2 text-[#FF385C] font-medium text-sm hover:underline">
            <Home className="w-4 h-4" /> Retour à l&apos;accueil
          </a>
        </div>
      </div>
    );
  }

  const youtubeEmbed = getYouTubeEmbedUrl(guide.videoUrl);
  const vimeoEmbed = getVimeoEmbedUrl(guide.videoUrl);
  const embedUrl = youtubeEmbed || vimeoEmbed;
  const categoryLabel = CATEGORY_LABELS[guide.category] || 'Équipement';
  
  // Détecte si c'est une vidéo locale (commence par /uploads/)
  const isLocalVideo = guide.videoUrl.startsWith('/uploads/') || guide.videoUrl.includes('/uploads/');
  
  // Convertir le chemin de la vidéo pour utiliser l'API de streaming
  const videoSrc = isLocalVideo 
    ? `/api/video/${guide.videoUrl.split('/').pop()}` 
    : guide.videoUrl;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-[#ebebeb] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF385C] flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[#FF385C]">bnbgest</span>
          </div>
          <span className="text-xs text-[#b0b0b0]">Guide équipement</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[#b0b0b0] mb-4">
          <span>{categoryLabel}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#222222] font-medium">{guide.equipmentName}</span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#222222] mb-1">{guide.equipmentName}</h1>
          <p className="text-sm text-[#717171]">Comment utiliser cet équipement</p>
        </div>

        {/* Video Player */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden shadow-sm mb-6">
          {isLocalVideo ? (
            // Vidéo locale uploadée
            <div className="relative w-full bg-black">
              <video
                src={videoSrc}
                controls
                playsInline
                preload="metadata"
                className="w-full h-auto"
                style={{ maxHeight: '70vh' }}
                crossOrigin="anonymous"
              >
                <source src={videoSrc} type="video/quicktime" />
                <source src={videoSrc} type="video/mp4" />
                Votre navigateur ne supporte pas la lecture de vidéo.
              </video>
            </div>
          ) : embedUrl ? (
            // Vidéo YouTube ou Vimeo
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={guide.equipmentName}
              />
            </div>
          ) : (
            // Lien externe
            <a
              href={guide.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-16 px-4 bg-gradient-to-br from-[#FF385C]/5 to-[#FF385C]/10 hover:from-[#FF385C]/10 hover:to-[#FF385C]/15 transition-all group"
            >
              <div className="w-20 h-20 rounded-full bg-[#FF385C] flex items-center justify-center mb-4 shadow-lg shadow-[#FF385C]/20 group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <p className="text-[#222222] font-semibold mb-1">Voir la vidéo</p>
              <p className="text-[#717171] text-sm flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> S&apos;ouvre dans un nouvel onglet
              </p>
            </a>
          )}
        </div>

        {/* Instructions */}
        {guide.description && (
          <div className="bg-white rounded-2xl border border-[#ebebeb] p-6 shadow-sm mb-6">
            <h2 className="font-bold text-[#222222] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF385C]" />
              Instructions rapides
            </h2>
            <div className="text-sm text-[#484848] leading-relaxed whitespace-pre-line">
              {guide.description}
            </div>
          </div>
        )}

        {/* Direct link fallback */}
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-4 shadow-sm">
          <p className="text-xs text-[#b0b0b0] mb-2">Lien direct vers la vidéo :</p>
          <a
            href={guide.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#FF385C] hover:underline break-all flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            {guide.videoUrl}
          </a>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 mb-4">
          <p className="text-xs text-[#b0b0b0]">Propulsé par BNBGest</p>
        </div>
      </main>
    </div>
  );
}
