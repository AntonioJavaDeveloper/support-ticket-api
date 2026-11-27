import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    startApplication: vi.fn(),
    dataSource: {
        initialize: vi.fn(),
        query: vi.fn(),
    },
    app: {
        listen: vi.fn(),
    },
}));

vi.mock('dotenv/config', () => ({}));

vi.mock('@/bootstrap', () => ({
    startApplication: mocks.startApplication,
}));

vi.mock('@/database/data-source', () => ({
    AppDataSource: mocks.dataSource,
}));

vi.mock('@/app', () => ({
    app: mocks.app,
}));

describe('Application entry point', () => {
    beforeEach(() => {
        vi.resetModules();

        delete process.env.PORT;
        process.exitCode = undefined;

        mocks.startApplication.mockReset();
        mocks.startApplication.mockResolvedValue(undefined);
    });

    afterEach(() => {
        delete process.env.PORT;
        process.exitCode = undefined;
    });

    it('should start the application with the configured port', async () => {
        process.env.PORT = '4000';

        await import('@/index');

        expect(mocks.startApplication).toHaveBeenCalledOnce();

        expect(mocks.startApplication).toHaveBeenCalledWith({
            dataSource: mocks.dataSource,
            app: mocks.app,
            port: 4000,
        });
    });

    it('should use port 3000 when PORT is not configured', async () => {
        await import('@/index');

        expect(mocks.startApplication).toHaveBeenCalledWith({
            dataSource: mocks.dataSource,
            app: mocks.app,
            port: 3000,
        });
    });

    it('should set the process exit code when application startup fails', async () => {
        const error = new Error('Application startup failed');

        mocks.startApplication.mockRejectedValue(error);

        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        try {
            await import('@/index');

            await vi.waitFor(() => {
                expect(process.exitCode).toBe(1);
            });

            expect(consoleError).toHaveBeenCalledWith('Failed to initialize application:', error);
        } finally {
            consoleError.mockRestore();
        }
    });
});
