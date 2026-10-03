const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required').default('postgresql://postgres:postgres@127.0.0.1:5432/coalgov_db?schema=public'),
  JWT_ACCESS_SECRET: z.string().trim().min(1, 'JWT_ACCESS_SECRET is required').default('coalgov_super_secret_access_token_key_2026'),
  JWT_REFRESH_SECRET: z.string().trim().min(1, 'JWT_REFRESH_SECRET is required').default('coalgov_super_secret_refresh_token_key_2026'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('30d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

module.exports = {
  env: parsedEnv.data,
};
