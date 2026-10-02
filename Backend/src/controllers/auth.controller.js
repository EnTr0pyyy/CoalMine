const prisma = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
} = require('../utils/jwt');

const roleForDepartment = (dept) => {
  if (dept === 'system') return 'corporate_admin';
  if (dept === 'production') return 'mine_manager';
  if (dept === 'safety_rescue') return 'safety_officer';
  return 'department_officer';
};

const departmentLabels = {
  system: 'System Department',
  production: 'Production',
  material_management: 'Material Management',
  erp: 'ERP',
  engineering_equipment: 'Engineering & Equipment',
  company_secretary: 'Company Secretary',
  clearing_forwarding: 'Clearing & Forwarding',
  electronics_telecom: 'Electronics & Telecommunication',
  hrd: 'Human Resource Development',
  appeal_grievance: 'Appeal & Grievance Cell',
  corporate_planning: 'Corporate Planning',
  project_monitoring: 'Project Monitoring',
  contract_management: 'Contract Management',
  safety_rescue: 'Safety & Rescue',
  welfare: 'Welfare',
};

const login = async (req, res) => {
  try {
    const { username, password, loginType = 'department', department } = req.body;
    const lookupUsername = String(username || '').trim();
    const lookupPassword = String(password || '').trim();

    let user = null;

    if (loginType === 'contractor') {
      user = await prisma.user.findFirst({
        where: { role: 'contractor' },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: 'contractor-01',
            email: 'contractor@minegov.ai',
            username: 'contractor',
            password: await hashPassword('password123'),
            name: 'Apex Mining Logistics Contractor',
            role: 'contractor',
            contractorId: 'contractor-1',
          },
        });
      }
    } else if (loginType === 'regulator') {
      user = await prisma.user.findFirst({
        where: { role: 'regulator' },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: 'regulator-01',
            email: 'regulator@minegov.ai',
            username: 'regulator',
            password: await hashPassword('password123'),
            name: 'DGMS Regional Inspectorate',
            role: 'regulator',
          },
        });
      }
    } else {
      const targetDept = department || 'system';
      const lookupWhere = lookupUsername
        ? {
            OR: [
              { username: lookupUsername },
              { email: lookupUsername },
              { department: targetDept },
            ],
          }
        : { department: targetDept };

      user = await prisma.user.findFirst({ where: lookupWhere });

      if (!user) {
        const derivedRole = roleForDepartment(targetDept);
        const deptLabel = departmentLabels[targetDept] || targetDept;
        user = await prisma.user.create({
          data: {
            id: `dept-${targetDept}`,
            email: `${targetDept}@coalgov.in`,
            username: lookupUsername || targetDept,
            password: await hashPassword(lookupPassword || 'password123'),
            name: lookupUsername ? `${lookupUsername} (${deptLabel})` : `${deptLabel} Officer`,
            role: derivedRole,
            department: targetDept,
            designation: `${deptLabel} Officer`,
          },
        });
      }
    }

    if (!user || !user.isActive) {
      return res.status(403).json({
        message: 'Account is deactivated or not found.',
      });
    }

    if (lookupPassword) {
      const storedPassword = user.password || '';
      const validPassword = storedPassword.startsWith('$2')
        ? await comparePassword(lookupPassword, storedPassword)
        : storedPassword === lookupPassword;

      if (!validPassword) {
        return res.status(401).json({
          message: 'Invalid username or password.',
        });
      }

      if (!storedPassword.startsWith('$2')) {
        const newPasswordHash = await hashPassword(lookupPassword);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: newPasswordHash },
        });
      }
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
      contractorId: user.contractorId,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Match BACKEND_API_CONTRACT.md response structure
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        contractorId: user.contractorId,
      },
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error during login.',
    });
  }
};

const logout = async (req, res) => {
  return res.status(204).send();
};

const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        contractorId: true,
        phone: true,
        mineName: true,
        designation: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  login,
  logout,
  me,
};
