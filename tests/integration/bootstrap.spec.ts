import { describe, expect, it, vi } from 'vitest';

import { startApplication } from '@/bootstrap';

describe('Application bootstrap', () => {
    it('should initialize the database before starting the HTTP server', async () => {
        const executionOrder: string[] = [];

        const dataSource = {
            initialize: vi.fn(() => {
                executionOrder.push('database.initialize');

                return Promise.resolve();
            }),
            query: vi.fn(() => {
                executionOrder.push('database.query');

                return Promise.resolve([{ database: 'support_ticket_dev' }]);
            }),
        };

        const app = {
            listen: vi.fn((_port: number, callback?: () => void) => {
                executionOrder.push('http.listen');
                callback?.();
            }),
        };

        await startApplication({
            dataSource,
            app,
            port: 3000,
        });

        expect(executionOrder).toEqual(['database.initialize', 'database.query', 'http.listen']);

        expect(dataSource.initialize).toHaveBeenCalledOnce();
        expect(dataSource.query).toHaveBeenCalledOnce();
        expect(app.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    it('should not start the HTTP server if database initialization fails', async () => {
        const databaseError = new Error('Database connection failed');

        const dataSource = {
            initialize: vi.fn().mockRejectedValue(databaseError),
            query: vi.fn(),
        };

        const app = {
            listen: vi.fn(),
        };

        await expect(
            startApplication({
                dataSource,
                app,
                port: 3000,
            }),
        ).rejects.toThrow('Database connection failed');

        expect(dataSource.query).not.toHaveBeenCalled();
        expect(app.listen).not.toHaveBeenCalled();
    });
});
