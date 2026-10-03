const prisma = require('../config/db');

const getMines = async (req, res) => {
  try {
    const { riskLevel } = req.query;
    const where = {};

    if (riskLevel) {
      const levels = riskLevel.split(',').map((l) => l.trim().toUpperCase());
      where.riskLevel = { in: levels };
    }

    const mines = await prisma.mine.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const formatted = mines.map((m) => {
      let coords = m.coordinates;
      if (typeof coords === 'string') {
        try { coords = JSON.parse(coords); } catch { coords = null; }
      }
      if ((!coords || !Array.isArray(coords)) && m.latitude != null && m.longitude != null) {
        coords = [m.latitude, m.longitude];
      }
      return {
        ...m,
        status: m.operationalStatus || 'Operational',
        coordinates: coords,
      };
    });

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('getMines error:', error);
    return res.status(500).json({ message: error.message || 'Error fetching mines' });
  }
};

const getMineById = async (req, res) => {
  try {
    const { id } = req.params;
    const mine = await prisma.mine.findUnique({
      where: { id },
    });

    if (!mine) {
      return res.status(404).json({ message: 'Mine not found' });
    }

    let coords = mine.coordinates;
    if (typeof coords === 'string') {
      try { coords = JSON.parse(coords); } catch { coords = null; }
    }
    if ((!coords || !Array.isArray(coords)) && mine.latitude != null && mine.longitude != null) {
      coords = [mine.latitude, mine.longitude];
    }

    return res.status(200).json({
      ...mine,
      status: mine.operationalStatus || 'Operational',
      coordinates: coords,
    });
  } catch (error) {
    console.error('getMineById error:', error);
    return res.status(500).json({ message: error.message || 'Error fetching mine' });
  }
};

module.exports = {
  getMines,
  getMineById,
};
