import { formatarDataHora } from "@/lib/crm/datas";
import type { Etapa, Evento } from "@/lib/crm/tipos";
import { ROTULO_EVENTO } from "./rotulos";

export function LinhaDoTempo({
  eventos,
  etapas,
  fuso,
}: {
  eventos: Evento[];
  etapas: Etapa[];
  fuso: string;
}) {
  const nome = (id: string | null) => etapas.find((e) => e.id === id)?.nome ?? id ?? "";
  if (eventos.length === 0) return <p className="text-slate-400">Nenhum evento ainda.</p>;
  return (
    <ol className="grid gap-3">
      {eventos.map((e) => (
        <li key={e.id} className="rounded-md border border-slate-700 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{ROTULO_EVENTO[e.tipo]}</span>
            <time dateTime={e.ocorridoEm} className="text-xs text-slate-400">
              {formatarDataHora(e.ocorridoEm, fuso)}
            </time>
          </div>
          {e.tipo === "etapa_alterada" && (
            <p className="mt-1 text-sm">
              Etapa: {nome(e.etapaDe)} → {nome(e.etapaPara)}
            </p>
          )}
          {e.detalhe && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{e.detalhe}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
