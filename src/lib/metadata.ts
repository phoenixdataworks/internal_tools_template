import { Metadata } from 'next';

// Basic app information
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'StreamTrack';
export const APP_DESCRIPTION =
  'Comprehensive stream monitoring and analytics platform for content creators';

// Format: Page Name - App Name
export function getPageTitle(pageName: string): string {
  return `${pageName} - ${APP_NAME}`;
}

// Default metadata with enhanced SEO properties
export const defaultMetadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: `${APP_NAME} Team` }],
  keywords: [
    'livestream metrics',
    'rumble monitoring',
    'youtube monitoring',
    'twitch monitoring',
    'content creator analytics',
    'stream performance',
    'audience engagement',
    'streaming statistics',
    'live broadcast analytics',
    'chat sentiment analysis',
    'real-time sentiment monitoring',
    'live chat analytics',
    'sentiment tracking',
    'viewer mood analysis',
    'chat emotion detection',
    'sentiment trends',
    'live stream sentiment',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: 'index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1',
  },
  creator: `${APP_NAME} Team`,
  publisher: APP_NAME,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://streamtrack.live'), // Replace with actual domain
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://streamtrack.live', // Replace with actual domain
  },
};

// Generate comprehensive metadata for pages with enhanced SEO
export function generateMetadata(pageName: string, pageDescription?: string): Metadata {
  const title = getPageTitle(pageName);
  const description = pageDescription || APP_DESCRIPTION;
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://streamtrack.live'); // Replace with actual domain

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: APP_NAME,
      locale: 'en_US',
      images: [
        {
          url: new URL('/logo-square.png', url).toString(),
          width: 1200,
          height: 630,
          alt: `${APP_NAME} - ${pageName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@streamtrack', // Replace with actual Twitter handle
      images: [new URL('/logo-square.png', url).toString()],
    },
    alternates: {
      canonical: url.toString(),
    },
    // Structured data for better search engine understanding
    other: {
      'og:image': new URL('/logo-square.png', url).toString(),
      'application-name': APP_NAME,
    },
  };
}

// Generate JSON-LD structured data for organization
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://streamtrack.live', // Replace with actual domain
    logo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://streamtrack.live'}/logo-square.png`, // Replace with actual domain
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-503-484-4586', // Replace with actual contact info
      contactType: 'customer service',
      email: 'connect@streamtrack.live', // Replace with actual email
    },
  };
}

// Generate JSON-LD structured data for software application
export function generateSoftwareAppSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    applicationCategory: 'AnalyticsApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    operatingSystem: 'Web',
    description: APP_DESCRIPTION,
  };
}

// Generate JSON-LD structured data for a generic WebPage
export function generateWebPageSchema(pageName: string, description: string, path: string) {
  const url = new URL(path, defaultMetadata.metadataBase || 'https://streamtrack.live').toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: getPageTitle(pageName),
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: APP_NAME,
      url: (defaultMetadata.metadataBase || 'https://streamtrack.live').toString(),
    },
    // Consider adding datePublished and dateModified if available for the page
  };
}
