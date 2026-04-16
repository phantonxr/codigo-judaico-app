# Codigo Judaico App

Frontend em React/Vite com backend em ASP.NET Core 10 e PostgreSQL.

## O que foi adicionado

- API `.NET 10` em [`backend/CodigoJudaico.Api`](backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj)
- EF Core + Npgsql + migration inicial
- Seed do catalogo (`lessons`, `plans`, `offers`, `wisdom`) reaproveitando os dados do frontend
- Endpoints para:
  - sessao/bootstrap
  - perfil do usuario
  - diagnostico financeiro
  - estado da jornada
  - progresso das aulas
  - chat do Rabino Mentor
  - feedback diario
- Sincronizacao do frontend com a API, mantendo `localStorage` apenas como cache/fallback
- `docker-compose.yml` com Postgres (`erp-db`) e API

## Estrutura

- `src/`: frontend React/Vite
- `backend/CodigoJudaico.Api/`: API ASP.NET Core 10
- `docker-compose.yml`: sobe Postgres + API
- `scripts/export-backend-seed.mjs`: exporta o catalogo do frontend para `SeedData`

## Rodando com Docker

1. Suba banco e API:

```bash
docker compose up -d
```

2. Em outro terminal, rode o frontend:

```bash
npm install
npm run dev
```

3. Acesse:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8080`
- Health check: `http://localhost:8080/api/health`

## Rodando backend fora do Docker

Se voce rodar a API direto no host com `dotnet run`, o host do Postgres normalmente precisa ser `localhost`, nao `erp-db`.

Exemplo:

```bash
dotnet user-secrets set "ConnectionStrings:Postgres" "Host=localhost;Port=5432;Database=codjudaicotest;Username=judaictotest;Password=Jud@2026Wa!" --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj
dotnet run --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj
```

Se quiser manter `Host=erp-db`, rode a API dentro do `docker compose`, porque esse nome so resolve dentro da rede Docker.

## Frontend

O frontend usa:

- proxy do Vite para `/api -> http://localhost:8080`
- `VITE_API_BASE_URL` opcional em [`.env.example`](.env.example)

Para desenvolvimento:

```bash
npm install
npm run dev
```

Para build:

```bash
npm run build
```

## Backend

Comandos uteis:

```bash
dotnet build CodigoJudaicoApp.slnx
dotnet dotnet-ef migrations add NomeDaMigration --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj --startup-project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj --output-dir Data/Migrations
dotnet dotnet-ef database update --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj --startup-project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj
```

## Validacao feita

- `dotnet build CodigoJudaicoApp.slnx`
- `dotnet build backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj`
- `dotnet dotnet-ef migrations add InitialCreate ...`
- `dotnet dotnet-ef database update ...`
- `docker compose up -d erp-db`
- `docker compose up -d api`
- `npm install`
- `npm run build`

## Observacao sobre lint

`npm run lint` ainda falha por problemas ja existentes no frontend, principalmente em [`src/pages/Calendario.jsx`](src/pages/Calendario.jsx) e [`src/components/MacroMonthCalendarModal.jsx`](src/components/MacroMonthCalendarModal.jsx). Esses erros ja estavam no codigo e nao impedem o build de producao.
