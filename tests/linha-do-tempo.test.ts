import { describe, expect, test } from "bun:test";
import { criarBancoDeTeste } from "./apoio/d1-sqlite";

const ID1 = "11111111-1111-1111-1111-111111111111";
const T1 = "2026-03-10T12:00:00.000Z";
const T2 = "2026-03-11T12:00:00.000Z";

function preparar() {
  const { sqlite } = criarBancoDeTeste();
  sqlite
    .query(
      "INSERT INTO contatos (id,nome,email,origem_inicial,etapa_id,texto_busca,criado_em,atualizado_em,ultima_atividade_em) VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .run(ID1, "Contato Exemplo", "exemplo@exemplo.invalid", "outra", "novo", "x", T1, T1, T1);
  sqlite
    .query(
      "INSERT INTO eventos (id,contato_id,tipo,detalhe,ocorrido_em,registrado_em) VALUES (?,?,?,?,?,?)",
    )
    .run("22222222-2222-2222-2222-222222222222", ID1, "nota", "primeira", T1, T2);
  return sqlite;
}

describe("linha do tempo imutável", () => {
  test("UPDATE de evento falha", () => {
    const sqlite = preparar();
    expect(() => sqlite.query("UPDATE eventos SET detalhe = 'x'").run()).toThrow(/imutaveis/);
  });
  test("DELETE avulso de evento falha", () => {
    const sqlite = preparar();
    expect(() => sqlite.query("DELETE FROM eventos").run()).toThrow(/so sai junto/);
  });
  test("apagar o contato leva a linha do tempo junto", () => {
    const sqlite = preparar();
    sqlite.query("DELETE FROM contatos WHERE id = ?").run(ID1);
    expect((sqlite.query("SELECT COUNT(*) AS n FROM eventos").get() as { n: number }).n).toBe(0);
  });
  test("ultima_atividade_em avança a cada evento", () => {
    const sqlite = preparar();
    const linha = sqlite
      .query("SELECT ultima_atividade_em AS u FROM contatos WHERE id = ?")
      .get(ID1) as { u: string };
    expect(linha.u).toBe(T2);
  });
});
