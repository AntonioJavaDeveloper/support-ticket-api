import 'dotenv/config';
import 'reflect-metadata';

import { DataSource } from 'typeorm';
import { join } from 'node:path';

const TEST_DATABASE_NAME = 'support_ticket_test';

function requiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Environment variable ${name} is required.`);
    }

    return value;
}

// Validate the test database before creating the DataSource.
const testDatabase = requiredEnv('DB_TEST_DATABASE');
const developmentDatabase = requiredEnv('DB_DATABASE');

if (testDatabase !== TEST_DATABASE_NAME) {
    throw new Error(`Tests can only run against the "${TEST_DATABASE_NAME}" database.`);
}

if (developmentDatabase === TEST_DATABASE_NAME) {
    throw new Error('The development database cannot be the test database.');
}

const dbPort = Number(process.env.DB_PORT ?? 5432);

if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.');
}

export const TestDataSource = new DataSource({
    type: 'postgres',

    host: requiredEnv('DB_HOST'),
    port: dbPort,
    username: requiredEnv('DB_USERNAME'),
    password: requiredEnv('DB_PASSWORD'),
    database: TEST_DATABASE_NAME,

    entities: [],
    migrations: [join(import.meta.dirname, 'migrations', '*.{js,ts}')],

    migrationsTableName: 'migrations',
    migrationsRun: false,
    migrationsTransactionMode: 'all',

    synchronize: false,
    logging: false,
});
