import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const r = await supabase.rpc("get_my_role" as any);
    const role = ((r.data as string | null) ?? "aluno") as "admin" | "professor" | "aluno";
    return { user: data.user, role };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { role } = Route.useRouteContext();
  return (
    <AppShell role={role}>
      <Outlet />
    </AppShell>
  );
}
