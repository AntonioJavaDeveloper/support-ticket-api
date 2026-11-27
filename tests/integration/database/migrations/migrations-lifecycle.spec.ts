import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TestDataSource } from '@/database/test-data-source';

describe('Database migrations', () => {
    let executedMigrationCount = 0;

    beforeAll(async () => {
        await TestDataSource.initialize();

        const migrations = await TestDataSource.runMigrations();

        executedMigrationCount = migrations.length;
    });

    afterAll(async () => {
        try {
            // Revert only migrations executed by this test suite.
            while (executedMigrationCount > 0) {
                await TestDataSource.undoLastMigration();
                executedMigrationCount--;
            }
        } finally {
            if (TestDataSource.isInitialized) {
                await TestDataSource.destroy();
            }
        }
    });

    it('should execute the three pending migrations', () => {
        expect(executedMigrationCount).toBe(3);
    });

    it('should create the users, tickets and comments tables', async () => {
        const tables: Array<{ table_name: string }> = await TestDataSource.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN ('users', 'tickets', 'comments')
                ORDER BY table_name
            `);

        expect(tables.map(({ table_name }) => table_name)).toEqual([
            'comments',
            'tickets',
            'users',
        ]);
    });

    it('should rollback the migrations and execute them again', async () => {
        // Revert the migrations in reverse execution order.
        while (executedMigrationCount > 0) {
            await TestDataSource.undoLastMigration();
            executedMigrationCount--;
        }

        const tablesAfterRollback: Array<{ table_name: string }> = await TestDataSource.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN ('users', 'tickets', 'comments')
            `);

        expect(tablesAfterRollback).toHaveLength(0);

        // Execute all migrations again.
        const migrations = await TestDataSource.runMigrations();

        executedMigrationCount = migrations.length;

        expect(executedMigrationCount).toBe(3);
    });
});
