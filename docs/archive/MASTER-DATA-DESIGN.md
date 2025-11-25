# Master Data Management & Advanced Features Design

## Overview
This document outlines the design and implementation plan for three major feature enhancements:
1. **Master Data Management for Projects/WBS** - Enhanced WBS management with ownership workflows and categorization
2. **Master Data Management for Facilities** - Role-based facilities management
3. **Dynamic Validation Framework** - Flexible, non-hardcoded validation system

---

## 1. Master Data Management for Projects/WBS

### Current State Analysis
**Existing Entities:**
- `Project` - Basic project information (Name, ProgramCode, Customer, Dates, Status)
- `WbsElement` - Work Breakdown Structure elements (Code, Description, Dates, Status, IsBillable flag)
- `ProjectRole` - Roles associated with WBS elements
- `Assignment` - Person assignments to WBS elements

**Current Limitations:**
- No workflow ownership tracking
- No validity date management beyond start/end dates
- Simple boolean `IsBillable` flag instead of comprehensive WBS type categorization
- No approval workflows for WBS creation/modification
- No audit trail for WBS changes

### Enhanced Architecture

#### 1.1 WBS Type Enum
```csharp
public enum WbsType
{
    Billable,           // Direct customer billing
    NonBillable,        // Customer work but not billed
    BidAndProposal,     // B&P - Proposal development
    Overhead,           // OH - General overhead
    GeneralAndAdmin     // G&A - Administrative costs
}
```

#### 1.2 Enhanced WbsElement Entity
**New Fields:**
- `WbsType Type` - Categorization (Billable, NonBillable, B&P, OH, G&A)
- `DateTime ValidFrom` - Start of validity period
- `DateTime? ValidTo` - End of validity period (null = indefinite)
- `Guid? OwnerUserId` - Primary owner responsible for WBS
- `Guid? ApproverUserId` - Approver for workflow
- `WbsApprovalStatus ApprovalStatus` - Workflow status
- `string? ApprovalNotes` - Notes from approval process
- `DateTime? ApprovedAt` - When approved

**Workflow States:**
```csharp
public enum WbsApprovalStatus
{
    Draft,              // Initial creation
    PendingApproval,    // Submitted for approval
    Approved,           // Approved and active
    Rejected,           // Rejected by approver
    Suspended,          // Temporarily suspended
    Closed              // Closed/archived
}
```

#### 1.3 WBS Change History
```csharp
public class WbsChangeHistory : BaseEntity
{
    public Guid WbsElementId { get; set; }
    public Guid ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; }
    public string ChangeType { get; set; } // Created, Updated, StatusChanged, TypeChanged
    public string? OldValues { get; set; } // JSON snapshot
    public string? NewValues { get; set; } // JSON snapshot
    public string? Notes { get; set; }

    // Navigation
    public virtual WbsElement WbsElement { get; set; } = null!;
    public virtual User ChangedBy { get; set; } = null!;
}
```

#### 1.4 API Endpoints
- `GET /api/wbs` - List all WBS elements (with filtering)
- `GET /api/wbs/{id}` - Get WBS details
- `POST /api/wbs` - Create new WBS (starts in Draft)
- `PUT /api/wbs/{id}` - Update WBS
- `POST /api/wbs/{id}/submit` - Submit for approval
- `POST /api/wbs/{id}/approve` - Approve WBS
- `POST /api/wbs/{id}/reject` - Reject WBS
- `POST /api/wbs/{id}/suspend` - Suspend WBS
- `POST /api/wbs/{id}/close` - Close WBS
- `GET /api/wbs/{id}/history` - Get change history
- `GET /api/wbs/by-project/{projectId}` - Get WBS by project
- `GET /api/wbs/by-owner/{userId}` - Get WBS by owner
- `GET /api/wbs/pending-approval` - Get pending approvals

---

## 2. Master Data Management for Facilities

### Current State Analysis
**Existing Entities:**
- `Office` - Office locations (Name, Address, Timezone, Status)
- `Space` - Physical spaces (OfficeId, Name, Type, Capacity, Metadata)
- `Booking` - Space reservations

**Current Limitations:**
- No role-based access control for facilities management
- No space ownership or approval workflows
- Simple space types (Desk, Room, ConferenceRoom)
- Limited metadata structure
- No facility maintenance tracking
- No capacity planning tools

### Enhanced Architecture

#### 2.1 Enhanced Space Entity
**New Fields:**
- `Guid? ManagerUserId` - Space manager/owner
- `bool RequiresApproval` - Does booking require approval?
- `bool IsActive` - Active/inactive status
- `string? Equipment { get; set; }` - JSON array of equipment
- `string? Features { get; set; }` - JSON array of features
- `decimal? DailyCost` - Cost for financial tracking
- `int? MaxBookingDays` - Maximum booking duration
- `string? BookingRules` - JSON rules for booking restrictions

**Enhanced Space Types:**
```csharp
public enum SpaceType
{
    Desk,
    HotDesk,            // Shared/unassigned desk
    Office,
    Cubicle,
    ConferenceRoom,
    HuddleRoom,
    PhoneBooth,
    TrainingRoom,
    BreakRoom,
    ParkingSpot
}
```

#### 2.2 Facility Permissions
```csharp
public class FacilityPermission : BaseEntity
{
    public Guid? OfficeId { get; set; }      // Null = all offices
    public Guid? SpaceId { get; set; }       // Null = office level
    public Guid? UserId { get; set; }        // Null = role-based
    public AppRole? Role { get; set; }       // Null = user-specific
    public FacilityAccessLevel AccessLevel { get; set; }

    // Navigation
    public virtual Office? Office { get; set; }
    public virtual Space? Space { get; set; }
    public virtual User? User { get; set; }
}

public enum FacilityAccessLevel
{
    View,               // Can view only
    Book,               // Can book spaces
    Manage,             // Can manage bookings
    Configure,          // Can configure spaces
    FullAdmin           // Full administrative access
}
```

#### 2.3 Space Maintenance Tracking
```csharp
public class SpaceMaintenanceLog : BaseEntity
{
    public Guid SpaceId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public MaintenanceType Type { get; set; }
    public MaintenanceStatus Status { get; set; }
    public Guid ReportedByUserId { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Resolution { get; set; }
    public decimal? Cost { get; set; }

    // Navigation
    public virtual Space Space { get; set; } = null!;
    public virtual User ReportedBy { get; set; } = null!;
    public virtual User? AssignedTo { get; set; }
}

public enum MaintenanceType
{
    Routine,
    Repair,
    Inspection,
    Cleaning,
    EquipmentIssue,
    SafetyConcern
}

public enum MaintenanceStatus
{
    Reported,
    Scheduled,
    InProgress,
    Completed,
    Cancelled
}
```

#### 2.4 API Endpoints
- `GET /api/facilities/offices` - List offices
- `GET /api/facilities/spaces` - List spaces (role-filtered)
- `POST /api/facilities/spaces` - Create space (requires permission)
- `PUT /api/facilities/spaces/{id}` - Update space
- `GET /api/facilities/permissions` - Get user's permissions
- `POST /api/facilities/permissions` - Grant permission
- `DELETE /api/facilities/permissions/{id}` - Revoke permission
- `GET /api/facilities/spaces/{id}/maintenance` - Get maintenance log
- `POST /api/facilities/spaces/{id}/maintenance` - Report maintenance
- `PUT /api/facilities/maintenance/{id}` - Update maintenance record

---

## 3. Dynamic Validation Framework

### Architecture Overview
A flexible, non-hardcoded validation system that allows defining validation rules dynamically without code deployment.

### 3.1 Core Components

#### ValidationRule Entity
```csharp
public class ValidationRule : TenantEntity
{
    public string EntityType { get; set; } = string.Empty;  // "Assignment", "Booking", etc.
    public string RuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Priority { get; set; } = 100;                // Lower = higher priority
    public bool IsActive { get; set; } = true;
    public ValidationRuleType RuleType { get; set; }
    public string RuleExpression { get; set; } = string.Empty;  // JSON or pseudo-code
    public string ErrorMessage { get; set; } = string.Empty;
    public ValidationSeverity Severity { get; set; }

    // Conditional execution
    public string? Condition { get; set; }                  // When to apply rule

    // Audit
    public Guid CreatedByUserId { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
}

public enum ValidationRuleType
{
    Required,           // Field must have value
    Range,              // Value must be in range
    Pattern,            // Must match regex
    Custom,             // Custom logic
    CrossField,         // Multi-field validation
    External            // External API call
}

public enum ValidationSeverity
{
    Error,              // Blocks save
    Warning,            // Shows warning but allows save
    Information         // Informational only
}
```

#### Rule Expression Format (JSON)
```json
{
  "type": "crossField",
  "condition": "status == 'Active'",
  "validation": {
    "operator": "and",
    "rules": [
      {
        "field": "allocation",
        "operator": ">=",
        "value": 0
      },
      {
        "field": "allocation",
        "operator": "<=",
        "value": 100
      }
    ]
  },
  "errorMessage": "Allocation must be between 0 and 100 for active assignments"
}
```

#### Pseudo-Code Support
```
IF assignment.Status == "Active" THEN
    REQUIRE assignment.Allocation >= 0 AND assignment.Allocation <= 100
    ERROR "Allocation must be between 0 and 100"
END IF

IF booking.StartDatetime < NOW THEN
    ERROR "Cannot book in the past"
END IF

IF person.Type == "Contractor" THEN
    REQUIRE assignment.EndDate IS NOT NULL
    WARNING "Contractor assignments should have end dates"
END IF
```

### 3.2 Validation Engine

#### IValidationEngine Interface
```csharp
public interface IValidationEngine
{
    Task<ValidationResult> ValidateAsync<T>(T entity, string entityType, Guid tenantId);
    Task<ValidationResult> ValidateFieldAsync<T>(T entity, string fieldName, object value);
    Task<IEnumerable<ValidationRule>> GetRulesAsync(string entityType, Guid tenantId);
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<ValidationError> Errors { get; set; } = new();
    public List<ValidationWarning> Warnings { get; set; } = new();
    public List<ValidationInfo> Informational { get; set; } = new();
}

public class ValidationError
{
    public string RuleName { get; set; } = string.Empty;
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public ValidationSeverity Severity { get; set; }
}
```

#### Rule Interpreter
```csharp
public interface IRuleInterpreter
{
    bool EvaluateCondition(string condition, object entity);
    object EvaluateExpression(string expression, object entity);
    ValidationError? ExecuteRule(ValidationRule rule, object entity);
}
```

### 3.3 API Endpoints
- `GET /api/validation/rules` - List rules by entity type
- `GET /api/validation/rules/{id}` - Get rule details
- `POST /api/validation/rules` - Create rule
- `PUT /api/validation/rules/{id}` - Update rule
- `DELETE /api/validation/rules/{id}` - Delete rule
- `POST /api/validation/test` - Test rule against sample data
- `POST /api/validation/validate` - Validate entity
- `GET /api/validation/entity-types` - List supported entity types

### 3.4 Integration Points
- **Controllers**: Add `[ValidateEntity]` attribute
- **Services**: Inject `IValidationEngine` for validation
- **Frontend**: Real-time validation API calls
- **Admin UI**: Rule builder interface

---

## Implementation Phases

### Phase 1: WBS Master Data Management (PRIORITY 1)
1. ✅ Design architecture (this document)
2. Update WbsElement entity with new fields
3. Create WbsChangeHistory entity
4. Create database migration
5. Implement WbsController with workflow endpoints
6. Create WBS management UI components
7. Add approval workflow UI
8. Testing and documentation

### Phase 2: Facilities Master Data Management (PRIORITY 2)
1. ✅ Design architecture
2. Update Space and Office entities
3. Create FacilityPermission entity
4. Create SpaceMaintenanceLog entity
5. Create database migration
6. Implement role-based access control
7. Create facilities management UI
8. Add maintenance tracking UI
9. Testing and documentation

### Phase 3: Dynamic Validation Framework (PRIORITY 3)
1. ✅ Design architecture
2. Create ValidationRule entity
3. Implement IValidationEngine service
4. Implement IRuleInterpreter service
5. Create database migration
6. Implement ValidationController
7. Create rule builder UI
8. Integrate with existing entities
9. Testing and documentation

---

## Technical Considerations

### Database Migrations
- **WBS Enhancement**: Add new columns to WbsElements table, create WbsChangeHistory table
- **Facilities**: Add new columns to Spaces/Offices, create FacilityPermission and SpaceMaintenanceLog tables
- **Validation**: Create ValidationRules table with indexes on EntityType and TenantId

### Performance
- **Caching**: Cache validation rules per tenant
- **Indexes**: Add indexes on frequently queried fields (OwnerId, ApprovalStatus, etc.)
- **Lazy Loading**: Use explicit loading for change history

### Security
- **Authorization**: Check user roles before allowing WBS/facility modifications
- **Validation**: Validate all rule expressions before saving
- **Audit**: Log all changes to WBS and validation rules

### Testing Strategy
- **Unit Tests**: Test validation engine and rule interpreter
- **Integration Tests**: Test API endpoints with various scenarios
- **E2E Tests**: Test complete workflows (WBS approval, facility booking, etc.)

---

## UI Components Required

### WBS Management
- `WbsListPage` - List all WBS elements with filters
- `WbsDetailModal` - View/edit WBS details
- `WbsApprovalQueue` - Pending approvals for managers
- `WbsHistoryTimeline` - Change history visualization
- `WbsTypeSelector` - Select WBS type (Billable, OH, etc.)

### Facilities Management
- `FacilitiesAdminPage` - Manage offices and spaces
- `SpacePermissionsManager` - Configure role-based access
- `MaintenanceTrackerPage` - Track maintenance requests
- `FacilityCalendarView` - Visual booking calendar
- `SpaceConfigModal` - Configure space details

### Validation Rules
- `ValidationRuleBuilder` - Visual rule creation interface
- `RuleTestingPanel` - Test rules against sample data
- `RuleTemplateLibrary` - Pre-built rule templates
- `EntityValidationStatus` - Show validation status on forms

---

## Next Steps

1. Review and approve this design document
2. Create detailed implementation tasks in TODO.md
3. Begin Phase 1: WBS Master Data Management
4. Implement database migrations
5. Build backend API endpoints
6. Create frontend UI components
7. Test and iterate

---

Last Updated: 2025-11-20
