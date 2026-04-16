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

## Easypanel

Para Easypanel, deixei dois arquivos principais:

- [Dockerfile.frontend](Dockerfile.frontend): builda o React e serve com Nginx
- [docker-compose.easypanel.yml](docker-compose.easypanel.yml): sobe `frontend`, `api` e `erp-db`

O frontend foi configurado para usar proxy interno do Nginx:

- tudo que entrar em `/api` vai para `http://api:8080`
- isso evita depender de `VITE_API_BASE_URL` em producao

### Opcao 1: Compose Service no Easypanel

Use [docker-compose.easypanel.yml](docker-compose.easypanel.yml) como stack do projeto.

Servico web principal:

- `frontend`
- porta interna: `80`

Se quiser expor a API separadamente tambem:

- servico: `api`
- porta interna: `8080`

### Opcao 2: App Services separados

Se preferir criar servicos separados no Easypanel:

1. `frontend`
   - Dockerfile: `Dockerfile.frontend`
   - porta/proxy: `80`
   - env: `API_UPSTREAM=<URL interna ou dominio publico da API>`

2. `api`
   - Dockerfile: `backend/CodigoJudaico.Api/Dockerfile`
   - porta/proxy: `8080`
   - env:
     - `ASPNETCORE_ENVIRONMENT=Production`
     - `ASPNETCORE_URLS=http://+:8080`
     - `ConnectionStrings__Postgres=Host=erp-db;Port=5432;Database=codjudaicotest;Username=judaictotest;Password=Jud@2026Wa!`

3. `erp-db`
   - imagem: `postgres:17-alpine`
   - volume persistente em `/var/lib/postgresql/data`

Observacao:

- no `docker-compose.easypanel.yml`, o frontend usa `API_UPSTREAM=http://api:8080` porque `api` e o nome do servico dentro da mesma stack Docker
- em App Services separados no Easypanel, use a URL privada/publica real da API

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
