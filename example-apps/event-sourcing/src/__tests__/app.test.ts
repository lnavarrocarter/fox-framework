/**
 * Tests for event-sourcing example (Bank Account with Event Sourcing)
 */
import request from 'supertest';
import { app } from '../index';

describe('event-sourcing', () => {
  const accountId = 'acc-test-1';
  const owner = 'Alice';

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'healthy' });
    });
  });

  describe('Account lifecycle', () => {
    it('POST /accounts — should open a new account', async () => {
      const res = await request(app)
        .post('/accounts')
        .send({ id: accountId, owner, initialDeposit: 100 });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: accountId, owner, balance: 100, isClosed: false });
    });

    it('POST /accounts — should open account without initial deposit', async () => {
      const res = await request(app)
        .post('/accounts')
        .send({ id: 'acc-zero', owner: 'Bob' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'acc-zero', owner: 'Bob', balance: 0 });
    });

    it('POST /accounts — should reject duplicate account', async () => {
      const res = await request(app)
        .post('/accounts')
        .send({ id: accountId, owner });
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'Account already exists');
    });

    it('POST /accounts — should require id and owner', async () => {
      const res = await request(app).post('/accounts').send({});
      expect(res.status).toBe(400);
    });

    it('GET /accounts/:id — should return current state', async () => {
      const res = await request(app).get(`/accounts/${accountId}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: accountId, owner, balance: 100 });
    });

    it('GET /accounts/:id — should return 404 for unknown account', async () => {
      const res = await request(app).get('/accounts/nonexistent');
      expect(res.status).toBe(404);
    });

    it('GET /accounts/:id/events — should return event history', async () => {
      const res = await request(app).get(`/accounts/${accountId}/events`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // AccountOpened + MoneyDeposited
      expect(res.body[0]).toHaveProperty('type', 'AccountOpened');
      expect(res.body[0]).toHaveProperty('aggregateId', accountId);
      expect(res.body[0]).toHaveProperty('timestamp');
      expect(res.body[0]).toHaveProperty('sequence');
      // sequence numbers should increase
      const seqs = res.body.map((e: any) => e.sequence);
      for (let i = 1; i < seqs.length; i++) {
        expect(seqs[i]).toBeGreaterThan(seqs[i - 1]);
      }
    });

    it('POST /accounts/:id/deposit — should increase balance', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/deposit`)
        .send({ amount: 50 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('balance', 150);
    });

    it('POST /accounts/:id/deposit — should reject zero or negative amount', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/deposit`)
        .send({ amount: 0 });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'amount must be positive');
    });

    it('POST /accounts/:id/deposit — should reject missing amount', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/deposit`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('POST /accounts/:id/withdraw — should decrease balance', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/withdraw`)
        .send({ amount: 60 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('balance', 90);
    });

    it('POST /accounts/:id/withdraw — should reject insufficient funds', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/withdraw`)
        .send({ amount: 9999 });
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('error', 'Insufficient funds');
    });

    it('POST /accounts/:id/withdraw — should reject negative amount', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/withdraw`)
        .send({ amount: -5 });
      expect(res.status).toBe(400);
    });

    it('DELETE /accounts/:id — should close account', async () => {
      const res = await request(app).delete(`/accounts/${accountId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Account closed');
      expect(res.body).toHaveProperty('id', accountId);
    });

    it('DELETE /accounts/:id — should reject already-closed account', async () => {
      const res = await request(app).delete(`/accounts/${accountId}`);
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('error', 'Already closed');
    });

    it('POST /accounts/:id/deposit — should reject deposit on closed account', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/deposit`)
        .send({ amount: 10 });
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('error', 'Account is closed');
    });

    it('POST /accounts/:id/withdraw — should reject withdraw on closed account', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/withdraw`)
        .send({ amount: 10 });
      expect(res.status).toBe(422);
    });

    it('should reject operations on non-existent account', async () => {
      const depositRes = await request(app)
        .post('/accounts/nobody/deposit')
        .send({ amount: 10 });
      expect(depositRes.status).toBe(404);

      const withdrawRes = await request(app)
        .post('/accounts/nobody/withdraw')
        .send({ amount: 10 });
      expect(withdrawRes.status).toBe(404);

      const closeRes = await request(app).delete('/accounts/nobody');
      expect(closeRes.status).toBe(404);

      const eventsRes = await request(app).get('/accounts/nobody/events');
      expect(eventsRes.status).toBe(404);
    });
  });

  describe('Event replay integrity', () => {
    it('should correctly replay events to compute balance', async () => {
      const id = 'acc-replay';
      // Open with 200
      await request(app).post('/accounts').send({ id, owner: 'Charlie', initialDeposit: 200 });
      // Deposit 100
      await request(app).post(`/accounts/${id}/deposit`).send({ amount: 100 });
      // Withdraw 50
      await request(app).post(`/accounts/${id}/withdraw`).send({ amount: 50 });
      // Deposit 25
      await request(app).post(`/accounts/${id}/deposit`).send({ amount: 25 });

      const res = await request(app).get(`/accounts/${id}`);
      expect(res.status).toBe(200);
      // 200 + 100 - 50 + 25 = 275
      expect(res.body.balance).toBe(275);

      // Verify event count
      const eventsRes = await request(app).get(`/accounts/${id}/events`);
      // AccountOpened + MoneyDeposited(initial 200) + MoneyDeposited(100) + MoneyWithdrawn(50) + MoneyDeposited(25) = 5
      expect(eventsRes.body.length).toBe(5);
    });
  });
});
