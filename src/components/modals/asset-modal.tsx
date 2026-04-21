"use client";

import { useState, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, X, PlusCircle } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useDataContext } from "@/context/DataContext";
import { format } from "date-fns";
import { Frequency } from "@/lib/types";

interface AssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetModal({ open, onOpenChange }: AssetModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { allParks, registryConfig } = useDataContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parks = useMemo(() => {
    const list = registryConfig?.parks || allParks.map(p => p.name);
    return Array.from(new Set(list)).sort();
  }, [allParks, registryConfig]);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    park: '',
    location: '',
    condition: 'Excellent' as 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical',
    expectedLifespan: '',
    setupInspection: false,
    inspectionFrequency: 'Monthly' as Frequency,
    inspectionStartDate: format(new Date(), 'yyyy-MM-dd'),
    inspectionNotes: '',
    customChecks: [] as string[],
    gpsLocation: null as { latitude: number, longitude: number } | null
  });

  const [newCustomCheck, setNewCustomCheck] = useState("");

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not Supported", description: "Geolocation is not supported.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          gpsLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }));
        toast({ title: "Location Captured" });
      },
      () => {
        toast({ title: "Location Error", description: "Check permissions.", variant: "destructive" });
      }
    );
  };

  const handleAddCustomCheck = () => {
    if (!newCustomCheck.trim()) return;
    setFormData(prev => ({
      ...prev,
      customChecks: [...prev.customChecks, newCustomCheck.trim()]
    }));
    setNewCustomCheck("");
  };

  const removeCustomCheck = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customChecks: prev.customChecks.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const assetData = {
        name: formData.name,
        type: formData.type,
        park: formData.park,
        location: formData.location,
        condition: formData.condition,
        expectedLifespan: formData.expectedLifespan,
        isArchived: false,
        lastInspected: 'Never',
        gpsLocation: formData.gpsLocation,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "assets"), assetData);

      if (formData.setupInspection) {
        const baseChecklist = [
          { item: "General Structural Integrity", status: 'N/A' as const, notes: '' },
          { item: "Cleanliness and Hygiene", status: 'N/A' as const, notes: '' },
          { item: "Safe for Public Use", status: 'N/A' as const, notes: '' }
        ];
        
        const customChecklist = formData.customChecks.map(item => ({
          item, status: 'N/A' as const, notes: ''
        }));

        await addDoc(collection(db, "inspections"), {
          assetId: docRef.id,
          assetName: assetData.name,
          park: assetData.park,
          status: 'Pending',
          dueDate: formData.inspectionStartDate,
          frequency: formData.inspectionFrequency,
          assetNotes: formData.inspectionNotes,
          checklist: [...baseChecklist, ...customChecklist],
          createdAt: new Date().toISOString()
        });
      }

      toast({ title: "Asset Added", description: `${formData.name} registered successfully.` });
      setFormData({
        name: '', type: '', park: '', location: '', condition: 'Excellent',
        expectedLifespan: '', setupInspection: false, inspectionFrequency: 'Monthly',
        inspectionStartDate: format(new Date(), 'yyyy-MM-dd'), inspectionNotes: '',
        customChecks: [], gpsLocation: null
      });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: "Failed to add asset.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <PlusCircle className="h-6 w-6 text-primary" /> Register New Asset
          </DialogTitle>
          <DialogDescription>Add infrastructure or high-value items to the park inventory.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Asset Name</Label>
              <Input placeholder="e.g. Victorian Fountain" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Type / Category</Label>
              <Input placeholder="e.g. Water Feature" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Park</Label>
              <Select value={formData.park} onValueChange={v => setFormData({...formData, park: v})}>
                <SelectTrigger><SelectValue placeholder="Select Park" /></SelectTrigger>
                <SelectContent>
                  {parks.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Fixed Location</Label>
              <Input placeholder="e.g. Near Rose Garden" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Condition</Label>
                <Select value={formData.condition} onValueChange={(v: any) => setFormData({...formData, condition: v})}>
                  <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">GPS Capture</Label>
                <Button variant="outline" className="w-full gap-2 border-dashed border-2" onClick={handleGetLocation}>
                  <MapPin className={formData.gpsLocation ? "text-primary" : "text-muted-foreground"} size={16} />
                  <span className="text-xs">{formData.gpsLocation ? "Coordinates Captured" : "Capture GPS"}</span>
                </Button>
             </div>
          </div>

          <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="setup-inspection" checked={formData.setupInspection} onCheckedChange={(v) => setFormData({...formData, setupInspection: !!v})} />
              <Label htmlFor="setup-inspection" className="font-bold">Setup Periodic Safety Inspection Regime</Label>
            </div>

            {formData.setupInspection && (
              <div className="space-y-4 pt-2 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Frequency</Label>
                      <Select value={formData.inspectionFrequency} onValueChange={(v: any) => setFormData({...formData, inspectionFrequency: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">First Inspection Date</Label>
                      <Input type="date" value={formData.inspectionStartDate} onChange={e => setFormData({...formData, inspectionStartDate: e.target.value})} />
                   </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Custom Checks (Additional to Standard Safety)</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Add specific check item..." value={newCustomCheck} onChange={e => setNewCustomCheck(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomCheck()} />
                    <Button type="button" size="icon" onClick={handleAddCustomCheck}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.customChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-1 bg-background border px-2 py-1 rounded text-xs">
                        {check}
                        <button onClick={() => removeCustomCheck(i)} className="text-muted-foreground hover:text-destructive"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            className="w-full font-bold h-12 uppercase tracking-widest"
            disabled={!formData.name || !formData.park || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Adding Asset..." : "Register Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
