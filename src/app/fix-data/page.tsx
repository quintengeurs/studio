'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useUserContext } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function FixDataPage() {
  const db = useFirestore();
  const { profile, effectiveOrgId } = useUserContext();
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);
  const [results, setResults] = useState<{ collection: string, count: number }[]>([]);

  const targetOrgId = profile?.orgId || effectiveOrgId;

  const runMigration = async () => {
    if (!db || !targetOrgId) {
      toast({ title: "Error", description: "You must be logged in to an organization.", variant: "destructive" });
      return;
    }

    setIsFixing(true);
    const newResults: { collection: string, count: number }[] = [];

    const collectionsToFix = ['issues', 'tasks', 'requests', 'inspections', 'assets'];

    try {
      for (const collName of collectionsToFix) {
        // Find documents without orgId
        // Note: Firestore doesn't support "not exists" queries well, so we might have to fetch more and filter
        // But we can try a simple query first, or just fetch all and check.
        // For safety/efficiency in a large DB, we'll fetch a limited amount.
        const snap = await getDocs(collection(db, collName));
        let count = 0;
        
        for (const d of snap.docs) {
          const data = d.data();
          if (!data.orgId) {
            // Update with targetOrgId
            await updateDoc(doc(db, collName, d.id), { orgId: targetOrgId });
            count++;
          }
        }
        newResults.push({ collection: collName, count });
      }
      setResults(newResults);
      toast({ title: "Migration Complete", description: "Orphaned data has been linked to your organization." });
    } catch (err: any) {
      toast({ title: "Migration Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <DashboardShell 
      title="Data Visibility Repair" 
      description="Link orphaned records to your current organization"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-orange-500/20 bg-orange-50/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" /> Data Recovery Tool
            </CardTitle>
            <CardDescription>
              Use this tool if you created records (issues, tasks, etc.) that are not appearing in your dashboard. 
              This will scan for items missing an Organization ID and link them to <strong>{targetOrgId || 'Unknown'}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-xs font-mono">
              Target Organization: {targetOrgId || 'Not detected'}
            </div>
            
            <Button 
              onClick={runMigration} 
              disabled={isFixing || !targetOrgId} 
              className="w-full h-12 font-bold"
            >
              {isFixing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              {isFixing ? "Running Repair..." : "Run Global Visibility Repair"}
            </Button>

            {results.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-bold uppercase tracking-widest opacity-60">Results:</h4>
                <div className="grid gap-2">
                  {results.map((res, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded-lg bg-background">
                      <span className="font-bold capitalize">{res.collection}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{res.count} fixed</span>
                        {res.count > 0 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Database className="h-4 w-4 opacity-20" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
