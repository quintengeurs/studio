
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
  ImageIcon
} from "lucide-react";
import { useCollection } from "@/firebase/firestore/use-collection";
import { db } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Issue } from "@/lib/types";

export default function ResolvedIssuesPage() {
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const resolvedIssuesQuery = useMemo(() => {
    return query(
      collection(db, "issues"),
      where("status", "==", "Resolved"),
      orderBy("createdAt", "desc")
    );
  }, []);

  const { data: issues = [], loading, error } = useCollection(resolvedIssuesQuery);

  const filteredIssues = issues.filter(issue => 
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.park.toLowerCase().includes(search.toLowerCase()) ||
    issue.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell 
      title="Resolved Issues Archive" 
      description="Historical record of completed repairs and maintenance"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search archive by title, park, or category..." 
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
              <TableHead className="font-headline font-bold">Issue Details</TableHead>
              <TableHead className="font-headline font-bold">Park</TableHead>
              <TableHead className="font-headline font-bold">Category</TableHead>
              <TableHead className="font-headline font-bold">Resolved Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading archive...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-destructive">
                  Error loading issues. Please try again.
                </TableCell>
              </TableRow>
            ) : filteredIssues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No resolved issues found.
                </TableCell>
              </TableRow>
            ) : (
              filteredIssues.map((issue) => (
                <TableRow 
                  key={issue.id} 
                  className="hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedIssue(issue)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold line-clamp-1">{issue.title}</span>
                      <span className="text-[10px] text-muted-foreground">Reported by: {issue.reportedBy}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {issue.park}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                      {issue.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleDateString() : new Date(issue.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedIssue(issue)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-green-500/10 text-green-600 border-green-200 uppercase font-bold text-[10px]">
                Resolved
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                {selectedIssue?.priority} Priority
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-headline font-bold">
              {selectedIssue?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-primary" />
              {selectedIssue?.park} • Reported {selectedIssue && new Date(selectedIssue.createdAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {selectedIssue?.imageUrl && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                <Image 
                  src={selectedIssue.imageUrl} 
                  alt="Issue Proof" 
                  fill 
                  className="object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
              <section className="p-4 rounded-lg bg-muted/30">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" /> Original Report
                </h4>
                <p className="text-sm leading-relaxed">{selectedIssue?.description}</p>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Assigned To</h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">{selectedIssue?.assignedTo || "Unassigned"}</span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Category</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{selectedIssue?.category}</Badge>
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
