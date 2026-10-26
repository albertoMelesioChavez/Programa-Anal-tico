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

test('programa guardado → proyecto vinculado → sesiones → eliminación conserva planeaciones', async ({ page, isMobile }, testInfo) => {
    await page.goto('/generador-programa-analitico');
    await page.getByLabel('Escuela', { exact: true }).fill('Escuela del agua');
    await page.getByRole('button', { name: 'Guardar programa', exact: true }).click();
    await expect(page.getByText('Guardado en tu cuenta', { exact: true })).toBeVisible();
    const programLink = await page.getByRole('link', { name: 'Abrir programa guardado →' }).getAttribute('href');
    const programId = new URL(programLink, page.url()).searchParams.get('programa');
    await page.getByRole('link', { name: 'Abrir programa guardado →' }).click();
    await expect(page.getByRole('combobox', { name: 'Seleccionar programa analítico' })).toHaveValue(programId);
    await expect(page.getByRole('main').getByRole('listitem').filter({ hasText: 'Escuela: Escuela del agua' })).toBeVisible();
    if (isMobile) await page.getByRole('button', { name: '☰ SECCIONES' }).click();
    await page.getByRole('link', { name: 'Crear proyecto con este programa →' }).click();
    await expect(page.getByLabel('Programa analítico de este proyecto')).toHaveValue(programId);
    await page.getByRole('textbox', { name: '¿Qué quieres trabajar con tus grupos?', exact: true }).fill('Agua y comunidad');
    await page.getByRole('button', { name: '4.º A', exact: true }).click();
    await page.getByRole('button', { name: 'Preparar proyecto →' }).click();
    await page.getByRole('button', { name: /\+ Vincular este PDA/ }).first().click();
    await page.getByRole('button', { name: 'Revisar proyecto →' }).click();
    await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
    await expect(page).toHaveURL(/\/proyectos\/\d+$/);
    const projectUrl = page.url();
    const projectId = projectUrl.split('/').pop();
    await expect(page.getByRole('link', { name: /Programa analítico:.*Escuela del agua/ })).toBeVisible();
    await page.getByRole('button', { name: 'Crear 8 planeaciones de 4A' }).click();
    await expect(page.getByRole('link', { name: 'Revisar y editar →' })).toHaveCount(8);
    const plans = await (await page.request.get('/api/proyectos/' + projectId + '/planeaciones')).json();
    expect(plans).toHaveLength(8);
    expect(plans.every(plan => String(plan.programa_analitico_id) === programId)).toBe(true);
    const exported = await page.request.get('/api/planeaciones/' + plans[0].id + '/export');
    expect(exported.ok()).toBe(true);
    expect(await exported.text()).toContain('Agua y comunidad');
    await page.goto('/');
    await page.getByLabel('Programa analítico', { exact: true }).selectOption(programId);
    await expect(page.locator('.art-project-list article')).toHaveCount(1);
    await expect(page.locator('.art-project-list')).toContainText('4A');
    await page.getByLabel('Buscar en tus documentos').fill('no existe coincidencia');
    await expect(page.getByRole('heading', { name: 'No hay proyectos con estos filtros' })).toBeVisible();
    await page.getByLabel('Buscar en tus documentos').fill('');
    await expect(page.locator('.art-project-list article')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('workspace-vinculado.png'), fullPage: true });
    await page.goto(projectUrl);
    await page.getByRole('button', { name: 'Eliminar proyecto', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Eliminar proyecto' })).toContainText('planeaciones se conservarán');
    await page.getByRole('button', { name: 'Eliminar y conservar planeaciones' }).click();
    await expect(page).toHaveURL(/conservadas=8/);
    if (isMobile) await page.getByRole('button', { name: /EXPLORADOR.*ÁRBOL/ }).click();
    await expect(page.locator('#workspace-tree').getByRole('button', { name: /Planeaciones sin proyecto/ })).toBeVisible();
    const surviving = await (await page.request.get('/api/planeaciones')).json();
    for (const plan of plans) expect(surviving.find(item => String(item.id) === String(plan.id)).proyecto_arte_id).toBeNull();
});

test('un error de carga no se presenta como una cuenta vacía y permite reintentar', async ({ page }) => {
    await page.route('**/api/proyectos', route => route.fulfill({ status: 503, json: { error: 'Temporalmente no disponible' } }));
    await page.goto('/');
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Tu información sigue guardada');
    await expect(page.getByRole('heading', { name: 'Sin proyectos de arte' })).toHaveCount(0);
    await page.unroute('**/api/proyectos');
    await page.getByRole('button', { name: 'Reintentar carga' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
});

test('un fallo al guardar programa conserva el formulario y permite guardarlo después', async ({ page }) => {
    await page.goto('/generador-programa-analitico');
    await page.getByLabel('Escuela', { exact: true }).fill('Texto que debe conservarse');
    await page.route('**/api/programas-analiticos', route => route.fulfill({ status: 503, json: { error: 'No se guardó. Intenta de nuevo.' } }));
    await page.getByRole('button', { name: 'Guardar programa', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('No se guardó');
    await expect(page.getByLabel('Escuela', { exact: true })).toHaveValue('Texto que debe conservarse');
    await page.unroute('**/api/programas-analiticos');
    await page.getByRole('button', { name: 'Guardar programa', exact: true }).click();
    await expect(page.getByText('Guardado en tu cuenta', { exact: true })).toBeVisible();
    await page.getByLabel('Escuela', { exact: true }).fill('Escuela actualizada');
    await expect(page.getByText('Hay cambios sin guardar', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.getByText('Guardado en tu cuenta', { exact: true })).toBeVisible();
});
