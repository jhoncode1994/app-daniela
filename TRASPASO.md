# Qué falta para continuar

Documento para la IA que sigue el trabajo y **sí tiene acceso a la base de datos**. Estado:
**23 de octubre de 2026**, commit `aee81d8` ya en `origin/main`.

> **Antes de empezar:** el código de la aplicación está terminado, compilado y subido. No hace
> falta reescribirlo ni rediseñar nada. Lo pendiente es base de datos, despliegue y pruebas con
> datos reales. Si al probar aparece un error, corrígelo; pero no rehagas lo que ya está.
> Hacer `git pull` antes de tocar nada.

---

## 0. Resumen en una línea

El código de las referencias de lote y el rediseño **están completos y subidos**. Lo que falta es
**poner la base de datos y el backend en línea con ese código, y probar el flujo real** — cosas
que necesitan acceso a la base de producción, que no había en la máquina donde se programó.

---

## 1. Qué se construyó (contexto para entender lo que falta)

La app es un control de jornadas y pagos de un taller: Angular 19 (PWA) + NestJS + Prisma +
PostgreSQL.

El cambio introduce el concepto de **referencia de lote**:

- Cuando llega un lote al taller, se registra como una **referencia dentro de un proveedor**, con
  **unidades** y **valor por unidad** (la app multiplica y muestra el valor del lote) y
  observaciones opcionales. Pantalla: *Lotes*, ruta `/referencias`.
- Al **registrar horas** se elige trabajadora, proveedor y, de las referencias abiertas de ese
  proveedor, una referencia. **Es obligatoria.**
- Al **liquidar** se elige trabajadora, proveedor y referencia. El total mostrado es solo de esa
  referencia; las fechas quedaron como filtro opcional. Se pueden destildar jornadas para pagar
  únicamente las que se quieran.
- Cuando el lote sale del taller se le **da de baja**: deja de aparecer al registrar horas, pero
  sigue en el historial y se puede seguir liquidando.
- Cada referencia muestra **mano de obra** (pagada y por pagar) y **ganancia** = valor del lote −
  mano de obra.
- En *Inicio*, lo que se le debe a cada trabajadora viene **desglosado por proveedor y
  referencia**, y cada línea lleva directo a liquidar esa referencia.

Modelo de datos nuevo: tabla `lots` (FK a `providers`, único por `provider_id` + `reference`), y
columna `lot_id` **nullable** en `work_shifts` y en `payments`.

Archivos nuevos: `backend/src/lots/` (módulo CRUD), `frontend/src/app/features/lots/`,
`backend/prisma/migrations/20261023120000_lots/`.

---

## 2. Lo que falta, en orden

### 2.1 Registrar la migración en Prisma — OBLIGATORIO Y PRIMERO

La migración `20261023120000_lots` **se ejecutó a mano** en el SQL Editor de la base de
producción. La tabla `_prisma_migrations` no tiene el registro, así que el próximo
`prisma migrate deploy` intentará aplicarla otra vez y fallará con *"relation lots already
exists"*, tumbando el arranque del contenedor `api` (las migraciones corren al arrancar).

Desde `backend`, con `DATABASE_URL` apuntando a la base de producción:

```
npx prisma migrate resolve --applied 20261023120000_lots
npx prisma migrate status
```

`migrate status` debe reportar que no hay migraciones pendientes.

### 2.2 Verificar que el esquema real coincide

En la base, confirmar:

- Tabla `lots` con: `id`, `provider_id`, `reference`, `notes`, `units`, `unit_price`, `closed`,
  `closed_at`, `created_at`, `updated_at`.
- Índice único `lots_provider_id_reference_key` y FK `lots_provider_id_fkey`.
- Columna `lot_id` (UUID, nullable) en `work_shifts` y en `payments`, con sus FK.

Si algo falta, el archivo de referencia es
`backend/prisma/migrations/20261023120000_lots/migration.sql`.

### 2.3 Desplegar el backend

El backend cambió: módulo `lots`, DTOs de `shifts` y `payments`, y `dashboard`. Hasta que no se
despliegue, el frontend nuevo recibe **404 en `/api/lots`** y **400 al registrar jornadas**.

### 2.4 Crear la primera referencia

**Sin al menos una referencia no se puede registrar ninguna jornada**, porque el campo es
obligatorio. Se crea desde la app, en *Lotes*, eligiendo proveedor.

Alternativa: `npx prisma db seed` crea una `REF-1` de ejemplo por proveedor, pero **solo si la
tabla `lots` está vacía**.

### 2.5 Asignar referencia a las jornadas anteriores

Las jornadas que ya existían quedaron con `lot_id = NULL`. En la app salen agrupadas como *"Sin
referencia"* y se les asigna una **editando el registro** en el historial (el diálogo de
corrección ya tiene el selector).

Si se quiere hacer en bloque por SQL, primero hay que crear la referencia destino:

```sql
UPDATE "work_shifts" ws
SET "lot_id" = (
  SELECT l."id" FROM "lots" l
  WHERE l."provider_id" = ws."provider_id" AND l."reference" = 'REF-1'
)
WHERE ws."lot_id" IS NULL;
```

**Advertencia:** eso mete todo el historial viejo en una sola referencia, lo que falsea la
ganancia de ese lote. Si el histórico importa poco, es preferible dejarlo en NULL.

### 2.6 Probar el flujo completo contra la base real

Nada de la lógica de referencias se probó contra una base de datos: en la máquina donde se
programó no había PostgreSQL ni Docker. Lo único verificado fue que compila
(`prisma generate`, `tsc --noEmit`, `npm run build` en backend y frontend) y que el rediseño se ve
bien en el navegador, **sin datos**.

Hay que probar, en este orden:

1. Crear una referencia en un proveedor, con unidades y valor por unidad. Verificar que el valor
   del lote = unidades × valor, y que no deja repetir la misma referencia en el mismo proveedor.
2. Registrar horas eligiendo proveedor y referencia. Verificar que al cambiar de proveedor se
   recarga la lista de referencias y se limpia la selección.
3. Liquidar esa referencia **destildando alguna jornada**. Verificar que el pago cubre solo las
   seleccionadas, que el resto queda pendiente, y que el PDF trae la referencia.
4. Revisar en *Inicio* que la deuda de la trabajadora sale desglosada por proveedor y referencia,
   y que cada línea lleva a liquidar esa referencia.
5. Dar de baja la referencia: debe desaparecer al registrar horas, seguir visible en el historial
   y seguir siendo liquidable.
6. Anular un pago y verificar que las jornadas vuelven a pendientes y la ganancia de la referencia
   se recalcula.

---

## 3. Cosas que conviene saber antes de tocar el código

### Decisiones tomadas

- `lot_id` es **nullable en la base** (para no romper el histórico) pero **obligatorio en los
  DTO** de creación de jornadas. Al corregir una jornada sí se permite asignar una referencia
  **dada de baja**, a propósito, para poder arreglar registros viejos.
- El modelo se llama `Lot` en el código (tabla `lots`) y **"referencia" / "lote" en la interfaz**.
  Se evitó el nombre `Batch` porque ya existe `BatchShiftsDto`, que es otra cosa: registrar varios
  tramos de un mismo día.
- El dinero se maneja en **enteros** (pesos), como en el resto de la app.
- Al liquidar, `shiftIds` es opcional: si no viene, se paga todo lo pendiente de esa referencia.
- Eliminar una referencia solo se permite si no tiene jornadas; si las tiene, hay que darla de
  baja.

### Limitaciones conocidas

- En el menú, cuando se ve el historial de una trabajadora concreta (`/jornadas/:id`) no queda
  ningún ítem resaltado. Es el precio de que `/jornadas/nueva` no marcara "Historial" a la vez que
  "Registrar".
- El panel de *Inicio* agrupa las jornadas sin referencia bajo *"Sin referencia"*, sin enlace a
  liquidar (no se puede liquidar sin referencia).

### Sistema de diseño

`frontend/src/styles.scss` es la base: paleta clara y oscura, escalas de superficie, forma y
elevación, cifras con `tabular-nums`, y clases reutilizables — `.eyebrow`, `.label`, `.lead` /
`.hint`, `.inset`, `.empty-state`, `.pill` (+ `.is-success`, `.is-off`), `.segmented`,
`.sticky-bar`. Al tocar estilos, **usar esas clases en vez de redeclararlas** en cada componente.
Mantener `min-height: var(--touch)` en todo lo tocable y probar en claro, oscuro y a 360px.

### Levantar el proyecto

```
cd backend && npm install && npx prisma generate && npm run start:dev
cd frontend && npm install && npm start
```

El frontend queda en `http://localhost:4200` y hace proxy de `/api` al backend en el 3000.

### Pendiente menor de limpieza

Hay tres archivos `.pyc` en `.agents/skills/ui-ux-pro-max/scripts/__pycache__/` que están en el
índice de git sin commitear, desde antes de este trabajo. Son basura de compilación: lo correcto
es sacarlos del índice y añadir `__pycache__/` al `.gitignore`.
