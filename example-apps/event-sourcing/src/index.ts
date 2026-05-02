import express from 'express';

// ── Simple in-process event store ──────────────────────────────────────────
interface DomainEvent { type: string; aggregateId: string; payload: unknown; timestamp: string; sequence: number; }
const store = new Map<string, DomainEvent[]>();

function appendEvents(id: string, events: Omit<DomainEvent, 'timestamp' | 'sequence'>[]) {
  const existing = store.get(id) ?? [];
  const newEvents = events.map((e, i) => ({ ...e, timestamp: new Date().toISOString(), sequence: existing.length + i + 1 }));
  store.set(id, [...existing, ...newEvents]);
  return newEvents;
}
function loadEvents(id: string): DomainEvent[] { return store.get(id) ?? []; }

// ── BankAccount aggregate ──────────────────────────────────────────────────
interface AccountState { id: string; owner: string; balance: number; isClosed: boolean; }

function applyEvent(state: AccountState, event: DomainEvent): AccountState {
  switch (event.type) {
    case 'AccountOpened': return { ...state, ...(event.payload as any) };
    case 'MoneyDeposited': return { ...state, balance: state.balance + (event.payload as any).amount };
    case 'MoneyWithdrawn': return { ...state, balance: state.balance - (event.payload as any).amount };
    case 'AccountClosed': return { ...state, isClosed: true };
    default: return state;
  }
}

function rehydrate(id: string): AccountState | null {
  const events = loadEvents(id);
  if (events.length === 0) return null;
  return events.reduce((s, e) => applyEvent(s, e), { id, owner: '', balance: 0, isClosed: false });
}

// ── API ───────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'healthy' }));

// Open account
app.post('/accounts', (req, res) => {
  const { id, owner, initialDeposit = 0 } = req.body;
  if (!id || !owner) return res.status(400).json({ error: 'id and owner are required' }) as any;
  if (store.has(id)) return res.status(409).json({ error: 'Account already exists' }) as any;
  appendEvents(id, [
    { type: 'AccountOpened', aggregateId: id, payload: { id, owner, balance: 0 } },
    ...(initialDeposit > 0 ? [{ type: 'MoneyDeposited', aggregateId: id, payload: { amount: initialDeposit } }] : []),
  ]);
  res.status(201).json(rehydrate(id));
});

// Get current state
app.get('/accounts/:id', (req, res) => {
  const state = rehydrate(req.params.id);
  if (!state) return res.status(404).json({ error: 'Account not found' }) as any;
  res.json(state);
});

// Get event history
app.get('/accounts/:id/events', (req, res) => {
  const events = loadEvents(req.params.id);
  if (events.length === 0) return res.status(404).json({ error: 'Account not found' }) as any;
  res.json(events);
});

// Deposit
app.post('/accounts/:id/deposit', (req, res) => {
  const state = rehydrate(req.params.id);
  if (!state) return res.status(404).json({ error: 'Account not found' }) as any;
  if (state.isClosed) return res.status(422).json({ error: 'Account is closed' }) as any;
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' }) as any;
  appendEvents(req.params.id, [{ type: 'MoneyDeposited', aggregateId: req.params.id, payload: { amount } }]);
  res.json(rehydrate(req.params.id));
});

// Withdraw
app.post('/accounts/:id/withdraw', (req, res) => {
  const state = rehydrate(req.params.id);
  if (!state) return res.status(404).json({ error: 'Account not found' }) as any;
  if (state.isClosed) return res.status(422).json({ error: 'Account is closed' }) as any;
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' }) as any;
  if (state.balance < amount) return res.status(422).json({ error: 'Insufficient funds' }) as any;
  appendEvents(req.params.id, [{ type: 'MoneyWithdrawn', aggregateId: req.params.id, payload: { amount } }]);
  res.json(rehydrate(req.params.id));
});

// Close account
app.delete('/accounts/:id', (req, res) => {
  const state = rehydrate(req.params.id);
  if (!state) return res.status(404).json({ error: 'Account not found' }) as any;
  if (state.isClosed) return res.status(422).json({ error: 'Already closed' }) as any;
  appendEvents(req.params.id, [{ type: 'AccountClosed', aggregateId: req.params.id, payload: {} }]);
  res.json({ message: 'Account closed', id: req.params.id });
});

const PORT = Number(process.env.PORT) || 3003;
app.listen(PORT, () => console.log(`Fox event-sourcing running on http://localhost:${PORT}`));
