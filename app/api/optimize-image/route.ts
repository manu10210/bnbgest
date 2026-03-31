export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface ImageOptimizationRequest {
  url: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}

interface ImageOptimizationResponse {
  optimizedUrl: string;
  originalSize?: number;
  optimizedSize?: number;
  savings?: number;
  format: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: ImageOptimizationRequest = await request.json();
    
    // Validation
    if (!body.url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Paramètres par défaut
    const width = body.width || 1200;
    const quality = body.quality || 80;
    const format = body.format || 'webp';

    // Construire l'URL optimisée via Next.js Image Optimization
    const optimizedUrl = `/_next/image?url=${encodeURIComponent(body.url)}&w=${width}&q=${quality}`;

    // Simuler les statistiques d'optimisation
    // En production, vous pourriez appeler l'API de traitement d'image
    const response: ImageOptimizationResponse = {
      optimizedUrl,
      format,
      originalSize: undefined, // À implémenter
      optimizedSize: undefined, // À implémenter
      savings: undefined, // À implémenter
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[Image Optimization] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to optimize image' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response(
      JSON.stringify({ error: 'URL parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Générer un blur placeholder
  const blurDataUrl = await generateBlurPlaceholder(url);

  return new Response(
    JSON.stringify({ 
      url,
      blurDataUrl,
      formats: ['webp', 'avif', 'jpeg'],
      sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}

async function generateBlurPlaceholder(imageUrl: string): Promise<string> {
  // Placeholder SVG simple pour le blur
  // En production, utiliser une vraie librairie de traitement d'image
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" fill="#f3f4f6"/>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
