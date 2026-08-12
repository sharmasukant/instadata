import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ACCOUNTS_KEY,
  DASHBOARD_SUMMARY_KEY,
  useAddAccount,
  useMetaAuthStatus,
} from "@/hooks/use-accounts";
import { getPlatformConfig, PLATFORMS } from "@/lib/platforms";
import { Loader2, Plus, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api-client";
import { toast } from "sonner";

export function AddLinkModal({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const loginPopupRef = useRef<Window | null>(null);
  const loginPollTimerRef = useRef<number | null>(null);
  
  const addAccount = useAddAccount();
  const queryClient = useQueryClient();
  const { data: authStatus, refetch: refetchAuth } = useMetaAuthStatus();

  const handleMetaAuthComplete = async () => {
    const result = await refetchAuth();
    queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });

    const latestStatus = result.data;
    const hasAccess =
      selectedPlatform === 'instagram'
        ? !!latestStatus?.hasInstagram
        : selectedPlatform === 'facebook'
          ? !!latestStatus?.hasFacebook
          : !!latestStatus?.connected;

    if (hasAccess) {
      toast.success("Meta authentication connected. Add the profile URL now.");
    } else if (latestStatus?.connected) {
      toast.warning("Meta connected, but Instagram Business access is still missing.");
    } else {
      toast.error("Meta authentication did not complete. Please try again.");
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'META_AUTH_SUCCESS') return;
      loginPopupRef.current?.close();
      handleMetaAuthComplete();
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (loginPollTimerRef.current) {
        window.clearInterval(loginPollTimerRef.current);
      }
    };
  }, [selectedPlatform]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      refetchAuth();
    }
    if (!newOpen) {
      setTimeout(() => {
        setSelectedPlatform(null);
        setUrl("");
        addAccount.reset();
      }, 200);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !selectedPlatform) return;
    
    addAccount.mutate(url, {
      onSuccess: () => {
        handleOpenChange(false);
      }
    });
  };

  const handleMetaLogin = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      `${API_URL}/auth/facebook/login`, 
      'meta-login', 
      `width=${width},height=${height},left=${left},top=${top}`
    );
    loginPopupRef.current = popup;

    // Poll to see if popup closed to refetch status
    if (loginPollTimerRef.current) {
      window.clearInterval(loginPollTimerRef.current);
    }

    loginPollTimerRef.current = window.setInterval(() => {
      if (popup?.closed) {
        if (loginPollTimerRef.current) {
          window.clearInterval(loginPollTimerRef.current);
          loginPollTimerRef.current = null;
        }
        handleMetaAuthComplete();
      }
    }, 1000);
  };

  const platformConfig = selectedPlatform ? getPlatformConfig(selectedPlatform) : null;

  // Determine if this platform requires Meta auth and if we are authenticated
  const isMetaPlatform = selectedPlatform === 'instagram' || selectedPlatform === 'facebook';
  const isInstagramPlatform = selectedPlatform === 'instagram';
  const needsMetaAuth =
    selectedPlatform === 'instagram'
      ? !authStatus?.connected || !authStatus?.hasInstagram
      : selectedPlatform === 'facebook'
        ? !authStatus?.connected || !authStatus?.hasFacebook
        : false;
  const hasPartialInstagramAuth = selectedPlatform === 'instagram' && authStatus?.connected && !authStatus.hasInstagram;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2 rounded-full">
            <Plus className="w-4 h-4" />
            Add Account
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md border-border/50 glass-card">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {selectedPlatform ? `Add ${platformConfig?.name} Account` : "Select Platform"}
          </DialogTitle>
          <DialogDescription>
            {selectedPlatform && !needsMetaAuth
              ? `Enter the URL or username for the ${platformConfig?.name} profile.`
              : selectedPlatform && needsMetaAuth 
              ? `${isInstagramPlatform ? 'Instagram uses Meta/Facebook verification' : 'Facebook verification is required'} to fetch data from ${platformConfig?.name}.`
              : "Choose the social media platform you want to track."}
          </DialogDescription>
        </DialogHeader>

        {!selectedPlatform ? (
          <div className="grid grid-cols-4 gap-3 py-4">
            {Object.values(PLATFORMS).map((platform) => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 hover:border-primary/30 transition-all duration-200 group"
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform group-hover:scale-110",
                  platform.bgClass
                )}>
                  <platform.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">{platform.name}</span>
              </button>
            ))}
          </div>
        ) : needsMetaAuth ? (
           <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl border border-border/50 bg-blue-500/10 text-center">
              <h4 className="font-semibold mb-2">
                {isInstagramPlatform ? "Connect Instagram via Facebook" : "Facebook Verification Required"}
              </h4>
              <p className="text-sm text-muted-foreground mb-6">
                {isInstagramPlatform
                  ? "Instagram Business data is approved through Meta's Facebook Login for Business flow."
                  : `To fetch data for ${platformConfig?.name}, connect Facebook and allow the required permissions.`}
              </p>
              
              <Button 
                type="button" 
                onClick={handleMetaLogin}
                className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-full h-11"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
                {isInstagramPlatform ? "Continue with Facebook" : "Connect with Facebook"}
              </Button>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border/50">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedPlatform(null)}
                className="w-full"
              >
                Back
              </Button>
            </div>
           </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/50 mb-6">
               <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0",
                  platformConfig?.bgClass
                )}>
                  {platformConfig && <platformConfig.icon className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-medium">Connecting to {platformConfig?.name}</h4>
                  <p className="text-sm text-muted-foreground">Supported format: {platformConfig?.domain}/username</p>
                  {isMetaPlatform && (
                    <p className={cn(
                      "text-[10px] font-medium mt-1",
                      hasPartialInstagramAuth ? "text-amber-500" : "text-emerald-500"
                    )}>
                      {hasPartialInstagramAuth
                        ? "Meta connected; Instagram Business data pending"
                        : "Meta Account Connected"}
                    </p>
                  )}
                </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`https://${platformConfig?.domain}/username`}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9 h-11 bg-background"
                  autoFocus
                  disabled={addAccount.isPending}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedPlatform(null)}
                className="w-full"
                disabled={addAccount.isPending}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="w-full"
                disabled={!url || addAccount.isPending}
              >
                {addAccount.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Data...
                  </>
                ) : (
                  "Add Account"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
