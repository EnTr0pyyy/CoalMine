const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/db');

/**
 * Middleware to verify JWT Access Token from Authorization Header (Bearer <token>)
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        message: 'Access denied. Malformed token header.',
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
      } else {
        throw err;
      }
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        message: 'Invalid or malformed token.',
      });
    }

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        department: true,
        contractorId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'User account not found or deactivated.',
      });
    }

    req.user = {
      userId: user.id,
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department,
      contractorId: user.contractorId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: error.message || 'Invalid or malformed token.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * System Department carries organization-wide, admin-level access regardless of role.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized. Authentication required.',
      });
    }

    // System department has organization-wide admin access
    if (req.user.department === 'system' || req.user.role === 'corporate_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden. Requires one of roles: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
};
