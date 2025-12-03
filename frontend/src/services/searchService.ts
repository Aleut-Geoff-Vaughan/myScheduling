import { api } from '../lib/api-client';
import type { SearchResponse, SearchParams, SearchEntityType } from '../types/search';

export const searchService = {
  /**
   * Performs a unified search across all entity types.
   * @param params Search parameters
   * @returns Search results grouped by entity type
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.set('q', params.q);

    if (params.types && params.types.length > 0) {
      queryParams.set('types', params.types.join(','));
    }

    if (params.tenantId) {
      queryParams.set('tenantId', params.tenantId);
    }

    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }

    return api.get<SearchResponse>(`/search?${queryParams.toString()}`);
  },

  /**
   * Searches only people.
   */
  async searchPeople(query: string, limit?: number): Promise<SearchResponse> {
    return this.search({ q: query, types: ['people'], limit });
  },

  /**
   * Searches only projects.
   */
  async searchProjects(query: string, limit?: number): Promise<SearchResponse> {
    return this.search({ q: query, types: ['projects'], limit });
  },

  /**
   * Searches only resumes (deep search including skills, certs, experience).
   */
  async searchResumes(query: string, limit?: number): Promise<SearchResponse> {
    return this.search({ q: query, types: ['resumes'], limit });
  },

  /**
   * Searches skills and certifications.
   */
  async searchSkillsAndCerts(query: string, limit?: number): Promise<SearchResponse> {
    return this.search({ q: query, types: ['skills', 'certifications'], limit });
  },

  /**
   * Searches facilities (offices and spaces).
   */
  async searchFacilities(query: string, limit?: number): Promise<SearchResponse> {
    return this.search({ q: query, types: ['offices', 'spaces'], limit });
  },
};

// Entity type display info
export const SEARCH_ENTITY_CONFIG: Record<
  SearchEntityType,
  {
    label: string;
    pluralLabel: string;
    icon: string;
    color: string;
  }
> = {
  people: {
    label: 'Person',
    pluralLabel: 'People',
    icon: 'Users',
    color: 'blue',
  },
  projects: {
    label: 'Project',
    pluralLabel: 'Projects',
    icon: 'Briefcase',
    color: 'purple',
  },
  wbs: {
    label: 'WBS',
    pluralLabel: 'WBS Elements',
    icon: 'GitBranch',
    color: 'orange',
  },
  resumes: {
    label: 'Resume',
    pluralLabel: 'Resumes',
    icon: 'FileText',
    color: 'green',
  },
  offices: {
    label: 'Office',
    pluralLabel: 'Offices',
    icon: 'Building',
    color: 'gray',
  },
  spaces: {
    label: 'Space',
    pluralLabel: 'Spaces',
    icon: 'Monitor',
    color: 'cyan',
  },
  groups: {
    label: 'Group',
    pluralLabel: 'Groups',
    icon: 'Users2',
    color: 'indigo',
  },
  skills: {
    label: 'Skill',
    pluralLabel: 'Skills',
    icon: 'Zap',
    color: 'yellow',
  },
  certifications: {
    label: 'Certification',
    pluralLabel: 'Certifications',
    icon: 'Award',
    color: 'amber',
  },
  subcontractors: {
    label: 'Subcontractor',
    pluralLabel: 'Subcontractors',
    icon: 'UserPlus',
    color: 'teal',
  },
  companies: {
    label: 'Company',
    pluralLabel: 'Companies',
    icon: 'Building2',
    color: 'slate',
  },
};
