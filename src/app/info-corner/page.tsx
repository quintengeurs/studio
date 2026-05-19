"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  UserCheck,
  Pencil,
  Mail,
  Home,
  Heart,
  Sliders,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles
} from "lucide-react";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { InfoItem, InfoItemType } from "@/lib/types";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
const InfoItemModal = dynamic(() => import("@/components/modals/info-item-modal").then(mod => mod.InfoItemModal), { ssr: false });
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
  const { profile, permissions, effectiveOrgId, organization } = useUserContext();
  const { allUsers } = useDataContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InfoItem | null>(null);
  const [selectedItemForList, setSelectedItemForList] = useState<InfoItem | null>(null);

  // Engagement settings states
  const [disableOnboarding, setDisableOnboarding] = useState(false);
  const [disableWhatsNew, setDisableWhatsNew] = useState(false);
  const [whatsNewParagraphs, setWhatsNewParagraphs] = useState<string[]>([]);
  const [newParagraphText, setNewParagraphText] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  useEffect(() => {
    if (organization && !settingsLoaded) {
      setDisableOnboarding(organization.settings?.disableOnboardingTour || false);
      setDisableWhatsNew(organization.settings?.disableWhatsNewModal || false);
      setWhatsNewParagraphs(organization.settings?.whatsNewParagraphs || []);
      setSettingsLoaded(true);
    }
  }, [organization, settingsLoaded]);

  const handleSaveEngagementSettings = async () => {
    if (!db || !effectiveOrgId || isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      const orgRef = doc(db, "organizations", effectiveOrgId);
      await updateDoc(orgRef, {
        "settings.disableOnboardingTour": disableOnboarding,
        "settings.disableWhatsNewModal": disableWhatsNew,
        "settings.whatsNewParagraphs": whatsNewParagraphs,
        "settings.whatsNewUpdatedAt": new Date().toISOString()
      });
      toast({
        title: "Engagement Settings Saved",
        description: "The next time staff members log in, they will receive the updated highlights.",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Failed to save settings",
        description: e.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const infoQuery = useMemoFirebase(() => {
    if (!db || !effectiveOrgId) return null;
    return query(
      collection(db, "info_items"), 
      where("orgId", "==", effectiveOrgId),
      where("isArchived", "==", false), 
      orderBy("createdAt", "desc")
    );
  }, [db, effectiveOrgId]);

  const { data: rawItems = [], loading } = useCollection<InfoItem>(infoQuery as any);

  // Filter items to show only those visible to staff (backward compatible)
  const items = useMemo(() => {
    return rawItems.filter(item => item.isStaffVisible !== false);
  }, [rawItems]);

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
      {permissions.manageInfoCorner && settingsLoaded && (
        <Card className="mb-8 border-2 border-primary/20 bg-card shadow-lg overflow-hidden transition-all duration-300">
          <CardHeader className="bg-primary/5 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sliders className="h-6 w-6 text-primary animate-pulse" />
                <div>
                  <CardTitle className="font-headline text-xl text-primary font-bold">Engagement & Onboarding Tools</CardTitle>
                  <CardDescription className="text-xs">
                    Manage the system onboarding tour and configure what notifications are shown to staff on login.
                  </CardDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                className="gap-1 font-bold text-xs uppercase"
              >
                {isPanelExpanded ? (
                  <>Hide Controls <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Show Controls <ChevronDown className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </CardHeader>
          
          {isPanelExpanded && (
            <CardContent className="pt-6 space-y-6 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Onboarding Tour Control */}
                <div className="flex flex-col justify-between p-5 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tour-toggle" className="text-sm font-bold text-foreground cursor-pointer">
                        Onboarding Tour
                      </Label>
                      <Switch 
                        id="tour-toggle" 
                        checked={!disableOnboarding} 
                        onCheckedChange={(checked) => setDisableOnboarding(!checked)} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pr-6">
                      Toggle whether brand new users are guided through the core features of the system when they first log in.
                    </p>
                  </div>
                  <Badge variant="outline" className={`mt-4 w-fit text-[10px] uppercase font-bold tracking-widest ${!disableOnboarding ? 'bg-green-600/10 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border'}`}>
                    {!disableOnboarding ? 'Active (Recommended)' : 'Disabled'}
                  </Badge>
                </div>

                {/* What's New Modal Control */}
                <div className="flex flex-col justify-between p-5 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="whats-new-toggle" className="text-sm font-bold text-foreground cursor-pointer">
                        'What's New' Highlights Pop-up
                      </Label>
                      <Switch 
                        id="whats-new-toggle" 
                        checked={!disableWhatsNew} 
                        onCheckedChange={(checked) => setDisableWhatsNew(!checked)} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pr-6">
                      Toggle whether a popup highlighting new system releases and internal announcements is shown to staff.
                    </p>
                  </div>
                  <Badge variant="outline" className={`mt-4 w-fit text-[10px] uppercase font-bold tracking-widest ${!disableWhatsNew ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                    {!disableWhatsNew ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              {!disableWhatsNew && (
                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Customize Pop-up Content
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Add customized paragraphs below. Creating paragraphs here will replace the standard system announcements with your organization's custom notifications.
                    </p>
                  </div>

                  {/* Paragraph List */}
                  <div className="space-y-3">
                    {whatsNewParagraphs.length === 0 ? (
                      <div className="text-center py-8 rounded-2xl border-2 border-dashed bg-muted/10">
                        <Info className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No custom paragraphs configured yet.</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Staff currently see the default platform announcements.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {whatsNewParagraphs.map((para, idx) => (
                          <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:border-primary/30 transition-all">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-xs text-foreground/80 leading-relaxed font-medium flex-1">
                              {para}
                            </p>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => {
                                setWhatsNewParagraphs(whatsNewParagraphs.filter((_, i) => i !== idx));
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Paragraph form */}
                  <div className="flex gap-3">
                    <Textarea 
                      placeholder="Type a new highlight or announcement paragraph here..." 
                      value={newParagraphText}
                      onChange={(e) => setNewParagraphText(e.target.value)}
                      className="text-xs resize-none h-16 min-h-[4rem]"
                    />
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (!newParagraphText.trim()) return;
                        setWhatsNewParagraphs([...whatsNewParagraphs, newParagraphText.trim()]);
                        setNewParagraphText("");
                      }}
                      className="h-auto shrink-0 font-bold text-xs uppercase"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Save Settings footer */}
              <div className="flex justify-end pt-4 border-t bg-muted/10 -mx-6 -mb-6 px-6 py-4">
                <Button 
                  onClick={handleSaveEngagementSettings}
                  disabled={isSavingSettings}
                  className="gap-2 font-bold uppercase tracking-widest text-xs px-6 shadow-md"
                >
                  {isSavingSettings ? (
                    "Saving Settings..."
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save & Highlight to Staff
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

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
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit Item</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

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
                      </div>
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
                  ) : (item.type === 'CTA' || item.allowResponse) ? (
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

      <InfoItemModal 
        open={isModalOpen} 
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingItem(null);
        }} 
        editItem={editingItem}
      />

      <Dialog open={!!selectedItemForList} onOpenChange={(open) => !open && setSelectedItemForList(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Engagement Registry</DialogTitle>
            <DialogDescription>
              Detailed list of staff members interested in:
              <br/>
              <span className="font-bold text-foreground">"{selectedItemForList?.title}"</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 max-h-[480px] overflow-y-auto py-4 pr-2">
            {/* Staff Section */}
            {allUsers
              .filter(u => selectedItemForList?.interestedUserIds?.includes(u.id))
              .map((u) => (
                <div key={u.id} className="flex flex-col gap-3 p-4 border-2 rounded-2xl bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{u.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground leading-tight">{u.name}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">{u.role || u.roles?.[0]} Staff</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold bg-green-500/5 text-green-700 border-green-200 uppercase tracking-tighter">Interest Logged</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="text-[10px] font-medium truncate">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Home className="h-3 w-3 shrink-0" />
                        <span className="text-[10px] font-medium truncate">{u.depot || "Generic Depot"}</span>
                    </div>
                  </div>
                </div>
              ))}

            {/* Volunteers Section */}
            {selectedItemForList?.interestedUserIds?.filter(id => !allUsers.some(u => u.id === id)).map((email) => (
              <div key={email} className="flex flex-col gap-3 p-4 border-2 rounded-2xl bg-orange-500/5 border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 border border-orange-200">
                        <Heart className="h-5 w-5 fill-current" />
                      </div>
                      <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground leading-tight">{email.split('@')[0]}</span>
                      <span className="text-[10px] uppercase font-bold text-orange-600 tracking-tight italic">Public Volunteer</span>
                      </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold bg-orange-500/10 text-orange-700 border-orange-300 uppercase tracking-tighter">Interest Logged</Badge>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t border-dashed">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="text-[10px] font-medium truncate">{email}</span>
                </div>
              </div>
            ))}

            {(!selectedItemForList?.interestedUserIds || selectedItemForList.interestedUserIds.length === 0) && (
              <div className="text-center py-10 text-muted-foreground italic text-sm">
                No interest logged yet.
              </div>
            )}
          </div>
          <Button variant="secondary" className="w-full font-bold uppercase tracking-widest mt-2" onClick={() => setSelectedItemForList(null)}>Close List</Button>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
