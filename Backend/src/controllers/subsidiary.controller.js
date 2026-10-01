const SUBSIDIARIES = [
  {
    code: 'MCL',
    name: 'Mahanadi Coalfields Limited',
    headquarters: 'Sambalpur, Odisha',
    commandArea: 'Talcher and Ib Valley Coalfields',
    majorMines: ['Bhubaneswari', 'Lakhanpur', 'Kulda', 'Ananta', 'Bharatpur'],
    type: 'Opencast Predominant',
    fy24ProductionMT: 206.1,
    fy24TargetMT: 204.0,
    achievementPct: 101.0,
    obrMCum: 231.5,
    fmcProjects: 14,
    status: 'Operational'
  },
  {
    code: 'SECL',
    name: 'South Eastern Coalfields Limited',
    headquarters: 'Bilaspur, Chhattisgarh',
    commandArea: 'Korba, Raigarh, Mand-Raigarh and Sohagpur Coalfields',
    majorMines: ['Gevra', 'Kusmunda', 'Dipka', 'Manikpur'],
    type: 'Mega Opencast & Underground',
    fy24ProductionMT: 187.3,
    fy24TargetMT: 197.0,
    achievementPct: 95.1,
    obrMCum: 284.1,
    fmcProjects: 18,
    status: 'Operational'
  },
  {
    code: 'NCL',
    name: 'Northern Coalfields Limited',
    headquarters: 'Singrauli, Madhya Pradesh',
    commandArea: 'Singrauli Coalfield (MP & UP)',
    majorMines: ['Jayant', 'Nigahi', 'Dudhichua', 'Amlohri', 'Bina', 'Khadia'],
    type: '100% Opencast Mechanized',
    fy24ProductionMT: 136.2,
    fy24TargetMT: 135.0,
    achievementPct: 100.9,
    obrMCum: 490.2,
    fmcProjects: 11,
    status: 'Operational'
  },
  {
    code: 'CCL',
    name: 'Central Coalfields Limited',
    headquarters: 'Ranchi, Jharkhand',
    commandArea: 'North Karanpura, South Karanpura, Bokaro, Ramgarh',
    majorMines: ['Amrapali', 'Magadh', 'Ashoka', 'Piprawar'],
    type: 'Mixed (Opencast & Washeries)',
    fy24ProductionMT: 86.0,
    fy24TargetMT: 84.0,
    achievementPct: 102.4,
    obrMCum: 142.8,
    fmcProjects: 9,
    status: 'Operational'
  },
  {
    code: 'WCL',
    name: 'Western Coalfields Limited',
    headquarters: 'Nagpur, Maharashtra',
    commandArea: 'Wardha Valley (Maharashtra) & Pench-Kanhan (MP)',
    majorMines: ['Umrer', 'Penganga', 'Durgapur', 'Gondegaon'],
    type: 'Opencast & Deep Underground',
    fy24ProductionMT: 69.1,
    fy24TargetMT: 68.0,
    achievementPct: 101.6,
    obrMCum: 320.0,
    fmcProjects: 6,
    status: 'Operational'
  },
  {
    code: 'BCCL',
    name: 'Bharat Coking Coal Limited',
    headquarters: 'Dhanbad, Jharkhand',
    commandArea: 'Jharia and Raniganj (partial) Coalfields',
    majorMines: ['Block II', 'Kusunda', 'Moonidih Underground', 'Bhowrah'],
    type: 'Prime Coking Coal & Washeries',
    fy24ProductionMT: 41.1,
    fy24TargetMT: 41.0,
    achievementPct: 100.2,
    obrMCum: 164.2,
    fmcProjects: 5,
    status: 'Operational'
  },
  {
    code: 'ECL',
    name: 'Eastern Coalfields Limited',
    headquarters: 'Sanctoria, West Bengal',
    commandArea: 'Raniganj Coalfield (West Bengal) & Rajmahal (Jharkhand)',
    majorMines: ['Rajmahal Opencast', 'Sonepur Bazari', 'Jhanjra Underground'],
    type: 'Deep High-GCV Coal & Opencast',
    fy24ProductionMT: 41.8,
    fy24TargetMT: 45.0,
    achievementPct: 92.9,
    obrMCum: 110.4,
    fmcProjects: 4,
    status: 'Operational'
  },
  {
    code: 'CMPDI',
    name: 'Central Mine Planning & Design Institute',
    headquarters: 'Ranchi, Jharkhand',
    commandArea: 'Pan-India Coal and Lignite Exploration & Planning',
    majorMines: ['Regional Institutes I to VII (Asansol, Dhanbad, Ranchi, Nagpur, Bilaspur, Singrauli, Bhubaneswar)'],
    type: 'Geological Exploration, Borehole Drilling & Mine Planning',
    fy24DrillingMeters: 1480000,
    geologicalReportsCompleted: 42,
    achievementPct: 104.2,
    fmcProjects: 67,
    status: 'Consultancy & Technical Center'
  }
];

const getAllSubsidiaries = async (_req, res) => {
  return res.status(200).json({ subsidiaries: SUBSIDIARIES });
};

const getSubsidiaryByCode = async (req, res) => {
  const { code } = req.params;
  const sub = SUBSIDIARIES.find(s => s.code.toUpperCase() === code.toUpperCase());
  if (!sub) {
    return res.status(404).json({ message: 'Subsidiary not found' });
  }
  return res.status(200).json(sub);
};

module.exports = {
  getAllSubsidiaries,
  getSubsidiaryByCode,
  SUBSIDIARIES
};
