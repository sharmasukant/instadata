export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export function normalizeUrl(url: string): string {
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

export function parseCount(value: unknown): number {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    const multipliers: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
    const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
    if (match) {
      const num = parseFloat(match[1]!);
      const mult = match[2] ? multipliers[match[2].toUpperCase()] || 1 : 1;
      return Math.round(num * mult);
    }
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function calculateEngagementRate(likes: number, comments: number, followers: number): number {
  if (followers === 0) return 0;
  return parseFloat((((likes + comments) / followers) * 100).toFixed(2));
}

export function estimateRevenue(followers: number, engagementRate: number): { min: number; max: number } {
  // Industry-standard CPM-based estimation
  const baseCpm = 5; // $5 per 1000 impressions
  const engagementMultiplier = Math.max(1, engagementRate / 2);
  const estimatedReach = followers * 0.1; // 10% average reach
  const baseRevenue = (estimatedReach / 1000) * baseCpm * engagementMultiplier;
  return {
    min: Math.round(baseRevenue * 0.5),
    max: Math.round(baseRevenue * 2),
  };
}
