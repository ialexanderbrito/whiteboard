import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Sparkles, 
  Target, 
  Plus, 
  Check,
  CheckSquare,
  Briefcase,
  Heart,
  CalendarDays,
  Users,
  Lightbulb,
  GitBranch,
  Map,
  LayoutTemplate
} from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SPRINT_TEMPLATES, type SprintTemplate } from '@/utils/sprintTemplates';

interface SprintTemplatesModalProps {
  onInsertTemplate: (template: SprintTemplate) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SprintTemplatesModal: React.FC<SprintTemplatesModalProps> = ({
  onInsertTemplate,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (setControlledOpen || (() => {})) : setInternalOpen;
  const [selectedTemplate, setSelectedTemplate] = useState<SprintTemplate>(SPRINT_TEMPLATES[0]);

  const handleInsert = () => {
    onInsertTemplate(selectedTemplate);
    setOpen(false);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'LayoutGrid': return <LayoutGrid className="size-4 text-foreground" />;
      case 'Sparkles': return <Sparkles className="size-4 text-foreground" />;
      case 'CheckSquare': return <CheckSquare className="size-4 text-foreground" />;
      case 'Briefcase': return <Briefcase className="size-4 text-foreground" />;
      case 'Heart': return <Heart className="size-4 text-foreground" />;
      case 'CalendarDays': return <CalendarDays className="size-4 text-foreground" />;
      case 'Users': return <Users className="size-4 text-foreground" />;
      case 'Lightbulb': return <Lightbulb className="size-4 text-foreground" />;
      case 'GitBranch': return <GitBranch className="size-4 text-foreground" />;
      case 'Map': return <Map className="size-4 text-foreground" />;
      case 'LayoutTemplate': return <LayoutTemplate className="size-4 text-foreground" />;
      default: return <Target className="size-4 text-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(!isControlled || trigger) && (
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-medium rounded-lg shadow-xs">
              <LayoutGrid className="size-3.5" />
              <span>Templates</span>
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-2xl p-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <LayoutGrid className="size-4" />
            <span>Templates de Colunas de Sprint</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Modelos prontos de raias e colunas para estruturar seu fluxo ágil rapidamente.
          </DialogDescription>
        </DialogHeader>

        {/* Escolha do Template com scroll suave para acomodar o catálogo completo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-2 max-h-[360px] overflow-y-auto pr-1">
          {SPRINT_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate.id === tmpl.id;
            return (
              <Card
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={`p-3 cursor-pointer transition-all border text-left flex flex-col justify-between ${
                  isSelected
                    ? 'border-foreground bg-muted/40 shadow-xs'
                    : 'border-border hover:border-foreground/30 hover:bg-muted/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="size-7 rounded border border-border bg-background flex items-center justify-center">
                      {getIcon(tmpl.iconName)}
                    </div>
                    <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {tmpl.badge}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground mb-1">{tmpl.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-medium text-foreground">
                  <span className="text-muted-foreground">{isSelected ? 'Selecionado' : 'Escolher'}</span>
                  {isSelected && <Check className="size-3.5 text-primary" />}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Pré-visualização Fiel ao Canvas: Raias com abas superiores e Post-its autênticos */}
        <div className="bg-muted/40 p-3.5 rounded-lg border border-border space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Prévia das Raias de Sprint ({selectedTemplate.columns.length} colunas)
            </p>
            <span className="text-[10px] text-muted-foreground">Estrutura idêntica ao quadro</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {selectedTemplate.columns.map((col, idx) => (
              <div
                key={idx}
                className="flex flex-col rounded-lg border border-dashed overflow-hidden shadow-2xs"
                style={{
                  borderColor: col.frameStroke,
                  backgroundColor: col.frameFill,
                }}
              >
                {/* Aba de Título Superior da Coluna (Idêntica ao FrameItem do Canvas) */}
                <div
                  className="px-2 py-1 text-[11px] font-bold text-white flex items-center gap-1 shadow-xs truncate"
                  style={{ backgroundColor: col.frameStroke }}
                >
                  <span className="truncate">{col.title}</span>
                </div>

                {/* Conteúdo Interno da Raia com Post-it de Exemplo */}
                <div className="p-2 flex-1 flex flex-col justify-start min-h-[90px]">
                  <div
                    className="p-2 rounded-md shadow-xs border border-black/10 text-zinc-900 flex flex-col justify-between"
                    style={{ backgroundColor: col.stickyFill }}
                  >
                    <p className="text-[10px] font-medium leading-snug line-clamp-3">
                      {col.cards?.[0] || 'Card de exemplo'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-600 font-mono">
                      <span>#card-0{idx + 1}</span>
                      <span>✨</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button onClick={handleInsert} size="sm" className="gap-1.5 h-8 text-xs font-medium shadow-xs">
            <Plus className="size-3.5" />
            <span>Inserir no Quadro</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
