import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

function capturarErrores(page: Page): string[] {
  const errores: string[] = [];

  page.on("console", (mensaje) => {
    if (mensaje.type() !== "error") return;
    const texto = mensaje.text();
    if (texto.includes("React DevTools")) return;
    errores.push(texto);
  });

  page.on("pageerror", (error) => errores.push(error.message));

  return errores;
}

async function iniciarSesion(page: Page, usuario = "admin", clave = "admin1234") {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña", { exact: true }).fill(clave);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  await expect(page.getByTestId("kpi-clientes")).toBeVisible({ timeout: 15_000 });
}

test.describe("escritorio", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("login, dashboard y modo oscuro", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByText("El agua de tu comunidad, bajo control.")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("login-escritorio.png"),
      fullPage: true,
    });

    await iniciarSesion(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Buenos días|Buenas tardes|Buenas noches/,
    );
    await expect(page.getByTestId("kpi-clientes")).toContainText("8");
    await expect(page.getByTestId("kpi-facturado")).toContainText("Gs.");
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tarifas" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Avance de lecturas" })).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("dashboard-escritorio.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Activar modo oscuro" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.waitForTimeout(450);
    await page.screenshot({
      path: testInfo.outputPath("dashboard-oscuro.png"),
      fullPage: true,
    });

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);
    expect(errores).toEqual([]);
  });

  test("credenciales inválidas muestran un error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Usuario", { exact: true }).fill("admin");
    await page.getByLabel("Contraseña", { exact: true }).fill("clave-incorrecta");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("cobranzas", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("muestra la pantalla con filtros, facturas y pagos", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Cobranzas" })
      .click();

    await expect(page).toHaveURL(/\/cobranzas/);
    await expect(page.getByRole("heading", { name: "Cobranzas", exact: true })).toBeVisible();
    await expect(page.getByLabel("Período")).toBeVisible();
    await expect(page.getByLabel("Buscar")).toBeVisible();
    await expect(page.getByLabel("Estado")).toBeVisible();

    await page.getByRole("button", { name: "Cierre de caja" }).click();
    const cierre = page.getByRole("dialog");
    await expect(
      cierre.getByRole("heading", { name: "Cierre de caja" }),
    ).toBeVisible();
    await page.getByLabel("Desde").fill("2026-11-01");
    await page.getByLabel("Hasta").fill("2026-11-30");
    await expect(cierre.getByText("135.000 Gs.").first()).toBeVisible();
    await expect(cierre.getByText("REC-000001")).toBeVisible();
    await expect(cierre.getByText("REC-000002")).toHaveCount(0);
    await page.waitForTimeout(350);
    await page.screenshot({
      path: testInfo.outputPath("cierre-caja.png"),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    const botonGenerar = page.getByRole("button", { name: "Generar facturas" }).first();
    await expect(botonGenerar).toBeEnabled();
    await botonGenerar.click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Generar facturas del período" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.screenshot({
      path: testInfo.outputPath("cobranzas-facturas-escritorio.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Pagos recientes" }).click();
    await expect(page.getByRole("button", { name: "Pagos recientes" })).toHaveClass(/bg-primary/);
    await expect(page.getByRole("button", { name: "Facturas", exact: true })).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("cobranzas-pagos-escritorio.png"),
      fullPage: true,
    });

    expect(errores).toEqual([]);
  });

  test("imprime los recibos del período en una sola ventana", async ({ page }) => {
    await page.context().addInitScript(() => {
      window.print = () => {};
    });

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Cobranzas" })
      .click();

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: "Imprimir recibos" }).click(),
    ]);

    await expect(popup.locator("section.recibo")).toHaveCount(2);
    await expect(popup.getByText("F-202611-0001")).toBeVisible();
    await expect(popup.getByText("F-202611-0002")).toBeVisible();
    await expect(popup.getByText("F-202611-0003")).toHaveCount(0);

    await popup.close();
  });
});

test.describe("celular", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  test("login, bottom nav y menú lateral", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await page.goto("/login");
    await page.screenshot({
      path: testInfo.outputPath("login-mobile.png"),
      fullPage: true,
    });

    await iniciarSesion(page);

    await expect(page.getByRole("navigation", { name: "Navegación rápida" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();

    const primero = await page.getByTestId("kpi-clientes").boundingBox();
    const segundo = await page.getByTestId("kpi-facturado").boundingBox();
    expect(primero).not.toBeNull();
    expect(segundo).not.toBeNull();
    expect(segundo!.y).toBeGreaterThan(primero!.y + primero!.height - 1);

    await page.getByRole("button", { name: "Más" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();
    await page.waitForTimeout(450);
    await expect(dialogo.getByRole("link", { name: "Tarifas" })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("menu-mobile.png"),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("dashboard-mobile.png"),
      fullPage: true,
    });
    expect(errores).toEqual([]);
  });

  test("cobranzas desde la barra inferior", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación rápida" })
      .getByRole("link", { name: "Cobranzas" })
      .click();

    await expect(page).toHaveURL(/\/cobranzas/);
    await expect(page.getByRole("heading", { name: "Cobranzas", exact: true })).toBeVisible();
    await expect(page.getByLabel("Período")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagos recientes" })).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("cobranzas-mobile.png"),
      fullPage: true,
    });
    expect(errores).toEqual([]);
  });

  test("carga de lecturas en celular", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación rápida" })
      .getByRole("link", { name: "Lecturas", exact: true })
      .click();

    await expect(page).toHaveURL(/\/lecturas/);
    await expect(page.getByRole("heading", { name: "Lecturas", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Avance de lecturas" })).toBeVisible();
    await expect(page.getByLabel("Lectura actual").first()).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("lecturas-mobile.png"),
      fullPage: true,
    });
    expect(errores).toEqual([]);
  });

  test("tarifas desde el menú lateral en celular", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page.getByRole("button", { name: "Más" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Tarifas" }).click();

    await expect(page).toHaveURL(/\/tarifas/);
    await expect(page.getByRole("heading", { name: "Tarifas", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Calcular" })).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("tarifas-mobile.png"),
      fullPage: true,
    });
    expect(errores).toEqual([]);
  });

  test("clientes en celular", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Clientes" }).click();

    await expect(page).toHaveURL(/\/clientes/);
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuevo cliente" })).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("clientes-mobile.png"),
      fullPage: true,
    });
    expect(errores).toEqual([]);
  });

  test("reportes en celular", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Reportes" }).click();

    await expect(page).toHaveURL(/\/reportes/);
    await expect(page.getByRole("heading", { name: "Reportes", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recaudación" })).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("reportes-mobile.png"),
      fullPage: true,
    });
    expect(errores).toEqual([]);
  });

  test("configuración en celular", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Configuración" }).click();

    await expect(page).toHaveURL(/\/configuracion/);
    await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible();
    await expect(page.getByLabel("Nombre")).toHaveValue("Aguatería San Blas");

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("configuracion-mobile.png"),
      fullPage: true,
    });
    expect(errores).toEqual([]);
  });
});

test.describe("clientes", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("lista, busca y abre la ficha del cliente", async ({ page }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Clientes", exact: true })
      .click();

    await expect(page).toHaveURL(/\/clientes/);
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("table").getByText("María Elena Benítez"),
    ).toBeVisible();

    await page.getByLabel("Buscar").fill("Ramón");
    await expect(
      page.getByRole("table").getByText("Ramón Antonio Giménez"),
    ).toBeVisible();
    await expect(
      page.getByRole("table").getByText("María Elena Benítez"),
    ).toHaveCount(0);
    await page.getByLabel("Buscar").fill("");

    await page
      .getByRole("button", { name: "Ver ficha de María Elena Benítez" })
      .click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Ficha del cliente" }),
    ).toBeVisible();
    await expect(page.getByText("Historial de lecturas")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("clientes-ficha.png"),
      fullPage: false,
    });

    await page.getByRole("button", { name: "Estado de cuenta" }).click();
    const cuenta = page.getByRole("dialog");
    await expect(
      cuenta.getByRole("heading", { name: "Estado de cuenta" }),
    ).toBeVisible();
    await expect(cuenta.getByText("Deuda pendiente")).toBeVisible();
    await expect(cuenta.getByText("15.000 Gs.").first()).toBeVisible();
    await expect(cuenta.getByText("F-202611-0001").first()).toBeVisible();
    await expect(cuenta.getByText("REC-000001")).toBeVisible();
    await expect(cuenta.getByText("Anulado", { exact: true })).toBeVisible();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: testInfo.outputPath("estado-cuenta.png"),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Nuevo cliente" }),
    ).toBeVisible();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: testInfo.outputPath("clientes-nuevo-dialogo.png"),
      fullPage: false,
    });
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("clientes-escritorio.png"),
      fullPage: true,
    });

    expect(errores).toEqual([]);
  });
});

test.describe("lecturas", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("guarda una lectura, avisa consumo atípico y filtra pendientes", async ({
    page,
  }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Lecturas", exact: true })
      .click();

    await expect(page).toHaveURL(/\/lecturas/);
    await expect(page.getByRole("heading", { name: "Lecturas", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Avance de lecturas" })).toBeVisible();
    await expect(page.getByText("María Elena Benítez", { exact: true })).toBeVisible();

    // Re-guarda el mismo valor de la primera fila: no altera el dato y verifica el flujo.
    const primeraLectura = page.getByLabel("Lectura actual").first();
    await primeraLectura.fill("135.4");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await expect(page.getByText("Lectura guardada para María Elena Benítez")).toBeVisible();
    await expect(page.getByLabel("Lectura actual").nth(1)).toBeFocused();

    // Un consumo mayor a 3× el promedio abre la confirmación sin guardar.
    await page.getByLabel("Buscar").fill("María");
    await expect(page.getByText("María Elena Benítez", { exact: true })).toBeVisible();
    await page.getByLabel("Lectura actual").first().fill("300");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Consumo atípico" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByLabel("Buscar").fill("");
    await page.getByLabel("Ver").selectOption("pendientes");
    await expect(page.getByText("Juan Carlos Villalba")).toBeVisible();
    await expect(page.getByText("María Elena Benítez", { exact: true })).toHaveCount(0);

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("lecturas-escritorio.png"),
      fullPage: true,
    });

    expect(errores).toEqual([]);
  });
});

test.describe("tarifas", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("muestra la tarifa vigente, calcula y abre el alta", async ({
    page,
  }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Tarifas" })
      .click();

    await expect(page).toHaveURL(/\/tarifas/);
    await expect(page.getByRole("heading", { name: "Tarifas", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tarifa 2026" })).toBeVisible();
    await expect(page.getByText("Vigente", { exact: true })).toBeVisible();
    await expect(page.getByText("0 m³ – 20 m³")).toBeVisible();

    // 20 m³: cargo fijo 30.000 + 10 m³ de excedente a 3.000 = 60.000 Gs.
    await page.getByLabel("Consumo (m³)").fill("20");
    await page.getByRole("button", { name: "Calcular" }).click();
    await expect(page.getByText("60.000 Gs.")).toBeVisible();
    await expect(page.getByText("30.000 Gs.").first()).toBeVisible();

    await page.getByRole("button", { name: "Nueva tarifa" }).click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Nueva tarifa" }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog").getByText("Tramos de excedente"),
    ).toBeVisible();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: testInfo.outputPath("tarifas-nueva-dialogo.png"),
      fullPage: false,
    });
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("tarifas-escritorio.png"),
      fullPage: true,
    });

    expect(errores).toEqual([]);
  });
});

test.describe("reportes", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("muestra los tres reportes y descarga el CSV de recaudación", async ({
    page,
  }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Reportes" })
      .click();

    await expect(page).toHaveURL(/\/reportes/);
    await expect(page.getByRole("heading", { name: "Reportes", exact: true })).toBeVisible();

    // Morosos: con los datos demo no hay facturas vencidas.
    await expect(page.getByRole("heading", { name: "Clientes morosos" })).toBeVisible();
    await expect(page.getByText("No hay clientes morosos")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("reportes-morosos.png"),
      fullPage: true,
    });

    // Consumo del período: 3 lecturas cargadas y 47 m³.
    await page.getByRole("button", { name: "Consumo", exact: true }).click();
    await expect(page.getByText("3 / 8")).toBeVisible();
    await expect(page.getByText("47 m³")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("reportes-consumo.png"),
      fullPage: true,
    });

    // Recaudación del mes en curso: 135.000 Gs. vigentes.
    await page.getByRole("button", { name: "Recaudación" }).click();
    await expect(page.getByText("135.000 Gs.").first()).toBeVisible();
    await expect(page.getByText("Efectivo")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("reportes-recaudacion.png"),
      fullPage: true,
    });

    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Exportar CSV" }).click(),
    ]);

    const ruta = await descarga.path();
    expect(ruta).not.toBeNull();

    const contenido = await readFile(ruta as string, "utf8");
    expect(contenido).toContain("Recibo,Fecha,Cliente");
    expect(contenido).toContain("REC-000001");
    expect(contenido).toContain("115000");

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    expect(errores).toEqual([]);
  });
});

test.describe("períodos", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("lista los períodos y sugiere el próximo al abrir uno", async ({
    page,
  }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Períodos" })
      .click();

    await expect(page).toHaveURL(/\/periodos/);
    await expect(page.getByRole("heading", { name: "Períodos", exact: true })).toBeVisible();
    await expect(page.getByText("Noviembre 2026")).toBeVisible();
    await expect(page.getByText("Abierto", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Abrir período" }).click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Abrir período" }),
    ).toBeVisible();
    await expect(page.getByLabel("Año")).toHaveValue("2026");
    await expect(page.getByLabel("Mes")).toHaveValue("12");
    await expect(page.getByLabel("Fecha de vencimiento")).toHaveValue("2027-01-10");
    await page.waitForTimeout(350);
    await page.screenshot({
      path: testInfo.outputPath("periodos-nuevo.png"),
      fullPage: false,
    });
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.screenshot({
      path: testInfo.outputPath("periodos.png"),
      fullPage: true,
    });

    expect(errores).toEqual([]);
  });
});

test.describe("configuración y auditoría", () => {  test.use({ viewport: { width: 1440, height: 900 } });

  test("guarda la configuración y muestra la auditoría", async ({
    page,
  }, testInfo) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page);
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Configuración" })
      .click();

    await expect(page).toHaveURL(/\/configuracion/);
    await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible();
    await expect(page.getByLabel("Nombre")).toHaveValue("Aguatería San Blas");
    await expect(page.getByLabel("Día de vencimiento")).toHaveValue("10");
    await page.screenshot({
      path: testInfo.outputPath("configuracion.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Configuración guardada")).toBeVisible();

    await page.getByRole("button", { name: "Auditoría" }).click();
    await expect(page.getByText("Configuración actualizada").first()).toBeVisible();
    await expect(page.getByText("Pago registrado").first()).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("auditoria.png"),
      fullPage: true,
    });

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);

    expect(errores).toEqual([]);
  });
});

test.describe("permisos de operador", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("no ve tarifas ni configuración y no puede entrar por URL", async ({ page }) => {
    const errores = capturarErrores(page);

    await iniciarSesion(page, "operador", "operador1234");

    await expect(page.getByRole("link", { name: "Tarifas" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Configuración" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Períodos" })).toHaveCount(0);
    await expect(
      page
        .getByRole("navigation", { name: "Navegación principal" })
        .getByRole("link", { name: "Lecturas", exact: true }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Cobranzas" })
      .click();
    await expect(page).toHaveURL(/\/cobranzas/);
    await expect(page.getByRole("button", { name: "Generar facturas" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cierre de caja" })).toBeVisible();

    await page.goto("/tarifas");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("kpi-clientes")).toBeVisible();

    await page.goto("/configuracion");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("kpi-clientes")).toBeVisible();

    await page.goto("/periodos");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("kpi-clientes")).toBeVisible();

    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Clientes", exact: true })
      .click();
    await expect(page).toHaveURL(/\/clientes/);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuevo cliente" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Editar / })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Instalar medidor a / })).toHaveCount(0);

    expect(errores).toEqual([]);
  });
});
