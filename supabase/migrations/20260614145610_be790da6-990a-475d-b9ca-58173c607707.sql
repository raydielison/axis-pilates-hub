
DROP POLICY IF EXISTS "Ver configurações" ON public.configuracoes;
CREATE POLICY "Admin lê configurações" ON public.configuracoes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin gerencia papéis" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
