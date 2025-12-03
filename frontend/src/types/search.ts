// Search Types for Portal-Wide Search

export interface PersonSearchResult {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  profilePhotoUrl?: string;
  url: string;
}

export interface ProjectSearchResult {
  id: string;
  name: string;
  programCode?: string;
  customer?: string;
  status: string;
  url: string;
}

export interface WbsSearchResult {
  id: string;
  code: string;
  description: string;
  projectName: string;
  status: string;
  url: string;
}

export interface ResumeSearchResult {
  id: string;
  userId: string;
  userDisplayName: string;
  userJobTitle?: string;
  userEmail: string;
  status: string;
  matchContext: string[]; // What matched (e.g., "Skill: Python", "Cert: AWS")
  url: string;
}

export interface OfficeSearchResult {
  id: string;
  name: string;
  city?: string;
  stateCode?: string;
  status: string;
  url: string;
}

export interface SpaceSearchResult {
  id: string;
  name: string;
  officeName: string;
  type: string;
  capacity: number;
  url: string;
}

export interface GroupSearchResult {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  url: string;
}

export interface SkillSearchResult {
  id: string;
  name: string;
  category: string;
  peopleCount: number;
  url: string;
}

export interface CertificationSearchResult {
  id: string;
  name: string;
  issuer?: string;
  peopleCount: number;
  url: string;
}

export interface SubcontractorSearchResult {
  id: string;
  fullName: string;
  email?: string;
  positionTitle?: string;
  companyName: string;
  url: string;
}

export interface SubcontractorCompanySearchResult {
  id: string;
  name: string;
  code?: string;
  city?: string;
  state?: string;
  subcontractorCount: number;
  url: string;
}

export interface SearchResponse {
  query: string;
  timestamp: string;
  totalCount: number;
  people?: PersonSearchResult[];
  projects?: ProjectSearchResult[];
  wbsElements?: WbsSearchResult[];
  resumes?: ResumeSearchResult[];
  offices?: OfficeSearchResult[];
  spaces?: SpaceSearchResult[];
  groups?: GroupSearchResult[];
  skills?: SkillSearchResult[];
  certifications?: CertificationSearchResult[];
  subcontractors?: SubcontractorSearchResult[];
  subcontractorCompanies?: SubcontractorCompanySearchResult[];
}

export type SearchEntityType =
  | 'people'
  | 'projects'
  | 'wbs'
  | 'resumes'
  | 'offices'
  | 'spaces'
  | 'groups'
  | 'skills'
  | 'certifications'
  | 'subcontractors'
  | 'companies';

export interface SearchParams {
  q: string;
  types?: SearchEntityType[];
  tenantId?: string;
  limit?: number;
}
