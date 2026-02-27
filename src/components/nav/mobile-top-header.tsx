
"use client";

import { useState } from "react";
import { Leaf, User, Clock, ChevronRight } from "lucide-react";
import { MOCK_USERS, MOCK_TASKS } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function MobileTopHeader() {
  const currentUser = MOCK_USERS[1]; // Sarah Smith (Supervisor)
  const myTasks = MOCK_TASKS.filter(t => t.assignedTo === currentUser.name).slice(0, 5);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground">
              <Leaf className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" /> Recent Tasks For You
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {myTasks.length > 0 ? (
                myTasks.map((task) => (
                  <div key={task.id} className="group relative rounded-lg border p-4 hover:border-primary transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-[10px] font-bold text-primary">{task.park}</Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">{task.dueDate}</span>
                    </div>
                    <h4 className="font-headline font-bold text-sm">{task.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.objective}</p>
                    <Link href="/tasks" className="absolute inset-0 z-10">
                      <span className="sr-only">View task</span>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center text-muted-foreground py-8">No recent tasks assigned.</p>
              )}
              <Button asChild className="w-full mt-4" variant="outline">
                <Link href="/tasks">View All Tasks <ChevronRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Welcome back</span>
          <span className="text-sm font-bold text-foreground leading-none">{currentUser.name}</span>
        </div>
      </div>

      <Avatar className="h-9 w-9 border-2 border-primary/20">
        <AvatarImage src={currentUser.avatar} />
        <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
      </Avatar>
    </header>
  );
}
