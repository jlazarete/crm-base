import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BUSCA_VAZIA } from "@/components/crm/estilos";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: () => (
    <Documento>
      <Outlet />
    </Documento>
  ),
  notFoundComponent: () => <p>Página não encontrada.</p>,
});

const link =
  "inline-flex min-h-11 items-center rounded-md px-3 text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400 aria-[current=page]:bg-slate-800 aria-[current=page]:font-semibold";

function Documento({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-20 focus:rounded focus:bg-sky-500 focus:p-2 focus:text-slate-950"
        >
          Pular para o conteúdo
        </a>
        <header className="border-b border-slate-800">
          <nav
            aria-label="Principal"
            className="mx-auto flex max-w-4xl flex-wrap items-center gap-1 px-4 py-2"
          >
            <Link to="/" className={link}>
              Hoje
            </Link>
            <Link to="/contatos" search={BUSCA_VAZIA} className={link}>
              Contatos
            </Link>
            <Link to="/contatos/novo" className={link}>
              Novo contato
            </Link>
          </nav>
        </header>
        <main id="conteudo" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-6">
          {children}
        </main>
        <Scripts />
      </body>
    </html>
  );
}
