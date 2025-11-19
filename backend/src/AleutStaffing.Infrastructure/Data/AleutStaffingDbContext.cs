using Microsoft.EntityFrameworkCore;
using AleutStaffing.Core.Entities;

namespace AleutStaffing.Infrastructure.Data;

public class AleutStaffingDbContext : DbContext
{
    public AleutStaffingDbContext(DbContextOptions<AleutStaffingDbContext> options)
        : base(options)
    {
    }

    // Identity & Tenancy
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RoleAssignment> RoleAssignments => Set<RoleAssignment>();

    // People & Resume
    public DbSet<Person> People => Set<Person>();
    public DbSet<ResumeProfile> ResumeProfiles => Set<ResumeProfile>();
    public DbSet<ResumeSection> ResumeSections => Set<ResumeSection>();
    public DbSet<ResumeEntry> ResumeEntries => Set<ResumeEntry>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<PersonSkill> PersonSkills => Set<PersonSkill>();
    public DbSet<Certification> Certifications => Set<Certification>();
    public DbSet<PersonCertification> PersonCertifications => Set<PersonCertification>();

    // Projects & WBS
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WbsElement> WbsElements => Set<WbsElement>();

    // Staffing & Assignments
    public DbSet<ProjectRole> ProjectRoles => Set<ProjectRole>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<AssignmentHistory> AssignmentHistory => Set<AssignmentHistory>();

    // Hoteling
    public DbSet<Office> Offices => Set<Office>();
    public DbSet<Space> Spaces => Set<Space>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<CheckInEvent> CheckInEvents => Set<CheckInEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure entity relationships and constraints
        ConfigureIdentity(modelBuilder);
        ConfigurePeople(modelBuilder);
        ConfigureProjects(modelBuilder);
        ConfigureStaffing(modelBuilder);
        ConfigureHoteling(modelBuilder);

        // Apply naming conventions for PostgreSQL (snake_case)
        ApplyPostgreSqlNaming(modelBuilder);
    }

    private void ConfigureIdentity(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Name);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntraObjectId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(255);

            entity.HasIndex(e => new { e.TenantId, e.EntraObjectId }).IsUnique();
            entity.HasIndex(e => e.Email);

            entity.HasOne(e => e.Tenant)
                .WithMany(t => t.Users)
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RoleAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Role }).IsUnique();

            entity.HasOne(e => e.User)
                .WithMany(u => u.RoleAssignments)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ConfigurePeople(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Person>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);

            entity.HasIndex(e => new { e.TenantId, e.Email });
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ResumeProfile>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Person)
                .WithOne(p => p.ResumeProfile)
                .HasForeignKey<ResumeProfile>(e => e.PersonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ResumeSection>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.PersonId, e.DisplayOrder });
        });

        modelBuilder.Entity<ResumeEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);
        });

        modelBuilder.Entity<Skill>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<PersonSkill>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.PersonId, e.SkillId }).IsUnique();
        });

        modelBuilder.Entity<Certification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);

            entity.HasIndex(e => e.Name);
        });

        modelBuilder.Entity<PersonCertification>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.PersonId, e.CertificationId });
        });
    }

    private void ConfigureProjects(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);

            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => e.ProgramCode);
        });

        modelBuilder.Entity<WbsElement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
            entity.HasIndex(e => e.ProjectId);

            entity.HasOne(e => e.Project)
                .WithMany(p => p.WbsElements)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ConfigureStaffing(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProjectRole>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);

            entity.HasIndex(e => new { e.TenantId, e.WbsElementId, e.Status });

            entity.HasOne(e => e.WbsElement)
                .WithMany(w => w.ProjectRoles)
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.TenantId, e.PersonId, e.Status });
            entity.HasIndex(e => new { e.WbsElementId, e.Status });
            entity.HasIndex(e => new { e.StartDate, e.EndDate });

            entity.HasOne(e => e.Person)
                .WithMany(p => p.Assignments)
                .HasForeignKey(e => e.PersonId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ProjectRole)
                .WithMany(r => r.Assignments)
                .HasForeignKey(e => e.ProjectRoleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.WbsElement)
                .WithMany(w => w.Assignments)
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AssignmentHistory>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.AssignmentId, e.ChangedAt });

            entity.HasOne(e => e.Assignment)
                .WithMany(a => a.History)
                .HasForeignKey(e => e.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ConfigureHoteling(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Office>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);

            entity.HasIndex(e => new { e.TenantId, e.Status });
        });

        modelBuilder.Entity<Space>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.Type });

            entity.HasOne(e => e.Office)
                .WithMany(o => o.Spaces)
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.SpaceId, e.StartDatetime, e.EndDatetime });
            entity.HasIndex(e => new { e.PersonId, e.Status });
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Space)
                .WithMany(s => s.Bookings)
                .HasForeignKey(e => e.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Person)
                .WithMany(p => p.Bookings)
                .HasForeignKey(e => e.PersonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CheckInEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Method).IsRequired().HasMaxLength(50);

            entity.HasIndex(e => e.BookingId);

            entity.HasOne(e => e.Booking)
                .WithMany(b => b.CheckInEvents)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ApplyPostgreSqlNaming(ModelBuilder modelBuilder)
    {
        // Convert table and column names to snake_case for PostgreSQL conventions
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            // Table names
            entity.SetTableName(ToSnakeCase(entity.GetTableName()!));

            // Column names
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }

            // Foreign key names
            foreach (var key in entity.GetKeys())
            {
                key.SetName(ToSnakeCase(key.GetName()!));
            }

            foreach (var key in entity.GetForeignKeys())
            {
                key.SetConstraintName(ToSnakeCase(key.GetConstraintName()!));
            }

            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(ToSnakeCase(index.GetDatabaseName()!));
            }
        }
    }

    private static string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;

        return string.Concat(
            input.Select((x, i) => i > 0 && char.IsUpper(x) && !char.IsUpper(input[i - 1])
                ? $"_{x}"
                : x.ToString())
        ).ToLower();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Automatically set audit fields
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is BaseEntity &&
                       (e.State == EntityState.Added || e.State == EntityState.Modified));

        foreach (var entry in entries)
        {
            var entity = (BaseEntity)entry.Entity;

            if (entry.State == EntityState.Added)
            {
                entity.CreatedAt = DateTime.UtcNow;
                // TODO: Set CreatedByUserId from current user context
            }

            if (entry.State == EntityState.Modified)
            {
                entity.UpdatedAt = DateTime.UtcNow;
                // TODO: Set UpdatedByUserId from current user context
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
