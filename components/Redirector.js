import { useEffect } from 'react';

const STORAGE_KEY = 'openroutes:pendingPathRedirect';

const normalizePath = (path) => {
  if (!path) {
    return '/openroutes/';
  }

  const hasOriginPrefix = path.startsWith('/openroutes');
  const sanitizedPath = hasOriginPrefix ? path : `/openroutes${path.startsWith('/') ? path : `/${path}`}`;

  return sanitizedPath;
};

const Redirector = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const pendingRedirect = window.sessionStorage?.getItem(STORAGE_KEY);
    if (pendingRedirect) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      const targetPath = normalizePath(pendingRedirect);
      const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (targetPath !== currentLocation) {
        window.history.replaceState(null, '', targetPath);
      }
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/openroutes')) {
        const newPath = normalizePath(currentPath);
        const nextUrl = `${newPath}${window.location.search}${window.location.hash}`;
        if (nextUrl !== `${currentPath}${window.location.search}${window.location.hash}`) {
          window.history.replaceState(null, '', nextUrl);
        }
      }
    }
  }, []);

  return null;
};

export default Redirector;
