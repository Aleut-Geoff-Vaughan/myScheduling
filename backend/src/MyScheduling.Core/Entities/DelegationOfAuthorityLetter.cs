namespace MyScheduling.Core.Entities;

public class DelegationOfAuthorityLetter : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid DelegatorUserId { get; set; }
    public Guid DesigneeUserId { get; set; }
    public string SubjectLine { get; set; } = string.Empty;  // Replaced IsFinancialAuthority/IsOperationalAuthority
    public string LetterContent { get; set; } = string.Empty;
    public DateTime EffectiveStartDate { get; set; }
    public DateTime EffectiveEndDate { get; set; }

    // Deprecated - will be removed after migration
    public bool IsFinancialAuthority { get; set; }
    public bool IsOperationalAuthority { get; set; }

    public DOAStatus Status { get; set; }
    public string? Notes { get; set; }

    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual User DelegatorUser { get; set; } = null!;
    public virtual User DesigneeUser { get; set; } = null!;
    public virtual ICollection<DigitalSignature> Signatures { get; set; } = new List<DigitalSignature>();
}

public enum DOAStatus
{
    Draft = 0,              // Being created
    PendingSignatures = 1,  // Waiting for both parties to sign
    Active = 2,             // Fully signed and active
    Expired = 3,            // Past effective end date
    Revoked = 4             // Manually cancelled
}
