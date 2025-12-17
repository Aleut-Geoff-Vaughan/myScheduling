import { api } from '../lib/api-client';

// ==================== Types ====================

// Enums
export enum LeaseStatus {
  Draft = 0,
  Active = 1,
  Expired = 2,
  Terminated = 3,
  Pending = 4,
}

export enum SecurityClearanceLevel {
  None = 0,
  PublicTrust = 1,
  Secret = 2,
  TopSecret = 3,
  TopSecretSci = 4,
}

export enum OptionYearStatus {
  NotExercised = 0,
  Exercised = 1,
  Declined = 2,
  Expired = 3,
}

export enum AmendmentType {
  ScopeChange = 0,
  CostAdjustment = 1,
  TermExtension = 2,
  SpaceModification = 3,
  Other = 4,
}

export enum LeaseAttachmentType {
  LeaseDocument = 0,
  Amendment = 1,
  FloorPlan = 2,
  InsuranceCertificate = 3,
  Estoppel = 4,
  InspectionReport = 5,
  CertificateOfOccupancy = 6,
  Photo = 7,
  Other = 8,
}

export enum OfficePocRole {
  BuildingManager = 0,
  SecurityDesk = 1,
  ITSupport = 2,
  Maintenance = 3,
  Receptionist = 4,
  OfficeManager = 5,
  FSO = 6,
  EmergencyContact = 7,
  Other = 8,
}

export enum AnnouncementType {
  General = 0,
  Maintenance = 1,
  Safety = 2,
  Policy = 3,
  Event = 4,
  Emergency = 5,
}

export enum AnnouncementPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3,
}

export enum FieldAssignmentStatus {
  Proposed = 0,
  Pending = 1,
  Active = 2,
  OnHold = 3,
  Completed = 4,
  Cancelled = 5,
}

export enum ClearanceStatus {
  None = 0,
  InProgress = 1,
  Active = 2,
  Suspended = 3,
  Revoked = 4,
  Expired = 5,
}

export enum ForeignTravelStatus {
  Draft = 0,
  Submitted = 1,
  Approved = 2,
  Denied = 3,
  Completed = 4,
  Cancelled = 5,
}

export enum TravelPurpose {
  Business = 0,
  Personal = 1,
  Mixed = 2,
}

export enum ScifAccessType {
  Entry = 0,
  Exit = 1,
  Visitor = 2,
  Escort = 3,
}

export enum CheckInMethod {
  Web = 0,
  Mobile = 1,
  Badge = 2,
  QrCode = 3,
  Nfc = 4,
  Manual = 5,
}

// Interfaces
export interface FacilitiesDashboard {
  officeCount: number;
  clientSiteCount: number;
  totalSpaces: number;
  todayBookings: number;
  todayCheckIns: number;
  activeLeases: number;
  expiringLeases: number;
  activeFieldAssignments: number;
  pendingForeignTravel: number;
  openMaintenanceRequests: number;
  recentAnnouncements: AnnouncementSummary[];
}

export interface AnnouncementSummary {
  id: string;
  title: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  officeName: string;
  createdAt: string;
}

export interface OfficeDirectoryItem {
  id: string;
  name: string;
  address?: string;
  address2?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  timezone?: string;
  status: number;
  isClientSite: boolean;
  latitude?: number;
  longitude?: number;
  spaceCount: number;
  hasTravelGuide: boolean;
  hasLease: boolean;
}

export interface Lease {
  id: string;
  tenantId: string;
  officeId: string;
  leaseName: string;
  leaseNumber?: string;
  landlordName?: string;
  landlordContact?: string;
  propertyManager?: string;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  baseTermMonths: number;
  monthlyRent?: number;
  annualRent?: number;
  rentPerSqFt?: number;
  squareFootage?: number;
  usableSquareFootage?: number;
  securityDeposit?: number;
  baseYearExpenses?: number;
  camCharges?: number;
  parkingSpaces?: number;
  parkingCost?: number;
  insuranceRequired: boolean;
  insuranceMinCoverage?: number;
  escalationPercent?: number;
  escalationType?: string;
  specialClauses?: string;
  terminationClause?: string;
  renewalTerms?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  office?: { name: string };
}

export interface LeaseOptionYear {
  id: string;
  leaseId: string;
  optionYearNumber: number;
  startDate: string;
  endDate: string;
  monthlyRent?: number;
  annualRent?: number;
  rentPerSqFt?: number;
  exerciseDeadline: string;
  notificationDeadline?: string;
  status: OptionYearStatus;
  exercisedDate?: string;
  exercisedByUserId?: string;
  notes?: string;
}

export interface FieldAssignment {
  id: string;
  tenantId: string;
  employeeId: string;
  clientSiteId: string;
  projectId?: string;
  status: FieldAssignmentStatus;
  startDate: string;
  endDate?: string;
  workSchedule?: string;
  badgeNumber?: string;
  parkingInfo?: string;
  accessInstructions?: string;
  emergencyContact?: string;
  requiredClearance: SecurityClearanceLevel;
  requiresScifAccess: boolean;
  requiresCac: boolean;
  fsoCoordinatorId?: string;
  notes?: string;
  employee?: { displayName: string; email: string };
  clientSite?: { name: string };
}

export interface ClientSiteDetail {
  id: string;
  officeId: string;
  clientCompanyName: string;
  contractNumber?: string;
  primaryCustomerPoc?: string;
  customerPocEmail?: string;
  customerPocPhone?: string;
  securityPocName?: string;
  securityPocEmail?: string;
  securityPocPhone?: string;
  accessProcedure?: string;
  badgeProcess?: string;
  requiredClearance: SecurityClearanceLevel;
  hasScif: boolean;
  scifLocation?: string;
  scifAccessProcedure?: string;
  specialRequirements?: string;
  emergencyProcedures?: string;
  notes?: string;
}

export interface EmployeeClearance {
  id: string;
  tenantId: string;
  employeeId: string;
  clearanceLevel: SecurityClearanceLevel;
  status: ClearanceStatus;
  grantedDate?: string;
  expirationDate?: string;
  investigationDate?: string;
  adjudicationDate?: string;
  sponsoringAgency?: string;
  contractNumber?: string;
  polygraphDate?: string;
  polygraphType?: string;
  scifAccess: boolean;
  scifBriefingDate?: string;
  specialAccessPrograms?: string;
  notes?: string;
  employee?: { displayName: string; email: string };
}

export interface ForeignTravelRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  countries: string;
  departureDate: string;
  returnDate: string;
  purpose: TravelPurpose;
  justification?: string;
  status: ForeignTravelStatus;
  submittedDate?: string;
  approvedDate?: string;
  approvedByUserId?: string;
  briefingDate?: string;
  briefedByUserId?: string;
  debriefDate?: string;
  debriefedByUserId?: string;
  debriefNotes?: string;
  foreignContacts?: string;
  itineraryDetails?: string;
  fsoNotes?: string;
  employee?: { displayName: string; email: string };
}

export interface FacilityCheckIn {
  id: string;
  officeId: string;
  spaceId?: string;
  userId: string;
  checkInTime: string;
  checkOutTime?: string;
  method: CheckInMethod;
  badgeId?: string;
  qrCode?: string;
  deviceInfo?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  office?: { name: string };
  space?: { name: string };
}

export interface WhosHereItem {
  userId: string;
  userName: string;
  email: string;
  checkInTime: string;
  spaceName?: string;
}

export interface OfficeTravelGuide {
  id: string;
  officeId: string;
  description?: string;
  directionsFromAirport?: string;
  directionsFromHighway?: string;
  publicTransitInfo?: string;
  parkingInstructions?: string;
  nearbyHotels?: string;
  nearbyRestaurants?: string;
  nearbyAmenities?: string;
  buildingAccessInfo?: string;
  securityCheckInProcedure?: string;
  emergencyInfo?: string;
  localEmergencyNumbers?: string;
  videoUrl?: string;
  photoUrls?: string;
  lastUpdated: string;
}

export interface OfficePoc {
  id: string;
  officeId: string;
  role: OfficePocRole;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  notes?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface FacilityAnnouncement {
  id: string;
  tenantId: string;
  officeId?: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  effectiveDate?: string;
  expirationDate?: string;
  requiresAcknowledgment: boolean;
  authoredByUserId: string;
  publishedAt?: string;
  createdAt: string;
  office?: { name: string };
}

export interface CreateAnnouncementRequest {
  officeId?: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  effectiveDate?: string;
  expirationDate?: string;
  requiresAcknowledgment: boolean;
}

export interface FacilityCheckInRequest {
  officeId: string;
  spaceId?: string;
  method: CheckInMethod;
  badgeId?: string;
  qrCode?: string;
  deviceInfo?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface LeaseCalendarItem {
  date: string;
  type: string;
  title: string;
  description: string;
  leaseId: string;
  leaseName: string;
}

// Analytics types
export interface SpaceTypeStats {
  type: string;
  total: number;
  capacity: number;
}

export interface DailyTrendItem {
  date: string;
  dayOfWeek: string;
  checkIns: number;
  bookings: number;
}

export interface TopOfficeItem {
  officeId: string;
  officeName: string;
  checkIns: number;
  bookings: number;
}

export interface FacilitiesAnalytics {
  dateRange: number;
  totalCheckIns: number;
  totalBookings: number;
  averageDailyCheckIns: number;
  averageDailyBookings: number;
  currentOccupancyPercent: number;
  spacesByType: SpaceTypeStats[];
  dailyTrend: DailyTrendItem[];
  topOffices: TopOfficeItem[];
}

// ==================== Service ====================

export const facilitiesPortalService = {
  // ==================== DASHBOARD ====================

  async getDashboard(): Promise<FacilitiesDashboard> {
    return api.get<FacilitiesDashboard>('/facilities-portal/dashboard');
  },

  // ==================== ANALYTICS ====================

  async getAnalytics(params?: { days?: number; officeId?: string }): Promise<FacilitiesAnalytics> {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.append('days', params.days.toString());
    if (params?.officeId) searchParams.append('officeId', params.officeId);
    const query = searchParams.toString();
    return api.get<FacilitiesAnalytics>(`/facilities-portal/analytics${query ? `?${query}` : ''}`);
  },

  // ==================== ANNOUNCEMENTS ====================

  async getAnnouncements(officeId?: string): Promise<FacilityAnnouncement[]> {
    const params = officeId ? `?officeId=${officeId}` : '';
    return api.get<FacilityAnnouncement[]>(`/facilities-portal/announcements${params}`);
  },

  async createAnnouncement(request: CreateAnnouncementRequest): Promise<FacilityAnnouncement> {
    return api.post<FacilityAnnouncement>('/facilities-portal/announcements', request);
  },

  async deleteAnnouncement(id: string): Promise<void> {
    return api.delete<void>(`/facilities-portal/announcements/${id}`);
  },

  async acknowledgeAnnouncement(id: string): Promise<void> {
    return api.post<void>(`/facilities-portal/announcements/${id}/acknowledge`, {});
  },

  // ==================== OFFICE DIRECTORY ====================

  async getOfficeDirectory(): Promise<OfficeDirectoryItem[]> {
    return api.get<OfficeDirectoryItem[]>('/facilities-portal/offices');
  },

  async getOfficeDetails(officeId: string): Promise<{
    office: { id: string; name: string; address: string };
    travelGuide?: OfficeTravelGuide;
    pointsOfContact: OfficePoc[];
    clientSiteDetail?: ClientSiteDetail;
    activeAnnouncements: FacilityAnnouncement[];
  }> {
    return api.get(`/facilities-portal/offices/${officeId}`);
  },

  // ==================== TRAVEL GUIDES ====================

  async getTravelGuides(): Promise<OfficeTravelGuide[]> {
    return api.get<OfficeTravelGuide[]>('/facilities-portal/offices');
  },

  async getTravelGuide(officeId: string): Promise<OfficeTravelGuide> {
    return api.get<OfficeTravelGuide>(`/facilities-portal/offices/${officeId}/travel-guide`);
  },

  async upsertTravelGuide(officeId: string, guide: Partial<OfficeTravelGuide>): Promise<OfficeTravelGuide> {
    return api.put<OfficeTravelGuide>(`/facilities-portal/offices/${officeId}/travel-guide`, guide);
  },

  // ==================== OFFICE POCs ====================

  async getOfficePocs(officeId: string): Promise<OfficePoc[]> {
    return api.get<OfficePoc[]>(`/facilities-portal/offices/${officeId}/pocs`);
  },

  async createOfficePoc(officeId: string, poc: Partial<OfficePoc>): Promise<OfficePoc> {
    return api.post<OfficePoc>(`/facilities-portal/offices/${officeId}/pocs`, poc);
  },

  async updateOfficePoc(officeId: string, pocId: string, poc: Partial<OfficePoc>): Promise<void> {
    return api.put<void>(`/facilities-portal/offices/${officeId}/pocs/${pocId}`, poc);
  },

  async deleteOfficePoc(officeId: string, pocId: string): Promise<void> {
    return api.delete<void>(`/facilities-portal/offices/${officeId}/pocs/${pocId}`);
  },

  // ==================== CHECK-IN ====================

  async checkIn(request: FacilityCheckInRequest): Promise<FacilityCheckIn> {
    return api.post<FacilityCheckIn>('/facilities-portal/check-in', request);
  },

  async checkOut(checkInId: string): Promise<void> {
    return api.post<void>(`/facilities-portal/check-out/${checkInId}`, {});
  },

  async getWhosHere(officeId: string): Promise<WhosHereItem[]> {
    return api.get<WhosHereItem[]>(`/facilities-portal/offices/${officeId}/whos-here`);
  },

  async getMyCheckIns(): Promise<FacilityCheckIn[]> {
    return api.get<FacilityCheckIn[]>('/facilities-portal/my-check-ins');
  },

  // ==================== LEASES ====================

  async getLeases(params?: {
    officeId?: string;
    status?: LeaseStatus;
    includeExpired?: boolean;
  }): Promise<Lease[]> {
    const searchParams = new URLSearchParams();
    if (params?.officeId) searchParams.append('officeId', params.officeId);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.includeExpired !== undefined) searchParams.append('includeExpired', params.includeExpired.toString());
    const query = searchParams.toString();
    return api.get<Lease[]>(`/leases${query ? `?${query}` : ''}`);
  },

  async getLease(id: string): Promise<Lease> {
    return api.get<Lease>(`/leases/${id}`);
  },

  async createLease(lease: Partial<Lease>): Promise<Lease> {
    return api.post<Lease>('/leases', lease);
  },

  async updateLease(id: string, lease: Partial<Lease>): Promise<void> {
    return api.put<void>(`/leases/${id}`, lease);
  },

  async deleteLease(id: string): Promise<void> {
    return api.delete<void>(`/leases/${id}`);
  },

  // ==================== LEASE OPTION YEARS ====================

  async getLeaseOptionYears(leaseId: string): Promise<LeaseOptionYear[]> {
    return api.get<LeaseOptionYear[]>(`/leases/${leaseId}/option-years`);
  },

  async createLeaseOptionYear(leaseId: string, optionYear: Partial<LeaseOptionYear>): Promise<LeaseOptionYear> {
    return api.post<LeaseOptionYear>(`/leases/${leaseId}/option-years`, optionYear);
  },

  async exerciseOptionYear(leaseId: string, optionYearId: string, notes?: string): Promise<void> {
    return api.post<void>(`/leases/${leaseId}/option-years/${optionYearId}/exercise`, { notes });
  },

  async declineOptionYear(leaseId: string, optionYearId: string, notes?: string): Promise<void> {
    return api.post<void>(`/leases/${leaseId}/option-years/${optionYearId}/decline`, { notes });
  },

  // ==================== LEASE CALENDAR ====================

  async getLeaseCalendar(year: number): Promise<LeaseCalendarItem[]> {
    return api.get<LeaseCalendarItem[]>(`/leases/calendar/${year}`);
  },

  // ==================== FIELD ASSIGNMENTS ====================

  async getFieldAssignments(params?: {
    employeeId?: string;
    clientSiteId?: string;
    status?: FieldAssignmentStatus;
    activeOnly?: boolean;
  }): Promise<FieldAssignment[]> {
    const searchParams = new URLSearchParams();
    if (params?.employeeId) searchParams.append('employeeId', params.employeeId);
    if (params?.clientSiteId) searchParams.append('clientSiteId', params.clientSiteId);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.activeOnly !== undefined) searchParams.append('activeOnly', params.activeOnly.toString());
    const query = searchParams.toString();
    return api.get<FieldAssignment[]>(`/field-personnel/assignments${query ? `?${query}` : ''}`);
  },

  async getFieldAssignment(id: string): Promise<FieldAssignment> {
    return api.get<FieldAssignment>(`/field-personnel/assignments/${id}`);
  },

  async createFieldAssignment(assignment: Partial<FieldAssignment>): Promise<FieldAssignment> {
    return api.post<FieldAssignment>('/field-personnel/assignments', assignment);
  },

  async updateFieldAssignment(id: string, assignment: Partial<FieldAssignment>): Promise<void> {
    return api.put<void>(`/field-personnel/assignments/${id}`, assignment);
  },

  async approveFieldAssignment(id: string, notes?: string): Promise<void> {
    return api.post<void>(`/field-personnel/assignments/${id}/approve`, { notes });
  },

  async completeFieldAssignment(id: string, notes?: string): Promise<void> {
    return api.post<void>(`/field-personnel/assignments/${id}/complete`, { notes });
  },

  // ==================== CLIENT SITES ====================

  async getClientSites(): Promise<ClientSiteDetail[]> {
    return api.get<ClientSiteDetail[]>('/field-personnel/client-sites');
  },

  async getClientSite(officeId: string): Promise<ClientSiteDetail> {
    return api.get<ClientSiteDetail>(`/field-personnel/client-sites/${officeId}`);
  },

  async upsertClientSite(officeId: string, site: Partial<ClientSiteDetail>): Promise<ClientSiteDetail> {
    return api.put<ClientSiteDetail>(`/field-personnel/client-sites/${officeId}`, site);
  },

  // ==================== CLEARANCES ====================

  async getClearances(params?: {
    employeeId?: string;
    level?: SecurityClearanceLevel;
    status?: ClearanceStatus;
    expiringWithinDays?: number;
  }): Promise<EmployeeClearance[]> {
    const searchParams = new URLSearchParams();
    if (params?.employeeId) searchParams.append('employeeId', params.employeeId);
    if (params?.level !== undefined) searchParams.append('level', params.level.toString());
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.expiringWithinDays !== undefined) searchParams.append('expiringWithinDays', params.expiringWithinDays.toString());
    const query = searchParams.toString();
    return api.get<EmployeeClearance[]>(`/field-personnel/clearances${query ? `?${query}` : ''}`);
  },

  async getClearance(id: string): Promise<EmployeeClearance> {
    return api.get<EmployeeClearance>(`/field-personnel/clearances/${id}`);
  },

  async createClearance(clearance: Partial<EmployeeClearance>): Promise<EmployeeClearance> {
    return api.post<EmployeeClearance>('/field-personnel/clearances', clearance);
  },

  async updateClearance(id: string, clearance: Partial<EmployeeClearance>): Promise<void> {
    return api.put<void>(`/field-personnel/clearances/${id}`, clearance);
  },

  // ==================== FOREIGN TRAVEL ====================

  async getForeignTravelRecords(params?: {
    employeeId?: string;
    status?: ForeignTravelStatus;
    upcomingOnly?: boolean;
  }): Promise<ForeignTravelRecord[]> {
    const searchParams = new URLSearchParams();
    if (params?.employeeId) searchParams.append('employeeId', params.employeeId);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.upcomingOnly !== undefined) searchParams.append('upcomingOnly', params.upcomingOnly.toString());
    const query = searchParams.toString();
    return api.get<ForeignTravelRecord[]>(`/field-personnel/foreign-travel${query ? `?${query}` : ''}`);
  },

  async getForeignTravelRecord(id: string): Promise<ForeignTravelRecord> {
    return api.get<ForeignTravelRecord>(`/field-personnel/foreign-travel/${id}`);
  },

  async createForeignTravelRecord(record: Partial<ForeignTravelRecord>): Promise<ForeignTravelRecord> {
    return api.post<ForeignTravelRecord>('/field-personnel/foreign-travel', record);
  },

  async submitForeignTravelRecord(id: string): Promise<void> {
    return api.post<void>(`/field-personnel/foreign-travel/${id}/submit`, {});
  },

  async approveForeignTravelRecord(id: string, notes?: string): Promise<void> {
    return api.post<void>(`/field-personnel/foreign-travel/${id}/approve`, { notes });
  },

  async denyForeignTravelRecord(id: string, notes?: string): Promise<void> {
    return api.post<void>(`/field-personnel/foreign-travel/${id}/deny`, { notes });
  },

  async briefForeignTravelRecord(id: string): Promise<void> {
    return api.post<void>(`/field-personnel/foreign-travel/${id}/brief`, {});
  },

  async debriefForeignTravelRecord(id: string, notes?: string, foreignContactsReported?: boolean, foreignContacts?: string): Promise<void> {
    return api.post<void>(`/field-personnel/foreign-travel/${id}/debrief`, {
      notes,
      foreignContactsReported,
      foreignContacts,
    });
  },
};
