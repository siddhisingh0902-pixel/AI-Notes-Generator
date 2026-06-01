import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testConnection } from './config/db';
import authRouter from './routes/authRoutes';
import syllabusRouter from './routes/syllabusRoutes';
import apiRouter from './routes/apiRoutes';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/syllabi', syllabusRouter);
app.use('/api', apiRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await testConnection();
});