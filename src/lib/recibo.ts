import jsPDF from "jspdf";
import logoDark from "@/assets/axis-logo-dark.asset.json";

export type ReciboData = {
  aluno_nome: string;
  aluno_email?: string | null;
  aluno_cpf?: string | null;
  plano_nome?: string | null;
  mes_referencia: string; // ISO date
  valor: number;
  data_pagamento?: string | null;
  forma?: string | null;
  professor_nome?: string | null;
  crefito?: string | null;
  recibo_id: string;
};

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmtMes(iso: string) {
  const d = new Date(iso);
  return `${MESES[d.getMonth()]} / ${d.getFullYear()}`;
}
function fmtData(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
function fmtBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(logoDark.url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarReciboPDF(d: ReciboData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  const logo = await loadLogo();
  if (logo) {
    try { doc.addImage(logo, "JPEG", 40, 36, 80, 80); } catch { /* ignore */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RECIBO DE PAGAMENTO", W / 2, 70, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Axis Pilates Studio", W / 2, 88, { align: "center" });
  doc.text(`Recibo nº ${d.recibo_id.slice(0, 8).toUpperCase()}`, W / 2, 102, { align: "center" });

  doc.setDrawColor(220);
  doc.line(40, 130, W - 40, 130);

  doc.setTextColor(0);
  doc.setFontSize(11);
  let y = 160;
  const row = (k: string, v: string) => {
    doc.setFont("helvetica", "bold"); doc.text(k, 50, y);
    doc.setFont("helvetica", "normal"); doc.text(v, 200, y);
    y += 22;
  };
  row("Aluno:", d.aluno_nome);
  if (d.aluno_email) row("E-mail:", d.aluno_email);
  if (d.aluno_cpf) row("CPF:", d.aluno_cpf);
  if (d.plano_nome) row("Plano:", d.plano_nome);
  row("Mês de referência:", fmtMes(d.mes_referencia));
  row("Data do pagamento:", fmtData(d.data_pagamento));
  if (d.forma) row("Forma de pagamento:", d.forma.toUpperCase());

  y += 6;
  doc.setDrawColor(220);
  doc.line(40, y, W - 40, y);
  y += 30;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Valor pago:", 50, y);
  doc.setFontSize(18);
  doc.text(fmtBR(Number(d.valor)), W - 50, y, { align: "right" });

  y += 50;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const corpo = `Recebemos de ${d.aluno_nome} a quantia de ${fmtBR(Number(d.valor))}, referente à mensalidade de ${fmtMes(d.mes_referencia)} do plano${d.plano_nome ? ` "${d.plano_nome}"` : ""}, junto à Axis Pilates Studio. Para maior clareza, firmamos o presente recibo.`;
  doc.text(doc.splitTextToSize(corpo, W - 100), 50, y);

  // Assinatura / CREFITO
  y = doc.internal.pageSize.getHeight() - 130;
  doc.setDrawColor(150);
  doc.line(W / 2 - 100, y, W / 2 + 100, y);
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(d.professor_nome ?? "Instrutor responsável", W / 2, y + 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`CREFITO: ${d.crefito ?? "—"}`, W / 2, y + 28, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    `Emitido em ${new Date().toLocaleString("pt-BR")} · Pagamento realizado presencialmente no studio.`,
    W / 2,
    doc.internal.pageSize.getHeight() - 30,
    { align: "center" },
  );

  const nome = `recibo-${fmtMes(d.mes_referencia).replace(" / ", "-")}-${d.aluno_nome.split(" ")[0]}.pdf`;
  doc.save(nome);
}
