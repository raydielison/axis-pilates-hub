import jsPDF from "jspdf";

export type ReciboData = {
  aluno_nome: string;
  aluno_email?: string | null;
  aluno_cpf?: string | null;
  plano_nome?: string | null;
  mes_referencia: string; // ISO date YYYY-MM-DD
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

// Parse YYYY-MM-DD as local date — `new Date("YYYY-MM-DD")` parses as UTC
// which shifts to previous day/month in BR timezone (UTC-3).
function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m: (m || 1) - 1, d: d || 1 };
}
function fmtMes(iso: string) {
  const { y, m } = parseISO(iso);
  return `${MESES[m]} / ${y}`;
}
function fmtData(iso?: string | null) {
  if (!iso) return "—";
  const { y, m, d } = parseISO(iso);
  return `${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${y}`;
}
function fmtBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function gerarReciboPDF(d: ReciboData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Cabeçalho com marca em texto (sem fundo) — substitui o logo JPEG com fundo escuro
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(20);
  doc.text("AXIS", 40, 70);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("PILATES STUDIO", 40, 86);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text("RECIBO DE PAGAMENTO", W - 40, 70, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Recibo nº ${d.recibo_id.slice(0, 8).toUpperCase()}`, W - 40, 86, { align: "right" });

  doc.setDrawColor(220);
  doc.line(40, 110, W - 40, 110);

  doc.setTextColor(0);
  doc.setFontSize(11);
  let y = 140;
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
