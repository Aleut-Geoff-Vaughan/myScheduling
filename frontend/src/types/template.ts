import { WorkLocationType, DayPortion } from './api';

export enum TemplateType {
  Day = 0,
  Week = 1,
  Custom = 2,
}

export interface WorkLocationTemplateItem {
  id: string;
  templateId: string;
  dayOffset: number;
  dayOfWeek?: number; // 0-6 for Sunday-Saturday
  locationType: WorkLocationType;
  dayPortion: DayPortion; // Full day, AM only, or PM only
  officeId?: string;
  remoteLocation?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkLocationTemplate {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: TemplateType;
  isShared: boolean;
  items: WorkLocationTemplateItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApplyTemplateRequest {
  startDate: string; // ISO date string
  weekCount: number;
}

export interface CreateTemplateRequest {
  tenantId: string;
  name: string;
  description?: string;
  type: TemplateType;
  isShared: boolean;
  items: Omit<WorkLocationTemplateItem, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>[];
}

export interface UpdateTemplateRequest extends CreateTemplateRequest {
  id: string;
}
