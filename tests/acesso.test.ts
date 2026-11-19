import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { limparCacheDeChaves, verificarAcesso, type Jwks } from "../src/lib/acesso";

const TIME = "meutime";
const AUD = "aud-do-app";
const EMAIL = "jose@exemplo.com";
const AGORA = 1_800_000_000_000;
const ENV = { CF_ACCESS_TEAM: TIME, CF_ACCESS_AUD: AUD, CRM_EMAIL_PERMITIDO: EMAIL };

let par: CryptoKeyPair;
let outro: CryptoKeyPair;
let jwks: Jwks;

const b64 = (dados: Uint8Array | string) =>
  Buffer.from(typeof dados === "string" ? dados : dados)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function gerar() {
  return crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
}

async function token(
  corpo: Record<string, unknown> = {},
  opcoes: { chave?: CryptoKey; alg?: string; kid?: string } = {},
) {
  const h = b64(JSON.stringify({ alg: opcoes.alg ?? "RS256", kid: opcoes.kid ?? "k1" }));
  const p = b64(
    JSON.stringify({
      iss: `https://${TIME}.cloudflareaccess.com`,
      aud: [AUD],
      exp: AGORA / 1000 + 600,
      email: EMAIL,
      ...corpo,
    }),
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      opcoes.chave ?? par.privateKey,
      new TextEncoder().encode(`${h}.${p}`),
    ),
  );
  return `${h}.${p}.${b64(assinatura)}`;
}

const req = (t?: string) =>
  new Request("https://crm.exemplo.com/", {
    headers: t === undefined ? {} : { "cf-access-jwt-assertion": t },
  });
const deps = (env: Record<string, string | undefined> = ENV) => ({ env, jwks, now: () => AGORA });

beforeAll(async () => {
  par = await gerar();
  outro = await gerar();
  jwks = { keys: [{ ...(await crypto.subtle.exportKey("jwk", par.publicKey)), kid: "k1" }] };
});
beforeEach(() => limparCacheDeChaves());

describe("acesso via Cloudflare Access", () => {
  test("token válido do e-mail permitido entra", async () => {
    const r = await verificarAcesso(req(await token()), deps());
    expect(r).toEqual({ ok: true, email: EMAIL });
  });
  test("e-mail com maiúsculas e espaços no segredo ainda confere", async () => {
    const r = await verificarAcesso(
      req(await token()),
      deps({ ...ENV, CRM_EMAIL_PERMITIDO: " JOSE@Exemplo.com " }),
    );
    expect(r.ok).toBe(true);
  });
  test("sem cabeçalho, recusa", async () => {
    expect(await verificarAcesso(req(), deps())).toEqual({ ok: false, motivo: "sem-token" });
  });
  test("sem configuração, recusa tudo (falha fechada)", async () => {
    const t = await token();
    for (const falta of ["CF_ACCESS_TEAM", "CF_ACCESS_AUD", "CRM_EMAIL_PERMITIDO"]) {
      const r = await verificarAcesso(req(t), deps({ ...ENV, [falta]: undefined }));
      expect(r).toEqual({ ok: false, motivo: "acesso-nao-configurado" });
    }
  });
  test("e-mail diferente, audiência errada, emissor errado e token vencido são recusados", async () => {
    expect((await verificarAcesso(req(await token({ email: "outro@x.com" })), deps())).ok).toBe(
      false,
    );
    expect((await verificarAcesso(req(await token({ aud: ["outra"] })), deps())).ok).toBe(false);
    expect(
      (await verificarAcesso(req(await token({ iss: "https://x.cloudflareaccess.com" })), deps()))
        .ok,
    ).toBe(false);
    expect((await verificarAcesso(req(await token({ exp: AGORA / 1000 - 1 })), deps())).ok).toBe(
      false,
    );
  });
  test("assinatura de outra chave é recusada", async () => {
    const r = await verificarAcesso(req(await token({}, { chave: outro.privateKey })), deps());
    expect(r).toEqual({ ok: false, motivo: "assinatura" });
  });
  test("corpo adulterado depois de assinado é recusado", async () => {
    const [h, , s] = (await token()).split(".") as [string, string, string];
    const falso = b64(
      JSON.stringify({
        iss: `https://${TIME}.cloudflareaccess.com`,
        aud: [AUD],
        exp: AGORA / 1000 + 600,
        email: "x@x.com",
      }),
    );
    expect((await verificarAcesso(req(`${h}.${falso}.${s}`), deps())).ok).toBe(false);
  });
  test("algoritmo none ou HS256 e chave desconhecida são recusados", async () => {
    expect((await verificarAcesso(req(await token({}, { alg: "none" })), deps())).ok).toBe(false);
    expect((await verificarAcesso(req(await token({}, { alg: "HS256" })), deps())).ok).toBe(false);
    expect(await verificarAcesso(req(await token({}, { kid: "zzz" })), deps())).toEqual({
      ok: false,
      motivo: "chave-desconhecida",
    });
  });
  test("lixo no cabeçalho não derruba, só recusa", async () => {
    for (const lixo of ["abc", "a.b.c", "....", "x".repeat(5000)]) {
      expect((await verificarAcesso(req(lixo), deps())).ok).toBe(false);
    }
  });
  test("nome de time com caracteres perigosos é recusado antes de qualquer busca", async () => {
    let chamou = false;
    const fetchImpl = (async () => {
      chamou = true;
      return new Response("{}");
    }) as unknown as typeof fetch;
    const r = await verificarAcesso(req(await token()), {
      env: { ...ENV, CF_ACCESS_TEAM: "evil.com/x" },
      fetchImpl,
      now: () => AGORA,
    });
    expect(r.ok).toBe(false);
    expect(chamou).toBe(false);
  });
  test("busca as chaves do Access quando não recebe, e reaproveita o cache", async () => {
    let chamadas = 0;
    const fetchImpl = (async (url: string) => {
      chamadas++;
      expect(url).toBe(`https://${TIME}.cloudflareaccess.com/cdn-cgi/access/certs`);
      return new Response(JSON.stringify(jwks));
    }) as unknown as typeof fetch;
    const d = { env: ENV, fetchImpl, now: () => AGORA };
    expect((await verificarAcesso(req(await token()), d)).ok).toBe(true);
    expect((await verificarAcesso(req(await token()), d)).ok).toBe(true);
    expect(chamadas).toBe(1);
  });
});
