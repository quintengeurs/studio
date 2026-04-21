
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  FileDown,
  X,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, where, limit, doc } from "firebase/firestore";
import { Asset, Issue, User, Role, RegistryConfig } from "@/lib/types";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";

// Leaflet imports - Only client side
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

export default function MapPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const { permissions, isAdmin } = useUserContext();
  const { allUsers, allAssets: assets, allIssues: issues } = useDataContext();

  // States
  const [showIssues, setShowIssues] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showHeat, setShowHeat] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<{ item: Asset | Issue, type: 'Asset' | 'Issue' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Layers (Initialized in useEffect to be client-safe)
  const [issueLayer, setIssueLayer] = useState<L.LayerGroup | null>(null);
  const [assetLayer, setAssetLayer] = useState<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);

  // Filtered List for Sidebar
  const sidebarItems = useMemo(() => {
    const s = search.toLowerCase();
    const filteredIssues = issues.filter(i => 
      i.title.toLowerCase().includes(s) || 
      i.id.toLowerCase().includes(s)
    ).map(i => ({ ...i, mapSearchType: 'Issue' as const }));
    
    const filteredAssets = assets.filter(a => 
      a.name.toLowerCase().includes(s) || 
      a.id.toLowerCase().includes(s)
    ).map(a => ({ ...a, mapSearchType: 'Asset' as const }));

    return [...filteredIssues, ...filteredAssets].sort((a, b) => a.id.localeCompare(b.id));
  }, [issues, assets, search]);

  // Map Initialization
  useEffect(() => {
    if (typeof window === "undefined" || !permissions.viewMap) return;

    const mapElement = document.getElementById('map-container');
    if (!mapElement || mapRef.current) return;

    // Hackney Reference Point (London)
    const referencePosition: [number, number] = [51.5452, -0.0548];

    const map = L.map('map-container', { 
      zoomControl: true, 
      attributionControl: false 
    }).setView(referencePosition, 15);

    // Initialize layers if not present
    const iLayer = L.layerGroup();
    const aLayer = L.layerGroup();
    setIssueLayer(iLayer);
    setAssetLayer(aLayer);

    // Add layers to map
    iLayer.addTo(map);
    aLayer.addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [permissions.viewMap]);

  // Update Markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || !issueLayer || !assetLayer) return;

    const map = mapRef.current;
    issueLayer.clearLayers();
    assetLayer.clearLayers();

    console.log(`[Map] Updating markers. Issues: ${issues.length}, Assets: ${assets.length}`);

    const bounds = L.latLngBounds([]);

    // Issues
    let plottedIssues = 0;
    if (showIssues) {
      issues.forEach(issue => {
        const lat = Number(issue.location?.latitude);
        const lon = Number(issue.location?.longitude);
        
        if (isNaN(lat) || isNaN(lon) || !lat || !lon) return;
        
        plottedIssues++;
        const pos = L.latLng(lat, lon);
        bounds.extend(pos);
        
        const color = getIssueColor(issue.priority);
        const marker = L.circleMarker(pos, {
          radius: 10,
          fillColor: color,
          color: "#fff",
          weight: 3,
          fillOpacity: 1
        }).addTo(issueLayer);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          showDetail(issue, 'Issue');
        });
      });
    }

    // Assets
    let plottedAssets = 0;
    if (showAssets) {
      assets.forEach(asset => {
        const lat = Number(asset.gpsLocation?.latitude);
        const lon = Number(asset.gpsLocation?.longitude);

        if (isNaN(lat) || isNaN(lon) || !lat || !lon) return;

        plottedAssets++;
        const pos = L.latLng(lat, lon);
        bounds.extend(pos);

        const marker = L.circleMarker(pos, {
          radius: 8,
          fillColor: "#1e293b",
          color: "#fff",
          weight: 3,
          fillOpacity: 1
        }).addTo(assetLayer);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          showDetail(asset, 'Asset');
        });
      });
    }

    console.log(`[Map] Plotted ${plottedIssues} issues and ${plottedAssets} assets.`);

    // Auto-zoom if markers exist
    if (bounds.isValid() && (plottedIssues > 0 || plottedAssets > 0)) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }

    // Heatmap
    if (showHeat && (L as any).heatLayer) {
      const heatPoints = issues
        .filter(i => i.location?.latitude && i.location?.longitude)
        .map(i => [Number(i.location!.latitude), Number(i.location!.longitude), 1]);
      
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = (L as any).heatLayer(heatPoints, { radius: 28, blur: 18, maxZoom: 16 }).addTo(map);
    } else {
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
    }

  }, [mapReady, issues, assets, showIssues, showAssets, showHeat, issueLayer, assetLayer]);

  const getIssueColor = (priority: string) => {
    switch (priority) {
      case 'Emergency': return "#e74c3c";
      case 'High': return "#f39c12";
      case 'Medium': return "#f1c40f";
      default: return "#3498db";
    }
  };

  const showDetail = (item: any, type: 'Issue' | 'Asset') => {
    setSelectedItem({ item, type });
    setIsModalOpen(true);
    
    const lat = type === 'Issue' ? item.location?.latitude : item.gpsLocation?.latitude;
    const lon = type === 'Issue' ? item.location?.longitude : item.gpsLocation?.longitude;
    
    if (lat && lon && mapRef.current) {
      mapRef.current.flyTo([lat, lon], 17, { duration: 2.5 });
    }
  };

  const flyTo = (item: any, type: 'Issue' | 'Asset') => {
    const lat = type === 'Issue' ? item.location?.latitude : item.gpsLocation?.latitude;
    const lon = type === 'Issue' ? item.location?.longitude : item.gpsLocation?.longitude;
    
    if (lat && lon && mapRef.current) {
      mapRef.current.flyTo([lat, lon], 16, { duration: 2.0 });
    }
  };

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([51.5452, -0.0548], 15, { duration: 2.0 });
    }
  };

  const handleExportPDF = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    const mapElement = document.getElementById('map-main-area');
    if (mapElement) {
      const canvas = await html2canvas(mapElement);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Hackney_Map_Export_${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  if (!permissions.viewMap) {
    return (
      <DashboardShell title="Map Registry" description="Access Denied">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-bold">You do not have permission to view the Map Registry.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell 
      title="Interactive Infrastructure Map" 
      description="Visual grid layout of all park legacy assets and reported issues"
    >
      <style jsx global>{`
        .leaflet-container { 
          background: repeating-linear-gradient(0deg,#f0f0f0,#f0f0f0 1px,transparent 1px,transparent 40px),
                      repeating-linear-gradient(90deg,#f0f0f0,#f0f0f0 1px,transparent 1px,transparent 40px);
          background-size: 80px 80px; 
          border-radius: 12px;
          border: 2px solid hsl(var(--border));
        }
        .leaflet-div-icon {
          background: transparent;
          border: none;
        }
      `}</style>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)] min-h-[600px]" id="map-main-area">
        {/* Main Map View */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant={showIssues ? "default" : "outline"} 
                size="sm" 
                className="font-bold text-[10px] uppercase tracking-wider h-8"
                onClick={() => setShowIssues(!showIssues)}
              >
                <AlertCircle className="mr-2 h-3.5 w-3.5" /> Issues
              </Button>
              <Button 
                variant={showAssets ? "default" : "outline"} 
                size="sm" 
                className="font-bold text-[10px] uppercase tracking-wider h-8"
                onClick={() => setShowAssets(!showAssets)}
              >
                <LayoutGrid className="mr-2 h-3.5 w-3.5" /> Assets
              </Button>
              <Button 
                variant={showHeat ? "default" : "outline"} 
                size="sm" 
                className="font-bold text-[10px] uppercase tracking-wider h-8"
                onClick={() => setShowHeat(!showHeat)}
              >
                <Layers className="mr-2 h-3.5 w-3.5" /> Heatmap
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="font-bold text-[10px] uppercase h-8" onClick={handleResetView}>
                <Target className="mr-2 h-3.5 w-3.5" /> Reset View
              </Button>
              <Button variant="outline" size="sm" className="font-bold text-[10px] uppercase h-8" onClick={handleExportPDF}>
                <FileDown className="mr-2 h-3.5 w-3.5" /> Export PDF
              </Button>
            </div>
          </div>

          <div id="map-container" className="flex-1 w-full min-h-[400px] z-0 shadow-sm overflow-hidden relative">
            <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur p-3 rounded-lg border shadow-lg text-[10px] space-y-2 pointer-events-none">
              <p className="font-bold border-b pb-1 mb-1">LEGEND</p>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#e74c3c] border border-black" />
                <span className="font-medium text-muted-foreground uppercase tracking-tight">Emergency Issue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#f39c12] border border-black" />
                <span className="font-medium text-muted-foreground uppercase tracking-tight">High Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#f1c40f] border border-black" />
                <span className="font-medium text-muted-foreground uppercase tracking-tight">Medium Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#555] border border-black" />
                <span className="font-medium text-muted-foreground uppercase tracking-tight">Infrastructure Asset</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar List */}
        <Card className="w-full lg:w-[350px] flex flex-col overflow-hidden border-2">
          <CardHeader className="p-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-headline uppercase tracking-widest flex items-center justify-between">
              Grid Registry
              <Badge variant="secondary" className="text-[9px]">{sidebarItems.length} Items</Badge>
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by ID or Name..." 
                className="pl-8 h-8 text-xs bg-background" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sidebarItems.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all border border-transparent hover:border-border group"
                  onClick={() => flyTo(item, (item as any).mapSearchType)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">{item.id}</span>
                      <Badge variant="outline" className={`text-[8px] h-3.5 px-1 font-bold ${(item as any).mapSearchType === 'Issue' ? 'bg-orange-500/5 text-orange-600 border-orange-100' : 'bg-blue-500/5 text-blue-600 border-blue-100'}`}>
                        {(item as any).mapSearchType}
                      </Badge>
                      {((item as any).location?.latitude || (item as any).gpsLocation?.latitude) && (
                        <Badge variant="default" className="text-[7px] h-3 px-1 font-bold bg-green-600 hover:bg-green-600">GPS</Badge>
                      )}
                    </div>
                    <p className="text-xs font-bold truncate pr-4">{(item as any).title || (item as any).name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {item.park}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all shrink-0">
                    <Target className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              ))}
              {sidebarItems.length === 0 && (
                <div className="py-10 text-center text-xs text-muted-foreground italic">No markers match your search.</div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-2 shadow-2xl animate-in zoom-in-95 duration-300">
          {selectedItem && (
            <>
              <div className="relative w-full h-48 bg-muted">
                {selectedItem.item.imageUrl ? (
                  <Image src={selectedItem.item.imageUrl} alt="Proof" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <LayoutGrid className="h-10 w-10 opacity-10" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Visual Data Available</span>
                  </div>
                )}
                <div className={`absolute top-0 left-0 w-full h-1.5 ${selectedItem.type === 'Issue' ? getIssueColor((selectedItem.item as Issue).priority) : '#555'}`} />
                <Badge className="absolute top-4 right-4 font-bold text-[9px] uppercase tracking-widest shadow-lg">
                  {selectedItem.type}
                </Badge>
              </div>

              <div className="p-6 space-y-4">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">{selectedItem.item.id}</span>
                  </div>
                  <DialogTitle className="text-xl font-headline font-bold">
                    {(selectedItem.item as any).title || (selectedItem.item as any).name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1 font-medium">
                    <MapPin className="h-3 w-3 text-primary" />
                    {selectedItem.item.park} • {(selectedItem.item as any).location || (selectedItem.item as any).park}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status / Condition</p>
                    <p className="text-xs font-bold">{(selectedItem.item as any).status || (selectedItem.item as any).condition}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Reported / Registered</p>
                    <p className="text-xs font-bold">{(selectedItem.item as any).createdAt ? new Date((selectedItem.item as any).createdAt).toLocaleDateString() : (selectedItem.item as any).lastInspected}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Description & Intelligence</p>
                  <p className="text-xs leading-relaxed text-muted-foreground p-3 rounded-lg bg-muted/20 italic border">
                    {(selectedItem.item as any).description || (selectedItem.item as any).type || "No additional metadata recorded for this node."}
                  </p>
                </div>

                <div className="pt-4 flex gap-2 child:flex-1">
                  <Button variant="outline" className="text-xs font-bold uppercase py-5" onClick={() => setIsModalOpen(false)}>Close View</Button>
                  <Button 
                    variant="default" 
                    className="text-xs font-bold uppercase py-5"
                    onClick={() => {
                        const path = selectedItem.type === 'Issue' ? '/issues' : '/assets';
                        router.push(path);
                    }}
                  >
                    Go to Registry
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
