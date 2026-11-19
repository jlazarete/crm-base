import { describe, expect, test } from "bun:test";
import {
  contatoSchema,
  filtroContatosSchema,
  mudarEtapaSchema,
  proximaAcaoSchema,
} from "../src/lib/crm/esquemas";
import { formatarTelefone, normalizarTelefone } from "../src/lib/crm/telefone";
import { escaparLike, normalizarBusca } from "../src/lib/crm/texto";
import { dataLocal, diasEntre } from "../src/lib/crm/datas";
import { linkWhatsApp } from "../src/lib/crm/whatsapp";

const base = { nome: "Maria Exemplo", origemId: "outra" };

describe("normalização", () => {
  test("telefone", () => {
    expect(normalizarTelefone("(11) 90000-0001")).toBe("5511900000001");
    expect(normalizarTelefone("+55 11 90000-0001")).toBe("5511900000001");
    expect(normalizarTelefone("123")).toBeNull();
    expect(normalizarTelefone("")).toBeNull();
    expect(formatarTelefone("5511900000001")).toBe("+55 (11) 90000-0001");
    expect(formatarTelefone("551130000001")).toBe("+55 (11) 3000-0001");
    expect(formatarTelefone("14155550100")).toBe("+14155550100");
  });
  test("busca sem acento e com curingas tratados como texto", () => {
    expect(normalizarBusca("  JOSÉ  ")).toBe("jose");
    expect(escaparLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });
  test("data local respeita o fuso", () => {
    expect(dataLocal(new Date("2026-03-10T02:30:00Z"), "America/Sao_Paulo")).toBe("2026-03-09");
    expect(diasEntre("2026-03-07", "2026-03-10")).toBe(3);
  });
  test("link do WhatsApp", () => {
    expect(linkWhatsApp("5511900000001", "Olá, {primeiro_nome}! Tudo bem?", "Ana Maria")).toBe(
      "https://wa.me/5511900000001?text=Ol%C3%A1%2C%20Ana!%20Tudo%20bem%3F",
    );
    expect(linkWhatsApp(null, "x", "Ana")).toBeNull();
  });
});

describe("esquemas", () => {
  test("e-mail vira minúsculo, vazio vira null", () => {
    const r = contatoSchema.parse({ ...base, email: " Maria@Exemplo.INVALID ", telefone: "" });
    expect(r.email).toBe("maria@exemplo.invalid");
    expect(r.telefone).toBeNull();
  });
  test("exige e-mail ou telefone", () => {
    expect(contatoSchema.safeParse({ ...base }).success).toBe(false);
    expect(contatoSchema.safeParse({ ...base, telefone: "(11) 90000-0001" }).success).toBe(true);
  });
  test("data e texto da próxima ação vêm juntos", () => {
    const e = { ...base, email: "a@b.co" };
    expect(contatoSchema.safeParse({ ...e, proximaAcaoEm: "2026-03-10" }).success).toBe(false);
    expect(contatoSchema.safeParse({ ...e, proximaAcaoTexto: "Ligar" }).success).toBe(false);
    expect(
      contatoSchema.safeParse({ ...e, proximaAcaoEm: "2026-03-10", proximaAcaoTexto: "Ligar" })
        .success,
    ).toBe(true);
  });
  test("data inexistente e telefone curto são recusados", () => {
    expect(
      proximaAcaoSchema.safeParse({
        contatoId: crypto.randomUUID(),
        data: "2026-02-30",
        texto: "x",
      }).success,
    ).toBe(false);
    expect(contatoSchema.safeParse({ ...base, telefone: "12345" }).success).toBe(false);
    expect(contatoSchema.safeParse({ ...base, email: "sem-arroba" }).success).toBe(false);
  });
  test("código de etapa com injeção é recusado", () => {
    const r = mudarEtapaSchema.safeParse({
      contatoId: crypto.randomUUID(),
      etapaDe: "novo' OR 1=1",
      etapaPara: "novo",
    });
    expect(r.success).toBe(false);
  });
  test("limites de tamanho", () => {
    expect(
      contatoSchema.safeParse({ ...base, email: "a@b.co", nome: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      contatoSchema.safeParse({ ...base, email: "a@b.co", notaInicial: "x".repeat(2001) }).success,
    ).toBe(false);
  });
  test("filtro da URL: página padrão 1 e limites", () => {
    expect(filtroContatosSchema.parse({}).pagina).toBe(1);
    expect(filtroContatosSchema.safeParse({ pagina: "0" }).success).toBe(false);
    expect(filtroContatosSchema.parse({ busca: "  ana " }).busca).toBe("ana");
  });
});
