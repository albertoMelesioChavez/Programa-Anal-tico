import { defineConfig, devices } from '@playwright/test';

if (process.env.VERIFY_ISOLATED !== '1' || !/^http:\/\/localhost:\d+$/.test(process.env.PROJECT_TEST_ORIGIN || '')) {
    throw new Error('Ejecuta npm run verify o npm run test:system para usar una base aislada.');
}

export default defineConfig({
    testDir: './tests/e2e',
    outputDir: 'test-results/browser',
    fullyParallel: false,
    workers: 1,
    forbidOnly: true,
    retries: 0,
    timeout: 45000,
    globalTimeout: 10 * 60 * 1000,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: process.env.PROJECT_TEST_ORIGIN,
        trace: 'retain-on-failure', screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
        { name: 'movil', use: { ...devices['Pixel 7'] } },
    ],
});
