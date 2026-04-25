export const dynamic = 'force-dynamic';

export const runtime = 'edge';

interface VercelEnvInfo {
  region?: string;
  env: string;
  url: string;
  deploymentId?: string;
  gitBranch?: string;
  gitCommitSha?: string;
}

export async function GET(request: Request) {
  try {
    // Protection : token Bearer obligatoire
    const authHeader = request.headers.get('authorization');
    const internalToken = process.env.INTERNAL_API_TOKEN?.trim();

    // Bloquer si pas de token configuré OU si token fourni incorrect
    if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les informations Vercel depuis les headers et variables d'environnement
    const headers = request.headers;
    
    const envInfo: VercelEnvInfo = {
      region: headers.get('x-vercel-id')?.split('::')[0] || 'unknown',
      env: process.env.VERCEL_ENV || 'development',
      url: process.env.VERCEL_URL || 'localhost',
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || undefined,
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF || undefined,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || undefined,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: envInfo,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=10, stale-while-revalidate=59',
        },
      }
    );
  } catch (error) {
    console.error('[Vercel Env] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to fetch environment info' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
