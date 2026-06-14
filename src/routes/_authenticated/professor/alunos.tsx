import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listarAlunosProfessor } from "@/lib/professor.functions";
import { PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/professor/alunos")({ component: Alunos });

function Alunos() {
  const fn = useServerFn(listarAlunosProfessor);
  const { data } = useQuery({ queryKey: ["prof-alunos"], queryFn: () => fn() });
  return (
    <div>
      <PageHeader title="Alunos" subtitle={`${data?.length ?? 0} alunos cadastrados`} />
      <div className="grid md:grid-cols-2 gap-3">
        {(data ?? []).map((a: any) => (
          <div key={a.id} className="rounded-2xl border bg-card p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="font-display font-semibold truncate">{a.profile?.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{a.profile?.email}</p>
                <p className="text-xs mt-1">{a.profile?.telefone ?? "—"}</p>
              </div>
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${a.status === "ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{a.status}</span>
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between text-xs">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{a.plano?.nome ?? "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
