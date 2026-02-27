
"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  UserPlus, 
  Plus, 
  Loader2,
  Trash2
} from "lucide-react";
import { MOCK_ISSUES, MOCK_USERS } from "@/lib/mock-data";
import { aiIssueClarificationAndCategorization } from "@/ai/flows/ai-issue-clarification-and-categorization";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function IssuesPage() {
  const { toast } = useToast();
  const [issues, setIssues] = useState(MOCK_ISSUES);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "Medium" as const,
    category: "General"
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAiEnrich = async () => {
    if (!newIssue.description) {
      toast({
        title: "Missing Description",
        description: "Please provide a brief description for AI to clarify.",
        variant: "destructive"
      });
      return;
    }

    setIsAiProcessing(true);
    try {
      const result = await aiIssueClarificationAndCategorization({ description: newIssue.description });
      setNewIssue(prev => ({
        ...prev,
        description: result.clarifiedDescription,
        category: result.suggestedCategories[0] || prev.category
      }));
      toast({
        title: "AI Enhancement Applied",
        description: "We've clarified your description and suggested categories."
      });
    } catch (error) {
      toast({
        title: "AI Enhancement Failed",
        description: "There was an issue contacting the AI service.",
        variant: "destructive"
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleCreateIssue = () => {
    const issue = {
      ...newIssue,
      id: `i${issues.length + 1}`,
      status: 'Open' as const,
      reportedBy: 'Sarah Smith',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setIssues([issue, ...issues]);
    setNewIssue({ title: "", description: "", priority: "Medium", category: "General" });
    setIsDialogOpen(false);
    toast({ title: "Issue Raised", description: "Successfully created the new issue report." });
  };

  return (
    <DashboardShell 
      title="Issue Reporting" 
      description="Track and resolve park infrastructure problems"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-headline font-bold">
              <Plus className="mr-2 h-4 w-4" /> Raise Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Report New Issue</DialogTitle>
              <DialogDescription>
                Describe the problem. Use AI to enrich your details for better allocation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Issue Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Broken Fence Panel" 
                  value={newIssue.title}
                  onChange={e => setNewIssue({...newIssue, title: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                    onClick={handleAiEnrich}
                    disabled={isAiProcessing || !newIssue.description}
                  >
                    {isAiProcessing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
                    Enrich with AI
                  </Button>
                </div>
                <Textarea 
                  id="description" 
                  placeholder="Provide brief details about the issue..." 
                  className="min-h-[100px]"
                  value={newIssue.description}
                  onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select 
                    value={newIssue.priority} 
                    onValueChange={(val: any) => setNewIssue({...newIssue, priority: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Input 
                    placeholder="e.g. Pathways" 
                    value={newIssue.category}
                    onChange={e => setNewIssue({...newIssue, category: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateIssue} disabled={!newIssue.title || !newIssue.description}>
                Submit Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {issues.map((issue) => (
          <Card key={issue.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
            <div className={`h-1.5 w-full ${
              issue.priority === 'Emergency' ? 'bg-destructive' : 
              issue.priority === 'High' ? 'bg-orange-500' : 
              issue.priority === 'Medium' ? 'bg-accent' : 'bg-primary'
            }`} />
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                  {issue.category}
                </Badge>
                <Badge className={`${
                  issue.status === 'Open' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' :
                  issue.status === 'In Progress' ? 'bg-primary/10 text-primary border-primary/20' :
                  'bg-green-500/10 text-green-600 border-green-200'
                } font-bold text-[10px]`}>
                  {issue.status}
                </Badge>
              </div>
              <CardTitle className="font-headline text-lg group-hover:text-primary transition-colors">{issue.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-xs italic">
                Reported by {issue.reportedBy} on {issue.createdAt}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {issue.description}
              </p>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {issue.assignedTo ? (
                   <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-[10px] font-medium">{issue.assignedTo}</span>
                   </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold">
                    <UserPlus className="mr-1 h-3 w-3" /> Assign
                  </Button>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
