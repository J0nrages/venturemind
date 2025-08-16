/**
 * Theme - Design tokens for chat components
 * Consistent theming across the chat interface
 */

export const theme = {
  // Spacing scale
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },
  
  // Border radius
  radius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
    circle: '50%'
  },
  
  // Typography
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem' // 30px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  },
  
  // Shadows
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
  },
  
  // Z-index scale
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    tooltip: 60,
    notification: 70
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Chat-specific tokens
  chat: {
    // Message styles
    message: {
      maxWidth: '70%',
      padding: '0.75rem 1rem',
      borderRadius: '1rem',
      gap: '0.5rem'
    },
    
    // Input styles
    input: {
      minHeight: '44px',
      maxHeight: '300px',
      padding: '0.75rem',
      borderRadius: '0.75rem'
    },
    
    // Omnibox styles
    omnibox: {
      width: {
        global: '640px',
        inline: '400px'
      },
      maxHeight: '400px',
      borderRadius: '0.75rem'
    },
    
    // Panel styles
    panel: {
      width: '320px',
      padding: '1rem',
      borderRadius: '0'
    },
    
    // Mention pill styles
    mention: {
      padding: '0.125rem 0.5rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      gap: '0.25rem'
    }
  }
};

// Color palette (using CSS variables for theme compatibility)
export const colors = {
  // Base colors (defined in CSS/Tailwind)
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  
  card: 'hsl(var(--card))',
  cardForeground: 'hsl(var(--card-foreground))',
  
  popover: 'hsl(var(--popover))',
  popoverForeground: 'hsl(var(--popover-foreground))',
  
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',
  
  secondary: 'hsl(var(--secondary))',
  secondaryForeground: 'hsl(var(--secondary-foreground))',
  
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',
  
  destructive: 'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
  
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
  
  // Semantic colors
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  error: 'hsl(0, 84%, 60%)',
  info: 'hsl(199, 89%, 48%)'
};

// Utility functions
export const themeUtils = {
  // Get responsive value based on breakpoint
  responsive: <T,>(values: { base?: T; sm?: T; md?: T; lg?: T; xl?: T }) => {
    // This would be used with CSS-in-JS or inline styles
    return values;
  },
  
  // Convert spacing to pixels
  spacingToPx: (spacing: keyof typeof theme.spacing): number => {
    const value = theme.spacing[spacing];
    return parseFloat(value) * 16; // Assuming 1rem = 16px
  },
  
  // Get CSS variable value
  getCSSVariable: (variable: string): string => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
  },
  
  // Apply theme class
  applyTheme: (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }
};