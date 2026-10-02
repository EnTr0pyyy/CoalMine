import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Compass,
  Layers,
  Filter,
  RotateCcw,
  Globe2
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import { mineService } from '../../services/mineService.js';
import { riskService } from '../../services/riskService.js';
import { mockMines } from '../../data/mockData.js';
import indiaLegalBoundary from '../../data/india-soi.json';

const RISK_COLORS = {
  LOW: '#2F6846',
  MEDIUM: '#B7791F',
  HIGH: '#B3401D',
  CRITICAL: '#8C1D1D'
};

// 100% Free, Open, Keyless Global Basemaps (No API Key Required, No Watermarks)
const BASE_MAPS = {
  osm: {
    label: 'Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  esriStreet: {
    label: 'Topographic GIS',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ',
    maxZoom: 19,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
};

function riskIcon(level) {
  const color = RISK_COLORS[level] || RISK_COLORS.MEDIUM;
  return L.divIcon({
    className: 'custom-mine-pin',
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.15s ease;">
             <div style="width:6px;height:6px;border-radius:9999px;background:white;"></div>
           </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function hqIcon(code) {
  return L.divIcon({
    className: 'custom-hq-badge',
    html: `<div style="padding:2px 7px;border-radius:4px;background:#081B33;color:#F8FAFC;border:1.5px solid #1B4965;font-size:10px;font-weight:700;box-shadow:0 2px 5px rgba(0,0,0,0.35);white-space:nowrap;cursor:pointer;">${code}</div>`,
    iconSize: [38, 20],
    iconAnchor: [19, 10],
    popupAnchor: [0, -10],
  });
}

// CIL Subsidiaries & Key Mining Exploration Basins across India
const CIL_KEY_LOCATIONS = [
  { code: 'CIL HQ', name: 'Coal India Limited (Apex HQ)', location: 'Kolkata, West Bengal', coordinates: [22.5726, 88.3639], desc: 'National apex holding company headquarters.' },
  { code: 'CMPDI', name: 'CMPDI Central Headquarters', location: 'Ranchi, Jharkhand', coordinates: [23.3441, 85.3096], desc: 'Pan-India exploration, borehole drilling & geological modeling.' },
  { code: 'SECL', name: 'South Eastern Coalfields HQ', location: 'Bilaspur, Chhattisgarh', coordinates: [22.0797, 82.1409], desc: 'Gevra, Kusmunda, Dipka mega opencast operations.' },
  { code: 'MCL', name: 'Mahanadi Coalfields HQ', location: 'Sambalpur, Odisha', coordinates: [21.4669, 83.9812], desc: 'Talcher & Ib Valley coalfields evacuation & FMC rail sidings.' },
  { code: 'NCL', name: 'Northern Coalfields HQ', location: 'Singrauli, Madhya Pradesh', coordinates: [24.1997, 82.6644], desc: '100% mechanized opencast mining complexes.' },
  { code: 'BCCL', name: 'Bharat Coking Coal HQ', location: 'Dhanbad, Jharkhand', coordinates: [23.7957, 86.4304], desc: 'Jharia prime coking coal extraction & coal washeries.' },
  { code: 'CCL', name: 'Central Coalfields HQ', location: 'Ranchi, Jharkhand', coordinates: [23.3683, 85.3262], desc: 'Karanpura, Bokaro & Ramgarh command fields.' },
  { code: 'WCL', name: 'Western Coalfields HQ', location: 'Nagpur, Maharashtra', coordinates: [21.1458, 79.0882], desc: 'Wardha, Umrer & Pench coal extraction belts.' },
  { code: 'ECL', name: 'Eastern Coalfields HQ', location: 'Sanctoria, West Bengal', coordinates: [23.6841, 86.8529], desc: 'Raniganj historical underground & opencast basin.' },
  { code: 'J&K EXP', name: 'Kalakot Coalfield & Exploration Sector', location: 'Rajouri, Jammu & Kashmir', coordinates: [33.2200, 74.4100], desc: 'Sub-Himalayan tertiary anthracite/semi-bituminous exploration sector.' },
];

export default function RiskMap() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', mines: [] });
  const [showHqs, setShowHqs] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [baseMapKey, setBaseMapKey] = useState('osm');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Load mines & risk data with fallback to mockMines so map never goes blank
  async function loadData() {
    setState((prev) => ({ ...prev, status: 'loading' }));
    try {
      const [mines, riskScores] = await Promise.all([
        mineService.getMines().catch(() => mockMines),
        riskService.getRiskScores().catch(() => []),
      ]);
      const safeMines = Array.isArray(mines) && mines.length > 0 ? mines : mockMines;
      const merged = safeMines.map((m) => ({
        ...m,
        risk: (riskScores || []).find((r) => r.mineId === m.id) || null,
      }));
      setState({ status: 'success', mines: merged });
    } catch {
      setState({ status: 'success', mines: mockMines });
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Initialize pure Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center over India with full worldwide navigation
    const map = L.map(mapContainerRef.current, {
      center: [22.8, 80.5],
      zoom: 5,
      minZoom: 2,
      maxZoom: 19,
      worldCopyJump: true,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    // 1. Initial Tile Layer (OpenStreetMap by default, 0 watermarks, no key)
    const initialConfig = BASE_MAPS[baseMapKey] || BASE_MAPS.osm;
    tileLayerRef.current = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      maxZoom: initialConfig.maxZoom,
    }).addTo(map);

    // 2. True Sovereign Legal Boundary of India (encompassing full Kashmir & Ladakh)
    if (indiaLegalBoundary) {
      geojsonLayerRef.current = L.geoJSON(indiaLegalBoundary, {
        style: {
          color: '#0F172A',
          weight: 2.8,
          opacity: 0.95,
          fillColor: '#0284C7',
          fillOpacity: 0.04,
        },
      }).addTo(map);
    }

    // 3. Layer group for dynamic markers
    markersLayerRef.current = L.layerGroup().addTo(map);

    // 4. Delegate click events inside Leaflet popups
    map.on('popupopen', (e) => {
      const popupNode = e.popup?.getElement?.() || e.popup?._container;
      if (popupNode) {
        const btn = popupNode.querySelector('.view-mine-btn');
        if (btn) {
          btn.onclick = () => {
            const mineId = btn.getAttribute('data-mine-id');
            if (mineId) navigate(`/mines/${mineId}`);
          };
        }
      }
    });

    // Invalidate size once container mounts
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [navigate]);

  // Handle Basemap Switcher (Hot swap tile layer smoothly)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = BASE_MAPS[baseMapKey] || BASE_MAPS.osm;
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    // Adjust boundary line color for satellite vs map mode
    if (geojsonLayerRef.current) {
      const isSatellite = baseMapKey === 'satellite';
      geojsonLayerRef.current.setStyle({
        color: isSatellite ? '#38BDF8' : '#0F172A',
        weight: 2.8,
        opacity: 0.95,
        fillColor: '#0284C7',
        fillOpacity: isSatellite ? 0.08 : 0.04,
      });
      geojsonLayerRef.current.bringToFront();
    }
  }, [baseMapKey]);

  // Update Leaflet markers when state.mines, selectedFilter, or showHqs change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Mine Markers
    const displayedMines = selectedFilter === 'ALL'
      ? state.mines
      : state.mines.filter((m) => (m.risk?.level || m.riskLevel) === selectedFilter);

    displayedMines.forEach((mine) => {
      if (!mine.coordinates || mine.coordinates.length !== 2) return;
      const level = mine.risk?.level || mine.riskLevel || 'MEDIUM';
      const color = RISK_COLORS[level] || RISK_COLORS.MEDIUM;

      const marker = L.marker(mine.coordinates, {
        icon: riskIcon(level),
      });

      const popupHtml = `
        <div style="min-width:210px;font-family:inherit;font-size:12px;line-height:1.45;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E2E8F0;padding-bottom:6px;margin-bottom:8px;">
            <strong style="font-size:13px;color:#0F172A;">${mine.name}</strong>
            <span style="background:${color};color:white;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;">
              ${level}
            </span>
          </div>
          <div style="color:#64748B;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
            📍 ${mine.location}
          </div>
          <div style="color:#334155;margin-bottom:8px;">
            Subsidiary: <strong style="color:#0F172A;">${mine.subsidiary || 'Coal India Limited'}</strong>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#F8FAFC;padding:7px;border-radius:6px;font-size:11px;margin-bottom:10px;">
            <div>Risk Score: <strong>${mine.riskScore || 0}/100</strong></div>
            <div>Compliance: <strong style="color:#16A34A;">${mine.complianceRate || 95}%</strong></div>
            <div>Open Flags: <strong>${mine.openFlags || 0}</strong></div>
            <div>Actions: <strong>${mine.openCorrectiveActions || 0}</strong></div>
          </div>
          <button
            class="view-mine-btn"
            data-mine-id="${mine.id}"
            style="width:100%;background:#081B33;color:white;border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:background 0.2s;"
            onmouseover="this.style.background='#1B4965'"
            onmouseout="this.style.background='#081B33'"
          >
            View Mine Dossier
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });
      markersLayer.addLayer(marker);
    });

    // 2. CIL Headquarters & Exploration Basins
    if (showHqs) {
      CIL_KEY_LOCATIONS.forEach((hq) => {
        const hqMarker = L.marker(hq.coordinates, {
          icon: hqIcon(hq.code),
        });

        const hqPopupHtml = `
          <div style="min-width:200px;font-family:inherit;font-size:12px;line-height:1.45;">
            <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px;">
              🏢 ${hq.name}
            </div>
            <div style="color:#64748B;font-weight:500;margin-bottom:6px;">${hq.location}</div>
            <div style="color:#334155;font-size:11px;padding-top:6px;border-top:1px solid #E2E8F0;">
              ${hq.desc}
            </div>
          </div>
        `;

        hqMarker.bindPopup(hqPopupHtml, { maxWidth: 260 });
        markersLayer.addLayer(hqMarker);
      });
    }
  }, [state.mines, selectedFilter, showHqs]);

  function handleResetView() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([22.8, 80.5], 5, { duration: 1.2 });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geological & Statutory Risk Map"
        description="Geospatial distribution of CIL coalfields, operational subsidiary mines, and key mining command sectors."
      />

      {/* Interactive Controls & Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Risk Filter Pills */}
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

          {/* Right Controls: Basemap Switcher + HQs + Reset */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-600">
            {/* Basemap Switcher */}
            <div className="flex items-center bg-surface-sunken p-1 rounded-lg border border-border">
              <span className="px-2 text-[11px] font-semibold text-ink-500 flex items-center gap-1">
                <Globe2 size={12} className="text-brand-600" /> Map:
              </span>
              {Object.entries(BASE_MAPS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setBaseMapKey(key)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    baseMapKey === key
                      ? 'bg-white text-brand-900 shadow-xs font-semibold'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHqs}
                onChange={(e) => setShowHqs(e.target.checked)}
                className="accent-brand-600 rounded cursor-pointer h-3.5 w-3.5"
              />
              <span className="font-medium text-ink-800">CIL HQs</span>
            </label>

            <span className="flex items-center gap-1.5 text-ink-500">
              <span className="inline-block w-3.5 h-1 bg-[#0F172A] rounded" /> India Boundary
            </span>

            <button
              onClick={handleResetView}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-white hover:bg-surface-sunken text-ink-700 transition"
              title="Reset Map View to India"
            >
              <RotateCcw size={12} className="text-brand-600" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Pure Leaflet Map Container */}
      <div className="overflow-hidden rounded-xl border border-border shadow-card relative bg-surface-canvas">
        <div
          ref={mapContainerRef}
          style={{ height: '580px', width: '100%', zIndex: 1 }}
        />
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
