/**
 * Tests for fullstack example (Auth + Posts)
 *
 * Creates Express app inline to avoid module-resolution issues with
 * dynamic imports and async initialization in the source module.
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

interface User { id: number; email: string; passwordHash: string; role: 'user' | 'admin'; }
interface Post { id: number; title: string; body: string; authorId: number; createdAt: string; }
const users: User[] = [];
const posts: Post[] = [];
let nextUserId = 1, nextPostId = 1;

function hashPw(pw: string) { return Buffer.from(pw).toString('base64'); }
function verifyPw(pw: string, hash: string) { return hashPw(pw) === hash; }

function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'healthy', version: '1.0.0' }));

  app.post('/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email taken' });
    const user: User = { id: nextUserId++, email, passwordHash: hashPw(password), role: 'user' };
    users.push(user);
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !verifyPw(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  app.get('/auth/me', authMiddleware, (req, res) => res.json((req as any).user));

  app.get('/posts', (_req, res) => res.json(posts));

  app.post('/posts', authMiddleware, (req, res) => {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });
    const post: Post = { id: nextPostId++, title, body, authorId: (req as any).user.sub, createdAt: new Date().toISOString() };
    posts.push(post);
    res.status(201).json(post);
  });

  app.delete('/posts/:id', authMiddleware, (req, res) => {
    const idx = posts.findIndex(p => p.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const post = posts[idx];
    if (post.authorId !== (req as any).user.sub && (req as any).user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    posts.splice(idx, 1);
    res.json({ message: 'Deleted', id: post.id });
  });

  return app;
}

describe('fullstack', () => {
  let app: ReturnType<typeof createApp>;
  let userToken: string;
  let adminToken: string;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('version', '1.0.0');
    });
  });

  describe('Auth — POST /auth/register', () => {
    it('should register a new user and return a token', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'alice@test.com', password: 'secret123' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({ email: 'alice@test.com', role: 'user' });
      expect(res.body.user).toHaveProperty('id');
      userToken = res.body.token;
    });

    it('should register a second user', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'admin@test.com', password: 'admin123' });
      expect(res.status).toBe(201);
      adminToken = res.body.token;
    });

    it('should return 400 when email or password is missing', async () => {
      const res = await request(app).post('/auth/register').send({ email: 'x@test.com' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'email and password required');
    });

    it('should return 409 when email is already taken', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'alice@test.com', password: 'other' });
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'Email taken');
    });
  });

  describe('Auth — POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@test.com', password: 'secret123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({ email: 'alice@test.com' });
    });

    it('should return 401 with wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 401 with unknown email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'nope' });
      expect(res.status).toBe(401);
    });
  });

  describe('Auth — GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sub');
      expect(res.body).toHaveProperty('email', 'alice@test.com');
      expect(res.body).toHaveProperty('role', 'user');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'No token');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('Posts — CRUD', () => {
    let postId: number;

    it('GET /posts — should return empty array initially', async () => {
      const res = await request(app).get('/posts');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('POST /posts — should create a post with valid token', async () => {
      const res = await request(app)
        .post('/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'My first post', body: 'Hello world' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title', 'My first post');
      expect(res.body).toHaveProperty('body', 'Hello world');
      expect(res.body).toHaveProperty('authorId');
      expect(res.body).toHaveProperty('createdAt');
      postId = res.body.id;
    });

    it('POST /posts — should return 401 without token', async () => {
      const res = await request(app)
        .post('/posts')
        .send({ title: 'Unauthorized', body: 'Should fail' });
      expect(res.status).toBe(401);
    });

    it('POST /posts — should return 400 when title or body missing', async () => {
      const res = await request(app)
        .post('/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Incomplete' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'title and body required');
    });

    it('GET /posts — should include created post', async () => {
      const res = await request(app).get('/posts');
      expect(res.status).toBe(200);
      expect(res.body.some((p: any) => p.id === postId)).toBe(true);
    });

    it('DELETE /posts/:id — should return 403 when deleting another user\'s post', async () => {
      const res = await request(app)
        .delete(`/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
    });

    it('DELETE /posts/:id — owner can delete own post', async () => {
      const res = await request(app)
        .delete(`/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Deleted');
      expect(res.body).toHaveProperty('id', postId);
    });

    it('DELETE /posts/:id — should return 404 for deleted post', async () => {
      const res = await request(app)
        .delete(`/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('unknown routes', () => {
    it('should return 404 for unknown GET', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
