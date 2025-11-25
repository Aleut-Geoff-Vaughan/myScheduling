# Role Permission Matrix

## Overview
This document defines the comprehensive permission matrix for the myScheduling application, outlining what each role can access and modify within the system.

## Role Hierarchy

### System-Level Roles (Global Access)
These roles have cross-tenant privileges and system-wide access:

1. **SystemAdmin** - Full system access, can manage all tenants and users
2. **Support** - Read-only access across all tenants for support purposes
3. **Auditor** - Read-only access to audit logs and reports across all tenants

### Tenant-Level Roles (Scoped to Tenant)
These roles are assigned per tenant and have permissions limited to that tenant's data:

1. **TenantAdmin** - Full administrative access within the tenant
2. **Executive** - View all data, approve overrides, access executive reports
3. **OverrideApprover** - Approve assignment and booking overrides
4. **OfficeManager** - Manage offices, spaces, and hoteling within tenant
5. **ResourceManager** - Manage people, skills, and resource allocation
6. **ProjectManager** - Manage projects, WBS elements, and assignments
7. **TeamLead** - View team data, manage team assignments
8. **Employee** - Standard user access, manage own profile and bookings
9. **ViewOnly** - Read-only access to tenant data

---

## Permission Matrix

### Legend
- ✅ Full Access (Create, Read, Update, Delete)
- 👁️ Read Only
- 📝 Create & Read
- ✏️ Update & Read
- ❌ No Access
- 🔒 Own Data Only

---

## System Administration

| Feature | SystemAdmin | Support | Auditor | TenantAdmin | Other Roles |
|---------|------------|---------|---------|-------------|-------------|
| Manage All Tenants | ✅ | 👁️ | 👁️ | ❌ | ❌ |
| Manage All Users (Cross-Tenant) | ✅ | 👁️ | 👁️ | ❌ | ❌ |
| System Settings | ✅ | 👁️ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | 👁️ | ✅ | 👁️ | ❌ |
| System Health | ✅ | ✅ | 👁️ | 👁️ | ❌ |

---

## Tenant Management

| Feature | SystemAdmin | TenantAdmin | Executive | OfficeManager | Other Roles |
|---------|------------|-------------|-----------|---------------|-------------|
| Tenant Settings | ✅ | ✅ | 👁️ | ❌ | ❌ |
| Tenant Configuration | ✅ | ✅ | 👁️ | ❌ | ❌ |
| Tenant Status | ✅ | ✅ | 👁️ | ❌ | ❌ |

---

## User Management

| Feature | SystemAdmin | TenantAdmin | ResourceManager | Other Roles |
|---------|------------|-------------|-----------------|-------------|
| Add Users to Tenant | ✅ | ✅ | 📝 | ❌ |
| Remove Users from Tenant | ✅ | ✅ | ❌ | ❌ |
| Assign Roles | ✅ | ✅ | ❌ | ❌ |
| Edit User Profile | ✅ | ✅ | ✏️ | 🔒 |
| View All Users in Tenant | ✅ | ✅ | ✅ | 👁️ |
| Deactivate Users | ✅ | ✅ | ❌ | ❌ |

---

## People Management

| Feature | SystemAdmin | TenantAdmin | ResourceManager | ProjectManager | TeamLead | Employee | ViewOnly |
|---------|------------|-------------|-----------------|----------------|----------|----------|----------|
| Create People | ✅ | ✅ | ✅ | 📝 | ❌ | ❌ | ❌ |
| Edit People | ✅ | ✅ | ✅ | ✏️ | ✏️ | 🔒 | ❌ |
| Delete People | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View People | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Skills | ✅ | ✅ | ✅ | 👁️ | 👁️ | 🔒 | 👁️ |
| Manage Certifications | ✅ | ✅ | ✅ | 👁️ | 👁️ | 🔒 | 👁️ |

---

## Project Management

| Feature | SystemAdmin | TenantAdmin | ProjectManager | ResourceManager | TeamLead | Employee | ViewOnly |
|---------|------------|-------------|----------------|-----------------|----------|----------|----------|
| Create Projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit Projects | ✅ | ✅ | ✅ | ✏️ | ❌ | ❌ | ❌ |
| Delete Projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Projects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage WBS Elements | ✅ | ✅ | ✅ | 👁️ | 👁️ | 👁️ | 👁️ |
| Close/Complete Projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Staffing & Assignments

| Feature | SystemAdmin | TenantAdmin | ResourceManager | ProjectManager | TeamLead | Employee | ViewOnly |
|---------|------------|-------------|-----------------|----------------|----------|----------|----------|
| Create Assignments | ✅ | ✅ | ✅ | ✅ | 📝 | ❌ | ❌ |
| Edit Assignments | ✅ | ✅ | ✅ | ✅ | ✏️ | ❌ | ❌ |
| Delete Assignments | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Assignments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Staffing Board | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve Overrides | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Office & Hoteling Management

| Feature | SystemAdmin | TenantAdmin | OfficeManager | ResourceManager | Employee | ViewOnly |
|---------|------------|-------------|---------------|-----------------|----------|----------|
| Create Offices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Offices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Offices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Spaces | ✅ | ✅ | ✅ | ✏️ | ❌ | ❌ |
| Create Bookings | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit Own Bookings | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit Any Booking | ✅ | ✅ | ✅ | ✏️ | ❌ | ❌ |
| View Floor Plans | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Capacity | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Reporting

| Feature | SystemAdmin | TenantAdmin | Executive | ProjectManager | ResourceManager | Other Roles |
|---------|------------|-------------|-----------|----------------|-----------------|-------------|
| View All Reports | ✅ | ✅ | ✅ | 👁️ | 👁️ | ❌ |
| Executive Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Staffing Reports | ✅ | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Project Reports | ✅ | ✅ | ✅ | ✅ | 👁️ | 👁️ |
| Hoteling Reports | ✅ | ✅ | ✅ | 👁️ | 👁️ | 👁️ |
| Export Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## Special Permissions

### Override Approver Role
The **OverrideApprover** role has special permissions:
- Approve assignment conflicts (double-booking)
- Approve booking overrides (capacity exceeded)
- View and resolve approval queues
- Does NOT have standard CRUD permissions on other entities

### Support Role
The **Support** role has special characteristics:
- Read-only access across ALL tenants
- Cannot modify any data
- Can view audit logs for troubleshooting
- Can access system health and diagnostics

### Auditor Role
The **Auditor** role has special characteristics:
- Read-only access to audit trails across ALL tenants
- Read-only access to reports
- Cannot access or modify operational data
- Limited to compliance and audit functions

---

## Role Assignment Rules

### System-Level Roles
- Can only be assigned by **SystemAdmin**
- Are global and not scoped to a specific tenant
- User.IsSystemAdmin = true for SystemAdmin role
- Stored separately from tenant memberships

### Tenant-Level Roles
- Can be assigned by **SystemAdmin** or **TenantAdmin**
- Are stored in TenantMembership.Roles array
- One user can have different roles in different tenants
- A user must have at least ONE role per tenant membership

### Role Combinations
Valid combinations within a single tenant:
- ✅ TenantAdmin (can have this alone or with others)
- ✅ ProjectManager + ResourceManager
- ✅ OfficeManager + ResourceManager
- ✅ TeamLead + Employee
- ❌ ViewOnly + any other role (ViewOnly is exclusive)

---

## Implementation Notes

### Backend (API Controllers)
- All controllers should check user permissions before operations
- Use `[Authorize]` attribute on controllers
- Implement custom authorization policies for each permission
- Return 403 Forbidden for unauthorized access

### Frontend (UI Components)
- Hide UI elements user doesn't have permission to use
- Disable buttons/forms for read-only roles
- Show appropriate error messages for denied actions
- Use role-based routing guards

### Database (EF Core)
- Implement query filters based on user role and tenant
- TenantAdmin can only query their tenant's data
- SystemAdmin bypasses tenant filters
- Soft delete with IsActive flag for audit trail

---

## Next Steps for Implementation

1. **Create Authorization Policies** - Define policies for each permission type
2. **Create Permission Service** - Centralized service to check permissions
3. **Update Controllers** - Add authorization checks to all endpoints
4. **Update UI Components** - Hide/disable based on permissions
5. **Add Permission Tests** - Unit tests for permission logic

---

Last Updated: 2025-11-19
