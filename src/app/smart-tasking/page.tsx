"use client";

import { useState } from "react";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { evaluateAndApplyConditions } from "@/lib/smart-engine";
import { DailyCondition } from "@/lib/types";
import { BrainCircuit } from "lucide-react";
import { useUser } from "@/firebase";

export default function SmartTaskingPage() {
  const { permissions } = useUserContext();
  const { parksDetails } = useDataContext();
  const { user } = useUser();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [parkId, setParkId] = useState("");
  const [temperature, setTemperature] = useState<number>(20);
  const [windSpeed, setWindSpeed] = useState<number>(10);
  const [humidity, setHumidity] = useState<number>(50);
  const [footfall, setFootfall] = useState<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');

  if (!permissions.viewSmartTasking) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center h-full">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

      const result = await evaluateAndApplyConditions(condition, user as any);
      setSuccessMsg(result);
      
      // Reset form slightly
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

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <BrainCircuit className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Tasking Engine</h1>
          <p className="text-muted-foreground">Manual condition input for automated task generation.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Daily Conditions</CardTitle>
          <CardDescription>
            Enter today's weather and expected footfall. The Smart Engine will evaluate these metrics and automatically generate necessary operational tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parkId">Target Park / Depot</Label>
              <Select value={parkId} onValueChange={setParkId} required>
                <SelectTrigger id="parkId">
                  <SelectValue placeholder="Select a location..." />
                </SelectTrigger>
                <SelectContent>
                  {parksDetails?.map((park: any) => (
                    <SelectItem key={park.id} value={park.id}>{park.name}</SelectItem>
                  ))}
                  {(!parksDetails || parksDetails.length === 0) && (
                    <SelectItem value="depot-a">Depot A (Fallback)</SelectItem>
                  )}
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
              {isLoading ? "Evaluating Rules..." : "Log Conditions & Generate Tasks"}
            </Button>

            {successMsg && (
              <div className="p-3 bg-green-500/10 text-green-600 border border-green-500/20 rounded-md text-sm text-center font-medium">
                {successMsg}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
