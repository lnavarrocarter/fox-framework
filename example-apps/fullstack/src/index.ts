import express, { Request, Response, NextFunction } from 'express';
import { createAgentSseHandler } from '@foxframework/core/dist/tsfox/core/agents/streaming/create-agent-sse-handler';
import { ReActAgent } from '@foxframework/core/dist/tsfox/core/agents/react/react.agent';
import { HttpTool } from '@foxframework/core/dist/tsfox/core/agents/tools/http.tool';
import { CalculatorTool } from '@foxframework/core/dist/tsfox/core/agents/tools/calculator.tool';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

// ── In-memory stores (replace with @foxframework/db-postgres in production) ─
interface User { id: number; email: string; passwordHash: string; role: 'user' | 'admin'; }
interface Post { id: number; title: string; body: string; authorId: number; createdAt: string; }
const users: User[] = [];
const posts: Post[] = [];
let nextUserId = 1, nextPostId = 1;

// Simplistic hash — use bcrypt in production
function hashPw(pw: string) { return Buffer.from(pw).toString('base64'); }
function verifyPw(pw: string, hash: string) { return hashPw(pw) === hash; }

// ── Middleware ─────────────────────────────────────────────────────────────
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' }) as any;
  try {
    (req as any).user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── App ─────────────────────────────────────────────────────────────────────
async function main() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'healthy', version: '1.0.0' }));

  // Auth
  app.post('/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' }) as any;
    if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email taken' }) as any;
    const user: User = { id: nextUserId++, email, passwordHash: hashPw(password), role: 'user' };
    users.push(user);
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !verifyPw(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' }) as any;
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  app.get('/auth/me', authMiddleware, (req, res) => res.json((req as any).user));

  // Posts
  app.get('/posts', (_req, res) => res.json(posts));

  app.post('/posts', authMiddleware, (req, res) => {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' }) as any;
    const post: Post = { id: nextPostId++, title, body, authorId: (req as any).user.sub, createdAt: new Date().toISOString() };
    posts.push(post);
    res.status(201).json(post);
  });

  app.delete('/posts/:id', authMiddleware, (req, res) => {
    const idx = posts.findIndex(p => p.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' }) as any;
    const post = posts[idx];
    const user = (req as any).user;
    if (post.authorId !== user.sub && user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }) as any;
    posts.splice(idx, 1);
    res.json({ message: 'Deleted', id: post.id });
  });

  // AI Agent (requires OPENAI_API_KEY)
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const { OpenAIProvider } = await import('@foxframework/model-openai');
    const agent = new ReActAgent({
      model: new OpenAIProvider({ apiKey, model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini' }),
      tools: [HttpTool, CalculatorTool],
      systemPrompt: 'You are a helpful assistant for a blog platform.',
    });
    app.get('/ai/stream', authMiddleware, createAgentSseHandler(agent, {
      getInput: req => req.query?.q as string | undefined,
    }) as any);
    console.log('AI agent enabled');
  } else {
    console.log('AI agent disabled (set OPENAI_API_KEY to enable)');
  }

  const PORT = Number(process.env.PORT) || 3004;
  app.listen(PORT, () => console.log(`Fox fullstack running on http://localhost:${PORT}`));
}

main().catch(err => { console.error(err); process.exit(1); });
