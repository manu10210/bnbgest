import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const session = searchParams.get('session') || '';

  // Récupérer l'IP réseau locale (pas loopback)
  const interfaces = os.networkInterfaces();
  let localIP = '127.0.0.1';

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        localIP = info.address;
        break;
      }
    }
    if (localIP !== '127.0.0.1') break;
  }

  // Détecter le port depuis l'URL de la requête entrante
  const requestHost = request.headers.get('host') || 'localhost:3000';
  const port = requestHost.includes(':') ? requestHost.split(':')[1] : '3000';

  const networkUrl = `http://${localIP}:${port}/upload?session=${session}`;

  return NextResponse.json({
    networkUrl,
    localIP,
    port,
    session,
  });
}
