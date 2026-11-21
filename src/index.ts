import 'dotenv/config';
import express from 'express';
import { AppDataSource } from '@/database/data-source';

const app = express();

const port = Number(process.env.PORT ?? 3000);

// let teste: string;

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Minha primeira API com Express 5 e TypeScript 6!',
    });
});

async function bootstrap(): Promise<void> {
    try {
        // Inicializa o TypeORM e estabelece a conexão com PostgreSQL.
        await AppDataSource.initialize();

        console.log('Conexão com PostgreSQL estabelecida pelo TypeORM.');

        // Executa uma consulta real utilizando o DataSource.
        const databaseInfo: unknown = await AppDataSource.query(`
            SELECT
                current_database() AS database,
                current_user AS username,
                version() AS version
        `);

        console.log('Resultado da consulta ao PostgreSQL:');
        console.dir(databaseInfo, { depth: null });

        // Só inicia o servidor HTTP depois de validar o banco.
        app.listen(port, () => {
            console.log(`Servidor executando em http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Falha ao inicializar a aplicação:', error);

        process.exitCode = 1;
    }
}

void bootstrap();
