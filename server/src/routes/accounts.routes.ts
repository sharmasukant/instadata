import { Router, type Request, type Response } from 'express';
import { AccountsService } from '../services/accounts.service.js';

const router = Router();
const service = new AccountsService();

// Add a new account
router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { url } = req.body as { url?: string };
    console.log('[accounts] add requested', { url });
    if (!url || typeof url !== 'string') {
      console.warn('[accounts] add rejected: missing url');
      return res.status(400).json({ error: 'URL is required' });
    }
    const account = await service.addAccount(url);
    console.log('[accounts] add succeeded', {
      id: account.id,
      platform: account.platform,
      username: account.username,
    });
    return res.status(201).json(account);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add account';
    console.error('[accounts] add failed', { message });
    return res.status(400).json({ error: message });
  }
});

// List all accounts
router.get('/accounts', (_req: Request, res: Response) => {
  const accounts = service.getAccounts();
  console.log('[accounts] list returned', { count: accounts.length });
  return res.json(accounts);
});

// Get single account
router.get('/accounts/:id', (req: Request, res: Response) => {
  const account = service.getAccount(req.params.id as string);
  console.log('[accounts] get requested', { id: req.params.id, found: !!account });
  if (!account) return res.status(404).json({ error: 'Account not found' });
  return res.json(account);
});

// Delete account
router.delete('/accounts/:id', (req: Request, res: Response) => {
  const deleted = service.deleteAccount(req.params.id as string);
  console.log('[accounts] delete requested', { id: req.params.id, deleted });
  if (!deleted) return res.status(404).json({ error: 'Account not found' });
  return res.json({ success: true });
});

// Refresh account analytics
router.patch('/accounts/:id/refresh', async (req: Request, res: Response) => {
  try {
    console.log('[accounts] refresh requested', { id: req.params.id });
    const account = await service.refreshAccount(req.params.id as string);
    console.log('[accounts] refresh succeeded', {
      id: account.id,
      platform: account.platform,
      username: account.username,
    });
    return res.json(account);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh';
    console.error('[accounts] refresh failed', { id: req.params.id, message });
    return res.status(400).json({ error: message });
  }
});

// Toggle favorite
router.patch('/accounts/:id/favorite', (req: Request, res: Response) => {
  const account = service.toggleFavorite(req.params.id as string);
  console.log('[accounts] favorite toggled', { id: req.params.id, found: !!account });
  if (!account) return res.status(404).json({ error: 'Account not found' });
  return res.json(account);
});

// Dashboard summary
router.get('/dashboard', (_req: Request, res: Response) => {
  const summary = service.getDashboardSummary();
  console.log('[accounts] dashboard returned', { totalAccounts: summary.totalAccounts });
  return res.json(summary);
});

export default router;
