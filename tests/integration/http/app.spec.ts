import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '@/app';

describe('GET /', () => {
    it('should return the welcome message', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            message: 'My first API with Express 5 and TypeScript 6!',
        });
    });
});
