import { Link, createFileRoute } from "@tanstack/react-router";
import { botao, botaoSecundario, campo, cartao, rotulo } from "@/components/crm/estilos";
import { buscarContatosFn, buscarOpcoes } from "@/lib/crm/crm.functions";
import { formatarData } from "@/lib/crm/datas";
import { filtroContatosSchema } from "@/lib/crm/esquemas";

export const Route = createFileRoute("/contatos/")({
  // Campos vazios do formulário GET (por exemplo "etapa=") valem como "sem filtro".
  // Campos vazios do formulário GET (por exemplo "etapa=") valem como "sem filtro". O resultado
  // só leva as chaves preenchidas: valores nulos virariam "null" na URL.
  validateSearch: (busca: Record<string, unknown>) => {
    const limpa = Object.fromEntries(
      Object.entries(busca).filter(([, v]) => v !== "" && v != null),
    );
    const r = filtroContatosSchema.safeParse(limpa);
    const f = r.success ? r.data : filtroContatosSchema.parse({});
    return {
      ...(f.busca ? { busca: f.busca } : {}),
      ...(f.etapa ? { etapa: f.etapa } : {}),
      ...(f.origem ? { origem: f.origem } : {}),
      ...(f.pagina > 1 ? { pagina: f.pagina } : {}),
    } as { busca?: string; etapa?: string; origem?: string; pagina?: number };
  },
  loaderDeps: ({ search }) => ({
    busca: search.busca ?? null,
    etapa: search.etapa ?? null,
    origem: search.origem ?? null,
    pagina: search.pagina ?? 1,
  }),
  loader: async ({ deps }) => {
    const [lista, opcoes] = await Promise.all([buscarContatosFn({ data: deps }), buscarOpcoes()]);
    return { lista, opcoes };
  },
  head: () => ({ meta: [{ title: "Contatos | CRM" }] }),
  component: Contatos,
});

function Contatos() {
  const { lista, opcoes } = Route.useLoaderData();
  const filtro = Route.useSearch();
  if (!lista.ok || !opcoes.ok)
    return (
      <p role="alert" className="text-red-300">
        Não foi possível carregar os contatos.
      </p>
    );
  const { itens, total, pagina, porPagina } = lista.dados;
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Contatos</h1>
      <form method="get" action="/contatos" className="grid gap-3 sm:grid-cols-4" role="search">
        <div className="sm:col-span-2">
          <label htmlFor="busca" className={rotulo}>
            Buscar
          </label>
          <input
            id="busca"
            name="busca"
            type="search"
            defaultValue={filtro.busca ?? ""}
            className={campo}
            placeholder="Nome, e-mail, telefone, empresa"
          />
        </div>
        <div>
          <label htmlFor="etapa" className={rotulo}>
            Etapa
          </label>
          <select id="etapa" name="etapa" defaultValue={filtro.etapa ?? ""} className={campo}>
            <option value="">Todas</option>
            {opcoes.dados.etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="origem" className={rotulo}>
            Origem
          </label>
          <select id="origem" name="origem" defaultValue={filtro.origem ?? ""} className={campo}>
            <option value="">Todas</option>
            {opcoes.dados.origens.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <button type="submit" className={botao}>
            Filtrar
          </button>
        </div>
      </form>
      <p aria-live="polite" className="text-sm text-slate-400">
        Mostrando {itens.length} de {total}
      </p>
      {itens.length === 0 ? (
        <p className="text-slate-300">Nenhum contato encontrado.</p>
      ) : (
        <ul className="grid gap-3">
          {itens.map((c) => (
            <li key={c.id} className={cartao}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to="/contatos/$id"
                  params={{ id: c.id }}
                  className="text-lg font-medium text-sky-300 underline-offset-2 hover:underline"
                >
                  {c.nome}
                </Link>
                <span className="text-sm text-slate-400">{c.etapaNome}</span>
              </div>
              <p className="text-sm text-slate-300">
                {[c.empresa, c.origemNome].filter(Boolean).join(" · ")}
              </p>
              {c.proximaAcaoEm && (
                <p className="mt-1 text-sm">
                  Próxima ação: {c.proximaAcaoTexto} ({formatarData(c.proximaAcaoEm)})
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Páginas" className="flex flex-wrap gap-3">
        {pagina > 1 && (
          <Link
            to="/contatos"
            search={{ ...filtro, pagina: pagina - 1 }}
            className={botaoSecundario}
          >
            Anterior
          </Link>
        )}
        {pagina < ultima && (
          <Link
            to="/contatos"
            search={{ ...filtro, pagina: pagina + 1 }}
            className={botaoSecundario}
          >
            Próxima
          </Link>
        )}
      </nav>
    </div>
  );
}
