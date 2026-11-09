import React from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const THEME_OPTIONS: { id: Theme; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Escuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
];

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className={`size-8 rounded-lg border-border/80 bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-xs hover:bg-muted/80 hover:text-foreground active:scale-[0.98] transition-all ${className || ''}`}
          aria-label={`Tema atual: ${theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}. Clique para alterar.`}
          title="Alternar tema (Claro, Escuro ou Sistema)"
        >
          {theme === 'system' ? (
            <Monitor className="size-4 text-foreground transition-transform duration-200" />
          ) : resolvedTheme === 'dark' ? (
            <Moon className="size-4 text-foreground transition-transform duration-200 hover:-rotate-12" />
          ) : (
            <Sun className="size-4 text-foreground transition-transform duration-200 hover:rotate-45" />
          )}
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-36 p-1 rounded-lg border-border/80 shadow-md backdrop-blur-md animate-in fade-in-0 zoom-in-95">
        <DropdownMenuGroup>
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <DropdownMenuItem
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`flex items-center justify-between text-xs font-medium rounded-md cursor-pointer py-1.5 px-2 transition-colors ${
                  isSelected ? 'bg-muted/80 text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="size-3.5 text-foreground" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
