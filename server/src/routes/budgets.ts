import { Router } from 'express';
import type { MonthData, AccountSnapshot } from '@bva/shared';

const router = Router();

const mockData: Record<string, MonthData> = {
  '2024-01': {
    month: '2024-01',
    openingBalance: 5000,
    groups: [],
    totalBudgeted: 0,
    totalActual: 0,
    remaining: 5000,
  },
};

router.get('/months/:month', (req, res) => {
  const { month } = req.params;
  const data = mockData[month] || {
    month,
    openingBalance: 0,
    groups: [],
    totalBudgeted: 0,
    totalActual: 0,
    remaining: 0,
  };
  res.json(data);
});

router.post('/opening-balance', (req, res) => {
  const { month, openingBalance }: { month: string; openingBalance: number } = req.body;
  if (!mockData[month]) {
    mockData[month] = {
      month,
      openingBalance,
      groups: [],
      totalBudgeted: 0,
      totalActual: 0,
      remaining: openingBalance,
    };
  } else {
    mockData[month].openingBalance = openingBalance;
    mockData[month].remaining = openingBalance - mockData[month].totalActual;
  }
  res.json({ success: true, data: mockData[month] });
});

export { router as budgetRouter };
