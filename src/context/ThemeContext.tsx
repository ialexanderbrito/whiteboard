import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  isDark: boolean;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const initialState: ThemeProviderState = {
  theme: 'system',
  isDark: false,
  resolvedTheme: 'light',
  setTheme: () => null,
  toggleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'mirio_theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem(storageKey) as Theme) || defaultTheme : defaultTheme)
  );
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      root.classList.remove('light', 'dark');

      let isDarkTheme = false;
      if (theme === 'system') {
        isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDarkTheme = theme === 'dark';
      }

      setResolvedTheme(isDarkTheme ? 'dark' : 'light');
      root.classList.add(isDarkTheme ? 'dark' : 'light');
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  // Atualiza dinamicamente as metatags Open Graph & Twitter Cards de acordo com o tema ativo
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ogImageName = resolvedTheme === 'dark' ? 'og-dark.png' : 'og-light.png';
    const origin = window.location.origin.includes('localhost')
      ? 'https://mirio-wb.vercel.app'
      : window.location.origin;
    const ogUrl = `${origin}/${ogImageName}`;

    const ogMeta = document.querySelector('meta[property="og:image"]');
    if (ogMeta) ogMeta.setAttribute('content', ogUrl);

    const ogSecureMeta = document.querySelector('meta[property="og:image:secure_url"]');
    if (ogSecureMeta) ogSecureMeta.setAttribute('content', ogUrl);

    const twitterMeta = document.querySelector('meta[name="twitter:image"]');
    if (twitterMeta) twitterMeta.setAttribute('content', ogUrl);

    const linkImage = document.querySelector('link[rel="image_src"]');
    if (linkImage) linkImage.setAttribute('href', ogUrl);
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    // Ciclo sequencial intuitivo: Claro -> Escuro -> Sistema
    const nextTheme: Theme =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  };

  const value = {
    theme,
    isDark: resolvedTheme === 'dark',
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
