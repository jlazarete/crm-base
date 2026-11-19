import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { validar } from "../src/lib/crm/erros";
import { executar } from "../src/lib/crm/execucao.server";
import { notaSchema } from "../src/lib/crm/esquemas";

afterEach(() => {
  /* espiões são recriados em cada teste */
});

describe("tratamento de erros", () => {
  test("erro inesperado vira erro-interno e o log não carrega dado pessoal", async () => {
    const espiao = spyOn(console, "error").mockImplementation(() => {});
    const r = await executar(
      "teste",
      async () => {
        throw new Error("falha para maria@exemplo.invalid, telefone 5511900000001");
      },
      async () => ({ db: null as never, agora: () => new Date(), novoId: () => "x" }),
    );
    expect(r).toMatchObject({ ok: false, codigo: "erro-interno" });
    const registrado = JSON.stringify(espiao.mock.calls);
    expect(registrado).not.toContain("maria@exemplo.invalid");
    expect(registrado).not.toContain("5511900000001");
    espiao.mockRestore();
  });
  test("resultado de falha vira resposta com mensagem em português", async () => {
    const r = await executar(
      "teste",
      async () => ({ ok: false, codigo: "conflito" }) as const,
      async () => ({ db: null as never, agora: () => new Date(), novoId: () => "x" }),
    );
    expect(r).toEqual({
      ok: false,
      codigo: "conflito",
      mensagem: expect.stringContaining("outra aba"),
    });
  });
  test("validação recusada cita só os nomes dos campos, nunca os valores", () => {
    try {
      validar(notaSchema)({ contatoId: "segredo-que-nao-e-uuid", texto: "" });
      throw new Error("deveria falhar");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("contatoId");
      expect(msg).not.toContain("segredo-que-nao-e-uuid");
    }
  });
});
