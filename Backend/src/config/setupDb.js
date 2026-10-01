const { ensurePostgresRunning } = require('./dbLauncher');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKEND_DIR = path.resolve(__dirname, '../..');

async function main() {
  console.log('====================================================');
  console.log('   CoalGov Database Setup & Initialization');
  console.log('====================================================\n');

  try {
    // 0. Ensure .env exists from .env.example
    const envPath = path.join(BACKEND_DIR, '.env');
    const envExamplePath = path.join(BACKEND_DIR, '.env.example');
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('📄 Automatically created Backend/.env from .env.example');
    }

    // 1. Ensure PostgreSQL is up and coalgov_db exists
    await ensurePostgresRunning();

    // 2. Generate Prisma Client
    console.log('\n[1/3] Generating Prisma Client...');
    execSync('npx prisma generate', { cwd: BACKEND_DIR, stdio: 'inherit' });

    // 3. Push schema to database
    console.log('\n[2/3] Synchronizing schema with PostgreSQL (prisma db push)...');
    execSync('npx prisma db push', { cwd: BACKEND_DIR, stdio: 'inherit' });

    // 4. Seed all initial mock data & cryptographic audit trail
    console.log('\n[3/3] Seeding initial database data...');
    execSync('node prisma/seed.js', { cwd: BACKEND_DIR, stdio: 'inherit' });

    console.log('\n====================================================');
    console.log('✅ PostgreSQL Database is completely ready & seeded!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database setup encountered an error:', error);
    process.exit(1);
  }
}

main();
