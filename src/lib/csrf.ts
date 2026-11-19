import type { CsrfMiddlewareOptions } from "@tanstack/start-client-core";

// Só as funções de servidor passam pela conferência de origem (Sec-Fetch-Site, Origin, Referer).
// O TanStack Start instala isso sozinho apenas quando NÃO existe src/start.ts; como aqui existe,
// o middleware é declarado de forma explícita.
export const opcoesCsrf: CsrfMiddlewareOptions = {
  filter: (ctx) => ctx.handlerType === "serverFn",
  failureResponse: () =>
    new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } }),
};
