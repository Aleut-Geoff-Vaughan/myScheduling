# Multi-Tenant Authentication & Authorization Design

## Overview
This document outlines the redesigned authentication and user management system for the Aleut Staffing application to support:
- Users accessing multiple tenants with different roles per tenant
- System administrators with platform-wide access
- Clean separation between admin console and tenant workspaces

---

## Current Problems

1. **Single-Tenant Users**: Users are bound to ONE tenant via `TenantEntity.TenantId`
2. **No Cross-Tenant Access**: Cannot grant user access to multiple organizations
3. **Tenant-Scoped Admin**: SysAdmin role is tenant-scoped, not system-wide
4. **Confusing Login**: Current login requires tenant selection before authentication

---

## Proposed Architecture

### 1. Database Schema Changes

#### A. Remove TenantId from User Entity
```csharp
public class User : BaseEntity  // No longer extends TenantEntity
{
    public string EntraObjectId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsSystemAdmin { get; set; } = false;  // NEW: Platform-wide admin flag
    public DateTime? LastLoginAt { get; set; }

    // Navigation properties
    public virtual ICollection<TenantMembership> TenantMemberships { get; set; } = new List<TenantMembership>();
}
```

#### B. Create TenantMembership Entity (Many-to-Many with Roles)
```csharp
public class TenantMembership : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public List<AppRole> Roles { get; set; } = new();  // Roles within this tenant
    public DateTime JoinedAt { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual Tenant Tenant { get; set; } = null!;
}
```

#### C. Update AppRole Enum
```csharp
public enum AppRole
{
    // Tenant-level roles
    Employee,
    ProjectManager,
    ResourceManager,
    OfficeManager,
    Executive,
    OverrideApprover,

    // Note: SystemAdmin is now a User flag, not a role
}
```

#### D. Remove RoleAssignment Entity
- No longer needed; roles are stored in `TenantMembership.Roles` as a JSON array

---

### 2. Authentication Flow

#### Step 1: Login (No Tenant Selection)
```
┌─────────────────────────────────┐
│     Aleut Staffing Login        │
│                                 │
│  Email:    ________________     │
│  Password: ________________     │
│                                 │
│         [ Sign In ]             │
└─────────────────────────────────┘
```

**Backend Logic:**
```csharp
// POST /api/auth/login
public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
{
    var user = await _context.Users
        .Include(u => u.TenantMemberships)
            .ThenInclude(tm => tm.Tenant)
        .FirstOrDefaultAsync(u => u.Email == request.Email);

    if (user == null) return Unauthorized();

    // Validate password (implement proper hashing)

    return new LoginResponse
    {
        UserId = user.Id,
        Email = user.Email,
        DisplayName = user.DisplayName,
        IsSystemAdmin = user.IsSystemAdmin,
        TenantAccess = user.TenantMemberships
            .Where(tm => tm.IsActive)
            .Select(tm => new TenantAccessInfo
            {
                TenantId = tm.TenantId,
                TenantName = tm.Tenant.Name,
                Roles = tm.Roles
            })
            .ToList()
    };
}
```

#### Step 2: Workspace Selector
```
┌──────────────────────────────────────────┐
│     Welcome, John Smith                  │
│     Select Your Workspace                │
├──────────────────────────────────────────┤
│                                          │
│  🛠️  Admin Console                       │
│     System administration and settings   │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  🏢  Aleut Federal                       │
│     Project Manager, Resource Manager    │
│                                          │
│  🏢  Aleut Construction                  │
│     Employee                             │
│                                          │
│  🏢  Aleut IT Services                   │
│     Executive, Project Manager           │
│                                          │
└──────────────────────────────────────────┘
```

**Frontend Logic:**
```typescript
interface LoginResponse {
  userId: string;
  email: string;
  displayName: string;
  isSystemAdmin: boolean;
  tenantAccess: TenantAccessInfo[];
}

interface TenantAccessInfo {
  tenantId: string;
  tenantName: string;
  roles: AppRole[];
}

// After login, show WorkspaceSelectorPage
// User chooses Admin Console OR a Tenant
// Store selection in auth state
```

#### Step 3: Enter Application
Once workspace is selected:
- **Admin Console**: Full platform access, manage all tenants
- **Tenant Workspace**: Scoped to selected tenant, roles determine permissions

---

### 3. Authorization Patterns

#### A. System Admin Check
```csharp
[ApiController]
[RequireSystemAdmin]  // Custom attribute
public class SystemAdminController : ControllerBase
{
    // Only accessible to IsSystemAdmin = true users
}
```

#### B. Tenant Access Check
```csharp
[ApiController]
[RequireTenantAccess]  // Validates user has membership in current tenant
public class ProjectsController : ControllerBase
{
    // User must have active membership in the tenant they're accessing
}
```

#### C. Role-Based Check within Tenant
```csharp
[HttpPost]
[RequireRole(AppRole.ProjectManager)]
public async Task<ActionResult> CreateProject(Project project)
{
    // User must have ProjectManager role in current tenant
}
```

---

### 4. Frontend State Management

```typescript
interface AuthState {
  user: {
    id: string;
    email: string;
    displayName: string;
    isSystemAdmin: boolean;
  } | null;

  // Workspace context
  currentWorkspace: {
    type: 'admin' | 'tenant';
    tenantId?: string;
    tenantName?: string;
    roles?: AppRole[];
  } | null;

  // Available workspaces
  availableWorkspaces: {
    adminConsole: boolean;
    tenants: TenantAccessInfo[];
  };

  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  selectWorkspace: (workspace: WorkspaceSelection) => void;
  switchWorkspace: () => void;  // Go back to selector
  logout: () => void;
}
```

---

### 5. Migration Strategy

#### Phase 1: Database Migration
1. Add `IsSystemAdmin` column to Users table
2. Create new `TenantMemberships` table
3. Migrate existing user-tenant relationships:
   ```sql
   -- For each existing User with TenantId
   INSERT INTO TenantMemberships (UserId, TenantId, Roles, IsActive)
   SELECT Id, TenantId, '[]', true  -- Empty roles initially
   FROM Users
   WHERE TenantId IS NOT NULL;

   -- Migrate existing RoleAssignments to TenantMemberships
   ```
4. Remove `TenantId` column from Users (make nullable first, then drop)
5. Drop `RoleAssignments` table

#### Phase 2: Backend Updates
1. Update User entity model
2. Create TenantMembership entity and DbSet
3. Update AuthController with new login logic
4. Create WorkspaceController for tenant selection
5. Implement authorization attributes
6. Update existing controllers to use TenantMembership

#### Phase 3: Frontend Updates
1. Remove tenant dropdown from LoginPage
2. Create WorkspaceSelectorPage
3. Update routing to include workspace selection
4. Update authStore with workspace context
5. Add workspace switcher in navigation
6. Update ProtectedRoute to check workspace selection

---

### 6. Example User Scenarios

#### Scenario A: John - Multi-Tenant Project Manager
- **Tenants**: Aleut Federal (ProjectManager), Aleut Construction (ResourceManager)
- **Login**: enters email/password
- **Selector**: sees 2 tenant options
- **Selects**: Aleut Federal
- **Context**: Logged in as ProjectManager in Aleut Federal only
- **Can Switch**: Yes, back to selector to choose Aleut Construction

#### Scenario B: Sarah - System Administrator
- **IsSystemAdmin**: true
- **Tenants**: None (doesn't need tenant memberships)
- **Login**: enters email/password
- **Selector**: sees Admin Console option
- **Selects**: Admin Console
- **Context**: Full platform access
- **Can**: Create tenants, manage all users, view all data

#### Scenario C: Mike - Admin + Tenant User
- **IsSystemAdmin**: true
- **Tenants**: Aleut IT Services (Executive)
- **Login**: enters email/password
- **Selector**: sees Admin Console + Aleut IT Services
- **Can**: Choose to work in admin mode OR as executive in his tenant

---

### 7. API Endpoints

```
POST   /api/auth/login                    # Email/password authentication
POST   /api/auth/logout                   # Clear session
GET    /api/auth/me                       # Current user info
POST   /api/auth/select-workspace         # Choose admin console or tenant

GET    /api/workspaces                    # List available workspaces for user
POST   /api/workspaces/switch             # Switch between workspaces

# Admin Console APIs (require IsSystemAdmin)
GET    /api/admin/tenants                 # All tenants
POST   /api/admin/tenants                 # Create tenant
GET    /api/admin/users                   # All users across system
POST   /api/admin/users                   # Create user
POST   /api/admin/users/{id}/tenants      # Grant user access to tenant
DELETE /api/admin/users/{id}/tenants/{tenantId}  # Revoke access

# Tenant-scoped APIs (require TenantMembership)
GET    /api/tenants/{tenantId}/projects   # Projects in tenant
POST   /api/tenants/{tenantId}/people     # Add person to tenant
```

---

### 8. UI/UX Improvements

#### Navigation Bar - Workspace Context Display
```
┌─────────────────────────────────────────────────────┐
│  Aleut Staffing │ [Aleut Federal ▼] │ John Smith ▼ │
└─────────────────────────────────────────────────────┘
                         │
                         ├─ Aleut Federal (current)
                         ├─ Aleut Construction
                         ├─ Aleut IT Services
                         ├─ Admin Console
                         └─ Switch Workspace
```

#### Workspace Switcher Modal
- Quick-switch without going through login again
- Shows current workspace with checkmark
- Lists all available workspaces

---

## Benefits of This Design

1. **Flexible Access**: Users can work across multiple organizations
2. **Clear Admin Separation**: System admins have dedicated console
3. **Scalable**: Easy to grant/revoke tenant access
4. **Intuitive UX**: Clear workspace context at all times
5. **Secure**: Tenant data is isolated unless user has explicit membership
6. **Role Granularity**: Different roles per tenant for same user

---

## Questions for Review

1. Should we allow users to have NO tenant access (system admin only)?
2. Should we auto-select workspace if user only has one option?
3. Do we need audit logging for workspace switches?
4. Should tenant roles be stored as JSON array or separate junction table?
5. Do we want "default workspace" preference for users with multiple tenants?

---

## Implementation Checklist

### Backend
- [ ] Create EF Core migration for schema changes
- [ ] Update User entity (add IsSystemAdmin, remove TenantId)
- [ ] Create TenantMembership entity
- [ ] Create data migration script
- [ ] Update AuthController login endpoint
- [ ] Create WorkspaceController
- [ ] Implement RequireSystemAdmin attribute
- [ ] Implement RequireTenantAccess attribute
- [ ] Update existing controllers with tenant scoping
- [ ] Add workspace context to HTTP context

### Frontend
- [ ] Remove tenant dropdown from LoginPage
- [ ] Create WorkspaceSelectorPage component
- [ ] Update authStore with workspace context
- [ ] Update routing (login → selector → app)
- [ ] Create workspace switcher component
- [ ] Add workspace display to navigation
- [ ] Update ProtectedRoute logic
- [ ] Update API client to include workspace context
- [ ] Add workspace types to TypeScript interfaces

### Testing
- [ ] Test multi-tenant user login
- [ ] Test system admin login
- [ ] Test workspace switching
- [ ] Test authorization per workspace
- [ ] Test tenant data isolation
- [ ] Test migration script with sample data

---

**Next Steps**: Review this design and provide feedback before implementation begins.
