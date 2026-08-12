import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreVertical, ExternalLink, RefreshCw, Trash2, Heart, TrendingUp } from "lucide-react";
import { API_URL, StoredAccount } from "@/lib/api-client";
import { getPlatformConfig } from "@/lib/platforms";
import { useDeleteAccount, useRefreshAccount, useToggleFavorite } from "@/hooks/use-accounts";
import { cn } from "@/lib/utils";

interface AnalyticsCardProps {
  account: StoredAccount;
}

function formatNumber(num: number | undefined | null): string {
  num = num || 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

function getImageSrc(src: string): string {
  if (!src.startsWith('http://') && !src.startsWith('https://')) {
    return src;
  }

  return `${API_URL}/image-proxy?url=${encodeURIComponent(src)}`;
}

export function AnalyticsCard({ account }: AnalyticsCardProps) {
  const { analytics, platform, id, favorite } = account;
  const estimatedRevenue = analytics.estimatedRevenue || { min: 0, max: 0 };
  const config = getPlatformConfig(platform);
  const Icon = config.icon;

  const deleteMutation = useDeleteAccount();
  const refreshMutation = useRefreshAccount();
  const toggleFavorite = useToggleFavorite();

  return (
    <Card className="glass-card overflow-hidden flex flex-col group relative">
      {/* Top color bar */}
      <div className={cn("h-2 w-full absolute top-0 left-0", config.bgClass)} />
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              {analytics.profileImage ? (
                <img 
                  src={getImageSrc(analytics.profileImage)} 
                  alt={analytics.username} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-background shadow-sm"
                  onError={(e) => {
                    const image = e.target as HTMLImageElement;
                    image.onerror = null;
                    image.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(analytics.displayName || analytics.username)}&background=random`;
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center text-white", config.bgClass)}>
                <Icon className="w-3 h-3" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-base leading-tight text-foreground truncate max-w-[120px]">
                  {analytics.displayName}
                </h3>
                {analytics.verified && (
                  <Badge variant="secondary" className="px-1 py-0 h-4 text-[10px] bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-sm">✓</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate max-w-[140px]">
                @{analytics.username}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => window.open(account.profileUrl, "_blank")}
                className="cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => refreshMutation.mutate(id)}
                disabled={refreshMutation.isPending}
                className="cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", refreshMutation.isPending && "animate-spin")} />
                Refresh Data
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => toggleFavorite.mutate(id)}
                className="cursor-pointer"
              >
                <Heart className={cn("w-4 h-4 mr-2", favorite && "fill-rose-500 text-rose-500")} />
                {favorite ? "Remove Favorite" : "Add to Favorites"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => deleteMutation.mutate(id)}
                className="text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Followers</p>
            <p className="font-semibold text-xl tracking-tight">{formatNumber(analytics.followers)}</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Engagement</p>
            <div className="flex items-end gap-1.5">
              <p className="font-semibold text-xl tracking-tight text-emerald-500">{analytics.engagementRate || 0}%</p>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mb-1" />
            </div>
          </div>
          
          <div className="bg-muted/40 rounded-xl p-3 col-span-2">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-muted-foreground">Est. Monthly Rev.</p>
              <Badge variant="outline" className="font-normal text-[10px] h-4 py-0">Beta</Badge>
            </div>
            <p className="font-medium text-sm">
              ${formatNumber(estimatedRevenue.min)} - ${formatNumber(estimatedRevenue.max)}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/50 pt-3">
          <span>{analytics.category || "General"}</span>
          <span>Updated {new Date(account.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Card>
  );
}
