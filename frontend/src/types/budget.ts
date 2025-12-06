export enum ProjectBudgetType {
  Original = 0,
  Reforecast = 1,
  Amendment = 2,
  WhatIf = 3,
}

export enum ProjectBudgetStatus {
  Draft = 0,
  Submitted = 1,
  Approved = 2,
  Rejected = 3,
  Active = 4,
  Superseded = 5,
}

export interface ProjectBudgetLine {
  id: string;
  projectBudgetId: string;
  year: number;
  month: number;
  budgetedHours: number;
  budgetedAmount?: number;
  wbsElementId?: string;
  wbsElementCode?: string;
  wbsElementDescription?: string;
  laborCategoryId?: string;
  laborCategoryName?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectBudgetHistory {
  id: string;
  projectBudgetId: string;
  changeType: string;
  changedByUserId?: string;
  previousStatus?: ProjectBudgetStatus;
  newStatus?: ProjectBudgetStatus;
  comments?: string;
  changedAt: string;
  changedByUserName?: string;
}

export interface ProjectBudget {
  id: string;
  projectId: string;
  tenantId: string;
  budgetType: ProjectBudgetType;
  status: ProjectBudgetStatus;
  version: number;
  parentBudgetId?: string;
  fiscalYear: number;
  fiscalYearStartMonth: number;
  totalBudgetedHours: number;
  totalBudgetedAmount?: number;
  name?: string;
  description?: string;
  effectiveDate?: string;
  approvedAt?: string;
  approvedByUserId?: string;
  rejectedAt?: string;
  rejectedByUserId?: string;
  rejectionReason?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt?: string;
  // Navigation properties
  projectName?: string;
  projectCode?: string;
  approvedByUserName?: string;
  rejectedByUserName?: string;
  createdByUserName?: string;
  budgetLines?: ProjectBudgetLine[];
  history?: ProjectBudgetHistory[];
}

export interface CreateProjectBudgetRequest {
  projectId: string;
  budgetType: ProjectBudgetType;
  fiscalYear: number;
  name?: string;
  description?: string;
  budgetLines: CreateBudgetLineRequest[];
}

export interface CreateBudgetLineRequest {
  year: number;
  month: number;
  budgetedHours: number;
  budgetedAmount?: number;
  wbsElementId?: string;
  laborCategoryId?: string;
  notes?: string;
}

export interface UpdateProjectBudgetRequest {
  name?: string;
  description?: string;
  budgetLines?: CreateBudgetLineRequest[];
}

export interface FiscalYearInfo {
  fiscalYear: number;
  startDate: string;
  endDate: string;
  startMonth: number;
  months: FiscalMonthInfo[];
}

export interface FiscalMonthInfo {
  year: number;
  month: number;
  label: string;
}

export interface GetProjectBudgetsParams {
  projectId?: string;
  fiscalYear?: number;
  budgetType?: ProjectBudgetType;
  status?: ProjectBudgetStatus;
  includeSuperseded?: boolean;
}
