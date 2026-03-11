'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Leaf, Mail, Lock, Chrome, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login redirect
    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Leaf className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-headline font-bold">Hackney Parks Management</CardTitle>
          <CardDescription>
            PROTOTYPE MODE: Click sign in to enter as Quinten Geurs
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleMockLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="quinten.geurs@hackney.gov.uk" disabled value="quinten.geurs@hackney.gov.uk" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" disabled value="********" />
            </div>
            <Button type="submit" className="w-full font-bold" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In (Master Access)"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-center w-full text-muted-foreground">
            Authentication is currently bypassed for prototyping.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
