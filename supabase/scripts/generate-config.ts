#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const isDev = process.env.NODE_ENV === 'development';

// Load environment variables from .env files
if (isDev) {
  console.log(' Loading development environment...');
  dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });
} else {
  console.log(' Loading production environment...');
  dotenv.config({ path: path.resolve(__dirname, '../../.env.production') });
}
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const templatePath = path.resolve(__dirname, '../config.template.toml');
const outputPath = path.resolve(__dirname, '../config.toml');

// Read the template
const template = fs.readFileSync(templatePath, 'utf8');

// Replace all env() placeholders with actual environment variables
const configContent = template.replace(/env\((.*?)\)/g, (_: string, envVar: string) => {
  const value = process.env[envVar];
  if (!value) {
    console.warn(`️  Warning: Environment variable ${envVar} is not set`);
    return '';
  }
  return value;
});

// Write the generated config
fs.writeFileSync(outputPath, configContent);

console.log(` Generated ${isDev ? 'development' : 'production'} config.toml successfully`);

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_PROJECT_ID',
  'SITE_URL',
  'DEV_SITE_URL',
  'SUPABASE_API_URL',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_URL',
  'OPENAI_API_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
  'NEXT_PUBLIC_APP_NAME',
] as const;

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(
    `\n️  Missing environment variables in ${isDev ? 'development' : 'production'} mode:`
  );
  missingVars.forEach(v => console.warn(`   - ${v}`));
  console.warn('\nPlease add them to your environment files');
  process.exit(1);
} else {
  console.log(' All required environment variables are set');
}
