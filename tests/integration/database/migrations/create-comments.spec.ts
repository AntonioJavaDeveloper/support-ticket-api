import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestDataSource } from '@/database/test-data-source';

describe('CreateComments migration', () => {
    let executedMigrationCount = 0;

    beforeAll(async () => {
        await TestDataSource.initialize();
        const migrations = await TestDataSource.runMigrations();

        executedMigrationCount = migrations.length;
    });

    afterAll(async () => {
        try {
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

    it('should create comments table with expected columns', async () => {
        const columns: { column_name: string }[] = await TestDataSource.query(
            `
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                        AND table_name = 'comments'
                    ORDER BY ordinal_position
                `,
        );

        expect(columns.map((column) => column.column_name)).toEqual([
            'id',
            'ticket_id',
            'user_id',
            'body',
            'created_at',
        ]);
    });

    it('should create id as primary key', async () => {
        const primaryKeyColumns: { column_name: string }[] = await TestDataSource.query(
            `
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_catalog = kcu.constraint_catalog
                    AND tc.constraint_schema = kcu.constraint_schema
                    AND tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public'
                    AND tc.table_name = 'comments'
                    AND tc.constraint_type = 'PRIMARY KEY'
            `,
        );

        expect(primaryKeyColumns.map((column) => column.column_name)).toEqual(['id']);
    });

    it('should create ticket_id foreign key referencing tickets.id', async () => {
        const foreignKeys: {
            column_name: string;
            referenced_table_name: string;
            referenced_column_name: string;
        }[] = await TestDataSource.query(
            `
            SELECT
                kcu.column_name,
                ccu.table_name AS referenced_table_name,
                ccu.column_name AS referenced_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_catalog = kcu.constraint_catalog
                AND tc.constraint_schema = kcu.constraint_schema
                AND tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_catalog = ccu.constraint_catalog
                AND tc.constraint_schema = ccu.constraint_schema
                AND tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.table_name = 'comments'
                AND tc.constraint_name = 'FK_comments_ticket'
                AND tc.constraint_type = 'FOREIGN KEY'
        `,
        );

        expect(foreignKeys).toEqual([
            {
                column_name: 'ticket_id',
                referenced_table_name: 'tickets',
                referenced_column_name: 'id',
            },
        ]);
    });

    it('should create user_id foreign key referencing users.id', async () => {
        const foreignKeys: {
            column_name: string;
            referenced_table_name: string;
            referenced_column_name: string;
        }[] = await TestDataSource.query(
            `
            SELECT
                kcu.column_name,
                ccu.table_name AS referenced_table_name,
                ccu.column_name AS referenced_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_catalog = kcu.constraint_catalog
                AND tc.constraint_schema = kcu.constraint_schema
                AND tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_catalog = ccu.constraint_catalog
                AND tc.constraint_schema = ccu.constraint_schema
                AND tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.table_name = 'comments'
                AND tc.constraint_name = 'FK_comments_user'
                AND tc.constraint_type = 'FOREIGN KEY'
        `,
        );

        expect(foreignKeys).toEqual([
            {
                column_name: 'user_id',
                referenced_table_name: 'users',
                referenced_column_name: 'id',
            },
        ]);
    });

    it('should reject null ticket_id', async () => {
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                    INSERT INTO comments (ticket_id, user_id, body)
                    VALUES (NULL, $1, $2)
                `,
                [userId, 'Comment body'],
            ),
        ).rejects.toMatchObject({
            driverError: { code: '23502' },
        });
    });

    it('should reject null user_id', async () => {
        const ticketId = await createTicket();

        await expect(
            TestDataSource.query(
                `
                    INSERT INTO comments (ticket_id, user_id, body)
                    VALUES ($1, NULL, $2)
                `,
                [ticketId, 'Comment body'],
            ),
        ).rejects.toMatchObject({
            driverError: { code: '23502' },
        });
    });

    it('should reject null body', async () => {
        const ticketId = await createTicket();
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                    INSERT INTO comments (ticket_id, user_id, body)
                    VALUES ($1, $2, NULL)
                `,
                [ticketId, userId],
            ),
        ).rejects.toMatchObject({
            driverError: { code: '23502' },
        });
    });

    it('should reject a comment with a non-existing ticket', async () => {
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                    INSERT INTO comments (ticket_id, user_id, body)
                    VALUES (-1, $1, $2)
                `,
                [userId, 'Comment body'],
            ),
        ).rejects.toMatchObject({
            driverError: { code: '23503' },
        });
    });

    it('should reject a comment with a non-existing user', async () => {
        const ticketId = await createTicket();

        await expect(
            TestDataSource.query(
                `
                    INSERT INTO comments (ticket_id, user_id, body)
                    VALUES ($1, -1, $2)
                `,
                [ticketId, 'Comment body'],
            ),
        ).rejects.toMatchObject({
            driverError: { code: '23503' },
        });
    });

    it('should set created_at automatically', async () => {
        const ticketId = await createTicket();
        const userId = await createUser();

        const comments: { created_at: Date }[] = await TestDataSource.query(
            `
                    INSERT INTO comments (ticket_id, user_id, body)
                    VALUES ($1, $2, $3)
                    RETURNING created_at
                `,
            [ticketId, userId, 'Comment body'],
        );

        expect(comments[0]?.created_at).toBeInstanceOf(Date);
    });

    it('should restrict deleting a ticket referenced by a comment', async () => {
        const ticketId = await createTicket();
        const userId = await createUser();

        await TestDataSource.query(
            `
                INSERT INTO comments (ticket_id, user_id, body)
                VALUES ($1, $2, $3)
            `,
            [ticketId, userId, 'Comment body'],
        );

        await expect(
            TestDataSource.query('DELETE FROM tickets WHERE id = $1', [ticketId]),
        ).rejects.toMatchObject({
            driverError: { code: '23001' },
        });
    });

    it('should restrict deleting a user referenced by a comment', async () => {
        const ticketId = await createTicket();
        const commentUserId = await createUser();

        await TestDataSource.query(
            `
                INSERT INTO comments (ticket_id, user_id, body)
                VALUES ($1, $2, $3)
            `,
            [ticketId, commentUserId, 'Comment body'],
        );

        await expect(
            TestDataSource.query('DELETE FROM users WHERE id = $1', [commentUserId]),
        ).rejects.toMatchObject({
            driverError: { code: '23001' },
        });
    });

    let userSequence = 0;

    async function createUser(): Promise<number> {
        userSequence++;

        const email = `comment-test-${userSequence}@example.com`;

        const users: { id: number }[] = await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
            RETURNING id
        `,
            ['Comment Test User', email, 'user'],
        );

        const user = users[0];

        if (!user) {
            throw new Error('Failed to create test user.');
        }

        return user.id;
    }

    async function createTicket(): Promise<number> {
        const creatorId = await createUser();

        const tickets: { id: number }[] = await TestDataSource.query(
            `
            INSERT INTO tickets (title, description, created_by)
            VALUES ($1, $2, $3)
            RETURNING id
        `,
            ['Test ticket', 'Test ticket description', creatorId],
        );

        const ticket = tickets[0];

        if (!ticket) {
            throw new Error('Failed to create test ticket.');
        }

        return ticket.id;
    }
});
