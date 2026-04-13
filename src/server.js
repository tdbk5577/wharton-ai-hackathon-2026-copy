import express from 'express';
import 'dotenv/config';
import apiRoutes from './routes/api.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.static('app'));

// API routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
