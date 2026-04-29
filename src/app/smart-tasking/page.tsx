"use client";

import { useState } from "react";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { evaluateAndApplyConditions } from "@/lib/smart-engine";
import { DailyCondition, SmartRule, RuleCondition, Operator } from "@/lib/types";
import { BrainCircuit, Plus, Trash2, Settings2, Activity } from "lucide-react";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function SmartTaskingPage() {
  const { permissions } = useUserContext();
  const { allParks } = useDataContext();
  const { user } = useUser();
  const db = useFirestore();

  // Rules Data
  const rulesQuery = useMemoFirebase(() => db ? query(collection(db, "smart_rules")) : null, [db]);
  const { data: rules = [] } = useCollection<SmartRule>(rulesQuery as any);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Sensor Form State
  const [parkId, setParkId] = useState("");
  const [temperature, setTemperature] = useState<number>(20);
  const [windSpeed, setWindSpeed] = useState<number>(10);
  const [humidity, setHumidity] = useState<number>(50);
  const [footfall, setFootfall] = useState<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');

  // Rule Builder State
  const [isBuildingRule, setIsBuildingRule] = useState(false);
  const [newRule, setNewRule] = useState<SmartRule>({
    name: "",
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
    setIsLoading(true);
    setSuccessMsg("");

    try {
      const condition: DailyCondition = {
        parkId,
        date: new Date().toISOString(),
        temperature,
        windSpeed,
        humidity,
        expectedFootfall: footfall,
        loggedBy: user?.email || "Unknown",
        createdAt: new Date().toISOString(),
      };

      const result = await evaluateAndApplyConditions(condition, user as any, rules);
      setSuccessMsg(result);
      
      setTemperature(20);
      setWindSpeed(10);
      setHumidity(50);
      setFootfall('Medium');
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
      isActive: true,
      conditionLogic: 'AND',
      conditions: [],
      tasksToGenerate: []
    });
  };

  const addCondition = () => {
    setNewRule(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'temperature', operator: '>', value: '' }]
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

  return (
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
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Log Daily Conditions</CardTitle>
                <CardDescription>
                  Enter today's weather and expected footfall. The Smart Engine will evaluate these metrics against your Logic Rules and automatically generate necessary operational tasks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogConditions} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="parkId">Target Park / Depot</Label>
                    <Select value={parkId} onValueChange={setParkId} required>
                      <SelectTrigger id="parkId">
                        <SelectValue placeholder="Select a location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allParks?.map((park: any) => (
                          <SelectItem key={park.id} value={park.name}>{park.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="temp">Temperature (°C)</Label>
                      <Input 
                        id="temp" 
                        type="number" 
                        value={temperature} 
                        onChange={(e) => setTemperature(Number(e.target.value))} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wind">Wind Speed (mph)</Label>
                      <Input 
                        id="wind" 
                        type="number" 
                        value={windSpeed} 
                        onChange={(e) => setWindSpeed(Number(e.target.value))} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="humidity">Humidity (%)</Label>
                      <Input 
                        id="humidity" 
                        type="number" 
                        value={humidity} 
                        onChange={(e) => setHumidity(Number(e.target.value))} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footfall">Expected Footfall</Label>
                      <Select value={footfall} onValueChange={(v: any) => setFootfall(v)} required>
                        <SelectTrigger id="footfall">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading || !parkId}>
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    {isLoading ? "Evaluating Rules..." : "Log Conditions & Generate Tasks"}
                  </Button>

                  {successMsg && (
                    <div className="p-3 bg-green-500/10 text-green-600 border border-green-500/20 rounded-md text-sm text-center font-medium mt-4">
                      {successMsg}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
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
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
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
                              <Badge variant="outline" className="bg-background">{c.field} {c.operator} {c.value}</Badge>
                            </span>
                          ))}
                        </div>
                        <div className="space-y-2 pt-2 border-t text-sm">
                          <span className="font-bold text-accent-foreground mr-2">THEN GENERATE:</span>
                          <ul className="list-disc pl-5 space-y-1">
                            {rule.tasksToGenerate.map((t, i) => (
                              <li key={i} className="text-muted-foreground">
                                <strong>{t.title}</strong> for <Badge className="text-[10px] uppercase bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0 px-1">{t.assignedTo}</Badge>
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
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input placeholder="e.g. Hot & Busy Protocol" value={newRule.name} onChange={e => setNewRule({...newRule, name: e.target.value})} />
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
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 rounded-md border">
                      <Select value={c.field} onValueChange={(v: any) => updateCondition(i, 'field', v)}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="temperature">Temperature</SelectItem>
                          <SelectItem value="windSpeed">Wind Speed</SelectItem>
                          <SelectItem value="humidity">Humidity</SelectItem>
                          <SelectItem value="expectedFootfall">Footfall</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={c.operator} onValueChange={(v: any) => updateCondition(i, 'operator', v)}>
                        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="==">==</SelectItem>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                          <SelectItem value=">=">&gt;=</SelectItem>
                          <SelectItem value="<=">&lt;=</SelectItem>
                        </SelectContent>
                      </Select>
                      {c.field === 'expectedFootfall' ? (
                        <Select value={c.value as string} onValueChange={(v) => updateCondition(i, 'value', v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Level" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input className="flex-1" type="number" placeholder="Value" value={c.value} onChange={e => updateCondition(i, 'value', Number(e.target.value))} />
                      )}
                      <Button variant="ghost" size="icon" onClick={() => removeCondition(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addCondition}><Plus className="h-3 w-3 mr-1" /> Add Condition</Button>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <Label className="text-lg font-headline">Actions (THEN GENERATE TASK)</Label>
                  
                  {newRule.tasksToGenerate.map((t, i) => (
                    <div key={i} className="p-3 bg-accent/5 rounded-md border border-accent/20 space-y-3 relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-destructive" onClick={() => removeTask(i)}><Trash2 className="h-3 w-3" /></Button>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Task Title</Label>
                          <Input placeholder="e.g. Extra Bin Emptying" value={t.title} onChange={e => updateTask(i, 'title', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Assigned Team / Role</Label>
                          <Input placeholder="e.g. Keeper or Bin Run" value={t.assignedTo} onChange={e => updateTask(i, 'assignedTo', e.target.value)} />
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
  );
}
