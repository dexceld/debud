import { Router } from 'express';
import type { Transaction } from '@bva/shared';

const router = Router();

const transactions: Transaction[] = [];

router.get('/', (req, res) => {
  const { categoryId, month } = req.query;
  let result = transactions;
  if (categoryId) {
    result = result.filter((t) => t.categoryId === categoryId);
  }
  if (month) {
    result = result.filter((t) => t.month === month);
  }
  res.json(result);
});

router.post('/', (req, res) => {
  const { categoryId, month, actualAmount, notes }: 
    { categoryId: string; month: string; actualAmount: number; notes?: string } = req.body;
  const newTransaction: Transaction = {
    id: String(Date.now()),
    categoryId,
    month,
    actualAmount,
    notes,
    date: new Date().toISOString(),
  };
  transactions.push(newTransaction);
  res.json({ success: true, data: newTransaction });
});

export { router as transactionRouter };
