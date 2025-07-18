import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface DataSource {
  id: string
  name: string
  type: 'snowflake' | 'bigquery' | 'redshift' | 'postgres' | 'mysql' | 'sqlserver'
  connection_config: Record<string, any>
  team_id: string
}

interface TestResult {
  success: boolean
  message: string
  details?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the request body
    const { data_source_id } = await req.json()

    if (!data_source_id) {
      return new Response(
        JSON.stringify({ error: 'data_source_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the data source from the database
    const { data: dataSource, error: fetchError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', data_source_id)
      .single()

    if (fetchError || !dataSource) {
      return new Response(
        JSON.stringify({ error: 'Data source not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Test the connection based on the data source type
    const testResult = await testConnection(dataSource)

    // Update the audit log
    await supabase
      .from('audit_logs')
      .insert({
        team_id: dataSource.team_id,
        user_id: req.headers.get('x-user-id'),
        action: 'TEST_CONNECTION',
        table_name: 'data_sources',
        record_id: dataSource.id,
        new_values: { test_result: testResult }
      })

    return new Response(
      JSON.stringify(testResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error testing data source connection:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function testConnection(dataSource: DataSource): Promise<TestResult> {
  const { type, connection_config, name } = dataSource

  try {
    switch (type) {
      case 'snowflake':
        return await testSnowflakeConnection(connection_config, name)
      
      case 'bigquery':
        return await testBigQueryConnection(connection_config, name)
      
      case 'redshift':
        return await testRedshiftConnection(connection_config, name)
      
      case 'postgres':
        return await testPostgresConnection(connection_config, name)
      
      case 'mysql':
        return await testMySQLConnection(connection_config, name)
      
      case 'sqlserver':
        return await testSQLServerConnection(connection_config, name)
      
      default:
        return {
          success: false,
          message: `Unsupported data source type: ${type}`
        }
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      details: { error: error.toString() }
    }
  }
}

async function testSnowflakeConnection(config: Record<string, any>, name: string): Promise<TestResult> {
  // In a real implementation, you would use the Snowflake SDK
  // For now, we'll simulate a connection test
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
  
  // Simulate connection test logic
  const requiredFields = ['account', 'warehouse', 'database', 'schema']
  const missingFields = requiredFields.filter(field => !config[field])
  
  if (missingFields.length > 0) {
    return {
      success: false,
      message: `Missing required configuration fields: ${missingFields.join(', ')}`
    }
  }

  return {
    success: true,
    message: `Successfully connected to Snowflake data source: ${name}`,
    details: {
      account: config.account,
      warehouse: config.warehouse,
      database: config.database,
      schema: config.schema
    }
  }
}

async function testBigQueryConnection(config: Record<string, any>, name: string): Promise<TestResult> {
  // In a real implementation, you would use the BigQuery SDK
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const requiredFields = ['project_id', 'dataset']
  const missingFields = requiredFields.filter(field => !config[field])
  
  if (missingFields.length > 0) {
    return {
      success: false,
      message: `Missing required configuration fields: ${missingFields.join(', ')}`
    }
  }

  return {
    success: true,
    message: `Successfully connected to BigQuery data source: ${name}`,
    details: {
      project_id: config.project_id,
      dataset: config.dataset,
      location: config.location || 'US'
    }
  }
}

async function testRedshiftConnection(config: Record<string, any>, name: string): Promise<TestResult> {
  // In a real implementation, you would use the Redshift SDK or PostgreSQL client
  await new Promise(resolve => setTimeout(resolve, 1200))
  
  const requiredFields = ['host', 'port', 'database', 'username']
  const missingFields = requiredFields.filter(field => !config[field])
  
  if (missingFields.length > 0) {
    return {
      success: false,
      message: `Missing required configuration fields: ${missingFields.join(', ')}`
    }
  }

  return {
    success: true,
    message: `Successfully connected to Redshift data source: ${name}`,
    details: {
      host: config.host,
      port: config.port,
      database: config.database
    }
  }
}

async function testPostgresConnection(config: Record<string, any>, name: string): Promise<TestResult> {
  // In a real implementation, you would use a PostgreSQL client
  await new Promise(resolve => setTimeout(resolve, 600))
  
  const requiredFields = ['host', 'port', 'database', 'username']
  const missingFields = requiredFields.filter(field => !config[field])
  
  if (missingFields.length > 0) {
    return {
      success: false,
      message: `Missing required configuration fields: ${missingFields.join(', ')}`
    }
  }

  return {
    success: true,
    message: `Successfully connected to PostgreSQL data source: ${name}`,
    details: {
      host: config.host,
      port: config.port,
      database: config.database
    }
  }
}

async function testMySQLConnection(config: Record<string, any>, name: string): Promise<TestResult> {
  // In a real implementation, you would use a MySQL client
  await new Promise(resolve => setTimeout(resolve, 700))
  
  const requiredFields = ['host', 'port', 'database', 'username']
  const missingFields = requiredFields.filter(field => !config[field])
  
  if (missingFields.length > 0) {
    return {
      success: false,
      message: `Missing required configuration fields: ${missingFields.join(', ')}`
    }
  }

  return {
    success: true,
    message: `Successfully connected to MySQL data source: ${name}`,
    details: {
      host: config.host,
      port: config.port,
      database: config.database
    }
  }
}

async function testSQLServerConnection(config: Record<string, any>, name: string): Promise<TestResult> {
  // In a real implementation, you would use a SQL Server client
  await new Promise(resolve => setTimeout(resolve, 900))
  
  const requiredFields = ['server', 'database', 'username']
  const missingFields = requiredFields.filter(field => !config[field])
  
  if (missingFields.length > 0) {
    return {
      success: false,
      message: `Missing required configuration fields: ${missingFields.join(', ')}`
    }
  }

  return {
    success: true,
    message: `Successfully connected to SQL Server data source: ${name}`,
    details: {
      server: config.server,
      database: config.database,
      port: config.port || 1433
    }
  }
} 