import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  Home, Calendar, ClipboardCheck, RotateCcw, Wallet, User, Users,
  CalendarDays, BookOpen, BarChart3, Settings, LogOut, GraduationCap,
  CircleDollarSign, FileText, NotebookPen, Bell, KeyRound,
} from "lucide-react";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import logoDark from "@/assets/axis-logo-dark.asset.json";
import logoLight from "@/assets/axis-logo-light.asset.json";

type Role = "admin" | "professor" | "aluno";
type NavItem = { to: string; label: string; icon: typeof Home; bottom?: boolean };

const NAV: Record<Role, NavItem[]> = {
  aluno: [
    { to: "/aluno", label: "Início", icon: Home, bottom: true },
    { to: "/aluno/horario", label: "Horário", icon: Calendar, bottom: true },
    { to: "/aluno/presencas", label: "Presenças", icon: ClipboardCheck, bottom: true },
    { to: "/aluno/reposicoes", label: "Reposições", icon: RotateCcw, bottom: true },
    { to: "/aluno/financeiro", label: "Financeiro", icon: Wallet },
    { to: "/aluno/perfil", label: "Perfil", icon: User, bottom: true },
  ],
  professor: [
    { to: "/professor", label: "Início", icon: Home, bottom: true },
    { to: "/professor/agenda", label: "Agenda", icon: CalendarDays, bottom: true },
    { to: "/professor/alunos", label: "Alunos", icon: Users, bottom: true },
    { to: "/professor/presenca", label: "Presença", icon: ClipboardCheck, bottom: true },
    { to: "/professor/observacoes", label: "Observações", icon: NotebookPen, bottom: true },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: Home, bottom: true },
    { to: "/admin/alunos", label: "Alunos", icon: GraduationCap, bottom: true },
    { to: "/admin/professores", label: "Professores", icon: Users },
    { to: "/admin/planos", label: "Planos", icon: BookOpen },
    { to: "/admin/agenda", label: "Agenda", icon: CalendarDays, bottom: true },
    { to: "/admin/financeiro", label: "Financeiro", icon: CircleDollarSign, bottom: true },
    { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  ],
};

const ROLE_LABEL: Record<Role, string> = { admin: "Administração", professor: "Professor", aluno: "Aluno" };

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const items = NAV[role];
  const bottomItems = items.filter((i) => i.bottom).slice(0, 5);

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) => pathname === to || (to !== `/${role}` && pathname.startsWith(to));

  return (
    <div className="min-h-screen w-full bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-6 flex items-center gap-3 border-b border-sidebar-border">
          <img src={logoDark.url} alt="AXIS" width={44} height={44} className="rounded-xl" />
          <div className="min-w-0">
            <p className="font-display font-bold text-sm leading-tight">AXIS PILATES</p>
            <p className="text-[10px] uppercase tracking-widest text-primary">Colégio Batista</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
            {ROLE_LABEL[role]}
          </p>
          {items.map((it) => {
            const Icon = it.icon;
            const active = isActive(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <ChangePasswordDialog
            trigger={
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent">
                <KeyRound className="h-4 w-4 mr-2" /> Alterar senha
              </Button>
            }
          />
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-background sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoLight.url} alt="AXIS" width={32} height={32} className="rounded-lg" />
            <div className="min-w-0">
              <p className="font-display font-bold text-sm leading-none truncate">AXIS PILATES</p>
              <p className="text-[9px] uppercase tracking-widest text-primary">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ChangePasswordDialog
              trigger={<Button size="icon" variant="ghost" aria-label="Alterar senha"><KeyRound className="h-4 w-4" /></Button>}
            />
            <Button onClick={handleLogout} size="icon" variant="ghost" aria-label="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-8">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border safe-bottom">
          <div className="grid grid-cols-5 h-16">
            {bottomItems.map((it) => {
              const Icon = it.icon;
              const active = isActive(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 text-[10px] transition-colors",
                    active ? "text-primary font-semibold" : "text-muted-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "scale-110")} />
                  <span className="truncate max-w-full px-1">{it.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
