'use client';

import { useEffect, useRef } from 'react';

interface QrCodeProps {
  data: string;
  size?: number;
  className?: string;
}

export default function QrCode({ data, size = 200, className = '' }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Simulation de génération QR code (à remplacer par une vraie bibliothèque QR)
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Nettoyer le canvas
    ctx.clearRect(0, 0, size, size);

    // Fond blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Bordure
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    // Pattern QR simplifié (carrés noirs)
    const moduleSize = size / 21; // QR code standard 21x21 modules

    // Coins du QR code (patterns de position)
    const drawPositionPattern = (x: number, y: number) => {
      // Carré extérieur
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);

      // Carré intérieur blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);

      // Petit carré central
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    // Dessiner les 3 patterns de position
    drawPositionPattern(0, 0);
    drawPositionPattern(size - 7 * moduleSize, 0);
    drawPositionPattern(0, size - 7 * moduleSize);

    // Ajouter du texte au centre pour indiquer que c'est un QR code
    ctx.fillStyle = '#000000';
    ctx.font = `${moduleSize * 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('QR', size / 2, size / 2 - moduleSize);
    ctx.fillText('CODE', size / 2, size / 2 + moduleSize);

    // Ajouter l'ID du QR code en petit
    ctx.font = `${moduleSize}px Arial`;
    const shortData = data.length > 10 ? data.substring(0, 10) + '...' : data;
    ctx.fillText(shortData, size / 2, size - moduleSize * 2);

  }, [data, size]);

  return (
    <div className={`inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border border-gray-300 rounded-lg"
      />
      <p className="text-xs text-gray-500 text-center mt-2 max-w-full break-all">
        {data}
      </p>
    </div>
  );
}

// Fonction utilitaire pour générer les données QR
export function generateQrData(type: string, entityId: number, url: string): string {
  const qrData = {
    id: `${type}_${entityId}_${Date.now()}`,
    type,
    entityId,
    url,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expire dans 24h
  };
  return btoa(JSON.stringify(qrData));
}

// Interface pour les données QR
interface QrData {
  id: string;
  type: string;
  entityId: number;
  url: string;
  timestamp: string;
  expiresAt: string;
}

// Fonction pour décoder les données QR
export function decodeQrData(qrString: string): QrData | null {
  try {
    const decoded = atob(qrString);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Erreur lors du décodage du QR code:', error);
    return null;
  }
}