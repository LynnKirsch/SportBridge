# SportBridge

SportBridge — технический каркас сервиса выкупа и доставки спортивных товаров. Бизнес-функции на этом этапе не реализованы.

## Стек

- Node.js 24 LTS;
- Next.js 16, React 19 и TypeScript в строгом режиме;
- PostgreSQL 18 в Docker Compose;
- Prisma ORM и ESLint.

## Требования

Нужны Node.js 24 LTS, npm и Docker с Docker Compose.

## Локальный запуск

1. Скопируйте пример переменных окружения:

   ```bash
   cp .env.example .env
   ```

   В PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Установите зависимости:

   ```bash
   npm install
   ```

3. Запустите PostgreSQL:

   ```bash
   docker compose up -d db
   ```

4. Сгенерируйте Prisma Client:

   ```bash
   npm run prisma:generate
   ```

5. Запустите приложение:

   ```bash
   npm run dev
   ```

Проверка доступности приложения: `GET /api/health` возвращает `{ "status": "ok" }`.

## Проверки

```bash
npm run typecheck
npm run lint
npm run prisma:validate
npm run prisma:generate
npm run build
docker compose config
```
