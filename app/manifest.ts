import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BNBGest - Gestion de Location Courte Durée',
    short_name: 'BNBGest',
    description: 'Application complète de gestion pour locations Airbnb et Booking.com avec calendrier, réservations, nettoyage, contrats et plus',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'fr-FR',
    categories: ['business', 'productivity', 'travel'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Accéder au tableau de bord',
        url: '/admin',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Réservations',
        short_name: 'Réservations',
        description: 'Gérer les réservations',
        url: '/calendar',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Paramètres',
        short_name: 'Paramètres',
        description: 'Configuration de l\'application',
        url: '/settings',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
    screenshots: [
      {
        src: '/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
      },
      {
        src: '/screenshot-narrow.png',
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow',
      },
    ],
  };
}
