import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getHelpContextKey } from '../config/helpContextKeys';
import { useHelpByContext } from '../hooks/useHelp';
import type { HelpArticle } from '../types/help';

interface HelpContextValue {
  // Current help context
  contextKey: string;
  moduleName: string;
  articles: HelpArticle[];
  isLoading: boolean;
  error: Error | null;

  // Panel state
  isHelpPanelOpen: boolean;
  openHelpPanel: () => void;
  closeHelpPanel: () => void;
  toggleHelpPanel: () => void;

  // Selected article
  selectedArticle: HelpArticle | null;
  selectArticle: (article: HelpArticle | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined);

export function HelpProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { contextKey, moduleName } = getHelpContextKey(location.pathname);

  // Help panel state
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch help articles for current context
  const { data: articles = [], isLoading, error } = useHelpByContext(contextKey);

  // Panel controls
  const openHelpPanel = useCallback(() => setIsHelpPanelOpen(true), []);
  const closeHelpPanel = useCallback(() => {
    setIsHelpPanelOpen(false);
    setSelectedArticle(null);
    setSearchQuery('');
  }, []);
  const toggleHelpPanel = useCallback(() => {
    setIsHelpPanelOpen((prev) => !prev);
    if (isHelpPanelOpen) {
      setSelectedArticle(null);
      setSearchQuery('');
    }
  }, [isHelpPanelOpen]);

  // Article selection
  const selectArticle = useCallback((article: HelpArticle | null) => {
    setSelectedArticle(article);
  }, []);

  const value = useMemo(
    () => ({
      contextKey,
      moduleName,
      articles,
      isLoading,
      error: error as Error | null,
      isHelpPanelOpen,
      openHelpPanel,
      closeHelpPanel,
      toggleHelpPanel,
      selectedArticle,
      selectArticle,
      searchQuery,
      setSearchQuery,
    }),
    [
      contextKey,
      moduleName,
      articles,
      isLoading,
      error,
      isHelpPanelOpen,
      openHelpPanel,
      closeHelpPanel,
      toggleHelpPanel,
      selectedArticle,
      selectArticle,
      searchQuery,
    ]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHelpContext() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelpContext must be used within a HelpProvider');
  }
  return context;
}
