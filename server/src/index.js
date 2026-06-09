import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import electionRoutes from './routes/elections.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'campus-voting-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/admin', adminRoutes);

app.use((error, _req, res, _next) => {
  if (error.name === 'ZodError') {
    return res.status(400).json({ message: 'Validation failed.', issues: error.issues });
  }

  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

app.listen(port, () => {
  console.log(`Campus voting API running on http://localhost:${port}`);
});
