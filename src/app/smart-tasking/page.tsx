"use client";

import { useState, useMemo } from "react";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { evaluateAndApplyConditions } from "@/lib/smart-engine";
import { DailyCondition, SmartRule, RuleCondition, Operator } from "@/lib/types";
import { 
  BrainCircuit, 
  Plus, 
  Trash2, 
  Settings2, 
  Activity, 
  Sun, 
  Cloud, 
  CloudRain, 
  Wind, 
  AlertTriangle, 
  Snowflake, 
  Users, 
  UserMinus, 
  Calendar, 
  Building2, 
  MapPin, 
  Check,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PALETTE_CONDITIONS = [
  { id: 'sunny', label: 'Sunny', icon: Sun, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'cloudy', label: 'Cloudy', icon: Cloud, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { id: 'rain', label: 'Rain', icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-600/10', border: 'border-blue-600/20' },
  { id: 'windy', label: 'Windy', icon: Wind, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  { id: 'very_windy', label: 'Very Windy', icon: Wind, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { id: 'yellow_warning', label: 'Yellow Warning', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { id: 'frosty', label: 'Frosty', icon: Snowflake, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
  { id: 'busy', label: 'Busy', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'quiet', label: 'Quiet', icon: UserMinus, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' },
  { id: 'event', label: 'Event', icon: Calendar, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
];

const RULE_TEMPLATES: Partial<SmartRule>[] = [
  {
    name: "High Heat Protocol",
    category: "Operational",
    conditionLogic: 'AND',
    conditions: [{ field: 'tags', operator: 'contains', value: 'sunny' }],
    tasksToGenerate: [
      { title: "Watering - Zone A", objective: "Prioritize watering for newly planted trees.", assignedTo: "Gardener", displayTime: "08:30" },
      { title: "Refill Water Stations", objective: "Ensure all staff hydration points are full.", assignedTo: "Keeper", displayTime: "11:00" }
    ]
  },
  {
    name: "Post-Event Cleanup",
    category: "Operational",
    conditionLogic: 'AND',
    conditions: [{ field: 'tags', operator: 'contains', value: 'event' }],
    tasksToGenerate: [
      { title: "Litter Patrol - Event Site", objective: "Detailed sweep of the event footprint.", assignedTo: "Litter Picker", displayTime: "07:00" },
      { title: "Bin Reset", objective: "Empty and wash all event bins.", assignedTo: "Bin Run", displayTime: "09:00" }
    ]
  },
  {
    name: "Biodiversity Survey",
    category: "Biodiversity",
    conditionLogic: 'AND',
    conditions: [{ field: 'tags', operator: 'contains', value: 'sunny' }],
    tasksToGenerate: [
      { title: "Meadow Monitoring", objective: "Log species diversity in Meadow Zone 1.", assignedTo: "Biodiversity Manager", displayTime: "10:00" }
    ]
  },
  {
    name: "Public Volunteering Opportunity",
    category: "Volunteer",
    conditionLogic: 'AND',
    conditions: [{ field: 'tags', operator: 'contains', value: 'busy' }],
    tasksToGenerate: [
      { title: "Volunteer Litter Pick", objective: "Supervise volunteer group at main hub.", assignedTo: "Volunteering Coordinator", displayTime: "13:00" }
    ]
  }
];

const CATEGORY_CONFIG = {
  Operational: { icon: Settings2, color: "text-blue-500", bg: "bg-blue-500/10" },
  Biodiversity: { icon: Sparkles, color: "text-green-500", bg: "bg-green-500/10" },
  ESG: { icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
  Volunteer: { icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" },
};

export default function SmartTaskingPage() {
  const { permissions } = useUserContext();
  const { allParks, registryConfig } = useDataContext();
  const { user } = useUser();
  const db = useFirestore();

  // Rules Data
  const rulesQuery = useMemoFirebase(() => db ? query(collection(db, "smart_rules")) : null, [db]);
  const { data: rules = [] } = useCollection<SmartRule>(rulesQuery as any);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Sensor Form State (Redesigned)
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  const [selectedParks, setSelectedParks] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Optional numeric fields (kept for engine compatibility)
  const [temperature, setTemperature] = useState<number | "">(20);
  const [windSpeed, setWindSpeed] = useState<number | "">(10);

  const depots = useMemo(() => registryConfig?.teams || [], [registryConfig?.teams]);
  const filteredParks = useMemo(() => {
    if (!selectedDepot) return [];
    return allParks.filter(p => p.depot === selectedDepot);
  }, [allParks, selectedDepot]);

  // Rule Builder State
  const [isBuildingRule, setIsBuildingRule] = useState(false);
  const [newRule, setNewRule] = useState<SmartRule>({
    name: "",
    category: "Operational",
    isActive: true,
    conditionLogic: 'AND',
    conditions: [],
    tasksToGenerate: []
  });

  if (!permissions.viewSmartTasking) {
    return (
      <DashboardShell title="Access Denied" description="">
        <div className="p-4 md:p-8 flex items-center justify-center h-full">
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </DashboardShell>
    );
  }

  const handleLogConditions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParks.length === 0) return;
    
    setIsLoading(true);
    setSuccessMsg("");

    try {
      let totalTasks = 0;
      for (const parkName of selectedParks) {
        const condition: DailyCondition = {
          parkId: parkName,
          date: new Date().toISOString(),
          temperature: temperature === "" ? undefined : temperature,
          windSpeed: windSpeed === "" ? undefined : windSpeed,
          tags: selectedTags,
          loggedBy: user?.email || "Unknown",
          createdAt: new Date().toISOString(),
        };

        const result = await evaluateAndApplyConditions(condition, user as any, rules);
        // Result is like "Logged successfully. Generated X smart tasks."
        const match = result.match(/\d+/);
        if (match) totalTasks += parseInt(match[0]);
      }
      
      setSuccessMsg(`Logged for ${selectedParks.length} sites. Total smart tasks generated: ${totalTasks}`);
      
      // Reset
      setSelectedParks([]);
      setSelectedTags([]);
      setTemperature(20);
      setWindSpeed(10);
    } catch (error) {
      console.error("Failed to log conditions:", error);
      setSuccessMsg("Error logging conditions. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRuleActive = async (rule: SmartRule) => {
    if (!db || !rule.id) return;
    await updateDoc(doc(db, "smart_rules", rule.id), { isActive: !rule.isActive });
  };

  const deleteRule = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "smart_rules", id));
  };

  const handleSaveRule = async () => {
    if (!db || !newRule.name || newRule.conditions.length === 0 || newRule.tasksToGenerate.length === 0) return;
    
    await addDoc(collection(db, "smart_rules"), {
      ...newRule,
      createdAt: new Date().toISOString()
    });

    setIsBuildingRule(false);
    setNewRule({
      name: "",
      category: "Operational",
      isActive: true,
      conditionLogic: 'AND',
      conditions: [],
      tasksToGenerate: []
    });
  };

  const applyTemplate = (template: Partial<SmartRule>) => {
    setNewRule({
      ...newRule,
      ...template,
      isActive: true,
      conditions: [...(template.conditions || [])],
      tasksToGenerate: [...(template.tasksToGenerate || [])]
    });
  };

  const addCondition = () => {
    setNewRule(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'tags', operator: 'contains', value: 'rain' }]
    }));
  };

  const updateCondition = (index: number, field: any, value: any) => {
    const updated = [...newRule.conditions];
    updated[index] = { ...updated[index], [field]: value };
    setNewRule(prev => ({ ...prev, conditions: updated }));
  };

  const removeCondition = (index: number) => {
    const updated = [...newRule.conditions];
    updated.splice(index, 1);
    setNewRule(prev => ({ ...prev, conditions: updated }));
  };

  const addTask = () => {
    setNewRule(prev => ({
      ...prev,
      tasksToGenerate: [...prev.tasksToGenerate, { title: '', objective: '', assignedTo: 'Gardener' }]
    }));
  };

  const updateTask = (index: number, field: any, value: any) => {
    const updated = [...newRule.tasksToGenerate];
    updated[index] = { ...updated[index], [field]: value };
    setNewRule(prev => ({ ...prev, tasksToGenerate: updated }));
  };

  const removeTask = (index: number) => {
    const updated = [...newRule.tasksToGenerate];
    updated.splice(index, 1);
    setNewRule(prev => ({ ...prev, tasksToGenerate: updated }));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const togglePark = (parkName: string) => {
    setSelectedParks(prev => 
      prev.includes(parkName) ? prev.filter(p => p !== parkName) : [...prev, parkName]
    );
  };

  return (
    <TooltipProvider>
      <DashboardShell 
        title="Smart Tasking Engine" 
        description="Automate tasks based on environmental conditions."
      >
        <Tabs defaultValue="sensor" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="sensor" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Virtual Sensor
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Logic Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sensor">
            <div className="grid gap-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold font-headline tracking-tight">Condition Palette</h2>
                <p className="text-muted-foreground text-sm max-w-2xl">
                  Select your hub, target sites, and current conditions. The Smart Engine will instantly evaluate your Logic Rules and generate tasks where needed.
                </p>
              </div>

              <div className="space-y-10">
                {/* Step 1: Depot Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px]">1</span>
                    Select Depot Hub
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {depots.map(depot => (
                      <button
                        key={depot}
                        onClick={() => {
                          setSelectedDepot(depot);
                          setSelectedParks([]);
                        }}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group",
                          selectedDepot === depot 
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10" 
                            : "border-muted hover:border-primary/20 bg-background"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                          selectedDepot === depot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <Building2 className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-center leading-tight">{depot}</span>
                        {selectedDepot === depot && <Check className="h-3 w-3 text-primary absolute top-2 right-2" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Park Selection */}
                {selectedDepot && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px]">2</span>
                        Select Parks ({selectedParks.length} selected)
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] uppercase font-bold tracking-widest h-6 px-2"
                        onClick={() => setSelectedParks(selectedParks.length === filteredParks.length ? [] : filteredParks.map(p => p.name))}
                      >
                        {selectedParks.length === filteredParks.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {filteredParks.map(park => (
                        <button
                          key={park.id}
                          onClick={() => togglePark(park.name)}
                          className={cn(
                            "p-3 rounded-xl border transition-all flex items-center gap-3 relative overflow-hidden",
                            selectedParks.includes(park.name)
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-muted hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            selectedParks.includes(park.name) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <MapPin className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-bold text-left leading-tight truncate">{park.name}</span>
                          {selectedParks.includes(park.name) && (
                            <div className="absolute top-0 right-0 h-4 w-4 bg-primary flex items-center justify-center rounded-bl-lg">
                              <Check className="h-2 w-2 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Condition Palette */}
                {selectedParks.length > 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px]">3</span>
                      Select Current Conditions
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {PALETTE_CONDITIONS.map(cond => (
                        <button
                          key={cond.id}
                          onClick={() => toggleTag(cond.id)}
                          className={cn(
                            "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all relative group",
                            selectedTags.includes(cond.id)
                              ? "border-primary bg-background shadow-lg shadow-primary/5 -translate-y-1"
                              : "border-muted bg-muted/5 hover:bg-background hover:border-primary/20"
                          )}
                        >
                          <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                            selectedTags.includes(cond.id) ? cond.bg : "bg-muted/50 group-hover:bg-muted"
                          )}>
                            <cond.icon className={cn("h-6 w-6", selectedTags.includes(cond.id) ? cond.color : "text-muted-foreground")} />
                          </div>
                          <span className={cn(
                            "text-xs font-bold transition-colors",
                            selectedTags.includes(cond.id) ? "text-primary" : "text-muted-foreground"
                          )}>{cond.label}</span>
                          
                          {selectedTags.includes(cond.id) && (
                            <div className="absolute top-2 right-2">
                               <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="h-2 w-2 text-primary-foreground" />
                               </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Optional Numeric Detail */}
                    <div className="pt-6 border-t">
                      <div className="flex items-center gap-2 mb-4">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Optional Metrics</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4 max-w-sm">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Temperature (°C)</Label>
                          <Input 
                            type="number" 
                            value={temperature} 
                            onChange={(e) => setTemperature(e.target.value === "" ? "" : Number(e.target.value))} 
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Wind Speed (mph)</Label>
                          <Input 
                            type="number" 
                            value={windSpeed} 
                            onChange={(e) => setWindSpeed(e.target.value === "" ? "" : Number(e.target.value))} 
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8">
                      <Button 
                        onClick={handleLogConditions} 
                        className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 group relative overflow-hidden" 
                        disabled={isLoading || selectedParks.length === 0}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="flex items-center justify-center gap-3 relative z-10">
                          {isLoading ? (
                             <Sparkles className="h-5 w-5 animate-pulse" />
                          ) : (
                             <BrainCircuit className="h-5 w-5" />
                          )}
                          {isLoading ? "Running Smart Engine..." : `Log & Apply to ${selectedParks.length} Sites`}
                        </div>
                      </Button>
                    </div>

                    {successMsg && (
                      <div className="p-4 bg-green-500/10 text-green-600 border border-green-500/20 rounded-2xl text-sm text-center font-bold animate-in zoom-in-95 duration-200">
                        {successMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules">
            {!isBuildingRule ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Active Engine Rules</h3>
                  <Button onClick={() => setIsBuildingRule(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Rule
                  </Button>
                </div>

                {rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                    <BrainCircuit className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-bold">No rules configured yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {rules.map(rule => (
                      <Card key={rule.id} className={!rule.isActive ? 'opacity-60' : ''}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {rule.category && (
                                <Badge variant="secondary" className={cn("text-[9px] uppercase font-bold", CATEGORY_CONFIG[rule.category].bg, CATEGORY_CONFIG[rule.category].color)}>
                                  {rule.category}
                                </Badge>
                              )}
                              <CardTitle className="text-lg">{rule.name}</CardTitle>
                            </div>
                          </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={rule.isActive} onCheckedChange={() => toggleRuleActive(rule)} />
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => deleteRule(rule.id!)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-muted/30 p-3 rounded-lg border text-sm">
                            <span className="font-bold text-primary mr-2">IF</span>
                            {rule.conditions.map((c, i) => (
                              <span key={i}>
                                {i > 0 && <span className="font-bold text-primary mx-2">{rule.conditionLogic}</span>}
                                <Badge variant="outline" className="bg-background">
                                  {c.field} {c.operator === 'contains' ? 'HAS' : c.operator} {c.value}
                                </Badge>
                              </span>
                            ))}
                          </div>
                          <div className="space-y-2 pt-2 border-t text-sm">
                            <span className="font-bold text-accent-foreground mr-2">THEN GENERATE:</span>
                            <ul className="list-disc pl-5 space-y-1">
                              {rule.tasksToGenerate.map((t, i) => (
                                <li key={i} className="text-muted-foreground">
                                  <strong>{t.title}</strong> {t.displayTime && <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 ml-1">{t.displayTime}</Badge>} for <Badge className="text-[10px] uppercase bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0 px-1">{t.assignedTo}</Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card className="max-w-3xl">
                <CardHeader>
                  <CardTitle>Create Smart Rule</CardTitle>
                  <CardDescription>Define environmental conditions and the tasks they should trigger.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rule Name</Label>
                      <Input placeholder="e.g. Hot & Busy Protocol" value={newRule.name} onChange={e => setNewRule({...newRule, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Strategy Category</Label>
                      <Select value={newRule.category} onValueChange={(v: any) => setNewRule({...newRule, category: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Operational">Operational</SelectItem>
                          <SelectItem value="Biodiversity">Biodiversity</SelectItem>
                          <SelectItem value="ESG">ESG / Carbon</SelectItem>
                          <SelectItem value="Volunteer">Volunteer / Community</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Start with a Template</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {RULE_TEMPLATES.map((t, idx) => (
                        <Button 
                          key={idx} 
                          variant="outline" 
                          size="sm" 
                          className="text-[10px] h-auto py-2 flex flex-col items-center gap-1 hover:border-primary hover:bg-primary/5"
                          onClick={() => applyTemplate(t)}
                        >
                          {t.category && CATEGORY_CONFIG[t.category as keyof typeof CATEGORY_CONFIG] && (
                            <div className={cn("p-1 rounded-full", CATEGORY_CONFIG[t.category as keyof typeof CATEGORY_CONFIG].bg)}>
                              {(() => {
                                const Icon = CATEGORY_CONFIG[t.category as keyof typeof CATEGORY_CONFIG].icon;
                                return <Icon className={cn("h-3 w-3", CATEGORY_CONFIG[t.category as keyof typeof CATEGORY_CONFIG].color)} />;
                              })()}
                            </div>
                          )}
                          <span className="text-center font-bold leading-tight">{t.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-headline">Conditions (IF)</Label>
                      <Select value={newRule.conditionLogic} onValueChange={(v: any) => setNewRule({...newRule, conditionLogic: v})}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">Match ALL</SelectItem>
                          <SelectItem value="OR">Match ANY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {newRule.conditions.map((c, i) => (
                      <div key={i} className="flex flex-col gap-3 p-3 bg-muted/20 rounded-xl border">
                        <div className="flex items-center gap-2">
                          <Select value={c.field} onValueChange={(v: any) => updateCondition(i, 'field', v)}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tags">Condition (Palette)</SelectItem>
                              <SelectItem value="temperature">Temperature</SelectItem>
                              <SelectItem value="windSpeed">Wind Speed</SelectItem>
                              <SelectItem value="humidity">Humidity</SelectItem>
                              <SelectItem value="expectedFootfall">Footfall (Legacy)</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select value={c.operator} onValueChange={(v: any) => updateCondition(i, 'operator', v)}>
                            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {c.field === 'tags' ? (
                                <SelectItem value="contains">Has Tag</SelectItem>
                              ) : (
                                <>
                                  <SelectItem value="==">==</SelectItem>
                                  <SelectItem value=">">&gt;</SelectItem>
                                  <SelectItem value="<">&lt;</SelectItem>
                                  <SelectItem value=">=">&gt;=</SelectItem>
                                  <SelectItem value="<=">&lt;=</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>

                          <div className="flex-1">
                            {c.field === 'tags' ? (
                              <div className="flex flex-wrap gap-2 p-2 bg-background rounded-lg border">
                                {PALETTE_CONDITIONS.map(p => (
                                  <Tooltip key={p.id}>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => updateCondition(i, 'value', p.id)}
                                        className={cn(
                                          "h-9 w-9 rounded-md flex items-center justify-center transition-all border",
                                          c.value === p.id 
                                            ? cn("ring-2 ring-primary ring-offset-1 border-primary", p.bg, p.color) 
                                            : "bg-muted/30 border-transparent hover:bg-muted text-muted-foreground"
                                        )}
                                      >
                                        <p.icon className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-[10px] font-bold uppercase">{p.label}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                            ) : c.field === 'expectedFootfall' ? (
                              <Select value={c.value as string} onValueChange={(v) => updateCondition(i, 'value', v)}>
                                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Low">Low</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="High">High</SelectItem>
                                  <SelectItem value="Emergency">Emergency</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input type="number" placeholder="Value" value={c.value} onChange={e => updateCondition(i, 'value', Number(e.target.value))} />
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeCondition(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addCondition}><Plus className="h-3 w-3 mr-1" /> Add Condition</Button>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <Label className="text-lg font-headline">Actions (THEN GENERATE TASK)</Label>
                    
                    {newRule.tasksToGenerate.map((t, i) => (
                      <div key={i} className="p-3 bg-accent/5 rounded-md border border-accent/20 space-y-3 relative">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-destructive" onClick={() => removeTask(i)}><Trash2 className="h-3 w-3" /></Button>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Task Title</Label>
                            <Input placeholder="e.g. Extra Bin Emptying" value={t.title} onChange={e => updateTask(i, 'title', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Assigned Team / Role</Label>
                            <Input placeholder="e.g. Keeper" value={t.assignedTo} onChange={e => updateTask(i, 'assignedTo', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Display Time (Optional)</Label>
                            <Input type="time" value={t.displayTime || ""} onChange={e => updateTask(i, 'displayTime', e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Task Objective</Label>
                          <Input placeholder="What exactly needs to be done?" value={t.objective} onChange={e => updateTask(i, 'objective', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addTask} className="text-accent-foreground border-accent-foreground/20"><Plus className="h-3 w-3 mr-1" /> Add Task Action</Button>
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t p-4">
                  <Button variant="ghost" onClick={() => setIsBuildingRule(false)}>Cancel</Button>
                  <Button onClick={handleSaveRule} disabled={!newRule.name || newRule.conditions.length === 0 || newRule.tasksToGenerate.length === 0}>
                    Save Logic Rule
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DashboardShell>
    </TooltipProvider>
  );
}
