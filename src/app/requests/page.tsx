
"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  MapPin, 
  User, 
  Clock, 
  CheckCircle2, 
  Archive, 
  Info,
  Truck
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, limit } from "firebase/firestore";
import Image from "next/image";
import { MaterialRequest, User as UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";

export default function RequestsManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const { permissions, loading: userLoading } = useUserContext();
  const { allUsers } = useDataContext();
  const canViewRequests = permissions.viewStaffRequests;

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [managerNote, setManagerNote] = useState("");

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !canViewRequests) return null;
    return query(
      collection(db, "requests"),
      where("status", "!=", "Archived"),
      limit(200)
    );
  }, [db, canViewRequests]);

  const { data: requests = [], loading } = useCollection<MaterialRequest>(requestsQuery as any);

  useEffect(() => {
    if (!loading && !userLoading && !canViewRequests && allUsers.length > 0) {
      router.push("/");
    }
  }, [canViewRequests, loading, userLoading, allUsers.length, router]);

  if (!canViewRequests && allUsers.length > 0) {
      return null; // Will redirect via useEffect
  }

  const handleUpdateStatus = async (id: string, newStatus: string, note?: string) => {
    if (!db) return;
    try {
      const updateData: any = { 
        status: newStatus,
        updatedBy: profile?.name || user?.displayName || user?.email || "Manager",
        updatedAt: new Date().toISOString()
      };
      if (note) updateData.managerNote = note;

      await updateDoc(doc(db, "requests", id), updateData);
      
      if (newStatus === 'Available') {
        toast({ 
          title: "Status Updated", 
          description: "Staff member has been notified that items are ready for collection." 
        });
      } else {
        toast({ title: "Request Archived", description: "Request moved to historical records." });
      }
    } catch (e: any) {
      toast({ 
        title: "Permission Denied", 
        description: "Your account does not have authorization to modify requests on the live database. Setup your Firestore rules to allow this.", 
        variant: "destructive" 
      });
    }
  };

  const handleOpenNoteModal = (id: string) => {
    setSelectedRequestId(id);
    setManagerNote("");
    setNoteModalOpen(true);
  };

  const handleConfirmAvailable = () => {
    if (selectedRequestId) {
      handleUpdateStatus(selectedRequestId, 'Available', managerNote);
      setNoteModalOpen(false);
      setSelectedRequestId(null);
    }
  };

  const activeRequests = requests.filter(r => r.status !== 'Collected');
  const collectedRequests = requests.filter(r => r.status === 'Collected');

  const renderRequestCard = (request: MaterialRequest) => (
    <Card key={request.id} className="flex flex-col border-2 hover:border-primary/40 transition-all">
      <div className={`h-1.5 w-full shrink-0 ${
        request.status === 'Collected' ? 'bg-blue-500' : 
        request.status === 'Available' ? 'bg-green-500' : 
        'bg-primary'
      }`} />
      
      {request.imageUrl && (
        <div className="relative w-full h-48 bg-muted shrink-0">
          <Image 
            src={request.imageUrl} 
            alt={request.category}
            fill
            className="object-cover"
          />
        </div>
      )}

      <CardHeader className="pb-3 px-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">
            {request.category}
          </Badge>
          <Badge className={`${
            request.status === 'Collected' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            request.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' : 
            'bg-primary/10 text-primary border-primary/20'
          } font-bold text-[9px] uppercase`}>
            {request.status === 'Collected' ? 'COLLECTED' : request.status === 'Available' ? 'READY FOR PICKUP' : 'OPEN'}
          </Badge>
        </div>
        <CardTitle className="font-headline text-lg line-clamp-1">
          Request for {request.category}
        </CardTitle>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
          <Clock className="h-3 w-3" />
          <span>Requested {new Date(request.createdAt).toLocaleDateString()}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-6 pb-6">
        <div className="space-y-4">
          <section className="p-3 rounded-lg bg-muted/30 border border-muted/50">
            <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Info className="h-3 w-3" /> Requirement
            </h4>
            <p className="text-sm font-medium leading-relaxed">{request.description}</p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase text-muted-foreground">Requester</span>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold truncate">{request.requestedBy}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase text-muted-foreground">Depot</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold truncate">{request.depot}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-0 border-t flex divide-x mt-auto">
        <Button 
          variant="ghost" 
          className={`flex-1 rounded-none h-12 text-[10px] font-bold uppercase ${request.status === 'Collected' ? 'text-blue-700 opacity-60' : 'hover:bg-green-50 hover:text-green-700'}`}
          onClick={() => handleOpenNoteModal(request.id)}
          disabled={request.status === 'Available' || request.status === 'Collected'}
        >
          <Truck className="mr-2 h-4 w-4" /> 
          {request.status === 'Collected' ? 'Collected' : request.status === 'Available' ? 'Staff Notified' : 'Item Available'}
        </Button>
        <Button 
          variant="ghost" 
          className="flex-1 rounded-none h-12 text-[10px] font-bold uppercase hover:bg-muted/80"
          onClick={() => handleUpdateStatus(request.id, 'Archived')}
        >
          <Archive className="mr-2 h-4 w-4" /> Archive
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <DashboardShell 
      title="Staff Material Requests" 
      description="Review and fulfill requests from operatives in the field"
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Clock className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active">Active Requests ({activeRequests.length})</TabsTrigger>
            <TabsTrigger value="collected">Collected ({collectedRequests.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {activeRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl opacity-60">
                <Package className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="font-bold">No active requests</p>
                <p className="text-xs">All staff resource needs are currently fulfilled.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {activeRequests.map(renderRequestCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="collected">
            {collectedRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl opacity-60">
                <CheckCircle2 className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="font-bold">No collected items</p>
                <p className="text-xs">Items picked up by staff will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {collectedRequests.map(renderRequestCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Item Available</DialogTitle>
            <DialogDescription>
              Notify the staff member that their item is ready for collection. You can optionally add a note.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="e.g. Items are left in the main depot office. The door code is 1234."
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmAvailable}>Confirm & Notify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
