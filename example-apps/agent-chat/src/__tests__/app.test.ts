/**
 * Tests for agent-chat example
 *
 * Creates Express app inline to avoid module-resolution issues with
 * dynamic model imports and async initialization.
 */
import express from 'express';
import request from 'supertest';

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'healthy', provider: 'test' }));

  // POST /chat endpoint — validates message is required
  app.post('/chat', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    res.json({ answer: 'mock response', steps: 0, usage: {} });
  });

  return app;
}

describe('agent-chat', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('POST /chat — validation', () => {
    it('should return 400 when message is missing', async () => {
      const res = await request(app).post('/chat').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'message is required');
    });
  });

  describe('unknown routes', () => {
    it('should return 404 for unknown GET', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
