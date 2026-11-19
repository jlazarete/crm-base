import { createFileRoute } from "@tanstack/react-router";
import { ItemDeHoje } from "@/components/crm/ItemHoje";
import { formatarData } from "@/lib/crm/datas";
import { buscarHoje } from "@/lib/crm/crm.functions";

export const Route = createFileRoute("/")({
  loader: () => buscarHoje(),
  head: () => ({ meta: [{ title: "Hoje | CRM" }] }),
  component: Hoje,
});

function Hoje() {
  const r = Route.useLoaderData();
  if (!r.ok)
    return (
      <p role="alert" className="text-red-300">
        {r.mensagem}
      </p>
    );
  const { hoje, acoes, semResposta, mensagemWhatsapp } = r.dados;
  return (
    <div className="grid gap-8">
      <h1 className="text-2xl font-semibold">Hoje, {formatarData(hoje)}</h1>
      {acoes.length === 0 && semResposta.length === 0 && (
        <p className="text-slate-300">Nada pendente hoje.</p>
      )}
      {acoes.length > 0 && (
        <section aria-labelledby="t-acoes">
          <h2 id="t-acoes" className="mb-3 text-lg font-semibold">
            Ações para hoje ({acoes.length})
          </h2>
          <ul className="grid gap-3">
            {acoes.map((i) => (
              <ItemDeHoje key={i.id} item={i} hoje={hoje} mensagem={mensagemWhatsapp} tipo="acao" />
            ))}
          </ul>
        </section>
      )}
      {semResposta.length > 0 && (
        <section aria-labelledby="t-novos">
          <h2 id="t-novos" className="mb-3 text-lg font-semibold">
            Novos sem resposta ({semResposta.length})
          </h2>
          <ul className="grid gap-3">
            {semResposta.map((i) => (
              <ItemDeHoje
                key={i.id}
                item={i}
                hoje={hoje}
                mensagem={mensagemWhatsapp}
                tipo="semResposta"
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
