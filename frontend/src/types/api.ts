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
  HotDesk = 1,
  Office = 2,
  Cubicle = 3,
  Room = 4,
  ConferenceRoom = 5,
  HuddleRoom = 6,
  PhoneBooth = 7,
  TrainingRoom = 8,
  BreakRoom = 9,
  ParkingSpot = 10,
}

export enum WbsType {
  Billable = 0,
  NonBillable = 1,
  BidAndProposal = 2,
  Overhead = 3,
  GeneralAndAdmin = 4,
}

export enum WbsApprovalStatus {
  Draft = 0,
  PendingApproval = 1,
  Approved = 2,
  Rejected = 3,
  Suspended = 4,
  Closed = 5,
}

export enum ResumeStatus {
  Draft = 0,
  PendingReview = 1,
  Approved = 2,
  ChangesRequested = 3,
  Active = 4,
  Archived = 5,
}

export enum ApprovalStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  ChangesRequested = 3,
  Cancelled = 4,
}

export enum ResumeSectionType {
  Summary = 0,
  Experience = 1,
  Education = 2,
  Certifications = 3,
  Skills = 4,
  Projects = 5,
  Awards = 6,
  Publications = 7,
}

export enum ResumeTemplateType {
  Federal = 0,
  Commercial = 1,
  Executive = 2,
  Technical = 3,
  Academic = 4,
  Custom = 5,
}

export enum ProficiencyLevel {
  Beginner = 0,
  Intermediate = 1,
  Advanced = 2,
  Expert = 3,
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
  code?: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export enum AppRole {
  // Tenant-Level Roles
  Employee = 0,
  ViewOnly = 1,
  TeamLead = 2,
  ProjectManager = 3,
  ResourceManager = 4,
  OfficeManager = 5,
  TenantAdmin = 6,
  Executive = 7,
  OverrideApprover = 8,
  // System-Level Roles
  SystemAdmin = 9,
  Support = 10,
  Auditor = 11,
}

export interface TenantMembership {
  id: string;
  userId: string;
  tenantId: string;
  tenant?: Tenant;
  roles: AppRole[];
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  entraObjectId: string;
  isSystemAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  deactivatedAt?: string;
  deactivatedByUserId?: string;
  // Profile fields
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  profilePhotoUrl?: string;
  // Navigation properties
  tenantMemberships: TenantMembership[];
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
  isClientSite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  tenantId: string;
  officeId: string;
  name: string;
  type: SpaceType;
  capacity: number;
  metadata?: string;
  // Enhanced facilities management fields
  managerUserId?: string;
  requiresApproval: boolean;
  isActive: boolean;
  equipment?: string;
  features?: string;
  dailyCost?: number;
  maxBookingDays?: number;
  bookingRules?: string;
  createdAt: string;
  updatedAt: string;
}

export enum WbsStatus {
  Draft = 0,
  Active = 1,
  Closed = 2,
}

export interface WbsElement {
  id: string;
  tenantId: string;
  projectId: string;
  code: string;
  description: string;
  validFrom: string;
  validTo?: string;
  startDate: string;
  endDate?: string;
  type: WbsType;
  status: WbsStatus;
  isBillable: boolean;
  ownerUserId?: string;
  approverUserId?: string;
  approvalStatus: WbsApprovalStatus;
  approvalNotes?: string;
  approvedAt?: string;
  project?: Project;
  owner?: User;
  approver?: User;
  createdAt: string;
  updatedAt: string;
}

export interface WbsChangeHistory {
  id: string;
  wbsElementId: string;
  changedByUserId: string;
  changedAt: string;
  changeType: string;
  oldValues?: string;
  newValues?: string;
  notes?: string;
  changedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRequest {
  notes?: string;
}

// Work Location Preferences

export enum WorkLocationType {
  Remote = 0,
  RemotePlus = 1,
  ClientSite = 2,
  OfficeNoReservation = 3,
  OfficeWithReservation = 4,
}

export interface WorkLocationPreference {
  id: string;
  tenantId: string;
  personId: string;
  workDate: string; // ISO date string (YYYY-MM-DD)
  locationType: WorkLocationType;
  officeId?: string;
  bookingId?: string;
  remoteLocation?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  person?: Person;
  office?: Office;
  booking?: Booking;
  createdAt: string;
  updatedAt: string;
}

// Facilities Management Types

export enum FacilityAccessLevel {
  View = 0,
  Book = 1,
  Manage = 2,
  Configure = 3,
  FullAdmin = 4,
}

export enum MaintenanceType {
  Routine = 0,
  Repair = 1,
  Inspection = 2,
  Cleaning = 3,
  EquipmentIssue = 4,
  SafetyConcern = 5,
}

export enum MaintenanceStatus {
  Reported = 0,
  Scheduled = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4,
}

export interface FacilityPermission {
  id: string;
  officeId?: string;
  spaceId?: string;
  userId?: string;
  role?: AppRole;
  accessLevel: FacilityAccessLevel;
  office?: Office;
  space?: Space;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceMaintenanceLog {
  id: string;
  spaceId: string;
  scheduledDate: string;
  completedDate?: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  reportedByUserId: string;
  assignedToUserId?: string;
  description: string;
  resolution?: string;
  cost?: number;
  space?: Space;
  reportedBy?: User;
  assignedTo?: User;
  createdAt: string;
  updatedAt: string;
}

// Resume Management Types

export interface ResumeProfile {
  id: string;
  personId: string;
  templateConfig?: string;
  status: ResumeStatus;
  currentVersionId?: string;
  lastReviewedAt?: string;
  lastReviewedByUserId?: string;
  isPublic: boolean;
  linkedInProfileUrl?: string;
  linkedInLastSyncedAt?: string;
  person?: Person;
  sections?: ResumeSection[];
  versions?: ResumeVersion[];
  documents?: ResumeDocument[];
  approvals?: ResumeApproval[];
  currentVersion?: ResumeVersion;
  lastReviewedBy?: User;
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeSection {
  id: string;
  personId: string;
  type: ResumeSectionType;
  displayOrder: number;
  person?: Person;
  entries?: ResumeEntry[];
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeEntry {
  id: string;
  resumeSectionId: string;
  title: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  additionalFields?: string;
  resumeSection?: ResumeSection;
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeVersion {
  id: string;
  resumeProfileId: string;
  versionNumber: number;
  versionName: string;
  description?: string;
  contentSnapshot?: string;
  createdByUserId: string;
  isActive: boolean;
  resumeProfile?: ResumeProfile;
  createdBy?: User;
  generatedDocuments?: ResumeDocument[];
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeDocument {
  id: string;
  resumeProfileId: string;
  resumeVersionId?: string;
  storedFileId: string;
  documentType: string;
  templateName?: string;
  generatedAt: string;
  generatedByUserId: string;
  resumeProfile?: ResumeProfile;
  resumeVersion?: ResumeVersion;
  generatedBy?: User;
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeApproval {
  id: string;
  resumeProfileId: string;
  resumeVersionId?: string;
  requestedByUserId: string;
  reviewedByUserId?: string;
  requestedAt: string;
  reviewedAt?: string;
  status: ApprovalStatus;
  reviewNotes?: string;
  requestNotes?: string;
  resumeProfile?: ResumeProfile;
  resumeVersion?: ResumeVersion;
  requestedBy?: User;
  reviewedBy?: User;
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: ResumeTemplateType;
  templateContent: string;
  storedFileId?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PersonSkill {
  id: string;
  personId: string;
  skillId: string;
  proficiencyLevel: ProficiencyLevel;
  lastUsedDate?: string;
  person?: Person;
  skill?: Skill;
  createdAt: string;
  updatedAt?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PersonCertification {
  id: string;
  personId: string;
  certificationId: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  person?: Person;
  certification?: Certification;
  createdAt: string;
  updatedAt?: string;
}
