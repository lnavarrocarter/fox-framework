# fox-event-sourcing

Event Sourcing + CQRS demo with [Fox Framework](https://foxframework.dev) — bank account aggregate.

## Concepts

- **Event Sourcing**: state is derived from an append-only event log
- **Aggregate**: `BankAccount` — rehydrated from events on every request
- **Event history**: every state change is queryable at `/accounts/:id/events`

## Run

```bash
npm install
npm run dev
```

## Endpoints

```
POST   /accounts                        Open account { id, owner, initialDeposit? }
GET    /accounts/:id                    Current state
GET    /accounts/:id/events             Full event history
POST   /accounts/:id/deposit            { amount }
POST   /accounts/:id/withdraw           { amount }
DELETE /accounts/:id                    Close account
```

## Example

```bash
# Open account
curl -X POST http://localhost:3003/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id":"acc-1","owner":"Alice","initialDeposit":1000}'

# Deposit
curl -X POST http://localhost:3003/accounts/acc-1/deposit \
  -H 'Content-Type: application/json' \
  -d '{"amount":500}'

# View full event log
curl http://localhost:3003/accounts/acc-1/events
```
