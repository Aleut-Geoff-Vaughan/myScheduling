using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyScheduling.Api.Attributes;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;
using OfficeOpenXml;
using System.Security.Cryptography;
using System.Text;

namespace MyScheduling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ForecastImportExportController : AuthorizedControllerBase
{
    private readonly MySchedulingDbContext _context;
    private readonly ILogger<ForecastImportExportController> _logger;

    public ForecastImportExportController(MySchedulingDbContext context, ILogger<ForecastImportExportController> logger)
    {
        _context = context;
        _logger = logger;
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    // ==================== EXPORT ENDPOINTS ====================

    [HttpGet("export/csv")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? versionId = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var forecasts = await GetForecastsForExport(tenantId, versionId, projectId, year, month);

        var csv = new StringBuilder();
        csv.AppendLine("ProjectName,WbsCode,PositionTitle,AssigneeName,AssigneeType,LaborCategory,Year,Month,ForecastedHours,Status,Notes");

        foreach (var f in forecasts)
        {
            var assigneeType = f.ProjectRoleAssignment.User != null ? "Employee"
                : f.ProjectRoleAssignment.Subcontractor != null ? "Subcontractor"
                : "TBD";

            csv.AppendLine($"\"{EscapeCsv(f.ProjectRoleAssignment.Project?.Name ?? "")}\",\"{EscapeCsv(f.ProjectRoleAssignment.WbsElement?.Code ?? "")}\",\"{EscapeCsv(f.ProjectRoleAssignment.PositionTitle)}\",\"{EscapeCsv(f.ProjectRoleAssignment.AssigneeName)}\",\"{assigneeType}\",\"{EscapeCsv(f.ProjectRoleAssignment.LaborCategory?.Code ?? "")}\",{f.Year},{f.Month},{f.ForecastedHours},\"{f.Status}\",\"{EscapeCsv(f.Notes ?? "")}\"");
        }

        var content = csv.ToString();
        var bytes = Encoding.UTF8.GetBytes(content);
        var fileHash = ComputeHash(bytes);
        var fileName = GenerateFileName("Forecasts", "csv", projectId, year, month);

        // Track export
        await TrackOperation(tenantId, ForecastImportExportType.Export, versionId, projectId, year, month,
            fileName, "csv", bytes.Length, fileHash, ForecastImportExportStatus.Completed, forecasts.Count, forecasts.Count, 0);

        _logger.LogInformation("CSV export: {Count} forecasts exported by {UserId}", forecasts.Count, GetCurrentUserId());

        return File(bytes, "text/csv", fileName);
    }

    [HttpGet("export/excel")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? versionId = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var forecasts = await GetForecastsForExport(tenantId, versionId, projectId, year, month);

        using var package = new ExcelPackage();
        var worksheet = package.Workbook.Worksheets.Add("Forecasts");

        // Header row
        var headers = new[] { "ProjectName", "WbsCode", "PositionTitle", "AssigneeName", "AssigneeType", "LaborCategory", "Year", "Month", "ForecastedHours", "Status", "Notes", "ProjectRoleAssignmentId" };
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
            worksheet.Cells[1, i + 1].Style.Font.Bold = true;
        }

        // Data rows
        var row = 2;
        foreach (var f in forecasts)
        {
            var assigneeType = f.ProjectRoleAssignment.User != null ? "Employee"
                : f.ProjectRoleAssignment.Subcontractor != null ? "Subcontractor"
                : "TBD";

            worksheet.Cells[row, 1].Value = f.ProjectRoleAssignment.Project?.Name ?? "";
            worksheet.Cells[row, 2].Value = f.ProjectRoleAssignment.WbsElement?.Code ?? "";
            worksheet.Cells[row, 3].Value = f.ProjectRoleAssignment.PositionTitle;
            worksheet.Cells[row, 4].Value = f.ProjectRoleAssignment.AssigneeName;
            worksheet.Cells[row, 5].Value = assigneeType;
            worksheet.Cells[row, 6].Value = f.ProjectRoleAssignment.LaborCategory?.Code ?? "";
            worksheet.Cells[row, 7].Value = f.Year;
            worksheet.Cells[row, 8].Value = f.Month;
            worksheet.Cells[row, 9].Value = (double)f.ForecastedHours;
            worksheet.Cells[row, 10].Value = f.Status.ToString();
            worksheet.Cells[row, 11].Value = f.Notes ?? "";
            worksheet.Cells[row, 12].Value = f.ProjectRoleAssignmentId.ToString();
            row++;
        }

        worksheet.Cells.AutoFitColumns();

        var bytes = package.GetAsByteArray();
        var fileHash = ComputeHash(bytes);
        var fileName = GenerateFileName("Forecasts", "xlsx", projectId, year, month);

        // Track export
        await TrackOperation(tenantId, ForecastImportExportType.Export, versionId, projectId, year, month,
            fileName, "xlsx", bytes.Length, fileHash, ForecastImportExportStatus.Completed, forecasts.Count, forecasts.Count, 0);

        _logger.LogInformation("Excel export: {Count} forecasts exported by {UserId}", forecasts.Count, GetCurrentUserId());

        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("export/template")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<IActionResult> ExportTemplate([FromQuery] Guid tenantId, [FromQuery] Guid? projectId = null)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        using var package = new ExcelPackage();

        // Main import sheet
        var worksheet = package.Workbook.Worksheets.Add("Forecast Import");
        var headers = new[] { "ProjectRoleAssignmentId", "Year", "Month", "ForecastedHours", "Notes" };
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
            worksheet.Cells[1, i + 1].Style.Font.Bold = true;
        }
        worksheet.Cells.AutoFitColumns();

        // Reference data sheet - Assignments
        var assignmentsSheet = package.Workbook.Worksheets.Add("Assignments Reference");
        var assignmentHeaders = new[] { "ProjectRoleAssignmentId", "ProjectName", "WbsCode", "PositionTitle", "AssigneeName", "AssigneeType", "LaborCategory" };
        for (int i = 0; i < assignmentHeaders.Length; i++)
        {
            assignmentsSheet.Cells[1, i + 1].Value = assignmentHeaders[i];
            assignmentsSheet.Cells[1, i + 1].Style.Font.Bold = true;
        }

        // Populate assignments for reference
        var assignmentsQuery = _context.ProjectRoleAssignments
            .Include(a => a.Project)
            .Include(a => a.WbsElement)
            .Include(a => a.User)
            .Include(a => a.Subcontractor)
            .Include(a => a.LaborCategory)
            .Where(a => a.TenantId == tenantId && a.Status == ProjectRoleAssignmentStatus.Active);

        if (projectId.HasValue)
        {
            assignmentsQuery = assignmentsQuery.Where(a => a.ProjectId == projectId.Value);
        }

        var assignments = await assignmentsQuery.OrderBy(a => a.Project.Name).ThenBy(a => a.PositionTitle).ToListAsync();
        var row = 2;
        foreach (var a in assignments)
        {
            var assigneeType = a.User != null ? "Employee" : a.Subcontractor != null ? "Subcontractor" : "TBD";
            assignmentsSheet.Cells[row, 1].Value = a.Id.ToString();
            assignmentsSheet.Cells[row, 2].Value = a.Project?.Name ?? "";
            assignmentsSheet.Cells[row, 3].Value = a.WbsElement?.Code ?? "";
            assignmentsSheet.Cells[row, 4].Value = a.PositionTitle;
            assignmentsSheet.Cells[row, 5].Value = a.AssigneeName;
            assignmentsSheet.Cells[row, 6].Value = assigneeType;
            assignmentsSheet.Cells[row, 7].Value = a.LaborCategory?.Code ?? "";
            row++;
        }
        assignmentsSheet.Cells.AutoFitColumns();

        var bytes = package.GetAsByteArray();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "ForecastImportTemplate.xlsx");
    }

    // ==================== IMPORT ENDPOINTS ====================

    [HttpPost("import/preview")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Create)]
    public async Task<ActionResult<ImportPreviewResponse>> ImportPreview([FromForm] ImportRequest request)
    {
        if (!HasAccessToTenant(request.TenantId))
        {
            return Forbid();
        }

        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest("No file uploaded.");
        }

        var extension = Path.GetExtension(request.File.FileName).ToLowerInvariant();
        if (extension != ".csv" && extension != ".xlsx")
        {
            return BadRequest("Only CSV and Excel files are supported.");
        }

        try
        {
            using var stream = request.File.OpenReadStream();
            var items = extension == ".csv"
                ? await ParseCsvImport(stream)
                : await ParseExcelImport(stream);

            var validationResults = await ValidateImportItems(request.TenantId, request.VersionId, items);

            var fileBytes = await GetFileBytes(request.File);
            var fileHash = ComputeHash(fileBytes);

            // Check for duplicate import
            var existingImport = await _context.ForecastImportExports
                .Where(e => e.TenantId == request.TenantId && e.FileHash == fileHash && e.Type == ForecastImportExportType.Import)
                .OrderByDescending(e => e.OperationAt)
                .FirstOrDefaultAsync();

            return Ok(new ImportPreviewResponse
            {
                TotalRows = items.Count,
                ValidRows = validationResults.Count(r => r.IsValid),
                InvalidRows = validationResults.Count(r => !r.IsValid),
                Items = validationResults.Take(100).ToList(), // Limit preview to 100 items
                FileHash = fileHash,
                IsDuplicateImport = existingImport != null,
                PreviousImportDate = existingImport?.OperationAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing import file");
            return BadRequest($"Error parsing file: {ex.Message}");
        }
    }

    [HttpPost("import/commit")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Create)]
    public async Task<ActionResult<ImportCommitResponse>> ImportCommit([FromForm] ImportCommitRequest request)
    {
        if (!HasAccessToTenant(request.TenantId))
        {
            return Forbid();
        }

        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest("No file uploaded.");
        }

        var extension = Path.GetExtension(request.File.FileName).ToLowerInvariant();
        if (extension != ".csv" && extension != ".xlsx")
        {
            return BadRequest("Only CSV and Excel files are supported.");
        }

        try
        {
            using var stream = request.File.OpenReadStream();
            var items = extension == ".csv"
                ? await ParseCsvImport(stream)
                : await ParseExcelImport(stream);

            var validationResults = await ValidateImportItems(request.TenantId, request.VersionId, items);
            var validItems = validationResults.Where(r => r.IsValid).ToList();

            if (validItems.Count == 0)
            {
                return BadRequest("No valid items to import.");
            }

            // Determine version to use
            var versionId = request.VersionId;
            ForecastVersion? version = null;

            if (request.CreateNewVersion)
            {
                // Create a new Import-type version
                version = new ForecastVersion
                {
                    Id = Guid.NewGuid(),
                    TenantId = request.TenantId,
                    Name = request.NewVersionName ?? $"Import {DateTime.UtcNow:yyyy-MM-dd HH:mm}",
                    Description = request.NewVersionDescription ?? $"Imported from {request.File.FileName}",
                    Type = ForecastVersionType.Import,
                    IsCurrent = false,
                    VersionNumber = 1,
                    StartYear = validItems.Min(i => i.Year),
                    StartMonth = validItems.Where(i => i.Year == validItems.Min(x => x.Year)).Min(i => i.Month),
                    EndYear = validItems.Max(i => i.Year),
                    EndMonth = validItems.Where(i => i.Year == validItems.Max(x => x.Year)).Max(i => i.Month),
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = GetCurrentUserId()
                };
                _context.ForecastVersions.Add(version);
                versionId = version.Id;
            }
            else if (versionId == null)
            {
                // Use or create current version
                version = await _context.ForecastVersions
                    .FirstOrDefaultAsync(v =>
                        v.TenantId == request.TenantId &&
                        v.IsCurrent &&
                        v.Type == ForecastVersionType.Current &&
                        v.ProjectId == null);

                if (version == null)
                {
                    version = new ForecastVersion
                    {
                        Id = Guid.NewGuid(),
                        TenantId = request.TenantId,
                        Name = "Current",
                        Description = "Primary forecast version",
                        Type = ForecastVersionType.Current,
                        IsCurrent = true,
                        VersionNumber = 1,
                        StartYear = DateTime.UtcNow.Year,
                        StartMonth = DateTime.UtcNow.Month,
                        EndYear = DateTime.UtcNow.Year + 1,
                        EndMonth = 12,
                        CreatedAt = DateTime.UtcNow,
                        CreatedByUserId = GetCurrentUserId()
                    };
                    _context.ForecastVersions.Add(version);
                }
                versionId = version.Id;
            }

            var createdCount = 0;
            var updatedCount = 0;
            var skippedCount = 0;

            foreach (var item in validItems)
            {
                var existing = await _context.Forecasts
                    .FirstOrDefaultAsync(f =>
                        f.ProjectRoleAssignmentId == item.ProjectRoleAssignmentId &&
                        f.ForecastVersionId == versionId &&
                        f.Year == item.Year &&
                        f.Month == item.Month &&
                        !f.IsDeleted);

                if (existing != null)
                {
                    if (request.UpdateExisting)
                    {
                        existing.ForecastedHours = item.ForecastedHours;
                        existing.Notes = item.Notes ?? existing.Notes;
                        existing.UpdatedAt = DateTime.UtcNow;
                        existing.UpdatedByUserId = GetCurrentUserId();

                        _context.ForecastHistories.Add(new ForecastHistory
                        {
                            Id = Guid.NewGuid(),
                            ForecastId = existing.Id,
                            ChangedByUserId = GetCurrentUserId(),
                            ChangedAt = DateTime.UtcNow,
                            ChangeType = ForecastChangeType.HoursUpdated,
                            OldHours = existing.ForecastedHours,
                            NewHours = item.ForecastedHours,
                            ChangeReason = "Updated via import"
                        });

                        updatedCount++;
                    }
                    else
                    {
                        skippedCount++;
                    }
                }
                else
                {
                    var forecast = new Forecast
                    {
                        Id = Guid.NewGuid(),
                        TenantId = request.TenantId,
                        ProjectRoleAssignmentId = item.ProjectRoleAssignmentId,
                        ForecastVersionId = versionId!.Value,
                        Year = item.Year,
                        Month = item.Month,
                        ForecastedHours = item.ForecastedHours,
                        Status = ForecastStatus.Draft,
                        Notes = item.Notes,
                        CreatedAt = DateTime.UtcNow,
                        CreatedByUserId = GetCurrentUserId()
                    };

                    _context.Forecasts.Add(forecast);

                    _context.ForecastHistories.Add(new ForecastHistory
                    {
                        Id = Guid.NewGuid(),
                        ForecastId = forecast.Id,
                        ChangedByUserId = GetCurrentUserId(),
                        ChangedAt = DateTime.UtcNow,
                        ChangeType = ForecastChangeType.Created,
                        NewHours = item.ForecastedHours,
                        NewStatus = ForecastStatus.Draft,
                        ChangeReason = "Created via import"
                    });

                    createdCount++;
                }
            }

            await _context.SaveChangesAsync();

            var fileBytes = await GetFileBytes(request.File);
            var fileHash = ComputeHash(fileBytes);
            var failedCount = validationResults.Count(r => !r.IsValid);

            // Track import operation
            await TrackOperation(
                request.TenantId,
                request.UpdateExisting ? ForecastImportExportType.ImportUpdate : ForecastImportExportType.Import,
                versionId,
                null,
                null,
                null,
                request.File.FileName,
                extension.TrimStart('.'),
                fileBytes.Length,
                fileHash,
                failedCount > 0 ? ForecastImportExportStatus.CompletedWithErrors : ForecastImportExportStatus.Completed,
                items.Count,
                createdCount + updatedCount,
                failedCount,
                versionId
            );

            _logger.LogInformation("Import committed: {Created} created, {Updated} updated, {Skipped} skipped, {Failed} failed by {UserId}",
                createdCount, updatedCount, skippedCount, failedCount, GetCurrentUserId());

            return Ok(new ImportCommitResponse
            {
                TotalRows = items.Count,
                CreatedCount = createdCount,
                UpdatedCount = updatedCount,
                SkippedCount = skippedCount,
                FailedCount = failedCount,
                VersionId = versionId,
                VersionName = version?.Name ?? (await _context.ForecastVersions.FindAsync(versionId))?.Name
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during import commit");
            return BadRequest($"Error during import: {ex.Message}");
        }
    }

    // ==================== HISTORY ENDPOINTS ====================

    [HttpGet("history")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<ActionResult<IEnumerable<ImportExportHistoryResponse>>> GetHistory(
        [FromQuery] Guid tenantId,
        [FromQuery] int limit = 50)
    {
        if (!HasAccessToTenant(tenantId))
        {
            return Forbid();
        }

        var history = await _context.ForecastImportExports
            .Include(e => e.OperationByUser)
            .Include(e => e.Project)
            .Include(e => e.ForecastVersion)
            .Where(e => e.TenantId == tenantId)
            .OrderByDescending(e => e.OperationAt)
            .Take(limit)
            .AsNoTracking()
            .ToListAsync();

        return Ok(history.Select(h => new ImportExportHistoryResponse
        {
            Id = h.Id,
            Type = h.Type,
            TypeName = h.Type.ToString(),
            OperationAt = h.OperationAt,
            OperationByUserName = h.OperationByUser?.DisplayName ?? "Unknown",
            ProjectId = h.ProjectId,
            ProjectName = h.Project?.Name,
            VersionId = h.ForecastVersionId,
            VersionName = h.ForecastVersion?.Name,
            Year = h.Year,
            Month = h.Month,
            FileName = h.FileName,
            FileFormat = h.FileFormat,
            FileSizeBytes = h.FileSizeBytes,
            FileHash = h.FileHash,
            Status = h.Status,
            StatusName = h.Status.ToString(),
            RecordsProcessed = h.RecordsProcessed,
            RecordsSucceeded = h.RecordsSucceeded,
            RecordsFailed = h.RecordsFailed,
            ErrorDetails = h.ErrorDetails
        }));
    }

    [HttpGet("history/{id}/download")]
    [RequiresPermission(Resource = "Forecast", Action = PermissionAction.Read)]
    public async Task<IActionResult> ReDownload(Guid id)
    {
        var record = await _context.ForecastImportExports.FindAsync(id);
        if (record == null)
        {
            return NotFound();
        }

        if (!HasAccessToTenant(record.TenantId))
        {
            return Forbid();
        }

        if (record.Type != ForecastImportExportType.Export)
        {
            return BadRequest("Can only re-download export files.");
        }

        // Re-generate export with same parameters
        return record.FileFormat.ToLowerInvariant() switch
        {
            "csv" => await ExportCsv(record.TenantId, record.ForecastVersionId, record.ProjectId, record.Year, record.Month),
            "xlsx" => await ExportExcel(record.TenantId, record.ForecastVersionId, record.ProjectId, record.Year, record.Month),
            _ => BadRequest("Unknown file format")
        };
    }

    // ==================== HELPER METHODS ====================

    private async Task<List<Forecast>> GetForecastsForExport(Guid tenantId, Guid? versionId, Guid? projectId, int? year, int? month)
    {
        var query = _context.Forecasts
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Project)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.WbsElement)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.User)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.Subcontractor)
            .Include(f => f.ProjectRoleAssignment)
                .ThenInclude(a => a.LaborCategory)
            .Where(f => f.TenantId == tenantId && !f.IsDeleted);

        if (versionId.HasValue)
        {
            query = query.Where(f => f.ForecastVersionId == versionId.Value);
        }
        else
        {
            query = query.Where(f => f.ForecastVersion.IsCurrent && f.ForecastVersion.Type == ForecastVersionType.Current);
        }

        if (projectId.HasValue)
        {
            query = query.Where(f => f.ProjectRoleAssignment.ProjectId == projectId.Value);
        }

        if (year.HasValue)
        {
            query = query.Where(f => f.Year == year.Value);
        }

        if (month.HasValue)
        {
            query = query.Where(f => f.Month == month.Value);
        }

        return await query
            .OrderBy(f => f.ProjectRoleAssignment.Project.Name)
            .ThenBy(f => f.Year)
            .ThenBy(f => f.Month)
            .ThenBy(f => f.ProjectRoleAssignment.PositionTitle)
            .AsNoTracking()
            .ToListAsync();
    }

    private async Task<List<ImportItem>> ParseCsvImport(Stream stream)
    {
        var items = new List<ImportItem>();
        using var reader = new StreamReader(stream);

        // Skip header
        await reader.ReadLineAsync();

        string? line;
        var rowNum = 2;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            var parts = ParseCsvLine(line);
            if (parts.Length >= 4)
            {
                items.Add(new ImportItem
                {
                    RowNumber = rowNum,
                    ProjectRoleAssignmentIdString = parts[0].Trim(),
                    YearString = parts[1].Trim(),
                    MonthString = parts[2].Trim(),
                    HoursString = parts[3].Trim(),
                    Notes = parts.Length > 4 ? parts[4].Trim() : null
                });
            }
            rowNum++;
        }

        return items;
    }

    private async Task<List<ImportItem>> ParseExcelImport(Stream stream)
    {
        var items = new List<ImportItem>();
        using var package = new ExcelPackage(stream);
        var worksheet = package.Workbook.Worksheets.FirstOrDefault();

        if (worksheet == null)
        {
            return items;
        }

        var rowCount = worksheet.Dimension?.Rows ?? 0;
        for (int row = 2; row <= rowCount; row++)
        {
            var assignmentId = worksheet.Cells[row, 1].Value?.ToString();
            if (string.IsNullOrWhiteSpace(assignmentId)) continue;

            items.Add(new ImportItem
            {
                RowNumber = row,
                ProjectRoleAssignmentIdString = assignmentId.Trim(),
                YearString = worksheet.Cells[row, 2].Value?.ToString()?.Trim() ?? "",
                MonthString = worksheet.Cells[row, 3].Value?.ToString()?.Trim() ?? "",
                HoursString = worksheet.Cells[row, 4].Value?.ToString()?.Trim() ?? "",
                Notes = worksheet.Cells[row, 5].Value?.ToString()?.Trim()
            });
        }

        return await Task.FromResult(items);
    }

    private async Task<List<ImportValidationResult>> ValidateImportItems(Guid tenantId, Guid? versionId, List<ImportItem> items)
    {
        var results = new List<ImportValidationResult>();

        // Pre-load valid assignment IDs
        var validAssignmentIds = await _context.ProjectRoleAssignments
            .Where(a => a.TenantId == tenantId)
            .Select(a => a.Id)
            .ToListAsync();

        foreach (var item in items)
        {
            var errors = new List<string>();

            // Validate Assignment ID
            if (!Guid.TryParse(item.ProjectRoleAssignmentIdString, out var assignmentId))
            {
                errors.Add("Invalid ProjectRoleAssignmentId format");
            }
            else if (!validAssignmentIds.Contains(assignmentId))
            {
                errors.Add("ProjectRoleAssignment not found");
            }
            else
            {
                item.ProjectRoleAssignmentId = assignmentId;
            }

            // Validate Year
            if (!int.TryParse(item.YearString, out var year) || year < 2000 || year > 2100)
            {
                errors.Add("Invalid Year (must be between 2000 and 2100)");
            }
            else
            {
                item.Year = year;
            }

            // Validate Month
            if (!int.TryParse(item.MonthString, out var month) || month < 1 || month > 12)
            {
                errors.Add("Invalid Month (must be between 1 and 12)");
            }
            else
            {
                item.Month = month;
            }

            // Validate Hours
            if (!decimal.TryParse(item.HoursString, out var hours) || hours < 0 || hours > 744)
            {
                errors.Add("Invalid ForecastedHours (must be between 0 and 744)");
            }
            else
            {
                item.ForecastedHours = hours;
            }

            results.Add(new ImportValidationResult
            {
                RowNumber = item.RowNumber,
                ProjectRoleAssignmentId = item.ProjectRoleAssignmentId,
                Year = item.Year,
                Month = item.Month,
                ForecastedHours = item.ForecastedHours,
                Notes = item.Notes,
                IsValid = errors.Count == 0,
                Errors = errors
            });
        }

        return results;
    }

    private async Task TrackOperation(
        Guid tenantId,
        ForecastImportExportType type,
        Guid? versionId,
        Guid? projectId,
        int? year,
        int? month,
        string fileName,
        string fileFormat,
        long fileSize,
        string fileHash,
        ForecastImportExportStatus status,
        int recordsProcessed,
        int recordsSucceeded,
        int recordsFailed,
        Guid? resultingVersionId = null)
    {
        var record = new ForecastImportExport
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Type = type,
            OperationAt = DateTime.UtcNow,
            OperationByUserId = GetCurrentUserId(),
            ForecastVersionId = versionId,
            ProjectId = projectId,
            Year = year,
            Month = month,
            FileName = fileName,
            FileFormat = fileFormat,
            FileSizeBytes = fileSize,
            FileHash = fileHash,
            Status = status,
            RecordsProcessed = recordsProcessed,
            RecordsSucceeded = recordsSucceeded,
            RecordsFailed = recordsFailed,
            ResultingVersionId = resultingVersionId,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = GetCurrentUserId()
        };

        _context.ForecastImportExports.Add(record);
        await _context.SaveChangesAsync();
    }

    private static string EscapeCsv(string value)
    {
        return value.Replace("\"", "\"\"");
    }

    private static string[] ParseCsvLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }
        result.Add(current.ToString());

        return result.ToArray();
    }

    private static string ComputeHash(byte[] data)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(data);
        return Convert.ToBase64String(hash);
    }

    private static string GenerateFileName(string prefix, string extension, Guid? projectId, int? year, int? month)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        var parts = new List<string> { prefix };

        if (projectId.HasValue)
        {
            parts.Add($"proj-{projectId.Value.ToString()[..8]}");
        }

        if (year.HasValue)
        {
            parts.Add(year.Value.ToString());
        }

        if (month.HasValue)
        {
            parts.Add($"M{month.Value:D2}");
        }

        parts.Add(timestamp);
        return $"{string.Join("_", parts)}.{extension}";
    }

    private static async Task<byte[]> GetFileBytes(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        return ms.ToArray();
    }
}

// ==================== DTOs ====================

public class ImportRequest
{
    public Guid TenantId { get; set; }
    public Guid? VersionId { get; set; }
    public IFormFile? File { get; set; }
}

public class ImportCommitRequest
{
    public Guid TenantId { get; set; }
    public Guid? VersionId { get; set; }
    public bool UpdateExisting { get; set; } = true;
    public bool CreateNewVersion { get; set; } = false;
    public string? NewVersionName { get; set; }
    public string? NewVersionDescription { get; set; }
    public IFormFile? File { get; set; }
}

public class ImportItem
{
    public int RowNumber { get; set; }
    public string ProjectRoleAssignmentIdString { get; set; } = string.Empty;
    public string YearString { get; set; } = string.Empty;
    public string MonthString { get; set; } = string.Empty;
    public string HoursString { get; set; } = string.Empty;
    public string? Notes { get; set; }

    // Parsed values
    public Guid ProjectRoleAssignmentId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal ForecastedHours { get; set; }
}

public class ImportValidationResult
{
    public int RowNumber { get; set; }
    public Guid ProjectRoleAssignmentId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal ForecastedHours { get; set; }
    public string? Notes { get; set; }
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class ImportPreviewResponse
{
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
    public List<ImportValidationResult> Items { get; set; } = new();
    public string FileHash { get; set; } = string.Empty;
    public bool IsDuplicateImport { get; set; }
    public DateTime? PreviousImportDate { get; set; }
}

public class ImportCommitResponse
{
    public int TotalRows { get; set; }
    public int CreatedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int SkippedCount { get; set; }
    public int FailedCount { get; set; }
    public Guid? VersionId { get; set; }
    public string? VersionName { get; set; }
}

public class ImportExportHistoryResponse
{
    public Guid Id { get; set; }
    public ForecastImportExportType Type { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public DateTime OperationAt { get; set; }
    public string OperationByUserName { get; set; } = string.Empty;
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public Guid? VersionId { get; set; }
    public string? VersionName { get; set; }
    public int? Year { get; set; }
    public int? Month { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileFormat { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? FileHash { get; set; }
    public ForecastImportExportStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public int RecordsProcessed { get; set; }
    public int RecordsSucceeded { get; set; }
    public int RecordsFailed { get; set; }
    public string? ErrorDetails { get; set; }
}
