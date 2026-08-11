import { useAccounts } from "@/hooks/use-accounts";
import { AnalyticsCard } from "@/components/cards/analytics-card";
import { SkeletonCard } from "@/components/cards/skeleton-card";
import { EmptyState } from "@/components/common/empty-state";
import { AddLinkModal } from "@/components/modals/add-link-modal";
import { Users } from "lucide-react";

export function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tracked Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all your connected social media profiles.
          </p>
        </div>
        <AddLinkModal />
      </div>
      {!isLoading && accounts?.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No accounts tracked"
          description="You are not tracking any accounts yet. Add a profile link to get started."
          action={<AddLinkModal />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            accounts?.map((account) => (
              <AnalyticsCard key={account.id} account={account} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
