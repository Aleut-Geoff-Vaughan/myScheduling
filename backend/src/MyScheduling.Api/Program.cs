using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using MyScheduling.Infrastructure.Data;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Services;
using AspNetCoreRateLimit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using MyScheduling.Core.Entities;
using MyScheduling.Api;
using Microsoft.Identity.Web;
using MyScheduling.Api.Services;

// MyScheduling API - Production Ready
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Database - Simple password authentication with query splitting to prevent cartesian explosion
builder.Services.AddDbContext<MySchedulingDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions =>
        {
            npgsqlOptions.MigrationsAssembly("MyScheduling.Infrastructure");
            // Use query splitting by default to prevent cartesian explosion
            npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
        })
        // Suppress the multiple collection warning since we're using split queries
        .ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.MultipleCollectionIncludeWarning));
});

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

builder.Services.AddHttpContextAccessor();

// Azure AD SSO Configuration - for validating tokens from frontend MSAL
var azureAdEnabled = builder.Configuration.GetValue<bool>("AzureAd:Enabled");
if (azureAdEnabled)
{
    builder.Services.Configure<AzureAdSsoOptions>(builder.Configuration.GetSection("AzureAd"));
    builder.Services.AddSingleton<IAzureAdTokenValidator, AzureAdTokenValidator>();
}

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

// Register Validation Services
builder.Services.AddScoped<IValidationEngine, ValidationEngine>();
builder.Services.AddScoped<IRuleInterpreter, RuleInterpreter>();

// Register Facilities Excel Service
builder.Services.AddScoped<IFacilitiesExcelService, FacilitiesExcelService>();

// Register Resume Export Service
builder.Services.AddScoped<ResumeExportService>();

// Register Magic Link and Email Services
builder.Services.AddScoped<IMagicLinkService, MagicLinkService>();

// Use Azure Email Service if configured, otherwise fall back to SMTP
if (!string.IsNullOrEmpty(builder.Configuration["AzureEmail:ConnectionString"]))
{
    builder.Services.AddScoped<IEmailService, AzureEmailService>();
}
else
{
    builder.Services.AddScoped<IEmailService, EmailService>();
}

// Register Impersonation Service
builder.Services.AddScoped<IImpersonationService, ImpersonationService>();

// Register Working Days Service
builder.Services.AddScoped<IWorkingDaysService, WorkingDaysService>();

// Register File Storage Service - Use Azure Blob in production, LocalFileSystem for development
var fileStorageProvider = builder.Configuration["FileStorage:Provider"] ?? "LocalFileSystem";
if (fileStorageProvider.Equals("AzureBlob", StringComparison.OrdinalIgnoreCase) &&
    !string.IsNullOrEmpty(builder.Configuration["AzureStorage:ConnectionString"]))
{
    builder.Services.AddScoped<IFileStorageService, AzureBlobStorageService>();
}
else
{
    builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
}

// Register Certification Expiry Notification Service
builder.Services.AddScoped<CertificationExpiryNotificationService>();

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

// Optional lightweight seeding for login audits to help visualize reports.
// Runs only if table is empty and environment variable SEED_LOGIN_AUDITS=true.
if (Environment.GetEnvironmentVariable("SEED_LOGIN_AUDITS")?.Equals("true", StringComparison.OrdinalIgnoreCase) == true)
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MySchedulingDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        if (!await context.LoginAudits.AnyAsync())
        {
            var now = DateTime.UtcNow;
            var seedEntries = new List<LoginAudit>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    Email = "test@test.com",
                    IsSuccess = true,
                    IpAddress = "127.0.0.1",
                    UserAgent = "Seeded Test Client",
                    CreatedAt = now.AddMinutes(-30)
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Email = "admin@test.com",
                    IsSuccess = true,
                    IpAddress = "127.0.0.1",
                    UserAgent = "Seeded Test Client",
                    CreatedAt = now.AddMinutes(-25)
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Email = "wrong@test.com",
                    IsSuccess = false,
                    IpAddress = "127.0.0.1",
                    UserAgent = "Seeded Test Client",
                    CreatedAt = now.AddMinutes(-20)
                }
            };

            context.LoginAudits.AddRange(seedEntries);
            await context.SaveChangesAsync();
            logger.LogInformation("Seeded login audit entries (3 rows)");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to seed login audits");
    }
}

// Seed facilities data (spaces for offices)
// Runs only if SEED_FACILITIES=true environment variable is set
if (Environment.GetEnvironmentVariable("SEED_FACILITIES")?.Equals("true", StringComparison.OrdinalIgnoreCase) == true)
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MySchedulingDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        await SeedFacilitiesData.SeedSpacesForAllOffices(context);
        // Also seed the portal data (leases, travel guides, announcements, etc.)
        await SeedFacilitiesData.SeedFacilitiesPortalData(context, "Arlington");
        logger.LogInformation("Facilities seed data applied successfully");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to seed facilities data");
    }
}

// Seed skills and certifications catalog
// Runs only if SEED_SKILLS=true environment variable is set
// Use SEED_SKILLS_FORCE=true to force refresh (delete and reseed)
if (Environment.GetEnvironmentVariable("SEED_SKILLS")?.Equals("true", StringComparison.OrdinalIgnoreCase) == true)
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MySchedulingDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    var forceRefresh = Environment.GetEnvironmentVariable("SEED_SKILLS_FORCE")?.Equals("true", StringComparison.OrdinalIgnoreCase) == true;

    try
    {
        await SeedSkillsData.SeedSkillsAndCertifications(context, forceRefresh);
        logger.LogInformation("Skills and certifications seed data applied successfully");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to seed skills and certifications data");
    }
}

// Seed role permission templates (always runs, only adds missing templates)
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MySchedulingDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        await SeedRolePermissions.SeedRolePermissionTemplates(context);
        logger.LogInformation("Role permission templates checked/seeded successfully");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to seed role permission templates");
    }
}

// Seed non-labor cost types for all tenants
// Runs only if SEED_NONLABOR=true environment variable is set
// Use SEED_NONLABOR_FORCE=true to force refresh (delete and reseed)
if (Environment.GetEnvironmentVariable("SEED_NONLABOR")?.Equals("true", StringComparison.OrdinalIgnoreCase) == true)
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MySchedulingDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    var forceRefresh = Environment.GetEnvironmentVariable("SEED_NONLABOR_FORCE")?.Equals("true", StringComparison.OrdinalIgnoreCase) == true;

    try
    {
        await SeedNonLaborCostTypes.SeedCostTypesForAllTenants(context, forceRefresh);
        logger.LogInformation("Non-labor cost types seeded successfully");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to seed non-labor cost types");
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

// Force rebuild $(date)
