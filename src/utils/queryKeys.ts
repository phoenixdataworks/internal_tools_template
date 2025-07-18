/**
 * Standardized query keys for React Query
 * Use these constants to ensure consistent cache keys across the application
 */

export const QueryKeys = {
  // User related keys
  user: (userId?: string) => ['user', userId],

  // Team related keys
  teams: (userId?: string) => ['teams', userId],
  team: (teamId?: string) => ['team', teamId],

  // Notification related keys
  notifications: (userId?: string) => ['notifications', userId],

  // Chat related keys
  chatThreads: (teamId?: string) => ['chat-threads', teamId],
  chatComments: (threadId?: string) => ['chat-comments', threadId],

  // Invites related keys
  pendingInvites: (userId?: string) => ['pending-invites', userId],
};
