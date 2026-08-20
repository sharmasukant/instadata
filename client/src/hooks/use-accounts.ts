import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, StoredAccount, DashboardSummary } from '../lib/api-client';
import { toast } from 'sonner';

export const ACCOUNTS_KEY = ['accounts'];
export const DASHBOARD_SUMMARY_KEY = ['dashboard-summary'];

export function useAccounts() {
  return useQuery<StoredAccount[]>({
    queryKey: ACCOUNTS_KEY,
    queryFn: accountsApi.getAccounts,
  });
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: DASHBOARD_SUMMARY_KEY,
    queryFn: accountsApi.getDashboardSummary,
  });
}

export function useMetaAuthStatus() {
  return useQuery({
    queryKey: ['meta-auth-status'],
    queryFn: accountsApi.getMetaAuthStatus,
  });
}

export function useAddAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => accountsApi.addAccount(url),
    onSuccess: (data) => {
      toast.success(`Successfully added @${data.username} from ${data.platform}`);
      queryClient.setQueryData<StoredAccount[]>(ACCOUNTS_KEY, (current) => {
        if (!current) return [data];
        if (current.some((account) => account.id === data.id)) return current;
        return [data, ...current];
      });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || error.message || 'Failed to add account';
      toast.error(message);
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountsApi.deleteAccount(id),
    onSuccess: () => {
      toast.success('Account removed successfully');
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove account');
    },
  });
}

export function useRefreshAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountsApi.refreshAccount(id),
    onSuccess: (data) => {
      toast.success(`Refreshed data for @${data.username}`);
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to refresh account');
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountsApi.toggleFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update favorite status');
    },
  });
}
