import { useAccounts, useDashboardSummary } from "@/hooks/use-accounts";
import { SummaryCard } from "@/components/cards/summary-card";
import { AnalyticsCard } from "@/components/cards/analytics-card";
import { SkeletonCard } from "@/components/cards/skeleton-card";
import { EmptyState } from "@/components/common/empty-state";
import { AddLinkModal } from "@/components/modals/add-link-modal";
import { Users, Activity, PlaySquare, DollarSign, LayoutDashboard } from "lucide-react";

export function DashboardPage() {
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();

  const isLoading = isSummaryLoading || isAccountsLoading;
  const estimatedRevenue = summary?.estimatedRevenue || { min: 0, max: 0 };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Your social media performance across all connected platforms.
          </p>
        </div>
        <div className="md:hidden">
          <AddLinkModal />
        </div>
      </div>

      {!isLoading && summary && summary.totalAccounts === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No accounts tracked yet"
          description="Add your first social media account to start tracking analytics and seeing your dashboard."
          action={<AddLinkModal />}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Audience"
              value={isLoading ? "..." : (summary?.totalFollowers || 0).toLocaleString()}
              icon={Users}
              className="bg-card/40"
            />
            <SummaryCard
              title="Avg. Engagement"
              value={isLoading ? "..." : `${summary?.averageEngagement || 0}%`}
              icon={Activity}
              className="bg-card/40"
            />
            <SummaryCard
              title="Content Volume"
              value={isLoading ? "..." : (summary?.totalPosts || 0).toLocaleString()}
              icon={PlaySquare}
              description="Total posts & videos"
              className="bg-card/40"
            />
            <SummaryCard
              title="Est. Revenue (Min)"
              value={isLoading ? "..." : `$${estimatedRevenue.min.toLocaleString()}`}
              icon={DollarSign}
              description="Monthly potential"
              className="bg-card/40"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Top Accounts</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {isLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                accounts?.slice(0, 3).map((account) => (
                  <AnalyticsCard key={account.id} account={account} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
