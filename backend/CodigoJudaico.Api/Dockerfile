FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj", "backend/CodigoJudaico.Api/"]
RUN dotnet restore "backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj"

COPY . .
RUN dotnet publish "backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# This API only uses Npgsql/PostgreSQL, so the extra Kerberos package is unnecessary.
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "CodigoJudaico.Api.dll"]
