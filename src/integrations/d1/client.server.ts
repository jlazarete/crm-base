// Acesso ao binding D1 ("DB", ver vite.config.ts) do Worker em produção.
// O runtime do Cloudflare (via Nitro, build e `wrangler dev`) grava o `env`
// do Worker em `globalThis.__env__` a cada requisição -- não há outra forma
// de alcançar bindings de objeto (D1, KV, R2...) fora do contexto de request,
// diferente de secrets/vars de texto, que aparecem em `process.env`.
export interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  run: () => Promise<{ success: boolean }>;
  first: <T = unknown>() => Promise<T | null>;
}

export interface D1Database {
  prepare: (sql: string) => D1PreparedStatement;
}

export function getDb(): D1Database {
  const env = (globalThis as { __env__?: Record<string, unknown> }).__env__;
  const db = env?.["DB"];
  if (!db) {
    throw new Error(
      'Binding D1 "DB" indisponível. Em dev local (`bun run dev`) ele não existe -- teste com `bun run build && bun run preview` ou um deploy de preview.',
    );
  }
  return db as D1Database;
}
