import 'dotenv/config';
import 'reflect-metadata';

import { DataSource } from 'typeorm';
import { join } from 'node:path';

function requiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Environment variable ${name} is required.`);
    }

    return value;
}

const dbPort = Number(process.env.DB_PORT ?? 5432);

if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.');
}

export const AppDataSource = new DataSource({
    type: 'postgres',

    host: requiredEnv('DB_HOST'),
    port: dbPort,
    username: requiredEnv('DB_USERNAME'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_DATABASE'),

    entities: [],
    migrations: [join(import.meta.dirname, 'migrations', '*.{js,ts}')],

    migrationsTableName: 'migrations',
    migrationsRun: false,
    migrationsTransactionMode: 'all',

    synchronize: false,
    logging: false,
});
