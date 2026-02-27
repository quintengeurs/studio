
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  Info,
  Clock,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Task } from "@/lib/types";

export default function ArchivedTasksPage() {
  const db = useFirestore();
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const archivedTasksQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, "tasks"),
      where("status", "==", "Completed"),
      orderBy("dueDate", "desc")
    );
  }, [db]);

  const { data: tasks = [], loading } = useCollection(archivedTasksQuery);

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.park.toLowerCase().includes(search.toLowerCase()) ||
    task.assignedTo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell 
      title="Archived Tasks" 
      description="Historical record of all completed operational work"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search archives by task, park, or operative..." 
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-2">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-headline font-bold">Task Detail</TableHead>
              <TableHead className="font-headline font-bold">Park</TableHead>
              <TableHead className="font-headline font-bold">Operative</TableHead>
              <TableHead className="font-headline font-bold">Completed Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading archives...
                </TableCell>
              </TableRow>
            ) : filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No archived tasks found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className="hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold line-clamp-1">{task.title}</span>
                      {task.linkedIssueId && (
                        <span className="text-[9px] text-yellow-600 font-bold uppercase tracking-tight">Linked to Issue</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {task.park}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">{task.assignedTo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {task.dueDate}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-primary/10 text-primary border-primary/20 uppercase font-bold text-[10px]">
                Completed
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                Archived
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-headline font-bold">
              {selectedTask?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-primary" />
              {selectedTask?.park} • Completed {selectedTask?.dueDate}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {selectedTask?.completionImageUrl && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                <Image 
                  src={selectedTask.completionImageUrl} 
                  alt="Work Evidence" 
                  fill 
                  className="object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
               <section className="p-4 rounded-lg bg-muted/30">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" /> Task Objective
                </h4>
                <p className="text-sm leading-relaxed">{selectedTask?.objective}</p>
              </section>

              {selectedTask?.completionNote && (
                <section className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <h4 className="text-xs font-bold uppercase text-primary mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completion Note
                  </h4>
                  <p className="text-sm italic">"{selectedTask.completionNote}"</p>
                </section>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Assigned Operative</h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">{selectedTask?.assignedTo}</span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Status</h4>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-white text-[10px]">VERIFIED</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
