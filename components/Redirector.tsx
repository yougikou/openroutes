import React from 'react';
import { Redirect } from 'expo-router';

const Redirector = (): React.ReactElement | null => {
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/openroutes')) {
      const newPath = '/openroutes/' + currentPath;
      return <Redirect href={newPath} />;
    }
  }
  return null;
};

export default Redirector;
