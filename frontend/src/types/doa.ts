export enum DOAStatus {
  Draft = 0,
  PendingSignatures = 1,
  Active = 2,
  Expired = 3,
  Revoked = 4,
}

export enum SignatureRole {
  Delegator = 0,
  Designee = 1,
}

export enum SignatureType {
  Drawn = 0,
  Typed = 1,
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface DigitalSignature {
  id: string;
  doaLetterId: string;
  signerUserId: string;
  role: SignatureRole;
  signatureData: string; // Base64 encoded image from canvas
  signatureType: SignatureType;
  typedSignature?: string; // Full name if typed signature
  signedAt: string;
  ipAddress: string;
  userAgent: string;
  isVerified: boolean;
  createdAt: string;
  signerUser?: User;
}

export interface DOAActivation {
  id: string;
  doaLetterId: string;
  tenantId: string;
  startDate: string; // DateOnly format YYYY-MM-DD
  endDate: string;
  reason: string;
  notes?: string;
  isActive: boolean;
  deactivatedAt?: string;
  deactivatedByUserId?: string;
  createdAt: string;
  updatedAt?: string;
  doaLetter?: DelegationOfAuthorityLetter;
}

export interface DelegationOfAuthorityLetter {
  id: string;
  tenantId: string;
  delegatorUserId: string;
  designeeUserId: string;
  subjectLine: string;
  letterContent: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  // Deprecated - kept for backward compatibility
  isFinancialAuthority?: boolean;
  isOperationalAuthority?: boolean;
  status: DOAStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  delegatorUser?: User;
  designeeUser?: User;
  signatures?: DigitalSignature[];
  activations?: DOAActivation[];
}

export interface CreateDOALetterRequest {
  designeeUserId: string;
  subjectLine: string;
  letterContent: string;
  effectiveStartDate: string; // ISO DateTime string
  effectiveEndDate: string;
  notes?: string;
  // Deprecated - kept for backward compatibility during transition
  isFinancialAuthority?: boolean;
  isOperationalAuthority?: boolean;
}

export interface UpdateDOALetterRequest extends CreateDOALetterRequest {
  id: string;
}

export interface SignatureRequest {
  signatureData: string; // Base64 encoded canvas image
  signatureType: SignatureType;
  typedSignature?: string; // Full name if typed signature
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivationRequest {
  startDate: string; // DateOnly format YYYY-MM-DD
  endDate: string;
  reason: string;
  notes?: string;
}

export type DOAFilter = 'created' | 'assigned' | 'all';

// DOA Template Types
export interface DOATemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  letterContent: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDOATemplateRequest {
  name: string;
  description: string;
  letterContent: string;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateDOATemplateRequest = CreateDOATemplateRequest;

// Tenant Settings Types
export interface TenantSettings {
  id: string;
  tenantId: string;
  // Logo settings
  logoUrl?: string;
  logoFileName?: string;
  logoWidth?: number;
  logoHeight?: number;
  // DOA Print Template settings
  doaPrintHeaderContent?: string;
  doaPrintFooterContent?: string;
  doaPrintLetterhead?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  // Print template styling
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
  // Environment and Notification Banner settings
  environmentName?: string;
  showEnvironmentBanner?: boolean;
  notificationBannerEnabled?: boolean;
  notificationBannerMessage?: string;
  notificationBannerType?: 'info' | 'warning' | 'error' | 'success';
  notificationBannerExpiresAt?: string;
  // Fiscal Year and Budget settings
  fiscalYearStartMonth?: number;
  requireBudgetApproval?: boolean;
  defaultBudgetMonthsAhead?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateTenantSettingsRequest {
  // Logo settings
  logoUrl?: string;
  logoFileName?: string;
  logoWidth?: number;
  logoHeight?: number;
  // DOA Print Template settings
  doaPrintHeaderContent?: string;
  doaPrintFooterContent?: string;
  doaPrintLetterhead?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  // Print template styling
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
  // Environment and Notification Banner settings
  environmentName?: string;
  showEnvironmentBanner?: boolean;
  notificationBannerEnabled?: boolean;
  notificationBannerMessage?: string;
  notificationBannerType?: 'info' | 'warning' | 'error' | 'success';
  notificationBannerExpiresAt?: string;
  // Fiscal Year and Budget settings
  fiscalYearStartMonth?: number;
  requireBudgetApproval?: boolean;
  defaultBudgetMonthsAhead?: number;
}
