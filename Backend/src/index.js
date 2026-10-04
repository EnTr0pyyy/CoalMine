const express = require('express');
const cors = require('cors');
const path = require('path');
const { env } = require('./config/env');
const prisma = require('./config/db');
const { ensurePostgresRunning } = require('./config/dbLauncher');

// Route Imports
const authRoutes = require('./routes/auth.routes');
const mineRoutes = require('./routes/mine.routes');
const flagRoutes = require('./routes/flag.routes');
const responseRoutes = require('./routes/response.routes');
const correctiveActionRoutes = require('./routes/correctiveAction.routes');
const complianceRoutes = require('./routes/compliance.routes');
const inspectionRoutes = require('./routes/inspection.routes');
const contractorRoutes = require('./routes/contractor.routes');
const documentRoutes = require('./routes/document.routes');
const noticeRoutes = require('./routes/notice.routes');
const notificationRoutes = require('./routes/notification.routes');
const riskRoutes = require('./routes/risk.routes');
const auditRoutes = require('./routes/audit.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportsRoutes = require('./routes/reports.routes');
const syncRoutes = require('./routes/sync.routes');
const uploadRoutes = require('./routes/upload.routes');
const chatRoutes = require('./routes/chat.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const parliamentaryRoutes = require('./routes/parliamentary.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const subsidiaryRoutes = require('./routes/subsidiary.routes');
const searchRoutes = require('./routes/search.routes');
const { ensureFTSIndexes } = require('./services/searchService');
const { resumePendingTasks } = require('./services/workspaceTaskService');

const app = express();

// ==========================================
// Middlewares
// ==========================================
app.use(
  cors({
    origin: (origin, callback) => {
      // Dynamic origin reflection allows credentials: true to function correctly
      // across localhost, LAN IPs (192.168.x.x, 10.x.x.x), and client origins
      if (!env.CLIENT_ORIGIN || env.CLIENT_ORIGIN === '*') {
        return callback(null, true);
      }
      const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((o) => o.trim());
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded documents statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==========================================
// Health & Root Routes
// ==========================================
app.get('/health', async (_req, res) => {
  try {
    // DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
    });
  }
});

app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'CoalGov API',
    version: '2.0.0',
    description: 'Smart Mine Governance and Statutory Compliance Platform',
    status: 'online',
  });
});

// ==========================================
// API Routes (matching BACKEND_API_CONTRACT.md)
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/mines', mineRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/corrective-actions', correctiveActionRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/compliances', complianceRoutes); // Alias for compatibility
app.use('/api/inspections', inspectionRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/parliamentary', parliamentaryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subsidiaries', subsidiaryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', chatRoutes);
app.use('/api', workspaceRoutes);

// ==========================================
// 404 Handler
// ==========================================
app.use((_req, res) => {
  res.status(404).json({
    message: 'Resource not found',
  });
});

// ==========================================
// Global Error Handler
// ==========================================
app.use((err, _req, res, _next) => {
  console.error('Unhandled Error:', err);

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ==========================================
// Server Start
// ==========================================
const PORT = parseInt(env.PORT, 10) || 5000;
let server;

async function start() {
  try {
    // Ensure PostgreSQL is running
    await ensurePostgresRunning();
    ensureFTSIndexes().catch(err => console.warn('[FTS] Index setup notice:', err.message));

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 CoalGov Backend running on 0.0.0.0:${PORT} [${env.NODE_ENV}]`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`📁 Static files hosted at: http://localhost:${PORT}/uploads`);
      resumePendingTasks().then((count) => {
        if (count > 0) console.log(`♻️ Resumed ${count} pending workspace task(s)`);
      }).catch((err) => console.warn('Workspace task recovery notice:', err.message));
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();

// Graceful Shutdown
const handleShutdown = async () => {
  console.log('\n🛑 Gracefully shutting down...');
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      await prisma.$disconnect();
      console.log('Database connection closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

module.exports = app;
