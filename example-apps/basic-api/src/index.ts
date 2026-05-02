import express from 'express';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Hello from Fox Framework!', version: '1.0.0' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Fox basic-api running on http://localhost:${PORT}`);
});
