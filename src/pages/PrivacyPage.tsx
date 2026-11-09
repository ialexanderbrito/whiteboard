import React from 'react';
import { ArrowLeft, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MirioLogo } from '@/components/layout/MirioLogo';

const sections = [
  ['01', 'Dados que coletamos', 'dados'],
  ['02', 'Como usamos os dados', 'uso'],
  ['03', 'Serviços de terceiros', 'terceiros'],
  ['04', 'Cookies e armazenamento', 'armazenamento'],
  ['05', 'Compartilhamento e retenção', 'compartilhamento'],
  ['06', 'Seus direitos', 'direitos'],
  ['07', 'Segurança', 'seguranca'],
  ['08', 'Alterações e contato', 'contato'],
] as const;

const PrivacySection: React.FC<{
  number: string;
  title: string;
  id: string;
  children: React.ReactNode;
}> = ({ number, title, id, children }) => (
  <section id={id} className="scroll-mt-6 py-8 first:pt-0">
    <div className="mb-4 flex items-baseline gap-3">
      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{number}</span>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    </div>
    <div className="text-sm leading-7 text-muted-foreground">{children}</div>
  </section>
);

export const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

    <div className="relative mx-auto w-[min(1120px,calc(100%-2rem))]">
      <header className="flex min-h-16 items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <MirioLogo variant="compact" className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-[-0.06em]">mirio</span>
        </Link>
        <Button asChild variant="ghost" size="sm" className="font-mono text-[10px] uppercase tracking-widest">
          <Link to="/">
            <ArrowLeft data-icon="inline-start" />
            Voltar ao workspace
          </Link>
        </Button>
      </header>

      <main className="grid gap-10 py-14 md:grid-cols-[200px_minmax(0,720px)] md:justify-center md:gap-16 md:py-20">
        <nav aria-label="Índice da política" className="order-2 md:order-1 md:sticky md:top-7 md:h-fit">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Nesta página</p>
          <div className="flex gap-2 overflow-x-auto pb-2 md:block md:overflow-visible">
            {sections.map(([number, title, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-[color,border-color,padding] duration-150 ease-out hover:border-emerald-500/50 hover:text-foreground md:rounded-none md:border-y-0 md:border-r-0 md:border-l md:px-3 md:py-2"
              >
                {number} · {title}
              </a>
            ))}
          </div>
        </nav>

        <div className="order-1 md:order-2">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(var(--emerald-500)/0.12)]" />
            Workspace // Privacidade
          </div>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.075em] sm:text-6xl md:text-7xl">
            Seus dados.<br />Seu espaço.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Esta política explica, sem juridiquês desnecessário, quais dados o Mirio trata para manter sua colaboração visual segura e em tempo real.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Badge variant="success">● Política vigente</Badge>
            <Badge variant="outline">Atualizada em 09 nov 2026</Badge>
            <Badge variant="outline">Leitura de 4 min</Badge>
          </div>

          <div className="mt-14">
            <PrivacySection number="01" title="Dados que coletamos" id="dados">
              <p>Quando você entra com o Google, recebemos apenas o necessário para criar e manter sua sessão: identificador único da conta, nome exibido, endereço de e-mail e foto de perfil, quando disponibilizada pelo Google. Não recebemos sua senha.</p>
              <p className="mt-3">Se escolher entrar como convidado, tratamos o nome ou apelido informado e um identificador anônimo gerado pelo Firebase Authentication.</p>
              <p className="mt-3">Ao usar um quadro, tratamos o conteúdo que você cria ou altera, como textos, formas, desenhos, reações, votos, cursores e informações de colaboração.</p>
            </PrivacySection>
            <Separator />

            <PrivacySection number="02" title="Como usamos os dados" id="uso">
              <ul className="grid gap-2">
                {['Autenticar sua identidade e manter sua sessão.', 'Salvar, sincronizar e exibir quadros e ações dos participantes.', 'Identificar autores e aplicar permissões do quadro.', 'Proteger o serviço, diagnosticar falhas e manter sua segurança.', 'Cumprir obrigações legais quando aplicável.'].map((item) => (
                  <li key={item} className="flex gap-2"><Check className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-400" data-icon="inline-start" />{item}</li>
                ))}
              </ul>
            </PrivacySection>
            <Separator />

            <PrivacySection number="03" title="Serviços de terceiros" id="terceiros">
              <p>O Mirio usa o Google Sign-In e serviços do Firebase, fornecidos pela Google LLC, para autenticação, banco de dados e sincronização em tempo real. Esses serviços podem tratar dados conforme suas próprias políticas. Consulte a <a className="font-medium text-foreground underline decoration-emerald-500 decoration-2 underline-offset-4" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Política de Privacidade do Google <ExternalLink className="inline size-3" /></a>.</p>
              <Card className="mt-6 bg-card/80 shadow-xs">
                <CardHeader className="flex-row items-start gap-3 space-y-0 p-4">
                  <ShieldCheck className="mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <CardTitle className="text-sm">Sem publicidade personalizada</CardTitle>
                    <CardDescription className="mt-1 text-xs leading-5">Não vendemos seus dados pessoais e não os usamos para publicidade personalizada.</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </PrivacySection>
            <Separator />

            <PrivacySection number="04" title="Cookies e armazenamento" id="armazenamento">
              <p>Usamos cookies e armazenamento do navegador para manter a autenticação e preferências da interface, como tema e cor do cursor. O Firebase também pode usar armazenamento local e IndexedDB para manter a sessão e permitir o funcionamento offline ou com conexão instável. Apagar esses dados pode encerrar sua sessão e remover preferências locais.</p>
            </PrivacySection>
            <Separator />

            <PrivacySection number="05" title="Compartilhamento e retenção" id="compartilhamento">
              <p>Os dados são compartilhados com os provedores técnicos necessários para operar o Mirio, especialmente o Google/Firebase. O conteúdo de um quadro pode ser visto pelos participantes que receberam acesso. Mantemos os dados enquanto sua conta ou quadro estiverem ativos, ou pelo período necessário para cumprir obrigações legais e resolver disputas.</p>
            </PrivacySection>
            <Separator />

            <PrivacySection number="06" title="Seus direitos" id="direitos">
              <p>Você pode solicitar acesso, correção ou exclusão dos dados associados à sua conta, além de esclarecimentos sobre este tratamento. Também é possível sair da conta a qualquer momento pelo aplicativo. A exclusão de um quadro ou conta pode afetar a colaboração e não poderá ser desfeita.</p>
            </PrivacySection>
            <Separator />

            <PrivacySection number="07" title="Segurança" id="seguranca">
              <p>Adotamos controles de autenticação e regras de acesso do Firebase para proteger os dados. Nenhum serviço de internet é completamente livre de riscos; por isso, não compartilhe informações sensíveis nos quadros.</p>
            </PrivacySection>
            <Separator />

            <PrivacySection number="08" title="Alterações e contato" id="contato">
              <p>Podemos atualizar esta política para refletir mudanças no Mirio ou na legislação. Publicaremos a versão atualizada nesta página. Para dúvidas ou solicitações relacionadas à privacidade, abra uma solicitação no <a className="font-medium text-foreground underline decoration-emerald-500 decoration-2 underline-offset-4" href="https://github.com/ialexanderbrito/whiteboard" target="_blank" rel="noopener noreferrer">repositório oficial do Mirio <ExternalLink className="inline size-3" /></a>.</p>
            </PrivacySection>
          </div>
        </div>
      </main>

      <footer className="flex flex-col gap-1 border-t border-border py-5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>MIRIO // REALTIME COLLABORATIVE WHITEBOARD</span>
        <span>Documento público · versão 1.0</span>
      </footer>
    </div>
  </div>
);

export default PrivacyPage;
