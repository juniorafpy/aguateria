# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Aguatería ERP
**Generated:** 2026-11-08
**Updated:** 2026-11-09 (sincronizado con la implementación)
**Category:** Government/Public Service
**Design Dials:** Variance 3/10 (Centered / Minimal) | Motion 3/10 (Subtle) | Density 8/10 (Dense / Dashboard)

---

## Global Rules

### Color Palette — Light

| Role                 | Hex       | CSS Variable             |
| -------------------- | --------- | ------------------------ |
| Primary              | `#0369A1` | `--primary`              |
| Primary Foreground   | `#FFFFFF` | `--primary-foreground`   |
| Secondary            | `#E0F2FE` | `--secondary`            |
| Secondary Foreground | `#075985` | `--secondary-foreground` |
| Accent               | `#0891B2` | `--accent`               |
| Accent Foreground    | `#FFFFFF` | `--accent-foreground`    |
| Background           | `#F5F9FC` | `--background`           |
| Foreground           | `#0F172A` | `--foreground`           |
| Card                 | `#FFFFFF` | `--card`                 |
| Card Foreground      | `#0F172A` | `--card-foreground`      |
| Muted                | `#EEF4F9` | `--muted`                |
| Muted Foreground     | `#475569` | `--muted-foreground`     |
| Border               | `#DBE7F1` | `--border`               |
| Input                | `#CFE0EC` | `--input`                |
| Ring                 | `#0284C7` | `--ring`                 |
| Destructive          | `#DC2626` | `--destructive`          |
| Success              | `#15803D` | `--success`              |
| Warning              | `#B45309` | `--warning`              |

### Color Palette — Dark

| Role                 | Hex       | CSS Variable             |
| -------------------- | --------- | ------------------------ |
| Primary              | `#38BDF8` | `--primary`              |
| Primary Foreground   | `#082F49` | `--primary-foreground`   |
| Secondary            | `#16344A` | `--secondary`            |
| Secondary Foreground | `#BAE6FD` | `--secondary-foreground` |
| Accent               | `#22D3EE` | `--accent`               |
| Accent Foreground    | `#083344` | `--accent-foreground`    |
| Background           | `#0B1220` | `--background`           |
| Foreground           | `#E2E8F0` | `--foreground`           |
| Card                 | `#111C2E` | `--card`                 |
| Card Foreground      | `#E2E8F0` | `--card-foreground`      |
| Muted                | `#16283B` | `--muted`                |
| Muted Foreground     | `#94A3B8` | `--muted-foreground`     |
| Border               | `#1E3A52` | `--border`               |
| Input                | `#24455F` | `--input`                |
| Ring                 | `#38BDF8` | `--ring`                 |
| Destructive          | `#F87171` | `--destructive`          |
| Success              | `#4ADE80` | `--success`              |
| Warning              | `#FBBF24` | `--warning`              |

**Color Notes:** Agua/azul sereno, alto contraste, sin degradados ajenos a la marca. El modo
oscuro no invierte la jerarquía: mantiene superficies azuladas y texto claro. Los estados usan
`success`, `warning` y `destructive` con fondos al 10 % para no competir con la acción principal.

### Typography

- **Heading Font:** Plus Jakarta Sans Variable
- **Body Font:** Plus Jakarta Sans Variable
- **Mood:** clara, moderna, cercana, legible en pantalla de celular a la intemperie
- **Package:** `@fontsource-variable/plus-jakarta-sans` (autoalojada, sin pedidos a Google Fonts)
- **Fallbacks:** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`

**CSS Import:**

```css
@import "@fontsource-variable/plus-jakarta-sans";

@theme inline {
  --font-sans:
    "Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system,
    "Segoe UI", sans-serif;
}
```

**Jerarquía usada:**

- Título de página: `text-2xl md:text-3xl font-bold tracking-tight`
- Título de tarjeta: `text-base font-bold tracking-tight`
- Texto de apoyo: `text-sm text-muted-foreground`
- Etiqueta de sección: `text-[11px] font-semibold uppercase tracking-wider`
- Cifras: `tabular-nums` para que no salten al actualizarse

### Radius, Spacing & Shadows

- **Base radius:** `0.75rem` (12 px); tarjetas y modales usan 12–16 px.
- **Density 8/10:** padding de tarjeta `1.25rem`, separación entre tarjetas `1rem`,
  alto de controles `2.75rem` (44 px) para uso táctil.
- **Sombras:** una sola elevación suave
  `0 1px 2px rgba(15,23,42,.04), 0 8px 24px -16px rgba(15,23,42,.18)`.
  No usar sombras duras ni múltiples niveles.

### Layout

- **Mobile-first:** la pantalla de lecturas se diseña primero a 390 px.
- **Shell:** sidebar fija de 256 px en `md+`; en móvil, header compacto, menú lateral y
  barra inferior de 5 accesos (Inicio, Lecturas, Pagos, Clientes, Más).
- **Contenido:** ancho máximo `80rem`, padding `1rem` en móvil y `2rem` en escritorio.
- **Objetivo táctil mínimo:** 44 × 44 px.
- **Safe areas:** `pb-[env(safe-area-inset-bottom)]` en la barra inferior.

---

## Component Specs

### Buttons

```css
/* Primario */
.btn-primary {
  height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  background: #0369a1;
  color: #ffffff;
  font-weight: 600;
  transition:
    background-color 200ms ease,
    box-shadow 200ms ease;
}

.btn-primary:hover {
  background: #0369a1e6;
}
.btn-primary:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px #f5f9fc,
    0 0 0 4px #0284c7;
}
```

Variantes: `outline` (borde `--input`, fondo de tarjeta), `ghost` (hover `--muted`),
`destructive`, `success`. Tamaños: `sm` 36 px, `default` 44 px, `lg` 48 px, `icon` 44 px.

### Cards

```css
.card {
  background: #ffffff;
  border: 1px solid #dbe7f1;
  border-radius: 12px;
  padding: 20px;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 24px -16px rgba(15, 23, 42, 0.18);
}
```

Las tarjetas no se elevan al hover si no son clicables. Las filas de tabla y los accesos
rápidos usan `hover:bg-muted/40` para indicar interacción.

### Inputs

```css
.input {
  height: 44px;
  padding: 0 12px;
  border: 1px solid #cfe0ec;
  border-radius: 8px;
  background: #ffffff;
  font-size: 16px; /* evita el zoom automático en iOS */
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.input:focus-visible {
  border-color: #0284c7;
  outline: none;
  box-shadow:
    0 0 0 2px #f5f9fc,
    0 0 0 4px #0284c7;
}

.input[aria-invalid="true"] {
  border-color: #dc2626;
}
```

### Badges & States

- `success`: fondo `--success/10`, texto `--success` → período abierto, lectura cargada.
- `warning`: fondo `--warning/10`, texto `--warning` → pendiente, mora, módulo futuro.
- `destructive`: fondo `--destructive/10` → anulado, error.
- `secondary`: fondo `--secondary` → información neutra.

Siempre acompañar el color con texto o ícono: nunca comunicar estado solo por color.

### Modals / Sheets

- Overlay `bg-slate-950/50` con `backdrop-blur-[2px]`.
- Panel de 86 % de ancho, máximo 320 px, borde lateral y sombra `shadow-2xl`.
- Cierre con botón visible, tecla `Escape` y clic en el overlay.
- Título accesible obligatorio (`SheetTitle`, aunque sea `sr-only`).

---

## Style Guidelines

**Style:** Minimalismo funcional con acentos de agua.

**Keywords:** limpio, luminoso, celeste, ordenado, táctil, legible, sin adornos.

**Key Effects:** transiciones de 150–250 ms, hover sutil, sin parallax ni animaciones
decorativas. Respetar `prefers-reduced-motion`.

### Page Pattern

**Dashboard operativo:**

1. Saludo y período activo.
2. Cuatro KPIs: clientes activos, facturado, cobrado, pendiente.
3. Avance de lecturas con barra y acceso directo a la pantalla de carga.
4. Accesos rápidos y estado de cobranza.
5. Vencimiento del período.

**Pantalla de uso diario (lecturas):** una fila por cliente, lectura anterior visible,
input numérico grande, consumo calculado en vivo y avance al siguiente cliente.

---

## Motion

**Microinteracciones** — Duración 150–250 ms, easing `ease-out`.

```css
transition:
  color 200ms ease,
  background-color 200ms ease,
  border-color 200ms ease;
```

- ✅ Cambios de color y elevación suaves.
- ✅ Barra de progreso animada en `width` (500 ms).
- ❌ Sin animaciones de entrada que retrasen el uso diario.
- ❌ Sin `transform: scale()` que mueva el layout.
- ✅ `@media (prefers-reduced-motion: reduce)` desactiva lo no esencial.

---

## Accessibility

- Contraste mínimo 4.5:1 en texto y 3:1 en componentes.
- Foco visible con anillo de 2 px y offset de 2 px.
- Todos los inputs tienen `<label>` asociado; los botones de ícono, `aria-label`.
- Navegación por teclado completa; diálogos con manejo de foco de Radix.
- Mensajes de error junto al campo (`role="alert"`) y en un `Alert` general.
- No usar emojis como íconos: set único Lucide.

---

## Anti-Patterns (Do NOT Use)

- ❌ Degradados violeta/rosa ajenos a la marca.
- ❌ Sombras duras, vidrio esmerilado excesivo o bordes neón.
- ❌ Texto gris claro sobre fondo claro.
- ❌ Íconos sin etiqueta accesible.
- ❌ Tablas que desbordan la pantalla sin scroll horizontal.
- ❌ Contenido tapado por la barra inferior fija.
- ❌ Animaciones decorativas o autoplay.

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Sin emojis como íconos; set Lucide consistente.
- [ ] `cursor-pointer` en todo elemento clicable.
- [ ] Hover y focus visibles, con transición de 150–300 ms.
- [ ] Contraste 4.5:1 en modo claro y oscuro.
- [ ] Formularios con label, error y `aria-invalid`.
- [ ] Responsive verificado a 390 px, 768 px, 1024 px y 1440 px.
- [ ] Sin scroll horizontal en móvil.
- [ ] Sin contenido tapado por header o barra inferior.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Modo claro y oscuro revisados en captura.
