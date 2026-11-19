import { describe, expect, test } from "bun:test";
import { isCsrfRequestAllowed } from "@tanstack/start-client-core";
import { opcoesCsrf } from "../src/lib/csrf";

const pedido = (cabecalhos: Record<string, string>, tipo = "serverFn") =>
  isCsrfRequestAllowed(opcoesCsrf, {
    request: new Request("https://crm.exemplo.com/_serverFn/x", {
      method: "POST",
      headers: cabecalhos,
    }),
    handlerType: tipo,
  } as never);

describe("CSRF nas funções de servidor", () => {
  test("mesma origem passa", async () => {
    expect(await pedido({ "sec-fetch-site": "same-origin" })).toBe(true);
  });
  test("outro site e mesmo site em outro subdomínio são barrados", async () => {
    expect(await pedido({ "sec-fetch-site": "cross-site" })).toBe(false);
    expect(await pedido({ "sec-fetch-site": "same-site" })).toBe(false);
  });
  test("Origin de outro site, sem Sec-Fetch-Site, é barrado", async () => {
    expect(await pedido({ origin: "https://evil.example" })).toBe(false);
  });
  test("sem nenhum cabeçalho de origem, é barrado", async () => {
    expect(await pedido({})).toBe(false);
  });
  test("a resposta de falha é 403 e não fica em cache", async () => {
    const r = await (opcoesCsrf.failureResponse as () => Response)();
    expect(r.status).toBe(403);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
