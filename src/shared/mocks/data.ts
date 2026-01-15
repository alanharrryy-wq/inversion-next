export type MockUser = {
  id: string;
  name: string;
  tier: 'starter' | 'pro' | 'vip';
};

export type MockHolding = {
  symbol: string;
  name: string;
  allocationPct: number; // 0-100
  amount: number; // MXN
  risk: 'bajo' | 'medio' | 'alto';
};

export type MockPortfolio = {
  asOf: string; // ISO date
  currency: 'MXN';
  total: number;
  dailyChangePct: number;
  holdings: MockHolding[];
};

export type MockPoint = {
  date: string; // YYYY-MM-DD
  value: number;
};

export type MockPerformance = {
  range: '7d' | '30d' | '180d' | '1y';
  points: MockPoint[];
};

export const mockUser: MockUser = {
  id: 'u_alan_001',
  name: 'Alan',
  tier: 'pro',
};

export const mockPortfolio: MockPortfolio = {
  asOf: new Date().toISOString(),
  currency: 'MXN',
  total: 256_420,
  dailyChangePct: 1.27,
  holdings: [
    { symbol: 'ETF-MX', name: 'ETF Mercado MX', allocationPct: 35, amount: 89_747, risk: 'medio' },
    { symbol: 'BONOS', name: 'Bonos Gobierno', allocationPct: 25, amount: 64_105, risk: 'bajo' },
    { symbol: 'TEC', name: 'Tech Growth', allocationPct: 20, amount: 51_284, risk: 'alto' },
    { symbol: 'CASH', name: 'Efectivo', allocationPct: 20, amount: 51_284, risk: 'bajo' },
  ],
};

function series(days: number, start: number, drift: number) {
  const out: MockPoint[] = [];
  let v = start;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const noise = (Math.random() - 0.5) * drift * 0.9;
    v = Math.max(0, v + drift + noise);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push({ date: yyyy + '-' + mm + '-' + dd, value: Math.round(v) });
  }
  return out;
}

export const mockPerformance: Record<MockPerformance['range'], MockPerformance> = {
  '7d': { range: '7d', points: series(7, 242_000, 520) },
  '30d': { range: '30d', points: series(30, 218_000, 380) },
  '180d': { range: '180d', points: series(180, 160_000, 210) },
  '1y': { range: '1y', points: series(365, 120_000, 140) },
};
