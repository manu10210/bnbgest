import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://bnbgest.vercel.app';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/admin2',
          '/employee',
          '/client',
          '/api/',
          '/settings',
          '/upload',
          '/upload-video',
          '/photos',
          '/uploads/',
          '/*.json$',
          '/*.log$',
        ],
      },
      {
        userAgent: ['Googlebot', 'Bingbot'],
        allow: ['/guide/'],
        disallow: ['/api/'],
      },
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot'],
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
