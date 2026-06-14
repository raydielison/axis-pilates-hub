import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const role = await supabase.rpc("get_my_role" as any);
    const r = (role.data as string | null) ?? "aluno";
    if (r === "admin") throw redirect({ to: "/admin" });
    if (r === "professor") throw redirect({ to: "/professor" });
    throw redirect({ to: "/aluno" });
  },
  component: () => null,
});
