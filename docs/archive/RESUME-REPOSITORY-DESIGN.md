# Resume Repository System Design

## Overview
This document outlines the comprehensive design for a Resume Repository system that enables:
1. **Structured Resume Storage** - Database-backed resume data (LinkedIn-style view)
2. **LinkedIn Integration** - Import public LinkedIn profiles as starting point
3. **AI-Assisted Resume Management** - Help users update and improve resumes
4. **Search Framework** - Advanced search and filtering capabilities
5. **Approval Workflow** - Manager review and approval process
6. **Word Export** - Export resumes to Word format
7. **File Storage Framework** - SharePoint-based document storage (app-wide)

---

## 1. System Architecture

### 1.1 Architecture Layers
Following the existing clean architecture pattern:

```
MyScheduling.Core/
├── Entities/
│   ├── ResumeProfile.cs (EXISTING - enhance)
│   ├── ResumeVersion.cs (NEW)
│   ├── ResumeDocument.cs (NEW)
│   ├── ResumeApproval.cs (NEW)
│   ├── ResumeTemplate.cs (NEW)
│   ├── LinkedInImport.cs (NEW)
│   └── FileStorage/ (NEW)
│       ├── StoredFile.cs
│       └── FileStorageProvider.cs
├── Interfaces/ (NEW)
│   ├── IFileStorageService.cs
│   ├── ILinkedInService.cs
│   ├── IAIResumeService.cs
│   ├── IResumeSearchService.cs
│   └── IDocumentExportService.cs
└── Enums/
    ├── ResumeStatus.cs (NEW)
    └── FileStorageProvider.cs (NEW)

MyScheduling.Infrastructure/
├── Services/ (NEW)
│   ├── SharePointFileStorageService.cs
│   ├── LinkedInImportService.cs
│   ├── OpenAIResumeService.cs
│   ├── ResumeSearchService.cs
│   └── WordExportService.cs
├── Repositories/ (NEW)
│   └── ResumeRepository.cs
└── Data/
    └── MySchedulingDbContext.cs (UPDATE)

MyScheduling.Api/
├── Controllers/
│   ├── ResumesController.cs (NEW)
│   ├── ResumeApprovalsController.cs (NEW)
│   ├── FileStorageController.cs (NEW)
│   └── AdminController.cs (UPDATE - add SharePoint config)
└── DTOs/ (NEW)
    ├── ResumeDto.cs
    ├── LinkedInImportRequest.cs
    ├── AIResumeAssistRequest.cs
    └── ResumeExportRequest.cs
```

---

## 2. Enhanced Data Model

### 2.1 Resume Entities (Enhanced)

#### ResumeProfile (EXISTING - enhance)
```csharp
public class ResumeProfile : BaseEntity
{
    public Guid PersonId { get; set; }
    public string? TemplateConfig { get; set; } // JSON for template metadata

    // NEW FIELDS
    public ResumeStatus Status { get; set; } = ResumeStatus.Draft;
    public Guid? CurrentVersionId { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public Guid? LastReviewedByUserId { get; set; }
    public bool IsPublic { get; set; } = false;
    public string? LinkedInProfileUrl { get; set; }
    public DateTime? LinkedInLastSyncedAt { get; set; }

    // Navigation properties
    public virtual Person Person { get; set; } = null!;
    public virtual ICollection<ResumeSection> Sections { get; set; } = new List<ResumeSection>();
    public virtual ICollection<ResumeVersion> Versions { get; set; } = new List<ResumeVersion>();
    public virtual ICollection<ResumeDocument> Documents { get; set; } = new List<ResumeDocument>();
    public virtual ICollection<ResumeApproval> Approvals { get; set; } = new List<ResumeApproval>();
    public virtual ResumeVersion? CurrentVersion { get; set; }
    public virtual User? LastReviewedBy { get; set; }
}

public enum ResumeStatus
{
    Draft,              // Work in progress
    PendingReview,      // Submitted for manager review
    Approved,           // Approved by manager
    ChangesRequested,   // Manager requested changes
    Active,             // Active and available for use
    Archived            // Archived/historical
}
```

#### ResumeVersion (NEW)
```csharp
public class ResumeVersion : BaseEntity
{
    public Guid ResumeProfileId { get; set; }
    public int VersionNumber { get; set; }
    public string VersionName { get; set; } = string.Empty; // e.g., "Federal Proposal", "Commercial"
    public string? Description { get; set; }
    public string? ContentSnapshot { get; set; } // JSON snapshot of all sections/entries
    public Guid CreatedByUserId { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual User CreatedBy { get; set; } = null!;
    public virtual ICollection<ResumeDocument> GeneratedDocuments { get; set; } = new List<ResumeDocument>();
}
```

#### ResumeDocument (NEW)
```csharp
public class ResumeDocument : BaseEntity
{
    public Guid ResumeProfileId { get; set; }
    public Guid? ResumeVersionId { get; set; }
    public Guid StoredFileId { get; set; }
    public string DocumentType { get; set; } = string.Empty; // "Word", "PDF", "LinkedIn"
    public string? TemplateName { get; set; }
    public DateTime GeneratedAt { get; set; }
    public Guid GeneratedByUserId { get; set; }

    // Navigation properties
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual ResumeVersion? ResumeVersion { get; set; }
    public virtual StoredFile StoredFile { get; set; } = null!;
    public virtual User GeneratedBy { get; set; } = null!;
}
```

#### ResumeApproval (NEW)
```csharp
public class ResumeApproval : BaseEntity
{
    public Guid ResumeProfileId { get; set; }
    public Guid? ResumeVersionId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public ApprovalStatus Status { get; set; } = ApprovalStatus.Pending;
    public string? ReviewNotes { get; set; }
    public string? RequestNotes { get; set; }

    // Navigation properties
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual ResumeVersion? ResumeVersion { get; set; }
    public virtual User RequestedBy { get; set; } = null!;
    public virtual User? ReviewedBy { get; set; }
}

public enum ApprovalStatus
{
    Pending,
    Approved,
    Rejected,
    ChangesRequested,
    Cancelled
}
```

#### ResumeTemplate (NEW)
```csharp
public class ResumeTemplate : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ResumeTemplateType Type { get; set; }
    public string TemplateContent { get; set; } = string.Empty; // Word template or config
    public Guid? StoredFileId { get; set; } // Reference to template file
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual StoredFile? StoredFile { get; set; }
}

public enum ResumeTemplateType
{
    Federal,            // Federal government proposals
    Commercial,         // Commercial resumes
    Executive,          // Executive bios
    Technical,          // Technical detail focus
    Academic,           // Academic/research focus
    Custom              // Custom template
}
```

#### LinkedInImport (NEW)
```csharp
public class LinkedInImport : BaseEntity
{
    public Guid PersonId { get; set; }
    public Guid ResumeProfileId { get; set; }
    public string LinkedInProfileUrl { get; set; } = string.Empty;
    public DateTime ImportedAt { get; set; }
    public Guid ImportedByUserId { get; set; }
    public string? RawData { get; set; } // JSON of imported data
    public ImportStatus Status { get; set; }
    public string? ErrorMessage { get; set; }
    public int ItemsImported { get; set; }

    // Navigation properties
    public virtual Person Person { get; set; } = null!;
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual User ImportedBy { get; set; } = null!;
}

public enum ImportStatus
{
    Pending,
    InProgress,
    Completed,
    PartialSuccess,
    Failed
}
```

### 2.2 File Storage Entities (NEW - App-Wide Framework)

#### StoredFile (NEW)
```csharp
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
```

#### FileAccessLog (NEW)
```csharp
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

public enum FileAccessType
{
    View,
    Download,
    Upload,
    Update,
    Delete
}
```

#### SharePointConfiguration (NEW)
```csharp
public class SharePointConfiguration : TenantEntity
{
    public string SiteUrl { get; set; } = string.Empty;
    public string SiteId { get; set; } = string.Empty;
    public string DriveId { get; set; } = string.Empty;
    public string DriveName { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty; // Encrypted
    public string TenantIdMicrosoft { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? LastSyncedAt { get; set; }
    public string? FolderStructure { get; set; } // JSON mapping entity types to folders
}
```

---

## 3. Service Interfaces

### 3.1 IFileStorageService (NEW)
```csharp
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
    Task LogAccessAsync(Guid fileId, Guid userId, FileAccessType accessType);
}
```

### 3.2 ILinkedInService (NEW)
```csharp
public interface ILinkedInService
{
    // Import from LinkedIn
    Task<LinkedInImport> ImportFromLinkedInAsync(
        string linkedInUrl,
        Guid personId,
        Guid userId);

    // Parse LinkedIn data
    Task<LinkedInProfile> ParseLinkedInProfileAsync(string linkedInUrl);

    // Map to resume structure
    Task<ResumeProfile> MapLinkedInToResumeAsync(
        LinkedInProfile linkedInProfile,
        Guid personId);

    // Sync updates
    Task<bool> SyncLinkedInUpdatesAsync(Guid resumeProfileId);

    // Get import history
    Task<IEnumerable<LinkedInImport>> GetImportHistoryAsync(Guid personId);
}

public class LinkedInProfile
{
    public string FullName { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public List<LinkedInExperience> Experience { get; set; } = new();
    public List<LinkedInEducation> Education { get; set; } = new();
    public List<string> Skills { get; set; } = new();
    public List<LinkedInCertification> Certifications { get; set; } = new();
    public List<LinkedInPublication> Publications { get; set; } = new();
}
```

### 3.3 IAIResumeService (NEW)
```csharp
public interface IAIResumeService
{
    // AI-assisted resume improvement
    Task<string> SuggestSummaryAsync(ResumeProfile resume);

    Task<string> EnhanceDescriptionAsync(string originalDescription, string context);

    Task<List<string>> SuggestSkillsAsync(ResumeProfile resume);

    Task<string> OptimizeForJobDescriptionAsync(
        ResumeProfile resume,
        string jobDescription);

    Task<ResumeAnalysis> AnalyzeResumeAsync(ResumeProfile resume);

    Task<string> GenerateAchievementBulletsAsync(
        string jobTitle,
        string company,
        string description);

    // Gap analysis
    Task<List<SkillGap>> IdentifySkillGapsAsync(
        ResumeProfile resume,
        string targetJobDescription);
}

public class ResumeAnalysis
{
    public int OverallScore { get; set; } // 0-100
    public List<string> Strengths { get; set; } = new();
    public List<string> ImprovementAreas { get; set; } = new();
    public List<string> MissingKeywords { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public Dictionary<string, int> SectionScores { get; set; } = new();
}

public class SkillGap
{
    public string SkillName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int ImportanceLevel { get; set; } // 1-5
    public bool HasSkill { get; set; }
    public string? Recommendation { get; set; }
}
```

### 3.4 IResumeSearchService (NEW)
```csharp
public interface IResumeSearchService
{
    // Search resumes
    Task<PagedResult<ResumeProfile>> SearchResumesAsync(
        ResumeSearchCriteria criteria,
        Guid tenantId);

    // Find by skills
    Task<List<ResumeProfile>> FindBySkillsAsync(
        List<string> skills,
        Guid tenantId,
        ProficiencyLevel? minProficiency = null);

    // Find by certifications
    Task<List<ResumeProfile>> FindByCertificationsAsync(
        List<string> certifications,
        Guid tenantId);

    // Advanced search
    Task<List<ResumeProfile>> AdvancedSearchAsync(
        string query,
        Guid tenantId,
        Dictionary<string, object>? filters = null);

    // Recommendation engine
    Task<List<ResumeProfile>> RecommendCandidatesAsync(
        string jobDescription,
        Guid tenantId,
        int maxResults = 10);
}

public class ResumeSearchCriteria
{
    public string? SearchTerm { get; set; }
    public List<string>? Skills { get; set; }
    public List<string>? Certifications { get; set; }
    public int? MinYearsExperience { get; set; }
    public List<string>? Locations { get; set; }
    public ResumeStatus? Status { get; set; }
    public DateTime? LastUpdatedAfter { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
```

### 3.5 IDocumentExportService (NEW)
```csharp
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
```

---

## 4. API Endpoints

### 4.1 ResumesController

#### Core CRUD Operations
```
GET    /api/resumes                      # List all resumes (with filters)
GET    /api/resumes/{id}                 # Get resume details
POST   /api/resumes                      # Create new resume
PUT    /api/resumes/{id}                 # Update resume
DELETE /api/resumes/{id}                 # Delete resume
```

#### Sections & Entries
```
GET    /api/resumes/{id}/sections                    # Get all sections
POST   /api/resumes/{id}/sections                    # Add section
PUT    /api/resumes/{id}/sections/{sectionId}        # Update section
DELETE /api/resumes/{id}/sections/{sectionId}        # Delete section

POST   /api/resumes/{id}/sections/{sectionId}/entries     # Add entry
PUT    /api/resumes/{id}/entries/{entryId}                # Update entry
DELETE /api/resumes/{id}/entries/{entryId}                # Delete entry
```

#### LinkedIn Integration
```
POST   /api/resumes/{id}/import-linkedin            # Import from LinkedIn
GET    /api/resumes/{id}/linkedin-history           # Get import history
POST   /api/resumes/{id}/sync-linkedin              # Sync with LinkedIn
```

#### AI Assistance
```
POST   /api/resumes/{id}/ai/suggest-summary         # AI suggest summary
POST   /api/resumes/{id}/ai/enhance-description     # AI enhance description
POST   /api/resumes/{id}/ai/suggest-skills          # AI suggest skills
POST   /api/resumes/{id}/ai/analyze                 # AI analyze resume
POST   /api/resumes/{id}/ai/optimize                # AI optimize for job
POST   /api/resumes/{id}/ai/skill-gaps              # Identify skill gaps
```

#### Versions
```
GET    /api/resumes/{id}/versions                   # List versions
POST   /api/resumes/{id}/versions                   # Create version
GET    /api/resumes/{id}/versions/{versionId}       # Get version
PUT    /api/resumes/{id}/versions/{versionId}       # Update version
POST   /api/resumes/{id}/versions/{versionId}/activate  # Set as current
```

#### Export
```
POST   /api/resumes/{id}/export/word                # Export to Word
POST   /api/resumes/{id}/export/pdf                 # Export to PDF
GET    /api/resumes/{id}/export/json                # Export to JSON
POST   /api/resumes/export/batch                    # Batch export
```

#### Search
```
POST   /api/resumes/search                          # Advanced search
GET    /api/resumes/search/by-skills                # Search by skills
GET    /api/resumes/search/by-certifications        # Search by certifications
POST   /api/resumes/recommend                       # Recommend candidates
```

### 4.2 ResumeApprovalsController

```
GET    /api/resume-approvals                        # List approvals (manager queue)
GET    /api/resume-approvals/{id}                   # Get approval details
POST   /api/resume-approvals                        # Request approval
PUT    /api/resume-approvals/{id}/approve           # Approve resume
PUT    /api/resume-approvals/{id}/reject            # Reject resume
PUT    /api/resume-approvals/{id}/request-changes   # Request changes
GET    /api/resume-approvals/pending                # Get pending approvals
GET    /api/resume-approvals/my-requests            # Get my approval requests
```

### 4.3 FileStorageController

```
POST   /api/files/upload                            # Upload file
GET    /api/files/{id}/download                     # Download file
DELETE /api/files/{id}                              # Delete file
GET    /api/files/{id}                              # Get file metadata
GET    /api/files                                   # List files (with filters)
POST   /api/files/{id}/new-version                  # Upload new version
GET    /api/files/{id}/versions                     # Get file versions
GET    /api/files/{id}/access-logs                  # Get access logs
GET    /api/files/search                            # Search files
```

### 4.4 ResumeTemplatesController

```
GET    /api/resume-templates                        # List templates
GET    /api/resume-templates/{id}                   # Get template
POST   /api/resume-templates                        # Create template
PUT    /api/resume-templates/{id}                   # Update template
DELETE /api/resume-templates/{id}                   # Delete template
POST   /api/resume-templates/{id}/preview           # Preview template
```

### 4.5 Admin Endpoints (add to existing AdminController)

```
GET    /api/admin/sharepoint/config                 # Get SharePoint config
PUT    /api/admin/sharepoint/config                 # Update SharePoint config
POST   /api/admin/sharepoint/test-connection        # Test SharePoint connection
GET    /api/admin/file-storage/stats                # Get storage statistics
GET    /api/admin/resumes/stats                     # Get resume statistics
```

---

## 5. SharePoint Integration

### 5.1 Authentication
- Use **Microsoft Graph API** for SharePoint access
- Azure AD App Registration with permissions:
  - `Sites.ReadWrite.All`
  - `Files.ReadWrite.All`
- Store credentials securely in SharePointConfiguration (encrypted)

### 5.2 Folder Structure
```
SharePoint Site
└── Documents
    └── MyScheduling
        ├── Resumes
        │   ├── {PersonId}
        │   │   ├── Documents
        │   │   │   ├── Resume_v1.docx
        │   │   │   ├── Resume_v2.docx
        │   │   │   └── Resume_Federal.pdf
        │   │   └── Supporting
        │   │       ├── Certifications
        │   │       └── Publications
        ├── Templates
        │   ├── Federal_Template.docx
        │   ├── Commercial_Template.docx
        │   └── Executive_Template.docx
        └── Projects
            └── {ProjectId}
                └── Documents
```

### 5.3 Implementation Strategy
```csharp
public class SharePointFileStorageService : IFileStorageService
{
    private readonly IConfiguration _configuration;
    private readonly MySchedulingDbContext _context;
    private readonly GraphServiceClient _graphClient;

    public async Task<StoredFile> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string entityType,
        Guid entityId,
        Guid tenantId,
        Guid uploadedByUserId,
        string? category = null)
    {
        // 1. Get SharePoint config for tenant
        var spConfig = await GetSharePointConfigAsync(tenantId);

        // 2. Build folder path
        var folderPath = BuildFolderPath(entityType, entityId, category);

        // 3. Upload to SharePoint via Graph API
        var uploadedItem = await _graphClient.Sites[spConfig.SiteId]
            .Drives[spConfig.DriveId]
            .Root
            .ItemWithPath(folderPath + fileName)
            .Content
            .Request()
            .PutAsync<DriveItem>(fileStream);

        // 4. Create StoredFile record
        var storedFile = new StoredFile
        {
            FileName = fileName,
            OriginalFileName = fileName,
            ContentType = contentType,
            FileSizeBytes = fileStream.Length,
            StorageProvider = FileStorageProvider.SharePoint,
            StorageProviderId = uploadedItem.Id,
            StoragePath = uploadedItem.WebUrl,
            SharePointSiteId = spConfig.SiteId,
            SharePointDriveId = spConfig.DriveId,
            SharePointItemId = uploadedItem.Id,
            EntityType = entityType,
            EntityId = entityId,
            TenantId = tenantId,
            Category = category
        };

        _context.StoredFiles.Add(storedFile);
        await _context.SaveChangesAsync();

        return storedFile;
    }
}
```

---

## 6. LinkedIn Integration

### 6.1 LinkedIn API Options

**Option 1: Official LinkedIn API (Recommended for Production)**
- Requires LinkedIn Partner Program membership
- OAuth 2.0 authentication
- Access to profile data via API

**Option 2: LinkedIn Profile Scraper (Development/MVP)**
- Use open-source libraries (e.g., `linkedin-scraper`)
- Limited by LinkedIn rate limiting
- User provides profile URL

**Option 3: Manual Import (Immediate Solution)**
- User manually copies/pastes LinkedIn data
- AI-assisted parsing of pasted text
- No API dependency

### 6.2 Import Flow
```
User provides LinkedIn URL
    ↓
Fetch/Scrape LinkedIn profile data
    ↓
Parse sections (Experience, Education, Skills, etc.)
    ↓
Map to ResumeProfile structure
    ↓
Create ResumeSection and ResumeEntry records
    ↓
Extract skills and create PersonSkill records
    ↓
Log import in LinkedInImport table
    ↓
Present to user for review and editing
```

### 6.3 Data Mapping

| LinkedIn Section | Resume Entity |
|------------------|---------------|
| Headline | Person.JobTitle |
| Summary | ResumeSection (Summary type) |
| Experience | ResumeSection (Experience type) → ResumeEntry |
| Education | ResumeSection (Education type) → ResumeEntry |
| Skills | PersonSkill |
| Certifications | PersonCertification |
| Publications | ResumeSection (Publications type) → ResumeEntry |
| Projects | ResumeSection (Projects type) → ResumeEntry |
| Awards | ResumeSection (Awards type) → ResumeEntry |

---

## 7. AI Integration (OpenAI)

### 7.1 Configuration
```json
{
  "OpenAI": {
    "ApiKey": "sk-...",
    "Model": "gpt-4",
    "MaxTokens": 2000,
    "Temperature": 0.7
  }
}
```

### 7.2 AI Features

#### 7.2.1 Summary Suggestion
```csharp
public async Task<string> SuggestSummaryAsync(ResumeProfile resume)
{
    var prompt = $@"
Based on the following resume information, write a compelling professional summary (3-4 sentences):

Name: {resume.Person.Name}
Job Title: {resume.Person.JobTitle}
Experience: {GetExperiencePreview(resume)}
Skills: {GetSkillsPreview(resume)}
Certifications: {GetCertificationsPreview(resume)}

Write a professional summary that highlights key strengths and value proposition.
";

    return await CallOpenAIAsync(prompt);
}
```

#### 7.2.2 Description Enhancement
```csharp
public async Task<string> EnhanceDescriptionAsync(string originalDescription, string context)
{
    var prompt = $@"
Improve the following job description to be more impactful and achievement-focused:

Context: {context}
Original: {originalDescription}

Rewrite this to:
- Start with strong action verbs
- Quantify achievements where possible
- Highlight business impact
- Keep it concise (2-3 bullet points)
";

    return await CallOpenAIAsync(prompt);
}
```

#### 7.2.3 Resume Analysis
```csharp
public async Task<ResumeAnalysis> AnalyzeResumeAsync(ResumeProfile resume)
{
    var prompt = $@"
Analyze the following resume and provide:
1. Overall score (0-100)
2. Top 3 strengths
3. Top 3 areas for improvement
4. Missing important keywords
5. Section-by-section scores

Resume Data:
{SerializeResumeForAnalysis(resume)}

Provide response in JSON format.
";

    var response = await CallOpenAIAsync(prompt);
    return JsonSerializer.Deserialize<ResumeAnalysis>(response);
}
```

#### 7.2.4 Skill Gap Analysis
```csharp
public async Task<List<SkillGap>> IdentifySkillGapsAsync(
    ResumeProfile resume,
    string targetJobDescription)
{
    var prompt = $@"
Compare this candidate's skills against the job requirements:

Candidate Skills:
{GetSkillsList(resume)}

Job Description:
{targetJobDescription}

Identify:
1. Required skills the candidate has
2. Required skills the candidate lacks
3. Nice-to-have skills
4. Importance level (1-5) for each skill

Provide response in JSON format.
";

    var response = await CallOpenAIAsync(prompt);
    return JsonSerializer.Deserialize<List<SkillGap>>(response);
}
```

---

## 8. Search Framework

### 8.1 Search Implementation

#### Basic Search (Entity Framework)
```csharp
public async Task<List<ResumeProfile>> SearchResumesAsync(
    string searchTerm,
    Guid tenantId)
{
    var query = _context.ResumeProfiles
        .Include(r => r.Person)
        .Include(r => r.Sections)
            .ThenInclude(s => s.Entries)
        .Include(r => r.Person.PersonSkills)
            .ThenInclude(ps => ps.Skill)
        .Where(r => r.Person.TenantId == tenantId)
        .Where(r => r.Status == ResumeStatus.Active || r.Status == ResumeStatus.Approved);

    if (!string.IsNullOrEmpty(searchTerm))
    {
        query = query.Where(r =>
            r.Person.Name.Contains(searchTerm) ||
            r.Person.JobTitle.Contains(searchTerm) ||
            r.Sections.Any(s => s.Entries.Any(e =>
                e.Title.Contains(searchTerm) ||
                e.Description.Contains(searchTerm))) ||
            r.Person.PersonSkills.Any(ps => ps.Skill.Name.Contains(searchTerm))
        );
    }

    return await query.ToListAsync();
}
```

#### Advanced Search (PostgreSQL Full-Text Search)
```csharp
// Add GIN index to ResumeEntry.Description
CREATE INDEX idx_resume_entry_description_fts
ON resume_entries USING GIN (to_tsvector('english', description));

// Full-text search query
public async Task<List<ResumeProfile>> FullTextSearchAsync(
    string searchQuery,
    Guid tenantId)
{
    var sql = @"
        SELECT DISTINCT rp.*
        FROM resume_profiles rp
        INNER JOIN people p ON rp.person_id = p.id
        INNER JOIN resume_sections rs ON rp.id = rs.person_id
        INNER JOIN resume_entries re ON rs.id = re.resume_section_id
        WHERE p.tenant_id = @tenantId
        AND to_tsvector('english', re.description) @@ plainto_tsquery('english', @searchQuery)
        ORDER BY ts_rank(to_tsvector('english', re.description), plainto_tsquery('english', @searchQuery)) DESC
    ";

    return await _context.ResumeProfiles
        .FromSqlRaw(sql,
            new NpgsqlParameter("tenantId", tenantId),
            new NpgsqlParameter("searchQuery", searchQuery))
        .ToListAsync();
}
```

#### Skill-Based Matching
```csharp
public async Task<List<ResumeProfile>> FindBySkillsAsync(
    List<string> skills,
    Guid tenantId,
    ProficiencyLevel? minProficiency = null)
{
    var query = _context.ResumeProfiles
        .Include(r => r.Person)
            .ThenInclude(p => p.PersonSkills)
                .ThenInclude(ps => ps.Skill)
        .Where(r => r.Person.TenantId == tenantId)
        .Where(r => r.Person.PersonSkills
            .Any(ps => skills.Contains(ps.Skill.Name)));

    if (minProficiency.HasValue)
    {
        query = query.Where(r => r.Person.PersonSkills
            .Any(ps => ps.ProficiencyLevel >= minProficiency.Value));
    }

    // Order by number of matching skills
    return await query
        .Select(r => new
        {
            Resume = r,
            MatchCount = r.Person.PersonSkills
                .Count(ps => skills.Contains(ps.Skill.Name))
        })
        .OrderByDescending(x => x.MatchCount)
        .Select(x => x.Resume)
        .ToListAsync();
}
```

---

## 9. Manager Approval Workflow

### 9.1 Workflow States

```
Draft → PendingReview → Approved/ChangesRequested → Active
```

### 9.2 Approval Process

#### Submit for Review
```csharp
public async Task<ResumeApproval> SubmitForReviewAsync(
    Guid resumeProfileId,
    Guid userId,
    string? notes = null)
{
    var resume = await _context.ResumeProfiles
        .Include(r => r.Person)
        .FirstOrDefaultAsync(r => r.Id == resumeProfileId);

    if (resume == null)
        throw new NotFoundException("Resume not found");

    // Determine reviewer (manager of person)
    var reviewer = await GetManagerForPersonAsync(resume.PersonId);

    // Create approval request
    var approval = new ResumeApproval
    {
        ResumeProfileId = resumeProfileId,
        RequestedByUserId = userId,
        RequestedAt = DateTime.UtcNow,
        Status = ApprovalStatus.Pending,
        RequestNotes = notes
    };

    _context.ResumeApprovals.Add(approval);

    // Update resume status
    resume.Status = ResumeStatus.PendingReview;

    await _context.SaveChangesAsync();

    // Send notification to reviewer
    await SendReviewNotificationAsync(reviewer, resume);

    return approval;
}
```

#### Approve Resume
```csharp
public async Task ApproveResumeAsync(
    Guid approvalId,
    Guid reviewerId,
    string? notes = null)
{
    var approval = await _context.ResumeApprovals
        .Include(a => a.ResumeProfile)
        .FirstOrDefaultAsync(a => a.Id == approvalId);

    if (approval == null)
        throw new NotFoundException("Approval not found");

    // Update approval
    approval.ReviewedByUserId = reviewerId;
    approval.ReviewedAt = DateTime.UtcNow;
    approval.Status = ApprovalStatus.Approved;
    approval.ReviewNotes = notes;

    // Update resume
    approval.ResumeProfile.Status = ResumeStatus.Approved;
    approval.ResumeProfile.LastReviewedAt = DateTime.UtcNow;
    approval.ResumeProfile.LastReviewedByUserId = reviewerId;

    await _context.SaveChangesAsync();

    // Send notification to requester
    await SendApprovalNotificationAsync(approval);
}
```

#### Request Changes
```csharp
public async Task RequestChangesAsync(
    Guid approvalId,
    Guid reviewerId,
    string notes)
{
    var approval = await _context.ResumeApprovals
        .Include(a => a.ResumeProfile)
        .FirstOrDefaultAsync(a => a.Id == approvalId);

    if (approval == null)
        throw new NotFoundException("Approval not found");

    // Update approval
    approval.ReviewedByUserId = reviewerId;
    approval.ReviewedAt = DateTime.UtcNow;
    approval.Status = ApprovalStatus.ChangesRequested;
    approval.ReviewNotes = notes;

    // Update resume
    approval.ResumeProfile.Status = ResumeStatus.ChangesRequested;

    await _context.SaveChangesAsync();

    // Send notification to requester
    await SendChangesRequestedNotificationAsync(approval);
}
```

### 9.3 Manager Dashboard

Managers need to see:
- Pending approval requests
- Recently approved resumes
- Team resume statistics
- Overdue review requests

```csharp
public async Task<ManagerDashboard> GetManagerDashboardAsync(Guid managerId)
{
    var directReports = await GetDirectReportsAsync(managerId);
    var directReportIds = directReports.Select(p => p.Id).ToList();

    return new ManagerDashboard
    {
        PendingApprovals = await _context.ResumeApprovals
            .Include(a => a.ResumeProfile)
                .ThenInclude(r => r.Person)
            .Where(a => a.Status == ApprovalStatus.Pending)
            .Where(a => directReportIds.Contains(a.ResumeProfile.PersonId))
            .OrderBy(a => a.RequestedAt)
            .ToListAsync(),

        RecentApprovals = await _context.ResumeApprovals
            .Include(a => a.ResumeProfile)
                .ThenInclude(r => r.Person)
            .Where(a => a.ReviewedByUserId == managerId)
            .Where(a => a.ReviewedAt >= DateTime.UtcNow.AddDays(-30))
            .OrderByDescending(a => a.ReviewedAt)
            .Take(10)
            .ToListAsync(),

        TeamStats = await GetTeamResumeStatsAsync(directReportIds)
    };
}
```

---

## 10. Word Document Export

### 10.1 Technology Stack
- **DocX** library (Open XML SDK wrapper)
- **Word templates** stored in SharePoint
- **Mail merge** approach for data injection

### 10.2 Export Implementation

```csharp
public class WordExportService : IDocumentExportService
{
    public async Task<StoredFile> ExportToWordAsync(
        Guid resumeProfileId,
        Guid templateId,
        Guid userId)
    {
        // 1. Load resume data
        var resume = await LoadResumeWithAllDataAsync(resumeProfileId);

        // 2. Load template
        var template = await LoadTemplateAsync(templateId);

        // 3. Generate document from template
        using var templateStream = await DownloadTemplateAsync(template);
        using var outputStream = new MemoryStream();

        using (var doc = DocX.Load(templateStream))
        {
            // Replace placeholders
            ReplacePlaceholder(doc, "{{NAME}}", resume.Person.Name);
            ReplacePlaceholder(doc, "{{JOB_TITLE}}", resume.Person.JobTitle);
            ReplacePlaceholder(doc, "{{EMAIL}}", resume.Person.Email);
            ReplacePlaceholder(doc, "{{LOCATION}}", resume.Person.Location);

            // Insert summary
            InsertSummary(doc, resume);

            // Insert experience section
            InsertExperienceSection(doc, resume);

            // Insert education section
            InsertEducationSection(doc, resume);

            // Insert skills
            InsertSkillsSection(doc, resume);

            // Insert certifications
            InsertCertificationsSection(doc, resume);

            doc.SaveAs(outputStream);
        }

        outputStream.Position = 0;

        // 4. Upload to SharePoint
        var fileName = $"Resume_{resume.Person.Name}_{DateTime.UtcNow:yyyyMMdd}.docx";
        var storedFile = await _fileStorageService.UploadFileAsync(
            outputStream,
            fileName,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Resume",
            resumeProfileId,
            resume.Person.TenantId,
            userId,
            "Resume Document");

        // 5. Create ResumeDocument record
        var resumeDoc = new ResumeDocument
        {
            ResumeProfileId = resumeProfileId,
            StoredFileId = storedFile.Id,
            DocumentType = "Word",
            TemplateName = template.Name,
            GeneratedAt = DateTime.UtcNow,
            GeneratedByUserId = userId
        };

        _context.ResumeDocuments.Add(resumeDoc);
        await _context.SaveChangesAsync();

        return storedFile;
    }

    private void InsertExperienceSection(DocX doc, ResumeProfile resume)
    {
        var experienceSection = resume.Sections
            .FirstOrDefault(s => s.Type == ResumeSectionType.Experience);

        if (experienceSection == null)
            return;

        var experienceBookmark = doc.Bookmarks["EXPERIENCE"];
        if (experienceBookmark == null)
            return;

        var paragraph = experienceBookmark.Paragraph;

        foreach (var entry in experienceSection.Entries.OrderByDescending(e => e.StartDate))
        {
            // Insert job title and organization
            var titlePara = paragraph.InsertParagraphAfterSelf(
                $"{entry.Title} at {entry.Organization}");
            titlePara.Bold();

            // Insert dates
            var datesPara = titlePara.InsertParagraphAfterSelf(
                $"{entry.StartDate:MMM yyyy} - {(entry.EndDate.HasValue ? entry.EndDate.Value.ToString("MMM yyyy") : "Present")}");
            datesPara.Italic();

            // Insert description
            var descPara = datesPara.InsertParagraphAfterSelf(entry.Description);

            paragraph = descPara;
        }
    }
}
```

### 10.3 Template Design

Word templates should use:
- **Bookmarks** for section insertion points
- **Placeholders** for simple text replacement (e.g., `{{NAME}}`)
- **Tables** for structured data (experience, education)
- **Styles** for consistent formatting

Example template structure:
```
{{NAME}}
{{JOB_TITLE}}
{{EMAIL}} | {{LOCATION}}

PROFESSIONAL SUMMARY
[SUMMARY bookmark]

EXPERIENCE
[EXPERIENCE bookmark]

EDUCATION
[EDUCATION bookmark]

SKILLS
[SKILLS bookmark]

CERTIFICATIONS
[CERTIFICATIONS bookmark]
```

---

## 11. Database Migrations

### 11.1 Migration 1: Enhanced Resume Entities
```bash
dotnet ef migrations add EnhancedResumeEntities --project MyScheduling.Infrastructure
```

**Changes:**
- Add columns to `resume_profiles`: `status`, `current_version_id`, `last_reviewed_at`, `last_reviewed_by_user_id`, `is_public`, `linked_in_profile_url`, `linked_in_last_synced_at`
- Create `resume_versions` table
- Create `resume_documents` table
- Create `resume_approvals` table
- Create `resume_templates` table
- Create `linked_in_imports` table

### 11.2 Migration 2: File Storage Framework
```bash
dotnet ef migrations add FileStorageFramework --project MyScheduling.Infrastructure
```

**Changes:**
- Create `stored_files` table
- Create `file_access_logs` table
- Create `sharepoint_configurations` table
- Add indexes on frequently queried columns

### 11.3 Migration 3: Search Indexes
```bash
dotnet ef migrations add ResumeSearchIndexes --project MyScheduling.Infrastructure
```

**Changes:**
- Add GIN index on `resume_entries.description` for full-text search
- Add indexes on `person_skills.skill_id`, `person_certifications.certification_id`
- Add composite indexes for common search patterns

---

## 12. Admin Framework Integration

### 12.1 SharePoint Configuration UI

Add to Admin settings:

```typescript
// Admin → Settings → File Storage

interface SharePointConfig {
  siteUrl: string;
  siteId: string;
  driveId: string;
  driveName: string;
  clientId: string;
  clientSecret: string;
  tenantIdMicrosoft: string;
  isActive: boolean;
  folderStructure: Record<string, string>;
}
```

UI Components:
- SharePoint connection settings form
- Test connection button
- Folder structure configurator
- Storage statistics dashboard

### 12.2 Resume Management Settings

Add to Admin settings:

```typescript
// Admin → Settings → Resume Management

interface ResumeSettings {
  requireManagerApproval: boolean;
  allowLinkedInImport: boolean;
  enableAIAssistance: boolean;
  defaultTemplateId?: string;
  maxResumeVersions: number;
  autoArchiveAfterDays?: number;
}
```

---

## 13. Additional Ideas & Enhancements

### 13.1 Resume Collaboration
- **Commenting System**: Allow reviewers to add inline comments
- **Suggestion Mode**: Track changes like Word's track changes
- **Collaborative Editing**: Multiple people can work on resume simultaneously

### 13.2 Skills Endorsement
- **Peer Endorsements**: Colleagues can endorse skills (LinkedIn-style)
- **Manager Validation**: Managers can validate skill proficiency levels
- **Skill Trending**: Show trending skills in organization

### 13.3 Resume Analytics
- **View Tracking**: Track how many times resume has been viewed
- **Export Analytics**: Track which versions are most exported
- **Comparison Reports**: Compare resumes across team/org

### 13.4 Integration with Assignment System
- **Auto-populate from Assignments**: Automatically create resume entries from project assignments
- **Assignment Suggestions**: Suggest assignments based on resume gaps
- **Utilization Tracking**: Link billable hours to resume experience

### 13.5 Certification Management
- **Expiration Alerts**: Notify users of expiring certifications
- **Renewal Tracking**: Track certification renewal process
- **Training Recommendations**: Suggest training based on role

### 13.6 Resume Scoring
- **Completeness Score**: Percentage of resume completed
- **Quality Score**: AI-based quality assessment
- **Compliance Score**: Check for required sections (e.g., federal proposals)

### 13.7 Multi-Language Support
- **Translated Resumes**: Store resume versions in multiple languages
- **Auto-translation**: AI-assisted translation of resume sections

### 13.8 Privacy Controls
- **Public Profile**: Allow users to create public-facing resume
- **Redacted Versions**: Auto-redact sensitive info for external sharing
- **Access Permissions**: Granular control over who can view resume

---

## 14. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
1. ✅ Design architecture (this document)
2. Create enhanced resume entities
3. Implement database migrations
4. Create file storage framework
5. Implement SharePoint integration
6. Add SharePoint config to admin UI

**Deliverables:**
- Enhanced data model
- File storage service operational
- SharePoint integration working
- Admin can configure SharePoint

### Phase 2: Core Resume Features (Weeks 3-4)
1. Implement ResumesController with CRUD operations
2. Implement resume versioning
3. Create resume management UI
4. Implement search functionality
5. Create resume templates

**Deliverables:**
- Users can create/edit resumes
- Version control working
- Basic search functional
- Templates available

### Phase 3: LinkedIn Integration (Week 5)
1. Implement LinkedIn import service
2. Create import UI
3. Test and refine data mapping
4. Handle edge cases

**Deliverables:**
- Users can import from LinkedIn
- Data correctly mapped to resume structure

### Phase 4: AI Assistance (Week 6)
1. Implement OpenAI integration
2. Create AI service methods
3. Build AI assistance UI
4. Test and refine prompts

**Deliverables:**
- AI can suggest summaries
- AI can enhance descriptions
- AI can analyze resumes
- AI can identify skill gaps

### Phase 5: Approval Workflow (Week 7)
1. Implement approval entities and services
2. Create manager approval UI
3. Build notification system
4. Create approval dashboard

**Deliverables:**
- Employees can submit for review
- Managers can approve/reject
- Notifications working
- Dashboard showing pending approvals

### Phase 6: Export & Advanced Features (Week 8)
1. Implement Word export service
2. Implement PDF export
3. Create advanced search UI
4. Build analytics dashboard
5. Polish and testing

**Deliverables:**
- Export to Word working
- Export to PDF working
- Advanced search functional
- Analytics available

---

## 15. Technical Considerations

### 15.1 Performance
- **Caching**: Cache templates, SharePoint config
- **Lazy Loading**: Load resume sections on demand
- **Pagination**: Paginate search results
- **Background Jobs**: Use background jobs for AI processing, exports

### 15.2 Security
- **File Access Control**: Enforce tenant isolation on file access
- **Encryption**: Encrypt SharePoint credentials
- **API Rate Limiting**: Rate limit AI and LinkedIn API calls
- **Audit Logging**: Log all resume access and modifications

### 15.3 Scalability
- **Blob Storage**: Consider Azure Blob for large files
- **CDN**: Use CDN for template delivery
- **Elasticsearch**: Consider for advanced search at scale
- **Caching Layer**: Redis for frequently accessed data

### 15.4 Testing
- **Unit Tests**: Test all services and repositories
- **Integration Tests**: Test API endpoints
- **E2E Tests**: Test complete workflows
- **Load Tests**: Test file upload/download performance

---

## 16. Dependencies & NuGet Packages

```xml
<!-- MyScheduling.Infrastructure.csproj -->
<ItemGroup>
  <!-- File Storage -->
  <PackageReference Include="Microsoft.Graph" Version="5.x" />
  <PackageReference Include="Azure.Storage.Blobs" Version="12.x" />

  <!-- Document Generation -->
  <PackageReference Include="DocX" Version="2.x" />
  <PackageReference Include="iTextSharp.LGPLv2.Core" Version="3.x" /> <!-- For PDF -->

  <!-- AI Integration -->
  <PackageReference Include="OpenAI" Version="1.x" />

  <!-- LinkedIn (if using official API) -->
  <!-- <PackageReference Include="LinkedIn.NET" Version="x.x" /> -->

  <!-- Background Jobs -->
  <PackageReference Include="Hangfire.AspNetCore" Version="1.8.x" />
  <PackageReference Include="Hangfire.PostgreSql" Version="1.20.x" />

  <!-- Search -->
  <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.x" />
</ItemGroup>
```

---

## 17. Configuration

### 17.1 appsettings.json
```json
{
  "FileStorage": {
    "DefaultProvider": "SharePoint",
    "MaxFileSizeBytes": 52428800,
    "AllowedFileTypes": [".pdf", ".docx", ".doc", ".txt"],
    "LocalPath": "./uploads"
  },
  "SharePoint": {
    "Authority": "https://login.microsoftonline.com/{tenantId}",
    "Scopes": ["https://graph.microsoft.com/.default"]
  },
  "OpenAI": {
    "ApiKey": "sk-...",
    "Model": "gpt-4",
    "MaxTokens": 2000,
    "Temperature": 0.7
  },
  "LinkedIn": {
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "RedirectUri": "https://yourapp.com/auth/linkedin/callback"
  },
  "Resume": {
    "RequireManagerApproval": true,
    "AllowLinkedInImport": true,
    "EnableAIAssistance": true,
    "MaxVersions": 10,
    "AutoArchiveAfterDays": 365
  }
}
```

---

## 18. Next Steps

1. **Review & Approve Design** - Get stakeholder feedback on this design
2. **Setup Infrastructure** - Create new folders/files structure
3. **Database Migrations** - Run migrations to create new tables
4. **Implement Phase 1** - Start with file storage framework
5. **Iterative Development** - Build and test each phase
6. **User Testing** - Get early feedback from pilot users
7. **Production Deployment** - Roll out to production

---

## Appendix A: API Response Examples

### Resume Profile Response
```json
{
  "id": "uuid",
  "personId": "uuid",
  "person": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "jobTitle": "Senior Software Engineer"
  },
  "status": "Approved",
  "isPublic": false,
  "linkedInProfileUrl": "https://linkedin.com/in/johndoe",
  "linkedInLastSyncedAt": "2025-01-15T10:30:00Z",
  "sections": [
    {
      "id": "uuid",
      "type": "Experience",
      "displayOrder": 1,
      "entries": [
        {
          "id": "uuid",
          "title": "Senior Software Engineer",
          "organization": "Acme Corp",
          "startDate": "2020-01-01",
          "endDate": null,
          "description": "Leading development of cloud-based solutions..."
        }
      ]
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

---

Last Updated: 2025-11-20
