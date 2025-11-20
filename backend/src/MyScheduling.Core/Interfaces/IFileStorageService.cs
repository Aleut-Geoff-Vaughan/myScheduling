using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;

namespace MyScheduling.Core.Interfaces;

public interface IFileStorageService
{
    // Upload/Download
    Task<StoredFile> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string entityType,
        Guid entityId,
        Guid tenantId,
        Guid uploadedByUserId,
        string? category = null);

    Task<Stream> DownloadFileAsync(Guid fileId, Guid userId);

    Task<bool> DeleteFileAsync(Guid fileId, Guid userId);

    // Versioning
    Task<StoredFile> CreateNewVersionAsync(
        Guid existingFileId,
        Stream fileStream,
        Guid userId);

    Task<IEnumerable<StoredFile>> GetFileVersionsAsync(Guid fileId);

    // Search
    Task<IEnumerable<StoredFile>> SearchFilesAsync(
        Guid tenantId,
        string? entityType = null,
        Guid? entityId = null,
        string? searchTerm = null);

    // Access
    Task<string> GenerateDownloadUrlAsync(Guid fileId, TimeSpan expiresIn);
    Task LogAccessAsync(Guid fileId, Guid userId, FileAccessType accessType, string? ipAddress = null, string? userAgent = null);
}
