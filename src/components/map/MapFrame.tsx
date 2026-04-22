"use client";

import { useEffect, useState, useRef } from "react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Asset, Issue } from "@/lib/types";
import { Target, X, AlertCircle } from "lucide-react";

interface MapFrameProps {
  issues: Issue[];
  assets: Asset[];
  showIssues: boolean;
  showAssets: boolean;
  showHeat: boolean;
  onShowDetail: (item: any, type: 'Issue' | 'Asset') => void;
  flyToData: { item: any; type: 'Issue' | 'Asset'; timestamp: number } | null;
}

export default function MapFrame({ 
  issues, 
  assets, 
  showIssues, 
  showAssets, 
  showHeat,
  onShowDetail,
  flyToData
}: MapFrameProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const layerRef = useRef<{ 
    issues: L.LayerGroup; 
    assets: L.LayerGroup; 
    heat: any;
  } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mapElement = document.getElementById('map-container-inner');
    if (!mapElement || mapRef.current) return;

    // Borough Benchmark Reference
    const benchmarkPos: [number, number] = [51.54500, -0.05580];

    const map = L.map('map-container-inner', { 
      zoomControl: true, 
      attributionControl: false,
      scrollWheelZoom: true,
      touchZoom: true
    }).setView(benchmarkPos, 15);

    // Grid Background (Force CSS to apply to the container Leaflet just found)
    mapElement.classList.add('leaflet-grid-style');

    const iLayer = L.layerGroup().addTo(map);
    const aLayer = L.layerGroup().addTo(map);
    
    layerRef.current = { issues: iLayer, assets: aLayer, heat: null };
    mapRef.current = map;
    
    // Force a resize check to prevent Grey Map Tiles
    setTimeout(() => {
      map.invalidateSize();
      setMapReady(true);
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Handle flyTo requests from parent
  useEffect(() => {
    if (!mapReady || !mapRef.current || !flyToData) return;
    
    const { item, type } = flyToData;
    const lat = type === 'Issue' ? item.location?.latitude : item.gpsLocation?.latitude;
    const lon = type === 'Issue' ? item.location?.longitude : item.gpsLocation?.longitude;
    
    if (lat && lon) {
      mapRef.current.flyTo([lat, lon], 17, { duration: 2.0 });
    }
  }, [mapReady, flyToData]);

  // Update Markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || !layerRef.current) return;

    const map = mapRef.current;
    const { issues: iLayer, assets: aLayer } = layerRef.current;

    iLayer.clearLayers();
    aLayer.clearLayers();

    const bounds = L.latLngBounds([]);
    let plottedCount = 0;

    // Plot Issues
    if (showIssues) {
      issues.forEach(issue => {
        const lat = parseFloat((issue.location as any)?.latitude);
        const lon = parseFloat((issue.location as any)?.longitude);
        if (isNaN(lat) || isNaN(lon)) return;

        const pos = L.latLng(lat, lon);
        bounds.extend(pos);
        plottedCount++;

        const isResolved = issue.status === 'Resolved';
        const color = isResolved ? "#10b981" : getIssueColor(issue.priority);
        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: 'custom-map-marker',
            html: `<div class="marker-glow" style="background-color: ${color}; box-shadow: 0 0 10px ${color}; opacity: ${isResolved ? 0.4 : 1}; animation: ${isResolved ? 'none' : 'pulse 2s infinite'}"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(iLayer);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onShowDetail(issue, 'Issue');
        });
      });
    }

    // Plot Assets
    if (showAssets) {
      assets.forEach(asset => {
        const lat = parseFloat((asset.gpsLocation as any)?.latitude);
        const lon = parseFloat((asset.gpsLocation as any)?.longitude);
        if (isNaN(lat) || isNaN(lon)) return;

        const pos = L.latLng(lat, lon);
        bounds.extend(pos);
        plottedCount++;

        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: 'custom-map-marker',
            html: `<div class="marker-glow asset" style="background-color: #1e293b; box-shadow: 0 0 8px rgba(0,0,0,0.5)"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })
        }).addTo(aLayer);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onShowDetail(asset, 'Asset');
        });
      });
    }

    // Add Fixed Borough Benchmark Marker
    const benchmarkPos: [number, number] = [51.54500, -0.05580];
    L.marker(benchmarkPos, {
      icon: L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="marker-glow benchmark" style="background-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.8)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      }),
      zIndexOffset: 1000,
      interactive: false
    }).addTo(map);

    // Heatmap
    if (showHeat && (L as any).heatLayer) {
      const heatPoints = issues
        .filter(i => i.location?.latitude && i.location?.longitude)
        .map(i => [Number(i.location!.latitude), Number(i.location!.longitude), 0.5]);
      
      if (layerRef.current.heat) map.removeLayer(layerRef.current.heat);
      layerRef.current.heat = (L as any).heatLayer(heatPoints, { radius: 25, blur: 15 }).addTo(map);
    } else {
      if (layerRef.current.heat) map.removeLayer(layerRef.current.heat);
    }

    // Auto-fit bounds on first load or data change
    if (plottedCount > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }

  }, [mapReady, issues, assets, showIssues, showAssets, showHeat]);

  const getIssueColor = (priority: string) => {
    switch (priority) {
      case 'Emergency': return "#e74c3c";
      case 'High': return "#f39c12";
      case 'Medium': return "#f1c40f";
      default: return "#3498db";
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <style jsx global>{`
        .leaflet-grid-style { 
          background: repeating-linear-gradient(0deg,#f5f5f5,#f5f5f5 1px,transparent 1px,transparent 40px),
                      repeating-linear-gradient(90deg,#f5f5f5,#f5f5f5 1px,transparent 1px,transparent 40px) !important;
          background-size: 80px 80px !important; 
          border-radius: 12px;
          border: 2px solid #e5e7eb;
        }
        .marker-glow {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid white;
          animation: pulse 2s infinite;
        }
        .marker-glow.asset { animation: none; border-width: 1px; }
        .marker-glow.benchmark { 
          animation: pulse-benchmark 3s infinite; 
          border: 3px solid white;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 1; }
        }
        @keyframes pulse-benchmark {
          0% { transform: scale(0.8); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
          100% { transform: scale(0.8); opacity: 1; }
        }
        .custom-map-marker { background: transparent; border: none; }
      `}</style>
      
      {/* Dynamic Diagnostic Indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/80 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 pointer-events-none transition-all shadow-xl">
        {mapReady ? (
          <><Target className="h-3 w-3 text-green-400 animate-pulse" /> Live Tracking Active</>
        ) : (
          <><AlertCircle className="h-3 w-3 text-yellow-400" /> Initializing Frame...</>
        )}
      </div>

      <div id="map-container-inner" className="flex-1 w-full h-full z-0 overflow-hidden relative shadow-inner" />
    </div>
  );
}
