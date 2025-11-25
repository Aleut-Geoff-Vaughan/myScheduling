// API Type Definitions
// Last updated: 2025-11-20
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
// User-centric profile (Person table removed)
export interface Person {
  id: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  profilePhotoUrl?: string;
  orgUnit?: string;
  location?: string;
  laborCategory?: string;
  costCenter?: string;
  status: PersonStatus;
  type: PersonType;
  managerId?: string;
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
  approverGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  tenantId: string;
  userId: string;
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

export enum AssignmentRequestStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Cancelled = 3,
}

export interface AssignmentRequest {
  id: string;
  tenantId: string;
  requestedByUserId: string;
  requestedForUserId: string;
  projectId: string;
  wbsElementId?: string;
  projectRoleId?: string;
  startDate?: string;
  endDate?: string;
  allocationPct: number;
  status: AssignmentRequestStatus;
  notes?: string;
  approvedByUserId?: string;
  resolvedAt?: string;
  assignmentId?: string;
  approverGroupId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  spaceId: string;
  userId: string;
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

export enum GroupMemberRole {
  Member = 0,
  Manager = 1,
  Approver = 2,
}

export interface GroupMember {
  id: string;
  tenantId: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  createdAt: string;
  updatedAt?: string;
  user?: User;
}

export interface Group {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  members?: GroupMember[];
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
  name: string;
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
  isAvailable: boolean;
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

// WBS Element interface
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
  approverGroupId?: string;
  approvalStatus: WbsApprovalStatus;
  approvalNotes?: string;
  approvedAt?: string;
  project?: Project;
  owner?: User;
  approver?: User;
  approverGroup?: Group;
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
  userId: string;
  notes?: string;
}

// Work Location Preferences

export enum WorkLocationType {
  Remote = 0,
  RemotePlus = 1,
  ClientSite = 2,
  OfficeNoReservation = 3,
  OfficeWithReservation = 4,
  PTO = 5,
}

export interface WorkLocationPreference {
  id: string;
  tenantId: string;
  userId: string;
  workDate: string; // ISO date string (YYYY-MM-DD)
  locationType: WorkLocationType;
  officeId?: string;
  bookingId?: string;
  remoteLocation?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  user?: User;
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
  userId: string;
  templateConfig?: string;
  status: ResumeStatus;
  currentVersionId?: string;
  lastReviewedAt?: string;
  lastReviewedByUserId?: string;
  isPublic: boolean;
  linkedInProfileUrl?: string;
  linkedInLastSyncedAt?: string;
  user?: User;
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
  userId: string;
  type: ResumeSectionType;
  displayOrder: number;
  user?: User;
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

export interface CreateResumeSectionRequest {
  type: ResumeSectionType;
  title: string;
  displayOrder: number;
}

export interface UpdateResumeSectionRequest {
  title?: string;
  displayOrder?: number;
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
  userId: string;
  skillId: string;
  proficiencyLevel: ProficiencyLevel;
  lastUsedDate?: string;
  user?: User;
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
  userId: string;
  certificationId: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  user?: User;
  certification?: Certification;
  createdAt: string;
  updatedAt?: string;
}
// ==================== VALIDATION FRAMEWORK ====================

export enum ValidationRuleType {
  Required = 0,
  Range = 1,
  Pattern = 2,
  Custom = 3,
  CrossField = 4,
  External = 5,
}

export enum ValidationSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
}

export interface ValidationRule {
  id: string;
  tenantId: string;
  entityType: string;
  fieldName?: string;
  ruleType: ValidationRuleType;
  severity: ValidationSeverity;
  ruleExpression: string;
  errorMessage: string;
  isActive: boolean;
  name: string;
  description?: string;
  executionOrder: number;
  conditions?: string;
  metadata?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ValidationError {
  fieldName: string;
  message: string;
  ruleType: ValidationRuleType;
  severity: ValidationSeverity;
  context?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  information: ValidationError[];
}

export interface ValidateEntityRequest {
  entityType: string;
  entityData: Record<string, any>;
}

export interface ValidateFieldRequest {
  entityType: string;
  fieldName: string;
  fieldValue: any;
  entityData?: Record<string, any>;
}

export interface ValidateExpressionRequest {
  ruleType: ValidationRuleType;
  expression: string;
}

export interface ExpressionValidationResult {
  isValid: boolean;
  message: string;
}

export interface RuleOrderUpdate {
  ruleId: string;
  executionOrder: number;
}

export interface SetActiveRequest {
  isActive: boolean;
}
