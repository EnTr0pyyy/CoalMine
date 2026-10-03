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
    html: `
      <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:${color};opacity:0.35;animation:ping 2.5s cubic-bezier(0,0,0.2,1) infinite;pointer-events:none;"></span>
        <div style="width:20px;height:20px;border-radius:50%;background:${color};border:2.5px solid #FFFFFF;box-shadow:0 2px 7px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;pointer-events:auto;transition:transform 0.15s ease;">
          <div style="width:6px;height:6px;border-radius:50%;background:#FFFFFF;"></div>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

export default function RiskMap() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', mines: [] });
  const [showLabels, setShowLabels] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [baseMapKey, setBaseMapKey] = useState('osm');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Load accurate real CIL mine data directly without requiring live network fetch
  function loadData() {
    const merged = mockMines.map((m) => {
      let coords = m.coordinates;
      if (typeof coords === 'string') {
        try { coords = JSON.parse(coords); } catch { coords = null; }
      }
      if ((!coords || !Array.isArray(coords)) && m.latitude != null && m.longitude != null) {
        coords = [m.latitude, m.longitude];
      }
      return {
        ...m,
        coordinates: coords,
      };
    });
    setState({ status: 'success', mines: merged });
  }

  useEffect(() => {
    loadData();
  }, []);

  // Initialize pure Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center over Central India coalfields with full worldwide navigation
    const map = L.map(mapContainerRef.current, {
      center: [22.8, 82.5],
      zoom: 6,
      minZoom: 3,
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

  // Update Leaflet markers when state.mines, selectedFilter, or showLabels change
  // Synchronized markers: Only the dot pin is clickable; labels are non-interactive tooltips
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const displayedMines = selectedFilter === 'ALL'
      ? state.mines
      : state.mines.filter((m) => (m.risk?.level || m.riskLevel) === selectedFilter);

    displayedMines.forEach((mine) => {
      if (!mine.coordinates || !Array.isArray(mine.coordinates) || mine.coordinates.length !== 2) return;
      const level = mine.risk?.level || mine.riskLevel || 'MEDIUM';
      const color = RISK_COLORS[level] || RISK_COLORS.MEDIUM;

      // 1. Only the dot marker is interactive/clickable
      const marker = L.marker(mine.coordinates, {
        icon: riskIcon(level),
        keyboard: true,
        title: `${mine.name} (${mine.subsidiary || 'CIL'})`,
      });

      // 2. Synchronized mine label: anchored directly to the dot, completely non-interactive
      if (showLabels) {
        marker.bindTooltip(
          `<div style="display:flex;align-items:center;gap:5px;font-family:system-ui,-apple-system,sans-serif;pointer-events:none;user-select:none;">
             <span style="background:#0F172A;color:#F8FAFC;font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;letter-spacing:0.5px;">${mine.subsidiary || 'CIL'}</span>
             <span style="font-size:11px;font-weight:700;color:#0F172A;letter-spacing:-0.2px;">${mine.name}</span>
           </div>`,
          {
            permanent: true,
            direction: 'top',
            offset: [0, -14],
            interactive: false, // Absolutely NOT clickable! Clicks pass through to the dot!
            className: 'mine-synced-tooltip',
          }
        );
      }

      // 3. Rich popup opened ONLY by clicking the dot
      const popupHtml = `
        <div style="min-width:230px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.45;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:8px;gap:8px;">
            <div>
              <div style="font-size:9px;font-weight:800;color:#0284C7;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:2px;">
                ${mine.subsidiary || 'CIL'} · ${mine.code || 'MINE-SITE'}
              </div>
              <strong style="font-size:13px;color:#0F172A;line-height:1.25;display:block;">${mine.name}</strong>
            </div>
            <span style="background:${color};color:white;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;white-space:nowrap;">
              ${level}
            </span>
          </div>
          <div style="color:#475569;margin-bottom:5px;display:flex;align-items:center;gap:4px;font-size:11px;">
            📍 <span>${mine.location || `${mine.district}, ${mine.state}`}</span>
          </div>
          <div style="color:#334155;margin-bottom:8px;font-size:11px;">
            Subsidiary: <strong style="color:#0F172A;">${mine.subsidiary || 'Coal India Limited'}</strong>
            ${mine.state ? ` (${mine.state})` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#F8FAFC;padding:8px;border-radius:6px;font-size:11px;margin-bottom:10px;border:1px solid #E2E8F0;">
            <div>Risk Score: <strong>${mine.riskScore || 0}/100</strong></div>
            <div>Compliance: <strong style="color:#16A34A;">${mine.complianceRate || 95}%</strong></div>
            <div>Open Flags: <strong>${mine.openFlags || 0}</strong></div>
            <div>Actions: <strong>${mine.openCorrectiveActions || 0}</strong></div>
            ${mine.productionMT ? `<div style="grid-column:span 2;color:#64748B;font-size:10px;border-top:1px solid #E2E8F0;padding-top:4px;">Annual Output: <strong style="color:#0F172A;">${mine.productionMT} MTPA</strong></div>` : ''}
          </div>
          <button
            class="view-mine-btn"
            data-mine-id="${mine.id}"
            style="width:100%;background:#081B33;color:white;border:none;padding:7px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:background 0.2s;"
            onmouseover="this.style.background='#1B4965'"
            onmouseout="this.style.background='#081B33'"
          >
            View Mine Dossier →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });
      markersLayer.addLayer(marker);
    });
  }, [state.mines, selectedFilter, showLabels]);

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
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="accent-brand-600 rounded cursor-pointer h-3.5 w-3.5"
              />
              <span className="font-medium text-ink-800">Mine Labels</span>
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
        <style>{`
          .mine-synced-tooltip {
            background: rgba(255, 255, 255, 0.94) !important;
            backdrop-filter: blur(4px) !important;
            border: 1px solid rgba(15, 23, 42, 0.18) !important;
            border-radius: 6px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
            padding: 3px 8px !important;
            pointer-events: none !important;
            cursor: default !important;
          }
          .mine-synced-tooltip::before {
            border-top-color: rgba(255, 255, 255, 0.94) !important;
          }
          .custom-mine-pin {
            background: transparent !important;
            border: none !important;
          }
        `}</style>
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
