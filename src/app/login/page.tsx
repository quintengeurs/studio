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
import { ArrowRight, Building2, Heart, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="max-w-4xl w-full mx-auto relative z-10 flex flex-col items-center">
          <div className="text-center space-y-4 mb-12">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                <Leaf className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-5xl font-headline font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Welcome to Hackney Parks</h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">Select your portal to access the management system or join our community of volunteers.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 w-full">
            {/* Staff Card */}
            <Card 
              className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-2xl hover:-translate-y-2 overflow-hidden flex flex-col items-center text-center"
              onClick={() => setViewMode('staff-login')}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldCheck className="h-32 w-32" />
              </div>
              <CardHeader className="space-y-4 flex flex-col items-center pt-8">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">Staff Portal</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Internal tools for park operatives, managers, and contractors.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap justify-center gap-3">
                  {['Task Management', 'Asset Tracking', 'Issue Reporting', 'Strategic Planning'].map((feat) => (
                    <Badge key={feat} variant="secondary" className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      {feat}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="w-full p-8 pt-4">
                <Button className="w-full h-12 text-base font-bold gap-2 group-hover:gap-4 transition-all shadow-lg shadow-primary/20">
                  Staff Sign In <ArrowRight className="h-5 w-5" />
                </Button>
              </CardFooter>
            </Card>

            {/* Volunteer Card */}
            <Card 
              className="border-2 hover:border-orange-500/50 transition-all cursor-pointer group hover:shadow-2xl hover:-translate-y-2 overflow-hidden flex flex-col items-center text-center"
              onClick={() => router.push('/volunteering')}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="h-32 w-32" />
              </div>
              <CardHeader className="space-y-4 flex flex-col items-center pt-8">
                <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                  <Heart className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">Volunteer Hub</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Help us maintain our parks and green spaces. No login required.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap justify-center gap-3">
                  {['Find Opportunities', 'Log Interest', 'Community News', 'Event Registration'].map((feat) => (
                    <Badge key={feat} variant="outline" className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-orange-200 text-orange-700 bg-orange-50/50">
                      {feat}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="w-full p-8 pt-4">
                <Button className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 gap-2 group-hover:gap-4 transition-all shadow-lg shadow-orange-500/20 border-0">
                  Join Volunteers <ArrowRight className="h-5 w-5" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="text-center pt-16">
             <div className="h-px w-24 bg-border mx-auto mb-6" />
             <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-60">
               Hackney Council • Parks & Green Spaces Management
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

