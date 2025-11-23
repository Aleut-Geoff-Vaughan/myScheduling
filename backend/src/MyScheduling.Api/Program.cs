using Microsoft.EntityFrameworkCore;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Services;
using AspNetCoreRateLimit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Database - Simple password authentication
builder.Services.AddDbContext<MySchedulingDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions => npgsqlOptions.MigrationsAssembly("MyScheduling.Infrastructure")
    ));

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "MyScheduling-Super-Secret-Key-For-Development-Only-Change-In-Production-2024";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MyScheduling";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "MyScheduling";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero // Remove default 5 minute clock skew
    };
});

// CORS - Environment-specific configuration
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });
}
else
{
    // Production CORS - restrict to specific origins
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? Array.Empty<string>();

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });
}

// In-Memory Caching
builder.Services.AddMemoryCache();
builder.Services.AddResponseCaching();

// Authorization Service
builder.Services.AddScoped<IAuthorizationService, AuthorizationService>();

// Rate Limiting
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.EnableEndpointRateLimiting = true;
    options.StackBlockedRequests = false;
    options.HttpStatusCode = 429;
    options.RealIpHeader = "X-Real-IP";
    options.GeneralRules = new List<RateLimitRule>
    {
        new RateLimitRule
        {
            Endpoint = "*",
            Period = "1m",
            Limit = 100
        },
        new RateLimitRule
        {
            Endpoint = "*/api/auth/*",
            Period = "1m",
            Limit = 10
        }
    };
});
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
builder.Services.AddInMemoryRateLimiting();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// Register Database Seeder
builder.Services.AddScoped<DatabaseSeeder>();

// Register Validation Services
builder.Services.AddScoped<IValidationEngine, ValidationEngine>();
builder.Services.AddScoped<IRuleInterpreter, RuleInterpreter>();

// Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<MySchedulingDbContext>("database");

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Aleut Federal Staffing & Hoteling API",
        Version = "v1",
        Description = "API for managing staffing, projects, WBS, and office hoteling"
    });
});

var app = builder.Build();

// Seed database in development
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    var context = scope.ServiceProvider.GetRequiredService<MySchedulingDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        await seeder.SeedAsync();
        logger.LogInformation("Database seeding completed successfully");

        // Seed role permission templates
        await MyScheduling.Infrastructure.Data.Seeds.PermissionSeeder.SeedRolePermissionTemplatesAsync(context, logger);
        logger.LogInformation("Permission templates seeding completed successfully");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while seeding the database");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseIpRateLimiting();
app.UseResponseCaching();
app.UseCors();

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoints
app.MapHealthChecks("/health");
app.MapGet("/api/health", async (Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckService healthCheckService) =>
{
    var report = await healthCheckService.CheckHealthAsync();
    var result = new
    {
        status = report.Status.ToString(),
        environment = app.Environment.EnvironmentName,
        checks = report.Entries.Select(e => new
        {
            name = e.Key,
            status = e.Value.Status.ToString(),
            description = e.Value.Description,
            duration = e.Value.Duration.TotalMilliseconds
        }),
        timestamp = DateTime.UtcNow
    };

    return report.Status == Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy
        ? Results.Ok(result)
        : Results.Json(result, statusCode: 503);
});

app.Run();
