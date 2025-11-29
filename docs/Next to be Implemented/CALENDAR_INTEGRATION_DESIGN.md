# Calendar Integration Design Document

**Project:** Team Calendar Integration System  
**Technology Stack:** .NET 8.0, Azure, PostgreSQL  
**Version:** 1.0  
**Last Updated:** November 29, 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Requirements](#system-requirements)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [API Design](#api-design)
6. [Core Services Implementation](#core-services-implementation)
7. [Security Implementation](#security-implementation)
8. [Caching Strategy](#caching-strategy)
9. [External Calendar Integrations](#external-calendar-integrations)
10. [Predefined Templates](#predefined-templates)
11. [Technology Stack](#technology-stack)
12. [Implementation Phases](#implementation-phases)
13. [Configuration](#configuration)
14. [Testing Strategy](#testing-strategy)
15. [Deployment Guide](#deployment-guide)

---

## Executive Summary

This document outlines the design for a comprehensive calendar integration system that enables users to subscribe to dynamic, filtered calendar feeds showing team members' PTO, work locations, and office reservations. The system supports both universal iCalendar (ICS) feeds and direct API integrations with Microsoft Outlook and Google Calendar.

### Key Features

- **Multi-Format Support**: Both ICS feeds and direct calendar API integration
- **Advanced Filtering**: Combine multiple filters (department, location, team, individuals)
- **Predefined Templates**: Quick setup with "My Team", "Direct Reports", etc.
- **Custom Subscriptions**: Users can create and edit personalized filter combinations
- **Permission-Based Access**: Team-based visibility with manager hierarchy support
- **Real-Time Sync**: Automatic synchronization to external calendar providers
- **Scalable Architecture**: Redis caching and Azure infrastructure

---

## System Requirements

### Functional Requirements

1. **Calendar Subscription Management**
   - Users can create multiple calendar subscriptions
   - Each subscription can have multiple filters
   - Subscriptions are editable after creation
   - Support for both predefined templates and custom filters

2. **Filter Capabilities**
   - Department/Business Unit filtering
   - Office location filtering
   - Individual employee selection
   - Team-based filtering
   - Direct reports filtering (recursive hierarchy)
   - Combination of multiple filters (AND logic)

3. **Data Visibility**
   - PTO events with reason codes
   - Work location status (Remote/In Office)
   - Office reservations
   - Privacy: Only visible to team members or managers

4. **Integration Methods**
   - ICS feed URLs (read-only, universal compatibility)
   - Microsoft Graph API (Outlook Calendar)
   - Google Calendar API

### Non-Functional Requirements

1. **Performance**
   - Calendar feed generation < 2 seconds
   - Support for 1000+ concurrent users
   - Redis caching for frequently accessed feeds
   - Cache invalidation on data changes

2. **Security**
   - Cryptographically secure subscription keys
   - Azure AD/Entra ID authentication
   - Row-level security based on organizational hierarchy
   - OAuth 2.0 for external calendar connections

3. **Scalability**
   - Horizontal scaling via Azure App Service
   - Database connection pooling
   - Asynchronous processing for external sync operations

4. **Reliability**
   - 99.9% uptime SLA
   - Graceful degradation if external APIs are unavailable
   - Background job retry logic with exponential backoff

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Web UI (React/Blazor)  │  Outlook  │  Google Cal  │  Apple Cal │
└─────────────┬───────────┴─────┬─────┴──────┬───────┴─────┬──────┘
              │                 │            │             │
              │                 │            │             │
┌─────────────▼─────────────────▼────────────▼─────────────▼──────┐
│                     API GATEWAY / Load Balancer                  │
│                    (Azure Application Gateway)                   │
└─────────────┬────────────────────────────────────────────────────┘
              │
┌─────────────▼─────────────────────────────────────────────────┐
│                    ASP.NET CORE WEB API                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ Calendar Feed    │  │ Graph API      │  │ Google Cal     │ │
│  │ Controller       │  │ Integration    │  │ Integration    │ │
│  │ (ICS/iCal)       │  │ Controller     │  │ Controller     │ │
│  └──────────────────┘  └────────────────┘  └────────────────┘ │
│                                                                 │
│  ┌──────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ Subscription     │  │ Filter         │  │ Template       │ │
│  │ Management API   │  │ Engine         │  │ Manager        │ │
│  └──────────────────┘  └────────────────┘  └────────────────┘ │
│                                                                 │
└─────────────┬───────────────────────────────────────────────────┘
              │
┌─────────────▼─────────────────────────────────────────────────┐
│                    SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Calendar Service│  │ Filter       │  │ Permission       │  │
│  │                 │  │ Service      │  │ Service          │  │
│  └─────────────────┘  └──────────────┘  └──────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Caching Service │  │ Azure AD     │  │ Event Aggregator │  │
│  │ (Redis)         │  │ Integration  │  │ Service          │  │
│  └─────────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────┬───────────────────────────────────────────────────┘
              │
┌─────────────▼─────────────────────────────────────────────────┐
│                    DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database  │  Azure AD/Entra ID  │  Redis Cache     │
└─────────────────────────────────────────────────────────────────┘
```

### Component Descriptions

#### API Gateway Layer
- **Azure Application Gateway**: SSL termination, load balancing, WAF protection
- Routes traffic to appropriate App Service instances
- Handles rate limiting and DDoS protection

#### API Layer (ASP.NET Core)
- **Calendar Feed Controller**: Generates ICS feeds for calendar clients
- **Graph API Integration Controller**: Handles Microsoft Outlook synchronization
- **Google Calendar Integration Controller**: Manages Google Calendar connections
- **Subscription Management API**: CRUD operations for user subscriptions
- **Filter Engine**: Applies complex filter combinations to calendar data
- **Template Manager**: Manages predefined and custom templates

#### Service Layer
- **Calendar Service**: Core business logic for calendar generation
- **Filter Service**: Query building and filter application
- **Permission Service**: Validates data access based on organizational hierarchy
- **Caching Service**: Redis-based caching for performance
- **Azure AD Integration**: User authentication and organizational data sync
- **Event Aggregator Service**: Consolidates PTO, work location, and reservations

#### Data Layer
- **PostgreSQL Database**: Primary data store
- **Azure AD/Entra ID**: Source of truth for organizational hierarchy
- **Redis Cache**: Distributed cache for calendar feeds and queries

---

## Database Schema

### Core Tables

```sql
-- =============================================
-- Calendar Subscriptions
-- =============================================

CREATE TABLE calendar_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subscription_name VARCHAR(200) NOT NULL,
    subscription_key VARCHAR(100) UNIQUE NOT NULL, -- For ICS feed URLs
    template_id UUID NULL, -- Reference to predefined template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP NULL,
    access_count INTEGER DEFAULT 0,
    
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES employees(employee_id),
    CONSTRAINT fk_template FOREIGN KEY (template_id) REFERENCES subscription_templates(template_id)
);

CREATE INDEX idx_calendar_subscriptions_user ON calendar_subscriptions(user_id);
CREATE INDEX idx_calendar_subscriptions_key ON calendar_subscriptions(subscription_key);
CREATE INDEX idx_calendar_subscriptions_active ON calendar_subscriptions(is_active);

-- =============================================
-- Subscription Filters
-- =============================================

CREATE TABLE subscription_filters (
    filter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL,
    filter_type VARCHAR(50) NOT NULL, -- 'DEPARTMENT', 'LOCATION', 'INDIVIDUAL', 'TEAM', 'DIRECT_REPORTS'
    filter_value VARCHAR(200) NOT NULL, -- ID or value to filter by
    filter_operator VARCHAR(20) DEFAULT 'EQUALS', -- 'EQUALS', 'IN', 'NOT_EQUALS'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_subscription FOREIGN KEY (subscription_id) REFERENCES calendar_subscriptions(subscription_id) ON DELETE CASCADE
);

CREATE INDEX idx_subscription_filters_sub_id ON subscription_filters(subscription_id);
CREATE INDEX idx_subscription_filters_type ON subscription_filters(filter_type);

-- =============================================
-- Subscription Templates
-- =============================================

CREATE TABLE subscription_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,
    template_type VARCHAR(50) NOT NULL, -- 'MY_TEAM', 'DIRECT_REPORTS', 'DEPARTMENT', 'CUSTOM'
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_templates_type ON subscription_templates(template_type);
CREATE INDEX idx_subscription_templates_system ON subscription_templates(is_system_template);

-- =============================================
-- Template Filters
-- =============================================

CREATE TABLE template_filters (
    template_filter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    filter_type VARCHAR(50) NOT NULL,
    filter_value_pattern VARCHAR(200), -- Can be dynamic like '${USER_TEAM}', '${USER_DEPARTMENT}'
    filter_operator VARCHAR(20) DEFAULT 'EQUALS',
    
    CONSTRAINT fk_template FOREIGN KEY (template_id) REFERENCES subscription_templates(template_id) ON DELETE CASCADE
);

CREATE INDEX idx_template_filters_template_id ON template_filters(template_id);

-- =============================================
-- Calendar Events (Aggregated View)
-- =============================================

CREATE TABLE calendar_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'PTO', 'WORK_LOCATION', 'OFFICE_RESERVATION'
    event_subtype VARCHAR(100), -- PTO reason, work location type, office name
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT true,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

CREATE INDEX idx_calendar_events_employee ON calendar_events(employee_id);
CREATE INDEX idx_calendar_events_dates ON calendar_events(start_date, end_date);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_composite ON calendar_events(employee_id, start_date, end_date);

-- =============================================
-- External Calendar Connections
-- =============================================

CREATE TABLE external_calendar_connections (
    connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'MICROSOFT_GRAPH', 'GOOGLE_CALENDAR'
    external_calendar_id VARCHAR(500) NOT NULL,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50), -- 'PENDING', 'SUCCESS', 'FAILED', 'SYNCING'
    sync_error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_subscription_ext FOREIGN KEY (subscription_id) REFERENCES calendar_subscriptions(subscription_id) ON DELETE CASCADE
);

CREATE INDEX idx_external_connections_sub_id ON external_calendar_connections(subscription_id);
CREATE INDEX idx_external_connections_provider ON external_calendar_connections(provider);
CREATE INDEX idx_external_connections_sync_status ON external_calendar_connections(sync_status);

-- =============================================
-- Organizational Structure
-- =============================================

CREATE TABLE employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    azure_ad_id VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    manager_id UUID,
    team_id UUID,
    department_id UUID,
    primary_office_location_id UUID,
    is_active BOOLEAN DEFAULT true,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_manager FOREIGN KEY (manager_id) REFERENCES employees(employee_id),
    CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(team_id),
    CONSTRAINT fk_department FOREIGN KEY (department_id) REFERENCES departments(department_id),
    CONSTRAINT fk_office_location FOREIGN KEY (primary_office_location_id) REFERENCES office_locations(location_id)
);

CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_team ON employees(team_id);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_azure_ad ON employees(azure_ad_id);
CREATE INDEX idx_employees_email ON employees(email);

CREATE TABLE teams (
    team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name VARCHAR(200) NOT NULL,
    department_id UUID,
    manager_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_team_department FOREIGN KEY (department_id) REFERENCES departments(department_id),
    CONSTRAINT fk_team_manager FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
);

CREATE INDEX idx_teams_department ON teams(department_id);
CREATE INDEX idx_teams_manager ON teams(manager_id);

CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_name VARCHAR(200) NOT NULL,
    parent_department_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_parent_department FOREIGN KEY (parent_department_id) REFERENCES departments(department_id)
);

CREATE INDEX idx_departments_parent ON departments(parent_department_id);

CREATE TABLE office_locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_name VARCHAR(200) NOT NULL,
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Audit Log
-- =============================================

CREATE TABLE subscription_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATED', 'UPDATED', 'DELETED', 'ACCESSED'
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_audit_subscription FOREIGN KEY (subscription_id) REFERENCES calendar_subscriptions(subscription_id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_log_subscription ON subscription_audit_log(subscription_id);
CREATE INDEX idx_audit_log_user ON subscription_audit_log(user_id);
CREATE INDEX idx_audit_log_created ON subscription_audit_log(created_at);
```

### Database Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_subscriptions_updated_at
    BEFORE UPDATE ON calendar_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## API Design

### Base URL Structure

```
Production: https://api.yourcompany.com
Development: https://api-dev.yourcompany.com

Calendar Feed: /api/calendar/feed/{subscriptionKey}.ics
REST API: /api/v1/*
```

### Authentication

All REST API endpoints require Azure AD Bearer token authentication except the public calendar feed endpoint which uses subscription key authentication.

```http
Authorization: Bearer {azure-ad-token}
```

### API Endpoints

#### 1. Calendar Feed (ICS)

##### Get Calendar Feed
```http
GET /api/calendar/feed/{subscriptionKey}.ics
```

**Authentication:** Subscription key in URL  
**Response:** `text/calendar` (iCalendar format)

**Example:**
```http
GET /api/calendar/feed/abc123xyz789.ics
Content-Type: text/calendar; charset=utf-8

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//YourCompany//Team Calendar//EN
METHOD:PUBLISH
...
END:VCALENDAR
```

#### 2. Subscription Management

##### Get All Subscriptions
```http
GET /api/v1/subscriptions
Authorization: Bearer {token}
```

**Response:**
```json
{
  "subscriptions": [
    {
      "subscriptionId": "uuid",
      "name": "My Team Calendar",
      "subscriptionKey": "abc123xyz789",
      "feedUrl": "https://api.yourcompany.com/api/calendar/feed/abc123xyz789.ics",
      "templateId": "uuid or null",
      "templateName": "My Team",
      "isActive": true,
      "filters": [
        {
          "filterId": "uuid",
          "filterType": "TEAM",
          "filterValue": "team-uuid",
          "filterOperator": "EQUALS"
        }
      ],
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z",
      "lastAccessedAt": "2025-01-20T14:22:00Z",
      "accessCount": 45
    }
  ],
  "totalCount": 5,
  "maxAllowed": 10
}
```

##### Get Single Subscription
```http
GET /api/v1/subscriptions/{subscriptionId}
Authorization: Bearer {token}
```

##### Create Subscription
```http
POST /api/v1/subscriptions
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Chicago Office Team",
  "templateId": "uuid-optional",
  "filters": [
    {
      "filterType": "TEAM",
      "filterValue": "${USER_TEAM}",
      "filterOperator": "EQUALS"
    },
    {
      "filterType": "LOCATION",
      "filterValue": "chicago-location-uuid",
      "filterOperator": "EQUALS"
    }
  ]
}
```

**Response:**
```json
{
  "subscriptionId": "uuid",
  "name": "Chicago Office Team",
  "subscriptionKey": "generated-key",
  "feedUrl": "https://api.yourcompany.com/api/calendar/feed/generated-key.ics",
  "filters": [...],
  "createdAt": "2025-01-20T10:30:00Z"
}
```

##### Update Subscription
```http
PUT /api/v1/subscriptions/{subscriptionId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "filters": [
    {
      "filterType": "DEPARTMENT",
      "filterValue": "engineering-dept-uuid",
      "filterOperator": "EQUALS"
    }
  ]
}
```

##### Delete Subscription
```http
DELETE /api/v1/subscriptions/{subscriptionId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Subscription deleted successfully",
  "subscriptionId": "uuid"
}
```

##### Preview Subscription
```http
POST /api/v1/subscriptions/preview
Authorization: Bearer {token}
Content-Type: application/json

{
  "filters": [
    {
      "filterType": "TEAM",
      "filterValue": "team-uuid",
      "filterOperator": "EQUALS"
    }
  ]
}
```

**Response:**
```json
{
  "events": [
    {
      "employeeId": "uuid",
      "employeeName": "John Doe",
      "eventType": "PTO",
      "eventSubtype": "Vacation",
      "startDate": "2025-02-01T00:00:00Z",
      "endDate": "2025-02-05T00:00:00Z",
      "title": "John Doe - Vacation",
      "isAllDay": true
    }
  ],
  "totalEvents": 15,
  "employeesIncluded": 8,
  "dateRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-12-31T23:59:59Z"
  }
}
```

#### 3. Templates

##### Get Available Templates
```http
GET /api/v1/subscriptions/templates
Authorization: Bearer {token}
```

**Response:**
```json
{
  "templates": [
    {
      "templateId": "uuid",
      "templateName": "My Team",
      "templateDescription": "View PTO and work locations for your team members",
      "templateType": "MY_TEAM",
      "isSystemTemplate": true,
      "filters": [
        {
          "filterType": "TEAM",
          "filterValuePattern": "${USER_TEAM}",
          "filterOperator": "EQUALS"
        }
      ]
    },
    {
      "templateId": "uuid",
      "templateName": "My Direct Reports",
      "templateDescription": "View calendars for all your direct and indirect reports",
      "templateType": "DIRECT_REPORTS",
      "isSystemTemplate": true,
      "filters": [
        {
          "filterType": "DIRECT_REPORTS",
          "filterValuePattern": "${USER_ID}",
          "filterOperator": "EQUALS"
        }
      ]
    }
  ]
}
```

##### Create Custom Template
```http
POST /api/v1/subscriptions/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "templateName": "Engineering Department",
  "templateDescription": "All engineering team members",
  "filters": [
    {
      "filterType": "DEPARTMENT",
      "filterValuePattern": "engineering-dept-uuid",
      "filterOperator": "EQUALS"
    }
  ]
}
```

#### 4. External Calendar Integrations

##### Connect Microsoft Outlook
```http
POST /api/v1/integrations/microsoft/connect
Authorization: Bearer {token}
Content-Type: application/json

{
  "subscriptionId": "uuid",
  "calendarId": "optional-outlook-calendar-id",
  "syncFrequencyMinutes": 15
}
```

**Response:**
```json
{
  "connectionId": "uuid",
  "authorizationUrl": "https://login.microsoftonline.com/...",
  "status": "PENDING_AUTHORIZATION"
}
```

##### OAuth Callback (Microsoft)
```http
GET /api/v1/integrations/microsoft/callback?code={auth-code}&state={state}
```

##### Connect Google Calendar
```http
POST /api/v1/integrations/google/connect
Authorization: Bearer {token}
Content-Type: application/json

{
  "subscriptionId": "uuid",
  "calendarId": "optional-google-calendar-id",
  "syncFrequencyMinutes": 15
}
```

##### Get Integration Status
```http
GET /api/v1/integrations/{connectionId}/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "connectionId": "uuid",
  "subscriptionId": "uuid",
  "provider": "MICROSOFT_GRAPH",
  "status": "ACTIVE",
  "lastSyncAt": "2025-01-20T14:30:00Z",
  "nextSyncAt": "2025-01-20T14:45:00Z",
  "syncFrequencyMinutes": 15,
  "totalEventsSynced": 127,
  "lastSyncStatus": "SUCCESS"
}
```

##### Trigger Manual Sync
```http
POST /api/v1/integrations/{connectionId}/sync
Authorization: Bearer {token}
```

##### Disconnect Integration
```http
DELETE /api/v1/integrations/{connectionId}
Authorization: Bearer {token}
```

#### 5. Filter Options (Lookup APIs)

##### Get Departments
```http
GET /api/v1/filters/departments
Authorization: Bearer {token}
```

##### Get Locations
```http
GET /api/v1/filters/locations
Authorization: Bearer {token}
```

##### Get Teams
```http
GET /api/v1/filters/teams
Authorization: Bearer {token}
```

##### Search Employees
```http
GET /api/v1/filters/employees?search={query}
Authorization: Bearer {token}
```

---

## Core Services Implementation

### 1. Filter Service

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace CalendarIntegration.Services
{
    public interface IFilterService
    {
        Task<IEnumerable<CalendarEvent>> ApplyFilters(Guid userId, IEnumerable<SubscriptionFilter> filters);
        Task<HashSet<Guid>> GetVisibleEmployeeIds(Guid userId);
    }

    public class FilterService : IFilterService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IPermissionService _permissionService;

        public FilterService(ApplicationDbContext dbContext, IPermissionService permissionService)
        {
            _dbContext = dbContext;
            _permissionService = permissionService;
        }

        public async Task<IEnumerable<CalendarEvent>> ApplyFilters(
            Guid userId, 
            IEnumerable<SubscriptionFilter> filters)
        {
            var query = _dbContext.CalendarEvents.AsQueryable();
            
            // Apply permission filter first - critical for security
            var visibleEmployeeIds = await GetVisibleEmployeeIds(userId);
            query = query.Where(e => visibleEmployeeIds.Contains(e.EmployeeId));
            
            // Apply each filter (AND logic)
            foreach (var filter in filters)
            {
                query = filter.FilterType switch
                {
                    "TEAM" => await ApplyTeamFilter(query, filter, userId),
                    "DIRECT_REPORTS" => await ApplyDirectReportsFilter(query, userId),
                    "DEPARTMENT" => await ApplyDepartmentFilter(query, filter),
                    "LOCATION" => await ApplyLocationFilter(query, filter),
                    "INDIVIDUAL" => ApplyIndividualFilter(query, filter),
                    _ => query
                };
            }
            
            // Order by start date
            return await query
                .OrderBy(e => e.StartDate)
                .ToListAsync();
        }

        public async Task<HashSet<Guid>> GetVisibleEmployeeIds(Guid userId)
        {
            var user = await _dbContext.Employees
                .Include(e => e.Team)
                .FirstOrDefaultAsync(e => e.EmployeeId == userId);
                
            if (user == null)
                return new HashSet<Guid>();
                
            var visibleIds = new HashSet<Guid>();
            
            // Add team members
            if (user.TeamId.HasValue)
            {
                var teamMembers = await _dbContext.Employees
                    .Where(e => e.TeamId == user.TeamId && e.IsActive)
                    .Select(e => e.EmployeeId)
                    .ToListAsync();
                visibleIds.UnionWith(teamMembers);
            }
            
            // Add direct reports (recursively)
            var directReports = await GetAllDirectReports(userId);
            visibleIds.UnionWith(directReports);
            
            return visibleIds;
        }

        private async Task<IQueryable<CalendarEvent>> ApplyTeamFilter(
            IQueryable<CalendarEvent> query, 
            SubscriptionFilter filter, 
            Guid userId)
        {
            Guid teamId;
            
            // Handle dynamic team resolution
            if (filter.FilterValue == "${USER_TEAM}")
            {
                var user = await _dbContext.Employees.FindAsync(userId);
                if (user?.TeamId == null)
                    return query.Where(e => false); // No results if user has no team
                teamId = user.TeamId.Value;
            }
            else
            {
                teamId = Guid.Parse(filter.FilterValue);
            }
            
            var teamMemberIds = await _dbContext.Employees
                .Where(e => e.TeamId == teamId && e.IsActive)
                .Select(e => e.EmployeeId)
                .ToListAsync();
                
            return query.Where(e => teamMemberIds.Contains(e.EmployeeId));
        }

        private async Task<IQueryable<CalendarEvent>> ApplyDirectReportsFilter(
            IQueryable<CalendarEvent> query, 
            Guid userId)
        {
            var directReportIds = await GetAllDirectReports(userId);
            return query.Where(e => directReportIds.Contains(e.EmployeeId));
        }

        private async Task<IQueryable<CalendarEvent>> ApplyDepartmentFilter(
            IQueryable<CalendarEvent> query, 
            SubscriptionFilter filter)
        {
            var departmentId = Guid.Parse(filter.FilterValue);
            
            var departmentEmployeeIds = await _dbContext.Employees
                .Where(e => e.DepartmentId == departmentId && e.IsActive)
                .Select(e => e.EmployeeId)
                .ToListAsync();
                
            return query.Where(e => departmentEmployeeIds.Contains(e.EmployeeId));
        }

        private async Task<IQueryable<CalendarEvent>> ApplyLocationFilter(
            IQueryable<CalendarEvent> query, 
            SubscriptionFilter filter)
        {
            var locationId = Guid.Parse(filter.FilterValue);
            
            var locationEmployeeIds = await _dbContext.Employees
                .Where(e => e.PrimaryOfficeLocationId == locationId && e.IsActive)
                .Select(e => e.EmployeeId)
                .ToListAsync();
                
            return query.Where(e => locationEmployeeIds.Contains(e.EmployeeId));
        }

        private IQueryable<CalendarEvent> ApplyIndividualFilter(
            IQueryable<CalendarEvent> query, 
            SubscriptionFilter filter)
        {
            var employeeId = Guid.Parse(filter.FilterValue);
            return query.Where(e => e.EmployeeId == employeeId);
        }

        private async Task<HashSet<Guid>> GetAllDirectReports(Guid managerId)
        {
            var reports = new HashSet<Guid>();
            var directReports = await _dbContext.Employees
                .Where(e => e.ManagerId == managerId && e.IsActive)
                .Select(e => e.EmployeeId)
                .ToListAsync();
                
            reports.UnionWith(directReports);
            
            // Recursive call for indirect reports
            foreach (var reportId in directReports)
            {
                var indirectReports = await GetAllDirectReports(reportId);
                reports.UnionWith(indirectReports);
            }
            
            return reports;
        }
    }
}
```

### 2. Calendar Service (ICS Generation)

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Ical.Net;
using Ical.Net.CalendarComponents;
using Ical.Net.DataTypes;
using Ical.Net.Serialization;
using Microsoft.EntityFrameworkCore;

namespace CalendarIntegration.Services
{
    public interface ICalendarService
    {
        Task<string> GenerateICalendarFeed(string subscriptionKey);
        Task<CalendarSubscription> CreateSubscription(Guid userId, CreateSubscriptionRequest request);
        Task<CalendarSubscription> UpdateSubscription(Guid subscriptionId, UpdateSubscriptionRequest request);
        Task DeleteSubscription(Guid subscriptionId);
    }

    public class CalendarService : ICalendarService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IFilterService _filterService;
        private readonly ILogger<CalendarService> _logger;

        public CalendarService(
            ApplicationDbContext dbContext,
            IFilterService filterService,
            ILogger<CalendarService> logger)
        {
            _dbContext = dbContext;
            _filterService = filterService;
            _logger = logger;
        }

        public async Task<string> GenerateICalendarFeed(string subscriptionKey)
        {
            var subscription = await _dbContext.CalendarSubscriptions
                .Include(s => s.Filters)
                .FirstOrDefaultAsync(s => s.SubscriptionKey == subscriptionKey && s.IsActive);
                
            if (subscription == null)
            {
                _logger.LogWarning("Subscription not found for key: {SubscriptionKey}", subscriptionKey);
                throw new NotFoundException("Subscription not found or inactive");
            }
                
            // Update access tracking
            subscription.LastAccessedAt = DateTime.UtcNow;
            subscription.AccessCount++;
            await _dbContext.SaveChangesAsync();
            
            // Get filtered events
            var events = await _filterService.ApplyFilters(
                subscription.UserId, 
                subscription.Filters);
                
            // Generate iCalendar format
            var calendar = new Calendar();
            calendar.ProductId = "-//YourCompany//Team Calendar//EN";
            calendar.Version = "2.0";
            calendar.Method = "PUBLISH";
            calendar.Name = subscription.SubscriptionName;
            
            foreach (var evt in events)
            {
                var calEvent = new CalendarEvent
                {
                    Uid = evt.EventId.ToString(),
                    Start = new CalDateTime(evt.StartDate),
                    End = new CalDateTime(evt.EndDate),
                    Summary = evt.Title,
                    Description = evt.Description,
                    Location = evt.Location,
                    IsAllDay = evt.IsAllDay,
                    LastModified = new CalDateTime(evt.UpdatedAt),
                    Created = new CalDateTime(evt.CreatedAt)
                };
                
                // Add categories based on event type
                calEvent.Categories.Add(evt.EventType);
                if (!string.IsNullOrEmpty(evt.EventSubtype))
                    calEvent.Categories.Add(evt.EventSubtype);
                
                // Color coding by event type
                calEvent.Color = evt.EventType switch
                {
                    "PTO" => "RED",
                    "WORK_LOCATION" => "BLUE",
                    "OFFICE_RESERVATION" => "GREEN",
                    _ => "GRAY"
                };
                    
                calendar.Events.Add(calEvent);
            }
            
            var serializer = new CalendarSerializer();
            var icalContent = serializer.SerializeToString(calendar);
            
            _logger.LogInformation(
                "Generated iCalendar feed for subscription {SubscriptionId} with {EventCount} events",
                subscription.SubscriptionId,
                events.Count());
                
            return icalContent;
        }

        public async Task<CalendarSubscription> CreateSubscription(
            Guid userId, 
            CreateSubscriptionRequest request)
        {
            // Validate user hasn't exceeded subscription limit
            var userSubscriptionCount = await _dbContext.CalendarSubscriptions
                .CountAsync(s => s.UserId == userId && s.IsActive);
                
            if (userSubscriptionCount >= 10) // Max subscriptions per user
                throw new ValidationException("Maximum number of subscriptions reached");
                
            var subscription = new CalendarSubscription
            {
                UserId = userId,
                SubscriptionName = request.Name,
                SubscriptionKey = GenerateSecureKey(),
                TemplateId = request.TemplateId,
                IsActive = true
            };
            
            _dbContext.CalendarSubscriptions.Add(subscription);
            await _dbContext.SaveChangesAsync();
            
            // Add filters
            foreach (var filterRequest in request.Filters)
            {
                var filter = new SubscriptionFilter
                {
                    SubscriptionId = subscription.SubscriptionId,
                    FilterType = filterRequest.FilterType,
                    FilterValue = filterRequest.FilterValue,
                    FilterOperator = filterRequest.FilterOperator ?? "EQUALS"
                };
                _dbContext.SubscriptionFilters.Add(filter);
            }
            
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation(
                "Created subscription {SubscriptionId} for user {UserId}",
                subscription.SubscriptionId,
                userId);
                
            return await _dbContext.CalendarSubscriptions
                .Include(s => s.Filters)
                .FirstAsync(s => s.SubscriptionId == subscription.SubscriptionId);
        }

        public async Task<CalendarSubscription> UpdateSubscription(
            Guid subscriptionId, 
            UpdateSubscriptionRequest request)
        {
            var subscription = await _dbContext.CalendarSubscriptions
                .Include(s => s.Filters)
                .FirstOrDefaultAsync(s => s.SubscriptionId == subscriptionId);
                
            if (subscription == null)
                throw new NotFoundException("Subscription not found");
                
            // Update name if provided
            if (!string.IsNullOrEmpty(request.Name))
                subscription.SubscriptionName = request.Name;
                
            // Update filters if provided
            if (request.Filters != null)
            {
                // Remove existing filters
                _dbContext.SubscriptionFilters.RemoveRange(subscription.Filters);
                
                // Add new filters
                foreach (var filterRequest in request.Filters)
                {
                    var filter = new SubscriptionFilter
                    {
                        SubscriptionId = subscription.SubscriptionId,
                        FilterType = filterRequest.FilterType,
                        FilterValue = filterRequest.FilterValue,
                        FilterOperator = filterRequest.FilterOperator ?? "EQUALS"
                    };
                    _dbContext.SubscriptionFilters.Add(filter);
                }
            }
            
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation(
                "Updated subscription {SubscriptionId}",
                subscriptionId);
                
            return await _dbContext.CalendarSubscriptions
                .Include(s => s.Filters)
                .FirstAsync(s => s.SubscriptionId == subscription.SubscriptionId);
        }

        public async Task DeleteSubscription(Guid subscriptionId)
        {
            var subscription = await _dbContext.CalendarSubscriptions
                .FirstOrDefaultAsync(s => s.SubscriptionId == subscriptionId);
                
            if (subscription == null)
                throw new NotFoundException("Subscription not found");
                
            subscription.IsActive = false; // Soft delete
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation(
                "Deleted subscription {SubscriptionId}",
                subscriptionId);
        }

        private string GenerateSecureKey()
        {
            var bytes = new byte[32];
            using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
        }
    }
}
```

### 3. Permission Service

```csharp
using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace CalendarIntegration.Services
{
    public interface IPermissionService
    {
        Task<bool> CanViewEmployee(Guid requestingUserId, Guid targetEmployeeId);
        Task<bool> CanManageSubscription(Guid userId, Guid subscriptionId);
    }

    public class PermissionService : IPermissionService
    {
        private readonly ApplicationDbContext _dbContext;

        public PermissionService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<bool> CanViewEmployee(Guid requestingUserId, Guid targetEmployeeId)
        {
            // User can always view themselves
            if (requestingUserId == targetEmployeeId)
                return true;
                
            var requestingUser = await _dbContext.Employees
                .Include(e => e.Team)
                .FirstOrDefaultAsync(e => e.EmployeeId == requestingUserId);
                
            if (requestingUser == null)
                return false;
                
            var targetUser = await _dbContext.Employees
                .Include(e => e.Team)
                .FirstOrDefaultAsync(e => e.EmployeeId == targetEmployeeId);
                
            if (targetUser == null)
                return false;
                
            // Same team check
            if (requestingUser.TeamId.HasValue && 
                requestingUser.TeamId == targetUser.TeamId)
                return true;
                
            // Manager check (direct or indirect)
            return await IsManager(requestingUserId, targetEmployeeId);
        }

        public async Task<bool> CanManageSubscription(Guid userId, Guid subscriptionId)
        {
            var subscription = await _dbContext.CalendarSubscriptions
                .FirstOrDefaultAsync(s => s.SubscriptionId == subscriptionId);
                
            return subscription != null && subscription.UserId == userId;
        }

        private async Task<bool> IsManager(Guid managerId, Guid employeeId)
        {
            var employee = await _dbContext.Employees
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
                
            if (employee?.ManagerId == null)
                return false;
                
            if (employee.ManagerId == managerId)
                return true;
                
            // Check up the chain recursively
            return await IsManager(managerId, employee.ManagerId.Value);
        }
    }
}
```

---

## Security Implementation

### 1. Subscription Key Generation

```csharp
using System;
using System.Security.Cryptography;

namespace CalendarIntegration.Security
{
    public static class SubscriptionKeyGenerator
    {
        /// <summary>
        /// Generates a cryptographically secure random subscription key
        /// </summary>
        public static string GenerateSecureKey()
        {
            const int keyLengthBytes = 32; // 256 bits
            var bytes = new byte[keyLengthBytes];
            
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            
            // Convert to URL-safe Base64
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
        }

        /// <summary>
        /// Validates subscription key format
        /// </summary>
        public static bool IsValidKeyFormat(string key)
        {
            if (string.IsNullOrEmpty(key))
                return false;
                
            // URL-safe Base64 without padding
            return key.Length == 43 && // 32 bytes = 43 chars in Base64 without padding
                   key.All(c => char.IsLetterOrDigit(c) || c == '-' || c == '_');
        }
    }
}
```

### 2. Token Encryption for External Integrations

```csharp
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace CalendarIntegration.Security
{
    public interface ITokenEncryptionService
    {
        string Encrypt(string plainText);
        string Decrypt(string cipherText);
    }

    public class TokenEncryptionService : ITokenEncryptionService
    {
        private readonly byte[] _key;
        private readonly byte[] _iv;

        public TokenEncryptionService(IConfiguration configuration)
        {
            // Load encryption key from Azure Key Vault or app settings
            var keyBase64 = configuration["Encryption:Key"];
            var ivBase64 = configuration["Encryption:IV"];
            
            _key = Convert.FromBase64String(keyBase64);
            _iv = Convert.FromBase64String(ivBase64);
        }

        public string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return null;

            using var aes = Aes.Create();
            aes.Key = _key;
            aes.IV = _iv;

            var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);

            using var msEncrypt = new MemoryStream();
            using var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write);
            using (var swEncrypt = new StreamWriter(csEncrypt))
            {
                swEncrypt.Write(plainText);
            }

            return Convert.ToBase64String(msEncrypt.ToArray());
        }

        public string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return null;

            var buffer = Convert.FromBase64String(cipherText);

            using var aes = Aes.Create();
            aes.Key = _key;
            aes.IV = _iv;

            var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);

            using var msDecrypt = new MemoryStream(buffer);
            using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
            using var srDecrypt = new StreamReader(csDecrypt);
            
            return srDecrypt.ReadToEnd();
        }
    }
}
```

### 3. API Authorization Attributes

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CalendarIntegration.Security
{
    /// <summary>
    /// Ensures the user can only access their own subscriptions
    /// </summary>
    public class SubscriptionOwnerAttribute : TypeFilterAttribute
    {
        public SubscriptionOwnerAttribute() : base(typeof(SubscriptionOwnerFilter))
        {
        }
    }

    public class SubscriptionOwnerFilter : IAsyncActionFilter
    {
        private readonly IPermissionService _permissionService;

        public SubscriptionOwnerFilter(IPermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        public async Task OnActionExecutionAsync(
            ActionExecutingContext context, 
            ActionExecutionDelegate next)
        {
            var subscriptionId = context.ActionArguments.ContainsKey("subscriptionId")
                ? (Guid)context.ActionArguments["subscriptionId"]
                : Guid.Empty;

            if (subscriptionId == Guid.Empty)
            {
                context.Result = new BadRequestObjectResult("Subscription ID is required");
                return;
            }

            var userId = Guid.Parse(context.HttpContext.User.FindFirst("sub")?.Value 
                ?? context.HttpContext.User.FindFirst("oid")?.Value);

            var canManage = await _permissionService.CanManageSubscription(userId, subscriptionId);

            if (!canManage)
            {
                context.Result = new ForbidResult();
                return;
            }

            await next();
        }
    }
}
```

---

## Caching Strategy

### Redis Configuration

```csharp
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace CalendarIntegration.Services
{
    public interface ICachedCalendarService
    {
        Task<string> GetCachedCalendarFeed(string subscriptionKey);
        Task InvalidateSubscriptionCache(Guid subscriptionId);
        Task InvalidateUserCache(Guid userId);
    }

    public class CachedCalendarService : ICachedCalendarService
    {
        private readonly IDistributedCache _cache;
        private readonly ICalendarService _calendarService;
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<CachedCalendarService> _logger;

        // Cache configuration
        private const int FeedCacheDurationMinutes = 15;
        private const string CacheKeyPrefix = "calendar:feed:";

        public CachedCalendarService(
            IDistributedCache cache,
            ICalendarService calendarService,
            ApplicationDbContext dbContext,
            ILogger<CachedCalendarService> logger)
        {
            _cache = cache;
            _calendarService = calendarService;
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<string> GetCachedCalendarFeed(string subscriptionKey)
        {
            var cacheKey = $"{CacheKeyPrefix}{subscriptionKey}";
            
            // Try get from cache
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null)
            {
                _logger.LogDebug("Cache hit for subscription key: {SubscriptionKey}", subscriptionKey);
                return cached;
            }
            
            _logger.LogDebug("Cache miss for subscription key: {SubscriptionKey}", subscriptionKey);
            
            // Generate and cache
            var feed = await _calendarService.GenerateICalendarFeed(subscriptionKey);
            
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(FeedCacheDurationMinutes),
                SlidingExpiration = TimeSpan.FromMinutes(5) // Refresh if accessed within 5 min of expiry
            };
            
            await _cache.SetStringAsync(cacheKey, feed, cacheOptions);
            
            return feed;
        }

        public async Task InvalidateSubscriptionCache(Guid subscriptionId)
        {
            var subscription = await _dbContext.CalendarSubscriptions
                .FirstOrDefaultAsync(s => s.SubscriptionId == subscriptionId);
                
            if (subscription != null)
            {
                var cacheKey = $"{CacheKeyPrefix}{subscription.SubscriptionKey}";
                await _cache.RemoveAsync(cacheKey);
                _logger.LogInformation("Invalidated cache for subscription: {SubscriptionId}", subscriptionId);
            }
        }

        public async Task InvalidateUserCache(Guid userId)
        {
            // Invalidate all subscriptions for a user
            var subscriptions = await _dbContext.CalendarSubscriptions
                .Where(s => s.UserId == userId && s.IsActive)
                .ToListAsync();
                
            foreach (var subscription in subscriptions)
            {
                var cacheKey = $"{CacheKeyPrefix}{subscription.SubscriptionKey}";
                await _cache.RemoveAsync(cacheKey);
            }
            
            _logger.LogInformation(
                "Invalidated cache for {Count} subscriptions for user: {UserId}", 
                subscriptions.Count, 
                userId);
        }
    }
}
```

### Cache Invalidation Strategies

```csharp
// Invalidate cache when calendar events change
public class CalendarEventService
{
    private readonly ICachedCalendarService _cachedCalendarService;
    private readonly ApplicationDbContext _dbContext;

    public async Task CreateCalendarEvent(CalendarEvent calendarEvent)
    {
        _dbContext.CalendarEvents.Add(calendarEvent);
        await _dbContext.SaveChangesAsync();
        
        // Invalidate cache for all users who can see this employee
        await InvalidateCacheForEmployee(calendarEvent.EmployeeId);
    }

    public async Task UpdateCalendarEvent(CalendarEvent calendarEvent)
    {
        _dbContext.CalendarEvents.Update(calendarEvent);
        await _dbContext.SaveChangesAsync();
        
        await InvalidateCacheForEmployee(calendarEvent.EmployeeId);
    }

    private async Task InvalidateCacheForEmployee(Guid employeeId)
    {
        // Find all subscriptions that might include this employee
        var employee = await _dbContext.Employees
            .Include(e => e.Team)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            
        if (employee == null) return;
        
        // Invalidate for team members
        if (employee.TeamId.HasValue)
        {
            var teamMemberIds = await _dbContext.Employees
                .Where(e => e.TeamId == employee.TeamId)
                .Select(e => e.EmployeeId)
                .ToListAsync();
                
            foreach (var memberId in teamMemberIds)
            {
                await _cachedCalendarService.InvalidateUserCache(memberId);
            }
        }
        
        // Invalidate for all managers up the chain
        var managerId = employee.ManagerId;
        while (managerId.HasValue)
        {
            await _cachedCalendarService.InvalidateUserCache(managerId.Value);
            
            var manager = await _dbContext.Employees.FindAsync(managerId.Value);
            managerId = manager?.ManagerId;
        }
    }
}
```

---

## External Calendar Integrations

### Microsoft Graph Service

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Graph;
using Microsoft.Identity.Client;

namespace CalendarIntegration.Services
{
    public interface IMicrosoftGraphService
    {
        Task<string> GetAuthorizationUrl(Guid connectionId);
        Task ProcessAuthorizationCallback(string code, string state);
        Task SyncToOutlookCalendar(Guid connectionId);
        Task RefreshAccessToken(Guid connectionId);
    }

    public class MicrosoftGraphService : IMicrosoftGraphService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IFilterService _filterService;
        private readonly ITokenEncryptionService _encryptionService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MicrosoftGraphService> _logger;

        public MicrosoftGraphService(
            ApplicationDbContext dbContext,
            IFilterService filterService,
            ITokenEncryptionService encryptionService,
            IConfiguration configuration,
            ILogger<MicrosoftGraphService> logger)
        {
            _dbContext = dbContext;
            _filterService = filterService;
            _encryptionService = encryptionService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> GetAuthorizationUrl(Guid connectionId)
        {
            var connection = await _dbContext.ExternalCalendarConnections
                .FirstOrDefaultAsync(c => c.ConnectionId == connectionId);
                
            if (connection == null)
                throw new NotFoundException("Connection not found");

            var clientId = _configuration["AzureAd:ClientId"];
            var tenantId = _configuration["AzureAd:TenantId"];
            var redirectUri = _configuration["AzureAd:RedirectUri"];

            var app = ConfidentialClientApplicationBuilder
                .Create(clientId)
                .WithAuthority($"https://login.microsoftonline.com/{tenantId}")
                .WithClientSecret(_configuration["AzureAd:ClientSecret"])
                .WithRedirectUri(redirectUri)
                .Build();

            var scopes = new[] { "Calendars.ReadWrite", "offline_access" };

            var authUrl = await app.GetAuthorizationRequestUrl(scopes)
                .WithState(connectionId.ToString())
                .ExecuteAsync();

            return authUrl.ToString();
        }

        public async Task ProcessAuthorizationCallback(string code, string state)
        {
            var connectionId = Guid.Parse(state);
            var connection = await _dbContext.ExternalCalendarConnections
                .FirstOrDefaultAsync(c => c.ConnectionId == connectionId);
                
            if (connection == null)
                throw new NotFoundException("Connection not found");

            var clientId = _configuration["AzureAd:ClientId"];
            var tenantId = _configuration["AzureAd:TenantId"];
            var redirectUri = _configuration["AzureAd:RedirectUri"];

            var app = ConfidentialClientApplicationBuilder
                .Create(clientId)
                .WithAuthority($"https://login.microsoftonline.com/{tenantId}")
                .WithClientSecret(_configuration["AzureAd:ClientSecret"])
                .WithRedirectUri(redirectUri)
                .Build();

            var scopes = new[] { "Calendars.ReadWrite", "offline_access" };

            var result = await app.AcquireTokenByAuthorizationCode(scopes, code)
                .ExecuteAsync();

            // Encrypt and store tokens
            connection.AccessTokenEncrypted = _encryptionService.Encrypt(result.AccessToken);
            connection.RefreshTokenEncrypted = _encryptionService.Encrypt(result.RefreshToken);
            connection.TokenExpiresAt = result.ExpiresOn.UtcDateTime;
            connection.SyncStatus = "ACTIVE";

            await _dbContext.SaveChangesAsync();

            // Perform initial sync
            await SyncToOutlookCalendar(connectionId);
        }

        public async Task SyncToOutlookCalendar(Guid connectionId)
        {
            var connection = await _dbContext.ExternalCalendarConnections
                .Include(c => c.Subscription)
                .ThenInclude(s => s.Filters)
                .FirstOrDefaultAsync(c => c.ConnectionId == connectionId);
                
            if (connection == null)
                throw new NotFoundException("Connection not found");

            connection.SyncStatus = "SYNCING";
            await _dbContext.SaveChangesAsync();

            try
            {
                // Refresh token if needed
                if (connection.TokenExpiresAt <= DateTime.UtcNow.AddMinutes(5))
                {
                    await RefreshAccessToken(connectionId);
                    connection = await _dbContext.ExternalCalendarConnections
                        .Include(c => c.Subscription)
                        .ThenInclude(s => s.Filters)
                        .FirstAsync(c => c.ConnectionId == connectionId);
                }

                var accessToken = _encryptionService.Decrypt(connection.AccessTokenEncrypted);
                var graphClient = GetGraphClient(accessToken);

                // Get events from our system
                var events = await _filterService.ApplyFilters(
                    connection.Subscription.UserId,
                    connection.Subscription.Filters);

                // Get existing synced events from Outlook
                var calendarId = connection.ExternalCalendarId ?? "primary";
                var outlookEvents = await graphClient.Me.Calendars[calendarId]
                    .Events
                    .Request()
                    .Filter("categories/any(c: c eq 'TeamCalendarSync')")
                    .Select("id,subject,start,end,categories")
                    .GetAsync();

                var syncedCount = 0;

                // Sync logic: Create or Update events
                foreach (var evt in events)
                {
                    var eventId = $"TeamCalSync_{evt.EventId}";
                    
                    var existingEvent = outlookEvents.FirstOrDefault(e => 
                        e.Categories?.Contains(eventId) == true);

                    if (existingEvent == null)
                    {
                        await CreateOutlookEvent(graphClient, calendarId, evt, eventId);
                        syncedCount++;
                    }
                    else if (HasEventChanged(existingEvent, evt))
                    {
                        await UpdateOutlookEvent(graphClient, calendarId, existingEvent.Id, evt, eventId);
                        syncedCount++;
                    }
                }

                // Remove events that no longer exist in our system
                var currentEventIds = events.Select(e => $"TeamCalSync_{e.EventId}").ToHashSet();
                var eventsToDelete = outlookEvents.Where(e => 
                    e.Categories?.Any(c => c.StartsWith("TeamCalSync_")) == true &&
                    !e.Categories.Any(c => currentEventIds.Contains(c)));

                foreach (var eventToDelete in eventsToDelete)
                {
                    await graphClient.Me.Calendars[calendarId]
                        .Events[eventToDelete.Id]
                        .Request()
                        .DeleteAsync();
                }

                connection.LastSyncAt = DateTime.UtcNow;
                connection.SyncStatus = "SUCCESS";
                connection.SyncErrorMessage = null;
                
                _logger.LogInformation(
                    "Synced {Count} events to Outlook for connection {ConnectionId}",
                    syncedCount,
                    connectionId);
            }
            catch (Exception ex)
            {
                connection.SyncStatus = "FAILED";
                connection.SyncErrorMessage = ex.Message;
                _logger.LogError(ex, "Failed to sync to Outlook for connection {ConnectionId}", connectionId);
            }
            finally
            {
                await _dbContext.SaveChangesAsync();
            }
        }

        private async Task CreateOutlookEvent(
            GraphServiceClient graphClient, 
            string calendarId, 
            CalendarEvent evt,
            string syncId)
        {
            var outlookEvent = new Event
            {
                Subject = evt.Title,
                Body = new ItemBody 
                { 
                    Content = evt.Description, 
                    ContentType = BodyType.Text 
                },
                Start = new DateTimeTimeZone 
                { 
                    DateTime = evt.StartDate.ToString("yyyy-MM-ddTHH:mm:ss"), 
                    TimeZone = "UTC" 
                },
                End = new DateTimeTimeZone 
                { 
                    DateTime = evt.EndDate.ToString("yyyy-MM-ddTHH:mm:ss"), 
                    TimeZone = "UTC" 
                },
                IsAllDay = evt.IsAllDay,
                Location = new Location { DisplayName = evt.Location },
                Categories = new List<string> 
                { 
                    "TeamCalendarSync", 
                    syncId,
                    evt.EventType, 
                    evt.EventSubtype 
                }.Where(c => !string.IsNullOrEmpty(c)).ToList(),
                IsReminderOn = false,
                ShowAs = FreeBusyStatus.Free,
                Sensitivity = Sensitivity.Normal
            };

            await graphClient.Me.Calendars[calendarId].Events
                .Request()
                .AddAsync(outlookEvent);
        }

        private async Task UpdateOutlookEvent(
            GraphServiceClient graphClient, 
            string calendarId, 
            string eventId,
            CalendarEvent evt,
            string syncId)
        {
            var outlookEvent = new Event
            {
                Subject = evt.Title,
                Body = new ItemBody 
                { 
                    Content = evt.Description, 
                    ContentType = BodyType.Text 
                },
                Start = new DateTimeTimeZone 
                { 
                    DateTime = evt.StartDate.ToString("yyyy-MM-ddTHH:mm:ss"), 
                    TimeZone = "UTC" 
                },
                End = new DateTimeTimeZone 
                { 
                    DateTime = evt.EndDate.ToString("yyyy-MM-ddTHH:mm:ss"), 
                    TimeZone = "UTC" 
                },
                IsAllDay = evt.IsAllDay,
                Location = new Location { DisplayName = evt.Location },
                Categories = new List<string> 
                { 
                    "TeamCalendarSync", 
                    syncId,
                    evt.EventType, 
                    evt.EventSubtype 
                }.Where(c => !string.IsNullOrEmpty(c)).ToList()
            };

            await graphClient.Me.Calendars[calendarId].Events[eventId]
                .Request()
                .UpdateAsync(outlookEvent);
        }

        private bool HasEventChanged(Event outlookEvent, CalendarEvent ourEvent)
        {
            return outlookEvent.Subject != ourEvent.Title ||
                   outlookEvent.Start.DateTime != ourEvent.StartDate.ToString("yyyy-MM-ddTHH:mm:ss") ||
                   outlookEvent.End.DateTime != ourEvent.EndDate.ToString("yyyy-MM-ddTHH:mm:ss");
        }

        public async Task RefreshAccessToken(Guid connectionId)
        {
            var connection = await _dbContext.ExternalCalendarConnections
                .FirstOrDefaultAsync(c => c.ConnectionId == connectionId);
                
            if (connection == null)
                throw new NotFoundException("Connection not found");

            var clientId = _configuration["AzureAd:ClientId"];
            var tenantId = _configuration["AzureAd:TenantId"];

            var app = ConfidentialClientApplicationBuilder
                .Create(clientId)
                .WithAuthority($"https://login.microsoftonline.com/{tenantId}")
                .WithClientSecret(_configuration["AzureAd:ClientSecret"])
                .Build();

            var refreshToken = _encryptionService.Decrypt(connection.RefreshTokenEncrypted);
            
            var result = await app.AcquireTokenByRefreshToken(
                new[] { "Calendars.ReadWrite", "offline_access" }, 
                refreshToken)
                .ExecuteAsync();

            connection.AccessTokenEncrypted = _encryptionService.Encrypt(result.AccessToken);
            connection.RefreshTokenEncrypted = _encryptionService.Encrypt(result.RefreshToken);
            connection.TokenExpiresAt = result.ExpiresOn.UtcDateTime;

            await _dbContext.SaveChangesAsync();
        }

        private GraphServiceClient GetGraphClient(string accessToken)
        {
            var authProvider = new DelegateAuthenticationProvider((requestMessage) =>
            {
                requestMessage.Headers.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                return Task.CompletedTask;
            });

            return new GraphServiceClient(authProvider);
        }
    }
}
```

### Background Sync Job (Hangfire)

```csharp
using Hangfire;

namespace CalendarIntegration.Jobs
{
    public class CalendarSyncJob
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IMicrosoftGraphService _graphService;
        private readonly IGoogleCalendarService _googleService;
        private readonly ILogger<CalendarSyncJob> _logger;

        public CalendarSyncJob(
            ApplicationDbContext dbContext,
            IMicrosoftGraphService graphService,
            IGoogleCalendarService googleService,
            ILogger<CalendarSyncJob> logger)
        {
            _dbContext = dbContext;
            _graphService = graphService;
            _googleService = googleService;
            _logger = logger;
        }

        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        public async Task SyncAllConnections()
        {
            _logger.LogInformation("Starting calendar sync job");

            var connections = await _dbContext.ExternalCalendarConnections
                .Where(c => c.SyncStatus == "ACTIVE" || c.SyncStatus == "FAILED")
                .ToListAsync();

            foreach (var connection in connections)
            {
                try
                {
                    if (connection.Provider == "MICROSOFT_GRAPH")
                    {
                        await _graphService.SyncToOutlookCalendar(connection.ConnectionId);
                    }
                    else if (connection.Provider == "GOOGLE_CALENDAR")
                    {
                        await _googleService.SyncToGoogleCalendar(connection.ConnectionId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex, 
                        "Failed to sync connection {ConnectionId}", 
                        connection.ConnectionId);
                }
            }

            _logger.LogInformation("Completed calendar sync job");
        }
    }

    // Job registration in Startup.cs
    public static class HangfireConfiguration
    {
        public static void ConfigureCalendarSyncJobs()
        {
            // Sync every 15 minutes
            RecurringJob.AddOrUpdate<CalendarSyncJob>(
                "calendar-sync",
                job => job.SyncAllConnections(),
                "*/15 * * * *"); // Cron expression: every 15 minutes
        }
    }
}
```

---

## Predefined Templates

### System Templates

```csharp
namespace CalendarIntegration.Data
{
    public static class SystemTemplates
    {
        public static List<SubscriptionTemplate> GetSystemTemplates()
        {
            return new List<SubscriptionTemplate>
            {
                new()
                {
                    TemplateId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    TemplateName = "My Team",
                    TemplateDescription = "View PTO and work locations for your team members",
                    TemplateType = "MY_TEAM",
                    IsSystemTemplate = true,
                    DisplayOrder = 1,
                    Filters = new List<TemplateFilter>
                    {
                        new()
                        {
                            FilterType = "TEAM",
                            FilterValuePattern = "${USER_TEAM}",
                            FilterOperator = "EQUALS"
                        }
                    }
                },
                new()
                {
                    TemplateId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    TemplateName = "My Direct Reports",
                    TemplateDescription = "View calendars for all your direct and indirect reports",
                    TemplateType = "DIRECT_REPORTS",
                    IsSystemTemplate = true,
                    DisplayOrder = 2,
                    Filters = new List<TemplateFilter>
                    {
                        new()
                        {
                            FilterType = "DIRECT_REPORTS",
                            FilterValuePattern = "${USER_ID}",
                            FilterOperator = "EQUALS"
                        }
                    }
                },
                new()
                {
                    TemplateId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    TemplateName = "My Department",
                    TemplateDescription = "View calendars for everyone in your department",
                    TemplateType = "DEPARTMENT",
                    IsSystemTemplate = true,
                    DisplayOrder = 3,
                    Filters = new List<TemplateFilter>
                    {
                        new()
                        {
                            FilterType = "DEPARTMENT",
                            FilterValuePattern = "${USER_DEPARTMENT}",
                            FilterOperator = "EQUALS"
                        }
                    }
                },
                new()
                {
                    TemplateId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    TemplateName = "My Office Location",
                    TemplateDescription = "View who's working at your primary office location",
                    TemplateType = "LOCATION",
                    IsSystemTemplate = true,
                    DisplayOrder = 4,
                    Filters = new List<TemplateFilter>
                    {
                        new()
                        {
                            FilterType = "LOCATION",
                            FilterValuePattern = "${USER_LOCATION}",
                            FilterOperator = "EQUALS"
                        }
                    }
                }
            };
        }
    }
}
```

### Template Variable Resolution

```csharp
namespace CalendarIntegration.Services
{
    public class TemplateVariableResolver
    {
        private readonly ApplicationDbContext _dbContext;

        public TemplateVariableResolver(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<string> ResolveVariables(string pattern, Guid userId)
        {
            if (string.IsNullOrEmpty(pattern) || !pattern.Contains("${"))
                return pattern;

            var user = await _dbContext.Employees
                .Include(e => e.Team)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.EmployeeId == userId);

            if (user == null)
                return pattern;

            return pattern
                .Replace("${USER_ID}", userId.ToString())
                .Replace("${USER_TEAM}", user.TeamId?.ToString() ?? "")
                .Replace("${USER_DEPARTMENT}", user.DepartmentId?.ToString() ?? "")
                .Replace("${USER_LOCATION}", user.PrimaryOfficeLocationId?.ToString() ?? "");
        }
    }
}
```

---

## Technology Stack

### Backend Framework
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <!-- Core Framework -->
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
    <PackageReference Include="Microsoft.Identity.Web" Version="2.15.0" />
    
    <!-- Entity Framework Core -->
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.0" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
    
    <!-- iCalendar -->
    <PackageReference Include="Ical.Net" Version="4.2.0" />
    
    <!-- Microsoft Graph -->
    <PackageReference Include="Microsoft.Graph" Version="5.36.0" />
    <PackageReference Include="Microsoft.Identity.Client" Version="4.57.0" />
    
    <!-- Google Calendar -->
    <PackageReference Include="Google.Apis.Calendar.v3" Version="1.63.0.3138" />
    <PackageReference Include="Google.Apis.Auth" Version="1.63.0" />
    
    <!-- Caching -->
    <PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="8.0.0" />
    
    <!-- Background Jobs -->
    <PackageReference Include="Hangfire.AspNetCore" Version="1.8.6" />
    <PackageReference Include="Hangfire.PostgreSql" Version="1.20.6" />
    
    <!-- Utilities -->
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
    <PackageReference Include="Serilog.AspNetCore" Version="8.0.0" />
    <PackageReference Include="Serilog.Sinks.ApplicationInsights" Version="4.0.0" />
  </ItemGroup>
</Project>
```

### Azure Services

- **Azure App Service**: Web API hosting
- **Azure Database for PostgreSQL - Flexible Server**: Primary database
- **Azure Cache for Redis**: Distributed caching
- **Azure Application Gateway**: Load balancing, SSL termination
- **Azure Key Vault**: Secrets management (encryption keys, connection strings)
- **Azure Application Insights**: Monitoring and logging
- **Azure AD/Entra ID**: Authentication and organizational data

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goals:**
- Database schema setup
- Basic API structure
- Core services

**Tasks:**
1. Create PostgreSQL database and tables
2. Set up Entity Framework Core with migrations
3. Implement `FilterService` with permission logic
4. Create basic CRUD endpoints for subscriptions
5. Set up Azure AD authentication
6. Configure logging and Application Insights

**Deliverables:**
- Working database with test data
- Authenticated API endpoints
- Basic subscription management

### Phase 2: ICS Feed Generation (Weeks 3-4)

**Goals:**
- Implement iCalendar feed generation
- Add Redis caching
- Test with various calendar clients

**Tasks:**
1. Implement `CalendarService.GenerateICalendarFeed()`
2. Add subscription key generation and validation
3. Set up Redis cache
4. Implement `CachedCalendarService`
5. Add cache invalidation logic
6. Test with Outlook, Google Calendar, Apple Calendar

**Deliverables:**
- Working ICS feed endpoint
- Cached calendar generation
- Compatible with major calendar clients

### Phase 3: Templates & UI (Weeks 5-6)

**Goals:**
- Predefined templates
- Subscription management UI
- Filter preview

**Tasks:**
1. Seed system templates
2. Implement template variable resolution
3. Build subscription management UI (React or Blazor)
4. Add filter preview functionality
5. Implement subscription editing
6. Add usage analytics (access count, last accessed)

**Deliverables:**
- Working template system
- User-friendly subscription management interface
- Real-time filter preview

### Phase 4: External Integrations (Weeks 7-9)

**Goals:**
- Microsoft Graph integration
- Google Calendar integration
- Background sync jobs

**Tasks:**
1. Implement OAuth flows for Microsoft and Google
2. Build `MicrosoftGraphService`
3. Build `GoogleCalendarService`
4. Set up Hangfire for background jobs
5. Implement token refresh logic
6. Add sync status monitoring
7. Error handling and retry logic

**Deliverables:**
- Working OAuth flows
- Automatic calendar synchronization
- Background job system

### Phase 5: Optimization & Launch (Weeks 10-11)

**Goals:**
- Performance tuning
- Security hardening
- Production deployment

**Tasks:**
1. Database query optimization and indexing
2. Load testing and performance tuning
3. Security audit and penetration testing
4. Documentation completion
5. Deployment automation (CI/CD)
6. User acceptance testing
7. Production deployment

**Deliverables:**
- Production-ready system
- Complete documentation
- Deployment pipeline

---

## Configuration

### appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    },
    "ApplicationInsights": {
      "LogLevel": {
        "Default": "Information"
      }
    }
  },
  "AllowedHosts": "*",
  
  "ConnectionStrings": {
    "PostgreSQL": "Host=your-postgres.postgres.database.azure.com;Port=5432;Database=calendarsync;Username=pgadmin;Password=your-password;SSL Mode=Require;Trust Server Certificate=true",
    "Redis": "your-redis.redis.cache.windows.net:6380,password=your-redis-key,ssl=True,abortConnect=False"
  },
  
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "Domain": "yourcompany.onmicrosoft.com",
    "TenantId": "your-tenant-id",
    "ClientId": "your-app-registration-client-id",
    "ClientSecret": "your-client-secret",
    "RedirectUri": "https://your-app.azurewebsites.net/api/v1/integrations/microsoft/callback",
    "Scopes": "Calendars.ReadWrite offline_access"
  },
  
  "GoogleCalendar": {
    "ClientId": "your-google-oauth-client-id",
    "ClientSecret": "your-google-client-secret",
    "RedirectUri": "https://your-app.azurewebsites.net/api/v1/integrations/google/callback",
    "Scopes": "https://www.googleapis.com/auth/calendar"
  },
  
  "CalendarSettings": {
    "BaseUrl": "https://your-app.azurewebsites.net",
    "FeedCacheDurationMinutes": 15,
    "MaxSubscriptionsPerUser": 10,
    "SubscriptionKeyLength": 32,
    "EnableExternalSync": true,
    "SyncIntervalMinutes": 15
  },
  
  "Encryption": {
    "KeyVaultUri": "https://your-keyvault.vault.azure.net/",
    "KeyName": "token-encryption-key",
    "IVName": "token-encryption-iv"
  },
  
  "Hangfire": {
    "ConnectionString": "Host=your-postgres.postgres.database.azure.com;Port=5432;Database=calendarsync;Username=pgadmin;Password=your-password;SSL Mode=Require",
    "WorkerCount": 5
  },
  
  "ApplicationInsights": {
    "ConnectionString": "InstrumentationKey=your-app-insights-key;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/"
  }
}
```

### appsettings.Development.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information",
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  },
  
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Port=5432;Database=calendarsync_dev;Username=postgres;Password=devpassword",
    "Redis": "localhost:6379"
  },
  
  "CalendarSettings": {
    "BaseUrl": "https://localhost:7001",
    "EnableExternalSync": false
  }
}
```

---

## Testing Strategy

### Unit Tests

```csharp
using Xunit;
using Moq;

namespace CalendarIntegration.Tests.Services
{
    public class FilterServiceTests
    {
        [Fact]
        public async Task ApplyFilters_WithTeamFilter_ReturnsOnlyTeamMembers()
        {
            // Arrange
            var dbContext = GetInMemoryDbContext();
            var permissionService = new Mock<IPermissionService>();
            var filterService = new FilterService(dbContext, permissionService.Object);
            
            var userId = SeedTestData(dbContext);
            var filters = new List<SubscriptionFilter>
            {
                new() { FilterType = "TEAM", FilterValue = "${USER_TEAM}" }
            };
            
            // Act
            var results = await filterService.ApplyFilters(userId, filters);
            
            // Assert
            Assert.NotEmpty(results);
            Assert.All(results, e => Assert.NotEqual(Guid.Empty, e.EmployeeId));
        }
        
        [Fact]
        public async Task GetVisibleEmployeeIds_AsManager_IncludesDirectReports()
        {
            // Arrange
            var dbContext = GetInMemoryDbContext();
            var permissionService = new Mock<IPermissionService>();
            var filterService = new FilterService(dbContext, permissionService.Object);
            
            var managerId = SeedManagerHierarchy(dbContext);
            
            // Act
            var visibleIds = await filterService.GetVisibleEmployeeIds(managerId);
            
            // Assert
            Assert.Contains(managerId, visibleIds); // Manager can see themselves
            Assert.True(visibleIds.Count >= 3); // At least 2 direct reports + manager
        }
    }
}
```

### Integration Tests

```csharp
namespace CalendarIntegration.Tests.Integration
{
    public class CalendarFeedTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        
        public CalendarFeedTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }
        
        [Fact]
        public async Task GetCalendarFeed_WithValidKey_ReturnsICalendar()
        {
            // Arrange
            var client = _factory.CreateClient();
            var subscriptionKey = await CreateTestSubscription(client);
            
            // Act
            var response = await client.GetAsync($"/api/calendar/feed/{subscriptionKey}.ics");
            
            // Assert
            response.EnsureSuccessStatusCode();
            Assert.Equal("text/calendar", response.Content.Headers.ContentType.MediaType);
            
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("BEGIN:VCALENDAR", content);
            Assert.Contains("END:VCALENDAR", content);
        }
    }
}
```

---

## Deployment Guide

### Azure Resource Setup

```bash
# Variables
RESOURCE_GROUP="rg-calendar-integration"
LOCATION="eastus"
APP_NAME="calendar-sync-api"
DB_SERVER="cal-sync-postgres"
REDIS_NAME="cal-sync-redis"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --location $LOCATION \
  --admin-user pgadmin \
  --admin-password 'YourSecurePassword123!' \
  --sku-name Standard_B2s \
  --tier Burstable \
  --version 14 \
  --storage-size 32

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --database-name calendarsync

# Create Redis cache
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0

# Create App Service Plan
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME-plan \
  --location $LOCATION \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_NAME-plan \
  --name $APP_NAME \
  --runtime "DOTNET|8.0"

# Configure App Settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    "ConnectionStrings__PostgreSQL=Host=$DB_SERVER.postgres.database.azure.com;..." \
    "ConnectionStrings__Redis=$REDIS_NAME.redis.cache.windows.net:6380,..."
```

### CI/CD Pipeline (Azure DevOps)

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  buildConfiguration: 'Release'

stages:
- stage: Build
  jobs:
  - job: BuildAndTest
    steps:
    - task: UseDotNet@2
      inputs:
        version: '8.x'
    
    - task: DotNetCoreCLI@2
      displayName: 'Restore packages'
      inputs:
        command: 'restore'
        projects: '**/*.csproj'
    
    - task: DotNetCoreCLI@2
      displayName: 'Build solution'
      inputs:
        command: 'build'
        projects: '**/*.csproj'
        arguments: '--configuration $(buildConfiguration)'
    
    - task: DotNetCoreCLI@2
      displayName: 'Run tests'
      inputs:
        command: 'test'
        projects: '**/*Tests.csproj'
        arguments: '--configuration $(buildConfiguration) --collect:"XPlat Code Coverage"'
    
    - task: DotNetCoreCLI@2
      displayName: 'Publish'
      inputs:
        command: 'publish'
        publishWebProjects: true
        arguments: '--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)'
        zipAfterPublish: true
    
    - task: PublishBuildArtifacts@1
      inputs:
        PathtoPublish: '$(Build.ArtifactStagingDirectory)'
        ArtifactName: 'drop'

- stage: Deploy
  dependsOn: Build
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployToProduction
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureWebApp@1
            inputs:
              azureSubscription: 'Azure-Subscription'
              appType: 'webAppLinux'
              appName: 'calendar-sync-api'
              package: '$(Pipeline.Workspace)/drop/**/*.zip'
```

### Database Migrations

```bash
# Add migration
dotnet ef migrations add InitialCreate --project CalendarIntegration.Data

# Update database
dotnet ef database update --project CalendarIntegration.Data

# Generate SQL script for production
dotnet ef migrations script --project CalendarIntegration.Data --output migration.sql
```

---

## Monitoring & Maintenance

### Application Insights Queries

```kusto
// Failed calendar feed requests
requests
| where name contains "calendar/feed"
| where success == false
| summarize count() by resultCode, bin(timestamp, 1h)

// Subscription creation rate
customEvents
| where name == "SubscriptionCreated"
| summarize count() by bin(timestamp, 1d)

// External sync failures
customEvents
| where name == "SyncFailed"
| extend provider = tostring(customDimensions.Provider)
| summarize count() by provider, bin(timestamp, 1h)

// Cache hit rate
dependencies
| where type == "Redis"
| summarize 
    hits = countif(success == true and resultCode == "200"),
    misses = countif(success == false or resultCode != "200")
| extend hitRate = hits * 100.0 / (hits + misses)
```

### Health Checks

```csharp
// Startup.cs
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("PostgreSQL"))
    .AddRedis(builder.Configuration.GetConnectionString("Redis"))
    .AddCheck<GraphApiHealthCheck>("microsoft-graph")
    .AddCheck<GoogleCalendarHealthCheck>("google-calendar");

app.MapHealthChecks("/health");
```

---

## Security Considerations

### 1. Subscription Key Security
- Keys are cryptographically random (256 bits)
- Stored in database, never exposed in logs
- Rate limiting on feed endpoints (10 req/min per key)

### 2. Authentication & Authorization
- Azure AD JWT tokens for API access
- Subscription ownership validation on all management operations
- Row-level security via permission service

### 3. Data Privacy
- PTO reason codes visible only to team/managers
- Encrypted tokens for external calendar integrations
- Audit logging for all subscription modifications

### 4. External API Security
- OAuth 2.0 for Microsoft Graph and Google Calendar
- Token encryption at rest using Azure Key Vault
- Automatic token refresh with retry logic

---

## Conclusion

This design provides a comprehensive, production-ready calendar integration system that balances flexibility, security, and performance. The architecture supports both simple ICS feed subscriptions and rich API integrations with external calendar providers.

**Key Success Factors:**
- Layered architecture for maintainability
- Robust permission system protecting sensitive data
- Efficient caching reducing database load
- Flexible filter combinations for customization
- Background jobs ensuring reliable synchronization

**Next Steps:**
1. Review and approve design
2. Set up Azure resources
3. Begin Phase 1 implementation
4. Schedule regular checkpoint reviews

---

**Document Version:** 1.0  
**Last Updated:** November 29, 2025  
**Author:** System Architecture Team  
**Reviewers:** CTO, Engineering Lead, Security Team
