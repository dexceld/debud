import { Router } from 'express';
import type { CategoryGroup, Category } from '@bva/shared';

const router = Router();

const groups: CategoryGroup[] = [
  { id: '1', userId: 'user1', name: 'הוצאות רכב', color: '#FF6B6B' },
  { id: '2', userId: 'user1', name: 'הוצאות דירה', color: '#4ECDC4' },
  { id: '3', userId: 'user1', name: 'מזון וקניות', color: '#45B7D1' },
  { id: '4', userId: 'user1', name: 'בילוי ופנאי', color: '#96CEB4' },
  { id: '5', userId: 'user1', name: 'הכנסות', color: '#2ECC71' },
];

const categories: Category[] = [
  { id: '101', groupId: '1', name: 'דלק', type: 'expense' },
  { id: '102', groupId: '1', name: 'טיפולים', type: 'expense' },
  { id: '103', groupId: '1', name: 'ביטוח', type: 'expense' },
  { id: '201', groupId: '2', name: 'שכירות', type: 'expense' },
  { id: '202', groupId: '2', name: 'ארנונה', type: 'expense' },
  { id: '203', groupId: '2', name: 'חשמל', type: 'expense' },
  { id: '301', groupId: '3', name: 'מכולת', type: 'expense' },
  { id: '302', groupId: '3', name: 'ירקות ופירות', type: 'expense' },
  { id: '401', groupId: '4', name: 'מסעדות', type: 'expense' },
  { id: '402', groupId: '4', name: 'קולנוע', type: 'expense' },
  { id: '501', groupId: '5', name: 'משכורת', type: 'income' },
  { id: '502', groupId: '5', name: 'הכנסות נוספות', type: 'income' },
];

router.get('/groups', (req, res) => {
  res.json(groups);
});

router.post('/groups', (req, res) => {
  const { name, color }: { name: string; color: string } = req.body;
  const newGroup: CategoryGroup = {
    id: String(Date.now()),
    userId: 'user1',
    name,
    color,
  };
  groups.push(newGroup);
  res.json({ success: true, data: newGroup });
});

router.get('/', (req, res) => {
  res.json(categories);
});

router.post('/', (req, res) => {
  const { groupId, name, type }: { groupId: string; name: string; type: 'expense' | 'income' } = req.body;
  const newCategory: Category = {
    id: String(Date.now()),
    groupId,
    name,
    type,
  };
  categories.push(newCategory);
  res.json({ success: true, data: newCategory });
});

export { router as categoryRouter };
