import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@': srcPath,
        },
    },

    test: {
        include: ['tests/**/*.spec.ts'],
        environment: 'node',

        // Evita que arquivos de teste disputem o mesmo banco.
        fileParallelism: false,

        testTimeout: 30_000,
        hookTimeout: 30_000,

        clearMocks: true,
        restoreMocks: true,
    },
});
