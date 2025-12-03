# Staffing Module Test Plan

## Overview

This document provides a comprehensive test plan for the Staffing Module. It covers all phases of the implementation and can be used for manual QA testing, user acceptance testing (UAT), and as a basis for automated test development.

**Test Environment:**
- Backend: http://localhost:5107 (Development mode)
- Frontend: http://localhost:5173
- Database: PostgreSQL

---

## 1. Foundation Tests (Phase 1)

### 1.1 Career Job Families

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CJF-001 | Create career job family | 1. Navigate to Admin > Staffing > Career Families<br>2. Click "Add New"<br>3. Fill in Name, Code, Description<br>4. Save | Record created, appears in list |
| CJF-002 | Edit career job family | 1. Click on existing record<br>2. Modify name<br>3. Save | Changes persisted |
| CJF-003 | Delete career job family | 1. Select record with no assignments<br>2. Click Delete<br>3. Confirm | Record removed from list |
| CJF-004 | Delete prevention | 1. Try to delete family with active assignments | Error message displayed, deletion prevented |
| CJF-005 | Sort order | 1. Create multiple families<br>2. Adjust sort order<br>3. Refresh page | List maintains custom sort order |

### 1.2 Subcontractor Companies

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SUB-001 | Create company | 1. Navigate to Admin > Staffing > Subcontractors<br>2. Click "Add Company"<br>3. Fill required fields (Name)<br>4. Save | Company created |
| SUB-002 | Full company creation | 1. Add company with all fields<br>2. Include contract dates, contact info | All data saved correctly |
| SUB-003 | Change company status | 1. Edit company<br>2. Change status to Inactive<br>3. Save | Status updated, subcontractors may be affected |
| SUB-004 | Add subcontractor | 1. Select company<br>2. Add new subcontractor<br>3. Fill name, email, position | Subcontractor created under company |
| SUB-005 | Subcontractor status | 1. Change subcontractor to Inactive | Subcontractor excluded from assignment dropdowns |

### 1.3 Labor Categories

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LC-001 | Create labor category | 1. Navigate to project context<br>2. Add labor category<br>3. Enter Name, Code, Bill Rate | Category created for project |
| LC-002 | Project isolation | 1. Create category for Project A<br>2. View Project B labor categories | Category only visible in Project A |
| LC-003 | Rate validation | 1. Enter negative bill rate | Validation error displayed |
| LC-004 | Deactivate category | 1. Deactivate category in use | Warning shown, existing assignments unaffected |

---

## 2. Role Assignment Tests (Phase 2)

### 2.1 Project Role Assignments

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| PRA-001 | Assign employee | 1. Navigate to Admin > Staffing > Role Assignments<br>2. Create new assignment<br>3. Select Project, WBS, Employee<br>4. Set dates and position title | Assignment created with employee |
| PRA-002 | Assign subcontractor | 1. Create assignment<br>2. Select subcontractor instead of employee | Assignment shows subcontractor info |
| PRA-003 | Create TBD position | 1. Create assignment<br>2. Mark as TBD<br>3. Enter TBD description | TBD assignment visible with description |
| PRA-004 | Fill TBD position | 1. Edit TBD assignment<br>2. Assign to employee<br>3. Uncheck TBD | Assignment updated, TBD cleared |
| PRA-005 | Overlapping dates | 1. Assign same employee to same project<br>2. Use overlapping dates | Warning shown about potential conflict |
| PRA-006 | End date validation | 1. Set end date before start date | Validation error |
| PRA-007 | Labor category assignment | 1. Create assignment<br>2. Select labor category<br>3. Verify bill rate populated | Labor category linked, rate visible |
| PRA-008 | Filter by project | 1. Select project filter<br>2. View assignments | Only selected project assignments shown |
| PRA-009 | Filter by TBD | 1. Enable TBD filter | Only TBD assignments displayed |
| PRA-010 | Bulk status change | 1. Select multiple assignments<br>2. Change status to Completed | All selected assignments updated |

---

## 3. Forecasting Tests (Phase 3)

### 3.1 Forecast Versions

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| FV-001 | Create forecast version | 1. Navigate to Admin > Staffing > Versions<br>2. Create new version<br>3. Select type (WhatIf) | Version created |
| FV-002 | Clone version | 1. Select existing version<br>2. Click Clone<br>3. Enter new name | New version with copied forecasts |
| FV-003 | Promote version | 1. Select WhatIf version<br>2. Click Promote to Current | Version becomes Current, old Current archived |
| FV-004 | Archive version | 1. Archive version | Version marked archived, excluded from active lists |
| FV-005 | Single current version | 1. Verify only one Current version exists | Database constraint enforced |
| FV-006 | Compare versions | 1. Select two versions<br>2. Click Compare | Modal shows differences with additions/removals/changes |

### 3.2 Forecasts

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| FC-001 | Create forecast | 1. Navigate to Admin > Staffing > Forecasts<br>2. Create forecast for assignment<br>3. Enter year, month, hours | Forecast created |
| FC-002 | Edit forecast hours | 1. Double-click forecast cell<br>2. Change hours<br>3. Save | Hours updated, history recorded |
| FC-003 | Forecast validation | 1. Enter hours > 200 for single month | Warning about excessive hours |
| FC-004 | Negative hours | 1. Enter negative hours | Validation error |
| FC-005 | Duplicate prevention | 1. Create forecast for same assignment/year/month | Error: duplicate forecast exists |
| FC-006 | Bulk entry | 1. Select multiple assignments<br>2. Enter hours for month range | Forecasts created for all selections |
| FC-007 | Filter by project | 1. Filter forecasts by project | Only selected project forecasts shown |
| FC-008 | Filter by year/month | 1. Set year/month filters | Grid updates to show selected period |
| FC-009 | Grid view | 1. Switch to grid view | Spreadsheet-style editing available |
| FC-010 | List view | 1. Switch to list view | Traditional table format |

---

## 4. Approval Workflow Tests (Phase 4)

### 4.1 Forecast Submission

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| APR-001 | Submit forecast | 1. Select Draft forecast<br>2. Click Submit | Status changes to Submitted |
| APR-002 | Bulk submit | 1. Select multiple Draft forecasts<br>2. Submit all | All change to Submitted |
| APR-003 | Submit validation | 1. Try to submit forecast with 0 hours | Warning shown |
| APR-004 | Recall submission | 1. Recall Submitted forecast | Returns to Draft |

### 4.2 Approval Actions

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| APR-005 | Approve forecast | 1. Navigate to Manager > Forecast Approvals<br>2. Select Submitted forecast<br>3. Approve | Status changes to Approved |
| APR-006 | Reject forecast | 1. Reject forecast<br>2. Enter rejection reason | Status changes to Rejected, notes saved |
| APR-007 | Request revision | 1. Request revision<br>2. Enter comments | Status changes to RevisionRequested |
| APR-008 | Bulk approve | 1. Select multiple forecasts<br>2. Approve all | All approved |
| APR-009 | Override approval | 1. As OverrideApprover<br>2. Override Rejected forecast | Forecast approved with override flag |

### 4.3 Approval Schedule

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| APR-010 | Create schedule | 1. Navigate to Admin > Staffing > Forecast Schedules<br>2. Create schedule with submit/approval deadlines | Schedule created |
| APR-011 | Schedule notifications | 1. Verify deadline approaching | (Future) Email notifications sent |

---

## 5. Version Management Tests (Phase 5)

### 5.1 Version Comparison

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| VER-001 | Compare two versions | 1. Select version<br>2. Choose comparison version<br>3. View comparison modal | Shows added, removed, modified forecasts |
| VER-002 | Identify changes | 1. Modify forecasts in WhatIf version<br>2. Compare to Current | Changes highlighted with hours difference |
| VER-003 | Empty comparison | 1. Compare identical versions | "No differences" message shown |

### 5.2 Version Types

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| VER-004 | Current version | 1. Verify Current version is default for reports | Dashboard uses Current version data |
| VER-005 | WhatIf scenarios | 1. Create WhatIf version<br>2. Make changes<br>3. Promote when ready | Scenario workflow supported |
| VER-006 | Historical versions | 1. Archive old Current version | Becomes Historical type |
| VER-007 | Import versions | 1. Import creates Import type version | Properly categorized |

---

## 6. Import/Export Tests (Phase 6)

### 6.1 Export

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| EXP-001 | Export CSV | 1. Navigate to Admin > Staffing > Import/Export<br>2. Select Export tab<br>3. Choose CSV format<br>4. Download | CSV file downloaded with forecasts |
| EXP-002 | Export Excel | 1. Select Excel format<br>2. Download | .xlsx file with formatted data |
| EXP-003 | Filter export | 1. Select specific project<br>2. Choose year/month range<br>3. Export | Only filtered data exported |
| EXP-004 | Version selection | 1. Select specific version<br>2. Export | Exports selected version data |
| EXP-005 | Empty export | 1. Filter to project with no forecasts<br>2. Export | Empty file or message displayed |

### 6.2 Import

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| IMP-001 | Download template | 1. Download import template | Template file with correct columns |
| IMP-002 | Import preview | 1. Select import file<br>2. Upload for preview | Preview shows validation results |
| IMP-003 | Valid import | 1. Import valid file<br>2. Review preview<br>3. Commit | Forecasts created/updated |
| IMP-004 | Validation errors | 1. Import file with invalid data | Errors shown in preview, cannot commit |
| IMP-005 | Update existing | 1. Import with "Update existing" option | Existing forecasts modified |
| IMP-006 | Create new version | 1. Import with "Create new version" option | Import version created |
| IMP-007 | Duplicate detection | 1. Re-import same file | Warning about duplicate import |
| IMP-008 | Drag and drop | 1. Drag file onto upload area | File accepted, preview shown |

### 6.3 History

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| HIS-001 | View history | 1. Navigate to History tab | List of import/export operations |
| HIS-002 | Re-download export | 1. Select previous export<br>2. Click download | Original file downloaded |
| HIS-003 | Filter history | 1. Filter by operation type | Filtered list displayed |

---

## 7. Reporting & Dashboard Tests (Phase 7)

### 7.1 Staffing Dashboard

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| DSH-001 | Dashboard load | 1. Navigate to Admin > Staffing > Dashboard | Dashboard loads with data |
| DSH-002 | Summary cards | 1. Verify Total Forecasted Hours card | Shows correct sum from Current version |
| DSH-003 | Variance card | 1. Check Variance calculation | Budget - Forecast correctly calculated |
| DSH-004 | Projects count | 1. Verify Active Projects count | Matches projects with active forecasts |
| DSH-005 | Utilization average | 1. Check Average Utilization | Correctly averaged across resources |
| DSH-006 | Monthly trend chart | 1. View monthly chart | Shows 12 months of data |
| DSH-007 | Chart legend | 1. Verify chart legend | Forecasted, Budgeted, Actual displayed |
| DSH-008 | Utilization gauges | 1. View utilization section | Gauges show per-resource utilization |
| DSH-009 | Projects table | 1. View projects table | Projects listed with hours summary |
| DSH-010 | Project drill-down | 1. Click project row | Navigates to project detail page |
| DSH-011 | Refresh data | 1. Click Refresh button | Data reloaded from API |
| DSH-012 | Empty state | 1. View dashboard with no data | "No data" message displayed |

### 7.2 Project Staffing Detail

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| PSD-001 | Page load | 1. Navigate to project detail page | Project summary loads |
| PSD-002 | Back navigation | 1. Click "Back to Dashboard" | Returns to dashboard |
| PSD-003 | Project header | 1. Verify project name, status | Correct project info displayed |
| PSD-004 | Summary statistics | 1. Check summary cards | Forecasted, Budgeted, Variance, Assignments |
| PSD-005 | Variance percentage | 1. Verify variance percentage | Calculated correctly |
| PSD-006 | Monthly chart | 1. View monthly breakdown | Chart shows project-specific data |
| PSD-007 | Assignments table | 1. View role assignments | All project assignments listed |
| PSD-008 | Assignment variance | 1. Check variance column | Per-assignment variance displayed |
| PSD-009 | Status badges | 1. View status column | Colored badges for Active/Pending/Completed |
| PSD-010 | Table totals | 1. Check footer totals | Sums match summary cards |
| PSD-011 | No data state | 1. View project with no forecasts | "No forecast data" message |

### 7.3 Report APIs

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| API-001 | Dashboard summary | `GET /api/staffing/staffingreports/dashboard-summary` | Returns summary metrics |
| API-002 | Project summary | `GET /api/staffing/staffingreports/project-summary/{id}` | Returns project detail |
| API-003 | Variance analysis | `GET /api/staffing/staffingreports/variance-analysis` | Returns variance by project |
| API-004 | Burn rate | `GET /api/staffing/staffingreports/burn-rate` | Returns monthly costs |
| API-005 | Capacity utilization | `GET /api/staffing/staffingreports/capacity-utilization` | Returns resource utilization |
| API-006 | Filter by project | Add `?projectId={id}` parameter | Filtered results returned |
| API-007 | Filter by period | Add `?year={year}&month={month}` | Period-specific data |

---

## 8. Security & Authorization Tests

### 8.1 Role-Based Access

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SEC-001 | Admin access | 1. Login as TenantAdmin<br>2. Access all staffing pages | Full access granted |
| SEC-002 | Manager access | 1. Login as ResourceManager<br>2. Access approval pages | Approval access granted |
| SEC-003 | Employee access | 1. Login as Employee<br>2. Try admin pages | Access denied or limited view |
| SEC-004 | Tenant isolation | 1. Login to Tenant A<br>2. Try to access Tenant B data | No cross-tenant data visible |
| SEC-005 | Override permission | 1. Without OverrideApprover role<br>2. Try to override forecast | Override button hidden/disabled |

### 8.2 API Security

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SEC-006 | Unauthorized access | 1. Call API without token | 401 Unauthorized |
| SEC-007 | Wrong tenant | 1. Try to access other tenant's data | 404 Not Found or empty results |
| SEC-008 | Invalid project ID | 1. Use non-existent project ID | 404 Not Found |

---

## 9. Performance Tests

### 9.1 Load Performance

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| PERF-001 | Dashboard load time | 1. Load dashboard with 1000+ forecasts | < 3 seconds |
| PERF-002 | Large export | 1. Export 10,000 forecasts | < 10 seconds |
| PERF-003 | Large import | 1. Import 5,000 forecasts | < 30 seconds |
| PERF-004 | Grid scroll | 1. Scroll through 500 forecasts in grid | Smooth, no lag |
| PERF-005 | Version comparison | 1. Compare versions with 1000 differences | < 5 seconds |

### 9.2 Concurrent Users

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| PERF-006 | Simultaneous edits | 1. Two users edit same forecast | Last save wins, no data corruption |
| PERF-007 | Bulk operations | 1. Multiple users submit forecasts | All operations complete |

---

## 10. Edge Cases & Error Handling

### 10.1 Error Scenarios

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ERR-001 | Network failure | 1. Disconnect network during save | Error message, retry option |
| ERR-002 | Session timeout | 1. Let session expire<br>2. Try action | Redirect to login |
| ERR-003 | Invalid file format | 1. Upload .jpg as import file | "Invalid file format" error |
| ERR-004 | Corrupted file | 1. Upload truncated Excel file | Error message displayed |
| ERR-005 | Large file | 1. Upload file > 10MB | Size limit error or handled gracefully |

### 10.2 Boundary Conditions

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| BND-001 | Zero hours forecast | 1. Enter 0 hours | Allowed, marked as zero forecast |
| BND-002 | Maximum hours | 1. Enter 999 hours | Saved with warning |
| BND-003 | Future years | 1. Create forecast for 2030 | Allowed |
| BND-004 | Past years | 1. Create forecast for 2020 | Allowed (historical) |
| BND-005 | Long description | 1. Enter 1000 char TBD description | Truncated or validated |

---

## 11. Browser Compatibility

| Test ID | Browser | Version | Expected Result |
|---------|---------|---------|-----------------|
| BROW-001 | Chrome | Latest | Full functionality |
| BROW-002 | Firefox | Latest | Full functionality |
| BROW-003 | Edge | Latest | Full functionality |
| BROW-004 | Safari | Latest | Full functionality |

---

## 12. Test Data Setup

### 12.1 Seed Test Data

To seed comprehensive test data for testing:

```bash
# Start backend in Development mode
cd backend/src/MyScheduling.Api
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5107

# Call seed endpoint
curl -X POST http://localhost:5107/api/dev/devseed/seed-staffing

# Verify stats
curl http://localhost:5107/api/dev/devseed/staffing-stats
```

### 12.2 Expected Seeded Data

| Entity | Count |
|--------|-------|
| Career Job Families | 8 |
| Subcontractor Companies | 4 |
| Subcontractors | 16 |
| Labor Categories | 80 |
| Project Role Assignments | 100 |
| Forecast Versions | 4 |
| Forecasts | 1,200 |
| Forecast Approval Schedules | 1 |

---

## 13. Test Execution Checklist

### Pre-Test Setup
- [ ] Backend running in Development mode on port 5107
- [ ] Frontend running on port 5173
- [ ] Database seeded with test data
- [ ] Test user accounts created (Admin, Manager, Employee)

### Phase Completion
- [ ] Phase 1: Foundation - All tests passed
- [ ] Phase 2: Role Assignments - All tests passed
- [ ] Phase 3: Forecasting - All tests passed
- [ ] Phase 4: Approval Workflow - All tests passed
- [ ] Phase 5: Version Management - All tests passed
- [ ] Phase 6: Import/Export - All tests passed
- [ ] Phase 7: Reporting & Dashboard - All tests passed
- [ ] Security tests - All tests passed
- [ ] Performance tests - All tests passed

### Sign-off
- [ ] QA Lead Approval: _______________ Date: _______________
- [ ] Product Owner Approval: _______________ Date: _______________
