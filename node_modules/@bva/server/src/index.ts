import express from 'express';
import cors from 'cors';
import { budgetRouter } from './routes/budgets';
import { categoryRouter } from './routes/categories';
import { transactionRouter } from './routes/transactions';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/budgets', budgetRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/transactions', transactionRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
