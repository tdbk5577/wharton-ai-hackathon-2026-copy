import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDirectory = path.resolve(__dirname, '../app');
const userDirectory = path.resolve(__dirname, '../user/dist');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use('/user', express.static(userDirectory));
app.use(express.static(appDirectory));

app.get('/user', (req, res) => {
  res.sendFile(path.join(userDirectory, 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(appDirectory, 'index.html'));
});

// API routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
