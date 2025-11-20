namespace MyScheduling.Core.Enums;

public enum ResumeStatus
{
    Draft,              // Work in progress
    PendingReview,      // Submitted for manager review
    Approved,           // Approved by manager
    ChangesRequested,   // Manager requested changes
    Active,             // Active and available for use
    Archived            // Archived/historical
}

public enum ApprovalStatus
{
    Pending,
    Approved,
    Rejected,
    ChangesRequested,
    Cancelled
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

public enum ImportStatus
{
    Pending,
    InProgress,
    Completed,
    PartialSuccess,
    Failed
}
