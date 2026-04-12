
"use client";

import { useMemo } from "react";
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, limit } from "firebase/firestore";
import Image from "next/image";
import { MaterialRequest, User as UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequestsManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  // Optimized: Targeted current user lookup
  const userProfileQuery = useMemoFirebase(() => 
    db && user?.email ? query(collection(db, "users"), where("email", "==", user.email)) : null,
  [db, user?.email]);
  const { data: profileResults = [] } = useCollection<UserProfile>(userProfileQuery as any);
  const currentUserProfile = profileResults[0];

  const allUsers = profileResults; // Keep variable for compatibility where count is checked

  const profileRoles = currentUserProfile?.roles || (currentUserProfile?.role ? [currentUserProfile.role] : []);
  const isAdmin = profileRoles.includes('Admin') || user?.email === 'quinten.geurs@gmail.com';
  const canViewRequests = isAdmin || profileRoles.includes('Area Manager') || profileRoles.includes('Operations Manager');

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
    if (!loading && !canViewRequests && allUsers.length > 0) {
      router.push("/");
    }
  }, [canViewRequests, loading, allUsers.length, router]);

  if (!canViewRequests && allUsers.length > 0) {
      return null; // Will redirect via useEffect
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "requests", id), { status: newStatus });
      
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

  return (
    <DashboardShell 
      title="Staff Material Requests" 
      description="Review and fulfill requests from operatives in the field"
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Clock className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl opacity-60">
          <Package className="h-12 w-12 mb-4 text-muted-foreground" />
          <p className="font-bold">No active requests</p>
          <p className="text-xs">All staff resource needs are currently fulfilled.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
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
                  onClick={() => handleUpdateStatus(request.id, 'Available')}
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
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
