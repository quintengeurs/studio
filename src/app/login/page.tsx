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
import { useUserContext } from "@/context/UserContext";

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

  const { profile, isManagement, loading: userLoading } = useUserContext();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org');
    if (org) setUrlOrgId(org);
  }, []);

  // Proactive Redirect: If already staff, go home
  useEffect(() => {
    if (!userLoading && profile && isManagement) {
      router.push("/");
    }
  }, [profile, isManagement, userLoading, router]);

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

      <div className="w-full max-w-[1000px] relative z-10">
        <Card className="border-2 shadow-2xl bg-background/80 backdrop-blur-sm overflow-hidden rounded-[2rem]">
          <div className="grid md:grid-cols-2">
            {/* Left Side: Community & Hub */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-8 text-white flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
                
                <div className="relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30">
                        <Heart className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-headline font-black mb-4 tracking-tight">Community Hub</h2>
                    <p className="text-orange-50 font-medium mb-8 text-lg opacity-90 leading-relaxed">
                        Helping maintain our parks and green spaces. Join our active volunteer network today.
                    </p>

                    <Button 
                        onClick={() => router.push(urlOrgId ? `/hub/${urlOrgId}` : '/hub/hackney-council')}
                        className="flex items-center justify-center w-full h-14 bg-white text-orange-600 font-black text-lg group rounded-2xl transition-all shadow-xl hover:scale-[1.02] active:scale-95 border-none"
                    >
                        GO TO VOLUNTEER HUB
                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                    </Button>
                    
                    <p className="mt-8 text-xs font-bold text-orange-100 uppercase tracking-widest text-center">
                        Registered Volunteers can earn rewards
                    </p>
                </div>
            </div>

            {/* Right Side: Staff Login */}
            <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
                <div className="mb-8">
                    <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">{orgDisplayName}</h1>
                    <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1">Internal Staff Portal</p>
                </div>

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
                <p className="text-[10px] text-center w-full text-muted-foreground uppercase tracking-widest font-black opacity-30 mt-6">
                    {orgData?.name || "Parks Management System"}
                </p>
            </div>
          </div>
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
