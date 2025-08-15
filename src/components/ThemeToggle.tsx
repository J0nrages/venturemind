import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
};

// Compact version for mobile or tight spaces (same as main now)
export const ThemeToggleCompact: React.FC = () => {
  return <ThemeToggle />;
};