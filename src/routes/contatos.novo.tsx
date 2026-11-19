import { createFileRoute } from "@tanstack/react-router";
import { CONTATO_VAZIO, FormContato } from "@/components/crm/FormContato";
import { buscarOpcoes } from "@/lib/crm/crm.functions";

export const Route = createFileRoute("/contatos/novo")({
  loader: () => buscarOpcoes(),
  head: () => ({ meta: [{ title: "Novo contato | CRM" }] }),
  component: Novo,
});

function Novo() {
  const r = Route.useLoaderData();
  if (!r.ok)
    return (
      <p role="alert" className="text-red-300">
        {r.mensagem}
      </p>
    );
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Novo contato</h1>
      <FormContato
        inicial={CONTATO_VAZIO}
        etapas={r.dados.etapas}
        origens={r.dados.origens}
        etapaInicial={r.dados.etapaInicial}
      />
    </div>
  );
}
