namespace MyScheduling.Core.Entities;

/// <summary>
/// Tracks archived/soft-deleted data for data management and archival portal.
/// Allows platform admins to view, restore, or permanently delete data.
/// </summary>
public class DataArchive : BaseEntity
{
    public Guid? TenantId { get; set; }

    // What was archived
    public string EntityType { get; set; } = string.Empty;  // "Person", "Project", etc.
    public Guid EntityId { get; set; }
    public string EntitySnapshot { get; set; } = string.Empty;  // JSON snapshot of entity at deletion time

    // Archival metadata
    public DateTime ArchivedAt { get; set; }
    public Guid ArchivedByUserId { get; set; }
    public string? ArchivalReason { get; set; }
    public DataArchiveStatus Status { get; set; }

    // Restoration tracking
    public DateTime? RestoredAt { get; set; }
    public Guid? RestoredByUserId { get; set; }
    public string? RestorationNotes { get; set; }

    // Permanent deletion tracking
    public DateTime? PermanentlyDeletedAt { get; set; }
    public Guid? PermanentlyDeletedByUserId { get; set; }
    public string? PermanentDeletionReason { get; set; }

    // Export tracking
    public bool WasExported { get; set; } = false;
    public DateTime? ExportedAt { get; set; }
    public Guid? ExportedByUserId { get; set; }

    // Retention policy
    public DateTime? ScheduledPermanentDeletionAt { get; set; }
    public int RetentionDays { get; set; } = 90;  // Default 90-day retention

    // Navigation properties
    public virtual Tenant? Tenant { get; set; }
    public virtual User ArchivedBy { get; set; } = null!;
    public virtual User? RestoredBy { get; set; }
    public virtual User? PermanentlyDeletedBy { get; set; }
    public virtual User? ExportedBy { get; set; }
}

public enum DataArchiveStatus
{
    Archived = 0,           // Soft-deleted, can be restored
    Restored = 1,           // Was restored back to active
    PermanentlyDeleted = 2, // Hard deleted, cannot be recovered
    PendingReview = 3,      // Flagged for admin review
    Exported = 4            // Exported before deletion
}

/// <summary>
/// Batch export/archive operations tracking
/// </summary>
public class DataArchiveExport : BaseEntity
{
    public Guid? TenantId { get; set; }
    public Guid RequestedByUserId { get; set; }

    // Export parameters
    public string EntityType { get; set; } = string.Empty;
    public string? FilterJson { get; set; }  // JSON filter criteria
    public DateTime RequestedAt { get; set; }

    // Export result
    public DataArchiveExportStatus Status { get; set; }
    public string? StoredFileId { get; set; }  // Reference to exported file
    public int RecordCount { get; set; }
    public long FileSizeBytes { get; set; }

    // Processing
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }

    // Navigation properties
    public virtual Tenant? Tenant { get; set; }
    public virtual User RequestedBy { get; set; } = null!;
}

public enum DataArchiveExportStatus
{
    Pending = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3
}
