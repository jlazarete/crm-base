import { createFileRoute, notFound } from "@tanstack/react-router";
import { FormContato } from "@/components/crm/FormContato";
import { buscarContatoFn } from "@/lib/crm/crm.functions";

export const Route = createFileRoute("/contatos/$id/editar")({
  loader: async ({ params }) => {
    const r = await buscarContatoFn({ data: { id: params.id } });
    if (!r.ok && r.codigo === "nao-encontrado") throw notFound();
    return r;
  },
  head: () => ({ meta: [{ title: "Editar contato | CRM" }] }),
  component: Editar,
});

function Editar() {
  const r = Route.useLoaderData();
  if (!r.ok)
    return (
      <p role="alert" className="text-red-300">
        {r.mensagem}
      </p>
    );
  const { contato: c, etapas, origens, config } = r.dados;
  const valor =
    c.valorEstimadoCentavos === null
      ? ""
      : (c.valorEstimadoCentavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Editar {c.nome}</h1>
      <FormContato
        inicial={{
          id: c.id,
          nome: c.nome,
          email: c.email ?? "",
          telefone: c.telefone ?? "",
          empresa: c.empresa ?? "",
          segmento: c.segmento ?? "",
          origemId: c.origemId,
          etapaId: c.etapaId,
          valor,
        }}
        etapas={etapas}
        origens={origens}
        etapaInicial={config.etapaInicial}
      />
    </div>
  );
}
