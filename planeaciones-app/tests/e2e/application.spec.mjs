import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
    await page.goto('/acceso');
    await page.getByRole('button', { name: 'Entrar como usuario de prueba' }).click();
    await expect(page).toHaveURL(/\/$/);
});

test('inicio rápido: validar, vincular currículo, guardar, reabrir y editar', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('/proyectos/nuevo');
    const idea = page.getByRole('textbox', { name: '¿Qué quieres trabajar con tus grupos?', exact: true });
    await expect(idea).toHaveValue('');
    await expect(idea).toHaveAttribute('placeholder', /Describe el tema/);
    await page.getByRole('button', { name: 'Preparar proyecto →' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Escribe tu idea');
    await idea.fill('Explorar el cuidado del agua en nuestra comunidad');
    await page.getByRole('button', { name: '4.º A', exact: true }).click();
    await page.getByRole('button', { name: 'Preparar proyecto →' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Currículo' })).toBeVisible();
    await page.getByRole('button', { name: 'Revisar proyecto →' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('PDA');
    await page.getByRole('button', { name: /\+ Vincular este PDA/ }).first().click();
    await page.getByRole('button', { name: 'Revisar proyecto →' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Revisar' })).toBeVisible();
    await expect(page.getByText('1 grupo · 8 sesiones', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
    await expect(page).toHaveURL(/\/proyectos\/\d+$/);
    const url = page.url();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/agua/i);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/agua/i);
    await page.goto(url + '/editar');
    const title = page.getByRole('textbox', { name: 'Título del proyecto', exact: false });
    await expect(title).not.toHaveValue('');
    await title.fill('Proyecto revisado en navegador');
    await page.getByRole('button', { name: /4\s*Revisar/ }).click();
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Proyecto revisado en navegador');
    expect(pageErrors).toEqual([]);
});

test('borrador y varita: conserva el texto hasta aplicar la propuesta', async ({ page }) => {
    await page.goto('/proyectos/nuevo');
    const idea = page.getByRole('textbox', { name: '¿Qué quieres trabajar con tus grupos?', exact: true });
    await idea.fill('Mi idea original sobre convivencia');
    await expect.poll(() => page.evaluate(() => Object.entries(localStorage).some(([key, value]) => key.startsWith('art-project-draft:') && JSON.parse(value).quickIdea === 'Mi idea original sobre convivencia'))).toBe(true);
    await page.reload();
    await expect(idea).toHaveValue('Mi idea original sobre convivencia');
    const wand = page.getByRole('button', { name: /Proponer ¿qué quieres trabajar con tus grupos\? con IA/i });
    await wand.click();
    await expect(page.getByText('Borrador local · IA sin conectar', { exact: true })).toBeVisible();
    await expect(idea).toHaveValue('Mi idea original sobre convivencia');
    await page.getByRole('button', { name: 'Descartar', exact: true }).click();
    await expect(idea).toHaveValue('Mi idea original sobre convivencia');
    await wand.click();
    const proposed = page.getByRole('textbox', { name: /Propuesta para ¿qué quieres trabajar/ });
    await expect(proposed).toBeVisible();
    await proposed.fill('Una propuesta revisada por el docente');
    await page.getByRole('button', { name: 'Aplicar al campo', exact: true }).click();
    await expect(idea).toHaveValue('Una propuesta revisada por el docente');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    expect(overflow).toBe(false);
});

test('una falla de la varita muestra error y conserva el trabajo', async ({ page }) => {
    await page.goto('/proyectos/nuevo');
    const idea = page.getByRole('textbox', { name: '¿Qué quieres trabajar con tus grupos?', exact: true });
    await idea.fill('Mi texto se conserva');
    await page.route('**/api/ai', route => route.fulfill({ status: 503, json: { error: 'Servicio temporalmente no disponible' } }));
    await page.getByRole('button', { name: /Proponer ¿qué quieres trabajar con tus grupos\? con IA/i }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Servicio temporalmente no disponible');
    await expect(idea).toHaveValue('Mi texto se conserva');
});

test('pantallas principales cargan sin errores de ejecución ni respuestas 500', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`); });
    for (const path of ['/', '/proyectos', '/contenidos/artes', '/contenidos/tablas', '/generador-programa-analitico', '/programaanalitico']) {
        const response = await page.goto(path);
        expect(response.status(), path).toBe(200);
        await expect(page.getByRole('button', { name: /Cerrar sesión/i })).toBeVisible();
        await expect(page.getByRole('heading').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
});

test('el generador descarga un documento con el contexto capturado', async ({ page }) => {
    await page.goto('/generador-programa-analitico');
    await page.getByLabel('Escuela', { exact: true }).fill('Escuela del navegador');
    await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar .md' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.md$/);
    const content = await readFile(await download.path(), 'utf8');
    expect(content).toContain('Escuela del navegador');
    expect(content).toContain('Primer plano: Lectura de la realidad');
    expect(content).toContain('Tercer plano: Formulación del Programa Analítico');
});
