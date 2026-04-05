
"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Settings2, Leaf } from "lucide-react";
import { useFirestore, useDoc } from "@/firebase";
import { doc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { RegistryConfig } from "@/lib/types";

export default function ParksPage() {
  const { toast } = useToast();
  const db = useFirestore();

  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryConfigRef);

  const parks = useMemo(() => registryConfig?.parks ? [...registryConfig.parks].sort() : [], [registryConfig?.parks]);

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configNewPark, setConfigNewPark] = useState("");
  const [configParks, setConfigParks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isConfigDialogOpen) {
      setConfigParks(parks);
    }
  }, [isConfigDialogOpen, parks]);

  const handleUpdateRegistry = async (field: 'parks', value: string, operation: 'add' | 'remove') => {
    if (!db || isSubmitting) return;

    setIsSubmitting(true);
    const originalParks = [...configParks];

    if (operation === 'add') {
      setConfigParks(current => [...current, value].sort());
      setConfigNewPark("");
    } else {
      setConfigParks(current => current.filter(p => p !== value));
    }

    const registryRef = doc(db, "settings", "registry");
    const updatePayload = {
      [field]: operation === 'add' ? arrayUnion(value) : arrayRemove(value)
    };

    try {
      await setDoc(registryRef, updatePayload, { merge: true });
    } catch (e) {
      toast({ title: "Error updating parks", description: "Your change could not be saved. Please try again.", variant: "destructive" });
      setConfigParks(originalParks);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'settings/registry',
          operation: operation === 'add' ? 'array-union' : 'array-remove',
          requestResourceData: updatePayload,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell
      title="Park Management"
      description="View and manage the list of registered parks."
      actions={
        <Button
          variant="outline"
          className="font-bold"
          onClick={() => setIsConfigDialogOpen(true)}
          disabled={configLoading || isSubmitting}
        >
          <Settings2 className="mr-2 h-4 w-4" /> Manage Park List
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Registered Parks ({parks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading parks...</div>
          ) : parks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {parks.map((park) => (
                <div key={park} className="flex items-center gap-3 p-3 bg-muted/30 border rounded-lg">
                  <Leaf className="h-5 w-5 text-primary"/>
                  <span className="font-semibold">{park}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="font-bold">No parks found</p>
              <p className="text-sm">Click &apos;Manage Park List&apos; to add the first park.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Parks</DialogTitle>
            <DialogDescription>Add or remove parks from the central registry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                value={configNewPark}
                onChange={(e) => setConfigNewPark(e.target.value)}
                placeholder="New Park Name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && configNewPark && !configParks.includes(configNewPark)) {
                    handleUpdateRegistry('parks', configNewPark, 'add');
                  }
                }}
              />
              <Button
                disabled={isSubmitting || !configNewPark || configParks.includes(configNewPark)}
                onClick={() => {
                  if (configNewPark && !configParks.includes(configNewPark)) {
                    handleUpdateRegistry('parks', configNewPark, 'add');
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {configParks.map((park) => (
                <div key={park} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded animate-in fade-in-50">
                  <span className="text-sm">{park}</span>
                  <Button
                    disabled={isSubmitting}
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateRegistry('parks', park, 'remove')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {configParks.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground p-4">No parks configured.</div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
