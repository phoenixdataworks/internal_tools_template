import { MetadataRoute } from 'next';
import { defaultMetadata } from '@/lib/metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = defaultMetadata.metadataBase?.toString();

  if (!baseUrl) {
    // In a real scenario, you might throw an error or have a more robust fallback.
    // For now, we'll log and use a hardcoded placeholder if metadataBase is missing,
    // though your provided file shows it's set.
    console.warn(
      'metadataBase is not defined in src/lib/metadata.ts. Falling back to placeholder for sitemap.'
    );
    // Fallback to a generic placeholder if metadataBase isn't found for some reason.
    // This ensures the build doesn't break catastrophically, but should be fixed.
    // However, given your current metadata.ts, this block should ideally not be hit.
    return [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'https://streamtrack.live',
        lastModified: new Date().toISOString(),
      },
    ];
  }

  const staticRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'];
  }> = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/features', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' }, // Contact might change less frequently than About/Pricing
    { path: '/terms', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' },
  ];

  const sitemapEntries: MetadataRoute.Sitemap = staticRoutes.map(route => ({
    url: `${baseUrl}${route.path === '/' ? '' : route.path}`, // Correctly handle the base path for root
    lastModified: new Date().toISOString(), // Using current date for lastModified
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  return sitemapEntries;
}
