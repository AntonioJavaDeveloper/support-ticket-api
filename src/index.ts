import 'dotenv/config';

import { AppDataSource } from '@/database/data-source';
import { app } from '@/app';

const port = Number(process.env.PORT ?? 3000);

async function bootstrap(): Promise<void> {
    try {
        // Initializes TypeORM and establishes a connection to PostgreSQL.
        await AppDataSource.initialize();

        console.log('PostgreSQL connection established through TypeORM.');

        // Executes an actual query using the DataSource.
        const databaseInfo: unknown = await AppDataSource.query(`
            SELECT
                current_database() AS database,
                current_user AS username,
                version() AS version
        `);

        console.log('PostgreSQL query result:');
        console.dir(databaseInfo, { depth: null });

        // Starts the HTTP server after validating the database.
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exitCode = 1;
    }
}

void bootstrap();
