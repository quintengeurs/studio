"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  User as UserIcon,
  Sun,
  Moon,
  Clock,
  AlertCircle,
  Briefcase,
  History,
  Settings2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  PhoneCall,
  Coffee,
  Users,
  Trash2
} from "lucide-react";
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  parseISO, 
  isToday,
  addWeeks,
  subWeeks
} from "date-fns";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, query, where, deleteDoc } from "firebase/firestore";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { StaffShift, ShiftType, ShiftPattern, User, ArchivedRoster } from "@/lib/types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Download, Archive, BookOpen } from "lucide-react";

// Default Shift Types
const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { id: 'open', name: 'Opening', startTime: '06:00', endTime: '10:00', color: 'bg-sky-500', icon: 'Sun' },
  { id: 'daytime', name: 'Daytime', startTime: '08:00', endTime: '16:30', color: 'bg-amber-500', icon: 'Briefcase' },
  { id: 'locking', name: 'Locking', startTime: '16:30', endTime: '21:00', color: 'bg-indigo-600', icon: 'Moon' },
  { id: 'stand-by', name: 'Stand-by', startTime: '00:00', endTime: '23:59', color: 'bg-purple-500', icon: 'PhoneCall' },
  { id: 'rest', name: 'Rest Day', startTime: '00:00', endTime: '00:00', color: 'bg-slate-400', icon: 'Coffee' },
];


export default function RosterPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { effectiveOrgId, isAdmin, isManagement } = useUserContext();
  const { allUsers, allParks } = useDataContext();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Partial<StaffShift> | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [isManageStaffOpen, setIsManageStaffOpen] = useState(false);
  const [isArchiveViewerOpen, setIsArchiveViewerOpen] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<ArchivedRoster | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Date Logic
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startDate, i)), [startDate]);

  // Firestore Queries
  const shiftsQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(
      collection(db, "staff_shifts"), 
      where("orgId", "==", effectiveOrgId),
      where("date", ">=", format(startDate, 'yyyy-MM-dd')),
      where("date", "<=", format(addDays(startDate, 6), 'yyyy-MM-dd'))
    ) : null, 
  [db, effectiveOrgId, startDate]);
  const { data: shifts = [] } = useCollection<StaffShift>(shiftsQuery as any);

  const patternsQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(collection(db, "shift_patterns"), where("orgId", "==", effectiveOrgId)) : null, 
  [db, effectiveOrgId]);
  const { data: patterns = [] } = useCollection<ShiftPattern>(patternsQuery as any);

  const archiveQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(collection(db, "archived_rosters"), where("orgId", "==", effectiveOrgId)) : null,
  [db, effectiveOrgId]);
  const { data: archivedRosters = [] } = useCollection<ArchivedRoster>(archiveQuery as any);

  // Group users by Depot (only those on roster)
  const usersByDepot = useMemo(() => {
    const groups: Record<string, User[]> = {};
    allUsers.forEach(u => {
      if (u.isArchived || !u.isOnRoster) return;
      const depot = u.depot || u.depots?.[0] || 'Unassigned';
      if (!groups[depot]) groups[depot] = [];
      groups[depot].push(u);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allUsers]);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const getShiftForUser = (userId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.userId === userId && s.date === dateStr);
  };

  const openAddShift = (userId: string, userName: string, date: Date) => {
    const type = DEFAULT_SHIFT_TYPES.find(t => t.id === 'daytime');
    setSelectedShift({
      userId,
      userName,
      date: format(date, 'yyyy-MM-dd'),
      shiftTypeId: 'daytime',
      startTime: type?.startTime,
      endTime: type?.endTime,
      status: 'Confirmed',
      orgId: effectiveOrgId || ""
    });
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async () => {
    if (!db || !effectiveOrgId || !selectedShift || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const shiftId = selectedShift.id || `shift_${Date.now()}_${selectedShift.userId}`;
      const payload = {
        ...selectedShift,
        id: shiftId,
        orgId: effectiveOrgId,
        createdAt: selectedShift.createdAt || new Date().toISOString()
      };
      await setDoc(doc(db, "staff_shifts", shiftId), payload);
      toast({ title: "Shift Saved", description: "The roster has been updated." });
      setIsShiftModalOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to save shift.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!db || !selectedShift?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "staff_shifts", selectedShift.id));
      toast({ title: "Shift Removed" });
      setIsShiftModalOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to remove shift.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('roster-grid-capture');
    if (!element) return;
    
    setIsSubmitting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Roster_${format(startDate, 'yyyy-MM-dd')}.pdf`);
      toast({ title: "Export Complete", description: "PDF has been generated." });
    } catch (e) {
      toast({ title: "Export Failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveWeek = async () => {
    if (!db || !effectiveOrgId || shifts.length === 0 || isArchiving) return;
    
    setIsArchiving(true);
    try {
      const weekId = `roster_${format(startDate, 'yyyy_MM_dd')}`;
      const summary = shifts.map(s => {
        const type = DEFAULT_SHIFT_TYPES.find(t => t.id === s.shiftTypeId);
        return `${s.userName}: ${type?.name} (${s.startTime}-${s.endTime})${s.notes ? ` - Note: ${s.notes}` : ''}`;
      }).join('\n');

      const archiveData: ArchivedRoster = {
        id: weekId,
        orgId: effectiveOrgId,
        startDate: format(startDate, 'yyyy-MM-dd'),
        archivedAt: new Date().toISOString(),
        summary,
        snapshot: shifts
      };

      await setDoc(doc(db, "archived_rosters", weekId), archiveData);
      
      // Clear active shifts for this week to start fresh
      const deletePromises = shifts.map(s => deleteDoc(doc(db, "staff_shifts", s.id)));
      await Promise.all(deletePromises);

      toast({ title: "Week Archived & Cleared", description: "This week has been saved and the grid is now fresh." });
    } catch (e) {
      toast({ title: "Archival Failed", variant: "destructive" });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <DashboardShell
      title="Staff Roster"
      description="Manage shifts, rolling patterns, and duty coverage."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsArchiveViewerOpen(true)} className="font-bold">
            <BookOpen className="mr-2 h-4 w-4" /> History
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isSubmitting} className="font-bold">
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="font-bold">Today</Button>
          <div className="flex items-center bg-muted rounded-lg p-0.5 border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevWeek}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-3 text-xs font-bold whitespace-nowrap">
              {format(startDate, 'MMM d')} - {format(addDays(startDate, 6), 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextWeek}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          {isManagement && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={handleArchiveWeek} disabled={isArchiving}>
                <Archive className="mr-2 h-4 w-4" /> Archive & Clear
              </Button>
              <Button variant="outline" size="sm" className="font-bold" onClick={() => setIsManageStaffOpen(true)}>
                <Users className="mr-2 h-4 w-4" /> Manage Staff
              </Button>
              <Button size="sm" className="font-bold" onClick={() => setIsPatternModalOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" /> Patterns
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-12 pt-8">
        {/* Coverage Header Summary */}
        <div className="grid grid-cols-7 gap-1 px-[200px] mb-4">
           {weekDays.map(day => {
              const dayShifts = shifts.filter(s => s.date === format(day, 'yyyy-MM-dd'));
              const hasOpen = dayShifts.some(s => s.shiftTypeId === 'open');
              const hasClose = dayShifts.some(s => s.shiftTypeId === 'locking');
              const totalCount = dayShifts.length;

              return (
                <div key={day.toString()} className="flex flex-col gap-1">
                   <div className="flex items-center justify-between px-2">
                      <div className="flex gap-1">
                        <div className={cn("h-1.5 w-1.5 rounded-full", hasOpen ? "bg-sky-500" : "bg-muted")} title="Opening Cover" />
                        <div className={cn("h-1.5 w-1.5 rounded-full", hasClose ? "bg-indigo-600" : "bg-muted")} title="Closing Cover" />
                      </div>
                      <span className="text-[10px] font-bold opacity-40">{totalCount} staff</span>
                   </div>
                   <div className={cn("h-1 rounded-full mx-1", totalCount > 0 ? "bg-primary/20" : "bg-muted")} />
                </div>
              );
           })}
        </div>

        <Card id="roster-grid-capture" className="overflow-hidden border-none shadow-xl bg-background/50 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="sticky left-0 z-20 bg-muted/80 backdrop-blur p-4 text-left w-[200px] border-r">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff Member</span>
                  </th>
                  {weekDays.map(day => (
                    <th key={day.toString()} className={cn(
                      "p-4 text-center border-r min-w-[120px]",
                      isToday(day) && "bg-primary/5"
                    )}>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{format(day, 'EEE')}</span>
                        <span className={cn(
                          "text-lg font-headline font-bold",
                          isToday(day) ? "text-primary" : "text-foreground"
                        )}>{format(day, 'd')}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersByDepot.map(([depot, users]) => (
                  <>
                    <tr key={depot} className="bg-muted/20">
                      <td colSpan={8} className="p-2 px-4 border-b">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                            {depot}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                    {users.map(staff => (
                      <tr key={staff.id} className="group hover:bg-muted/30 transition-colors border-b">
                        <td className="sticky left-0 z-10 bg-background/95 backdrop-blur group-hover:bg-muted/50 p-3 border-r transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {staff.name.charAt(0)}
                             </div>
                             <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold truncate">{staff.name}</span>
                                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight opacity-60">
                                   {staff.role || staff.roles?.[0]}
                                </span>
                             </div>
                          </div>
                        </td>
                        {weekDays.map(day => {
                          const userShifts = getShiftForUser(staff.id, day);
                          return (
                            <td 
                              key={day.toString()} 
                              className={cn(
                                "p-1 border-r h-20 transition-all",
                                isToday(day) && "bg-primary/[0.02]"
                              )}
                              onDoubleClick={() => isManagement && openAddShift(staff.id, staff.name, day)}
                            >
                              <div className="flex flex-col gap-1 h-full">
                                {userShifts.length > 0 ? (
                                  <TooltipProvider>
                                    {userShifts.map(shift => {
                                      const type = DEFAULT_SHIFT_TYPES.find(t => t.id === shift.shiftTypeId);
                                      return (
                                        <Tooltip key={shift.id}>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={() => {
                                                setSelectedShift(shift);
                                                setIsShiftModalOpen(true);
                                              }}
                                              className={cn(
                                                "flex flex-col p-1.5 rounded-lg text-left transition-all border shadow-sm group/shift",
                                                type?.color || "bg-muted",
                                                shift.status === 'Sick' && "opacity-50 grayscale border-red-500 border-2"
                                              )}
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-white uppercase tracking-tighter truncate">
                                                  {type?.name}
                                                </span>
                                                {shift.isStandby && <PhoneCall className="h-2 w-2 text-white" />}
                                                {shift.status === 'Sick' && <AlertCircle className="h-2 w-2 text-white" />}
                                              </div>
                                              <span className="text-[8px] text-white/80 font-medium">
                                                {shift.startTime || type?.startTime} - {shift.endTime || type?.endTime}
                                              </span>
                                              {shift.parkId && (
                                                <span className="text-[7px] text-white font-bold truncate mt-0.5 flex items-center gap-0.5">
                                                  <CalendarIcon className="h-1.5 w-1.5" /> {shift.parkId}
                                                </span>
                                              )}
                                            </button>
                                          </TooltipTrigger>
                                          {(shift.notes || shift.status !== 'Confirmed') && (
                                            <TooltipContent className="bg-popover/95 backdrop-blur border shadow-xl p-3 max-w-[250px] z-[100]">
                                              <div className="space-y-2">
                                                <div className="flex items-center justify-between border-b pb-1">
                                                  <span className="text-[10px] font-bold uppercase text-primary">{type?.name} Shift</span>
                                                  <Badge variant="outline" className="text-[8px] h-4">{shift.status}</Badge>
                                                </div>
                                                {shift.notes && (
                                                  <p className="text-[11px] leading-relaxed italic text-muted-foreground">&quot;{shift.notes}&quot;</p>
                                                )}
                                                {!shift.notes && shift.status === 'Sick' && (
                                                  <p className="text-[11px] text-destructive font-bold flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" /> Staff reported absence
                                                  </p>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                      );
                                    })}
                                  </TooltipProvider>
                                ) : (
                                  isManagement && (
                                    <button 
                                      onClick={() => openAddShift(staff.id, staff.name, day)}
                                      className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-muted-foreground hover:bg-muted/50 rounded-lg transition-all"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Shift Edit Modal */}
      <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Shift</DialogTitle>
            <DialogDescription>
              Modify shift details for {selectedShift?.userName} on {selectedShift?.date && format(parseISO(selectedShift.date), 'EEEE, MMM d')}.
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Shift Type</Label>
                  <Select 
                    value={selectedShift.shiftTypeId} 
                    onValueChange={v => {
                      const type = DEFAULT_SHIFT_TYPES.find(t => t.id === v);
                      setSelectedShift({
                        ...selectedShift, 
                        shiftTypeId: v,
                        startTime: type?.startTime,
                        endTime: type?.endTime
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_SHIFT_TYPES.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select 
                    value={selectedShift.status} 
                    onValueChange={(v: any) => setSelectedShift({...selectedShift, status: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Sick">Sick / Absence</SelectItem>
                      <SelectItem value="Covered">Covered</SelectItem>
                      <SelectItem value="Swap Requested">Swap Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Time</Label>
                  <Input 
                    type="time" 
                    step="900"
                    value={selectedShift.startTime || ""} 
                    onChange={e => setSelectedShift({...selectedShift, startTime: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End Time</Label>
                  <Input 
                    type="time" 
                    step="900"
                    value={selectedShift.endTime || ""} 
                    onChange={e => setSelectedShift({...selectedShift, endTime: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Location / Park Override</Label>
                <Select 
                  value={selectedShift.parkId || "unassigned"} 
                  onValueChange={v => setSelectedShift({...selectedShift, parkId: v === "unassigned" ? "" : v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Default (All Sites)</SelectItem>
                    {allParks.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border">
                <input 
                  type="checkbox" 
                  id="standby" 
                  checked={selectedShift.isStandby} 
                  onChange={e => setSelectedShift({...selectedShift, isStandby: e.target.checked})}
                  className="rounded border-primary"
                />
                <Label htmlFor="standby" className="font-bold flex items-center gap-2">
                  <PhoneCall className="h-3 w-3" /> On Stand-by Shift
                </Label>
              </div>

              <div className="grid gap-2">
                <Label>Internal Notes</Label>
                <Textarea 
                  placeholder="e.g. Covering for morning sickness..." 
                  value={selectedShift.notes || ""}
                  onChange={e => setSelectedShift({...selectedShift, notes: e.target.value})}
                  className="h-20"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
            {selectedShift?.id ? (
              <Button variant="ghost" className="text-destructive font-bold" onClick={handleDeleteShift} disabled={isSubmitting}>
                Delete
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsShiftModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveShift} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Shift"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patterns Management Modal */}
      <Dialog open={isPatternModalOpen} onOpenChange={setIsPatternModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Rolling Shift Patterns</DialogTitle>
            <DialogDescription>Define your 'X days on, Y days off' logic here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 border-2 border-dashed rounded-xl text-center space-y-2">
               <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/40" />
               <p className="text-sm font-bold text-muted-foreground">Pattern Designer Coming Soon</p>
               <p className="text-[10px] text-muted-foreground italic">For now, shifts are manually assigned. We will add the auto-population logic in the next phase.</p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Existing Templates</Label>
              <div className="grid gap-2">
                <div className="p-3 border rounded-xl flex items-center justify-between bg-muted/20">
                   <div className="flex flex-col">
                      <span className="text-sm font-bold">Standard 4-on, 2-off</span>
                      <span className="text-[10px] text-muted-foreground italic">Rolling rest days across the week</span>
                   </div>
                   <Badge variant="outline">Preview</Badge>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPatternModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Staff Modal */}
      <Dialog open={isManageStaffOpen} onOpenChange={setIsManageStaffOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Roster Staff</DialogTitle>
            <DialogDescription>Toggle which staff members are visible on the roster grid.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {allUsers.filter(u => !u.isArchived).sort((a, b) => a.name.localeCompare(b.name)).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{user.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{user.role || (user.roles?.[0])}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mr-2">
                        {user.isOnRoster ? 'Active' : 'Hidden'}
                      </span>
                      <Switch 
                        checked={user.isOnRoster || false}
                        onCheckedChange={async (val) => {
                          if (!db) return;
                          try {
                            await setDoc(doc(db, "users", user.id), { isOnRoster: val }, { merge: true });
                          } catch (e) {
                            toast({ title: "Error", variant: "destructive" });
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsManageStaffOpen(false)}>Finished</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive History Viewer */}
      <Dialog open={isArchiveViewerOpen} onOpenChange={setIsArchiveViewerOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Roster History Archive</DialogTitle>
            <DialogDescription>Access historical shift records and weekly summaries.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8">
              {/* Group archived rosters by month */}
              {Object.entries(
                archivedRosters.reduce((acc, roster) => {
                  const month = format(parseISO(roster.startDate), 'MMMM yyyy');
                  if (!acc[month]) acc[month] = [];
                  acc[month].push(roster);
                  return acc;
                }, {} as Record<string, ArchivedRoster[]>)
              ).sort((a, b) => b[0].localeCompare(a[0])).map(([month, items]) => (
                <div key={month} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-b pb-1">{month}</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {items.sort((a, b) => b.startDate.localeCompare(a.startDate)).map((roster, idx) => (
                      <Button 
                        key={roster.id} 
                        variant="outline" 
                        className="flex flex-col h-20 items-center justify-center gap-1 hover:bg-primary/5 hover:border-primary/30"
                        onClick={() => setSelectedArchive(roster)}
                      >
                        <span className="text-xs font-bold text-muted-foreground uppercase">Week {items.length - idx}</span>
                        <span className="text-[10px] font-medium">{format(parseISO(roster.startDate), 'MMM d')}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}

              {archivedRosters.length === 0 && (
                <div className="py-12 text-center text-muted-foreground italic">
                  No archived rosters found yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Detailed Archive Pop-up */}
      <Dialog open={!!selectedArchive} onOpenChange={() => setSelectedArchive(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[70vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/30">
            <div className="flex justify-between items-start">
               <div>
                 <DialogTitle className="text-xl font-headline">Archive: Week starting {selectedArchive && format(parseISO(selectedArchive.startDate), 'MMMM d, yyyy')}</DialogTitle>
                 <DialogDescription className="text-xs">Generated on {selectedArchive && format(parseISO(selectedArchive.archivedAt), 'PPp')}</DialogDescription>
               </div>
               <Badge variant="outline" className="font-bold">HISTORICAL RECORD</Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
             <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Weekly Shift Summary</h4>
                  <div className="bg-muted/50 p-4 rounded-xl border font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {selectedArchive?.summary}
                  </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Roster Snapshot Grid</h4>
                   <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                           <tr className="bg-muted border-b">
                              <th className="p-2 text-left border-r font-bold">Staff</th>
                              <th className="p-2 text-left font-bold">Shift Details & Notes</th>
                           </tr>
                        </thead>
                        <tbody>
                           {selectedArchive?.snapshot.sort((a, b) => a.userName.localeCompare(b.userName)).map((s, i) => {
                             const type = DEFAULT_SHIFT_TYPES.find(t => t.id === s.shiftTypeId);
                             return (
                               <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                 <td className="p-2 border-r font-medium">{s.userName}</td>
                                 <td className="p-2">
                                   <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <Badge className={cn("text-[8px] h-4 uppercase", type?.color)}>{type?.name}</Badge>
                                        <span className="text-[10px] font-bold text-muted-foreground">{s.date} • {s.startTime}-{s.endTime}</span>
                                      </div>
                                      {s.notes && <p className="italic text-muted-foreground opacity-80">&quot;{s.notes}&quot;</p>}
                                   </div>
                                 </td>
                               </tr>
                             );
                           })}
                        </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </ScrollArea>
          
          <DialogFooter className="p-4 bg-muted/20 border-t">
            <Button variant="ghost" onClick={() => setSelectedArchive(null)}>Close Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
