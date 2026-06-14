import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logoDark from "@/assets/axis-logo-dark.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — AXIS PILATES" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Falha no login", { description: error.message });
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src={logoDark.url} alt="AXIS Pilates" width={180} height={180} className="rounded-2xl shadow-2xl" />
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-center">
              AXIS PILATES
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-primary mt-1">Colégio Batista</p>
          </div>

          <Card className="p-6 bg-zinc-900 border-zinc-800 text-white">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="seu@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Senha</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </Card>

          <div className="mt-6 text-center text-xs text-zinc-500">
            <p>Não tem cadastro? Procure a administração do estúdio.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
