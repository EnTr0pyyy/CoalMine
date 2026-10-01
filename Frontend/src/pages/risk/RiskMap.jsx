import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Compass,
  Layers,
  Filter
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { mineService } from '../../services/mineService.js';
import { riskService } from '../../services/riskService.js';
import indiaSoiData from '../../data/india-soi.json';

const RISK_COLORS = {
  LOW: '#2F6846',
  MEDIUM: '#B7791F',
  HIGH: '#B3401D',
  CRITICAL: '#8C1D1D'
};

function riskIcon(level) {
  const color = RISK_COLORS[level] || RISK_COLORS.MEDIUM;
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function hqIcon(code) {
  return L.divIcon({
    className: '',
    html: `<div style="padding:2px 6px;border-radius:4px;background:#081B33;color:#E6ECF3;border:1.5px solid #1B4965;font-size:10px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;">${code}</div>`,
    iconSize: [36, 18],
    iconAnchor: [18, 9],
  });
}

// CIL Subsidiaries & Key Mining Exploration Basins across the Republic of India
const CIL_KEY_LOCATIONS = [
  { code: 'CIL HQ', name: 'Coal India Limited (Apex HQ)', location: 'Kolkata, West Bengal', coordinates: [22.5726, 88.3639], desc: 'National holding company apex management.' },
  { code: 'CMPDI', name: 'CMPDI Central Headquarters', location: 'Ranchi, Jharkhand', coordinates: [23.3441, 85.3096], desc: 'Pan-India exploration, borehole drilling & mine planning.' },
  { code: 'SECL', name: 'South Eastern Coalfields HQ', location: 'Bilaspur, Chhattisgarh', coordinates: [22.0797, 82.1409], desc: 'Gevra, Kusmunda, Dipka mega opencast operations.' },
  { code: 'MCL', name: 'Mahanadi Coalfields HQ', location: 'Sambalpur, Odisha', coordinates: [21.4669, 83.9812], desc: 'Talcher & Ib Valley coalfields evacuation.' },
  { code: 'NCL', name: 'Northern Coalfields HQ', location: 'Singrauli, Madhya Pradesh', coordinates: [24.1997, 82.6644], desc: '100% mechanized opencast mining complexes.' },
  { code: 'BCCL', name: 'Bharat Coking Coal HQ', location: 'Dhanbad, Jharkhand', coordinates: [23.7957, 86.4304], desc: 'Jharia prime coking coal extraction & washeries.' },
  { code: 'CCL', name: 'Central Coalfields HQ', location: 'Ranchi, Jharkhand', coordinates: [23.3683, 85.3262], desc: 'Karanpura, Bokaro & Ramgarh command fields.' },
  { code: 'WCL', name: 'Western Coalfields HQ', location: 'Nagpur, Maharashtra', coordinates: [21.1458, 79.0882], desc: 'Wardha, Umrer & Pench coal extraction belts.' },
  { code: 'ECL', name: 'Eastern Coalfields HQ', location: 'Sanctoria, West Bengal', coordinates: [23.6841, 86.8529], desc: 'Raniganj historical underground & opencast basin.' },
  { code: 'J&K EXP', name: 'Kalakot Coalfield & Exploration Sector', location: 'Rajouri, Jammu & Kashmir', coordinates: [33.2200, 74.4100], desc: 'Sub-Himalayan tertiary anthracite/semi-bituminous exploration.' },
];

export default function RiskMap() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', mines: [], error: null });
  const [showHqs, setShowHqs] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  async function load() {
    setState({ status: 'loading', mines: [], error: null });
    try {
      const [mines, riskScores] = await Promise.all([mineService.getMines(), riskService.getRiskScores()]);
      const merged = mines.map((m) => ({ ...m, risk: riskScores.find((r) => r.mineId === m.id) || null }));
      setState({ status: 'success', mines: merged, error: null });
    } catch (err) {
      setState({ status: 'error', mines: [], error: err.message || 'Unable to load the risk map.' });
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (state.status === 'loading') {
    return (
      <>
        <PageHeader title="Geological & Statutory Risk Map" description="Geospatial distribution of CIL coalfields and operational mines." />
        <LoadingState label="Loading geospatial datasets…" />
      </>
    );
  }

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="Geological & Statutory Risk Map" description="Geospatial distribution of CIL coalfields and operational mines." />
        <ErrorState message={state.error} onRetry={load} />
      </>
    );
  }

  const displayedMines = selectedFilter === 'ALL'
    ? state.mines
    : state.mines.filter((m) => (m.risk?.level || m.riskLevel) === selectedFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geological & Statutory Risk Map"
        description="Geospatial distribution of CIL coalfields, operational subsidiary mines, and key mining command sectors."
      />

      {/* Filters and Controls Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-700">
            <span className="font-semibold text-ink-900 flex items-center gap-1.5 mr-1">
              <Filter size={14} className="text-brand-600" /> Risk Level:
            </span>
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-2.5 py-1 rounded-full border text-xs transition ${
                selectedFilter === 'ALL'
                  ? 'bg-brand-900 text-white border-brand-900 font-medium'
                  : 'bg-white text-ink-700 border-border hover:bg-surface-sunken'
              }`}
            >
              All Mines ({state.mines.length})
            </button>
            {Object.entries(RISK_COLORS).map(([level, color]) => (
              <button
                key={level}
                onClick={() => setSelectedFilter(selectedFilter === level ? 'ALL' : level)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
                  selectedFilter === level
                    ? 'ring-2 ring-brand-800 font-semibold shadow-xs'
                    : 'bg-white hover:bg-surface-sunken'
                }`}
                style={{ borderColor: color }}
              >
                <span className="h-2.5 w-2.5 rounded-full border border-white shadow-xs" style={{ background: color }} />
                <span>{level}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-ink-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHqs}
                onChange={(e) => setShowHqs(e.target.checked)}
                className="accent-brand-600 rounded cursor-pointer h-3.5 w-3.5"
              />
              <span className="font-medium text-ink-800">CIL Subsidiary HQs</span>
            </label>
            <span className="flex items-center gap-1.5 text-ink-500">
              <span className="inline-block w-3.5 h-1 bg-[#0F172A] rounded" /> India Legal Boundary
            </span>
          </div>
        </div>
      </Card>

      {/* World Map with Official India Sovereign Boundary */}
      <div className="overflow-hidden rounded-xl border border-border shadow-card relative bg-surface-canvas">
        <MapContainer
          center={[23.0, 80.0]}
          zoom={5}
          minZoom={2}
          maxZoom={18}
          worldCopyJump={true}
          style={{ height: '580px', width: '100%' }}
          scrollWheelZoom={true}
        >
          {/* CartoDB Voyager basemap for seamless worldwide topography */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* India Legal Boundary GeoJSON encompassing all of Kashmir & Ladakh */}
          <GeoJSON
            data={indiaSoiData}
            style={{
              color: '#0F172A',
              weight: 2.5,
              opacity: 0.9,
              fillColor: '#0284C7',
              fillOpacity: 0.04,
            }}
          />

          {/* Mine Markers with Live Risk Popup */}
          {displayedMines.map((mine) => (
            <Marker
              key={mine.id}
              position={mine.coordinates}
              icon={riskIcon(mine.risk?.level || mine.riskLevel)}
            >
              <Popup>
                <div className="min-w-[200px] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="font-bold text-sm text-ink-900">{mine.name}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                      style={{ background: RISK_COLORS[mine.riskLevel] || '#5B6B7C' }}
                    >
                      {mine.riskLevel}
                    </span>
                  </div>
                  <p className="text-ink-600 flex items-center gap-1">
                    <Compass size={12} className="text-brand-600" /> {mine.location}
                  </p>
                  <p className="text-ink-700">
                    Subsidiary: <strong className="text-ink-900">{mine.subsidiary || 'Coal India Limited'}</strong>
                  </p>
                  <div className="grid grid-cols-2 gap-1 py-1 text-[11px] bg-surface-sunken p-1.5 rounded">
                    <div>Risk Score: <strong className="text-ink-900">{mine.riskScore}/100</strong></div>
                    <div>Compliance: <strong className="text-status-success">{mine.complianceRate}%</strong></div>
                    <div>Open Flags: <strong className="text-ink-900">{mine.openFlags}</strong></div>
                    <div>Actions: <strong className="text-ink-900">{mine.openCorrectiveActions}</strong></div>
                  </div>
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => navigate(`/mines/${mine.id}`)}
                  >
                    View Mine Dossier
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* CIL Subsidiary Headquarters & Exploration Basins */}
          {showHqs && CIL_KEY_LOCATIONS.map((hq) => (
            <Marker
              key={hq.code}
              position={hq.coordinates}
              icon={hqIcon(hq.code)}
            >
              <Popup>
                <div className="min-w-[190px] text-xs space-y-1">
                  <div className="font-bold text-ink-900 text-sm flex items-center gap-1.5">
                    <Building2 size={14} className="text-brand-700" /> {hq.name}
                  </div>
                  <p className="text-ink-500 font-medium">{hq.location}</p>
                  <p className="text-ink-700 leading-relaxed text-[11px] pt-1 border-t border-border">
                    {hq.desc}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Coal Basin Geographical Directory */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <Card className="p-4">
          <div className="flex items-center gap-2 font-bold text-ink-900 mb-1">
            <Building2 size={15} className="text-brand-600" /> Eastern Coalfields Basin
          </div>
          <p className="text-ink-500 leading-relaxed">
            Raniganj, Jharia, Bokaro & Karanpura basins operated by ECL, BCCL, and CCL, providing essential coking coal for domestic steel production.
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 font-bold text-ink-900 mb-1">
            <Layers size={15} className="text-status-success" /> Central & Mahanadi Valley
          </div>
          <p className="text-ink-500 leading-relaxed">
            Korba, Gevra, Dipka, Talcher and Ib Valley blocks under SECL and MCL, producing over 393 MT of non-coking coal for national thermal power plants.
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 font-bold text-ink-900 mb-1">
            <Compass size={15} className="text-brand-700" /> Northern Exploration & CMPDI RIs
          </div>
          <p className="text-ink-500 leading-relaxed">
            Singrauli (NCL), Sub-Himalayan Kalakot basin in Jammu & Kashmir, and nationwide exploratory core drilling coordinated through 7 Regional Institutes.
          </p>
        </Card>
      </div>
    </div>
  );
}
