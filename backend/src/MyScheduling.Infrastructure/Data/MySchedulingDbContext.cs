using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;

namespace MyScheduling.Infrastructure.Data;

public class MySchedulingDbContext : DbContext
{
    public MySchedulingDbContext(DbContextOptions<MySchedulingDbContext> options)
        : base(options)
    {
    }

    // Identity & Tenancy
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<TenantMembership> TenantMemberships => Set<TenantMembership>();
    public DbSet<RoleAssignment> RoleAssignments => Set<RoleAssignment>(); // Deprecated
    public DbSet<UserInvitation> UserInvitations => Set<UserInvitation>();

    // People & Resume
    public DbSet<Person> People => Set<Person>();
    public DbSet<ResumeProfile> ResumeProfiles => Set<ResumeProfile>();
    public DbSet<ResumeSection> ResumeSections => Set<ResumeSection>();
    public DbSet<ResumeEntry> ResumeEntries => Set<ResumeEntry>();
    public DbSet<ResumeVersion> ResumeVersions => Set<ResumeVersion>();
    public DbSet<ResumeDocument> ResumeDocuments => Set<ResumeDocument>();
    public DbSet<ResumeApproval> ResumeApprovals => Set<ResumeApproval>();
    public DbSet<ResumeTemplate> ResumeTemplates => Set<ResumeTemplate>();
    public DbSet<LinkedInImport> LinkedInImports => Set<LinkedInImport>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<PersonSkill> PersonSkills => Set<PersonSkill>();
    public DbSet<Certification> Certifications => Set<Certification>();
    public DbSet<PersonCertification> PersonCertifications => Set<PersonCertification>();

    // File Storage
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<FileAccessLog> FileAccessLogs => Set<FileAccessLog>();
    public DbSet<SharePointConfiguration> SharePointConfigurations => Set<SharePointConfiguration>();

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
    public DbSet<FacilityPermission> FacilityPermissions => Set<FacilityPermission>();
    public DbSet<SpaceMaintenanceLog> SpaceMaintenanceLogs => Set<SpaceMaintenanceLog>();
    public DbSet<WorkLocationPreference> WorkLocationPreferences => Set<WorkLocationPreference>();

    // Validation
    public DbSet<ValidationRule> ValidationRules => Set<ValidationRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure entity relationships and constraints
        ConfigureIdentity(modelBuilder);
        ConfigurePeople(modelBuilder);
        ConfigureResume(modelBuilder);
        ConfigureFileStorage(modelBuilder);
        ConfigureProjects(modelBuilder);
        ConfigureStaffing(modelBuilder);
        ConfigureHoteling(modelBuilder);
        ConfigureValidation(modelBuilder);

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
            entity.Property(e => e.IsSystemAdmin).IsRequired().HasDefaultValue(false);

            entity.HasIndex(e => e.EntraObjectId).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<TenantMembership>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Store roles as JSON array
            entity.Property(e => e.Roles)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions)null!),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<AppRole>>(v, (System.Text.Json.JsonSerializerOptions)null!) ?? new List<AppRole>())
                .HasColumnType("jsonb");

            entity.Property(e => e.JoinedAt).IsRequired();
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

            // Unique constraint: user can only have one membership per tenant
            entity.HasIndex(e => new { e.UserId, e.TenantId }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.IsActive });

            entity.HasOne(e => e.User)
                .WithMany(u => u.TenantMemberships)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Tenant)
                .WithMany(t => t.TenantMemberships)
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Deprecated - keeping for backward compatibility during migration
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
            entity.HasIndex(e => new { e.ManagerUserId, e.IsActive });

            entity.HasOne(e => e.Office)
                .WithMany(o => o.Spaces)
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Manager)
                .WithMany()
                .HasForeignKey(e => e.ManagerUserId)
                .OnDelete(DeleteBehavior.SetNull);
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

        modelBuilder.Entity<FacilityPermission>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.OfficeId, e.SpaceId, e.UserId });
            entity.HasIndex(e => new { e.Role, e.AccessLevel });

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Space)
                .WithMany(s => s.Permissions)
                .HasForeignKey(e => e.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpaceMaintenanceLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);

            entity.HasIndex(e => new { e.SpaceId, e.Status });
            entity.HasIndex(e => new { e.ScheduledDate, e.Status });

            entity.HasOne(e => e.Space)
                .WithMany(s => s.MaintenanceLogs)
                .HasForeignKey(e => e.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ReportedBy)
                .WithMany()
                .HasForeignKey(e => e.ReportedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AssignedTo)
                .WithMany()
                .HasForeignKey(e => e.AssignedToUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<WorkLocationPreference>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RemoteLocation).HasMaxLength(200);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.State).HasMaxLength(100);
            entity.Property(e => e.Country).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(500);

            // One preference per person per day
            entity.HasIndex(e => new { e.TenantId, e.PersonId, e.WorkDate }).IsUnique();
            entity.HasIndex(e => new { e.WorkDate, e.LocationType });

            entity.HasOne(e => e.Person)
                .WithMany(p => p.WorkLocationPreferences)
                .HasForeignKey(e => e.PersonId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Booking)
                .WithMany()
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureResume(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ResumeProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).IsRequired().HasDefaultValue(MyScheduling.Core.Enums.ResumeStatus.Draft);
            entity.Property(e => e.IsPublic).IsRequired().HasDefaultValue(false);

            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.PersonId).IsUnique();

            entity.HasOne(e => e.CurrentVersion)
                .WithMany()
                .HasForeignKey(e => e.CurrentVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.LastReviewedBy)
                .WithMany()
                .HasForeignKey(e => e.LastReviewedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ResumeVersion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.VersionName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.VersionNumber).IsRequired();
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

            entity.HasIndex(e => new { e.ResumeProfileId, e.VersionNumber });
            entity.HasIndex(e => new { e.ResumeProfileId, e.IsActive });

            entity.HasOne(e => e.ResumeProfile)
                .WithMany(r => r.Versions)
                .HasForeignKey(e => e.ResumeProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ResumeDocument>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DocumentType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.GeneratedAt).IsRequired();

            entity.HasIndex(e => new { e.ResumeProfileId, e.GeneratedAt });
            entity.HasIndex(e => e.StoredFileId);

            entity.HasOne(e => e.ResumeProfile)
                .WithMany(r => r.Documents)
                .HasForeignKey(e => e.ResumeProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ResumeVersion)
                .WithMany(v => v.GeneratedDocuments)
                .HasForeignKey(e => e.ResumeVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.StoredFile)
                .WithMany()
                .HasForeignKey(e => e.StoredFileId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.GeneratedBy)
                .WithMany()
                .HasForeignKey(e => e.GeneratedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ResumeApproval>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RequestedAt).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasDefaultValue(MyScheduling.Core.Enums.ApprovalStatus.Pending);

            entity.HasIndex(e => new { e.Status, e.RequestedAt });
            entity.HasIndex(e => new { e.ResumeProfileId, e.Status });
            entity.HasIndex(e => e.ReviewedByUserId);

            entity.HasOne(e => e.ResumeProfile)
                .WithMany(r => r.Approvals)
                .HasForeignKey(e => e.ResumeProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ResumeVersion)
                .WithMany()
                .HasForeignKey(e => e.ResumeVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.RequestedBy)
                .WithMany()
                .HasForeignKey(e => e.RequestedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ReviewedBy)
                .WithMany()
                .HasForeignKey(e => e.ReviewedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ResumeTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.IsDefault).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

            entity.HasIndex(e => new { e.TenantId, e.Type, e.IsActive });
            entity.HasIndex(e => new { e.TenantId, e.IsDefault });

            entity.HasOne(e => e.StoredFile)
                .WithMany()
                .HasForeignKey(e => e.StoredFileId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<LinkedInImport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.LinkedInProfileUrl).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ImportedAt).IsRequired();
            entity.Property(e => e.Status).IsRequired();

            entity.HasIndex(e => new { e.PersonId, e.ImportedAt });
            entity.HasIndex(e => new { e.ResumeProfileId, e.Status });

            entity.HasOne(e => e.Person)
                .WithMany()
                .HasForeignKey(e => e.PersonId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ResumeProfile)
                .WithMany()
                .HasForeignKey(e => e.ResumeProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ImportedBy)
                .WithMany()
                .HasForeignKey(e => e.ImportedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private void ConfigureFileStorage(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StoredFile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.OriginalFileName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(200);
            entity.Property(e => e.FileSizeBytes).IsRequired();
            entity.Property(e => e.FileHash).IsRequired().HasMaxLength(64); // SHA256
            entity.Property(e => e.StorageProvider).IsRequired();
            entity.Property(e => e.StorageProviderId).IsRequired().HasMaxLength(500);
            entity.Property(e => e.StoragePath).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EntityId).IsRequired();
            entity.Property(e => e.AccessLevel).IsRequired().HasDefaultValue(MyScheduling.Core.Enums.FileAccessLevel.Private);
            entity.Property(e => e.IsDeleted).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.Version).IsRequired().HasDefaultValue(1);

            entity.HasIndex(e => new { e.TenantId, e.EntityType, e.EntityId });
            entity.HasIndex(e => new { e.TenantId, e.IsDeleted });
            entity.HasIndex(e => e.FileHash); // For deduplication
            entity.HasIndex(e => new { e.StorageProvider, e.StorageProviderId });

            entity.HasOne(e => e.DeletedBy)
                .WithMany()
                .HasForeignKey(e => e.DeletedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.PreviousVersion)
                .WithMany()
                .HasForeignKey(e => e.PreviousVersionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<FileAccessLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AccessedAt).IsRequired();
            entity.Property(e => e.AccessType).IsRequired();

            entity.HasIndex(e => new { e.StoredFileId, e.AccessedAt });
            entity.HasIndex(e => new { e.AccessedByUserId, e.AccessedAt });
            entity.HasIndex(e => new { e.AccessType, e.AccessedAt });

            entity.HasOne(e => e.StoredFile)
                .WithMany(f => f.AccessLogs)
                .HasForeignKey(e => e.StoredFileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.AccessedBy)
                .WithMany()
                .HasForeignKey(e => e.AccessedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SharePointConfiguration>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SiteUrl).IsRequired().HasMaxLength(500);
            entity.Property(e => e.SiteId).IsRequired().HasMaxLength(200);
            entity.Property(e => e.DriveId).IsRequired().HasMaxLength(200);
            entity.Property(e => e.DriveName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ClientId).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ClientSecret).IsRequired().HasMaxLength(500); // Encrypted
            entity.Property(e => e.TenantIdMicrosoft).IsRequired().HasMaxLength(200);
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

            entity.HasIndex(e => new { e.TenantId, e.IsActive }).IsUnique();
        });
    }

    private void ConfigureValidation(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ValidationRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.FieldName).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.RuleExpression).IsRequired();
            entity.Property(e => e.ErrorMessage).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.ExecutionOrder).IsRequired().HasDefaultValue(0);

            entity.HasIndex(e => new { e.TenantId, e.EntityType, e.FieldName, e.IsActive });
            entity.HasIndex(e => new { e.EntityType, e.ExecutionOrder });
            entity.HasIndex(e => new { e.TenantId, e.IsActive });
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
