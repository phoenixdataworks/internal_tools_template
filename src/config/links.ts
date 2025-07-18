/**
 * Configuration for link generation and slug behavior
 */
export const linkConfig = {
  slugGeneration: {
    /**
     * Primary strategy for slug generation
     * - 'url-based': Generate human-readable slugs from destination URLs
     * - 'random': Always use random nanoid generation
     * - 'hybrid': Try URL-based first, fallback to random
     */
    strategy: 'url-based' as 'url-based' | 'random' | 'hybrid',

    /**
     * Maximum length for URL-based slugs
     */
    maxLength: 50,

    /**
     * Length for random fallback slugs
     */
    fallbackLength: 7,

    /**
     * Enable collision handling by appending numbers
     */
    enableCollisionHandling: true,

    /**
     * Use platform-specific URL parsing logic
     */
    platformSpecificLogic: true,

    /**
     * Maximum attempts to generate unique slug
     */
    maxAttempts: 5,
  },

  /**
   * Platform-specific settings
   */
  platforms: {
    rumble: {
      /**
       * Remove video ID prefixes (e.g., v123456-)
       */
      removeIdPrefix: true,

      /**
       * Common prefixes to remove
       */
      prefixPatterns: [/^v\d+-/, /^embed-/],
    },

    youtube: {
      /**
       * Handle different YouTube URL formats
       */
      handleShortUrls: true, // youtu.be
      handleEmbedUrls: true,
      handleWatchUrls: true,
    },

    twitch: {
      /**
       * Filter out numeric IDs from paths
       */
      filterNumericIds: true,

      /**
       * Remove common noise words
       */
      removeNoiseWords: ['videos', 'clips'],
    },
  },

  /**
   * General URL processing settings
   */
  processing: {
    /**
     * Remove www. prefix from domains
     */
    removeWwwPrefix: true,

    /**
     * Words to filter out from URL paths
     */
    noiseWords: ['video', 'watch', 'v', 'content', 'post', 'article', 'page'],

    /**
     * Maximum number of path segments to include
     */
    maxPathSegments: 3,

    /**
     * Minimum segment length to include
     */
    minSegmentLength: 2,

    /**
     * Remove file extensions
     */
    removeFileExtensions: ['.html', '.php', '.htm', '.aspx'],
  },

  /**
   * Character handling
   */
  sanitization: {
    /**
     * Replace non-alphanumeric characters with hyphens
     */
    replaceSpecialChars: true,

    /**
     * Collapse multiple consecutive hyphens
     */
    collapseHyphens: true,

    /**
     * Remove leading and trailing hyphens
     */
    trimHyphens: true,

    /**
     * Convert to lowercase
     */
    toLowerCase: true,
  },
} as const;

/**
 * Domain mapping for consistent naming
 */
export const domainMap: Record<string, string> = {
  youtube: 'youtube',
  youtu: 'youtube', // for youtu.be
  rumble: 'rumble',
  twitch: 'twitch',
  kick: 'kick',
  tiktok: 'tiktok',
  instagram: 'instagram',
  facebook: 'facebook',
  twitter: 'twitter',
  x: 'twitter', // x.com -> twitter for consistency
  linkedin: 'linkedin',
  pinterest: 'pinterest',
  snapchat: 'snapchat',
  discord: 'discord',
  reddit: 'reddit',
} as const;
