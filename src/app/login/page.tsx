'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Leaf, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ArrowRight, Building2, Heart } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<'staff-login'>('staff-login');
  const [urlOrgId, setUrlOrgId] = useState<string | null>(null);
  const [orgData, setOrgData] = useState<{ name: string; slug: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org');
    if (org) setUrlOrgId(org);
  }, []);

  // Fetch org name from Firestore when we have a slug
  useEffect(() => {
    if (!urlOrgId) return;
    const fetchOrg = async () => {
      try {
        const snap = await getDoc(doc(db, "organizations", urlOrgId));
        if (snap.exists()) {
          const data = snap.data() as { name: string; slug: string };
          setOrgData(data);
        }
      } catch (e) {
        console.warn("Could not fetch org data:", e);
      }
    };
    fetchOrg();
  }, [urlOrgId]);

  const orgDisplayName = orgData?.name || "Hackney Parks";
  const orgBranding = orgData?.name ? `${orgData.name} • Staff Management` : "Hackney Council • Internal Systems";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem('impersonatedOrgId');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-[500px] relative z-10">
        <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20">
                    <Building2 className="h-10 w-10" />
                </div>
            </div>
            <h1 className="text-4xl font-headline font-bold tracking-tight">{orgDisplayName}</h1>
            <p className="text-muted-foreground font-medium mt-2">Internal Staff Portal</p>
        </div>

        <Card className="border-2 shadow-2xl bg-background/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>
                Authorised personnel only.
            </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6">
            {error && (
                <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Work Email</Label>
                <Input 
                    id="email" 
                    type="email" 
                    placeholder="quinten.geurs@gmail.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-muted/50 border-2 focus-visible:ring-primary/20"
                />
                </div>
                <div className="grid gap-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Password</Label>
                    <Button 
                    variant="link" 
                    className="px-0 font-bold text-[10px] uppercase h-auto text-primary" 
                    type="button"
                    onClick={() => {
                        setResetEmail(email);
                        setIsResetOpen(true);
                    }}
                    >
                    Forgot?
                    </Button>
                </div>
                <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-muted/50 border-2 focus-visible:ring-primary/20"
                />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 mt-2" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In to Portal"}
                </Button>
            </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-6 pt-2 pb-8">
                <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-dashed" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                        <span className="bg-background px-4 text-muted-foreground">Community Access</span>
                    </div>
                </div>

                <div className="w-full px-2">
                    <Link 
                        href={urlOrgId ? `/hub/${urlOrgId}` : '/volunteering'}
                        className="flex items-center justify-center w-full h-12 border-2 border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/5 text-orange-600 font-bold group rounded-xl transition-all"
                    >
                        <Heart className="mr-2 h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
                        Go to Volunteer Hub
                        <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                </div>

                <p className="text-[10px] text-center w-full text-muted-foreground uppercase tracking-widest font-bold opacity-60">
                    {orgBranding}
                </p>
            </CardFooter>
        </Card>

        {typeof window !== 'undefined' && window.location.search.includes('bypass=true') && (
            <div className="text-center mt-6">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] font-bold text-orange-500/60 hover:text-orange-500"
                    onClick={async () => {
                        setLoading(true);
                        try {
                            const { signInWithEmailAndPassword } = await import("firebase/auth");
                            await signInWithEmailAndPassword(auth, "quinten.geurs@hackney.gov.uk", "Azerty11");
                            router.push("/");
                        } catch (err: any) {
                            toast({ title: "Bypass Failed", description: err.message, variant: "destructive" });
                        } finally {
                            setLoading(false);
                        }
                    }}
                >
                    [ WALKTHROUGH BYPASS ]
                </Button>
            </div>
        )}
      </div>

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
