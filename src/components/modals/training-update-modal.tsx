"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, RegistryConfig } from "@/lib/types";
import { useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { GraduationCap, UserPlus } from "lucide-react";

interface TrainingUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
}

export function TrainingUpdateModal({ open, onOpenChange, users }: TrainingUpdateModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [bespokeCourse, setBespokeCourse] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registryConfigRef = doc(db!, "settings", "registry");
  const { data: registryConfig } = useDoc<RegistryConfig>(registryConfigRef as any);
  const trainingOptions = registryConfig?.trainingOptions?.sort() ?? [];

  const handleUpdate = async () => {
    const finalCourse = selectedCourse === "Other" ? bespokeCourse : selectedCourse;
    if (!db || !selectedUserId || !finalCourse) return;
    setIsSubmitting(true);

    try {
      const userToUpdate = users.find(u => u.id === selectedUserId);
      if (!userToUpdate) throw new Error("User not found");

      // Get existing training and append new course if not present
      const currentTraining = userToUpdate.training || "";
      const trainingList = currentTraining 
        ? currentTraining.split(',').map(s => s.trim()).filter(s => s && s !== 'None') 
        : [];
      
      if (!trainingList.includes(finalCourse)) {
        trainingList.push(finalCourse);
      }

      const newTrainingString = trainingList.join(', ') || "None";

      await updateDoc(doc(db, "users", selectedUserId), {
        training: newTrainingString
      });

      toast({
        title: "Training Updated",
        description: `${finalCourse} has been added to ${userToUpdate.name}'s profile.`,
      });
      onOpenChange(false);
      setSelectedCourse("");
      setBespokeCourse("");
      setSelectedUserId("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update training record.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <GraduationCap className="h-5 w-5 text-primary" />
            Quick Training Update
          </DialogTitle>
          <DialogDescription>
            Record new training for a staff member while on-site.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label className="text-xs font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
              <UserPlus className="h-3 w-3" /> Staff Member
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Staff Member" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => !u.isArchived).sort((a, b) => a.name.localeCompare(b.name)).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
              <GraduationCap className="h-3 w-3" /> Training Course
            </Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                {trainingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
                <SelectItem value="Other" className="font-bold text-primary border-t mt-1">Other / Bespoke Course</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedCourse === "Other" && (
            <div className="grid gap-2 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-70">
                    Bespoke Course Name
                </Label>
                <Input 
                    placeholder="e.g. Bespoke Chainsaw Level 2" 
                    value={bespokeCourse}
                    onChange={(e) => setBespokeCourse(e.target.value)}
                />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            className="w-full font-bold" 
            onClick={handleUpdate} 
            disabled={!selectedUserId || !selectedCourse || (selectedCourse === "Other" && !bespokeCourse) || isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Training Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
