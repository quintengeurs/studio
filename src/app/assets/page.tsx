
"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CalendarCheck,
  ClipboardList,
  Edit2,
  X,
  MapPin,
  Clock,
  History,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { MOCK_ASSETS, MOCK_INSPECTION_TEMPLATES, MOCK_TASKS, MOCK_INSPECTIONS } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const PARKS = Array.from(new Set(MOCK_ASSETS.map(a => a.park))).sort();

export default function AssetRegister() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: '',
    park: '',
    location: '',
    condition: 'Excellent' as const,
    setupInspection: false,
    setupTask: false
  });

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'bg-primary text-primary-foreground';
      case 'Good': return 'bg-accent text-accent-foreground';
      case 'Fair': return 'bg-secondary text-secondary-foreground';
      case 'Poor': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      default: return '';
    }
  };

  const handleAddAsset = () => {
    const asset: Asset = {
      ...newAsset,
      id: `a${Date.now()}`,
      lastInspected: 'New'
    } as Asset;
    setAssets([...assets, asset]);
    setIsAddDialogOpen(false);
    setNewAsset({ name: '', type: '', park: '', location: '', condition: 'Excellent', setupInspection: false, setupTask: false });
    toast({ title: "Asset Added", description: `${asset.name} registered successfully.` });
  };

  const handleUpdateAsset = () => {
    if (!selectedAsset) return;
    setAssets(assets.map(a => a.id === selectedAsset.id ? selectedAsset : a));
    setIsEditing(false);
    toast({ title: "Asset Updated", description: "Changes saved successfully." });
  };

  const openAssetDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsEditing(false);
    setIsDetailsDialogOpen(true);
  };

  const assetTasks = selectedAsset ? MOCK_TASKS.filter(t => t.park === selectedAsset.park && t.title.toLowerCase().includes(selectedAsset.name.toLowerCase().split(' ')[0])) : [];
  const assetInspections = selectedAsset ? MOCK_INSPECTIONS.filter(i => i.assetId === selectedAsset.id) : [];

  return (
    <DashboardShell 
      title="Asset Register" 
      description="Comprehensive inventory of Hackney parks infrastructure"
      actions={
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-headline font-bold w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Add New Asset</DialogTitle>
              <DialogDescription>Register a new piece of infrastructure.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Asset Name</Label>
                <Input value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. South End Play Frame" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={newAsset.type} onValueChange={v => setNewAsset({...newAsset, type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_INSPECTION_TEMPLATES.map(t => (
                        <SelectItem key={t.id} value={t.assetType}>{t.assetType}</SelectItem>
                      ))}
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Park</Label>
                   <Select value={newAsset.park} onValueChange={v => setNewAsset({...newAsset, park: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARKS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-4 border-2 border-muted rounded-lg bg-muted/20 space-y-4">
                <h4 className="text-xs font-bold uppercase text-primary tracking-widest flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" /> Schedule Setup
                </h4>
                <div className="flex items-start space-x-3">
                  <Checkbox id="insp" checked={newAsset.setupInspection} onCheckedChange={(v) => setNewAsset({...newAsset, setupInspection: !!v})} />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="insp" className="text-sm font-semibold leading-none cursor-pointer">Generate regular inspection</label>
                    <p className="text-xs text-muted-foreground">Automatically create inspection tasks based on asset type.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                   <Checkbox id="task" checked={newAsset.setupTask} onCheckedChange={(v) => setNewAsset({...newAsset, setupTask: !!v})} />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="task" className="text-sm font-semibold leading-none cursor-pointer">Create recurring maintenance</label>
                    <p className="text-xs text-muted-foreground">Add to the daily/weekly maintenance schedule.</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleAddAsset} disabled={!newAsset.name || !newAsset.park}>Complete Registration</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assets..." className="pl-9 w-full" />
        </div>
        <Button variant="outline" size="icon" className="shrink-0">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Card className="overflow-hidden border-2">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-headline font-bold whitespace-nowrap min-w-[150px]">Asset Name</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Park</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Category</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Condition</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Last Inspected</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => openAssetDetails(asset)}>
                  <TableCell className="font-medium">
                    <div className="min-w-[120px]">
                      <div className="truncate max-w-[200px]">{asset.name}</div>
                      <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[200px]">{asset.location}</div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{asset.park}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="outline" className="font-normal text-[10px]">{asset.type}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge className={`${getConditionColor(asset.condition)} font-bold text-[10px]`} variant="outline">
                      {asset.condition}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[10px] whitespace-nowrap">{asset.lastInspected}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAssetDetails(asset)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Asset Details & Edit Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
                  {selectedAsset?.name}
                  <Badge className={`${getConditionColor(selectedAsset?.condition || '')} font-bold text-[10px] uppercase ml-2`}>
                    {selectedAsset?.condition}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">{selectedAsset?.park} • {selectedAsset?.location}</span>
                </DialogDescription>
              </div>
              <Button 
                variant={isEditing ? "outline" : "default"} 
                size="sm" 
                className="font-bold"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <X className="mr-2 h-4 w-4" /> : <Edit2 className="mr-2 h-4 w-4" />}
                {isEditing ? "Cancel Edit" : "Edit Asset"}
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col mt-4">
            <TabsList className="mx-6 justify-start h-10 bg-transparent border-b rounded-none p-0 gap-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Overview</TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Maintenance & History</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                {isEditing ? (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Asset Name</Label>
                        <Input 
                          value={selectedAsset?.name} 
                          onChange={e => selectedAsset && setSelectedAsset({...selectedAsset, name: e.target.value})} 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Category</Label>
                        <Select 
                          value={selectedAsset?.type} 
                          onValueChange={(v) => selectedAsset && setSelectedAsset({...selectedAsset, type: v})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MOCK_INSPECTION_TEMPLATES.map(t => (
                              <SelectItem key={t.id} value={t.assetType}>{t.assetType}</SelectItem>
                            ))}
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Park</Label>
                        <Select 
                          value={selectedAsset?.park} 
                          onValueChange={(v) => selectedAsset && setSelectedAsset({...selectedAsset, park: v})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                             {PARKS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Specific Location</Label>
                        <Input 
                          value={selectedAsset?.location} 
                          onChange={e => selectedAsset && setSelectedAsset({...selectedAsset, location: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Condition</Label>
                      <Select 
                        value={selectedAsset?.condition} 
                        onValueChange={(v: any) => selectedAsset && setSelectedAsset({...selectedAsset, condition: v})}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Poor">Poor</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleUpdateAsset} className="w-full font-bold">Save Asset Changes</Button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <History className="h-4 w-4" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Last Inspected</h4>
                        </div>
                        <p className="text-lg font-bold font-headline">{selectedAsset?.lastInspected}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <ClipboardList className="h-4 w-4" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Asset Type</h4>
                        </div>
                        <p className="text-lg font-bold font-headline">{selectedAsset?.type}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-1">Active Status Summary</h4>
                      <div className="grid gap-3">
                         <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                           <div className="flex items-center gap-3">
                             <CheckCircle2 className="h-5 w-5 text-primary" />
                             <div>
                               <p className="text-sm font-bold">Operational</p>
                               <p className="text-[10px] text-muted-foreground font-medium">Currently safe for public use</p>
                             </div>
                           </div>
                           <Badge className="bg-primary text-white font-bold text-[10px]">VERIFIED</Badge>
                         </div>
                         <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                           <div className="flex items-center gap-3">
                             <Clock className="h-5 w-5 text-accent-foreground" />
                             <div>
                               <p className="text-sm font-bold">Next Service</p>
                               <p className="text-[10px] text-muted-foreground font-medium">Scheduled condition check</p>
                             </div>
                           </div>
                           <span className="text-xs font-bold text-accent-foreground">March 25, 2024</span>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-8">
                <section>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                    <History className="h-3.5 w-3.5" /> Recent Inspections
                  </h4>
                  {assetInspections.length > 0 ? (
                    <div className="space-y-3">
                      {assetInspections.map(insp => (
                        <div key={insp.id} className="p-3 border rounded-md flex items-center justify-between group hover:border-primary/40 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">Condition Check</span>
                            <span className="text-[10px] text-muted-foreground">Due: {insp.dueDate}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {insp.status === 'Completed' ? (
                              <Badge className="bg-green-50 text-green-700 border-green-200 text-[9px] font-bold">PASSED</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] font-bold uppercase">{insp.status}</Badge>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">No inspection history recorded for this asset.</p>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                    <ClipboardList className="h-3.5 w-3.5" /> Maintenance Tasks
                  </h4>
                   {assetTasks.length > 0 ? (
                    <div className="space-y-3">
                      {assetTasks.map(task => (
                        <div key={task.id} className="p-3 border rounded-md group hover:border-accent transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold truncate pr-4">{task.title}</span>
                            <Badge className={`${task.status === 'Done' ? 'bg-primary' : 'bg-accent text-accent-foreground'} text-[8px] font-bold`}>
                              {task.status.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground truncate max-w-[70%]">{task.objective}</span>
                            <span className="text-[9px] font-bold text-muted-foreground">{task.dueDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">No maintenance tasks found.</p>
                  )}
                </section>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

