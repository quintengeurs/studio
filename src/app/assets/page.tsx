
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
  ClipboardList
} from "lucide-react";
import { MOCK_ASSETS, MOCK_INSPECTION_TEMPLATES } from "@/lib/mock-data";
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

const PARKS = Array.from(new Set(MOCK_ASSETS.map(a => a.park))).sort();

export default function AssetRegister() {
  const [assets, setAssets] = useState(MOCK_ASSETS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    const asset = {
      ...newAsset,
      id: `a${Date.now()}`,
      lastInspected: 'New'
    };
    // @ts-ignore
    setAssets([...assets, asset]);
    setIsDialogOpen(false);
    setNewAsset({ name: '', type: '', park: '', location: '', condition: 'Excellent', setupInspection: false, setupTask: false });
  };

  return (
    <DashboardShell 
      title="Asset Register" 
      description="Comprehensive inventory of Hackney parks infrastructure"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <TableRow key={asset.id} className="hover:bg-accent/5 transition-colors">
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
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </DashboardShell>
  );
}
