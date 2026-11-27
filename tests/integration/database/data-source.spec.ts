import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppDataSource } from '@/database/data-source';

describe('AppDataSource', () => {
    beforeAll(async () => {
        await AppDataSource.initialize();
    });

    afterAll(async () => {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    });

    it('should connect exclusively to the development database', async () => {
        const rows: unknown = await AppDataSource.query(`
            SELECT
                current_database() AS database,
                current_user AS username
        `);

        if (!Array.isArray(rows)) {
            throw new Error('Database query did not return an array.');
        }

        const result: unknown = rows[0];

        if (
            typeof result !== 'object' ||
            result === null ||
            !('database' in result) ||
            !('username' in result) ||
            typeof result.database !== 'string' ||
            typeof result.username !== 'string'
        ) {
            throw new Error('Database query returned an unexpected result.');
        }

        expect(result.database).toBe('support_ticket_dev');
        expect(result.database).not.toBe('support_ticket_test');
        expect(result.username).toBe('admin');
    });
});
