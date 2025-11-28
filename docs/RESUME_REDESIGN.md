# Resume Feature Redesign - Comprehensive Design Document

## Executive Summary

This document outlines a comprehensive redesign of the Resume feature to create a **dynamic LinkedIn-like experience** with rich profiles, sharing capabilities, Word/PDF export, versioning, and optional AI assistance.

---

## Current State Assessment

### What's Built (Backend - 90% Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| **ResumeProfile Entity** | Complete | User, status, LinkedIn URL, public flag |
| **ResumeSection/Entry** | Complete | 8 section types, flexible entries |
| **ResumeVersion** | Complete | Snapshot-based versioning |
| **ResumeApproval** | Complete | Full workflow (pending/approved/rejected/changes) |
| **ResumeTemplate** | Complete | 6 template types (Federal, Commercial, etc.) |
| **ResumesController** | Complete | Full CRUD, sections, entries, versions |
| **ResumeApprovalsController** | Complete | Submit, approve, reject, request changes |
| **ResumeTemplatesController** | Complete | CRUD, duplicate, set default |

### What's Built (Frontend - 50% Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| **ResumesPage (List)** | Complete | Grid view, search, status filter |
| **ResumeDetailPage** | Partial | Basic tabs, but edit forms incomplete |
| **Section/Entry Forms** | Partial | Add works, edit marked "not implemented" |
| **Approval UI** | Missing | No approval dashboard or actions |
| **Template Admin UI** | Missing | No template management page |
| **Resume Builder/Editor** | Missing | No dynamic editing experience |

### What's NOT Built

| Feature | Status |
|---------|--------|
| LinkedIn Import Service | Interface only |
| AI Resume Service | Interface only |
| Document Export (Word/PDF) | Interface only |
| File Storage (SharePoint/Blob) | Interface only |
| Advanced Search | Interface only |
| Public Profile Sharing | Not started |
| Download to Word | Not started |

---

## Vision: LinkedIn-Like Dynamic Resume Experience

### Core Concept

Transform the resume feature from a static form-based system into a **dynamic, interactive profile experience** similar to LinkedIn, where users can:

1. **View their profile** like a LinkedIn page with rich sections
2. **Edit inline** - click to edit any section without leaving the page
3. **Manage versions** - create tailored versions for different purposes (Federal, Commercial, Technical)
4. **Share publicly** - generate shareable links with optional expiration
5. **Export professionally** - download to Word/PDF with customizable templates
6. **Get AI assistance** - optional AI suggestions for improvements

---

## Proposed Architecture

### User Experience Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MY RESUME                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  [Profile Header]                                             │  │
│  │  ┌────────┐  Jane Doe                          [Share] [PDF] │  │
│  │  │ Photo  │  Senior Software Engineer          [Word] [Edit] │  │
│  │  │        │  Arlington, VA | jane@company.com                │  │
│  │  └────────┘  LinkedIn: linkedin.com/in/janedoe               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐ ┌─────────────┐ │
│  │Summary │ │Experience│ │Education│ │   Skills  │ │Certifications│ │
│  └────────┘ └──────────┘ └─────────┘ └───────────┘ └─────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  PROFESSIONAL SUMMARY                              [+ Edit]   │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  Results-driven software engineer with 10+ years of          │  │
│  │  experience building enterprise applications...              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  EXPERIENCE                                      [+ Add Entry]│  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │ Senior Software Engineer                    [Edit][Del]│  │  │
│  │  │ Acme Corporation                                       │  │  │
│  │  │ Jan 2020 - Present · 4 years                          │  │  │
│  │  │ • Led development of cloud platform...                │  │  │
│  │  │ • Managed team of 5 developers...                     │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │ Software Engineer                           [Edit][Del]│  │  │
│  │  │ Tech Solutions Inc                                     │  │  │
│  │  │ Mar 2015 - Dec 2019 · 4 years 9 months               │  │  │
│  │  │ • Developed microservices architecture...             │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SKILLS                                          [+ Add Skill]│  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  ┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐   │  │
│  │  │ C# ★★★★★   │ │React ★★★★│ │PostgreSQL │ │ Azure ★★★★ │   │  │
│  │  └─────────────┘ └──────────┘ └───────────┘ └────────────┘   │  │
│  │  ┌─────────────┐ ┌──────────┐ ┌───────────┐                  │  │
│  │  │ TypeScript  │ │ Docker   │ │ Kubernetes│                  │  │
│  │  └─────────────┘ └──────────┘ └───────────┘                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CERTIFICATIONS                           [+ Add Certification]│  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  🏆 AWS Solutions Architect - Professional (Expires: Dec 2025)│  │
│  │  🏆 Azure Administrator Associate (Expires: Mar 2026)         │  │
│  │  🏆 PMP - Project Management Professional (No Expiration)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Feature Breakdown

### 1. Resume Profile View (LinkedIn-Style)

**Goal**: A beautiful, responsive profile page that feels modern and professional.

#### Components Needed

| Component | Description |
|-----------|-------------|
| `ResumeProfilePage` | Main profile page with all sections |
| `ProfileHeader` | Photo, name, title, contact info, action buttons |
| `SectionTabs` | Tab navigation for sections (optional, or just scroll) |
| `SummarySection` | Professional summary with inline edit |
| `ExperienceSection` | Timeline of work experience |
| `EducationSection` | Educational background |
| `SkillsSection` | Skills grid with proficiency indicators |
| `CertificationsSection` | Certifications with expiry tracking |
| `ProjectsSection` | Notable projects |
| `PublicationsSection` | Publications and articles |
| `AwardsSection` | Awards and honors |

#### Inline Editing Experience

- Click any section to open a sleek modal or slide-out panel
- Auto-save with visual feedback
- Undo/redo support
- Rich text editor for descriptions (bullet points, bold, italic)

### 2. Versions & Tailored Resumes

**Goal**: Create multiple tailored versions of your resume for different purposes.

```
┌─────────────────────────────────────────────────────────────────┐
│  RESUME VERSIONS                                    [+ New Version]│
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ★ Master (Current)                               [View] [Set]│ │
│  │   Full resume with all experience and skills                │ │
│  │   Last updated: Nov 28, 2025                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │   Federal Proposal                         [View] [Download] │ │
│  │   Tailored for government proposals                         │ │
│  │   Created: Nov 15, 2025 · Based on Master v3                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │   Technical Lead                           [View] [Download] │ │
│  │   Emphasizes leadership and architecture                    │ │
│  │   Created: Nov 10, 2025 · Based on Master v2                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Version Features

- **Snapshot-based**: Each version captures the resume state at creation
- **Editable**: Versions can be edited independently of master
- **Comparison**: Diff view between versions
- **Purpose Tags**: Federal, Commercial, Technical, Executive, etc.

### 3. Export to Word/PDF

**Goal**: Professional document generation with customizable templates.

#### Export Options

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPORT RESUME                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Version: [Master (Current) ▼]                                   │
│                                                                   │
│  Template:                                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ Modern  │ │Classic  │ │ Federal │ │Executive│ │ Minimal │    │
│  │  ✓      │ │         │ │         │ │         │ │         │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                                   │
│  Format:                                                          │
│  ○ Word (.docx)                                                   │
│  ○ PDF                                                            │
│                                                                   │
│  Options:                                                         │
│  ☐ Include photo                                                  │
│  ☑ Include contact information                                    │
│  ☐ Include LinkedIn URL                                           │
│  ☑ Show skill proficiency levels                                  │
│                                                                   │
│  [Preview]                                [Download]              │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation: Document Generation

**Technology Choice: OpenXML SDK (Word) + QuestPDF or similar (PDF)**

```csharp
// Word generation with OpenXML
public async Task<byte[]> GenerateWordDocument(
    ResumeProfile resume,
    ResumeTemplate template,
    ExportOptions options)
{
    using var memoryStream = new MemoryStream();
    using var document = WordprocessingDocument.Create(
        memoryStream, WordprocessingDocumentType.Document);

    // Build document structure
    var mainPart = document.AddMainDocumentPart();
    mainPart.Document = new Document();
    var body = mainPart.Document.AppendChild(new Body());

    // Add header with name and contact info
    AddHeader(body, resume, options);

    // Add each section
    if (options.IncludeSummary)
        AddSummarySection(body, resume);

    AddExperienceSection(body, resume);
    AddEducationSection(body, resume);
    AddSkillsSection(body, resume, options.ShowProficiency);
    AddCertificationsSection(body, resume);

    // Apply template styling
    ApplyTemplateStyles(document, template);

    document.Save();
    return memoryStream.ToArray();
}
```

### 4. Public Sharing

**Goal**: Generate shareable links for external viewing.

```
┌─────────────────────────────────────────────────────────────────┐
│  SHARE RESUME                                                    │
├─────────────────────────────────────────────────────────────────┤
│  Create a shareable link to your resume                          │
│                                                                   │
│  Version: [Master (Current) ▼]                                   │
│                                                                   │
│  Link Settings:                                                   │
│  ○ No expiration                                                  │
│  ○ Expires in: [7 days ▼]                                        │
│                                                                   │
│  Access Protection:                                               │
│  ☐ Require password                                               │
│     Password: [••••••••]                                         │
│                                                                   │
│  Visible Sections:                                                │
│  ☑ Summary                                                        │
│  ☑ Experience                                                     │
│  ☑ Education                                                      │
│  ☑ Skills                                                         │
│  ☑ Certifications                                                 │
│  ☐ Contact Information (hide email/phone)                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ https://app.myscheduling.com/resume/share/abc123xyz         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [Copy Link]                              [Generate New Link]    │
└─────────────────────────────────────────────────────────────────┘
```

#### Share Link Entity

```csharp
public class ResumeShareLink : TenantEntity
{
    public Guid ResumeProfileId { get; set; }
    public Guid? ResumeVersionId { get; set; }  // Null = current version
    public string ShareToken { get; set; } = string.Empty;  // Unique URL token
    public DateTime? ExpiresAt { get; set; }
    public string? PasswordHash { get; set; }
    public string? VisibleSections { get; set; }  // JSON array of section types
    public bool HideContactInfo { get; set; }
    public int ViewCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual ResumeProfile ResumeProfile { get; set; } = null!;
    public virtual ResumeVersion? ResumeVersion { get; set; }
}
```

### 5. Manager Approval Workflow UI

**Goal**: Complete the approval workflow with proper UI.

```
┌─────────────────────────────────────────────────────────────────┐
│  RESUME APPROVALS                                                │
├─────────────────────────────────────────────────────────────────┤
│  [Pending (3)] [Approved] [Changes Requested] [My Requests]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🔴 Jane Doe - Software Engineer                              │ │
│  │    Submitted: Nov 25, 2025 (3 days ago)                      │ │
│  │    Note: "Updated with recent project experience"            │ │
│  │                                                               │ │
│  │    [View Resume]  [Approve]  [Request Changes]  [Reject]     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🟡 John Smith - Project Manager                              │ │
│  │    Submitted: Nov 27, 2025 (1 day ago)                       │ │
│  │    Note: "Added PMP certification"                           │ │
│  │                                                               │ │
│  │    [View Resume]  [Approve]  [Request Changes]  [Reject]     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Template Management (Admin)

**Goal**: Admins can create and manage resume templates.

```
┌─────────────────────────────────────────────────────────────────┐
│  RESUME TEMPLATES                               [+ Create Template]│
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Federal Proposal Template            ★ Default   [Edit] [Del]│ │
│  │ Type: Federal                                                 │ │
│  │ For government proposal submissions                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Commercial Template                            [Edit] [Del]  │ │
│  │ Type: Commercial                                              │ │
│  │ Modern format for commercial clients                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Executive Bio                                  [Edit] [Del]  │ │
│  │ Type: Executive                                               │ │
│  │ One-page executive summary format                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions (Confirmed)

Based on stakeholder feedback, the following decisions have been made:

### User Experience

| Decision | Answer |
|----------|--------|
| **Profile Photo** | Yes - store in Azure Blob Storage along with Word document exports |
| **Section Ordering** | Fixed order: Summary → Experience → Education → Skills → Certifications → Projects → Awards → Publications |
| **Skill Proficiency** | Display as progress bars with labels (Beginner/Intermediate/Advanced/Expert). Define a master skill list for consistency. |
| **Rich Text** | Full rich text editor for descriptions (bold, italic, bullets, links) |

### Sharing & Privacy

| Decision | Answer |
|----------|--------|
| **Public Profiles** | Optional permanent URL (activated via settings) |
| **View Analytics** | Full viewer details (if logged in) + moderated comments |

### Export & Documents

| Decision | Answer |
|----------|--------|
| **Templates** | Pre-built templates in code (no admin uploads) |
| **Storage** | Azure Blob Storage for profile photos and generated documents |

### Approval Workflow

| Decision | Answer |
|----------|--------|
| **Approvers** | Any manager in reporting chain OR designated approval groups |
| **Auto-approval** | Managers auto-approved; only employees need approval |

### Integration Priorities

| Feature | Priority |
|---------|----------|
| **LinkedIn Import** | Phase 1 - First version from LinkedIn |
| **AI Assistance** | Future only - not in initial release |

---

## Azure Blob Storage Setup Guide

To configure Azure Blob Storage for resume photos and documents:

### 1. Create Azure Storage Account

```bash
# Using Azure CLI
az storage account create \
  --name myschedulingstorage \
  --resource-group myscheduling-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create containers
az storage container create --name profiles --account-name myschedulingstorage
az storage container create --name documents --account-name myschedulingstorage
az storage container create --name resumes --account-name myschedulingstorage
```

### 2. Configure Connection String

Add to `appsettings.json`:

```json
{
  "Storage": {
    "Mode": "AzureBlob",
    "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=myschedulingstorage;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net",
    "ContainerProfiles": "profiles",
    "ContainerDocuments": "documents",
    "ContainerResumes": "resumes",
    "MaxFileSizeBytes": 10485760,
    "AllowedImageTypes": ["image/jpeg", "image/png", "image/gif"],
    "AllowedDocumentTypes": ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    "SasTtlMinutes": 60
  }
}
```

### 3. For Production (Use Managed Identity)

```json
{
  "Storage": {
    "Mode": "AzureBlob",
    "UseManagedIdentity": true,
    "AccountName": "myschedulingstorage",
    "ContainerProfiles": "profiles",
    "ContainerDocuments": "documents"
  }
}
```

### 4. Required NuGet Package

```xml
<PackageReference Include="Azure.Storage.Blobs" Version="12.19.1" />
```

---

## Proposed Implementation Phases

### Phase 1: Core Profile Experience (Priority)

**Goal**: Beautiful, functional resume viewing and editing

1. **ResumeProfilePage** - Main profile view with all sections
2. **Inline Editing** - Modal-based editing for each section
3. **Section Components** - Summary, Experience, Education, Skills, Certifications
4. **Entry Forms** - Add/edit experience, education, certifications
5. **Skills Management** - Add/remove skills with proficiency
6. **Auto-save** - Save changes automatically with feedback

**Backend Work**:
- Fix any auth context issues (replace hardcoded user IDs)
- Add section update endpoint if missing
- Optimize queries for profile loading

### Phase 2: Export & Sharing

**Goal**: Download and share resumes professionally

1. **Word Export** - Generate .docx files using OpenXML
2. **PDF Export** - Generate PDF files
3. **Templates System** - Multiple export templates
4. **Share Links** - Generate shareable links
5. **Public View Page** - Read-only view for shared links
6. **Download History** - Track document generation

**Backend Work**:
- Add DocumentExportController
- Implement Word generation service
- Implement PDF generation service
- Add ResumeShareLink entity and endpoints

### Phase 3: Versions & Approval

**Goal**: Professional workflow for tailored resumes

1. **Version Management UI** - Create, view, compare versions
2. **Approval Dashboard** - Manager approval interface
3. **Approval Actions** - Approve, reject, request changes
4. **Status Tracking** - Visual status indicators
5. **Notifications** - Email/in-app notifications (if notification system exists)

**Backend Work**:
- Approval notification system
- Version comparison endpoint

### Phase 4: Admin & Templates

**Goal**: Administrative control and customization

1. **Template Management** - Admin UI for templates
2. **Template Editor** - Configure template settings
3. **Resume Settings** - Tenant-level resume configuration
4. **Bulk Operations** - Export multiple resumes
5. **Analytics** - Resume completion stats, export stats

### Phase 5: Advanced Features (Future)

1. **LinkedIn Import** - Import data from LinkedIn
2. **AI Suggestions** - Summary generation, description enhancement
3. **Skill Gap Analysis** - Compare resume to job descriptions
4. **Public Profiles** - Permanent profile URLs
5. **Collaboration** - Comments and suggestions from reviewers

---

## Technical Implementation Details

### Frontend Component Structure

```
frontend/src/
├── pages/
│   ├── ResumesPage.tsx              # List of all resumes (exists)
│   ├── ResumeProfilePage.tsx        # Main profile view (new)
│   ├── ResumeEditPage.tsx           # Full edit mode (optional)
│   ├── ResumeSharePage.tsx          # Public shared view (new)
│   └── admin/
│       ├── ResumeApprovalsPage.tsx  # Manager approval dashboard (new)
│       └── ResumeTemplatesPage.tsx  # Template management (new)
├── components/
│   └── resume/
│       ├── ProfileHeader.tsx        # Header with photo, name, actions
│       ├── SummarySection.tsx       # Professional summary
│       ├── ExperienceSection.tsx    # Work experience timeline
│       ├── EducationSection.tsx     # Education entries
│       ├── SkillsSection.tsx        # Skills grid
│       ├── CertificationsSection.tsx # Certifications list
│       ├── ProjectsSection.tsx      # Projects
│       ├── AwardsSection.tsx        # Awards
│       ├── PublicationsSection.tsx  # Publications
│       ├── EntryCard.tsx            # Reusable entry display
│       ├── EntryModal.tsx           # Add/edit entry modal
│       ├── SkillBadge.tsx           # Individual skill display
│       ├── VersionSelector.tsx      # Version dropdown
│       ├── ExportModal.tsx          # Export options modal
│       ├── ShareModal.tsx           # Share link generation
│       └── ApprovalCard.tsx         # Approval request card
└── services/
    └── resumeService.ts             # API calls (exists, extend)
```

### Backend New Endpoints

```csharp
// Document Export
POST /api/resumes/{id}/export/word      // Generate Word document
POST /api/resumes/{id}/export/pdf       // Generate PDF document
GET  /api/resumes/{id}/documents        // List generated documents
GET  /api/resumes/documents/{docId}     // Download document

// Sharing
POST /api/resumes/{id}/share            // Create share link
GET  /api/resumes/share/{token}         // Get shared resume (public)
DELETE /api/resumes/share/{linkId}      // Revoke share link
GET  /api/resumes/{id}/shares           // List share links

// Enhanced
PUT  /api/resumes/{id}/sections/{sectionId}  // Update section (if missing)
PUT  /api/resumes/{id}/reorder-sections      // Reorder sections
```

### New NuGet Packages Needed

```xml
<!-- Word Generation -->
<PackageReference Include="DocumentFormat.OpenXml" Version="3.0.0" />

<!-- PDF Generation (choose one) -->
<PackageReference Include="QuestPDF" Version="2024.10.0" />
<!-- OR -->
<PackageReference Include="itext7" Version="8.0.0" />
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Resume completion rate | 80%+ of users have complete profiles |
| Export usage | 50%+ of active resumes exported at least once |
| Approval turnaround | < 3 days average approval time |
| User satisfaction | Positive feedback on profile experience |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex Word generation | Medium | Use proven library (OpenXML), simple templates first |
| Large file storage costs | Low | Generate on-demand, don't store PDFs |
| Performance with many sections | Low | Lazy loading, pagination |
| Approval bottlenecks | Medium | Auto-approve for certain roles, reminders |

---

## Recommended Next Steps

1. **Answer the questions above** - Critical for design decisions
2. **Start with Phase 1** - Core profile experience
3. **Iterative development** - Ship incremental improvements
4. **User testing** - Get feedback early on the profile view
5. **Template design** - Design Word/PDF templates concurrently

---

## Appendix: Current Entity Reference

### ResumeProfile
```csharp
public class ResumeProfile : TenantEntity
{
    public Guid UserId { get; set; }
    public ResumeStatus Status { get; set; }
    public string? TemplateConfig { get; set; }
    public Guid? CurrentVersionId { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public Guid? LastReviewedByUserId { get; set; }
    public bool IsPublic { get; set; }
    public string? LinkedInProfileUrl { get; set; }
    public DateTime? LinkedInLastSyncedAt { get; set; }

    public virtual ICollection<ResumeSection> Sections { get; set; }
    public virtual ICollection<ResumeVersion> Versions { get; set; }
    public virtual ICollection<ResumeDocument> Documents { get; set; }
    public virtual ICollection<ResumeApproval> Approvals { get; set; }
}
```

### ResumeSectionType
```csharp
public enum ResumeSectionType
{
    Summary,
    Experience,
    Education,
    Skills,
    Certifications,
    Projects,
    Awards,
    Publications
}
```

### ResumeStatus
```csharp
public enum ResumeStatus
{
    Draft,
    PendingReview,
    Approved,
    ChangesRequested,
    Active,
    Archived
}
```

---

*Document Created: November 28, 2025*
*Status: Ready for Review and Questions*
