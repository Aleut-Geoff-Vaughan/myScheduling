// Enums
export enum PersonStatus {
  Active = 0,
  Inactive = 1,
  OnLeave = 2,
}

export enum PersonType {
  Employee = 0,
  Contractor = 1,
  Vendor = 2,
  External = 3,
}

export enum ProjectStatus {
  Draft = 0,
  Active = 1,
  Closed = 2,
}

export enum AssignmentStatus {
  Draft = 0,
  PendingApproval = 1,
  Active = 2,
  Completed = 3,
  Cancelled = 4,
}

export enum BookingStatus {
  Reserved = 0,
  CheckedIn = 1,
  Completed = 2,
  Cancelled = 3,
  NoShow = 4,
}

export enum TenantStatus {
  Active = 0,
  Inactive = 1,
  Suspended = 2,
}

export enum SpaceType {
  Desk = 0,
  Office = 1,
  ConferenceRoom = 2,
  Huddle = 3,
  PhoneBooth = 4,
}

// Entities
export interface Person {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  laborCategory?: string;
  location?: string;
  status: PersonStatus;
  type: PersonType;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  programCode?: string;
  customer?: string;
  startDate: string;
  endDate?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  tenantId: string;
  personId: string;
  wbsElementId: string;
  projectRoleId: string;
  startDate: string;
  endDate: string;
  allocation: number;
  status: AssignmentStatus;
  approvedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  spaceId: string;
  personId: string;
  startDatetime: string;
  endDatetime: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  entraObjectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Office {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  totalCapacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  officeId: string;
  name: string;
  type: SpaceType;
  floor?: string;
  building?: string;
  capacity?: number;
  amenities?: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}
