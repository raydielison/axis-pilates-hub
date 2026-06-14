import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({ component: Cfg });

function Cfg() {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Regras de funcionamento do estúdio" />
      <div className="rounded-2xl border bg-card p-6 space-y-4 max-w-2xl">
        <Row label="Funcionamento" value="Segunda a sexta" />
        <Row label="Horários" value="07:00–11:00 e 16:00–22:00" />
        <Row label="Capacidade por horário" value="4 alunos" />
        <Row label="Dia de vencimento" value="Dia 10 de cada mês" />
        <Row label="Suspensão" value="A partir do dia 11 sem pagamento" />
        <Row label="Validade reposição" value="30 dias" />
        <Row label="Antecedência mínima" value="24 horas" />
      </div>
      <p className="text-xs text-muted-foreground mt-4 max-w-2xl">
        Estrutura escalável: integrações futuras com PIX automático e WhatsApp já têm campos preparados no banco.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}
