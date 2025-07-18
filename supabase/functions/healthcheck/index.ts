import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Deno type declarations
declare global {
  interface Window {
    Deno: {
      env: {
        get(key: string): string | undefined;
      };
    };
  }

  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  checks: {
    database: 'healthy' | 'unhealthy' | 'skipped';
    environment: 'healthy' | 'unhealthy';
  };
  responseTime: number;
}

interface DatabaseCheckResult {
  status: 'healthy' | 'unhealthy' | 'skipped';
  error?: string;
}

// Health check configuration
const HEALTH_CHECK_CONFIG = {
  version: '1.0.0',
  environment: Deno.env.get('ENVIRONMENT') || 'development',
  timeoutMs: 5000, // 5 second timeout for database checks
};

// Check environment variables
function checkEnvironment(): 'healthy' | 'unhealthy' {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];

  const missingVars = requiredVars.filter(varName => !Deno.env.get(varName));

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    return 'unhealthy';
  }

  return 'healthy';
}

// Check database connectivity (optional - can be skipped in development)
async function checkDatabase(): Promise<DatabaseCheckResult> {
  try {
    // Skip database check in development if explicitly set
    if (
      HEALTH_CHECK_CONFIG.environment === 'development' &&
      Deno.env.get('SKIP_DB_HEALTH_CHECK') === 'true'
    ) {
      return { status: 'skipped' };
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return {
        status: 'unhealthy',
        error: 'Missing Supabase configuration',
      };
    }

    // Simple database connectivity test
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_CONFIG.timeoutMs);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return {
          status: 'unhealthy',
          error: `Database responded with status: ${response.status}`,
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return {
          status: 'unhealthy',
          error: 'Database check timed out',
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message || 'Database connection failed',
    };
  }
}

// Get memory usage information
function getMemoryUsage() {
  // In Deno environment, we don't have access to performance.memory
  // Return basic memory info or fallback values
  return {
    used: 0, // Not available in Deno
    total: 0, // Not available in Deno
  };
}

// Main health check handler
async function performHealthCheck(): Promise<HealthCheckResponse> {
  const startTime = performance.now();

  try {
    // Perform checks in parallel
    const [environmentCheck, databaseCheck] = await Promise.all([
      Promise.resolve(checkEnvironment()),
      checkDatabase(),
    ]);

    const responseTime = performance.now() - startTime;
    const memory = getMemoryUsage();

    // Determine overall health status
    const isHealthy =
      environmentCheck === 'healthy' &&
      (databaseCheck.status === 'healthy' || databaseCheck.status === 'skipped');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: HEALTH_CHECK_CONFIG.version,
      environment: HEALTH_CHECK_CONFIG.environment,
      uptime: performance.now(),
      memory,
      checks: {
        database: databaseCheck.status,
        environment: environmentCheck,
      },
      responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
    };
  } catch (error) {
    console.error('Health check failed:', error);

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: HEALTH_CHECK_CONFIG.version,
      environment: HEALTH_CHECK_CONFIG.environment,
      uptime: performance.now(),
      memory: getMemoryUsage(),
      checks: {
        database: 'unhealthy',
        environment: 'unhealthy',
      },
      responseTime: performance.now() - startTime,
    };
  }
}

// Main serve function
serve(async req => {
  const startTime = performance.now();

  // Enhanced CORS headers with JSON content type
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('OK', { headers });
  }

  // Only allow GET requests for health checks
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        allowedMethods: ['GET', 'OPTIONS'],
      }),
      {
        status: 405,
        headers,
      }
    );
  }

  try {
    // Perform health check
    const healthStatus = await performHealthCheck();

    // Set appropriate status code based on health
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    // Add response time header
    const responseTime = performance.now() - startTime;
    headers['X-Response-Time'] = `${Math.round(responseTime * 100) / 100}ms`;

    return new Response(JSON.stringify(healthStatus, null, 2), {
      status: statusCode,
      headers,
    });
  } catch (error) {
    console.error('Health check handler error:', error);

    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal server error during health check',
        version: HEALTH_CHECK_CONFIG.version,
        environment: HEALTH_CHECK_CONFIG.environment,
      }),
      {
        status: 500,
        headers,
      }
    );
  }
});
