namespace MyScheduling.Core.Enums;

public enum FileStorageProvider
{
    SharePoint,
    AzureBlob,
    LocalFileSystem,
    S3
}

public enum FileAccessLevel
{
    Private,            // Only creator and admins
    TenantRestricted,   // Anyone in tenant
    Public              // Public access
}

public enum FileAccessType
{
    View,
    Download,
    Upload,
    Update,
    Delete
}
