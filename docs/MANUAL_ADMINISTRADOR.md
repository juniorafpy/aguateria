# Manual del administrador — Aguatería ERP

Este manual describe el uso diario del sistema para la persona que administra la aguatería.
Todos los importes están en **guaraníes enteros** y las fechas se muestran como `dd/mm/aaaa`.

---

## 1. Ingreso y roles

- **Administrador:** acceso completo. Puede abrir y cerrar períodos, gestionar clientes,
  medidores y tarifas, anular facturas o pagos, y ver configuración y auditoría.
- **Operador:** uso de campo. Puede consultar clientes, cargar lecturas, registrar pagos,
  imprimir recibos y ver reportes. No puede generar facturas, anular, ni cambiar tarifas,
  períodos o configuración.

Los usuarios iniciales del seed son:

| Usuario    | Contraseña    | Rol       |
| ---------- | ------------- | --------- |
| `admin`    | `admin1234`   | admin     |
| `operador` | `operador1234`| operador  |

> Cambiá estas credenciales antes de usar el sistema en producción. La gestión de usuarios
> desde la interfaz queda como mejora pendiente; por ahora los usuarios se crean con el seed
> o con la API de autenticación.

---

## 2. Puesta en marcha (responsable técnico)

1. Instalar **Node.js 22+**, **pnpm 12** y **PostgreSQL 18**.
2. Copiar `.env.example` a `.env` y completar `DATABASE_URL`, `BETTER_AUTH_SECRET` y
   `BETTER_AUTH_URL`.
3. Instalar dependencias y preparar la base:

   ```bash
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   ```

4. Levantar la aplicación en desarrollo:

   ```bash
   pnpm dev
   ```

   La web queda en `http://localhost:5173` y la API en `http://localhost:3001`.

5. Para producción: `pnpm build`. Los respaldos se explican más abajo.

---

## 3. Ciclo mensual de trabajo

### 3.1 Abrir el período

1. Ir a **Períodos** (menú Administración).
2. Presionar **Abrir período**.
3. Revisar año, mes y fecha de vencimiento. El sistema sugiere el día configurado en
   **Configuración → Reglas de cobranza**.
4. Confirmar. Se crean las lecturas pendientes para todos los clientes activos con medidor.

Solo puede existir un período por mes. Si ya existe, el sistema lo informa.

### 3.2 Cargar las lecturas

1. Ir a **Lecturas**. El selector arranca en el período abierto.
2. Buscar por nombre, código o dirección si hace falta.
3. Para cada cliente, escribir la **lectura actual** en el campo correspondiente.
   El consumo se calcula en vivo.
4. Presionar **Guardar** en la fila. El foco pasa solo al siguiente cliente.
5. Si el consumo supera 3 veces el promedio, el sistema pide confirmación. No bloquea el
   guardado: solo verifica que la lectura sea correcta.
6. Usar **Observación** para casos como “medidor trabado” o “casa cerrada”.
7. Los filtros **Pendientes** y **Cargadas** ayudan a controlar el avance.

Reglas:

- La lectura actual no puede ser menor que la anterior.
- Solo se editan lecturas de períodos **abiertos**.
- Un cliente sin medidor activo no puede cargar lectura.

### 3.3 Generar las facturas

Esta acción es exclusiva del administrador.

1. Ir a **Cobranzas** y elegir el período.
2. Presionar **Generar facturas**.
3. Revisar la vista previa: clientes, consumo, saldo anterior y total a cobrar.
4. Confirmar. Solo se facturan clientes con lectura cargada.
5. Si faltó cargar una lectura, cargarla y volver a generar: la operación es idempotente y
   solo crea las facturas que faltan.

La numeración es correlativa por período: `F-AAAAMM-0001`.

### 3.4 Imprimir los recibos

- **Individual:** en la fila de la factura, presionar el ícono de impresora, revisar el
  detalle y presionar **Imprimir**.
- **Masivo:** en **Cobranzas**, presionar **Imprimir recibos**. Se abre una sola ventana con
  un recibo por página, listo para entregar casa por casa. Las facturas anuladas no se incluyen.

Los recibos son **comprobantes internos**; no son facturas legales ni usan SIFEN.

### 3.5 Registrar pagos

1. En **Cobranzas**, buscar la factura y presionar **Cobrar**.
2. Ingresar el monto (puede ser parcial), método y fecha.
3. Guardar. El recibo interno queda disponible desde el detalle de la factura.

Reglas:

- Si el pago supera la deuda de la factura, el excedente queda como **saldo a favor** del
  cliente y se descuenta del saldo anterior en la próxima factura.
- La API también admite pagos generales que se aplican **FIFO** a la factura más antigua;
  la pantalla actual cobra sobre la factura seleccionada.
- Un pago anulado deja de contar y la factura vuelve a pendiente o parcial.

### 3.6 Cierre de caja

1. En **Cobranzas**, presionar **Cierre de caja**.
2. Elegir el rango de fechas (por defecto, hoy).
3. Revisar total recaudado, cantidad de pagos, anulados y desglose por método.
4. Presionar **Imprimir** para archivar el cierre.

### 3.7 Cerrar el período

1. Ir a **Períodos**.
2. Presionar **Cerrar** en el período correspondiente y confirmar.

Un período cerrado bloquea la carga de lecturas y la generación de facturas. Si hace falta
corregir algo, usar **Reabrir**, hacer el ajuste y volver a cerrar.

---

## 4. Clientes y medidores

- **Alta:** Clientes → **Nuevo cliente**. Se pueden cargar los datos y, opcionalmente, el
  medidor con su lectura inicial.
- **Edición:** ícono de lápiz. El medidor se gestiona por separado.
- **Cambio de medidor:** ícono de medidor → **Instalar medidor**. El medidor anterior se
  retira automáticamente y se registra el nuevo con su lectura inicial.
- **Ficha:** ícono del ojo. Muestra datos, medidor activo e historial de lecturas.
- **Estado de cuenta:** desde la ficha, botón **Estado de cuenta**. Incluye facturas, pagos,
  deuda, saldo a favor y una versión imprimible.

El operador puede consultar el padrón y las fichas, pero no crear ni editar.

---

## 5. Tarifas

Solo el administrador puede gestionarlas.

1. Ir a **Tarifas**.
2. Presionar **Nueva tarifa**.
3. Completar nombre, fecha de vigencia, cargo fijo y m³ incluidos.
4. Cargar los tramos de excedente:
   - El primero empieza en 0 m³.
   - Los tramos son contiguos.
   - Solo el último puede quedar sin límite (dejar “Hasta” vacío).
5. Guardar. La tarifa anterior se cierra automáticamente el día anterior.

La **Calculadora** permite probar cuánto se cobra por un consumo con una tarifa determinada y
ver el desglose por tramo.

---

## 6. Reportes

En **Reportes** hay tres pestañas, todas con **Exportar CSV** para abrir en Excel:

- **Morosos:** clientes con facturas vencidas e impagas, deuda y meses de atraso.
- **Consumo:** consumo del período por cliente, lecturas cargadas y total en m³.
- **Recaudación:** pagos vigentes por rango de fechas, total por método y por día.

Los pagos anulados no suman en la recaudación. El reporte de consumo incluye a todos los
clientes no dados de baja, aunque todavía no tengan lectura.

---

## 7. Configuración y auditoría

En **Configuración** (solo admin):

- **Datos de la aguatería:** nombre, RUC, teléfono y dirección.
- **Reglas de cobranza:** día de vencimiento, meses para corte y recargo por mora. El día de
  vencimiento se usa para sugerir la fecha al abrir un período.
- **Auditoría:** lista paginada de pagos, anulaciones, cierres/reaperturas de período y
  cambios de configuración, con usuario, fecha y detalle.

---

## 8. Anulaciones

- Solo el administrador puede anular facturas o pagos.
- **No se borra nada:** la factura o el pago queda marcado como anulado y registrado en la
  auditoría.
- Una factura anulada deja de sumar en los totales y no se puede volver a generar para ese
  cliente en el mismo período.
- Al anular un pago, la factura se recalcula automáticamente.

---

## 9. Respaldos

El proyecto incluye scripts de respaldo con `pg_dump`:

```bash
pnpm backup
```

En Windows también se puede programar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File apps/api/scripts/backup.ps1 `
  -OutDir "D:\Respaldos\Aguateria" -RetentionDays 30
```

En Linux/macOS:

```bash
bash apps/api/scripts/backup.sh /ruta/de/respaldos 30
```

Guardar los respaldos en un disco externo o en la nube. Las instrucciones de restauración con
`pg_restore` están en el `README.md`.

---

## 10. Preguntas frecuentes

**¿Por qué un cliente no aparece en la facturación?**
Porque no tiene lectura cargada, no tiene medidor activo o está dado de baja. La vista previa
indica cuántos clientes quedan sin lectura.

**¿Qué pasa si la lectura es menor que la anterior?**
El sistema la rechaza. Verificar el medidor y corregir el valor.

**¿Puedo modificar una lectura después de facturar?**
Sí, mientras el período siga abierto. Si el período está cerrado, reabrirlo primero. Después
de corregir, volver a generar facturas para los clientes que hayan quedado sin factura.

**¿Cómo se usa el saldo a favor?**
Queda registrado a favor del cliente y se descuenta del saldo anterior en la próxima
facturación.

**¿Los recibos son facturas legales?**
No. Son comprobantes internos imprimibles. No hay integración con SIFEN.

**¿Dónde veo quién anuló o cambió algo?**
En **Configuración → Auditoría**.

---

## 11. Limitaciones conocidas

- La gestión de usuarios y contraseñas todavía no tiene pantalla; se usan los usuarios del
  seed o la API de autenticación.
- El respaldo se ejecuta con los scripts; el botón “Descargar backup” desde la app no está
  implementado.
- La impresión masiva usa la ventana del navegador; hay que permitir ventanas emergentes.
- No se emiten facturas legales electrónicas (SIFEN).
