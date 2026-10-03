const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { computeLogHash, GENESIS_HASH } = require('../src/services/auditLogger');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seed from mockData.js...');
  const mock = await import('../../Frontend/src/data/mockData.js');

  const defaultHashedPassword = await bcrypt.hash('password123', 10);

  // 1. Seed Mines
  console.log(`Seeding ${mock.mockMines.length} mines...`);
  for (const m of mock.mockMines) {
    const lat = m.latitude ?? (Array.isArray(m.coordinates) ? m.coordinates[0] : null);
    const lng = m.longitude ?? (Array.isArray(m.coordinates) ? m.coordinates[1] : null);

    await prisma.mine.upsert({
      where: { id: m.id },
      update: {
        name: m.name,
        code: m.code || `MINE-${m.id.toUpperCase()}`,
        location: m.location,
        subsidiary: m.subsidiary || 'CIL',
        state: m.state || 'Jharkhand',
        district: m.district || 'Dhanbad',
        latitude: lat,
        longitude: lng,
        operationalStatus: m.operationalStatus || m.status || 'ACTIVE',
        complianceRate: m.complianceRate || 0,
        riskScore: m.riskScore || 0,
        riskLevel: m.riskLevel || 'LOW',
        openFlags: m.openFlags || 0,
        openCorrectiveActions: m.openCorrectiveActions || 0,
        coordinates: m.coordinates || [lat, lng],
      },
      create: {
        id: m.id,
        name: m.name,
        code: m.code || `MINE-${m.id.toUpperCase()}`,
        location: m.location,
        subsidiary: m.subsidiary || 'CIL',
        state: m.state || 'Jharkhand',
        district: m.district || 'Dhanbad',
        latitude: lat,
        longitude: lng,
        operationalStatus: m.operationalStatus || m.status || 'ACTIVE',
        complianceRate: m.complianceRate || 0,
        riskScore: m.riskScore || 0,
        riskLevel: m.riskLevel || 'LOW',
        openFlags: m.openFlags || 0,
        openCorrectiveActions: m.openCorrectiveActions || 0,
        coordinates: m.coordinates || [lat, lng],
      },
    });
  }

  // 2. Seed Users
  console.log(`Seeding users...`);
  // Seed predefined mock users
  for (const u of mock.mockUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        department: u.department || null,
        contractorId: u.contractorId || null,
        mineName: u.mineName || null,
        designation: u.designation || null,
      },
      create: {
        id: u.id,
        email: u.email,
        username: u.email.split('@')[0],
        password: defaultHashedPassword,
        name: u.name,
        role: u.role,
        department: u.department || null,
        contractorId: u.contractorId || null,
        mineName: u.mineName || null,
        designation: u.designation || null,
      },
    });
  }

  // Seed standard department accounts so logging in with any department works seamlessly
  const departments = [
    'system', 'production', 'material_management', 'erp', 'engineering_equipment',
    'company_secretary', 'clearing_forwarding', 'electronics_telecom', 'hrd',
    'appeal_grievance', 'corporate_planning', 'project_monitoring', 'contract_management',
    'safety_rescue', 'welfare'
  ];

  for (const dept of departments) {
    const email = `${dept}@coalgov.in`;
    const role = dept === 'system' ? 'corporate_admin' :
                 dept === 'production' ? 'mine_manager' :
                 dept === 'safety_rescue' ? 'safety_officer' : 'department_officer';
    await prisma.user.upsert({
      where: { email },
      update: {
        department: dept,
        role: role,
      },
      create: {
        id: `dept-${dept}`,
        email,
        username: dept,
        password: defaultHashedPassword,
        name: `${dept.replace(/_/g, ' ').toUpperCase()} Officer`,
        role: role,
        department: dept,
        designation: `${dept.replace(/_/g, ' ').toUpperCase()} In-charge`,
      },
    });
  }

  // Seed Contractor & Regulator standard users
  await prisma.user.upsert({
    where: { email: 'contractor@minegov.ai' },
    update: { role: 'contractor', contractorId: 'C-101' },
    create: {
      id: 'contractor-01',
      email: 'contractor@minegov.ai',
      username: 'contractor',
      password: defaultHashedPassword,
      name: 'Apex Mining Logistics Contractor',
      role: 'contractor',
      contractorId: 'C-101',
      designation: 'Managing Partner',
    },
  });

  await prisma.user.upsert({
    where: { email: 'regulator@minegov.ai' },
    update: { role: 'regulator' },
    create: {
      id: 'regulator-01',
      email: 'regulator@minegov.ai',
      username: 'regulator',
      password: defaultHashedPassword,
      name: 'DGMS Regional Inspectorate',
      role: 'regulator',
      designation: 'Director of Mines Safety',
    },
  });

  // 3. Seed Flags
  console.log(`Seeding ${mock.mockFlags.length} flags...`);
  for (const f of mock.mockFlags) {
    await prisma.flag.upsert({
      where: { id: f.id },
      update: { ...f, createdAt: new Date(f.createdAt) },
      create: { ...f, createdAt: new Date(f.createdAt) },
    });
  }

  // 4. Seed Responses
  console.log(`Seeding ${mock.mockResponses.length} responses...`);
  for (const r of mock.mockResponses) {
    await prisma.response.upsert({
      where: { id: r.id },
      update: { ...r, date: new Date(r.date) },
      create: { ...r, date: new Date(r.date) },
    });
  }

  // 5. Seed Corrective Actions
  console.log(`Seeding ${mock.mockCorrectiveActions.length} corrective actions...`);
  for (const ca of mock.mockCorrectiveActions) {
    await prisma.correctiveAction.upsert({
      where: { id: ca.id },
      update: ca,
      create: ca,
    });
  }

  // 6. Seed Compliance Requirements
  console.log(`Seeding ${mock.mockComplianceRequirements.length} compliance requirements...`);
  for (const cr of mock.mockComplianceRequirements) {
    await prisma.complianceRequirement.upsert({
      where: { id: cr.id },
      update: cr,
      create: cr,
    });
  }

  // 7. Seed Inspections
  console.log(`Seeding ${mock.mockInspections.length} inspections...`);
  for (const ins of mock.mockInspections) {
    await prisma.inspection.upsert({
      where: { id: ins.id },
      update: ins,
      create: ins,
    });
  }

  // 8. Seed Contractors
  console.log(`Seeding ${mock.mockContractors.length} contractors...`);
  for (const c of mock.mockContractors) {
    await prisma.contractor.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }

  // 9. Seed Contractor Projects
  console.log(`Seeding ${mock.mockContractorProjects.length} contractor projects...`);
  for (const cp of mock.mockContractorProjects) {
    await prisma.contractorProject.upsert({
      where: { id: cp.id },
      update: cp,
      create: cp,
    });
  }

  // 10. Seed Contractor Reports
  console.log(`Seeding ${mock.mockContractorReports.length} contractor reports...`);
  for (const cr of mock.mockContractorReports) {
    await prisma.contractorReport.upsert({
      where: { id: cr.id },
      update: {
        ...cr,
        submittedDate: cr.submittedDate ? new Date(cr.submittedDate) : null,
      },
      create: {
        ...cr,
        submittedDate: cr.submittedDate ? new Date(cr.submittedDate) : null,
      },
    });
  }

  // 11. Seed Attendance
  console.log(`Seeding attendance...`);
  for (let i = 0; i < mock.mockAttendance.length; i++) {
    const a = mock.mockAttendance[i];
    await prisma.contractorAttendance.upsert({
      where: { id: `ATT-${i + 1}` },
      update: a,
      create: { id: `ATT-${i + 1}`, ...a },
    });
  }

  // 12. Seed Safety Requirements
  console.log(`Seeding safety requirements...`);
  for (let i = 0; i < mock.mockSafetyRequirements.length; i++) {
    const sr = mock.mockSafetyRequirements[i];
    await prisma.contractorSafetyRequirement.upsert({
      where: { id: `SR-${i + 1}` },
      update: sr,
      create: { id: `SR-${i + 1}`, ...sr },
    });
  }

  // 13. Seed Contractor Documents
  console.log(`Seeding contractor documents...`);
  for (let i = 0; i < mock.mockContractorDocuments.length; i++) {
    const cd = mock.mockContractorDocuments[i];
    const docId = cd.id || `CD-${i + 1}`;
    await prisma.contractorDocument.upsert({
      where: { id: docId },
      update: { ...cd, id: docId },
      create: { ...cd, id: docId },
    });
  }

  // 14. Seed Risk Notifications
  console.log(`Seeding risk notifications...`);
  for (let i = 0; i < mock.mockRiskNotifications.length; i++) {
    const rn = mock.mockRiskNotifications[i];
    const rnId = rn.id || `RN-${i + 1}`;
    await prisma.riskNotification.upsert({
      where: { id: rnId },
      update: { ...rn, id: rnId },
      create: { ...rn, id: rnId },
    });
  }

  // 15. Seed Contractor Performance
  console.log(`Seeding contractor performance...`);
  for (const [contractorId, perf] of Object.entries(mock.mockContractorPerformance)) {
    await prisma.contractorPerformance.upsert({
      where: { contractorId },
      update: { ...perf, contractorId },
      create: { ...perf, contractorId },
    });
  }

  // 16. Seed Documents
  console.log(`Seeding ${mock.mockDocuments.length} documents...`);
  for (const d of mock.mockDocuments) {
    await prisma.document.upsert({
      where: { id: d.id },
      update: {
        ...d,
        uploadedDate: new Date(d.uploadedDate),
      },
      create: {
        ...d,
        uploadedDate: new Date(d.uploadedDate),
      },
    });
  }

  // 17. Seed Notices
  console.log(`Seeding ${mock.mockNotices.length} notices...`);
  for (const n of mock.mockNotices) {
    await prisma.notice.upsert({
      where: { id: n.id },
      update: {
        ...n,
        publishedDate: new Date(n.publishedDate),
        expiryDate: n.expiryDate ? new Date(n.expiryDate) : null,
      },
      create: {
        ...n,
        publishedDate: new Date(n.publishedDate),
        expiryDate: n.expiryDate ? new Date(n.expiryDate) : null,
      },
    });
  }

  // 18. Seed Alerts / Notifications
  console.log(`Seeding ${mock.mockAlerts.length} notifications...`);
  for (const a of mock.mockAlerts) {
    await prisma.notification.upsert({
      where: { id: a.id },
      update: {
        ...a,
        timestamp: new Date(a.timestamp),
      },
      create: {
        ...a,
        timestamp: new Date(a.timestamp),
      },
    });
  }

  // 19. Seed Audit Logs with Cryptographic Hashes
  console.log(`Seeding ${mock.mockAuditLogs.length} audit logs with cryptographic hash chain...`);
  let chainHash = GENESIS_HASH;
  const sortedMockLogs = [...mock.mockAuditLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  for (const al of sortedMockLogs) {
    const logHash = computeLogHash({
      id: al.id,
      timestamp: al.timestamp,
      actor: al.actor,
      actorType: al.actorType,
      action: al.action,
      entity: al.entity,
      entityId: al.entity,
      previousHash: chainHash,
      metadata: null,
    });

    await prisma.auditLog.upsert({
      where: { id: al.id },
      update: {
        ...al,
        entityId: al.entity,
        hash: logHash,
        previousHash: chainHash,
        timestamp: new Date(al.timestamp),
      },
      create: {
        ...al,
        entityId: al.entity,
        hash: logHash,
        previousHash: chainHash,
        timestamp: new Date(al.timestamp),
      },
    });
    chainHash = logHash;
  }

  // 20. Seed Risk Scores
  console.log(`Seeding ${mock.mockRiskScores.length} risk scores...`);
  for (const rs of mock.mockRiskScores) {
    await prisma.riskScore.upsert({
      where: { mineId: rs.mineId },
      update: rs,
      create: rs,
    });
  }

  // 21. Seed Recurring Issues
  console.log(`Seeding ${mock.mockRecurringIssues.length} recurring issues...`);
  for (const ri of mock.mockRecurringIssues) {
    await prisma.recurringIssue.upsert({
      where: { id: ri.id },
      update: ri,
      create: ri,
    });
  }

  console.log('✅ Database successfully seeded with all initial data!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
