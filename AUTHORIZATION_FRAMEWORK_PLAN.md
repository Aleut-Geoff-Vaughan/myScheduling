# Zero-Trust Authorization Framework - Implementation Plan

**Created**: 2025-11-23
**Status**: Planning Phase
**Priority**: High - Foundation for Security Model

---

## Executive Summary

This plan outlines the implementation of a comprehensive zero-trust authorization framework for myScheduling. The framework implements explicit permissions, granular access control, soft-delete functionality, and configurable tenant-specific dropdowns.

### Key Principles

1. **Zero Trust**: No implicit access - all permissions must be explicitly granted
2. **Least Privilege**: Users granted minimum permissions required for their role
3. **Defense in Depth**: Multiple layers of authorization checks
4. **Audit Everything**: Complete audit trail of all authorization decisions
5. **Tenant Isolation**: Complete separation between tenant data and permissions

---

## Current State Analysis

### Existing Authorization
✅ **Already Implemented:**
- Multi-tenant architecture with TenantEntity base class
- AppRole enum with 12 roles (Employee → SystemAdmin)
- TenantMembership with role arrays per tenant
- User.IsSystemAdmin flag for platform admin
- Manual authorization checks in some controllers (VerifyUserAccess patterns)

❌ **Gaps Identified:**
- No unified authorization framework
- Inconsistent permission checking across controllers
- Hard deletes throughout application (no soft-delete)
- Only admins can delete (not consistently enforced)
- No object-level permissions (only role-based)
- Hardcoded enums for dropdowns (not tenant-configurable)
- No permission audit logging
- No authorization policy framework

### Data Objects Requiring Authorization

**Core Entities:**
- Person, User, Tenant, TenantMembership
- Project, WbsElement, Assignment, ProjectRole
- Office, Space, Booking, WorkLocationPreference
- ResumeProfile, ResumeSection, ResumeEntry, ResumeVersion
- WorkLocationTemplate, DelegationOfAuthorityLetter
- TeamCalendar, CompanyHoliday
- ValidationRule

**Supporting Entities:**
- Skill, Certification, ResumeTemplate, StoredFile

---

## Architecture Design

### 1. Permission Model

#### Permission Structure
```csharp
public class Permission : BaseEntity
{
    public Guid TenantId { get; set; }  // Null for system-wide
    public string Resource { get; set; }  // "Person", "Project", "WbsElement", etc.
    public Guid? ResourceId { get; set; }  // Null for resource-type level
    public string Action { get; set; }  // "Create", "Read", "Update", "Delete", "Approve", "Manage"
    public PermissionScope Scope { get; set; }

    // Subject (who has permission)
    public Guid? UserId { get; set; }
    public Guid? RoleId { get; set; }  // Maps to AppRole

    // Constraints
    public string? Conditions { get; set; }  // JSON: {"field": "status", "operator": "eq", "value": "Draft"}
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }

    // Navigation
    public virtual Tenant? Tenant { get; set; }
    public virtual User? User { get; set; }
}

public enum PermissionScope
{
    System,      // System-wide (platform admin)
    Tenant,      // Entire tenant
    Department,  // Department/team level
    Individual,  // Specific resource
    Owner        // Own resources only
}

public enum PermissionAction
{
    Create,
    Read,
    Update,
    Delete,
    Approve,
    Manage,     // Full CRUD + special actions
    Export,
    Import
}
```

#### Role-Permission Mapping
```csharp
public class RolePermissionTemplate : BaseEntity
{
    public Guid? TenantId { get; set; }  // Null for system templates
    public AppRole Role { get; set; }
    public string Resource { get; set; }
    public List<PermissionAction> AllowedActions { get; set; }
    public PermissionScope DefaultScope { get; set; }
    public string? DefaultConditions { get; set; }
    public bool IsSystemTemplate { get; set; }
}
```

### 2. Admin Types

#### Platform Admin (SystemAdmin)
- Access to ALL tenants and ALL data
- Can manage users across tenants
- Can configure system-wide settings
- Can view audit logs across all tenants
- Flag: `User.IsSystemAdmin = true`
- Role: `AppRole.SystemAdmin`

#### Tenant Admin (TenantAdmin)
- Access to specific tenant(s) only
- Can manage users within their tenant
- Can configure tenant-specific settings
- Can view audit logs for their tenant
- Can soft-delete any record in tenant
- Can hard-delete if explicitly granted
- Role: `AppRole.TenantAdmin` in TenantMembership

### 3. Soft Delete Implementation

#### Base Entity Changes
```csharp
public abstract class BaseEntity
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public Guid? UpdatedByUserId { get; set; }

    // NEW: Soft Delete Fields
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }
    public string? DeletionReason { get; set; }
}
```

#### Query Filters
```csharp
// Global query filter in DbContext
modelBuilder.Entity<BaseEntity>()
    .HasQueryFilter(e => !e.IsDeleted);
```

#### Delete Operations
- **Regular Users**: Cannot delete (401 Unauthorized)
- **Managers/TenantAdmin**: Soft delete only (`IsDeleted = true`)
- **Platform Admin**: Can choose soft or hard delete
- **API Endpoints**:
  - `DELETE /api/{resource}/{id}` - Soft delete (requires Admin)
  - `DELETE /api/{resource}/{id}/hard` - Hard delete (requires SystemAdmin)
  - `POST /api/{resource}/{id}/restore` - Restore soft-deleted (requires Admin)

### 4. Authorization Service

```csharp
public interface IAuthorizationService
{
    // Core permission checks
    Task<bool> CanAsync(Guid userId, string resource, PermissionAction action, Guid? resourceId = null);
    Task<AuthorizationResult> CheckAsync(Guid userId, string resource, PermissionAction action, Guid? resourceId = null);

    // Bulk operations
    Task<Dictionary<Guid, bool>> CanBulkAsync(Guid userId, string resource, PermissionAction action, List<Guid> resourceIds);

    // Permission management
    Task GrantPermissionAsync(Guid userId, string resource, PermissionAction action, PermissionScope scope, Guid? resourceId = null);
    Task RevokePermissionAsync(Guid permissionId);
    Task<List<Permission>> GetUserPermissionsAsync(Guid userId, Guid? tenantId = null);

    // Role templates
    Task ApplyRoleTemplateAsync(Guid userId, AppRole role, Guid tenantId);
    Task<List<Permission>> GetRolePermissionsAsync(AppRole role, Guid? tenantId = null);
}

public class AuthorizationResult
{
    public bool IsAuthorized { get; set; }
    public string? Reason { get; set; }
    public PermissionScope? GrantedScope { get; set; }
    public List<string> MissingPermissions { get; set; } = new();
}
```

### 5. Authorization Attributes

```csharp
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequiresPermissionAttribute : Attribute
{
    public string Resource { get; set; }
    public PermissionAction Action { get; set; }
    public bool AllowSystemAdmin { get; set; } = true;
    public bool AllowTenantAdmin { get; set; } = true;
}

// Usage:
[RequiresPermission(Resource = "Person", Action = PermissionAction.Create)]
public async Task<IActionResult> CreatePerson([FromBody] CreatePersonRequest request)
{
    // Implementation
}
```

### 6. Audit Logging

```csharp
public class AuthorizationAuditLog : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? TenantId { get; set; }
    public string Resource { get; set; }
    public Guid? ResourceId { get; set; }
    public PermissionAction Action { get; set; }
    public bool WasAllowed { get; set; }
    public string? DenialReason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual Tenant? Tenant { get; set; }
}
```

---

## Configurable Dropdowns

### Current Enums to Make Configurable

#### High Priority (Tenant-Specific Business Logic)
1. **PersonType** - Employee, Contractor, Vendor, External
2. **PersonStatus** - Active, Terminated, LOA, Inactive
3. **WbsType** - Billable, NonBillable, B&P, Overhead, G&A
4. **SpaceType** - Desk, HotDesk, Office, Cubicle, Conference Room, etc.
5. **WorkLocationType** - Remote, Remote Plus, Client Site, Office, PTO
6. **HolidayType** - Federal, Company, Religious, Cultural, Regional
7. **MaintenanceType** - Routine, Repair, Inspection, Cleaning, Equipment, Safety
8. **ResumeTemplateType** - Federal, Commercial, Executive, Technical, Academic, Custom

#### Medium Priority (May vary by organization)
9. **ProjectRoleStatus** - Draft, Open, Filled, Closed
10. **OfficeStatus** - Active, Inactive
11. **BookingStatus** - Reserved, CheckedIn, Completed, Cancelled, NoShow
12. **MaintenanceStatus** - Reported, Scheduled, InProgress, Completed, Cancelled

#### Low Priority (Standard workflow states)
13. **ProjectStatus** - Draft, Active, Closed
14. **AssignmentStatus** - Draft, Requested, PendingApproval, Active, Completed, Cancelled, Rejected
15. **WbsStatus** - Draft, Active, Closed
16. **WbsApprovalStatus** - Draft, PendingApproval, Approved, Rejected, Suspended, Closed
17. **ResumeStatus** - Draft, PendingReview, Approved, ChangesRequested, Active, Archived
18. **ApprovalStatus** - Pending, Approved, Rejected, ChangesRequested, Cancelled

### Dropdown Configuration Model

```csharp
public class TenantDropdownConfiguration : TenantEntity
{
    public string Category { get; set; }  // "PersonType", "WbsType", etc.
    public List<DropdownOption> Options { get; set; } = new();
    public bool AllowCustomValues { get; set; }
    public bool IsActive { get; set; } = true;
}

public class DropdownOption
{
    public string Value { get; set; }  // Internal value (e.g., "Employee")
    public string Label { get; set; }  // Display label
    public string? Description { get; set; }
    public string? Icon { get; set; }  // Icon identifier
    public string? Color { get; set; }  // Color code for badges
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = false;
    public Dictionary<string, string>? Metadata { get; set; }  // Additional properties
}
```

### API Endpoints

```
GET    /api/tenants/{tenantId}/dropdowns
GET    /api/tenants/{tenantId}/dropdowns/{category}
POST   /api/tenants/{tenantId}/dropdowns
PUT    /api/tenants/{tenantId}/dropdowns/{id}
DELETE /api/tenants/{tenantId}/dropdowns/{id}
POST   /api/tenants/{tenantId}/dropdowns/{id}/options
PUT    /api/tenants/{tenantId}/dropdowns/{id}/options/{optionId}
DELETE /api/tenants/{tenantId}/dropdowns/{id}/options/{optionId}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1) - HIGH PRIORITY

#### 1.1 Database Schema Changes
- [ ] Add soft delete fields to BaseEntity
- [ ] Create Permission entity and tables
- [ ] Create RolePermissionTemplate entity
- [ ] Create AuthorizationAuditLog entity
- [ ] Create TenantDropdownConfiguration entity
- [ ] Create migration script
- [ ] Add global query filters for soft deletes

**Files to Create/Modify:**
- `backend/src/MyScheduling.Core/Entities/BaseEntity.cs`
- `backend/src/MyScheduling.Core/Entities/Permission.cs` (new)
- `backend/src/MyScheduling.Core/Entities/RolePermissionTemplate.cs` (new)
- `backend/src/MyScheduling.Core/Entities/AuthorizationAuditLog.cs` (new)
- `backend/src/MyScheduling.Core/Entities/TenantDropdownConfiguration.cs` (new)
- `backend/src/MyScheduling.Infrastructure/Data/MySchedulingDbContext.cs`

#### 1.2 Authorization Service Implementation
- [ ] Create IAuthorizationService interface
- [ ] Implement AuthorizationService
- [ ] Add dependency injection registration
- [ ] Create authorization middleware
- [ ] Implement RequiresPermissionAttribute

**Files to Create:**
- `backend/src/MyScheduling.Core/Interfaces/IAuthorizationService.cs`
- `backend/src/MyScheduling.Core/Services/AuthorizationService.cs`
- `backend/src/MyScheduling.Api/Middleware/AuthorizationMiddleware.cs`
- `backend/src/MyScheduling.Api/Attributes/RequiresPermissionAttribute.cs`

#### 1.3 Seed Default Permissions
- [ ] Create permission seed data for each AppRole
- [ ] Platform Admin gets all permissions
- [ ] Tenant Admin gets tenant-scoped permissions
- [ ] Configure role templates
- [ ] Seed initial dropdown configurations

**Files to Create:**
- `backend/src/MyScheduling.Infrastructure/Data/Seeds/PermissionSeeder.cs`
- `backend/src/MyScheduling.Infrastructure/Data/Seeds/DropdownSeeder.cs`

**Estimated Time**: 3-4 days

---

### Phase 2: Core Authorization (Week 2) - HIGH PRIORITY

#### 2.1 Implement Permission Checks in Controllers
Priority order based on usage:
1. [ ] **PeopleController** - Most frequently used
2. [ ] **ProjectsController** - Business critical
3. [ ] **WbsController** - Complex approval workflow
4. [ ] **AssignmentsController** - Staffing operations
5. [ ] **WorkLocationPreferencesController** - Daily usage
6. [ ] **BookingsController** - Hoteling
7. [ ] **ResumesController** - Resume management
8. [ ] **UsersController** - Admin only
9. [ ] **TenantsController** - Platform admin only
10. [ ] Remaining controllers (lower priority)

**Pattern for Each Controller:**
```csharp
[ApiController]
[Route("api/[controller]")]
public class PeopleController : ControllerBase
{
    private readonly IAuthorizationService _authService;

    [RequiresPermission(Resource = "Person", Action = PermissionAction.Read)]
    [HttpGet]
    public async Task<IActionResult> GetPeople([FromQuery] Guid tenantId)
    {
        var canRead = await _authService.CanAsync(
            GetCurrentUserId(),
            "Person",
            PermissionAction.Read
        );

        if (!canRead)
            return Forbid();

        // Implementation
    }
}
```

#### 2.2 Soft Delete Implementation
- [ ] Update all DELETE endpoints to soft delete
- [ ] Add `/hard` endpoints for platform admin
- [ ] Add `/restore` endpoints
- [ ] Update queries to respect IsDeleted flag
- [ ] Add UI indicators for soft-deleted items

**Files to Modify:**
- All controller `Delete` methods
- All repository/service layer delete methods

#### 2.3 Audit Logging
- [ ] Implement audit logging in AuthorizationService
- [ ] Log all authorization decisions
- [ ] Create audit log viewer API
- [ ] Create audit log UI (admin only)

**Files to Create:**
- `backend/src/MyScheduling.Api/Controllers/AuditLogsController.cs`
- `frontend/src/pages/AuditLogPage.tsx`

**Estimated Time**: 5-6 days

---

### Phase 3: Dropdown Configuration (Week 3) - MEDIUM PRIORITY

#### 3.1 Backend API
- [ ] Create DropdownsController
- [ ] Implement CRUD operations
- [ ] Add validation for dropdown options
- [ ] Create service layer
- [ ] Add caching for performance

**Files to Create:**
- `backend/src/MyScheduling.Api/Controllers/DropdownsController.cs`
- `backend/src/MyScheduling.Core/Services/DropdownConfigurationService.cs`

#### 3.2 Migration Strategy
- [ ] Create migration script to convert existing enum usages
- [ ] Seed default dropdown configs from current enums
- [ ] Add fallback mechanism for missing configs
- [ ] Update validation to use dropdown configs

#### 3.3 Frontend Implementation
- [ ] Create dropdown configuration UI
- [ ] Add dropdown admin page
- [ ] Update all dropdowns to use API
- [ ] Add caching and offline support
- [ ] Create dropdown editor component

**Files to Create:**
- `frontend/src/pages/DropdownConfigPage.tsx`
- `frontend/src/components/DropdownEditor.tsx`
- `frontend/src/services/dropdownService.ts`
- `frontend/src/hooks/useDropdowns.ts`

**Estimated Time**: 4-5 days

---

### Phase 4: Testing & Polish (Week 4) - CRITICAL

#### 4.1 Unit Tests
- [ ] AuthorizationService tests
- [ ] Permission resolution tests
- [ ] Soft delete tests
- [ ] Dropdown configuration tests

#### 4.2 Integration Tests
- [ ] End-to-end permission flows
- [ ] Cross-tenant isolation tests
- [ ] Admin override scenarios
- [ ] Audit logging verification

#### 4.3 Documentation
- [ ] Update API documentation
- [ ] Create authorization guide
- [ ] Document permission model
- [ ] Create admin user guide
- [ ] Update deployment guide

**Estimated Time**: 3-4 days

---

## Security Considerations

### Permission Resolution Order
1. **System Admin Check**: If `User.IsSystemAdmin`, allow all
2. **Tenant Admin Check**: If `TenantAdmin` role in tenant, allow all in tenant
3. **Explicit Permission Check**: Check Permission table for user/resource/action
4. **Role Permission Check**: Check RolePermissionTemplate for user's roles
5. **Conditional Permission Check**: Evaluate conditions if present
6. **Ownership Check**: If PermissionScope.Owner, verify resource ownership
7. **Default Deny**: If no permission found, deny

### Caching Strategy
- Cache user permissions for 5 minutes
- Cache role templates indefinitely (invalidate on change)
- Cache dropdown configurations per tenant (invalidate on change)
- Use distributed cache (Redis) for production

### Performance Optimization
- Batch permission checks where possible
- Use database indexes on Permission queries
- Implement permission denormalization for hot paths
- Add query result caching

---

## Migration Strategy

### Backward Compatibility
1. **Phase 1**: Run new authorization alongside existing checks (log only)
2. **Phase 2**: Enable new authorization, fallback to old if fails
3. **Phase 3**: Full cutover, remove old authorization code
4. **Phase 4**: Cleanup and optimization

### Data Migration
1. Extract existing role assignments
2. Generate permissions from role templates
3. Verify no permission loss
4. Run parallel for 1 week
5. Full cutover with rollback plan

---

## Success Metrics

### Security Metrics
- ✅ 100% of endpoints protected by authorization
- ✅ Zero cross-tenant data leaks
- ✅ All authorization decisions logged
- ✅ Average permission check < 50ms

### User Experience
- ✅ Configurable dropdowns reduce support tickets by 30%
- ✅ Granular permissions reduce accidental changes
- ✅ Soft delete enables data recovery
- ✅ Admin users can self-service permission changes

### Technical Metrics
- ✅ Authorization service test coverage > 90%
- ✅ No N+1 queries in permission checks
- ✅ Permission cache hit rate > 95%
- ✅ Audit logs retained for 2 years

---

## Risk Assessment

### High Risk
- **Database Migration**: Extensive schema changes
  - *Mitigation*: Comprehensive testing, staged rollout
- **Performance Impact**: Permission checks on every request
  - *Mitigation*: Aggressive caching, query optimization
- **Breaking Changes**: API contract changes
  - *Mitigation*: Versioned API, backward compatibility period

### Medium Risk
- **Complexity**: More complex authorization logic
  - *Mitigation*: Clear documentation, helper utilities
- **Dropdown Migration**: Converting hardcoded enums
  - *Mitigation*: Automated migration scripts, fallbacks

### Low Risk
- **User Training**: New permission model
  - *Mitigation*: Comprehensive documentation, admin guide
- **Testing Coverage**: Ensuring all scenarios tested
  - *Mitigation*: Test-driven development approach

---

## Open Questions

1. **Permission Inheritance**: Should permissions inherit down organizational hierarchy?
2. **Delegation**: Should users be able to delegate permissions temporarily?
3. **Time-Based Permissions**: Should permissions have start/end dates beyond expiration?
4. **Approval Workflows**: Should permission changes require approval?
5. **External Systems**: How do we handle permissions for API integrations?

---

## Resource Requirements

### Development Team
- 1 Senior Backend Developer (4 weeks)
- 1 Frontend Developer (2 weeks for UI)
- 1 QA Engineer (1 week for testing)
- 1 DevOps (3 days for deployment)

### Infrastructure
- Database migration window (2 hours estimated)
- Redis instance for distributed caching
- Additional storage for audit logs

---

## Appendix A: Permission Matrix

| Role | Person | Project | WBS | Assignment | Booking | Resume | Admin |
|------|--------|---------|-----|------------|---------|--------|-------|
| **Employee** | Read Own | Read All | Read Assigned | Read Own | CRUD Own | CRUD Own | None |
| **ViewOnly** | Read All | Read All | Read All | Read All | Read All | Read All | None |
| **TeamLead** | Read Team | Read All | Read All | Manage Team | Read All | Read Team | None |
| **ProjectManager** | Read All | CRUD | CRUD | Approve All | Read All | Read All | None |
| **ResourceManager** | CRUD | Read All | Read All | CRUD All | Read All | Read All | None |
| **OfficeManager** | Read All | Read All | Read All | Read All | CRUD All | Read All | Facilities |
| **TenantAdmin** | CRUD All | CRUD All | CRUD All | CRUD All | CRUD All | CRUD All | Tenant |
| **SystemAdmin** | ALL | ALL | ALL | ALL | ALL | ALL | System |

---

## Appendix B: Default Role Templates

See implementation in seed data for complete role-permission mappings.

---

**Document Owner**: Development Team
**Last Updated**: 2025-11-23
**Next Review**: After Phase 1 completion
