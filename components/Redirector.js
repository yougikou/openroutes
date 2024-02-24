import React from 'react';
import { Redirect } from 'expo-router';

const Redirector = () => {
  if (process.env.NODE_ENV === 'production') {
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith("/openroutes")) {
      const newPath = `/openroutes/${currentPath}`;
      return <Redirect href={newPath} />;
    }
  }
  return null
};

export default Redirector;
