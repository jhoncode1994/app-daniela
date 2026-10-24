# Traspaso: referencias de lote + rediseño

Estado al 23 de octubre de 2026. Este documento lista **solo lo que falta**. Todo lo demás ya está
implementado y compila (`npm run build` en `backend` y en `frontend`, sin errores).

---

## 1. Base de datos y despliegue (necesita acceso a la base)

La migración `backend/prisma/migrations/20261023120000_lots/migration.sql` **ya se ejecutó a mano**
en el SQL Editor de la base de producción. Por eso falta:

### 1.1 Registrar la migración en Prisma (obligatorio)

Si no se hace, el próximo `prisma migrate deploy` intentará aplicarla otra vez y fallará con
"relation lots already exists". Desde `backend`, con `DATABASE_URL` apuntando a esa base:

```
npx prisma migrate resolve --applied 20261023120000_lots
```

Verificar después:

```
npx prisma migrate status
```

Debe decir que no hay migraciones pendientes.

### 1.2 Verificar el esquema real

Confirmar en la base que existe la tabla `lots` con estas columnas: `id`, `provider_id`,
`reference`, `notes`, `units`, `unit_price`, `closed`, `closed_at`, `created_at`, `updated_at`;
y que `work_shifts` y `payments` tienen la columna nueva `lot_id` (nullable, con FK a `lots`).

### 1.3 Desplegar el backend

El backend cambió (módulo `lots`, DTOs de `shifts` y `payments`, `dashboard`). Hasta que no se
despliegue, el frontend nuevo recibirá 404 en `/api/lots` y 400 al registrar jornadas.

### 1.4 Crear al menos una referencia

**La referencia es obligatoria al registrar horas.** Con la base ya migrada pero sin ninguna
referencia creada, no se puede registrar ninguna jornada. Se crea desde la app en *Lotes*
(ruta `/referencias`), eligiendo proveedor. El seed (`backend/prisma/seed.ts`) crea una `REF-1` de
ejemplo por proveedor, pero solo si la tabla `lots` está vacía y solo si se corre `prisma db seed`.

### 1.5 Jornadas anteriores sin referencia

Las jornadas que ya existían quedaron con `lot_id = NULL`. En la app aparecen agrupadas como
"Sin referencia" y se les asigna una **editando el registro** en el historial (el diálogo de
corrección ya tiene el selector de referencia).

Si se prefiere asignarlas en bloque por SQL, hay que crear primero la referencia destino y luego,
por cada proveedor:

```sql
UPDATE "work_shifts" ws
SET "lot_id" = (
  SELECT l."id" FROM "lots" l
  WHERE l."provider_id" = ws."provider_id" AND l."reference" = 'REF-1'
)
WHERE ws."lot_id" IS NULL;
```

Ojo: eso mete todo el historial viejo en una sola referencia, lo que falsea la ganancia de ese
lote. Es preferible dejarlo en NULL o asignarlo a mano.

---

## 2. Rediseño visual — HECHO

Ya está aplicado en toda la app y verificado en el navegador (claro, oscuro, 375px y escritorio).
No queda trabajo pendiente aquí.

### Sistema de diseño

`frontend/src/styles.scss` se reescribió como sistema de diseño:

- Paleta nueva (rosa/malva más profundo, mejor contraste) con modo claro y oscuro completos.
- Escalas de superficie (`--color-card`, `--surface-2`, `--surface-3`), forma
  (`--radius-xs` … `--radius-pill`) y elevación (`--shadow-xs` … `--shadow-lg`).
- Tipografía con títulos más apretados y cifras con `tabular-nums` (las columnas de dinero cuadran).
- Botones tipo pastilla, campos sobre `--surface-2`, tarjetas con radio mayor.
- Clases reutilizables nuevas: `.eyebrow`, `.label`, `.lead` / `.hint`, `.inset`, `.empty-state`,
  `.pill` (+ `.is-success`, `.is-off`), `.segmented`, `.sticky-bar`, `.money`.
- Token `--rail: 248px` reservado para la navegación de escritorio (ver abajo).

Se conservaron todos los nombres de variables que ya usaban los componentes, así que el cambio es
puramente visual: no se tocó comportamiento, rutas, formularios ni campos.

### Pantallas

- **`layout/shell.component.ts`** — barra superior de 64px con marca; en móvil, navegación
  inferior de 5 ítems con pastilla de activo; desde 1024px esa misma navegación se convierte en un
  **rail lateral** de `--rail` de ancho, con Trabajadoras y Proveedores separados al pie.
- **Login** — tarjeta centrada con la marca arriba.
- **Inicio** — tarjetas de total con acento, deuda por referencia en `.inset`, y un bloque
  "Administrar" como lista de accesos.
- **Registrar jornada** — los tres selectores agrupados en una tarjeta de contexto; el estado del
  ingreso como `.pill`; totales del día en dos columnas.
- **Lotes, Liquidación, Historial, Trabajadoras, Proveedores** — filtros `.segmented`, estados en
  `.pill`, estados vacíos con icono, barra de pago flotante con fondo translúcido.
- **Diálogos** — radio y tipografía del sistema.

### Al seguir tocando estilos

- Usar las clases globales en vez de volver a declararlas en cada componente.
- Mantener `min-height: var(--touch)` en todo lo tocable (es una app de móvil en un taller).
- Probar en claro y oscuro, y a 360px de ancho.
- Material Icons es la fuente de iconos (`index.html`); si se cambia a Material Symbols Rounded,
  dejar `'Material Icons'` como respaldo en la pila de fuentes.

---

## 3. Lo que no se pudo verificar aquí

En esta máquina no hay PostgreSQL ni Docker, así que **la lógica de referencias no se probó contra
la base**. La verificación hecha es: `prisma generate`, `tsc --noEmit` y `npm run build` del
backend; `npm run build` del frontend; y el rediseño revisado en el navegador con el dev server
(las pantallas se abrieron sin API, así que se vio la maqueta, no los datos).

Falta probar el flujo completo con la base real:

1. Crear una referencia en un proveedor, con unidades y valor por unidad.
2. Registrar horas eligiendo proveedor y referencia.
3. Liquidar esa referencia destildando alguna jornada, y confirmar que el pago solo cubre las
   seleccionadas y que el PDF trae la referencia.
4. Revisar que en Inicio la deuda de la trabajadora salga desglosada por proveedor y referencia.
5. Dar de baja la referencia y confirmar que desaparece al registrar horas pero sigue liquidable.
