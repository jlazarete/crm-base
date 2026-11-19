import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { verificarAcesso } from "./lib/acesso";

// CSP com nonce por requisição e cabeçalhos de segurança (mesmo padrão do site).
const cspMiddleware = createMiddleware().server(async ({ next }) => {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
  setResponseHeader("Content-Security-Policy", csp);
  setResponseHeader("X-Content-Type-Options", "nosniff");
  setResponseHeader("X-Frame-Options", "DENY");
  setResponseHeader("Referrer-Policy", "no-referrer");
  setResponseHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  // O CRM é privado: nunca deve aparecer em buscador.
  setResponseHeader("X-Robots-Tag", "noindex, nofollow");
  setResponseHeader("Cache-Control", "no-store");
  return next({ context: { cspNonce: nonce } });
});

// Todas as rotas (páginas, funções de servidor e /api) exigem o token do Cloudflare Access.
// Falha fechada: sem configuração ou com token inválido, 401. Só o servidor de desenvolvimento
// local (vite dev) dispensa o token, e esse caminho não existe no build de produção.
const acessoMiddleware = createMiddleware().server(async ({ request, next }) => {
  if (import.meta.env.DEV) return next();
  const resultado = await verificarAcesso(request, { env: process.env });
  if (!resultado.ok) {
    console.warn("acesso recusado", resultado.motivo);
    return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [cspMiddleware, acessoMiddleware],
}));
