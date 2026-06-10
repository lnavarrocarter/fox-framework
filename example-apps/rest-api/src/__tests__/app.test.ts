/**
 * Tests for rest-api example (Todo CRUD)
 */
import request from 'supertest';
import { app } from '../index';

describe('rest-api', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'healthy' });
    });
  });

  describe('Todo CRUD', () => {
    let createdId: number;

    it('POST /todos — should create a todo', async () => {
      const res = await request(app)
        .post('/todos')
        .send({ title: 'Buy groceries' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title', 'Buy groceries');
      expect(res.body).toHaveProperty('completed', false);
      expect(res.body).toHaveProperty('createdAt');
      createdId = res.body.id;
    });

    it('POST /todos — should return 400 when title is missing', async () => {
      const res = await request(app).post('/todos').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'title is required');
    });

    it('GET /todos — should return all todos', async () => {
      const res = await request(app).get('/todos');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some((t: any) => t.id === createdId)).toBe(true);
    });

    it('GET /todos/:id — should return a specific todo', async () => {
      const res = await request(app).get(`/todos/${createdId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', createdId);
      expect(res.body).toHaveProperty('title', 'Buy groceries');
    });

    it('GET /todos/:id — should return 404 for missing todo', async () => {
      const res = await request(app).get('/todos/99999');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Todo not found');
    });

    it('PATCH /todos/:id — should update a todo', async () => {
      const res = await request(app)
        .patch(`/todos/${createdId}`)
        .send({ title: 'Buy organic groceries', completed: true });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', 'Buy organic groceries');
      expect(res.body).toHaveProperty('completed', true);
    });

    it('PATCH /todos/:id — should return 404 for missing todo', async () => {
      const res = await request(app).patch('/todos/99999').send({ title: 'Nope' });
      expect(res.status).toBe(404);
    });

    it('DELETE /todos/:id — should delete a todo', async () => {
      const res = await request(app).delete(`/todos/${createdId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', createdId);
    });

    it('DELETE /todos/:id — should return 404 for already-deleted todo', async () => {
      const res = await request(app).delete(`/todos/${createdId}`);
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
