'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Leaf, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Building2, Heart, ArrowRight, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("quinten.geurs@gmail.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [viewMode, setViewMode] = useState<'selection' | 'staff-login'>('selection');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      console.error("Login Error:", err);
      let message = "Please check your credentials.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = "Invalid email or password. If you recently recreated this account, you may need to use your old password or use 'Forgot Password' to reset it.";
      }
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return;
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Reset Email Sent",
        description: `Check ${resetEmail} for password reset instructions.`,
      });
      setIsResetOpen(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (viewMode === 'selection') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        
        <div className="w-full max-w-4xl grid gap-8 md:grid-cols-2 relative z-10">
          <div className="md:col-span-2 text-center space-y-4 mb-4">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20">
                <Leaf className="h-10 w-10" />
              </div>
            </div>
            <h1 className="text-4xl font-headline font-bold tracking-tight">Welcome to Hackney Parks</h1>
            <p className="text-muted-foreground max-w-md mx-auto">Select your portal to access the management system or join our community of volunteers.</p>
          </div>

          {/* Staff Card */}
          <Card 
            className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
            onClick={() => setViewMode('staff-login')}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldCheck className="h-24 w-24" />
            </div>
            <CardHeader className="space-y-1">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Building2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold">Staff Portal</CardTitle>
              <CardDescription>
                Internal tools for park operatives, managers, and contractors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {['Task Management', 'Asset Tracking', 'Issue Reporting', 'Strategic Planning'].map((feat) => (
                  <li key={feat} className="text-xs flex items-center gap-2 text-muted-foreground">
                    <div className="h-1 w-1 rounded-full bg-primary" /> {feat}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full font-bold gap-2 group-hover:gap-4 transition-all">
                Staff Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Volunteer Card */}
          <Card 
            className="border-2 hover:border-orange-500/50 transition-all cursor-pointer group hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
            onClick={() => router.push('/volunteering')}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="h-24 w-24" />
            </div>
            <CardHeader className="space-y-1">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 mb-2">
                <Heart className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold">Volunteer Hub</CardTitle>
              <CardDescription>
                Help us maintain our parks and green spaces. No login required to browse.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {['Find Opportunities', 'Log Interest', 'Community News', 'Event Registration'].map((feat) => (
                  <li key={feat} className="text-xs flex items-center gap-2 text-muted-foreground">
                    <div className="h-1 w-1 rounded-full bg-orange-500" /> {feat}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full font-bold bg-orange-500 hover:bg-orange-600 gap-2 group-hover:gap-4 transition-all">
                Join Volunteers <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <div className="md:col-span-2 text-center pt-8">
             <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
               Hackney Council | Parks & Green Spaces
             </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Leaf className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-headline font-bold">Staff Login</CardTitle>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button 
                  variant="link" 
                  className="px-0 font-bold text-[10px] uppercase h-auto" 
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setIsResetOpen(true);
                  }}
                >
                  Forgot Password?
                </Button>
              </div>
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
            <Button 
              type="button" 
              variant="outline" 
              className="w-full font-bold border-dashed" 
              onClick={() => setViewMode('selection')}
            >
              Back to Selection
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-[10px] text-center w-full text-muted-foreground uppercase tracking-widest font-bold">
            Secure Infrastructure
          </p>
        </CardFooter>
      </Card>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              We'll send a password reset link to your email address.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input 
                id="reset-email" 
                type="email" 
                value={resetEmail} 
                onChange={(e) => setResetEmail(e.target.value)} 
                placeholder="name@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleResetPassword} disabled={!resetEmail || isResetting} className="w-full font-bold">
              {isResetting ? "Sending..." : "Send Reset Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

