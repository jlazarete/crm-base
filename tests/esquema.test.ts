import { describe, expect, test } from "bun:test";
import { criarBancoDeTeste } from "./apoio/d1-sqlite";

const T = "2026-03-10T12:00:00.000Z";
const ID1 = "11111111-1111-1111-1111-111111111111";
const ID2 = "22222222-2222-2222-2222-222222222222";

function contato(
  sqlite: ReturnType<typeof criarBancoDeTeste>["sqlite"],
  campos: Record<string, unknown> = {},
) {
  const base = {
    id: ID1,
    nome: "Contato Exemplo",
    email: "exemplo@exemplo.invalid",
    telefone: null,
    empresa: null,
    segmento: null,
    origem_inicial: "outra",
    etapa_id: "novo",
    valor_estimado_centavos: null,
    proxima_acao_em: null,
    proxima_acao_texto: null,
    texto_busca: "contato exemplo",
    criado_em: T,
    atualizado_em: T,
    ultima_atividade_em: T,
    ...campos,
  };
  const cols = Object.keys(base);
  sqlite
    .query(`INSERT INTO contatos (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
    .run(...(Object.values(base) as never[]));
}

describe("dados iniciais", () => {
  test("sete etapas na ordem combinada, seis origens e as configurações", () => {
    const { sqlite } = criarBancoDeTeste();
    const etapas = sqlite.query("SELECT id, tipo FROM etapas ORDER BY ordem").all() as {
      id: string;
      tipo: string;
    }[];
    expect(etapas.map((e) => e.id)).toEqual([
      "novo",
      "contato-feito",
      "diagnostico-agendado",
      "diagnostico-feito",
      "proposta-enviada",
      "ganho",
      "perdido",
    ]);
    expect(etapas.find((e) => e.id === "ganho")?.tipo).toBe("ganha");
    expect(etapas.find((e) => e.id === "perdido")?.tipo).toBe("perdida");
    expect((sqlite.query("SELECT COUNT(*) AS n FROM origens").get() as { n: number }).n).toBe(6);
    const cfg = sqlite.query("SELECT chave FROM configuracoes").all() as { chave: string }[];
    expect(cfg.map((c) => c.chave)).toContain("fuso_horario");
  });
});

describe("restrições do esquema", () => {
  test("contato válido entra", () => {
    const { sqlite } = criarBancoDeTeste();
    expect(() => contato(sqlite)).not.toThrow();
  });
  test.each([
    ["e-mail com maiúscula", { email: "Exemplo@Exemplo.invalid" }],
    ["telefone com letra", { email: null, telefone: "55abc00000001" }],
    ["sem e-mail nem telefone", { email: null, telefone: null }],
    ["ação sem texto", { proxima_acao_em: "2026-03-10", proxima_acao_texto: null }],
    ["data inexistente", { proxima_acao_em: "2026-02-30", proxima_acao_texto: "x" }],
    ["origem inexistente", { origem_inicial: "nao-existe" }],
    ["etapa inexistente", { etapa_id: "nao-existe" }],
  ])("recusa %s", (_nome, campos) => {
    const { sqlite } = criarBancoDeTeste();
    expect(() => contato(sqlite, campos)).toThrow();
  });
  test("e-mail e telefone são únicos", () => {
    const { sqlite } = criarBancoDeTeste();
    contato(sqlite, { telefone: "5500900000001" });
    expect(() => contato(sqlite, { id: ID2 })).toThrow(/UNIQUE/);
    expect(() =>
      contato(sqlite, { id: ID2, email: "outro@exemplo.invalid", telefone: "5500900000001" }),
    ).toThrow(/UNIQUE/);
  });
  test("eventos: tipo inválido, etapa_alterada incompleta ou sem mudança e nota vazia são recusados", () => {
    const { sqlite } = criarBancoDeTeste();
    contato(sqlite);
    const ev = (tipo: string, extra: Record<string, unknown> = {}) => {
      const c = {
        id: ID2,
        contato_id: ID1,
        tipo,
        detalhe: null,
        etapa_de: null,
        etapa_para: null,
        ocorrido_em: T,
        registrado_em: T,
        ...extra,
      };
      const cols = Object.keys(c);
      sqlite
        .query(`INSERT INTO eventos (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
        .run(...(Object.values(c) as never[]));
    };
    expect(() => ev("inventado")).toThrow();
    expect(() => ev("etapa_alterada")).toThrow();
    expect(() => ev("etapa_alterada", { etapa_de: "novo", etapa_para: "novo" })).toThrow();
    expect(() => ev("nota")).toThrow();
    expect(() =>
      ev("etapa_alterada", { etapa_de: "novo", etapa_para: "contato-feito" }),
    ).not.toThrow();
  });
});
