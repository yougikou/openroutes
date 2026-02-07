import { RouteIssue } from '../components/apis/GitHubAPI';

export interface RouteCacheState {
  issues: RouteIssue[];
  page: number;
  scrollOffset: number;
  searchQuery: string;
}

let cache: RouteCacheState = {
  issues: [],
  page: 1,
  scrollOffset: 0,
  searchQuery: '',
};

export const getRouteCache = () => cache;

export const updateRouteCache = (newState: Partial<RouteCacheState>) => {
  cache = { ...cache, ...newState };
};

export const resetRouteCache = () => {
  cache = {
    issues: [],
    page: 1,
    scrollOffset: 0,
    searchQuery: '',
  };
};
