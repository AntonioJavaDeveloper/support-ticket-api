import 'dotenv/config';

import { app } from '@/app';
import { startApplication } from '@/bootstrap';
import { AppDataSource } from '@/database/data-source';

const port = Number(process.env.PORT ?? 3000);

async function bootstrap(): Promise<void> {
    try {
        await startApplication({
            dataSource: AppDataSource,
            app,
            port,
        });
    } catch (error) {
        console.error('Failed to initialize application:', error);

        process.exitCode = 1;
    }
}

void bootstrap();
