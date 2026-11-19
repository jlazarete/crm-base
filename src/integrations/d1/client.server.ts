// Acesso ao binding D1 ("DB", declarado em wrangler.jsonc). Em produção e no simulador do
// Cloudflare, o runtime (via Nitro) grava o `env` do Worker em `globalThis.__env__` a cada
// requisição. No `vite dev` esse env não existe; só ali usamos o proxy do wrangler, que lê o
// mesmo banco local criado por `bun run db:migrar:local`.
export interface ResultadoD1 {
  success: boolean;
  meta: { changes: number };
}

export interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  run: () => Promise<ResultadoD1>;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<{ results: T[]; success: boolean }>;
}

export interface D1Database {
  prepare: (sql: string) => D1PreparedStatement;
  batch: (statements: D1PreparedStatement[]) => Promise<ResultadoD1[]>;
}

let bancoDeDesenvolvimento: Promise<D1Database> | undefined;

async function abrirBancoDeDesenvolvimento(): Promise<D1Database> {
  const { getPlatformProxy } = await import("wrangler");
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: "wrangler.jsonc",
    persist: true,
  });
  return proxy.env.DB;
}

export async function obterBanco(): Promise<D1Database> {
  const env = (globalThis as { __env__?: Record<string, unknown> }).__env__;
  const db = env?.["DB"];
  if (db) return db as D1Database;
  if (import.meta.env.DEV) {
    bancoDeDesenvolvimento ??= abrirBancoDeDesenvolvimento();
    return bancoDeDesenvolvimento;
  }
  throw new Error('Binding D1 "DB" indisponível.');
}
