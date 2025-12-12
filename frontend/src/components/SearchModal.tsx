import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  X,
  Users,
  Briefcase,
  GitBranch,
  FileText,
  Building,
  Monitor,
  Users2,
  Zap,
  Award,
  UserPlus,
  Building2,
  Loader2,
  FileKey,
} from 'lucide-react';
import { searchService, SEARCH_ENTITY_CONFIG } from '../services/searchService';
import type {
  SearchResponse,
  PersonSearchResult,
  ProjectSearchResult,
  WbsSearchResult,
  ResumeSearchResult,
  OfficeSearchResult,
  SpaceSearchResult,
  GroupSearchResult,
  SkillSearchResult,
  CertificationSearchResult,
  SubcontractorSearchResult,
  SubcontractorCompanySearchResult,
  LeaseSearchResult,
  SearchEntityType,
} from '../types/search';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Color mapping
const COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-green-100 text-green-700',
  gray: 'bg-gray-100 text-gray-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  amber: 'bg-amber-100 text-amber-700',
  teal: 'bg-teal-100 text-teal-700',
  slate: 'bg-slate-100 text-slate-700',
  rose: 'bg-rose-100 text-rose-700',
};

interface SearchResultItemProps {
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle?: string;
  metadata?: string;
  url: string;
  isSelected: boolean;
  onClick: () => void;
}

function SearchResultItem({
  icon: Icon,
  color,
  title,
  subtitle,
  metadata,
  isSelected,
  onClick,
}: SearchResultItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`flex-shrink-0 p-2 rounded-lg ${COLORS[color] || COLORS.gray}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{title}</div>
        {subtitle && <div className="text-sm text-gray-500 truncate">{subtitle}</div>}
      </div>
      {metadata && (
        <div className="flex-shrink-0 text-xs text-gray-400">{metadata}</div>
      )}
    </button>
  );
}

interface SearchResultSectionProps {
  type: SearchEntityType;
  results: unknown[];
  selectedIndex: number;
  startIndex: number;
  renderItem: (item: unknown, _index: number, isSelected: boolean) => React.ReactNode;
}

function SearchResultSection({
  type,
  results,
  selectedIndex,
  startIndex,
  renderItem,
}: SearchResultSectionProps) {
  const config = SEARCH_ENTITY_CONFIG[type];

  if (!results || results.length === 0) return null;

  return (
    <div className="py-2">
      <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {config.pluralLabel}
      </div>
      {results.map((item, index) =>
        renderItem(item, startIndex + index, selectedIndex === startIndex + index)
      )}
    </div>
  );
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Search query
  const { data: results, isLoading } = useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchService.search({ q: debouncedQuery, limit: 5 }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  // Track selected index, reset to 0 when query changes
  const [currentSelectedIndex, setCurrentSelectedIndex] = useState(0);

  // Reset selection when query changes
  useEffect(() => {
    setCurrentSelectedIndex(0);
  }, [debouncedQuery]);

  // Build flat list of all results for keyboard navigation
  const allResults = useCallback(() => {
    if (!results) return [];

    const items: { url: string; type: SearchEntityType }[] = [];

    if (results.people?.length) {
      results.people.forEach((p) => items.push({ url: p.url, type: 'people' }));
    }
    if (results.projects?.length) {
      results.projects.forEach((p) => items.push({ url: p.url, type: 'projects' }));
    }
    if (results.wbsElements?.length) {
      results.wbsElements.forEach((w) => items.push({ url: w.url, type: 'wbs' }));
    }
    if (results.resumes?.length) {
      results.resumes.forEach((r) => items.push({ url: r.url, type: 'resumes' }));
    }
    if (results.offices?.length) {
      results.offices.forEach((o) => items.push({ url: o.url, type: 'offices' }));
    }
    if (results.spaces?.length) {
      results.spaces.forEach((s) => items.push({ url: s.url, type: 'spaces' }));
    }
    if (results.groups?.length) {
      results.groups.forEach((g) => items.push({ url: g.url, type: 'groups' }));
    }
    if (results.skills?.length) {
      results.skills.forEach((s) => items.push({ url: s.url, type: 'skills' }));
    }
    if (results.certifications?.length) {
      results.certifications.forEach((c) =>
        items.push({ url: c.url, type: 'certifications' })
      );
    }
    if (results.subcontractors?.length) {
      results.subcontractors.forEach((s) =>
        items.push({ url: s.url, type: 'subcontractors' })
      );
    }
    if (results.subcontractorCompanies?.length) {
      results.subcontractorCompanies.forEach((c) =>
        items.push({ url: c.url, type: 'companies' })
      );
    }
    if (results.leases?.length) {
      results.leases.forEach((l) => items.push({ url: l.url, type: 'leases' }));
    }

    return items;
  }, [results]);

  // Focus input and reset query when opened
  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      // Clear query when modal opens - this is fine since it's conditional on isOpen changing
      if (query !== '') {
        setQuery('');
      }
      if (debouncedQuery !== '') {
        setDebouncedQuery('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      const items = allResults();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setCurrentSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setCurrentSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (items[currentSelectedIndex]) {
            navigate(items[currentSelectedIndex].url);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, allResults, currentSelectedIndex, navigate, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle item click
  const handleSelect = (url: string) => {
    navigate(url);
    onClose();
  };

  // Calculate starting indices for each section
  const getStartIndex = (type: SearchEntityType): number => {
    let index = 0;
    const order: SearchEntityType[] = [
      'people',
      'projects',
      'wbs',
      'resumes',
      'offices',
      'spaces',
      'groups',
      'skills',
      'certifications',
      'subcontractors',
      'companies',
      'leases',
    ];

    for (const t of order) {
      if (t === type) return index;
      switch (t) {
        case 'people':
          index += results?.people?.length || 0;
          break;
        case 'projects':
          index += results?.projects?.length || 0;
          break;
        case 'wbs':
          index += results?.wbsElements?.length || 0;
          break;
        case 'resumes':
          index += results?.resumes?.length || 0;
          break;
        case 'offices':
          index += results?.offices?.length || 0;
          break;
        case 'spaces':
          index += results?.spaces?.length || 0;
          break;
        case 'groups':
          index += results?.groups?.length || 0;
          break;
        case 'skills':
          index += results?.skills?.length || 0;
          break;
        case 'certifications':
          index += results?.certifications?.length || 0;
          break;
        case 'subcontractors':
          index += results?.subcontractors?.length || 0;
          break;
        case 'companies':
          index += results?.subcontractorCompanies?.length || 0;
          break;
        case 'leases':
          index += results?.leases?.length || 0;
          break;
      }
    }
    return index;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-start justify-center pt-16 md:pt-24 px-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, projects, resumes, facilities..."
              className="flex-1 text-lg outline-none placeholder-gray-400"
              autoComplete="off"
            />
            {isLoading && <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Results */}
          <div
            ref={resultsRef}
            className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100"
          >
            {query.length < 2 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Start typing to search...</p>
                <p className="text-sm mt-2">
                  Search for people, projects, resumes, skills, certifications, and more
                </p>
              </div>
            ) : isLoading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-purple-600" />
                <p>Searching...</p>
              </div>
            ) : results && results.totalCount > 0 ? (
              <>
                {/* People */}
                {results.people && results.people.length > 0 && (
                  <SearchResultSection
                    type="people"
                    results={results.people}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('people')}
                    renderItem={(item, _index, isSelected) => {
                      const person = item as PersonSearchResult;
                      return (
                        <SearchResultItem
                          key={person.id}
                          icon={Users}
                          color="blue"
                          title={person.displayName}
                          subtitle={person.jobTitle || person.email}
                          metadata={person.department}
                          url={person.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(person.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Projects */}
                {results.projects && results.projects.length > 0 && (
                  <SearchResultSection
                    type="projects"
                    results={results.projects}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('projects')}
                    renderItem={(item, _index, isSelected) => {
                      const project = item as ProjectSearchResult;
                      return (
                        <SearchResultItem
                          key={project.id}
                          icon={Briefcase}
                          color="purple"
                          title={project.name}
                          subtitle={project.customer || project.programCode}
                          metadata={project.status}
                          url={project.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(project.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* WBS Elements */}
                {results.wbsElements && results.wbsElements.length > 0 && (
                  <SearchResultSection
                    type="wbs"
                    results={results.wbsElements}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('wbs')}
                    renderItem={(item, _index, isSelected) => {
                      const wbs = item as WbsSearchResult;
                      return (
                        <SearchResultItem
                          key={wbs.id}
                          icon={GitBranch}
                          color="orange"
                          title={wbs.code}
                          subtitle={wbs.description}
                          metadata={wbs.projectName}
                          url={wbs.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(wbs.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Resumes */}
                {results.resumes && results.resumes.length > 0 && (
                  <SearchResultSection
                    type="resumes"
                    results={results.resumes}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('resumes')}
                    renderItem={(item, _index, isSelected) => {
                      const resume = item as ResumeSearchResult;
                      return (
                        <SearchResultItem
                          key={resume.id}
                          icon={FileText}
                          color="green"
                          title={resume.userDisplayName}
                          subtitle={
                            resume.matchContext.length > 0
                              ? resume.matchContext.join(' | ')
                              : resume.userJobTitle
                          }
                          metadata={resume.status}
                          url={resume.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(resume.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Offices */}
                {results.offices && results.offices.length > 0 && (
                  <SearchResultSection
                    type="offices"
                    results={results.offices}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('offices')}
                    renderItem={(item, _index, isSelected) => {
                      const office = item as OfficeSearchResult;
                      return (
                        <SearchResultItem
                          key={office.id}
                          icon={Building}
                          color="gray"
                          title={office.name}
                          subtitle={
                            office.city && office.stateCode
                              ? `${office.city}, ${office.stateCode}`
                              : undefined
                          }
                          metadata={office.status}
                          url={office.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(office.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Spaces */}
                {results.spaces && results.spaces.length > 0 && (
                  <SearchResultSection
                    type="spaces"
                    results={results.spaces}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('spaces')}
                    renderItem={(item, _index, isSelected) => {
                      const space = item as SpaceSearchResult;
                      return (
                        <SearchResultItem
                          key={space.id}
                          icon={Monitor}
                          color="cyan"
                          title={space.name}
                          subtitle={space.officeName}
                          metadata={`${space.type} (${space.capacity})`}
                          url={space.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(space.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Groups */}
                {results.groups && results.groups.length > 0 && (
                  <SearchResultSection
                    type="groups"
                    results={results.groups}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('groups')}
                    renderItem={(item, _index, isSelected) => {
                      const group = item as GroupSearchResult;
                      return (
                        <SearchResultItem
                          key={group.id}
                          icon={Users2}
                          color="indigo"
                          title={group.name}
                          subtitle={group.description}
                          metadata={`${group.memberCount} members`}
                          url={group.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(group.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Skills */}
                {results.skills && results.skills.length > 0 && (
                  <SearchResultSection
                    type="skills"
                    results={results.skills}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('skills')}
                    renderItem={(item, _index, isSelected) => {
                      const skill = item as SkillSearchResult;
                      return (
                        <SearchResultItem
                          key={skill.id}
                          icon={Zap}
                          color="yellow"
                          title={skill.name}
                          subtitle={skill.category}
                          metadata={`${skill.peopleCount} people`}
                          url={skill.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(skill.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Certifications */}
                {results.certifications && results.certifications.length > 0 && (
                  <SearchResultSection
                    type="certifications"
                    results={results.certifications}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('certifications')}
                    renderItem={(item, _index, isSelected) => {
                      const cert = item as CertificationSearchResult;
                      return (
                        <SearchResultItem
                          key={cert.id}
                          icon={Award}
                          color="amber"
                          title={cert.name}
                          subtitle={cert.issuer}
                          metadata={`${cert.peopleCount} people`}
                          url={cert.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(cert.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Subcontractors */}
                {results.subcontractors && results.subcontractors.length > 0 && (
                  <SearchResultSection
                    type="subcontractors"
                    results={results.subcontractors}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('subcontractors')}
                    renderItem={(item, _index, isSelected) => {
                      const sub = item as SubcontractorSearchResult;
                      return (
                        <SearchResultItem
                          key={sub.id}
                          icon={UserPlus}
                          color="teal"
                          title={sub.fullName}
                          subtitle={sub.positionTitle}
                          metadata={sub.companyName}
                          url={sub.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(sub.url)}
                        />
                      );
                    }}
                  />
                )}

                {/* Subcontractor Companies */}
                {results.subcontractorCompanies &&
                  results.subcontractorCompanies.length > 0 && (
                    <SearchResultSection
                      type="companies"
                      results={results.subcontractorCompanies}
                      selectedIndex={currentSelectedIndex}
                      startIndex={getStartIndex('companies')}
                      renderItem={(item, _index, isSelected) => {
                        const company = item as SubcontractorCompanySearchResult;
                        return (
                          <SearchResultItem
                            key={company.id}
                            icon={Building2}
                            color="slate"
                            title={company.name}
                            subtitle={
                              company.city && company.state
                                ? `${company.city}, ${company.state}`
                                : company.code
                            }
                            metadata={`${company.subcontractorCount} people`}
                            url={company.url}
                            isSelected={isSelected}
                            onClick={() => handleSelect(company.url)}
                          />
                        );
                      }}
                    />
                  )}

                {/* Leases */}
                {results.leases && results.leases.length > 0 && (
                  <SearchResultSection
                    type="leases"
                    results={results.leases}
                    selectedIndex={currentSelectedIndex}
                    startIndex={getStartIndex('leases')}
                    renderItem={(item, _index, isSelected) => {
                      const lease = item as LeaseSearchResult;
                      return (
                        <SearchResultItem
                          key={lease.id}
                          icon={FileKey}
                          color="rose"
                          title={lease.leaseNumber}
                          subtitle={`${lease.officeName} - ${lease.landlordName}`}
                          metadata={lease.status}
                          url={lease.url}
                          isSelected={isSelected}
                          onClick={() => handleSelect(lease.url)}
                        />
                      );
                    }}
                  />
                )}
              </>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-2">
                  Try a different search term or check your spelling
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-600">
                  <span className="text-xs">&#8593;&#8595;</span>
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-600">
                  Enter
                </kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-600">
                  Esc
                </kbd>
                <span>Close</span>
              </span>
            </div>
            {results && results.totalCount > 0 && (
              <span>{results.totalCount} results</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for global keyboard shortcut
// eslint-disable-next-line react-refresh/only-export-components
export function useSearchModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
