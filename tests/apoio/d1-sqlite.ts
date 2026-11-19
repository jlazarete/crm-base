// Dublê de D1 para testes: usa bun:sqlite em memória e aplica os MESMOS arquivos de
// migrations/ da produção. Imita as regras do D1 que importam: chaves estrangeiras ligadas,
// recusa de parâmetro `undefined` e batch atômico (tudo ou nada).
import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  D1Database,
  D1PreparedStatement,
  ResultadoD1,
} from "../../src/integrations/d1/client.server";

const PASTA = join(import.meta.dir, "..", "..", "migrations");

class Comando implements D1PreparedStatement {
  valores: unknown[] = [];
  constructor(
    private sqlite: Database,
    readonly sql: string,
  ) {}
  bind(...values: unknown[]) {
    if (values.some((v) => v === undefined)) throw new Error("D1: parâmetro undefined");
    this.valores = values;
    return this;
  }
  executar(): ResultadoD1 {
    const r = this.sqlite.query(this.sql).run(...(this.valores as never[]));
    return { success: true, meta: { changes: r.changes } };
  }
  async run() {
    return this.executar();
  }
  async first<T>() {
    return (this.sqlite.query(this.sql).get(...(this.valores as never[])) as T | null) ?? null;
  }
  async all<T>() {
    return {
      results: this.sqlite.query(this.sql).all(...(this.valores as never[])) as T[],
      success: true,
    };
  }
}

export function criarBancoDeTeste(): { db: D1Database; sqlite: Database } {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const arquivo of readdirSync(PASTA)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync(join(PASTA, arquivo), "utf8"));
  }
  const db: D1Database = {
    prepare: (sql) => new Comando(sqlite, sql),
    batch: async (statements) => {
      const transacao = sqlite.transaction(() => statements.map((s) => (s as Comando).executar()));
      return transacao();
    },
  };
  return { db, sqlite };
}
