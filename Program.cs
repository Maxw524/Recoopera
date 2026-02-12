using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting.WindowsServices;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OfficeOpenXml;
using Serilog;
using Serilog.Formatting.Compact;

// Suas namespaces
using Recoopera.Application.Interfaces;
using Recoopera.Application.Services;
using Recoopera.Infrastructure.Excel;
using Recoopera.Infrastructure.Excel.Interfaces;
using Recoopera.Infrastructure.Excel.Local;

// 👇 Ajuste conforme seu projeto (DbContext e Store SQL)
using Recoopera.Data;       // AuthDbContext
using Recoopera.Services;   // IUserStore, SqlUserStore

var builder = WebApplication.CreateBuilder(args);

// Windows Service
builder.Services.AddWindowsService();

// Diretório base para logs
var baseDir = AppContext.BaseDirectory;
var logsDir = Path.Combine(baseDir, "logs");
Directory.CreateDirectory(logsDir);
var logPath = Path.Combine(logsDir, "recoopera-.log");

// Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        formatter: new CompactJsonFormatter(),
        path: logPath,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        shared: true
    )
    .CreateLogger();

builder.Host.UseSerilog();

// EPPlus
ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// -------------------- Settings (Excel) --------------------
builder.Services.Configure<ExcelSettings>(builder.Configuration.GetSection("ExcelSettings"));
builder.Services.AddSingleton<IOperacoesAdvogadosExcelRepository, OperacoesAdvogadosExcelLocalRepository>();
// -------------------- SQL Server (Auth) --------------------
var connStr = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection não configurado");

builder.Services.AddDbContext<AuthDbContext>(options =>
{
    options.UseSqlServer(connStr);
});

// -------------------- DI --------------------
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddScoped<IUserStore, SqlUserStore>();

builder.Services.AddSingleton<TaxasCampanhaStore>();
builder.Services.AddScoped<ICalculoNegociacaoService, CalculoNegociacaoService>();
builder.Services.AddScoped<RenegociacaoEngine>();
builder.Services.AddScoped<RenegociacaoService>();
builder.Services.AddScoped<ICalculoRenegociacaoService, CalculoRenegociacaoService>();
builder.Services.AddScoped<IContratoExcelRepository, ContratoExcelLocalRepository>();
builder.Services.AddScoped<IOperacoesAdvogadosExcelRepository, OperacoesAdvogadosExcelLocalRepository>();
builder.Services.Configure<UploadSettings>(builder.Configuration.GetSection("UploadSettings"));
// -------------------- Swagger --------------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Recoopera",
        Version = "v1"
    });

    // Esquema Bearer (cole somente o token na UI)
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Cole apenas o token JWT (sem a palavra 'Bearer')."
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// -------------------- JWT --------------------
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key não configurado");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer não configurado");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience não configurado");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Em produção, mantenha RequireHttpsMetadata = true somente se expor HTTPS direto
        // (se está atrás de proxy/NGINX/Traefik com TLS, pode ficar true)
        options.RequireHttpsMetadata = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,

            // Como o token AGORA emite 'audience', validamos:
            ValidateAudience = true,
            ValidAudience = jwtAudience,

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,

            // Casa com suas claims emitidas
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };

        // Eventos de diagnóstico apenas em DEV (não logar token em PROD)
        if (builder.Environment.IsDevelopment())
        {
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = ctx =>
                {
                    var raw = ctx.Request.Headers.Authorization.ToString();
                    Console.WriteLine($"[DEV] JWT Header: {raw}");
                    return Task.CompletedTask;
                },
                OnAuthenticationFailed = ctx =>
                {
                    Console.WriteLine($"[DEV] JWT Failed: {ctx.Exception.GetType().Name} - {ctx.Exception.Message}");
                    return Task.CompletedTask;
                },
                OnChallenge = ctx =>
                {
                    Console.WriteLine($"[DEV] JWT Challenge: {ctx.Error} {ctx.ErrorDescription}");
                    return Task.CompletedTask;
                }
            };
        }
    });

builder.Services.AddAuthorization();

// -------------------- CORS --------------------
// Em DEV: libera geral. Em PROD: restringe às origens de Cors:Origins (CSV).
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            var originsCsv = builder.Configuration["Cors:Origins"]; // ex.: "https://app.suaempresa.com,https://admin.suaempresa.com"
            var origins = (originsCsv ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            if (origins.Length > 0)
            {
                policy.WithOrigins(origins)
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            }
            else
            {
                // fallback seguro: nenhuma origem liberada explicitamente
                policy.WithOrigins(Array.Empty<string>())
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            }
        }
    });
});

// -------------------- Build --------------------
var app = builder.Build();

// Log inicial (sem vazar segredos)
app.Logger.LogInformation("ENV={env}", app.Environment.EnvironmentName);
app.Logger.LogInformation("JWT Issuer={iss} Audience={aud} KeyLen={len}",
    jwtIssuer, jwtAudience, jwtKey.Length);
app.Logger.LogInformation("DB CS len={len}", connStr.Length);

// -------------------- MIGRATIONS + SEED (apenas DEV) --------------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    db.Database.Migrate();

    if (app.Environment.IsDevelopment())
    {
        var store = scope.ServiceProvider.GetRequiredService<IUserStore>();
        var hasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();
        await EnsureSeedAdminAsync(store, hasher, username: "admin", password: "123456");
    }
}

// -------------------- Swagger (somente DEV) --------------------


if(app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Recoopera v1");
        c.RoutePrefix = "swagger";
    });
}

// 🔒 HTTPS redirection: habilite somente se expor HTTPS direto por Kestrel
// if (builder.Configuration.GetValue<bool>("Https:RedirectEnabled"))
// {
//     app.UseHttpsRedirection();
// }

app.UseSerilogRequestLogging();

// Se tiver seu middleware de correlação:
app.UseMiddleware<CorrelationIdMiddleware>();

app.UseStaticFiles();
app.UseDefaultFiles();

app.UseRouting();

app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("index.html");


app.Logger.LogInformation("ENV={env}", app.Environment.EnvironmentName);
app.Logger.LogInformation("Listening on 5000 via Kestrel: check appsettings");
app.Logger.LogInformation("JWT Issuer={iss} Audience={aud} KeyLen={len}",
    builder.Configuration["Jwt:Issuer"],
    builder.Configuration["Jwt:Audience"],
    (builder.Configuration["Jwt:Key"] ?? "").Length);

app.Logger.LogInformation("DB ConnStr length={len}", (connStr ?? "").Length);



app.Run();

// -------------------- Seed helper --------------------
static async Task EnsureSeedAdminAsync(IUserStore store, PasswordHasher hasher, string username, string password)
{
    var existing = await store.FindByUsernameAsync(username);
    if (existing is not null) return;

    var (hash, salt) = hasher.HashPassword(password);
    await store.AddAsync(
        username: username,
        passwordHash: hash,
        passwordSalt: salt,
        roles: new List<string> { "Admin" }
    );
}
