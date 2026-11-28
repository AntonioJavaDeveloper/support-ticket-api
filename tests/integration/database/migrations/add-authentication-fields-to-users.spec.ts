import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TestDataSource } from '@/database/test-data-source';

describe('AddAuthenticationFieldsToUsers migration', () => {
    let executedMigrationCount = 0;

    beforeAll(async () => {
        await TestDataSource.initialize();

        const migrations = await TestDataSource.runMigrations();

        executedMigrationCount = migrations.length;
        await TestDataSource.query(
            `
            DELETE FROM users
            WHERE email = $1
        `,
            ['admin@example.com'],
        );
    });

    afterAll(async () => {
        try {
            await TestDataSource.query(
                `
                DELETE FROM users
                WHERE email = $1
            `,
                ['admin@example.com'],
            );

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

    it('should add password_hash and is_active columns', async () => {
        const columns: Array<{
            column_name: string;
            is_nullable: string;
            column_default: string | null;
        }> = await TestDataSource.query(`
            SELECT
                column_name,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name IN ('password_hash', 'is_active')
        `);

        expect(columns).toHaveLength(2);

        const passwordHashColumn = columns.find(
            ({ column_name }) => column_name === 'password_hash',
        );

        expect(passwordHashColumn?.is_nullable).toBe('YES');

        const isActiveColumn = columns.find(({ column_name }) => column_name === 'is_active');

        expect(isActiveColumn?.is_nullable).toBe('NO');
        expect(isActiveColumn?.column_default).toBe('true');
    });

    it('should accept the admin role', async () => {
        const users: Array<{ id: number; role: string }> = await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
            RETURNING id, role
        `,
            ['Admin User', 'admin@example.com', 'admin'],
        );

        expect(users).toHaveLength(1);
        expect(users[0]?.role).toBe('admin');
    });
});
