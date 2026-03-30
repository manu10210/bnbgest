import { NextResponse } from 'next/server';
import { networkInterfaces } from 'os';

export async function GET() {
  try {
    const nets = networkInterfaces();
    let localIP = 'localhost';

    // Parcourir toutes les interfaces réseau
    for (const name of Object.keys(nets)) {
      const netInterface = nets[name];
      if (!netInterface) continue;

      for (const net of netInterface) {
        // Chercher une adresse IPv4 non-interne (pas 127.0.0.1)
        if (net.family === 'IPv4' && !net.internal) {
          localIP = net.address;
          break;
        }
      }
      if (localIP !== 'localhost') break;
    }

    return NextResponse.json({
      success: true,
      ip: localIP,
      url: `http://${localIP}:3000`,
    });
  } catch (error) {
    console.error('Error getting network IP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get network IP' },
      { status: 500 }
    );
  }
}
