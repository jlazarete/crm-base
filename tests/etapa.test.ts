import { describe, expect, test } from "bun:test";
import {
  criarContato,
  listarEventos,
  mudarEtapa,
  obterContato,
} from "../src/lib/crm/repositorio.server";
import { criarContexto, novoContatoBase } from "./apoio/contexto";

async function comContato() {
  const c = criarContexto();
  const r = await criarContato(c.ctx, novoContatoBase);
  if (!r.ok) throw new Error("falhou");
  c.avancar(60_000);
  return { ...c, id: r.dados.id };
}
const n = (sqlite: Awaited<ReturnType<typeof comContato>>["sqlite"], t: string) =>
  (sqlite.query(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

describe("mudança de etapa", () => {
  test("grava a etapa e o evento juntos, com a nota opcional", async () => {
    const { ctx, id } = await comContato();
    const r = await mudarEtapa(ctx, {
      contatoId: id,
      etapaDe: "novo",
      etapaPara: "contato-feito",
      nota: "Falei por telefone",
    });
    expect(r.ok).toBe(true);
    expect((await obterContato(ctx, id))?.etapaId).toBe("contato-feito");
    const ev = await listarEventos(ctx, id);
    const mudanca = ev.find((e) => e.tipo === "etapa_alterada");
    expect(mudanca).toMatchObject({ etapaDe: "novo", etapaPara: "contato-feito" });
    expect(ev.some((e) => e.tipo === "nota" && e.detalhe === "Falei por telefone")).toBe(true);
  });
  test("etapa de origem desatualizada devolve conflito e não grava nada", async () => {
    const { ctx, sqlite, id } = await comContato();
    await mudarEtapa(ctx, {
      contatoId: id,
      etapaDe: "novo",
      etapaPara: "contato-feito",
      nota: null,
    });
    const eventos = n(sqlite, "eventos");
    const r = await mudarEtapa(ctx, {
      contatoId: id,
      etapaDe: "novo",
      etapaPara: "proposta-enviada",
      nota: "x",
    });
    expect(r).toEqual({ ok: false, codigo: "conflito" });
    expect(n(sqlite, "eventos")).toBe(eventos);
    expect((await obterContato(ctx, id))?.etapaId).toBe("contato-feito");
  });
  test("mudar para a mesma etapa", async () => {
    const { ctx, id } = await comContato();
    expect(
      await mudarEtapa(ctx, { contatoId: id, etapaDe: "novo", etapaPara: "novo", nota: null }),
    ).toEqual({ ok: false, codigo: "sem-mudanca" });
  });
  test("etapa inexistente ou inativa", async () => {
    const { ctx, sqlite, id } = await comContato();
    expect(
      await mudarEtapa(ctx, {
        contatoId: id,
        etapaDe: "novo",
        etapaPara: "nao-existe",
        nota: null,
      }),
    ).toEqual({ ok: false, codigo: "etapa-invalida" });
    sqlite.query("UPDATE etapas SET ativa = 0 WHERE id = 'ganho'").run();
    expect(
      await mudarEtapa(ctx, { contatoId: id, etapaDe: "novo", etapaPara: "ganho", nota: null }),
    ).toEqual({ ok: false, codigo: "etapa-invalida" });
  });
  test("contato inexistente", async () => {
    const { ctx } = await comContato();
    expect(
      await mudarEtapa(ctx, {
        contatoId: "00000000-0000-4000-8000-0000000000ff",
        etapaDe: "novo",
        etapaPara: "contato-feito",
        nota: null,
      }),
    ).toEqual({ ok: false, codigo: "nao-encontrado" });
  });
  test("se um comando do batch falha, o anterior é desfeito", async () => {
    const { ctx, sqlite, id } = await comContato();
    const antes = n(sqlite, "eventos");
    await expect(
      ctx.db.batch([
        ctx.db.prepare("UPDATE contatos SET etapa_id = 'ganho' WHERE id = ?").bind(id),
        ctx.db
          .prepare(
            "INSERT INTO eventos (id, contato_id, tipo, ocorrido_em, registrado_em) VALUES (?, ?, 'tipo-invalido', 'a', 'a')",
          )
          .bind("00000000-0000-4000-8000-0000000000aa", id),
      ]),
    ).rejects.toThrow();
    expect((await obterContato(ctx, id))?.etapaId).toBe("novo");
    expect(n(sqlite, "eventos")).toBe(antes);
  });
});
