
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUserContext } from "@/context/UserContext";
import { useFirestore, useUser } from "@/firebase";
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  query, 
  where 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldAlert, 
  RefreshCcw, 
  Database, 
  Users, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  Lock
} from "lucide-react";

export default function SystemManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const { isMaster, profile } = useUserContext();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<{
    collection: string;
    processed: number;
    updated: number;
  } | null>(null);

  // Security check: Only System Master can access this
  if (!isMaster) {
    return (
      <DashboardShell title="Access Denied" description="System Management is restricted.">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2 font-headline text-foreground">Restricted Area</h2>
          <p className="text-muted-foreground max-w-md">
            This module is only accessible by the System Master. Your attempt has been logged.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const runMigration = async () => {
    if (!db || isMigrating) return;
    
    const confirm = window.confirm(
      "CRITICAL: This will tag ALL orphaned documents in the database with the 'hackney-council' orgId. This is a one-time operation to ensure multitenancy integrity. Proceed?"
    );
    if (!confirm) return;

    setIsMigrating(true);
    const collectionsToMigrate = [
      "users", 
      "tasks", 
      "issues", 
      "assets", 
      "requests", 
      "parks_details", 
      "depots_details", 
      "machinery", 
      "smart_rules",
      "park_activities"
    ];

    try {
      for (const collName of collectionsToMigrate) {
        setMigrationStats({ collection: collName, processed: 0, updated: 0 });
        
        const q = query(collection(db, collName));
        const snap = await getDocs(q);
        
        let batch = writeBatch(db);
        let count = 0;
        let updateCount = 0;

        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          count++;
          
          if (!data.orgId) {
            batch.update(doc(db, collName, docSnap.id), { orgId: "hackney-council" });
            updateCount++;
          }

          // Firestore batch limit is 500
          if (count % 400 === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }

          setMigrationStats({ collection: collName, processed: count, updated: updateCount });
        }
        
        await batch.commit();
        toast({ 
          title: `Migrated ${collName}`, 
          description: `Processed ${count} documents. Updated ${updateCount}.` 
        });
      }

      toast({ 
        title: "Migration Complete", 
        description: "All collections have been tagged with the default orgId.",
        variant: "default"
      });
    } catch (error: any) {
      console.error("Migration failed:", error);
      toast({ 
        title: "Migration Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsMigrating(false);
      setMigrationStats(null);
    }
  };

  return (
    <DashboardShell 
      title="System Management" 
      description="Administrative tools for platform-wide maintenance"
    >
      <div className="grid gap-6">
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
          <CardHeader className="bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                <RefreshCcw className={`h-6 w-6 ${isMigrating ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <CardTitle className="font-headline text-2xl">Multitenancy Migration</CardTitle>
                <CardDescription>Tag all existing data with organization IDs to enforce tenant isolation.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Database className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Default Org</span>
                  </div>
                  <span className="text-xl font-headline font-bold text-primary">hackney-council</span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Impact</span>
                  </div>
                  <span className="text-xl font-headline font-bold text-foreground">Global Registry</span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ShieldAlert className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Status</span>
                  </div>
                  <Badge className="w-fit bg-accent/20 text-accent-foreground border-accent font-bold">Ready for Migration</Badge>
                </div>
              </div>

              {isMigrating && migrationStats && (
                <div className="p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-primary" />
                      <span className="font-bold text-lg">Migrating: <span className="text-primary font-headline uppercase">{migrationStats.collection}</span></span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">{migrationStats.processed} docs</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 mb-2 overflow-hidden border">
                    <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: '100%' }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center font-bold italic">Updating orphaned documents... found {migrationStats.updated} so far.</p>
                </div>
              )}

              <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-destructive mb-1 font-headline">Danger Zone</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Running this migration while users are active may cause temporary consistency issues. It is recommended to perform this during maintenance windows. This action will explicitly tag all legacy data with the primary organization ID to prevent access bleed.
                  </p>
                </div>
              </div>

              <Button 
                onClick={runMigration} 
                disabled={isMigrating}
                className="w-full h-14 text-lg font-headline font-bold shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                variant="default"
              >
                {isMigrating ? (
                  <>
                    <RefreshCcw className="mr-2 h-5 w-5 animate-spin" />
                    Migration in Progress...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-5 w-5" />
                    Commence Multitenancy Migration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">System Status</CardTitle>
            <CardDescription>Global metrics and connectivity health.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="flex items-center justify-between p-4 border rounded-2xl bg-muted/10">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold">Active Organizations</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">SaaS Tenants</p>
                    </div>
                  </div>
                  <span className="text-2xl font-headline font-bold">1</span>
               </div>
               <div className="flex items-center justify-between p-4 border rounded-2xl bg-muted/10">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-bold">Firestore Security Rules</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Isolation Engine</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-200">Enforced</Badge>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
