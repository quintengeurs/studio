"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  Plus, 
  FileText, 
  Info, 
  HandMetal, 
  ExternalLink,
  Users,
  Trash2,
  Clock,
  UserCheck
} from "lucide-react";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { InfoItem, InfoItemType } from "@/lib/types";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { InfoItemModal } from "@/components/modals/info-item-modal";
import { useToast } from "@/hooks/use-toast";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function InfoCornerPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const { profile, permissions } = useUserContext();
  const { allUsers } = useDataContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemForList, setSelectedItemForList] = useState<InfoItem | null>(null);

  const infoQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "info_items"), where("isArchived", "==", false), orderBy("createdAt", "desc"));
  }, [db]);

  const { data: items = [], loading } = useCollection<InfoItem>(infoQuery as any);

  const handleToggleInterest = async (item: InfoItem) => {
    if (!db || !profile) return;
    
    const isInterested = item.interestedUserIds?.includes(profile.id);
    const itemRef = doc(db, "info_items", item.id);

    try {
      await updateDoc(itemRef, {
        interestedUserIds: isInterested ? arrayRemove(profile.id) : arrayUnion(profile.id)
      });
      toast({ 
        title: isInterested ? "Interest Removed" : "Interest Recorded", 
        description: isInterested ? "You are no longer marked as interested." : "Your name has been added to the interest list for follow-up." 
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update interest.", variant: "destructive" });
    }
  };

  const handleArchive = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "info_items", id), { isArchived: true });
      toast({ title: "Item Archived" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to archive item.", variant: "destructive" });
    }
  };

  const getIcon = (type: InfoItemType) => {
    switch (type) {
      case 'Document': return <FileText className="h-4 w-4" />;
      case 'CTA': return <HandMetal className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (type: InfoItemType) => {
    switch (type) {
      case 'Document': return "bg-blue-500/10 text-blue-600 border-blue-200";
      case 'CTA': return "bg-amber-500/10 text-amber-600 border-amber-200";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <DashboardShell
      title="Info Corner"
      description="Stay updated with the latest department news, documents, and opportunities."
      actions={
        permissions.manageInfoCorner && (
          <Button onClick={() => setIsModalOpen(true)} className="font-bold gap-2">
            <Plus className="h-4 w-4" /> Add New Item
          </Button>
        )
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : items.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl opacity-50 bg-muted/20">
            <Megaphone className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-bold font-headline">The corner is empty</h3>
            <p className="text-sm text-muted-foreground mt-1">Check back later for important updates and opportunities.</p>
          </div>
        ) : (
          items.map((item) => {
            const isInterested = item.interestedUserIds?.includes(profile?.id || "");
            const interestedStaff = allUsers.filter(u => item.interestedUserIds?.includes(u.id));

            return (
              <Card key={item.id} className="relative overflow-hidden border-2 hover:border-primary/40 transition-all group flex flex-col items-start h-full">
                <CardHeader className="w-full pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md ${getBadgeColor(item.type)}`}>
                      <div className="flex items-center gap-1.5">
                        {getIcon(item.type)}
                        {item.type}
                      </div>
                    </Badge>
                    {permissions.manageInfoCorner && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleArchive(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Archive Item</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <CardTitle className="font-headline text-xl group-hover:text-primary transition-colors leading-tight">
                    {item.title}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase mt-2">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>By {item.createdBy}</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 w-full pb-6">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                    {item.content}
                  </p>
                </CardContent>

                <CardFooter className="w-full pt-4 border-t bg-muted/5 mt-auto">
                  {item.type === 'Document' && item.url ? (
                    <Button asChild className="w-full gap-2 font-bold uppercase tracking-widest text-xs" variant="outline">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> View Document
                      </a>
                    </Button>
                  ) : item.type === 'CTA' ? (
                    <div className="w-full space-y-3">
                      <Button 
                        onClick={() => handleToggleInterest(item)}
                        variant={isInterested ? "secondary" : "default"}
                        className={`w-full gap-2 font-bold uppercase tracking-widest text-xs shadow-md ${isInterested ? 'bg-green-600/10 text-green-700 hover:bg-green-600/20' : ''}`}
                      >
                        {isInterested ? <UserCheck className="h-3.5 w-3.5" /> : <HandMetal className="h-3.5 w-3.5 text-white" />}
                        {isInterested ? "You are interested" : item.ctaLabel || "I'm interested"}
                      </Button>
                      
                      {permissions.manageInfoCorner && item.interestedUserIds && item.interestedUserIds.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-[10px] font-bold uppercase text-muted-foreground h-7 gap-1.5"
                          onClick={() => setSelectedItemForList(item)}
                        >
                          <Users className="h-3 w-3" /> {item.interestedUserIds.length} Interested Staff
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="h-10 w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      General Information
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      <InfoItemModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      <Dialog open={!!selectedItemForList} onOpenChange={(open) => !open && setSelectedItemForList(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Enthusiasts</DialogTitle>
            <DialogDescription>
              The following staff members have expressed interest in:
              <br/>
              <span className="font-bold text-foreground">"{selectedItemForList?.title}"</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 max-h-[400px] overflow-y-auto py-4">
            {allUsers
              .filter(u => selectedItemForList?.interestedUserIds?.includes(u.id))
              .map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 border rounded-xl bg-muted/10">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-primary/10">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{u.name}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">{u.role || u.roles?.[0]}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold bg-green-500/5 text-green-700 border-green-200">Interested</Badge>
                </div>
              ))}
          </div>
          <Button variant="secondary" className="w-full font-bold uppercase tracking-widest" onClick={() => setSelectedItemForList(null)}>Close</Button>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
