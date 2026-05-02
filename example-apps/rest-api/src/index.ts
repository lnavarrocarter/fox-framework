import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

// In-memory store (replace with @foxframework/db-postgres in production)
interface Todo { id: number; title: string; completed: boolean; createdAt: string; }
let todos: Todo[] = [];
let nextId = 1;

app.get('/health', (_req, res) => res.json({ status: 'healthy' }));

app.get('/todos', (_req, res: Response) => res.json(todos));

app.get('/todos/:id', (req: Request, res: Response) => {
  const todo = todos.find(t => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: 'Todo not found' }) as any;
  res.json(todo);
});

app.post('/todos', (req: Request, res: Response) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' }) as any;
  const todo: Todo = { id: nextId++, title, completed: false, createdAt: new Date().toISOString() };
  todos.push(todo);
  res.status(201).json(todo);
});

app.patch('/todos/:id', (req: Request, res: Response) => {
  const idx = todos.findIndex(t => t.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Todo not found' }) as any;
  todos[idx] = { ...todos[idx], ...req.body };
  res.json(todos[idx]);
});

app.delete('/todos/:id', (req: Request, res: Response) => {
  const idx = todos.findIndex(t => t.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Todo not found' }) as any;
  const [deleted] = todos.splice(idx, 1);
  res.json(deleted);
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`Fox rest-api running on http://localhost:${PORT}`));
