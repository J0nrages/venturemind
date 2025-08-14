import { useEffect } from 'react';

export const usePageTitle = (title: string) => {
  useEffect(() => {
    const fullTitle = title ? `Syna - ${title}` : 'Syna';
    document.title = fullTitle;
    
    return () => {
      document.title = 'Syna';
    };
  }, [title]);
};