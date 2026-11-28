import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TestDataSource } from '@/database/test-data-source';

describe('CreateUsers migration', () => {
    let executedMigrationCount = 0;

    function createUniqueEmail(prefix: string): string {
        return `${prefix}-${Date.now()}@example.com`;
    }

    beforeAll(async () => {
        await TestDataSource.initialize();

        const migrations = await TestDataSource.runMigrations();

        executedMigrationCount = migrations.length;
    });

    afterAll(async () => {
        await TestDataSource.query(`
            DELETE FROM users
            WHERE role = 'admin'
        `);

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

    it('should create the users table with the expected columns', async () => {
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
              AND table_name = 'users'
            ORDER BY ordinal_position
        `);

        expect(columns).toHaveLength(7);

        expect(
            columns.map((column) => ({
                column_name: column.column_name,
                data_type: column.data_type,
                character_maximum_length: column.character_maximum_length,
                is_nullable: column.is_nullable,
                ordinal_position: column.ordinal_position,
            })),
        ).toEqual([
            {
                column_name: 'id',
                data_type: 'integer',
                character_maximum_length: null,
                is_nullable: 'NO',
                ordinal_position: 1,
            },
            {
                column_name: 'name',
                data_type: 'character varying',
                character_maximum_length: 100,
                is_nullable: 'NO',
                ordinal_position: 2,
            },
            {
                column_name: 'email',
                data_type: 'character varying',
                character_maximum_length: 255,
                is_nullable: 'NO',
                ordinal_position: 3,
            },
            {
                column_name: 'role',
                data_type: 'character varying',
                character_maximum_length: 20,
                is_nullable: 'NO',
                ordinal_position: 4,
            },
            {
                column_name: 'created_at',
                data_type: 'timestamp with time zone',
                character_maximum_length: null,
                is_nullable: 'NO',
                ordinal_position: 5,
            },
            {
                column_name: 'password_hash',
                data_type: 'character varying',
                character_maximum_length: 255,
                is_nullable: 'YES',
                ordinal_position: 6,
            },
            {
                column_name: 'is_active',
                data_type: 'boolean',
                character_maximum_length: null,
                is_nullable: 'NO',
                ordinal_position: 7,
            },
        ]);

        const idColumn = columns.find(({ column_name }) => column_name === 'id');

        expect(idColumn?.column_default).toMatch(/^nextval\(/);

        const createdAtColumn = columns.find(({ column_name }) => column_name === 'created_at');

        expect(createdAtColumn?.column_default).toContain('CURRENT_TIMESTAMP');

        const passwordHashColumn = columns.find(
            ({ column_name }) => column_name === 'password_hash',
        );

        expect(passwordHashColumn?.is_nullable).toBe('YES');

        const isActiveColumn = columns.find(({ column_name }) => column_name === 'is_active');

        expect(isActiveColumn?.is_nullable).toBe('NO');
        expect(isActiveColumn?.column_default).toBe('true');
    });

    it('should define id as the primary key', async () => {
        const constraints: Array<{
            constraint_name: string;
            constraint_type: string;
            column_name: string;
        }> = await TestDataSource.query(`
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            INNER JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
                AND tc.table_name = kcu.table_name
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'users'
              AND tc.constraint_type = 'PRIMARY KEY'
        `);

        expect(constraints).toHaveLength(1);

        const primaryKey = constraints[0];

        expect(typeof primaryKey?.constraint_name).toBe('string');
        expect(primaryKey?.constraint_type).toBe('PRIMARY KEY');
        expect(primaryKey?.column_name).toBe('id');
    });

    it('should define email as a unique column', async () => {
        const constraints: Array<{
            constraint_name: string;
            constraint_type: string;
            column_name: string;
        }> = await TestDataSource.query(`
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name
        FROM information_schema.table_constraints tc
        INNER JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
            AND tc.table_name = kcu.table_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'users'
          AND tc.constraint_type = 'UNIQUE'
    `);

        expect(constraints).toHaveLength(1);

        const uniqueConstraint = constraints[0];

        expect(typeof uniqueConstraint?.constraint_name).toBe('string');
        expect(uniqueConstraint?.constraint_type).toBe('UNIQUE');
        expect(uniqueConstraint?.column_name).toBe('email');
    });

    it('should reject duplicate email addresses', async () => {
        const email = createUniqueEmail('contact');

        await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
        `,
            ['Maria', email, 'user'],
        );

        await expect(
            TestDataSource.query(
                `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
            `,
                ['João', email, 'agent'],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23505',
            },
        });
    });

    it('should define the allowed values for the user role', async () => {
        const constraints: Array<{
            constraint_name: string;
            check_clause: string;
        }> = await TestDataSource.query(`
            SELECT
                constraint_name,
                check_clause
            FROM information_schema.check_constraints
            WHERE constraint_schema = 'public'
              AND constraint_name = 'CHK_users_role'
        `);

        expect(constraints).toHaveLength(1);

        const roleConstraint = constraints[0];

        expect(roleConstraint?.constraint_name).toBe('CHK_users_role');
        expect(roleConstraint?.check_clause).toContain("'user'");
        expect(roleConstraint?.check_clause).toContain("'agent'");
        expect(roleConstraint?.check_clause).toContain("'admin'");
    });

    it('should accept user, agent and admin roles', async () => {
        const contact1 = createUniqueEmail('contact1');
        const contact2 = createUniqueEmail('contact2');
        const contact3 = createUniqueEmail('contact3');
        const contact4 = createUniqueEmail('contact4');

        await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
        `,
            ['Maria', contact1, 'user'],
        );

        await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
        `,
            ['João', contact2, 'agent'],
        );

        await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
        `,
            ['Carlos', contact3, 'admin'],
        );

        await expect(
            TestDataSource.query(
                `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
            `,
                ['Invalid Role', contact4, 'superuser'],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23514',
            },
        });
    });

    it('should reject null name values', async () => {
        await expect(
            TestDataSource.query(
                `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
            `,
                [null, 'null-name@example.com', 'user'],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23502',
            },
        });
    });

    it('should reject null email values', async () => {
        await expect(
            TestDataSource.query(
                `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
            `,
                ['Maria', null, 'user'],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23502',
            },
        });
    });

    it('should reject null role values', async () => {
        await expect(
            TestDataSource.query(
                `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
            `,
                ['Maria', 'null-role@example.com', null],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '23502',
            },
        });
    });

    it('should accept names with exactly 100 characters', async () => {
        const name = 'A'.repeat(100);
        const contact1 = createUniqueEmail('contact1');

        await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
        `,
            [name, contact1, 'user'],
        );
    });

    it('should reject names with more than 100 characters', async () => {
        const name = 'A'.repeat(101);
        const contact1 = createUniqueEmail('contact1');

        await expect(
            TestDataSource.query(
                `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
            `,
                [name, contact1, 'user'],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '22001',
            },
        });
    });

    it('should accept email addresses with exactly 255 characters', async () => {
        const email = createUniqueEmail('a'.repeat(229));

        await TestDataSource.query(
            `
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
        `,
            ['Maria', email, 'user'],
        );
    });

    it('should reject email addresses with more than 255 characters', async () => {
        const email = createUniqueEmail('a'.repeat(230));

        await expect(
            TestDataSource.query(
                `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
            `,
                ['Maria', email, 'user'],
            ),
        ).rejects.toMatchObject({
            driverError: {
                code: '22001',
            },
        });
    });

    it('should generate ids automatically', async () => {
        const contact1 = createUniqueEmail('contact1');
        const contact2 = createUniqueEmail('contact2');

        const firstUser: Array<{ id: number }> = await TestDataSource.query(
            `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
                RETURNING id
            `,
            ['Maria', contact1, 'user'],
        );

        const secondUser: Array<{ id: number }> = await TestDataSource.query(
            `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
                RETURNING id
            `,
            ['João', contact2, 'agent'],
        );

        expect(firstUser).toHaveLength(1);
        expect(secondUser).toHaveLength(1);

        const firstUserRow = firstUser[0];
        const secondUserRow = secondUser[0];

        if (!firstUserRow || !secondUserRow) {
            throw new Error('The database did not return the generated user ids.');
        }

        const firstId = firstUserRow.id;
        const secondId = secondUserRow.id;

        expect(typeof firstId).toBe('number');
        expect(typeof secondId).toBe('number');

        expect(Number.isInteger(firstId)).toBe(true);
        expect(Number.isInteger(secondId)).toBe(true);

        expect(firstId).toBeGreaterThan(0);
        expect(secondId).toBeGreaterThan(firstId);
    });

    it('should generate created_at automatically', async () => {
        const contact1 = createUniqueEmail('contact1');

        const users: Array<{ created_at: Date }> = await TestDataSource.query(
            `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
                RETURNING created_at
            `,
            ['Maria', contact1, 'user'],
        );

        expect(users).toHaveLength(1);

        const user = users[0];

        if (!user) {
            throw new Error('The database did not return the created_at value.');
        }

        expect(user.created_at).toBeInstanceOf(Date);

        const timestamp = user.created_at.getTime();

        expect(Number.isNaN(timestamp)).toBe(false);
        expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
});
