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

    // People & Resume (person table removed; profiles now keyed by User)
    public DbSet<ResumeProfile> ResumeProfiles => Set<ResumeProfile>();
    public DbSet<ResumeSection> ResumeSections => Set<ResumeSection>();
    public DbSet<ResumeEntry> ResumeEntries => Set<ResumeEntry>();
    public DbSet<ResumeVersion> ResumeVersions => Set<ResumeVersion>();
    public DbSet<ResumeDocument> ResumeDocuments => Set<ResumeDocument>();
    public DbSet<ResumeApproval> ResumeApprovals => Set<ResumeApproval>();
    public DbSet<ResumeTemplate> ResumeTemplates => Set<ResumeTemplate>();
    public DbSet<ResumeShareLink> ResumeShareLinks => Set<ResumeShareLink>();
    public DbSet<LinkedInImport> LinkedInImports => Set<LinkedInImport>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<PersonSkill> PersonSkills => Set<PersonSkill>();
    public DbSet<Certification> Certifications => Set<Certification>();
    public DbSet<PersonCertification> PersonCertifications => Set<PersonCertification>();
    public DbSet<CertificationExpiryNotification> CertificationExpiryNotifications => Set<CertificationExpiryNotification>();

    // File Storage
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<FileAccessLog> FileAccessLogs => Set<FileAccessLog>();
    public DbSet<SharePointConfiguration> SharePointConfigurations => Set<SharePointConfiguration>();

    // Projects & WBS
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WbsElement> WbsElements => Set<WbsElement>();
    public DbSet<WbsChangeHistory> WbsChangeHistories => Set<WbsChangeHistory>();

    // Staffing & Assignments
    public DbSet<ProjectRole> ProjectRoles => Set<ProjectRole>();
    public DbSet<ProjectAssignment> ProjectAssignments => Set<ProjectAssignment>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<AssignmentHistory> AssignmentHistory => Set<AssignmentHistory>();
    public DbSet<AssignmentRequest> AssignmentRequests => Set<AssignmentRequest>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();

    // Enhanced Staffing & Forecasting
    public DbSet<CareerJobFamily> CareerJobFamilies => Set<CareerJobFamily>();
    public DbSet<SubcontractorCompany> SubcontractorCompanies => Set<SubcontractorCompany>();
    public DbSet<Subcontractor> Subcontractors => Set<Subcontractor>();
    public DbSet<LaborCategory> LaborCategories => Set<LaborCategory>();
    public DbSet<ProjectRoleAssignment> ProjectRoleAssignments => Set<ProjectRoleAssignment>();
    public DbSet<ForecastVersion> ForecastVersions => Set<ForecastVersion>();
    public DbSet<Forecast> Forecasts => Set<Forecast>();
    public DbSet<ForecastHistory> ForecastHistories => Set<ForecastHistory>();
    public DbSet<ForecastApprovalSchedule> ForecastApprovalSchedules => Set<ForecastApprovalSchedule>();
    public DbSet<ForecastImportExport> ForecastImportExports => Set<ForecastImportExport>();
    public DbSet<ActualHours> ActualHours => Set<ActualHours>();
    public DbSet<ProjectBudget> ProjectBudgets => Set<ProjectBudget>();
    public DbSet<ProjectBudgetLine> ProjectBudgetLines => Set<ProjectBudgetLine>();
    public DbSet<ProjectBudgetHistory> ProjectBudgetHistories => Set<ProjectBudgetHistory>();

    // Non-Labor Costs
    public DbSet<NonLaborCostType> NonLaborCostTypes => Set<NonLaborCostType>();
    public DbSet<NonLaborForecast> NonLaborForecasts => Set<NonLaborForecast>();
    public DbSet<NonLaborBudgetLine> NonLaborBudgetLines => Set<NonLaborBudgetLine>();
    public DbSet<ActualNonLaborCost> ActualNonLaborCosts => Set<ActualNonLaborCost>();

    // Employee Cost Rates
    public DbSet<EmployeeCostRate> EmployeeCostRates => Set<EmployeeCostRate>();
    public DbSet<CostRateImportBatch> CostRateImportBatches => Set<CostRateImportBatch>();

    // Hoteling & Facilities
    public DbSet<Office> Offices => Set<Office>();
    public DbSet<Floor> Floors => Set<Floor>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Space> Spaces => Set<Space>();
    public DbSet<SpaceAssignment> SpaceAssignments => Set<SpaceAssignment>();
    public DbSet<BookingRule> BookingRules => Set<BookingRule>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<CheckInEvent> CheckInEvents => Set<CheckInEvent>();
    public DbSet<FacilityPermission> FacilityPermissions => Set<FacilityPermission>();
    public DbSet<SpaceMaintenanceLog> SpaceMaintenanceLogs => Set<SpaceMaintenanceLog>();
    public DbSet<WorkLocationPreference> WorkLocationPreferences => Set<WorkLocationPreference>();
    public DbSet<CompanyHoliday> CompanyHolidays => Set<CompanyHoliday>();

    // Work Location Templates & DOA
    public DbSet<WorkLocationTemplate> WorkLocationTemplates => Set<WorkLocationTemplate>();
    public DbSet<WorkLocationTemplateItem> WorkLocationTemplateItems => Set<WorkLocationTemplateItem>();
    public DbSet<DelegationOfAuthorityLetter> DelegationOfAuthorityLetters => Set<DelegationOfAuthorityLetter>();
    public DbSet<DigitalSignature> DigitalSignatures => Set<DigitalSignature>();
    public DbSet<DOATemplate> DOATemplates => Set<DOATemplate>();
    public DbSet<TenantSettings> TenantSettings => Set<TenantSettings>();

    // Facilities Portal - Lease Management
    public DbSet<Lease> Leases => Set<Lease>();
    public DbSet<LeaseOptionYear> LeaseOptionYears => Set<LeaseOptionYear>();
    public DbSet<LeaseAmendment> LeaseAmendments => Set<LeaseAmendment>();
    public DbSet<LeaseAttachment> LeaseAttachments => Set<LeaseAttachment>();

    // Facilities Portal - Travel Guides & Info
    public DbSet<OfficeTravelGuide> OfficeTravelGuides => Set<OfficeTravelGuide>();
    public DbSet<OfficePoc> OfficePocs => Set<OfficePoc>();
    public DbSet<FacilityAnnouncement> FacilityAnnouncements => Set<FacilityAnnouncement>();
    public DbSet<AnnouncementAcknowledgment> AnnouncementAcknowledgments => Set<AnnouncementAcknowledgment>();

    // Facilities Portal - Field Personnel & FSO
    public DbSet<ClientSiteDetail> ClientSiteDetails => Set<ClientSiteDetail>();
    public DbSet<FieldAssignment> FieldAssignments => Set<FieldAssignment>();
    public DbSet<EmployeeClearance> EmployeeClearances => Set<EmployeeClearance>();
    public DbSet<ForeignTravelRecord> ForeignTravelRecords => Set<ForeignTravelRecord>();
    public DbSet<ScifAccessLog> ScifAccessLogs => Set<ScifAccessLog>();

    // Facilities Portal - Check-In & Analytics
    public DbSet<FacilityCheckIn> FacilityCheckIns => Set<FacilityCheckIn>();
    public DbSet<FacilityAttributeDefinition> FacilityAttributeDefinitions => Set<FacilityAttributeDefinition>();
    public DbSet<FacilityUsageDaily> FacilityUsageDaily => Set<FacilityUsageDaily>();

    // Team Calendars
    public DbSet<TeamCalendar> TeamCalendars => Set<TeamCalendar>();
    public DbSet<TeamCalendarMember> TeamCalendarMembers => Set<TeamCalendarMember>();

    // Validation
    public DbSet<ValidationRule> ValidationRules => Set<ValidationRule>();

    // Authorization & Permissions
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermissionTemplate> RolePermissionTemplates => Set<RolePermissionTemplate>();
    public DbSet<AuthorizationAuditLog> AuthorizationAuditLogs => Set<AuthorizationAuditLog>();
    public DbSet<LoginAudit> LoginAudits => Set<LoginAudit>();

    // Authentication (Magic Link & Impersonation)
    public DbSet<MagicLinkToken> MagicLinkTokens => Set<MagicLinkToken>();
    public DbSet<ImpersonationSession> ImpersonationSessions => Set<ImpersonationSession>();

    // Dropdown Configuration
    public DbSet<TenantDropdownConfiguration> TenantDropdownConfigurations => Set<TenantDropdownConfiguration>();

    // Help System
    public DbSet<HelpArticle> HelpArticles => Set<HelpArticle>();

    // App Launcher & Feedback
    public DbSet<AppTile> AppTiles => Set<AppTile>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();

    // Data Archive Management
    public DbSet<DataArchive> DataArchives => Set<DataArchive>();
    public DbSet<DataArchiveExport> DataArchiveExports => Set<DataArchiveExport>();

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
        ConfigureEnhancedStaffing(modelBuilder);
        ConfigureHoteling(modelBuilder);
        ConfigureWorkLocationTemplates(modelBuilder);
        ConfigureTeamCalendars(modelBuilder);
        ConfigureValidation(modelBuilder);
        ConfigureAuthorization(modelBuilder);
        ConfigureGroups(modelBuilder);
        ConfigureDataArchive(modelBuilder);
        ConfigureAuthentication(modelBuilder);
        ConfigureFacilitiesPortal(modelBuilder);
        ConfigureAppLauncherAndFeedback(modelBuilder);

        // Apply global query filters for soft deletes
        ApplySoftDeleteFilter(modelBuilder);

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
            entity.HasIndex(e => e.ManagerId);

            // Self-referencing manager hierarchy
            entity.HasOne(e => e.Manager)
                .WithMany(e => e.DirectReports)
                .HasForeignKey(e => e.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Home Office relationship
            entity.HasOne(e => e.HomeOffice)
                .WithMany()
                .HasForeignKey(e => e.HomeOfficeId)
                .OnDelete(DeleteBehavior.SetNull);

            // Executive Assistant relationship
            entity.HasOne(e => e.ExecutiveAssistant)
                .WithMany()
                .HasForeignKey(e => e.ExecutiveAssistantId)
                .OnDelete(DeleteBehavior.SetNull);

            // Store StandardDelegateIds as JSON array
            entity.Property(e => e.StandardDelegateIds)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions)null!),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(v, (System.Text.Json.JsonSerializerOptions)null!) ?? new List<Guid>())
                .HasColumnType("jsonb");
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
        modelBuilder.Entity<Skill>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<PersonSkill>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.UserId, e.SkillId }).IsUnique();

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Skill)
                .WithMany(s => s.PersonSkills)
                .HasForeignKey(e => e.SkillId)
                .OnDelete(DeleteBehavior.Cascade);
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

            entity.HasIndex(e => new { e.UserId, e.CertificationId });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Certification)
                .WithMany(c => c.PersonCertifications)
                .HasForeignKey(e => e.CertificationId)
                .OnDelete(DeleteBehavior.Cascade);
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
            entity.HasIndex(e => e.ApproverGroupId);

            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => new { e.ProjectId, e.ApprovalStatus });
            entity.HasIndex(e => new { e.ProjectId, e.Type });

            entity.HasOne(e => e.Project)
                .WithMany(p => p.WbsElements)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ApproverGroup)
                .WithMany()
                .HasForeignKey(e => e.ApproverGroupId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<WbsChangeHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ChangeType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ChangedAt).IsRequired();

            entity.HasIndex(e => e.WbsElementId);
            entity.HasIndex(e => new { e.WbsElementId, e.ChangedAt });
            entity.HasIndex(e => e.ChangedByUserId);

            entity.HasOne(e => e.WbsElement)
                .WithMany(w => w.ChangeHistory)
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ChangedBy)
                .WithMany()
                .HasForeignKey(e => e.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
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

        // Project Assignment (Step 1 of two-step assignment)
        modelBuilder.Entity<ProjectAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Status });
            entity.HasIndex(e => new { e.ProjectId, e.Status });
            entity.HasIndex(e => new { e.StartDate, e.EndDate });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Assignment (Step 2 of two-step assignment - WBS level)
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Status });
            entity.HasIndex(e => new { e.WbsElementId, e.Status });
            entity.HasIndex(e => new { e.ProjectAssignmentId, e.Status });
            entity.HasIndex(e => new { e.StartDate, e.EndDate });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ProjectRole)
                .WithMany(r => r.Assignments)
                .HasForeignKey(e => e.ProjectRoleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.WbsElement)
                .WithMany(w => w.Assignments)
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.Restrict);

            // Link to ProjectAssignment (nullable for backwards compatibility)
            entity.HasOne(e => e.ProjectAssignment)
                .WithMany(pa => pa.WbsAssignments)
                .HasForeignKey(e => e.ProjectAssignmentId)
                .OnDelete(DeleteBehavior.SetNull);

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

        modelBuilder.Entity<AssignmentRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.AllocationPct).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.RequestedForUserId, e.Status });
            entity.HasIndex(e => new { e.ApproverGroupId, e.Status });

            entity.HasOne(e => e.RequestedByUser)
                .WithMany()
                .HasForeignKey(e => e.RequestedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RequestedForUser)
                .WithMany()
                .HasForeignKey(e => e.RequestedForUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.WbsElement)
                .WithMany()
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Assignment)
                .WithMany()
                .HasForeignKey(e => e.AssignmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ApproverGroup)
                .WithMany(g => g.AssignmentRequests)
                .HasForeignKey(e => e.ApproverGroupId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureEnhancedStaffing(ModelBuilder modelBuilder)
    {
        // CareerJobFamily
        modelBuilder.Entity<CareerJobFamily>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.IsActive });
            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
        });

        // SubcontractorCompany
        modelBuilder.Entity<SubcontractorCompany>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.State).HasMaxLength(100);
            entity.Property(e => e.Country).HasMaxLength(100);
            entity.Property(e => e.PostalCode).HasMaxLength(20);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Website).HasMaxLength(500);
            entity.Property(e => e.ForecastContactName).HasMaxLength(200);
            entity.Property(e => e.ForecastContactEmail).HasMaxLength(255);
            entity.Property(e => e.ForecastContactPhone).HasMaxLength(50);
            entity.Property(e => e.ContractNumber).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.Code });

            entity.HasOne(e => e.PrimaryContactUser)
                .WithMany()
                .HasForeignKey(e => e.PrimaryContactUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Subcontractor
        modelBuilder.Entity<Subcontractor>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.PositionTitle).HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.SubcontractorCompanyId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.Email });

            entity.HasOne(e => e.SubcontractorCompany)
                .WithMany(c => c.Subcontractors)
                .HasForeignKey(e => e.SubcontractorCompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CareerJobFamily)
                .WithMany(c => c.Subcontractors)
                .HasForeignKey(e => e.CareerJobFamilyId)
                .OnDelete(DeleteBehavior.SetNull);

            // Ignore computed property
            entity.Ignore(e => e.FullName);
        });

        // LaborCategory
        modelBuilder.Entity<LaborCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.BillRate).HasPrecision(18, 2);
            entity.Property(e => e.CostRate).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.TenantId, e.ProjectId, e.IsActive });

            entity.HasOne(e => e.Project)
                .WithMany(p => p.LaborCategories)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ProjectRoleAssignment
        modelBuilder.Entity<ProjectRoleAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PositionTitle).IsRequired().HasMaxLength(200);
            entity.Property(e => e.TbdDescription).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.ProjectId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.SubcontractorId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.IsTbd, e.Status });
            entity.HasIndex(e => new { e.StartDate, e.EndDate });

            entity.HasOne(e => e.Project)
                .WithMany(p => p.ProjectRoleAssignments)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.WbsElement)
                .WithMany(w => w.ProjectRoleAssignments)
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.User)
                .WithMany(u => u.ProjectRoleAssignments)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Subcontractor)
                .WithMany(s => s.ProjectRoleAssignments)
                .HasForeignKey(e => e.SubcontractorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CareerJobFamily)
                .WithMany(c => c.ProjectRoleAssignments)
                .HasForeignKey(e => e.CareerJobFamilyId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.LaborCategory)
                .WithMany(l => l.ProjectRoleAssignments)
                .HasForeignKey(e => e.LaborCategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            // Ignore computed property
            entity.Ignore(e => e.AssigneeName);
        });

        // ForecastVersion
        modelBuilder.Entity<ForecastVersion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ArchiveReason).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.Type, e.IsCurrent });
            entity.HasIndex(e => new { e.TenantId, e.ProjectId, e.IsCurrent });
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Type });

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.PromotedByUser)
                .WithMany()
                .HasForeignKey(e => e.PromotedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.BasedOnVersion)
                .WithMany()
                .HasForeignKey(e => e.BasedOnVersionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Forecast
        modelBuilder.Entity<Forecast>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ForecastedHours).HasPrecision(10, 2);
            entity.Property(e => e.RecommendedHours).HasPrecision(10, 2);
            entity.Property(e => e.OriginalForecastedHours).HasPrecision(10, 2);
            entity.Property(e => e.ApprovalNotes).HasMaxLength(1000);
            entity.Property(e => e.OverrideReason).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.ForecastVersionId, e.Year, e.Month });
            entity.HasIndex(e => new { e.ProjectRoleAssignmentId, e.Year, e.Month, e.Week });
            entity.HasIndex(e => new { e.TenantId, e.Status });

            entity.HasOne(e => e.ProjectRoleAssignment)
                .WithMany(p => p.Forecasts)
                .HasForeignKey(e => e.ProjectRoleAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ForecastVersion)
                .WithMany(v => v.Forecasts)
                .HasForeignKey(e => e.ForecastVersionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.SubmittedByUser)
                .WithMany()
                .HasForeignKey(e => e.SubmittedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.OverriddenByUser)
                .WithMany()
                .HasForeignKey(e => e.OverriddenByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ForecastHistory
        modelBuilder.Entity<ForecastHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OldHours).HasPrecision(10, 2);
            entity.Property(e => e.NewHours).HasPrecision(10, 2);
            entity.Property(e => e.ChangeReason).HasMaxLength(500);

            entity.HasIndex(e => new { e.ForecastId, e.ChangedAt });
            entity.HasIndex(e => e.ChangedByUserId);

            entity.HasOne(e => e.Forecast)
                .WithMany(f => f.History)
                .HasForeignKey(e => e.ForecastId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ChangedByUser)
                .WithMany()
                .HasForeignKey(e => e.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ForecastApprovalSchedule
        modelBuilder.Entity<ForecastApprovalSchedule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);

            entity.HasIndex(e => new { e.TenantId, e.IsActive });
            entity.HasIndex(e => new { e.TenantId, e.IsDefault });
        });

        // ForecastImportExport
        modelBuilder.Entity<ForecastImportExport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.FileFormat).IsRequired().HasMaxLength(10);
            entity.Property(e => e.FileHash).HasMaxLength(64);
            entity.Property(e => e.ErrorDetails).HasColumnType("jsonb");

            entity.HasIndex(e => new { e.TenantId, e.Type, e.OperationAt });
            entity.HasIndex(e => e.ForecastVersionId);
            entity.HasIndex(e => e.FileHash);

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ForecastVersion)
                .WithMany(v => v.ImportExportOperations)
                .HasForeignKey(e => e.ForecastVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ResultingVersion)
                .WithMany()
                .HasForeignKey(e => e.ResultingVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.OperationByUser)
                .WithMany()
                .HasForeignKey(e => e.OperationByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ActualHours
        modelBuilder.Entity<ActualHours>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Hours).HasPrecision(10, 2);
            entity.Property(e => e.SourceReference).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.ProjectRoleAssignmentId, e.Year, e.Month, e.Week });
            entity.HasIndex(e => new { e.TenantId, e.Source });
            entity.HasIndex(e => e.ImportOperationId);

            entity.HasOne(e => e.ProjectRoleAssignment)
                .WithMany(p => p.ActualHours)
                .HasForeignKey(e => e.ProjectRoleAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ImportOperation)
                .WithMany()
                .HasForeignKey(e => e.ImportOperationId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // User CareerJobFamily relationship
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.PositionTitle).HasMaxLength(200);
            entity.Property(e => e.StandardHoursPerWeek).HasPrecision(5, 2);

            entity.HasIndex(e => e.CareerJobFamilyId);

            entity.HasOne(e => e.CareerJobFamily)
                .WithMany(c => c.Users)
                .HasForeignKey(e => e.CareerJobFamilyId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ProjectBudget
        modelBuilder.Entity<ProjectBudget>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.TotalBudgetedHours).HasPrecision(12, 2);
            entity.Property(e => e.ApprovalNotes).HasMaxLength(1000);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.ProjectId, e.FiscalYear, e.IsActive });
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => new { e.ProjectId, e.FiscalYear, e.VersionNumber });

            entity.HasOne(e => e.Project)
                .WithMany(p => p.ProjectBudgets)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PreviousVersion)
                .WithMany()
                .HasForeignKey(e => e.PreviousVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.SubmittedByUser)
                .WithMany()
                .HasForeignKey(e => e.SubmittedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ProjectBudgetLine
        modelBuilder.Entity<ProjectBudgetLine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BudgetedHours).HasPrecision(10, 2);
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.ProjectBudgetId, e.Year, e.Month });
            entity.HasIndex(e => new { e.ProjectBudgetId, e.WbsElementId, e.Year, e.Month });

            entity.HasOne(e => e.ProjectBudget)
                .WithMany(b => b.Lines)
                .HasForeignKey(e => e.ProjectBudgetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.WbsElement)
                .WithMany()
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.LaborCategory)
                .WithMany()
                .HasForeignKey(e => e.LaborCategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ProjectBudgetHistory
        modelBuilder.Entity<ProjectBudgetHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OldTotalHours).HasPrecision(12, 2);
            entity.Property(e => e.NewTotalHours).HasPrecision(12, 2);
            entity.Property(e => e.ChangeReason).HasMaxLength(500);

            entity.HasIndex(e => new { e.ProjectBudgetId, e.ChangedAt });
            entity.HasIndex(e => e.ChangedByUserId);

            entity.HasOne(e => e.ProjectBudget)
                .WithMany(b => b.History)
                .HasForeignKey(e => e.ProjectBudgetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ChangedByUser)
                .WithMany()
                .HasForeignKey(e => e.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // NonLaborCostType
        modelBuilder.Entity<NonLaborCostType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Code).HasMaxLength(20);
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.IsActive, e.SortOrder });
            entity.HasIndex(e => new { e.TenantId, e.Code });
        });

        // NonLaborForecast
        modelBuilder.Entity<NonLaborForecast>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ForecastedAmount).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.ProjectId, e.Year, e.Month });
            entity.HasIndex(e => new { e.ProjectId, e.NonLaborCostTypeId, e.Year, e.Month });

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.WbsElement)
                .WithMany()
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.NonLaborCostType)
                .WithMany()
                .HasForeignKey(e => e.NonLaborCostTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ForecastVersion)
                .WithMany()
                .HasForeignKey(e => e.ForecastVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.SubmittedByUser)
                .WithMany()
                .HasForeignKey(e => e.SubmittedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // NonLaborBudgetLine
        modelBuilder.Entity<NonLaborBudgetLine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BudgetedAmount).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.TenantId, e.ProjectBudgetId, e.Year, e.Month });

            entity.HasOne(e => e.ProjectBudget)
                .WithMany()
                .HasForeignKey(e => e.ProjectBudgetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.NonLaborCostType)
                .WithMany()
                .HasForeignKey(e => e.NonLaborCostTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.WbsElement)
                .WithMany()
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ActualNonLaborCost
        modelBuilder.Entity<ActualNonLaborCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActualAmount).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.TenantId, e.ProjectId, e.Year, e.Month });

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.NonLaborCostType)
                .WithMany()
                .HasForeignKey(e => e.NonLaborCostTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.WbsElement)
                .WithMany()
                .HasForeignKey(e => e.WbsElementId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // EmployeeCostRate
        modelBuilder.Entity<EmployeeCostRate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.LoadedCostRate).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.UserId, e.EffectiveDate })
                .IsUnique();
            entity.HasIndex(e => new { e.UserId, e.EffectiveDate });
            entity.HasIndex(e => new { e.TenantId, e.EffectiveDate });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ImportBatch)
                .WithMany(b => b.CostRates)
                .HasForeignKey(e => e.ImportBatchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // CostRateImportBatch
        modelBuilder.Entity<CostRateImportBatch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FileType).IsRequired().HasMaxLength(10);

            entity.HasIndex(e => new { e.TenantId, e.CreatedAt });
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

        // Floor configuration
        modelBuilder.Entity<Floor>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Level).IsRequired();

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.Level });
            entity.HasIndex(e => new { e.OfficeId, e.IsActive });

            entity.HasOne(e => e.Office)
                .WithMany(o => o.Floors)
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Zone configuration
        modelBuilder.Entity<Zone>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Color).HasMaxLength(7); // #RRGGBB

            entity.HasIndex(e => new { e.TenantId, e.FloorId });
            entity.HasIndex(e => new { e.FloorId, e.IsActive });

            entity.HasOne(e => e.Floor)
                .WithMany(f => f.Zones)
                .HasForeignKey(e => e.FloorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Space>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.Type });
            entity.HasIndex(e => new { e.ManagerUserId, e.IsActive });
            entity.HasIndex(e => new { e.FloorId, e.ZoneId });

            entity.HasOne(e => e.Office)
                .WithMany(o => o.Spaces)
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Floor)
                .WithMany(f => f.Spaces)
                .HasForeignKey(e => e.FloorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Zone)
                .WithMany(z => z.Spaces)
                .HasForeignKey(e => e.ZoneId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Manager)
                .WithMany()
                .HasForeignKey(e => e.ManagerUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // SpaceAssignment configuration
        modelBuilder.Entity<SpaceAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.SpaceId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Status });
            entity.HasIndex(e => new { e.StartDate, e.EndDate });

            entity.HasOne(e => e.Space)
                .WithMany(s => s.Assignments)
                .HasForeignKey(e => e.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ApprovedBy)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // BookingRule configuration
        modelBuilder.Entity<BookingRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.AllowedDaysOfWeek).HasMaxLength(50);
            entity.Property(e => e.AutoApproveRoles).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.IsActive });
            entity.HasIndex(e => new { e.SpaceType, e.IsActive });
            entity.HasIndex(e => e.Priority);

            entity.HasOne(e => e.Office)
                .WithMany(o => o.BookingRules)
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Space)
                .WithMany()
                .HasForeignKey(e => e.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.SpaceId, e.StartDatetime, e.EndDatetime });
            entity.HasIndex(e => new { e.UserId, e.Status });
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsPermanent);  // Index for permanent bookings

            entity.HasOne(e => e.Space)
                .WithMany(s => s.Bookings)
                .HasForeignKey(e => e.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.BookedBy)
                .WithMany()
                .HasForeignKey(e => e.BookedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CheckInEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Method).IsRequired().HasMaxLength(50);

            entity.HasIndex(e => e.BookingId);
            entity.HasIndex(e => new { e.BookingId, e.CheckInDate }).IsUnique();  // One check-in per day per booking

            entity.HasOne(e => e.Booking)
                .WithMany(b => b.CheckInEvents)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ProcessedBy)
                .WithMany()
                .HasForeignKey(e => e.ProcessedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
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

            // One preference per person per day per day portion (allows AM + PM)
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.WorkDate, e.DayPortion }).IsUnique();
            entity.HasIndex(e => new { e.WorkDate, e.LocationType });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
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

        modelBuilder.Entity<CompanyHoliday>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);

            // One holiday per tenant per date
            entity.HasIndex(e => new { e.TenantId, e.HolidayDate, e.Type });
            entity.HasIndex(e => new { e.TenantId, e.IsObserved });
        });
    }

    private void ConfigureWorkLocationTemplates(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WorkLocationTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.IsShared).IsRequired().HasDefaultValue(false);

            entity.HasIndex(e => new { e.TenantId, e.UserId, e.IsShared });
            entity.HasIndex(e => e.Type);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkLocationTemplateItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DayOffset).IsRequired();
            entity.Property(e => e.LocationType).IsRequired();
            entity.Property(e => e.RemoteLocation).HasMaxLength(200);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.State).HasMaxLength(100);
            entity.Property(e => e.Country).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasIndex(e => new { e.TemplateId, e.DayOffset });

            entity.HasOne(e => e.Template)
                .WithMany(t => t.Items)
                .HasForeignKey(e => e.TemplateId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<DelegationOfAuthorityLetter>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.LetterContent).IsRequired();
            entity.Property(e => e.EffectiveStartDate).IsRequired();
            entity.Property(e => e.EffectiveEndDate).IsRequired();
            entity.Property(e => e.IsFinancialAuthority).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.IsOperationalAuthority).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.DelegatorUserId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.DesigneeUserId, e.Status });
            entity.HasIndex(e => new { e.Status, e.EffectiveStartDate, e.EffectiveEndDate });

            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.DelegatorUser)
                .WithMany()
                .HasForeignKey(e => e.DelegatorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DesigneeUser)
                .WithMany()
                .HasForeignKey(e => e.DesigneeUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DigitalSignature>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SignatureData).IsRequired();
            entity.Property(e => e.SignedAt).IsRequired();
            entity.Property(e => e.IpAddress).IsRequired().HasMaxLength(45); // IPv6 max length
            entity.Property(e => e.UserAgent).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Role).IsRequired();
            entity.Property(e => e.IsVerified).IsRequired().HasDefaultValue(true);

            entity.HasIndex(e => new { e.DOALetterId, e.Role });
            entity.HasIndex(e => e.SignerUserId);

            entity.HasOne(e => e.DOALetter)
                .WithMany(d => d.Signatures)
                .HasForeignKey(e => e.DOALetterId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.SignerUser)
                .WithMany()
                .HasForeignKey(e => e.SignerUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private void ConfigureResume(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ResumeProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).IsRequired().HasDefaultValue(MyScheduling.Core.Enums.ResumeStatus.Draft);
            entity.Property(e => e.IsPublic).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.UserId).IsRequired();

            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.UserId).IsUnique();

            entity.HasOne(e => e.CurrentVersion)
                .WithMany()
                .HasForeignKey(e => e.CurrentVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.LastReviewedBy)
                .WithMany()
                .HasForeignKey(e => e.LastReviewedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ResumeSection>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DisplayOrder).IsRequired();

            entity.HasIndex(e => e.ResumeProfileId);
            entity.HasIndex(e => new { e.UserId, e.DisplayOrder });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ResumeProfile)
                .WithMany(r => r.Sections)
                .HasForeignKey(e => e.ResumeProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ResumeEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);

            entity.HasOne(e => e.ResumeSection)
                .WithMany(s => s.Entries)
                .HasForeignKey(e => e.ResumeSectionId)
                .OnDelete(DeleteBehavior.Cascade);
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

            entity.HasIndex(e => new { e.UserId, e.ImportedAt });
            entity.HasIndex(e => new { e.ResumeProfileId, e.Status });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
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

        modelBuilder.Entity<ResumeShareLink>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShareToken).IsRequired().HasMaxLength(50);
            entity.Property(e => e.PasswordHash).HasMaxLength(100);
            entity.Property(e => e.VisibleSections).HasMaxLength(500);
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.ViewCount).IsRequired().HasDefaultValue(0);
            entity.Property(e => e.HideContactInfo).IsRequired().HasDefaultValue(false);

            entity.HasIndex(e => e.ShareToken).IsUnique();
            entity.HasIndex(e => new { e.ResumeProfileId, e.IsActive });
            entity.HasIndex(e => e.CreatedByUserId);

            entity.HasOne(e => e.ResumeProfile)
                .WithMany(r => r.ShareLinks)
                .HasForeignKey(e => e.ResumeProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ResumeVersion)
                .WithMany()
                .HasForeignKey(e => e.ResumeVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
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

    private void ConfigureTeamCalendars(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TeamCalendar>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

            entity.HasIndex(e => new { e.TenantId, e.IsActive });
            entity.HasIndex(e => new { e.TenantId, e.Type });
            entity.HasIndex(e => e.OwnerUserId);

            entity.HasOne(e => e.Owner)
                .WithMany()
                .HasForeignKey(e => e.OwnerUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TeamCalendarMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MembershipType).IsRequired();
            entity.Property(e => e.AddedDate).IsRequired();
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

            // Unique constraint: user can only be in each calendar once
            entity.HasIndex(e => new { e.TenantId, e.TeamCalendarId, e.UserId }).IsUnique();
            entity.HasIndex(e => new { e.UserId, e.IsActive });
            entity.HasIndex(e => new { e.TeamCalendarId, e.IsActive });

            entity.HasOne(e => e.TeamCalendar)
                .WithMany(t => t.Members)
                .HasForeignKey(e => e.TeamCalendarId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.AddedByUser)
                .WithMany()
                .HasForeignKey(e => e.AddedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
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

    private void ConfigureFacilitiesPortal(ModelBuilder modelBuilder)
    {
        // ============================================================================
        // LEASE MANAGEMENT
        // ============================================================================

        modelBuilder.Entity<Lease>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.LeaseNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ExternalLeaseId).HasMaxLength(100);
            entity.Property(e => e.LandlordName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.LandlordContactName).HasMaxLength(200);
            entity.Property(e => e.LandlordEmail).HasMaxLength(255);
            entity.Property(e => e.LandlordPhone).HasMaxLength(50);
            entity.Property(e => e.PropertyManagementCompany).HasMaxLength(200);
            entity.Property(e => e.PropertyManagerName).HasMaxLength(200);
            entity.Property(e => e.PropertyManagerEmail).HasMaxLength(255);
            entity.Property(e => e.PropertyManagerPhone).HasMaxLength(50);
            entity.Property(e => e.SquareFootage).HasPrecision(12, 2);
            entity.Property(e => e.UsableSquareFootage).HasPrecision(12, 2);
            entity.Property(e => e.BaseRentMonthly).HasPrecision(12, 2);
            entity.Property(e => e.CamChargesMonthly).HasPrecision(12, 2);
            entity.Property(e => e.UtilitiesMonthly).HasPrecision(12, 2);
            entity.Property(e => e.TaxesMonthly).HasPrecision(12, 2);
            entity.Property(e => e.InsuranceMonthly).HasPrecision(12, 2);
            entity.Property(e => e.OtherChargesMonthly).HasPrecision(12, 2);
            entity.Property(e => e.OtherChargesDescription).HasMaxLength(500);
            entity.Property(e => e.SecurityDeposit).HasPrecision(12, 2);
            entity.Property(e => e.EscalationPercentage).HasPrecision(5, 2);
            entity.Property(e => e.EarlyTerminationFee).HasPrecision(12, 2);
            entity.Property(e => e.ScifDetails).HasMaxLength(1000);
            entity.Property(e => e.InsuranceProvider).HasMaxLength(200);
            entity.Property(e => e.InsurancePolicyNumber).HasMaxLength(100);
            entity.Property(e => e.InsuranceCoverageAmount).HasPrecision(14, 2);
            entity.Property(e => e.CriticalClauses).HasColumnType("jsonb");
            entity.Property(e => e.SpecialTerms).HasMaxLength(4000);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.CustomAttributes).HasColumnType("jsonb");

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.LeaseEndDate });
            entity.HasIndex(e => new { e.TenantId, e.LeaseNumber }).IsUnique();

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LeaseOptionYear>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProposedRentMonthly).HasPrecision(12, 2);
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.LeaseId, e.OptionNumber });
            entity.HasIndex(e => new { e.Status, e.ExerciseDeadline });

            entity.HasOne(e => e.Lease)
                .WithMany(l => l.OptionYears)
                .HasForeignKey(e => e.LeaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ExercisedBy)
                .WithMany()
                .HasForeignKey(e => e.ExercisedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<LeaseAmendment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AmendmentNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.RentChange).HasPrecision(12, 2);
            entity.Property(e => e.SquareFootageChange).HasPrecision(12, 2);
            entity.Property(e => e.Terms).HasMaxLength(4000);

            entity.HasIndex(e => new { e.TenantId, e.LeaseId, e.EffectiveDate });

            entity.HasOne(e => e.Lease)
                .WithMany(l => l.Amendments)
                .HasForeignKey(e => e.LeaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ProcessedBy)
                .WithMany()
                .HasForeignKey(e => e.ProcessedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<LeaseAttachment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.StoragePath).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.LeaseId, e.Type });
            entity.HasIndex(e => e.AmendmentId);

            entity.HasOne(e => e.Lease)
                .WithMany(l => l.Attachments)
                .HasForeignKey(e => e.LeaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Amendment)
                .WithMany(a => a.Attachments)
                .HasForeignKey(e => e.AmendmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.UploadedBy)
                .WithMany()
                .HasForeignKey(e => e.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ============================================================================
        // TRAVEL GUIDES & INFO
        // ============================================================================

        modelBuilder.Entity<OfficeTravelGuide>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NearestAirport).HasMaxLength(200);
            entity.Property(e => e.AirportCode).HasMaxLength(10);
            entity.Property(e => e.AirportDistance).HasMaxLength(100);
            entity.Property(e => e.RecommendedGroundTransport).HasMaxLength(1000);
            entity.Property(e => e.PublicTransitOptions).HasMaxLength(2000);
            entity.Property(e => e.DrivingDirections).HasMaxLength(2000);
            entity.Property(e => e.ParkingInstructions).HasMaxLength(1000);
            entity.Property(e => e.ParkingDailyCost).HasPrecision(8, 2);
            entity.Property(e => e.RecommendedHotels).HasColumnType("jsonb");
            entity.Property(e => e.CorporateHotelCode).HasMaxLength(50);
            entity.Property(e => e.NeighborhoodTips).HasMaxLength(1000);
            entity.Property(e => e.BuildingHours).HasMaxLength(500);
            entity.Property(e => e.AfterHoursAccess).HasMaxLength(1000);
            entity.Property(e => e.VisitorCheckIn).HasMaxLength(1000);
            entity.Property(e => e.SecurityRequirements).HasMaxLength(1000);
            entity.Property(e => e.BadgeInstructions).HasMaxLength(1000);
            entity.Property(e => e.DressCode).HasMaxLength(500);
            entity.Property(e => e.CafeteriaInfo).HasMaxLength(1000);
            entity.Property(e => e.NearbyRestaurants).HasColumnType("jsonb");
            entity.Property(e => e.WifiInstructions).HasMaxLength(500);
            entity.Property(e => e.ConferenceRoomBooking).HasMaxLength(500);
            entity.Property(e => e.PrintingInstructions).HasMaxLength(500);
            entity.Property(e => e.Amenities).HasMaxLength(1000);
            entity.Property(e => e.ReceptionPhone).HasMaxLength(50);
            entity.Property(e => e.SecurityPhone).HasMaxLength(50);
            entity.Property(e => e.FacilitiesEmail).HasMaxLength(255);
            entity.Property(e => e.EmergencyContact).HasMaxLength(200);
            entity.Property(e => e.WelcomeMessage).HasMaxLength(4000);
            entity.Property(e => e.ImportantNotes).HasMaxLength(4000);
            entity.Property(e => e.PhotoGallery).HasColumnType("jsonb");
            entity.Property(e => e.VideoTourUrl).HasMaxLength(500);
            entity.Property(e => e.VirtualTourUrl).HasMaxLength(500);
            entity.Property(e => e.CurrentAnnouncements).HasColumnType("jsonb");
            entity.Property(e => e.SpecialInstructions).HasMaxLength(2000);
            entity.Property(e => e.CustomAttributes).HasColumnType("jsonb");

            entity.HasIndex(e => new { e.TenantId, e.OfficeId }).IsUnique();

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.LastUpdatedBy)
                .WithMany()
                .HasForeignKey(e => e.LastUpdatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<OfficePoc>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.MobilePhone).HasMaxLength(50);
            entity.Property(e => e.Responsibilities).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.Role });
            entity.HasIndex(e => new { e.OfficeId, e.IsPrimary });

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<FacilityAnnouncement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Content).IsRequired().HasMaxLength(4000);

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.IsActive });
            entity.HasIndex(e => new { e.TenantId, e.Priority, e.IsActive });
            entity.HasIndex(e => new { e.EffectiveDate, e.ExpirationDate });

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.AuthoredBy)
                .WithMany()
                .HasForeignKey(e => e.AuthoredByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AnnouncementAcknowledgment>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.AnnouncementId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.Announcement)
                .WithMany(a => a.Acknowledgments)
                .HasForeignKey(e => e.AnnouncementId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ============================================================================
        // FIELD PERSONNEL & FSO
        // ============================================================================

        modelBuilder.Entity<ClientSiteDetail>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClientName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ContractNumber).HasMaxLength(100);
            entity.Property(e => e.TaskOrderNumber).HasMaxLength(100);
            entity.Property(e => e.ClientPocName).HasMaxLength(200);
            entity.Property(e => e.ClientPocEmail).HasMaxLength(255);
            entity.Property(e => e.ClientPocPhone).HasMaxLength(50);
            entity.Property(e => e.BadgeType).HasMaxLength(50);
            entity.Property(e => e.BadgeInstructions).HasMaxLength(1000);
            entity.Property(e => e.ScifAccessInstructions).HasMaxLength(1000);
            entity.Property(e => e.SecurityPocName).HasMaxLength(200);
            entity.Property(e => e.SecurityPocEmail).HasMaxLength(255);
            entity.Property(e => e.SecurityPocPhone).HasMaxLength(50);
            entity.Property(e => e.SiteHours).HasMaxLength(500);
            entity.Property(e => e.AccessInstructions).HasMaxLength(1000);
            entity.Property(e => e.CheckInProcedure).HasMaxLength(1000);
            entity.Property(e => e.EscortRequirements).HasMaxLength(500);
            entity.Property(e => e.NetworkAccess).HasMaxLength(500);
            entity.Property(e => e.ItSupportContact).HasMaxLength(200);
            entity.Property(e => e.ApprovedDevices).HasMaxLength(500);
            entity.Property(e => e.CustomAttributes).HasColumnType("jsonb");

            entity.HasIndex(e => new { e.TenantId, e.OfficeId }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.RequiredClearance });

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.AssignedFso)
                .WithMany()
                .HasForeignKey(e => e.AssignedFsoUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<FieldAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProjectName).HasMaxLength(200);
            entity.Property(e => e.TaskDescription).HasMaxLength(500);
            entity.Property(e => e.ContractNumber).HasMaxLength(100);
            entity.Property(e => e.BillRate).HasPrecision(12, 2);
            entity.Property(e => e.BadgeNumber).HasMaxLength(50);
            entity.Property(e => e.ApprovalNotes).HasMaxLength(1000);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.ClientSiteOfficeId, e.Status });
            entity.HasIndex(e => new { e.StartDate, e.EndDate });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ClientSiteOffice)
                .WithMany()
                .HasForeignKey(e => e.ClientSiteOfficeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedBy)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ClearanceVerifiedBy)
                .WithMany()
                .HasForeignKey(e => e.ClearanceVerifiedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<EmployeeClearance>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InvestigationType).HasMaxLength(50);
            entity.Property(e => e.PolygraphType).HasMaxLength(50);
            entity.Property(e => e.SciCompartments).HasColumnType("jsonb");
            entity.Property(e => e.SponsoringAgency).HasMaxLength(200);
            entity.Property(e => e.ContractorCode).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.Level, e.Status });
            entity.HasIndex(e => e.ExpirationDate);
            entity.HasIndex(e => e.ReinvestigationDate);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.VerifiedBy)
                .WithMany()
                .HasForeignKey(e => e.VerifiedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ForeignTravelRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DestinationCountry).IsRequired().HasMaxLength(100);
            entity.Property(e => e.DestinationCity).HasMaxLength(100);
            entity.Property(e => e.PurposeDescription).HasMaxLength(500);
            entity.Property(e => e.ApprovalNotes).HasMaxLength(1000);
            entity.Property(e => e.DebriefingNotes).HasMaxLength(2000);
            entity.Property(e => e.ForeignContacts).HasColumnType("jsonb");
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => new { e.TenantId, e.UserId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.Status, e.DepartureDate });
            entity.HasIndex(e => new { e.DepartureDate, e.ReturnDate });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.BriefedBy)
                .WithMany()
                .HasForeignKey(e => e.BriefedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ApprovedBy)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.DebriefedBy)
                .WithMany()
                .HasForeignKey(e => e.DebriefedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ScifAccessLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Purpose).HasMaxLength(500);
            entity.Property(e => e.BadgeNumber).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.AccessTime });
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.AccessTime });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Escort)
                .WithMany()
                .HasForeignKey(e => e.EscortUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ============================================================================
        // CHECK-IN & ANALYTICS
        // ============================================================================

        modelBuilder.Entity<FacilityCheckIn>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BadgeId).HasMaxLength(100);
            entity.Property(e => e.QrCode).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.DeviceInfo).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.CheckInTime });
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.CheckInTime });
            entity.HasIndex(e => new { e.Method, e.CheckInTime });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Space)
                .WithMany()
                .HasForeignKey(e => e.SpaceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<FacilityAttributeDefinition>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.DefaultValue).HasMaxLength(500);
            entity.Property(e => e.ValidationRule).HasMaxLength(500);
            entity.Property(e => e.Options).HasColumnType("jsonb");

            entity.HasIndex(e => new { e.TenantId, e.EntityType, e.IsActive });
            entity.HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        });

        modelBuilder.Entity<FacilityUsageDaily>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UtilizationRate).HasPrecision(5, 2);
            entity.Property(e => e.AverageStayHours).HasPrecision(5, 2);
            entity.Property(e => e.UtilizationBySpaceType).HasColumnType("jsonb");

            entity.HasIndex(e => new { e.TenantId, e.OfficeId, e.Date }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.Date });

            entity.HasOne(e => e.Office)
                .WithMany()
                .HasForeignKey(e => e.OfficeId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ConfigureAppLauncherAndFeedback(ModelBuilder modelBuilder)
    {
        // App Tiles
        modelBuilder.Entity<AppTile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Icon).IsRequired().HasMaxLength(200);
            entity.Property(e => e.BackgroundColor).IsRequired().HasMaxLength(20);
            entity.Property(e => e.TextColor).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Url).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.Category).HasMaxLength(100);

            entity.HasIndex(e => new { e.TenantId, e.SortOrder });
            entity.HasIndex(e => new { e.UserId, e.SortOrder });
            entity.HasIndex(e => e.IsBuiltIn);

            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Feedback
        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.PageUrl).HasMaxLength(500);
            entity.Property(e => e.StepsToReproduce).HasMaxLength(4000);
            entity.Property(e => e.ExpectedBehavior).HasMaxLength(2000);
            entity.Property(e => e.ActualBehavior).HasMaxLength(2000);
            entity.Property(e => e.BrowserInfo).HasMaxLength(500);
            entity.Property(e => e.ScreenshotUrl).HasMaxLength(2000);
            entity.Property(e => e.AdminNotes).HasMaxLength(4000);
            entity.Property(e => e.ExternalTicketId).HasMaxLength(100);
            entity.Property(e => e.ExternalTicketUrl).HasMaxLength(500);
            entity.Property(e => e.RefinedRequirements).HasMaxLength(8000);

            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.Type });
            entity.HasIndex(e => e.SubmittedByUserId);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.SubmittedByUser)
                .WithMany()
                .HasForeignKey(e => e.SubmittedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ResolvedByUser)
                .WithMany()
                .HasForeignKey(e => e.ResolvedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
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

    private void ConfigureAuthorization(ModelBuilder modelBuilder)
    {
        // Permission
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Resource).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Action).IsRequired();
            entity.Property(e => e.Scope).IsRequired();
            entity.HasIndex(e => new { e.UserId, e.Resource, e.Action });
            entity.HasIndex(e => new { e.Role, e.Resource, e.Action });
            entity.HasIndex(e => e.TenantId);
        });

        // RolePermissionTemplate
        modelBuilder.Entity<RolePermissionTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Resource).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => new { e.Role, e.Resource });
            entity.HasIndex(e => e.TenantId);
        });

        // AuthorizationAuditLog
        modelBuilder.Entity<AuthorizationAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Resource).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => new { e.UserId, e.Timestamp });
            entity.HasIndex(e => new { e.TenantId, e.Timestamp });
            entity.HasIndex(e => e.Timestamp);
        });

        // TenantDropdownConfiguration
        modelBuilder.Entity<TenantDropdownConfiguration>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => new { e.TenantId, e.Category }).IsUnique();
        });
    }

    private void ConfigureGroups(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

            entity.HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.IsActive });
        });

        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).IsRequired();

            entity.HasIndex(e => new { e.TenantId, e.GroupId, e.UserId }).IsUnique();
            entity.HasIndex(e => new { e.GroupId, e.Role });

            entity.HasOne(e => e.Group)
                .WithMany(g => g.Members)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ConfigureDataArchive(ModelBuilder modelBuilder)
    {
        // DataArchive
        modelBuilder.Entity<DataArchive>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
            entity.HasIndex(e => e.ArchivedAt);
            entity.HasIndex(e => e.ScheduledPermanentDeletionAt);
        });

        // DataArchiveExport
        modelBuilder.Entity<DataArchiveExport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => e.RequestedAt);
        });
    }

    private void ConfigureAuthentication(ModelBuilder modelBuilder)
    {
        // MagicLinkToken
        modelBuilder.Entity<MagicLinkToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(64); // SHA256 hex
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.RequestedFromIp).HasMaxLength(45); // IPv6 max
            entity.Property(e => e.RequestedUserAgent).HasMaxLength(500);
            entity.Property(e => e.UsedFromIp).HasMaxLength(45);
            entity.Property(e => e.UsedUserAgent).HasMaxLength(500);

            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasIndex(e => new { e.UserId, e.ExpiresAt });
            entity.HasIndex(e => e.ExpiresAt); // For cleanup jobs

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ignore computed properties
            entity.Ignore(e => e.IsExpired);
            entity.Ignore(e => e.IsUsed);
            entity.Ignore(e => e.IsValid);
        });

        // ImpersonationSession
        modelBuilder.Entity<ImpersonationSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StartedAt).IsRequired();
            entity.Property(e => e.Reason).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.UserAgent).HasMaxLength(500);

            entity.HasIndex(e => new { e.AdminUserId, e.EndedAt }); // Active sessions by admin
            entity.HasIndex(e => new { e.ImpersonatedUserId, e.StartedAt });
            entity.HasIndex(e => e.StartedAt);

            entity.HasOne(e => e.AdminUser)
                .WithMany()
                .HasForeignKey(e => e.AdminUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ImpersonatedUser)
                .WithMany()
                .HasForeignKey(e => e.ImpersonatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Ignore computed properties
            entity.Ignore(e => e.IsActive);
            entity.Ignore(e => e.Duration);
        });
    }

    private void ApplySoftDeleteFilter(ModelBuilder modelBuilder)
    {
        // Apply global query filter to exclude soft-deleted entities
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "e");
                var property = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                var filter = System.Linq.Expressions.Expression.Lambda(
                    System.Linq.Expressions.Expression.Equal(property, System.Linq.Expressions.Expression.Constant(false)),
                    parameter
                );
                entityType.SetQueryFilter(filter);
            }
        }
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
