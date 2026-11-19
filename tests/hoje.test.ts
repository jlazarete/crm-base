import { describe, expect, test } from "bun:test";
import {
  adicionarNota,
  criarContato,
  definirProximaAcao,
  mudarEtapa,
  obterHoje,
} from "../src/lib/crm/repositorio.server";
import { criarContexto, novoContatoBase } from "./apoio/contexto";

let seq = 0;
const novo = (c: ReturnType<typeof criarContexto>, nome: string) => {
  seq++;
  return criarContato(c.ctx, {
    ...novoContatoBase,
    nome,
    email: `c${seq}@exemplo.invalid`,
    telefone: `55009000000${String(seq).padStart(2, "0")}`,
  });
};

describe("tela Hoje", () => {
  test("o dia vale no fuso de São Paulo (02:30 UTC ainda é o dia anterior)", async () => {
    const c = criarContexto("2026-03-10T02:30:00.000Z");
    expect((await obterHoje(c.ctx)).hoje).toBe("2026-03-09");
  });
  test("ações vencidas e do dia entram; futuras ficam fora", async () => {
    const c = criarContexto("2026-03-10T15:00:00.000Z");
    const ids: string[] = [];
    for (const nome of ["Vencida", "Hoje", "Futura"]) {
      const r = await novo(c, nome);
      if (r.ok) ids.push(r.dados.id);
    }
    await definirProximaAcao(c.ctx, { contatoId: ids[0]!, data: "2026-03-08", texto: "a" });
    await definirProximaAcao(c.ctx, { contatoId: ids[1]!, data: "2026-03-10", texto: "b" });
    await definirProximaAcao(c.ctx, { contatoId: ids[2]!, data: "2026-03-11", texto: "c" });
    const h = await obterHoje(c.ctx);
    expect(h.acoes.map((a) => a.nome)).toEqual(["Vencida", "Hoje"]);
    expect(h.semResposta.map((a) => a.nome)).toEqual(["Futura"]);
  });
  test("novo só com nota continua sem resposta", async () => {
    const c = criarContexto();
    const r = await novo(c, "Com Nota");
    if (!r.ok) throw new Error("falhou");
    await adicionarNota(c.ctx, { contatoId: r.dados.id, texto: "anotei" });
    expect((await obterHoje(c.ctx)).semResposta.map((a) => a.nome)).toEqual(["Com Nota"]);
  });
  test("quem saiu de Novo e voltou não aparece mais como sem resposta", async () => {
    const c = criarContexto();
    const r = await novo(c, "Respondido");
    if (!r.ok) throw new Error("falhou");
    c.avancar(1000);
    await mudarEtapa(c.ctx, {
      contatoId: r.dados.id,
      etapaDe: "novo",
      etapaPara: "contato-feito",
      nota: null,
    });
    c.avancar(1000);
    await mudarEtapa(c.ctx, {
      contatoId: r.dados.id,
      etapaDe: "contato-feito",
      etapaPara: "novo",
      nota: null,
    });
    expect((await obterHoje(c.ctx)).semResposta).toHaveLength(0);
  });
  test("novo com ação vencida aparece só em ações", async () => {
    const c = criarContexto();
    const r = await novo(c, "Duplo");
    if (!r.ok) throw new Error("falhou");
    await definirProximaAcao(c.ctx, { contatoId: r.dados.id, data: "2026-03-10", texto: "x" });
    const h = await obterHoje(c.ctx);
    expect(h.acoes.map((a) => a.nome)).toEqual(["Duplo"]);
    expect(h.semResposta).toHaveLength(0);
  });
});
