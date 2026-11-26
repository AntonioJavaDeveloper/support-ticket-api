interface DatabaseConnection {
    initialize(): Promise<unknown>;
    query(sql: string): Promise<unknown>;
}

interface HttpApplication {
    listen(port: number, callback?: () => void): unknown;
}

interface StartApplicationOptions {
    dataSource: DatabaseConnection;
    app: HttpApplication;
    port: number;
}

async function startApplication({ dataSource, app, port }: StartApplicationOptions): Promise<void> {
    await dataSource.initialize();

    await dataSource.query(`
        SELECT
            current_database() AS database,
            current_user AS username,
            version() AS version
    `);

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

export { startApplication };
