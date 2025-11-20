using MyScheduling.Core.Entities;

namespace MyScheduling.Core.Interfaces;

public interface IDocumentExportService
{
    // Export to Word
    Task<StoredFile> ExportToWordAsync(
        Guid resumeProfileId,
        Guid templateId,
        Guid userId);

    // Export to PDF
    Task<StoredFile> ExportToPdfAsync(
        Guid resumeProfileId,
        Guid templateId,
        Guid userId);

    // Export to JSON
    Task<string> ExportToJsonAsync(Guid resumeProfileId);

    // Generate from template
    Task<Stream> GenerateFromTemplateAsync(
        ResumeProfile resume,
        ResumeTemplate template);

    // Batch export
    Task<List<StoredFile>> BatchExportAsync(
        List<Guid> resumeProfileIds,
        Guid templateId,
        Guid userId);
}
