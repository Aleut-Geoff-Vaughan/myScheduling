/**
 * Team Calendar Type Definitions
 * Corresponds to backend TeamCalendarModels.cs
 */

export enum TeamCalendarType {
  Team = 0,
  Manager = 1,
  Department = 2,
  Project = 3,
}

export enum MembershipType {
  OptIn = 0,
  Forced = 1,
  Automatic = 2,
}

export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  managerUserId?: string;
  managerName?: string;
}

export interface TeamCalendarMemberResponse {
  id: string;
  teamCalendarId: string;
  userId: string;
  user: UserSummary;
  membershipType: MembershipType;
  addedDate: string; // ISO date string
  addedByUserId?: string;
  addedByName?: string;
  isActive: boolean;
}

export interface TeamCalendarResponse {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: TeamCalendarType;
  isActive: boolean;
  ownerUserId?: string;
  owner?: UserSummary;
  memberCount: number;
  members: TeamCalendarMemberResponse[];
  createdAt: string; // ISO date string
}

export interface CreateTeamCalendarRequest {
  name: string;
  description?: string;
  type: TeamCalendarType;
  ownerUserId?: string;
  isActive: boolean;
}

export interface UpdateTeamCalendarRequest {
  name: string;
  description?: string;
  type: TeamCalendarType;
  ownerUserId?: string;
  isActive: boolean;
}

export interface AddTeamCalendarMemberRequest {
  userId: string;
  membershipType: MembershipType;
}

export interface BulkAddMembersRequest {
  userIds: string[];
  membershipType: MembershipType;
}

export interface WorkLocationPreferenceResponse {
  id: string;
  workDate: string; // ISO date string (YYYY-MM-DD)
  locationType: number; // WorkLocationType enum
  dayPortion: number; // DayPortion enum (0 = FullDay, 1 = AM, 2 = PM)
  officeId?: string;
  officeName?: string;
  remoteLocation?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
}

export interface TeamMemberSchedule {
  userId: string;
  userName: string;
  userEmail?: string;
  managerUserId?: string;
  jobTitle?: string;
  preferences: WorkLocationPreferenceResponse[];
}

export interface TeamCalendarViewResponse {
  calendar: TeamCalendarResponse;
  memberSchedules: TeamMemberSchedule[];
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

export interface ManagerViewRequest {
  managerUserId?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

export interface ManagerViewResponse {
  manager: UserSummary;
  directReports: TeamMemberSchedule[];
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  totalDirectReports: number;
}

export interface TeamCalendarSummary {
  id: string;
  name: string;
  description?: string;
  type: TeamCalendarType;
  memberCount: number;
  isMember: boolean;
  membershipType?: MembershipType;
}

export interface AvailableTeamCalendarsResponse {
  availableCalendars: TeamCalendarSummary[];
  memberOf: TeamCalendarSummary[];
}
