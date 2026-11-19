import { describe, expect, test } from "bun:test";
import {
  adicionarNota,
  apagarContato,
  atualizarContato,
  buscarContatos,
  concluirProximaAcao,
  criarContato,
  definirProximaAcao,
  listarEventos,
  obterContato,
} from "../src/lib/crm/repositorio.server";
import { criarContexto, novoContatoBase } from "./apoio/contexto";

const filtro = { busca: null, etapa: null, origem: null, pagina: 1 };
const contagem = (sqlite: ReturnType<typeof criarContexto>["sqlite"], t: string) =>
  (sqlite.query(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

describe("criar e consultar contatos", () => {
  test("criar gera o evento de criação e a nota inicial", async () => {
    const { ctx } = criarContexto();
    const r = await criarContato(ctx, { ...novoContatoBase, notaInicial: "Pediu retorno" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const eventos = await listarEventos(ctx, r.dados.id);
    expect(eventos.map((e) => e.tipo).sort()).toEqual(["contato_criado", "nota"]);
    const c = await obterContato(ctx, r.dados.id);
    expect(c?.etapaId).toBe("novo");
    expect(c?.etapaNome).toBe("Novo");
  });
  test("próxima ação na criação gera evento", async () => {
    const { ctx } = criarContexto();
    const r = await criarContato(ctx, {
      ...novoContatoBase,
      proximaAcaoEm: "2026-03-12",
      proximaAcaoTexto: "Ligar",
    });
    if (!r.ok) throw new Error("falhou");
    expect(
      (await listarEventos(ctx, r.dados.id)).some((e) => e.tipo === "proxima_acao_alterada"),
    ).toBe(true);
  });
  test("e-mail e telefone duplicados são recusados sem gravar nada", async () => {
    const { ctx, sqlite } = criarContexto();
    await criarContato(ctx, novoContatoBase);
    const antes = contagem(sqlite, "eventos");
    expect(await criarContato(ctx, { ...novoContatoBase, telefone: "5500900000002" })).toEqual({
      ok: false,
      codigo: "email-duplicado",
    });
    expect(await criarContato(ctx, { ...novoContatoBase, email: "outro@exemplo.invalid" })).toEqual(
      { ok: false, codigo: "telefone-duplicado" },
    );
    expect(contagem(sqlite, "contatos")).toBe(1);
    expect(contagem(sqlite, "eventos")).toBe(antes);
  });
  test("origem ou etapa inválida", async () => {
    const { ctx } = criarContexto();
    expect(await criarContato(ctx, { ...novoContatoBase, origemId: "nao-existe" })).toEqual({
      ok: false,
      codigo: "origem-invalida",
    });
    expect(await criarContato(ctx, { ...novoContatoBase, etapaId: "nao-existe" })).toEqual({
      ok: false,
      codigo: "etapa-invalida",
    });
  });
  test("editar atualiza a busca e respeita duplicidade com outro contato", async () => {
    const { ctx } = criarContexto();
    const a = await criarContato(ctx, novoContatoBase);
    const b = await criarContato(ctx, {
      ...novoContatoBase,
      email: "b@exemplo.invalid",
      telefone: "5500900000002",
    });
    if (!a.ok || !b.ok) throw new Error("falhou");
    const dados = {
      id: a.dados.id,
      nome: "Renomeado Silva",
      email: "exemplo@exemplo.invalid",
      telefone: "5500900000001",
      empresa: null,
      segmento: null,
      origemId: "indicacao",
      valorEstimadoCentavos: 150000,
    };
    expect((await atualizarContato(ctx, dados)).ok).toBe(true);
    expect((await buscarContatos(ctx, { ...filtro, busca: "renomeado" })).total).toBe(1);
    expect(await atualizarContato(ctx, { ...dados, email: "b@exemplo.invalid" })).toEqual({
      ok: false,
      codigo: "email-duplicado",
    });
    expect((await obterContato(ctx, a.dados.id))?.valorEstimadoCentavos).toBe(150000);
  });
});

describe("busca e filtros", () => {
  async function popular() {
    const c = criarContexto();
    const mk = (
      nome: string,
      email: string,
      tel: string,
      origemId: string,
      etapaId: string | null = null,
    ) => criarContato(c.ctx, { ...novoContatoBase, nome, email, telefone: tel, origemId, etapaId });
    await mk("José Almeida", "jose@exemplo.invalid", "5511900000001", "indicacao");
    c.avancar(1000);
    await mk(
      "Maria 100% Souza",
      "maria@exemplo.invalid",
      "5511900000002",
      "instagram",
      "contato-feito",
    );
    c.avancar(1000);
    await mk("Pedro Lima", "pedro@exemplo.invalid", "5521900000003", "indicacao", "contato-feito");
    return c;
  }
  test("busca sem acento e telefone com máscara", async () => {
    const { ctx } = await popular();
    expect(
      (await buscarContatos(ctx, { ...filtro, busca: "jose" })).itens.map((i) => i.nome),
    ).toEqual(["José Almeida"]);
    expect(
      (await buscarContatos(ctx, { ...filtro, busca: "(11) 90000-0002" })).itens.map((i) => i.nome),
    ).toEqual(["Maria 100% Souza"]);
  });
  test("% e _ são texto, não curinga", async () => {
    const { ctx } = await popular();
    expect((await buscarContatos(ctx, { ...filtro, busca: "100%" })).total).toBe(1);
    expect((await buscarContatos(ctx, { ...filtro, busca: "%" })).total).toBe(1);
    expect((await buscarContatos(ctx, { ...filtro, busca: "_" })).total).toBe(0);
  });
  test("filtros de etapa e origem combinam", async () => {
    const { ctx } = await popular();
    expect((await buscarContatos(ctx, { ...filtro, etapa: "contato-feito" })).total).toBe(2);
    expect(
      (
        await buscarContatos(ctx, { ...filtro, etapa: "contato-feito", origem: "indicacao" })
      ).itens.map((i) => i.nome),
    ).toEqual(["Pedro Lima"]);
  });
  test("mais recente primeiro e paginação", async () => {
    const { ctx } = await popular();
    const r = await buscarContatos(ctx, filtro);
    expect(r.itens.map((i) => i.nome)[0]).toBe("Pedro Lima");
    expect(r.total).toBe(3);
    const p2 = await buscarContatos(ctx, { ...filtro, pagina: 2 });
    expect(p2.itens).toHaveLength(0);
    expect(p2.total).toBe(3);
  });
});

describe("notas, próxima ação e exclusão", () => {
  test("nota em contato inexistente", async () => {
    const { ctx } = criarContexto();
    expect(
      await adicionarNota(ctx, { contatoId: "00000000-0000-4000-8000-0000000000ff", texto: "x" }),
    ).toEqual({ ok: false, codigo: "nao-encontrado" });
  });
  test("definir e concluir a próxima ação", async () => {
    const { ctx } = criarContexto();
    const r = await criarContato(ctx, novoContatoBase);
    if (!r.ok) throw new Error("falhou");
    const id = r.dados.id;
    expect(await concluirProximaAcao(ctx, { contatoId: id })).toEqual({
      ok: false,
      codigo: "sem-acao",
    });
    expect(
      (await definirProximaAcao(ctx, { contatoId: id, data: "2026-03-12", texto: "Ligar" })).ok,
    ).toBe(true);
    expect((await obterContato(ctx, id))?.proximaAcaoTexto).toBe("Ligar");
    expect((await concluirProximaAcao(ctx, { contatoId: id })).ok).toBe(true);
    expect((await obterContato(ctx, id))?.proximaAcaoEm).toBeNull();
    const detalhes = (await listarEventos(ctx, id)).map((e) => e.detalhe);
    expect(detalhes).toContain("Concluída: Ligar");
  });
  test("definir ação em contato inexistente não grava evento", async () => {
    const { ctx, sqlite } = criarContexto();
    expect(
      await definirProximaAcao(ctx, {
        contatoId: "00000000-0000-4000-8000-0000000000ff",
        data: "2026-03-12",
        texto: "x",
      }),
    ).toEqual({ ok: false, codigo: "nao-encontrado" });
    expect(contagem(sqlite, "eventos")).toBe(0);
  });
  test("apagar leva a linha do tempo junto", async () => {
    const { ctx, sqlite } = criarContexto();
    const r = await criarContato(ctx, { ...novoContatoBase, notaInicial: "x" });
    if (!r.ok) throw new Error("falhou");
    expect((await apagarContato(ctx, r.dados.id)).ok).toBe(true);
    expect(contagem(sqlite, "contatos")).toBe(0);
    expect(contagem(sqlite, "eventos")).toBe(0);
    expect(await apagarContato(ctx, r.dados.id)).toEqual({ ok: false, codigo: "nao-encontrado" });
  });
});
