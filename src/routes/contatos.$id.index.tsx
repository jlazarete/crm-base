import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { DialogoApagar, FormEtapa, FormNota, FormProximaAcao } from "@/components/crm/Acoes";
import { BotaoWhatsApp } from "@/components/crm/BotaoWhatsApp";
import { botaoSecundario, cartao } from "@/components/crm/estilos";
import { LinhaDoTempo } from "@/components/crm/LinhaDoTempo";
import { buscarContatoFn } from "@/lib/crm/crm.functions";
import { formatarData, formatarDataHora } from "@/lib/crm/datas";
import { formatarTelefone } from "@/lib/crm/telefone";

export const Route = createFileRoute("/contatos/$id/")({
  loader: async ({ params }) => {
    const r = await buscarContatoFn({ data: { id: params.id } });
    if (!r.ok && r.codigo === "nao-encontrado") throw notFound();
    return r;
  },
  head: () => ({ meta: [{ title: "Contato | CRM" }] }),
  component: Contato,
});

const reais = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Contato() {
  const r = Route.useLoaderData();
  if (!r.ok)
    return (
      <p role="alert" className="text-red-300">
        {r.mensagem}
      </p>
    );
  const { contato: c, eventos, etapas, config } = r.dados;
  const dados: [string, string | null][] = [
    ["E-mail", c.email],
    ["Telefone", c.telefone ? formatarTelefone(c.telefone) : null],
    ["Segmento", c.segmento],
    ["Origem", c.origemNome],
    ["Valor estimado", c.valorEstimadoCentavos === null ? null : reais(c.valorEstimadoCentavos)],
    ["Cadastrado em", formatarDataHora(c.criadoEm, config.fusoHorario)],
  ];
  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <h1 className="text-2xl font-semibold">{c.nome}</h1>
        <p className="text-slate-300">{[c.empresa, c.etapaNome].filter(Boolean).join(" · ")}</p>
        <div className="flex flex-wrap gap-3">
          <BotaoWhatsApp telefone={c.telefone} nome={c.nome} mensagem={config.mensagemWhatsapp} />
          <Link to="/contatos/$id/editar" params={{ id: c.id }} className={botaoSecundario}>
            Editar
          </Link>
          <DialogoApagar contatoId={c.id} nome={c.nome} />
        </div>
      </header>
      <section aria-labelledby="t-dados" className={cartao}>
        <h2 id="t-dados" className="mb-2 text-lg font-semibold">
          Dados
        </h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          {dados
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-400">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
      </section>
      <section aria-labelledby="t-etapa" className={cartao}>
        <h2 id="t-etapa" className="mb-2 text-lg font-semibold">
          Etapa
        </h2>
        <FormEtapa contatoId={c.id} etapaAtual={c.etapaId} etapas={etapas} />
      </section>
      <section aria-labelledby="t-acao" className={cartao}>
        <h2 id="t-acao" className="mb-2 text-lg font-semibold">
          Próxima ação
        </h2>
        {c.proximaAcaoEm && c.proximaAcaoTexto && (
          <p className="mb-3">
            {c.proximaAcaoTexto} ({formatarData(c.proximaAcaoEm)})
          </p>
        )}
        <FormProximaAcao
          contatoId={c.id}
          atual={
            c.proximaAcaoEm && c.proximaAcaoTexto
              ? { data: c.proximaAcaoEm, texto: c.proximaAcaoTexto }
              : null
          }
        />
      </section>
      <section aria-labelledby="t-nota" className={cartao}>
        <h2 id="t-nota" className="mb-2 text-lg font-semibold">
          Anotar
        </h2>
        <FormNota contatoId={c.id} />
      </section>
      <section aria-labelledby="t-linha">
        <h2 id="t-linha" className="mb-3 text-lg font-semibold">
          Linha do tempo
        </h2>
        <LinhaDoTempo eventos={eventos} etapas={etapas} fuso={config.fusoHorario} />
      </section>
    </div>
  );
}
