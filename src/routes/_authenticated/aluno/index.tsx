import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { meuDashboard } from "@/lib/aluno.functions";
import { KPICard, PageHeader } from "@/components/ui-helpers";
import { Calendar, Wallet, Bell, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/aluno/")({
  component: AlunoDashboard,
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function AlunoDashboard() {
  const fn = useServerFn(meuDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["aluno-dashboard"], queryFn: () => fn() });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  const aluno = data?.aluno as any;
  const proxima = data?.proximaAula as any;
  const pag = data?.pagamentoAtual as any;
  const avisos = (data?.avisos ?? []) as any[];

  return (
    <div>
      <PageHeader
        title={`Olá, ${aluno?.profile?.nome?.split(" ")[0] ?? "Aluno"}`}
        subtitle="Bem-vindo ao seu painel"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard label="Próxima aula" value={proxima ? `${DIAS[proxima.dia_semana]} ${String(proxima.hora).slice(0,5)}` : "—"} accent />
        <KPICard label="Plano" value={aluno?.plano?.nome?.replace("Plano ", "") ?? "—"} hint={aluno?.plano ? `R$ ${Number(aluno.plano.valor).toFixed(2)}` : undefined} />
        <KPICard label="Status" value={aluno?.status === "ativo" ? "Ativo" : "Suspenso"} hint={aluno?.status === "ativo" ? "Tudo certo" : "Verifique financeiro"} />
        <KPICard label="Reposições" value={aluno?.saldo_reposicoes ?? 0} hint="créditos disponíveis" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-orange-500" />
            <h2 className="font-display font-semibold">Situação financeira</h2>
          </div>
          {pag ? (
            <div>
              <p className="text-2xl font-bold">R$ {Number(pag.valor).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Vencimento: {new Date(pag.data_vencimento).toLocaleDateString("pt-BR")}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: pag.status === "pago" ? "rgb(220 252 231)" : pag.status === "atrasado" ? "rgb(254 226 226)" : "rgb(254 243 199)",
                  color: pag.status === "pago" ? "rgb(22 101 52)" : pag.status === "atrasado" ? "rgb(153 27 27)" : "rgb(133 77 14)",
                }}>
                {pag.status === "pago" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {pag.status.toUpperCase()}
              </div>
            </div>
          ) : <p className="text-muted-foreground text-sm">Sem pagamento registrado neste mês.</p>}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-orange-500" />
            <h2 className="font-display font-semibold">Avisos</h2>
          </div>
          {avisos.length === 0 && <p className="text-muted-foreground text-sm">Sem avisos no momento.</p>}
          <ul className="space-y-3">
            {avisos.map((a) => (
              <li key={a.id} className="border-l-2 border-orange-500 pl-3">
                <p className="text-sm font-medium">{a.titulo}</p>
                <p className="text-xs text-muted-foreground">{a.mensagem}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
