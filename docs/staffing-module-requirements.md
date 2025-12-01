# Staffing Module Redesign - Requirements Questionnaire

## Overview
This document captures requirements for the staffing module redesign. The purpose is to track "sold" and "unsold" projects for employees, manage forecasting, and support accounting exports.

**Key Hierarchy:** Projects > Roles (Users & Subcontractors) and Projects > WBS

---

## Questions & Answers

### Projects & Structure

**1. Project Types**
Are "sold" vs "unsold" the only project statuses, or do you need others?
- [X ] Sold
- [ X] Unsold
- [X ] Proposed
- [ X] Active
- [X ] On Hold
- [ ] Completed
- [ ] Lost
- [X ] Other: _________________

**Answer:**

---

**2. Project Hierarchy**
Can projects have sub-projects, or is it strictly Projects > Roles and Projects > WBS?

The SubProjects are the WBS so no

**Answer:**

---

**3. WBS (Work Breakdown Structure)**
How deep does the WBS go? (e.g., WBS > Tasks > Subtasks?)
THIS IS THE FIXED WBS
212000.0000.00.000001

What fields does a WBS element need?
The Current WBS Database structure is perfect.

**Answer:**

---

### Roles & Staffing

**4. Role Definition**
What defines a "Role" on a project? (e.g., "Senior Developer", "Project Manager", "QA Lead")
Is this a job title, a position template, or something else?
This should have three things 1) a Position Title (Free text with suggestions based on common consulting roles but no restrictions) 2) Career Job Family (have an admin portal to maintain) 3) Career Level (Number) 4) Labor Category

**Answer:**

---

**5. Role vs Assignment**
Is a Role a template/position that gets filled by a User or Subcontractor? Or is it the actual assignment itself?  Its a person user or subcontractor (Need to track subcontractors without logins

**Answer:**

---

**6. Subcontractors**
Are subcontractors tracked differently than employees?
- [ ] Subcontractors have user accounts in the system
- [X ] Subcontractors are just name/record entries (no login)
- [ ] Other: _________________

**Answer:**

---

**7. Multiple Roles**
- Can one person hold multiple roles on the same project?  YES
- Can one person be assigned to multiple projects simultaneously? YES

**Answer:**

---

### Forecasting

**8. Forecast Granularity**
What level of detail is needed for forecasting?
- [ X] Monthly only
- [ X] Weekly breakdown within months
- [ ] Daily breakdown
- [ ] Other: _________________

**Answer:**
Allow for all three - we really only need to forecast by month, but having  2 checked options might be good for our hourly employees.
---

**9. Forecast Fields**
What gets forecasted?
- [ X] Hours
- [ ] Revenue/Dollars
- [ ] Both hours and revenue
- [ ] Per role
- [ X] Per WBS
- [ X] Per project
- [ ] Other: _________________

**Answer:**

Its realy only per WBS or Project - and just tracking hours for now.   Might want to add cost rates / revenue billing rates later - May be add but leave optional
---

**10. 24-Hour Shifts**
How should 24-hour shifts work?
- [ ] Actual 24-hour shifts (one person works 24 hours)
- [ ] Rotating shifts covering 24 hours (multiple people/shifts)
- [X ] Need shift scheduling functionality
- [ X] Just need to track total hours regardless of shift pattern

**Answer:**

---

**11. Recommended Hours**
How should the system suggest/recommend hours?
- [ X] Based on project start/end dates
- [X ] Based on employee's available capacity
- [ ] Based on historical patterns
- [ X] Based on standard work week (e.g., 40 hrs/week)
- [ X] Based on project budget/target hours
- [ ] Other: _________________

**Answer:**

---

**12. Forecast Lock/Approval**
- Can forecasts be edited anytime, or do they lock at month-end?  
- Who can approve/lock forecasts?
- Is there a submission deadline each month?

**Answer:**
Yes can be editted until they are locked for the month
Project / WBS approver(s) - Should be an attribute - Blank means platform admin
Lets make it configurable base on and approval schedule.

---

### Hierarchy & Permissions

**13. Supervisor/PM/Director Roles**
Are these roles on specific projects, or part of organizational hierarchy?
- [X ] Project-specific (PM on Project A, contributor on Project B)
- [ ] Organizational (always a PM regardless of project)
- [ ] Both

**Answer:**

---

**14. Override Rules**
- Can any supervisor override any employee's forecast? Yes - But lets try to leave in the hierarchy or with a role that gives them access to everything (Think Finance Team)
- Or only direct supervisors/managers? 
- Do overrides need audit trails/history? YES

**Answer:**

---

**15. TBDs (To Be Determined)**
What are TBDs?
- [X ] Placeholder assignments for roles not yet filled
- [ X] Tentative/unconfirmed assignments
- [ X] Budget placeholders
- [ ] Other: _________________

How should TBDs display in reports?  as TBDS 

**Answer:**

---

### Labor Categories & Accounting

**16. Labor Categories**
What are labor categories?
- [ ] Standard categories (e.g., "Engineer Level 3") that map to bill rates
- [ ] Cost codes for accounting
- [X ] Contract-specific categories
- [ ] Other: _________________

Are they per-project or organization-wide?  per project

**Answer:**

---

**17. Export Format**
What format does accounting need?
- [ X ] CSV
- [ X ] Excel (.xlsx)
- [ ] PDF reports
- [ ] Specific ERP integration (which system?): _________________
- [ ] Other: _________________

What fields need to be in the export?  All

**Answer:**

---

**18. Cost Tracking**
Do you need:
- [ X] Actual vs forecast comparisons
- [X ] Budget tracking
- [ X] Variance reports
- [ X] Burn rate calculations
- [ ] Other: _________________

**Answer:**

---

### Current State & Integration

**19. Existing Data**
Is there existing staffing data that needs to migrate?
- [ ] Starting fresh
- [X ] Migrate from spreadsheets
- [ ] Migrate from another system (which?): _________________
- [ ] Other: _________________

**Answer:**

---

**20. Work Location Integration**
Should staffing tie into Work Location preferences?
- [ ] Yes - show where people are working when viewing staffing
- [ ] No - keep them separate
- [ X ] Future consideration

**Answer:**

---

## Additional Notes

_Add any other requirements, constraints, or considerations here:_




---

## Next Steps
Once this questionnaire is complete, we will create:
1. Data model / entity relationship diagram
2. UI wireframes and user flows
3. API design
4. Permission model
5. Export functionality specifications
