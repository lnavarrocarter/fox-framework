import request from 'supertest';
import express from 'express';
import { startServer } from '../index';

const app = express();
startServer({ port: 4000 }); // Cambia el puerto si es necesario

describe('GET /hello', () => {
    it('responds with hello world', async () => {
        const response = await request(app).get('/hello');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, world!');
    });
});