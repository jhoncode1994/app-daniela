# Control de jornadas y pagos

Aplicación web móvil (PWA) para registrar jornadas, calcular pagos en minutos y liquidar trabajadoras.

## Stack

- Frontend: Angular 19 + Angular Material + PWA
- Backend: NestJS + Prisma
- Base de datos: PostgreSQL 16
- Despliegue: Docker Compose

## Requisitos en este computador

- Node.js 22+
- Docker Desktop (recomendado para base de datos y despliegue)

En esta máquina de desarrollo Docker aún no está instalado. Para probar el flujo completo hay que instalar Docker Desktop o un PostgreSQL local.

## Arranque local (desarrollo)

1. Copiar variables de entorno:

```
copy .env.example .env
copy .env backend\.env
```

2. Levantar PostgreSQL. Con Docker:

```
docker compose up -d db
```

Sin Docker, cree una base `jornadas` y ajuste `DATABASE_URL` en `backend/.env`.

3. Backend:

```
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

La API queda en `http://localhost:3000/api/health`.

4. Frontend (otra terminal):

```
cd frontend
npm install
npm start
```

La app queda en `http://localhost:4200`.

Usuario inicial:

- Usuario: `admin`
- Contraseña: `admin123` (cámbiela en `.env`)

## Referencias (lotes)

Cada lote que llega al taller se registra como una **referencia dentro de un proveedor**, con
unidades y valor por unidad (la app multiplica y muestra el valor del lote) y observaciones
opcionales.

- Al registrar horas se elige proveedor y, enseguida, una de sus referencias abiertas.
- Al liquidar se elige trabajadora, proveedor y referencia; el total mostrado es solo de esa
  referencia y se puede destildar jornadas para pagar únicamente lo que se quiera.
- Cuando el lote sale del taller se le **da de baja**: deja de aparecer al registrar horas, pero
  sigue en el historial y se puede seguir liquidando.
- En cada referencia se ve la mano de obra (pagada y por pagar) y la ganancia
  (valor del lote − mano de obra).
- En Inicio, el total que se le debe a cada trabajadora viene desglosado por proveedor y
  referencia.

Las jornadas registradas antes de esta versión quedan sin referencia; se les asigna una
corrigiendo el registro en el historial.

## Cálculos

Todo se calcula en el backend, en minutos enteros y pesos enteros:

- `05:00` a `19:00` = 840 minutos
- 840 - 50 = 790 minutos netos
- `round(790 * 6000 / 60)` = `$79.000`

Si la hora de salida es menor o igual que la de entrada, se interpreta como turno que cruza medianoche.

## Despliegue en servidor propio

Antes de decidir detalles, ejecute en el servidor:

Linux:

```
sh scripts/check-server.sh
```

Windows:

```
powershell -File scripts/check-server.ps1
```

Luego, con Docker instalado:

```
copy .env.example .env
```

Edite `.env` (claves, usuario admin y `CORS_ORIGIN` con la URL pública).

Producción (PostgreSQL no se publica a Internet):

```
docker compose -f docker-compose.prod.yml up -d --build
```

Actualizar:

```
docker compose -f docker-compose.prod.yml up -d --build
```

Reiniciar:

```
docker compose -f docker-compose.prod.yml restart
```

Las migraciones se ejecutan al arrancar el contenedor `api`.
