using MyScheduling.Core.Enums;

namespace MyScheduling.Core.Entities;

public class StoredFile : TenantEntity
{
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string FileHash { get; set; } = string.Empty; // SHA256 for deduplication

    // Storage location
    public FileStorageProvider StorageProvider { get; set; }
    public string StorageProviderId { get; set; } = string.Empty; // Provider-specific ID
    public string StoragePath { get; set; } = string.Empty; // Full path in storage
    public string? SharePointSiteId { get; set; }
    public string? SharePointDriveId { get; set; }
    public string? SharePointItemId { get; set; }

    // Metadata
    public string EntityType { get; set; } = string.Empty; // "Resume", "Project", etc.
    public Guid EntityId { get; set; }
    public string? Category { get; set; } // "Resume Document", "Profile Photo", etc.
    public string? Tags { get; set; } // JSON array of tags

    // Access control
    public FileAccessLevel AccessLevel { get; set; } = FileAccessLevel.Private;
    public DateTime? ExpiresAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    // Versioning
    public int Version { get; set; } = 1;
    public Guid? PreviousVersionId { get; set; }

    // Navigation properties
    public virtual User? DeletedBy { get; set; }
    public virtual StoredFile? PreviousVersion { get; set; }
    public virtual ICollection<FileAccessLog> AccessLogs { get; set; } = new List<FileAccessLog>();
}

public class FileAccessLog : BaseEntity
{
    public Guid StoredFileId { get; set; }
    public Guid AccessedByUserId { get; set; }
    public DateTime AccessedAt { get; set; }
    public FileAccessType AccessType { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    // Navigation properties
    public virtual StoredFile StoredFile { get; set; } = null!;
    public virtual User AccessedBy { get; set; } = null!;
}

public class SharePointConfiguration : TenantEntity
{
    public string SiteUrl { get; set; } = string.Empty;
    public string SiteId { get; set; } = string.Empty;
    public string DriveId { get; set; } = string.Empty;
    public string DriveName { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty; // Should be encrypted
    public string TenantIdMicrosoft { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? LastSyncedAt { get; set; }
    public string? FolderStructure { get; set; } // JSON mapping entity types to folders
}
