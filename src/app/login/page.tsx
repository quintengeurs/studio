'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Leaf, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("quinten.geurs@gmail.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      console.error("Login Error:", err);
      const errorMessage = err.code ? `[${err.code}] ${err.message}` : err.message || "Please check your credentials.";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
            Enter your credentials to access the management system
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="quinten.geurs@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full font-bold" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-[10px] text-center w-full text-muted-foreground uppercase tracking-widest font-bold">
            Secure Infrastructure
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

