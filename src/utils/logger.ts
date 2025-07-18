/**
 * Application logger utility
 * Provides consistent logging with prefixes and level-based filtering
 * Can be disabled in production or filtered by level
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  enabled?: boolean;
  minLevel?: LogLevel;
}

// Default options
const DEFAULT_OPTIONS: LoggerOptions = {
  enabled: process.env.NODE_ENV !== 'production',
  minLevel: 'debug',
};

// Map log levels to numeric values for comparison
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Create a logger instance for a specific component/context
 * @param prefix The prefix to add to all logs from this logger (e.g., '[Auth]')
 * @param options Optional configuration for this logger
 */
export function createLogger(prefix: string, options: LoggerOptions = {}) {
  const { enabled = DEFAULT_OPTIONS.enabled, minLevel = DEFAULT_OPTIONS.minLevel } = options;
  const minLevelValue = LOG_LEVEL_VALUES[minLevel as LogLevel];

  const logger = {
    debug(...args: any[]) {
      if (!enabled || LOG_LEVEL_VALUES.debug < minLevelValue) return;
      console.log(`${prefix}`, ...args);
    },

    info(...args: any[]) {
      if (!enabled || LOG_LEVEL_VALUES.info < minLevelValue) return;
      console.info(`${prefix}`, ...args);
    },

    warn(...args: any[]) {
      if (!enabled || LOG_LEVEL_VALUES.warn < minLevelValue) return;
      console.warn(`${prefix}`, ...args);
    },

    error(...args: any[]) {
      if (!enabled || LOG_LEVEL_VALUES.error < minLevelValue) return;
      console.error(`${prefix}`, ...args);
    },
  };

  return logger;
}

// Create shared loggers for common parts of the application
export const AuthLogger = createLogger('[Auth]');
export const TeamLogger = createLogger('[Teams]');
export const AppLogger = createLogger('[App]');
export const ChatLogger = createLogger('[Chat]');
export const ApiLogger = createLogger('[API]');
export const PendingInviteLogger = createLogger('[PendingInvites]');
export const QueryLogger = createLogger('[Query]');
export const ClientLogger = createLogger('[Client]');
export const SupabaseLogger = createLogger('[Supabase]');
