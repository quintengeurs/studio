"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  MapPin, 
  Clock, 
  Calendar, 
  ArrowRight,
  Sparkles,
  Heart,
  CheckCircle2,
  Megaphone,
  Info,
  ExternalLink,
  HandMetal,
  UserCheck,
  ClipboardList,
  UserPlus,
  ShieldAlert,
  Search,
  Pencil,
  Trash2,
  Plus,
  Download,
  FileText,
  Mail,
  Home,
  Archive,
  LogOut,
  LogIn
} from "lucide-react";
import Image from "next/image";
import { useVolunteerOnboarding } from "@/hooks/use-onboarding";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useUserContext } from "@/context/UserContext";
import { doc, setDoc, getDocs, getDoc, collection, query, where, limit, orderBy, deleteDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Task } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const VolunteerRegistrationModal = dynamic(() => import("@/components/modals/volunteer-registration-modal").then(mod => mod.VolunteerRegistrationModal), { ssr: false });
const TaskDetailModal = dynamic(() => import("@/components/modals/task-detail-modal").then(mod => mod.TaskDetailModal), { ssr: false });
const InfoItemModal = dynamic(() => import("@/components/modals/info-item-modal").then(mod => mod.InfoItemModal), { ssr: false });
const VolunteerTaskModal = dynamic(() => import("@/components/modals/volunteer-task-modal").then(mod => mod.VolunteerTaskModal), { ssr: false });
const VolunteerOnboardingTour = dynamic(() => import("@/components/onboarding/VolunteerOnboardingTour").then(mod => mod.VolunteerOnboardingTour), { ssr: false });
import { useDataContext } from "@/context/DataContext";

export default function VolunteeringPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { profile, isManagement, isMaster, isAdmin, loading: userLoading } = useUserContext();
  const { allUsers, allParks } = useDataContext();
  const { toast } = useToast();
  const router = useRouter();
  
  // Organisation Resolution
  const [urlOrgId, setUrlOrgId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('org');
    }
    return null;
  });

  const effectiveOrgId = useMemo(() => {
    // If a specific org is requested via URL, respect it (allows staff to view public portals of other orgs)
    if (urlOrgId) return urlOrgId;
    // Otherwise, default to their logged-in org
    if (user && profile?.orgId) return profile.orgId;
    // Fallback to default
    return "hackney-council";
  }, [profile?.orgId, urlOrgId, user]);
  
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [volunteerEmail, setVolunteerEmail] = useState<string | null>(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<any | null>(null);
  const [selectedItemForList, setSelectedItemForList] = useState<any | null>(null);

  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState<any>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Redirection Logic: If not staff, whisk them to the Hub
  useEffect(() => {
    if (!userLoading && (!profile || !isManagement)) {
      router.push(`/hub/${effectiveOrgId}`);
    }
  }, [userLoading, profile, isManagement, effectiveOrgId, router]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("volunteerEmail");
    if (savedEmail) setVolunteerEmail(savedEmail);
    
    // Setup Bypass for Walkthrough
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'true' && db) {
      const setupData = async () => {
        try {
          const { getDocs, setDoc, doc, collection, query, where, updateDoc } = await import("firebase/firestore");
          
          // 1. Approve tester@example.com if exists
          const q = query(collection(db, "users"), where("email", "==", "tester@example.com"));
          const snapshot = await getDocs(q);
          snapshot.forEach(async (d) => {
            await updateDoc(d.ref, { status: 'active', roles: ['Volunteer', 'Admin'] }); // Also make it Admin for bypass
          });

          // 2. Create 'Litter Pick Team' task if not exists
          const tq = query(collection(db, "tasks"), where("title", "==", "Litter Pick Team"));
          const tSnap = await getDocs(tq);
          if (tSnap.empty) {
            const taskId = "task_litter_pick_" + Date.now();
            await setDoc(doc(db, "tasks", taskId), {
              id: taskId,
              title: "Litter Pick Team",
              objective: "Community cleanup effort. Help us keep our parks clean!",
              status: "Todo",
              dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
              assignedTo: "Volunteer Team",
              park: "Hackney Marshes",
              isVolunteerEligible: true,
              maxVolunteers: 2,
              rewardDescription: "Free Coffee",
              rewardCode: "COFFEE123",
              orgId: effectiveOrgId, // Use current orgId
              createdAt: new Date().toISOString()
            });
          }

          // 3. Create 'Volunteer Training Day' info item if not exists
          const iq = query(collection(db, "info_items"), where("title", "==", "Volunteer Training Day"));
          const iSnap = await getDocs(iq);
          if (iSnap.empty) {
            const itemId = "info_training_" + Date.now();
            await setDoc(doc(db, "info_items", itemId), {
              id: itemId,
              type: "CTA",
              title: "Volunteer Training Day",
              content: "Introductory session for new volunteers. Learn the ropes and meet the team!",
              ctaLabel: "Register Interest",
              isVolunteerVisible: true,
              isStaffVisible: false,
              createdBy: "System",
              orgId: effectiveOrgId, // Use current orgId
              createdAt: new Date().toISOString(),
              isArchived: false,
              allowResponse: true
            });
          }
          
          toast({ title: "Walkthrough Data Seeded", description: "Volunteer approved and tasks created." });
        } catch (err) {
          console.error("Setup failed:", err);
        }
      };
      setupData();
    }
  }, [db]);

  // Public Portal Data - Using manual fetch to avoid permission-denied noise in console
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const { shouldShowTour, markTourComplete } = useVolunteerOnboarding();


  const fetchTasks = async () => {
    if (!db) return;
    setTasksLoading(true);
    try {
      const { getDocs } = await import("firebase/firestore");
      // Use a simpler query to avoid index requirements for public/volunteer users
      const q = query(
        collection(db, "tasks"), 
        where("orgId", "==", effectiveOrgId),
        where("isVolunteerEligible", "==", true)
      );
      const snapshot = await getDocs(q);
      const allEligible = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      
      const today = new Date().toISOString().split('T')[0];

      // Filter status and limit in-memory for maximum reliability
      const activeTasks = allEligible
        .filter(t => {
          const isCorrectStatus = ["Todo", "Doing"].includes(t.status);
          const isNotArchived = !t.isArchived;
          
          // Date checks
          const start = t.startDate || t.createdAt?.split('T')[0] || "0000-00-00";
          const end = t.endDate || t.dueDate || "9999-99-99";
          const isCurrentlyActive = today >= start && today <= end;
          
          return isCorrectStatus && isNotArchived && isCurrentlyActive;
        })
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 50);
        
      setTasks(activeTasks);
    } catch (err) {
      console.error("Public tasks fetch error:", err);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const [myCompletedTasks, setMyCompletedTasks] = useState<Task[]>([]);

  const fetchMyWork = async () => {
    if (!db || !volunteerEmail) {
      setMyCompletedTasks([]);
      return;
    }
    try {
      const { getDocs } = await import("firebase/firestore");
      const q = query(
        collection(db, "tasks"), 
        where("orgId", "==", effectiveOrgId),
        where("completedByVolunteers", "array-contains", volunteerEmail),
        limit(50)
      );
      const snapshot = await getDocs(q);
      setMyCompletedTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Task));
    } catch (err) {
      console.error("My contributions fetch error:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [db, effectiveOrgId]);

  useEffect(() => {
    fetchMyWork();
  }, [db, volunteerEmail]);


  // Staff Management Data (Volunteer Log)
  const staffLogQuery = useMemoFirebase(() => 
    (db && user && effectiveOrgId) ? query(
      collection(db, "tasks"), 
      where("orgId", "==", effectiveOrgId),
      where("status", "==", "Completed"),
      where("isVolunteerEligible", "==", true),
      limit(100)
    ) : null, 
  [db, user, effectiveOrgId]);
  const { data: logTasks = [], loading: logLoading } = useCollection<Task>(staffLogQuery as any);

  const staffTasksQuery = useMemoFirebase(() => 
    (db && user && effectiveOrgId) ? query(
      collection(db, "tasks"), 
      where("orgId", "==", effectiveOrgId),
      where("isVolunteerEligible", "==", true),
      orderBy("dueDate", "asc"),
      limit(200)
    ) : null, 
  [db, user, effectiveOrgId]);
  const { data: allVolunteerTasks = [], loading: staffTasksLoading } = useCollection<Task>(staffTasksQuery as any);

  const staffActiveTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allVolunteerTasks.filter(t => {
      if (t.status === 'Completed') return false;
      const end = t.endDate || t.dueDate || "9999-99-99";
      return today <= end;
    });
  }, [allVolunteerTasks]);

  const staffArchivedTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allVolunteerTasks.filter(t => {
      if (t.status === 'Completed') return true;
      const end = t.endDate || t.dueDate || "9999-99-99";
      return today > end;
    });
  }, [allVolunteerTasks]);

  // Hub News
  const volunteerNewsQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(
      collection(db, "info_items"), 
      where("orgId", "==", effectiveOrgId),
      where("isVolunteerVisible", "==", true)
    ) : null, 
  [db, effectiveOrgId]);
  const { data: volunteerNews = [], loading: newsLoading, error: newsError } = useCollection<any>(volunteerNewsQuery as any);

  const [cachedNews, setCachedNews] = useState<any[]>([]);
  const [fallbackNews, setFallbackNews] = useState<any[]>([]);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  
  useEffect(() => {
    if (effectiveOrgId) {
      const saved = localStorage.getItem(`volunteer_news_cache_${effectiveOrgId}`);
      if (saved) {
        try { setCachedNews(JSON.parse(saved)); } catch (e) {}
      }
    }
  }, [effectiveOrgId]);
  useEffect(() => {
    // If useCollection fails, try a manual fetch as a fallback
    if (newsError && db) {
      const isPermission = newsError?.message?.includes('permission') || (newsError as any)?.code === 'permission-denied';
      if (isPermission) setHasPermissionError(true);

      const fetchFallback = async () => {
        try {
          const snapshot = await getDocs(collection(db, "info_items"));
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setFallbackNews(docs.filter((d: any) => 
            d.isVolunteerVisible === true && 
            !d.isArchived && 
            d.orgId === effectiveOrgId // CRITICAL: Filter by orgId in fallback
          ));
          setHasPermissionError(false); // Succeeded with fallback
        } catch (e: any) {
          console.error("News Fallback Failed:", e);
          if (e?.message?.includes('permission') || e?.code === 'permission-denied') {
            setHasPermissionError(true);
          }
        }
      };
      fetchFallback();
    } else if (!newsLoading && !newsError) {
      setHasPermissionError(false);
    }
  }, [newsError, newsLoading, db]);

  const effectiveNews = useMemo(() => {
    // Ensure all news sources match the current orgId
    const baseItems = [
      ...volunteerNews,
      ...fallbackNews.filter(n => n.orgId === effectiveOrgId),
      ...cachedNews.filter(n => n.orgId === effectiveOrgId)
    ];

    const filtered = baseItems
      .filter((d: any, index, self) => 
        // Unique items only
        self.findIndex(t => t.id === d.id) === index &&
        d.isArchived !== true && 
        d.isVolunteerVisible === true &&
        d.orgId === effectiveOrgId // Final safety check
      )
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    // Update cache if we got fresh data
    if ((volunteerNews.length > 0 || fallbackNews.length > 0) && filtered.length > 0 && effectiveOrgId) {
      localStorage.setItem(`volunteer_news_cache_${effectiveOrgId}`, JSON.stringify(filtered));
    }

    return filtered;
  }, [volunteerNews, fallbackNews, cachedNews]);

  useEffect(() => {
    // fetchNews is now handled by useCollection
  }, [db]);

  const handleRefreshData = (showActivity = false) => {
    fetchTasks();
    fetchMyWork();
    // fetchNews is now handled by useCollection
    
    if (showActivity) {
      setTimeout(() => {
        const tabsList = document.querySelector('[role="tablist"]');
        const activityTab = tabsList?.querySelector('[value="activity"]') as HTMLButtonElement;
        activityTab?.click();
      }, 100);
    }
  };

  // Volunteer Directory (Staff Only)
  const volunteersQuery = useMemoFirebase(() => 
    (db && user && effectiveOrgId) ? query(
      collection(db, "users"), 
      where("orgId", "==", effectiveOrgId),
      where("isVolunteer", "==", true), 
      orderBy("registeredAt", "desc")
    ) : null, 
  [db, user, effectiveOrgId]);
  const { data: allVolunteers = [], loading: volunteersLoading } = useCollection<any>(volunteersQuery as any);

  const currentVolunteerProfile = useMemo(() => 
    allVolunteers.find(v => v.email?.toLowerCase() === volunteerEmail?.toLowerCase()),
  [allVolunteers, volunteerEmail]);

  // Current Public Volunteer Status
  const [publicVolunteerData, setPublicVolunteerData] = useState<any[]>([]);
  const [isCheckingPublicStatus, setIsCheckingPublicStatus] = useState(false);

  useEffect(() => {
    if (!db || user || !volunteerEmail || volunteerEmail.length < 5) {
      setPublicVolunteerData([]);
      return;
    }

    const checkStatus = async () => {
      setIsCheckingPublicStatus(true);
      try {
        const { getDocs } = await import("firebase/firestore");
        const q = query(
            collection(db, "users"), 
            where("isVolunteer", "==", true), 
            where("email", "==", volunteerEmail),
            where("orgId", "==", effectiveOrgId) // Match orgId
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPublicVolunteerData(docs);
      } catch (err) {
        console.warn("Public status check failed (likely permissions):", err);
        setPublicVolunteerData([]);
      } finally {
        setIsCheckingPublicStatus(false);
      }
    };

    checkStatus();
  }, [db, user, volunteerEmail]);

  const effectiveStatus = user ? 'active' : (publicVolunteerData[0]?.status || 'unregistered');

  const handleToggleInfoInterest = async (item: any) => {
    if (!db || !volunteerEmail) {
        setIsRegModalOpen(true);
        return;
    }
    
    const isInterested = item.interestedUserIds?.includes(volunteerEmail);
    const itemRef = doc(db, "info_items", item.id);

    try {
      await updateDoc(itemRef, {
        interestedUserIds: isInterested ? arrayRemove(volunteerEmail) : arrayUnion(volunteerEmail)
      });
      toast({ 
        title: isInterested ? "Interest Removed" : "Interest Recorded", 
        description: isInterested ? "You are no longer marked as interested." : "Your interest has been logged. We will contact you soon!" 
      });
    } catch (error: any) {
      console.error("Interest Update Error:", error);
      const isPermission = error?.message?.includes('permission') || error?.code === 'permission-denied';
      toast({ 
        title: "Registration Required", 
        description: isPermission 
            ? "Your interest couldn't be logged. Please ensure you are logged in or contact staff directly." 
            : "Failed to update interest. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  // Filter tasks to show ones that are available
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        // If already completed by me, hide from available list
        if (t.completedByVolunteers?.includes(volunteerEmail || "")) return false;
        
        // Hide if I'm already doing it (it will show in My Activity)
        if (t.doingByVolunteers?.includes(volunteerEmail || "")) return false;
        
        // Show all other available volunteer tasks
        return true;
    });
  }, [tasks, volunteerEmail]);

  const myInProgressTasks = useMemo(() => {
    if (!volunteerEmail) return [];
    return tasks.filter(t => t.doingByVolunteers?.includes(volunteerEmail));
  }, [tasks, volunteerEmail]);

  // Filter completed tasks to only show ones that have an unredeemed reward
  // OR show all if no reward was involved (maybe show for a limited time?)
  const contributionsWithRewards = useMemo(() => {
    if (!volunteerEmail) return [];
    return myCompletedTasks.filter(t => {
        // If no reward, clear off (user said "when volunteer indicates completed, it should clear off")
        if (!t.rewardDescription) return false;
        
        // If reward exists, only show if NOT redeemed by me
        return !t.redeemedByVolunteers?.includes(volunteerEmail);
    });
  }, [myCompletedTasks, volunteerEmail]);

  const recentlyCompletedTasks = useMemo(() => {
    if (!volunteerEmail) return [];
    // Show tasks completed in the last 24 hours OR ones with rewards
    return myCompletedTasks.filter(t => {
      if (t.rewardDescription && !t.redeemedByVolunteers?.includes(volunteerEmail)) return true;
      if (!t.completedAt) return false;
      const completedDate = new Date(t.completedAt).getTime();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return completedDate > oneDayAgo;
    });
  }, [myCompletedTasks, volunteerEmail]);

  const handleRegisterSuccess = (email: string) => {
    setVolunteerEmail(email);
  };

  const handleTaskAction = (taskId: string) => {
    if (!volunteerEmail) {
      setIsRegModalOpen(true);
      return;
    }
    if (effectiveStatus === 'pending') {
      toast({
        title: "Approval Pending",
        description: "Your registration is still being reviewed by our staff. You'll be able to claim tasks once approved.",
      });
      return;
    }
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const handleApproveVolunteer = async (volunteerId: string) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", volunteerId), { status: 'active' });
      toast({ title: "Volunteer Approved", description: "They can now see and claim tasks." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve volunteer.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVolunteer = async (volunteerId: string) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", volunteerId), { status: 'rejected' });
      toast({ title: "Registration Rejected" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve volunteer.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmission = async (taskId: string, targetVolunteerEmail?: string) => {
    if (!db) return;
    
    // Determine which email to remove (passed email or session email)
    const emailToRemove = targetVolunteerEmail || volunteerEmail;
    
    // Only proceed if we have an email to remove OR if user is staff (admin wipe)
    if (!emailToRemove && !isManagement) return;

    if (!confirm("Are you sure you want to delete this submission? This will remove the proof and activity log for this task.")) return;
    
    setIsSubmitting(true);
    try {
      const taskRef = doc(db, "tasks", taskId);
      const updateData: any = {
        completionImageUrl: "",
        completionNote: "",
        status: 'Todo'
      };

      if (emailToRemove) {
        updateData.doingByVolunteers = arrayRemove(emailToRemove);
        updateData.completedByVolunteers = arrayRemove(emailToRemove);
        updateData.redeemedByVolunteers = arrayRemove(emailToRemove);
      } else if (isManagement) {
        updateData.doingByVolunteers = [];
        updateData.completedByVolunteers = [];
        updateData.redeemedByVolunteers = [];
        updateData.assignedTo = "Unassigned";
      }

      await updateDoc(taskRef, updateData);
      
      toast({ title: "Submission Deleted", description: "The activity log and proof have been removed." });
      handleRefreshData();
    } catch (e) {
      console.error("Failed to delete submission", e);
      toast({ title: "Error", description: "Failed to delete submission.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareSubmission = (task: any) => {
    const shareData = {
      title: `I completed a volunteering task: ${task.title}`,
      text: `Just finished helping out at ${task.park}! Check out my contribution.`,
      url: window.location.origin + `/hub/${effectiveOrgId}`
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareData.url);
      toast({ title: "Link Copied!", description: "Share your achievement with others." });
    }
  };

  const handleRedeemReward = async (taskId: string) => {
    if (!db || !volunteerEmail || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        redeemedByVolunteers: arrayUnion(volunteerEmail)
      });
      toast({ title: "Reward Redeemed!", description: "Thank you for your hard work. Enjoy your reward!" });
      handleRefreshData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to redeem reward.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!db || !editingTaskData || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "tasks", editingTaskData.id), {
        title: editingTaskData.title,
        objective: editingTaskData.objective,
        park: editingTaskData.park,
        dueDate: editingTaskData.dueDate,
        displayTime: editingTaskData.displayTime || null,
        rewardDescription: editingTaskData.rewardDescription || null,
        rewardCode: editingTaskData.rewardCode || null,
        maxVolunteers: editingTaskData.maxVolunteers || null,
        volunteerPoints: editingTaskData.volunteerPoints || null,
        volunteerImageUrl: editingTaskData.volunteerImageUrl || null,
        startDate: editingTaskData.startDate || null,
        endDate: editingTaskData.endDate || null
      });
      toast({ title: "Task Updated", description: "The volunteer opportunity has been updated." });
      setIsEditTaskModalOpen(false);
      handleRefreshData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveInfo = async (itemId: string) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "info_items", itemId), { isArchived: true });
      toast({ title: "News Item Archived" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to archive item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportInterestedVolunteers = (item: any) => {
    if (!item.interestedUserIds || item.interestedUserIds.length === 0) return;
    
    const headers = ["Email", "Status"];
    const rows = item.interestedUserIds.map((email: string) => {
      const v = allVolunteers.find(vol => vol.email === email);
      return [email, v?.status || "Unregistered"];
    });
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Interested_Volunteers_${item.title.replace(/\\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Started", description: "Downloading volunteer list..." });
  };

  const selectedTask = useMemo(() => {
    const allPossible = [...tasks, ...logTasks, ...myCompletedTasks];
    return allPossible.find(t => t.id === selectedTaskId) || null;
  }, [tasks, logTasks, myCompletedTasks, selectedTaskId]);

  const showStaffView = user && isManagement && (effectiveOrgId === profile?.orgId || isMaster);

  if (showStaffView) {
    // Staff View: Volunteer Management
    return (
      <DashboardShell 
        title="Volunteer Management" 
        description="Monitor contributions and approve new community volunteers."
      >
        <Tabs defaultValue="log" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl h-12 w-full">
            <TabsTrigger value="log" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold text-[10px] sm:text-sm">
              <ClipboardList className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Contribution Log</span> <span className="sm:hidden">Log</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold relative text-[10px] sm:text-sm">
              <UserPlus className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Pending Approvals</span> <span className="sm:hidden">New</span>
              {allVolunteers.filter(v => v.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white font-bold shadow-sm border-2 border-white">
                  {allVolunteers.filter(v => v.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold text-[10px] sm:text-sm">
              <Users className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Approved Volunteers</span> <span className="sm:hidden">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="tasks_mgmt" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold text-[10px] sm:text-sm">
              <Sparkles className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Opportunity Management</span> <span className="sm:hidden">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="news_mgmt" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold text-[10px] sm:text-sm">
              <Megaphone className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Volunteer News Hub</span> <span className="sm:hidden">News</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600">
                  <ClipboardList className="h-5 w-5" />
                  Recent Activity
                </h3>
                <Badge variant="outline" className="font-bold">{logTasks.length} Records</Badge>
              </div>

              {logLoading ? (
                <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-orange-500" /></div>
              ) : logTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60">
                  <Heart className="h-12 w-12 mb-4 text-orange-500 opacity-20" />
                  <p className="text-lg font-medium text-muted-foreground">No volunteer work logged yet.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {logTasks.map(task => (
                    <Card key={task.id} className="group relative overflow-hidden border-2 border-orange-500/10 hover:border-orange-500/30 transition-all shadow-md flex flex-col cursor-pointer" onClick={() => { setSelectedTaskId(task.id); setIsTaskModalOpen(true); }}>
                      <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/10 backdrop-blur-sm rounded-full"
                          onClick={(e) => { e.stopPropagation(); handleShareSubmission(task); }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/10 backdrop-blur-sm rounded-full"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSubmission(task.id, task.completedByVolunteers?.[0]); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Badge className="bg-green-500 text-white shadow-lg text-[9px] uppercase font-bold tracking-widest">Completed</Badge>
                      </div>
                      <CardHeader className="pb-3 px-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px] font-bold text-orange-600 border-orange-200 uppercase tracking-widest shrink-0 w-fit">{task.park}</Badge>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground shrink-0">
                                <Clock className="h-3 w-3" /> 
                                {task.completedAt ? (() => {
                                    try { return format(new Date(task.completedAt), 'MMM d, yyyy'); }
                                    catch(e) { return 'Recently'; }
                                })() : 'Recently'}
                            </div>
                        </div>
                        <CardTitle className="font-headline text-lg group-hover:text-orange-600 break-words flex-1 min-w-0">{task.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-6 px-6 flex-1">
                        <div className="space-y-4">
                          <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-100 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                                <Heart className="h-4 w-4 text-orange-600" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground leading-none tracking-tight">Volunteer</span>
                                <span className="text-sm font-bold text-foreground truncate max-w-[150px]">
                                  {task.completedByVolunteers?.[0] || 'Community Member'}
                                </span>
                              </div>
                            </div>
                            <div className="pt-3 border-t border-orange-100">
                              <p className="text-xs font-medium text-foreground leading-relaxed italic line-clamp-2">"{task.completionNote || task.objective}"</p>
                            </div>
                            {task.completionImageUrl && (
                              <div className="relative aspect-video w-full rounded-xl border border-orange-200 overflow-hidden bg-muted/20 mt-1 shadow-inner">
                                <Image src={task.completionImageUrl} alt="Proof" fill className="object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approvals">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600">
                  <UserPlus className="h-5 w-5" />
                  Pending Registrations
                </h3>
                <Badge variant="outline" className="font-bold">{allVolunteers.filter(v => v.status === 'pending').length} Requests</Badge>
              </div>

              {volunteersLoading ? (
                <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-orange-500" /></div>
              ) : allVolunteers.filter(v => v.status === 'pending').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60">
                  <UserCheck className="h-12 w-12 mb-4 text-orange-500 opacity-20" />
                  <p className="text-lg font-medium text-muted-foreground">No pending registrations.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {allVolunteers.filter(v => v.status === 'pending').map(v => (
                    <Card key={v.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold uppercase">
                          {v.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{v.email}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Registered {format(new Date(v.registeredAt), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteVolunteer(v.id)} disabled={isSubmitting}>
                          Reject
                        </Button>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => handleApproveVolunteer(v.id)} disabled={isSubmitting}>
                          Approve
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="volunteers">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-green-600">
                  <Users className="h-5 w-5" />
                  Active Community Volunteers
                </h3>
                <Badge variant="outline" className="font-bold">{allVolunteers.filter(v => v.status === 'active').length} Active</Badge>
              </div>

              {allVolunteers.filter(v => v.status === 'active').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60">
                  <Users className="h-12 w-12 mb-4 text-green-500 opacity-20" />
                  <p className="text-lg font-medium text-muted-foreground">No approved volunteers yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {allVolunteers.filter(v => v.status === 'active').map(v => (
                    <Card key={v.id} className="p-4 flex items-center justify-between hover:bg-green-50/30 transition-colors border-green-500/10">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold uppercase">
                          {v.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{v.email}</p>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[9px] uppercase font-bold tracking-widest border-none">Active Volunteer</Badge>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest border-l pl-2 border-muted-foreground/30">
                               <Sparkles className="h-3 w-3 text-orange-500" /> {v.totalPoints || 0} Points
                               <span className="mx-1 opacity-30">•</span>
                               <CheckCircle2 className="h-3 w-3 text-green-600" /> {v.completedTasksCount || 0} Tasks
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteVolunteer(v.id)} disabled={isSubmitting}>
                          Deactivate
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

           <TabsContent value="tasks_mgmt">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600">
                  <Sparkles className="h-5 w-5" />
                  Volunteering Opportunities
                </h3>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 font-bold gap-2" onClick={() => setIsCreateTaskModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Opportunity
                </Button>
              </div>

              <Tabs defaultValue="active" className="w-full">
                <TabsList className="bg-orange-50/50 p-1 rounded-lg mb-4">
                  <TabsTrigger value="active" className="text-[10px] font-bold uppercase data-[state=active]:bg-orange-500 data-[state=active]:text-white">Active ({staffActiveTasks.length})</TabsTrigger>
                  <TabsTrigger value="archived" className="text-[10px] font-bold uppercase data-[state=active]:bg-orange-500 data-[state=active]:text-white">Archived ({staffArchivedTasks.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                  <div className="grid gap-4">
                    {staffActiveTasks.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed rounded-3xl opacity-50">
                        <p className="text-sm font-bold">No active opportunities found.</p>
                      </div>
                    ) : (
                      staffActiveTasks.map(task => {
                        const today = new Date().toISOString().split('T')[0];
                        const start = task.startDate || task.createdAt?.split('T')[0] || "0000-00-00";
                        const isScheduled = today < start;

                        return (
                          <Card key={task.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors border-orange-500/10">
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                isScheduled ? 'bg-yellow-100 text-yellow-600' :
                                task.status === 'Doing' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                              }`}>
                                {isScheduled ? <Clock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-foreground">{task.title}</p>
                                  {isScheduled && <Badge className="bg-yellow-500 text-white text-[8px] uppercase">Scheduled: {start}</Badge>}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary" className={`text-[9px] uppercase font-bold tracking-widest border-none ${
                                    task.status === 'Doing' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {task.status}
                                  </Badge>
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{task.park}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-muted-foreground hover:text-orange-600 hover:bg-orange-100/50"
                                onClick={() => {
                                  setEditingTaskData({...task});
                                  setIsEditTaskModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </Button>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="archived">
                  <div className="grid gap-4">
                    {staffArchivedTasks.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed rounded-3xl opacity-50">
                        <p className="text-sm font-bold">No archived opportunities.</p>
                      </div>
                    ) : (
                      staffArchivedTasks.map(task => (
                        <Card key={task.id} className="p-4 flex items-center justify-between opacity-70 grayscale-[0.5] bg-muted/20 border-orange-500/5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                              <Archive className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-muted-foreground">{task.title}</p>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest">
                                  {task.status === 'Completed' ? 'Completed' : 'Expired'}
                                </Badge>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{task.park}</p>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-orange-600"
                            onClick={() => {
                              setEditingTaskData({...task});
                              setIsEditTaskModalOpen(true);
                            }}
                          >
                            View
                          </Button>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="news_mgmt">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600">
                  <Megaphone className="h-5 w-5" />
                  Volunteer Communication Hub
                </h3>
                <Button 
                  size="sm" 
                  className="bg-orange-500 hover:bg-orange-600 font-bold gap-2"
                  onClick={() => {
                    setEditingNewsItem(null);
                    setIsInfoModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Volunteer News
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {effectiveNews.length === 0 ? (
                  <div className="col-span-full py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60 flex flex-col items-center justify-center">
                    <Megaphone className="h-12 w-12 mb-4 text-orange-500 opacity-20" />
                    <p className="text-lg font-medium text-muted-foreground">No volunteer news items published.</p>
                  </div>
                ) : (
                  effectiveNews.map((item: any) => (
                    <Card key={item.id} className="group relative overflow-hidden border-2 border-orange-500/10 hover:border-orange-500/30 transition-all duration-500 shadow-md hover:shadow-xl bg-card flex flex-col h-full rounded-3xl">
                      <CardHeader className="pb-3 w-full">
                        <div className="flex justify-between items-start mb-3">
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 uppercase text-[9px] font-bold tracking-widest px-2">
                            {item.type}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'Recently'}</span>
                        </div>
                        <CardTitle className="text-xl font-headline group-hover:text-orange-600 transition-colors leading-tight">{item.title}</CardTitle>
                      </CardHeader>

                      <CardContent className="flex-1 w-full pb-6">
                        <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                          "{item.content}"
                        </p>
                      </CardContent>

                      <CardFooter className="w-full pt-4 border-t bg-orange-50/30 mt-auto flex flex-col gap-3">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-orange-600"
                              onClick={() => {
                                setEditingNewsItem(item);
                                setIsInfoModalOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleArchiveInfo(item.id)}
                              disabled={isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {(item.type === 'CTA' || item.allowResponse) && item.interestedUserIds && item.interestedUserIds.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[10px] font-bold uppercase text-orange-600 h-8 gap-1.5"
                              onClick={() => setSelectedItemForList(item)}
                            >
                              <Users className="h-3.5 w-3.5" /> {item.interestedUserIds.length} Interested
                            </Button>
                          )}
                        </div>
                        
                        {(item.type === 'CTA' || item.allowResponse) && (
                           <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-[10px] font-bold uppercase border-orange-200 text-orange-600 hover:bg-orange-100/50 h-9 gap-2"
                            onClick={() => handleExportInterestedVolunteers(item)}
                            disabled={!item.interestedUserIds || item.interestedUserIds.length === 0}
                          >
                            <Download className="h-3.5 w-3.5" /> Export Volunteer List
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <TaskDetailModal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          task={selectedTask}
          allUsers={allUsers}
          allParks={allParks}
        />

        <InfoItemModal
          open={isInfoModalOpen}
          onOpenChange={setIsInfoModalOpen}
          editItem={editingNewsItem}
        />

        <Dialog open={!!selectedItemForList} onOpenChange={(open) => !open && setSelectedItemForList(null)}>
          <DialogContent className="sm:max-w-[450px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl text-orange-600">Volunteer Engagement</DialogTitle>
              <DialogDescription>
                Registered interest for:
                <br/>
                <span className="font-bold text-foreground">"{selectedItemForList?.title}"</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 max-h-[480px] overflow-y-auto py-4 pr-2">
              {selectedItemForList?.interestedUserIds?.map((email: string) => {
                const v = allVolunteers.find(vol => vol.email === email);
                return (
                  <div key={email} className="flex flex-col gap-3 p-4 border-2 rounded-2xl bg-orange-50/30 border-orange-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-orange-200 shadow-sm">
                          <AvatarFallback className="bg-orange-500/10 text-orange-600 font-bold">{email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground leading-tight truncate max-w-[200px]">{email}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                            {v ? `${v.status} Volunteer` : 'Unregistered Contact'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold bg-orange-500/5 text-orange-700 border-orange-200 uppercase tracking-tighter">Interest Logged</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-dashed border-orange-200">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="text-[10px] font-medium truncate">{email}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2">
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 font-bold uppercase tracking-widest text-xs h-12 rounded-2xl"
                onClick={() => handleExportInterestedVolunteers(selectedItemForList)}
              >
                <Download className="h-4 w-4 mr-2" /> Download CSV List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <VolunteerTaskModal
          open={isCreateTaskModalOpen}
          onOpenChange={setIsCreateTaskModalOpen}
          onSuccess={() => handleRefreshData()}
        />
      </DashboardShell>
    );
  }

  return ( <DashboardShell title='Access Restricted' description='Staff only.'><div className='p-8 text-center'><p>Please visit the <a href='/hub' className='text-orange-500 font-bold'>Volunteer Hub</a> or sign in as staff.</p></div></DashboardShell> );
}
