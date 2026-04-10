'use client';

import { useState, useEffect } from 'react';
import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, Firestore, initializeFirestore } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Database, Search } from 'lucide-react';

const CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
};

const PROJECT_1 = "studio-4537887383-23869";
const PROJECT_2 = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";
const DB_NAME = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";

interface ProbeResult {
  label: string;
  projectId: string;
  databaseId: string;
  status: 'pending' | 'success' | 'error';
  userCount?: number;
  parkCount?: number;
  error?: string;
  registryFound?: boolean;
}

export default function DebugDataPage() {
  const [results, setResults] = useState<ProbeResult[]>([
    { label: "Profile A (Standard)", projectId: PROJECT_1, databaseId: "(default)", status: 'pending' },
    { label: "Profile B (Named DB)", projectId: PROJECT_1, databaseId: DB_NAME, status: 'pending' },
    { label: "Profile C (UUID Project)", projectId: PROJECT_2, databaseId: "(default)", status: 'pending' },
  ]);
  const [isProbing, setIsProbing] = useState(false);

  const probeSilo = async (res: ProbeResult): Promise<ProbeResult> => {
    let tempApp: FirebaseApp | null = null;
    try {
      const appName = `probe-${res.label.replace(/\s/g, '-')}`;
      
      // Clean up existing probe app if it exists
      const existing = getApps().find(a => a.name === appName);
      if (existing) await deleteApp(existing);

      tempApp = initializeApp({
        ...CONFIG,
        projectId: res.projectId,
      }, appName);

      const db = initializeFirestore(tempApp, {
        experimentalForceLongPolling: true,
      }, res.databaseId);

      // Probe 1: Users collection
      const usersSnap = await getDocs(collection(db, "users"));
      const userCount = usersSnap.size;

      // Probe 2: Registry config
      const registrySnap = await getDoc(doc(db, "settings", "registry"));
      const registryFound = registrySnap.exists();
      const parkCount = registryFound ? (registrySnap.data()?.parks?.length || 0) : 0;

      return { ...res, status: 'success', userCount, parkCount, registryFound };
    } catch (err: any) {
      console.error(`Probe failed for ${res.label}:`, err);
      return { ...res, status: 'error', error: err.message || String(err) };
    } finally {
      // We keep the app around for the duration of the page view or manual cleanup
    }
  };

  const runProbes = async () => {
    setIsProbing(true);
    const updatedResults = [...results];
    
    for (let i = 0; i < updatedResults.length; i++) {
        updatedResults[i] = await probeSilo(updatedResults[i]);
        setResults([...updatedResults]); // Update UI incrementally
    }
    
    setIsProbing(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-3">
            <Search className="h-8 w-8" /> Universal Data Probe
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Identifying the production data silo and connectivity status.</p>
        </div>
        <Button onClick={runProbes} disabled={isProbing} className="font-bold relative overflow-hidden group">
          {isProbing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          {isProbing ? "Probing..." : "Start Global Scan"}
        </Button>
      </div>

      <div className="grid gap-6">
        {results.map((res, i) => (
          <Card key={i} className={`border-2 transition-all ${res.status === 'success' && (res.userCount || 0) > 0 ? 'border-green-500 shadow-lg bg-green-50/10' : 'border-muted'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex flex-col">
                <CardTitle className="text-lg font-bold">{res.label}</CardTitle>
                <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-mono bg-muted p-1 rounded">Project: {res.projectId}</span>
                    <span className="text-[10px] font-mono bg-muted p-1 rounded">DB: {res.databaseId}</span>
                </div>
              </div>
              {res.status === 'pending' && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
              {res.status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
              {res.status === 'error' && <XCircle className="h-6 w-6 text-destructive" />}
            </CardHeader>
            <CardContent>
              {res.status === 'success' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background rounded-xl border shadow-sm flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary">{res.userCount}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff Profiles</span>
                  </div>
                  <div className="p-4 bg-background rounded-xl border shadow-sm flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary">{res.parkCount}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sites (Registry)</span>
                  </div>
                  {res.registryFound === false && (
                    <div className="col-span-2 p-2 bg-yellow-500/10 text-yellow-600 text-[10px] font-bold uppercase tracking-widest text-center rounded border border-yellow-500/20 mt-2">
                      Registry Config Missing (No sites will show in dropdowns)
                    </div>
                  )}
                </div>
              )}
              {res.status === 'error' && (
                <div className="p-4 bg-destructive/5 text-destructive text-xs font-mono rounded-xl border border-destructive/10">
                  {res.error}
                </div>
              )}
              {res.status === 'pending' && (
                <div className="text-center py-8 text-muted-foreground italic text-sm">
                  Ready to scan...
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted/30 p-6 rounded-2xl border text-sm space-y-3">
        <h4 className="font-bold uppercase tracking-widest text-xs opacity-60">System Context</h4>
        <div className="grid gap-2 text-xs">
           <div className="flex justify-between border-b pb-1">
             <span className="text-muted-foreground">Current Environment:</span>
             <span className="font-mono text-primary font-bold">Development (localhost)</span>
           </div>
           <p className="text-[10px] leading-relaxed opacity-70 mt-2">
             This tool probes separate Firebase instances to bypass the default application state and local cache. 
             Use the results above to identify which <code className="font-bold">projectId</code> and <code className="font-bold">databaseId</code> 
             must be configured in <code className="font-bold">src/firebase/config.ts</code> to restore visibility.
           </p>
        </div>
      </div>
    </div>
  );
}
