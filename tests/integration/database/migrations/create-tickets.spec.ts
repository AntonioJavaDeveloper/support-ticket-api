import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TestDataSource } from '@/database/test-data-source';

describe('CreateTickets migration', () => {
    let userSequence = 0;

    async function createUser(): Promise<number> {
        userSequence++;

        const email = `ticket-test-${userSequence}@example.com`;

        const users: { id: number }[] = await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
            RETURNING id
        `,
            ['Ticket Test User', email, 'user'],
        );

        const user = users[0];

        if (!user) {
            throw new Error('Failed to create test user.');
        }

        return user.id;
    }
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

    it('should create the tickets table with the expected columns', async () => {
        const columns: Array<{
            column_name: string;
            data_type: string;
            character_maximum_length: number | null;
            is_nullable: string;
            column_default: string | null;
            ordinal_position: number;
        }> = await TestDataSource.query(`
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default,
                ordinal_position
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'tickets'
            ORDER BY ordinal_position
        `);

        expect(columns).toHaveLength(9);

        expect(
            columns.map(
                ({
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    ordinal_position,
                }) => ({
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    ordinal_position,
                }),
            ),
        ).toEqual([
            {
                column_name: 'id',
                data_type: 'integer',
                character_maximum_length: null,
                is_nullable: 'NO',
                ordinal_position: 1,
            },
            {
                column_name: 'title',
                data_type: 'character varying',
                character_maximum_length: 100,
                is_nullable: 'NO',
                ordinal_position: 2,
            },
            {
                column_name: 'description',
                data_type: 'text',
                character_maximum_length: null,
                is_nullable: 'NO',
                ordinal_position: 3,
            },
            {
                column_name: 'priority',
                data_type: 'character varying',
                character_maximum_length: 10,
                is_nullable: 'NO',
                ordinal_position: 4,
            },
            {
                column_name: 'status',
                data_type: 'character varying',
                character_maximum_length: 20,
                is_nullable: 'NO',
                ordinal_position: 5,
            },
            {
                column_name: 'created_by',
                data_type: 'integer',
                character_maximum_length: null,
                is_nullable: 'NO',
                ordinal_position: 6,
            },
            {
                column_name: 'assigned_agent_id',
                data_type: 'integer',
                character_maximum_length: null,
                is_nullable: 'YES',
                ordinal_position: 7,
            },
            {
                column_name: 'created_at',
                data_type: 'timestamp with time zone',
                character_maximum_length: null,
                is_nullable: 'NO',
                ordinal_position: 8,
            },
            {
                column_name: 'updated_at',
                data_type: 'timestamp with time zone',
                character_maximum_length: null,
                is_nullable: 'NO',
                ordinal_position: 9,
            },
        ]);

        const idColumn = columns.find(({ column_name }) => column_name === 'id');
        const priorityColumn = columns.find(({ column_name }) => column_name === 'priority');
        const statusColumn = columns.find(({ column_name }) => column_name === 'status');
        const createdAtColumn = columns.find(({ column_name }) => column_name === 'created_at');
        const updatedAtColumn = columns.find(({ column_name }) => column_name === 'updated_at');

        expect(idColumn?.column_default).toMatch(/^nextval\(/);
        expect(priorityColumn?.column_default).toContain("'medium'");
        expect(statusColumn?.column_default).toContain("'open'");
        expect(createdAtColumn?.column_default).toContain('CURRENT_TIMESTAMP');
        expect(updatedAtColumn?.column_default).toContain('CURRENT_TIMESTAMP');
    });

    it('should define id as the primary key', async () => {
        const primaryKeys: Array<{
            constraint_name: string;
            constraint_type: string;
            column_name: string;
        }> = await TestDataSource.query(`
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name
        FROM information_schema.table_constraints AS tc
        INNER JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'tickets'
          AND tc.constraint_type = 'PRIMARY KEY'
    `);

        expect(primaryKeys).toHaveLength(1);

        const primaryKey = primaryKeys[0];

        if (!primaryKey) {
            throw new Error('The tickets primary key was not found.');
        }

        expect(typeof primaryKey.constraint_name).toBe('string');
        expect(primaryKey.constraint_type).toBe('PRIMARY KEY');
        expect(primaryKey.column_name).toBe('id');
    });

    it('should define created_by as a foreign key to users', async () => {
        const foreignKeys: Array<{
            constraint_name: string;
            column_name: string;
            foreign_table_name: string;
            foreign_column_name: string;
        }> = await TestDataSource.query(`
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        INNER JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
        INNER JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
           AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_schema = 'public'
          AND tc.table_name = 'tickets'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'created_by'
    `);

        expect(foreignKeys).toHaveLength(1);

        const foreignKey = foreignKeys[0];

        if (!foreignKey) {
            throw new Error('The created_by foreign key was not found.');
        }

        expect(foreignKey.constraint_name).toBe('FK_tickets_created_by');
        expect(foreignKey.column_name).toBe('created_by');
        expect(foreignKey.foreign_table_name).toBe('users');
        expect(foreignKey.foreign_column_name).toBe('id');
    });

    it('should define assigned_agent_id as a foreign key to users', async () => {
        const foreignKeys: Array<{
            constraint_name: string;
            column_name: string;
            foreign_table_name: string;
            foreign_column_name: string;
        }> = await TestDataSource.query(`
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        INNER JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
        INNER JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
           AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_schema = 'public'
          AND tc.table_name = 'tickets'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'assigned_agent_id'
    `);

        expect(foreignKeys).toHaveLength(1);

        const foreignKey = foreignKeys[0];

        if (!foreignKey) {
            throw new Error('The assigned_agent_id foreign key was not found.');
        }

        expect(foreignKey.constraint_name).toBe('FK_tickets_assigned_agent');
        expect(foreignKey.column_name).toBe('assigned_agent_id');
        expect(foreignKey.foreign_table_name).toBe('users');
        expect(foreignKey.foreign_column_name).toBe('id');
    });

    it('should define a CHECK constraint for ticket priority', async () => {
        const constraints: {
            constraint_name: string;
            check_clause: string;
        }[] = await TestDataSource.query(`
        SELECT
            tc.constraint_name,
            cc.check_clause
        FROM information_schema.table_constraints tc
        INNER JOIN information_schema.check_constraints cc
            ON cc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'tickets'
            AND tc.constraint_type = 'CHECK'
            AND tc.constraint_name = 'CHK_tickets_priority'
    `);

        expect(constraints).toHaveLength(1);
        expect(constraints[0]?.constraint_name).toBe('CHK_tickets_priority');
        expect(constraints[0]?.check_clause).toContain('low');
        expect(constraints[0]?.check_clause).toContain('medium');
        expect(constraints[0]?.check_clause).toContain('high');
    });

    it('should define a CHECK constraint for ticket status', async () => {
        const constraints: {
            constraint_name: string;
            check_clause: string;
        }[] = await TestDataSource.query(`
        SELECT
            tc.constraint_name,
            cc.check_clause
        FROM information_schema.table_constraints tc
        INNER JOIN information_schema.check_constraints cc
            ON cc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'tickets'
            AND tc.constraint_type = 'CHECK'
            AND tc.constraint_name = 'CHK_tickets_status'
    `);

        expect(constraints).toHaveLength(1);
        expect(constraints[0]?.constraint_name).toBe('CHK_tickets_status');
        expect(constraints[0]?.check_clause).toContain('open');
        expect(constraints[0]?.check_clause).toContain('in_progress');
        expect(constraints[0]?.check_clause).toContain('closed');
    });

    it.each(['low', 'medium', 'high'])('should accept priority "%s"', async (priority) => {
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                    INSERT INTO tickets (
                        title,
                        description,
                        priority,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4)
                `,
                ['Test ticket', 'Test description', priority, userId],
            ),
        ).resolves.toBeDefined();
    });

    it('should reject an invalid priority', async () => {
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                INSERT INTO tickets (
                    title,
                    description,
                    priority,
                    created_by
                )
                VALUES ($1, $2, $3, $4)
            `,
                ['Test ticket', 'Test description', 'urgent', userId],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23514',
            },
        });
    });

    it.each(['open', 'in_progress', 'closed'])('should accept status "%s"', async (status) => {
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                    INSERT INTO tickets (
                        title,
                        description,
                        status,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4)
                `,
                ['Test ticket', 'Test description', status, userId],
            ),
        ).resolves.toBeDefined();
    });

    it('should reject an invalid status', async () => {
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                INSERT INTO tickets (
                    title,
                    description,
                    status,
                    created_by
                )
                VALUES ($1, $2, $3, $4)
            `,
                ['Test ticket', 'Test description', 'pending', userId],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23514',
            },
        });
    });

    it('should apply the default priority and status', async () => {
        const userId = await createUser();

        const tickets: { priority: string; status: string }[] = await TestDataSource.query(
            `
                INSERT INTO tickets (title, description, created_by)
                VALUES ($1, $2, $3)
                RETURNING priority, status
            `,
            ['Test ticket', 'Test description', userId],
        );

        const ticket = tickets[0];

        if (!ticket) {
            throw new Error('Failed to create test ticket.');
        }

        expect(ticket).toEqual({
            priority: 'medium',
            status: 'open',
        });
    });

    it.each(['title', 'description', 'created_by'] as const)(
        'should reject NULL in the %s column',
        async (column) => {
            const userId = await createUser();

            const valuesByColumn: Record<typeof column, (string | number | null)[]> = {
                title: [null, 'Test description', userId],
                description: ['Test ticket', null, userId],
                created_by: ['Test ticket', 'Test description', null],
            };

            await expect(
                TestDataSource.query(
                    `
                    INSERT INTO tickets (title, description, created_by)
                    VALUES ($1, $2, $3)
                `,
                    valuesByColumn[column],
                ),
            ).rejects.toMatchObject({
                driverError: {
                    code: '23502',
                },
            });
        },
    );

    it('should accept a title with 100 characters', async () => {
        const userId = await createUser();
        const title = 'a'.repeat(100);

        await expect(
            TestDataSource.query(
                `
                INSERT INTO tickets (title, description, created_by)
                VALUES ($1, $2, $3)
            `,
                [title, 'Test description', userId],
            ),
        ).resolves.toBeDefined();
    });

    it('should reject a title with 101 characters', async () => {
        const userId = await createUser();
        const title = 'a'.repeat(101);

        await expect(
            TestDataSource.query(
                `
                INSERT INTO tickets (title, description, created_by)
                VALUES ($1, $2, $3)
            `,
                [title, 'Test description', userId],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '22001',
            },
        });
    });

    it('should accept NULL in the assigned_agent_id column', async () => {
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                INSERT INTO tickets (
                    title,
                    description,
                    created_by,
                    assigned_agent_id
                )
                VALUES ($1, $2, $3, $4)
            `,
                ['Test ticket', 'Test description', userId, null],
            ),
        ).resolves.toBeDefined();
    });

    it('should reject a non-existing assigned agent', async () => {
        const userId = await createUser();

        await expect(
            TestDataSource.query(
                `
                INSERT INTO tickets (
                    title,
                    description,
                    created_by,
                    assigned_agent_id
                )
                VALUES ($1, $2, $3, $4)
            `,
                ['Test ticket', 'Test description', userId, -1],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23503',
            },
        });
    });

    it('should reject a non-existing ticket creator', async () => {
        await expect(
            TestDataSource.query(
                `
                INSERT INTO tickets (title, description, created_by)
                VALUES ($1, $2, $3)
            `,
                ['Test ticket', 'Test description', -1],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23503',
            },
        });
    });

    it('should restrict deleting a user referenced by a ticket', async () => {
        const userId = await createUser();

        await TestDataSource.query(
            `
            INSERT INTO tickets (title, description, created_by)
            VALUES ($1, $2, $3)
        `,
            ['Test ticket', 'Test description', userId],
        );

        await expect(
            TestDataSource.query(
                `
                DELETE FROM users
                WHERE id = $1
            `,
                [userId],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23001',
            },
        });
    });
});
