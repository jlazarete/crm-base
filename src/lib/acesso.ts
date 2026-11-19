// Controle de acesso do CRM. O Cloudflare Access fica na frente do app e, depois de
// autenticar José (código por e-mail), envia o cabeçalho "Cf-Access-Jwt-Assertion". Este
// módulo confere esse token por conta própria, para o app não depender só da configuração
// do painel: assinatura (RS256, chaves públicas do Access), emissor, audiência, validade e
// e-mail permitido. Qualquer falha recusa a requisição. Sem configuração, recusa tudo.
//
// Variáveis (Secrets/variáveis do Worker):
//   CF_ACCESS_TEAM       nome do time no Zero Trust (o trecho antes de .cloudflareaccess.com)
//   CF_ACCESS_AUD        "Application Audience (AUD) Tag" do aplicativo no Access
//   CRM_EMAIL_PERMITIDO  o único e-mail que pode entrar

export type Env = Record<string, string | undefined>;
export type Chave = JsonWebKey & { kid?: string };
export type Jwks = { keys: Chave[] };

export interface AcessoDeps {
  env: Env;
  fetchImpl?: typeof fetch;
  now?: () => number;
  jwks?: Jwks;
}

export type Resultado = { ok: true; email: string } | { ok: false; motivo: string };

const NOME_DO_TIME = /^[a-z0-9-]{1,63}$/i;
const VALIDADE_CACHE_MS = 10 * 60 * 1000;
let cache: { time: string; jwks: Jwks; em: number } | null = null;

export function limparCacheDeChaves(): void {
  cache = null;
}

function decodificar(parte: string): Uint8Array<ArrayBuffer> {
  const base64 = parte.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function json<T>(parte: string): T {
  return JSON.parse(new TextDecoder().decode(decodificar(parte))) as T;
}

async function buscarChaves(time: string, deps: AcessoDeps, forcar: boolean): Promise<Jwks> {
  if (deps.jwks) return deps.jwks;
  const agora = (deps.now ?? Date.now)();
  if (!forcar && cache && cache.time === time && agora - cache.em < VALIDADE_CACHE_MS) {
    return cache.jwks;
  }
  const resposta = await (deps.fetchImpl ?? fetch)(
    `https://${time}.cloudflareaccess.com/cdn-cgi/access/certs`,
    { signal: AbortSignal.timeout(4000) },
  );
  if (!resposta.ok) throw new Error(`certs ${resposta.status}`);
  const jwks = (await resposta.json()) as Jwks;
  cache = { time, jwks, em: agora };
  return jwks;
}

export async function verificarAcesso(request: Request, deps: AcessoDeps): Promise<Resultado> {
  try {
    const time = deps.env["CF_ACCESS_TEAM"];
    const aud = deps.env["CF_ACCESS_AUD"];
    const permitido = deps.env["CRM_EMAIL_PERMITIDO"]?.trim().toLowerCase();
    if (!time || !aud || !permitido || !NOME_DO_TIME.test(time)) {
      return { ok: false, motivo: "acesso-nao-configurado" };
    }

    const token = request.headers.get("cf-access-jwt-assertion");
    if (!token) return { ok: false, motivo: "sem-token" };
    const partes = token.split(".");
    if (partes.length !== 3) return { ok: false, motivo: "token-invalido" };
    const [h, p, s] = partes as [string, string, string];

    const cabecalho = json<{ alg?: string; kid?: string }>(h);
    if (cabecalho.alg !== "RS256" || !cabecalho.kid) return { ok: false, motivo: "algoritmo" };

    let chave = (await buscarChaves(time, deps, false)).keys.find((k) => k.kid === cabecalho.kid);
    if (!chave && !deps.jwks) {
      chave = (await buscarChaves(time, deps, true)).keys.find((k) => k.kid === cabecalho.kid);
    }
    if (!chave) return { ok: false, motivo: "chave-desconhecida" };

    const publica = await crypto.subtle.importKey(
      "jwk",
      chave,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const assinaturaOk = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publica,
      decodificar(s),
      new TextEncoder().encode(`${h}.${p}`),
    );
    if (!assinaturaOk) return { ok: false, motivo: "assinatura" };

    const dados = json<{ iss?: string; aud?: string | string[]; exp?: number; email?: string }>(p);
    const agoraS = Math.floor((deps.now ?? Date.now)() / 1000);
    if (dados.iss !== `https://${time}.cloudflareaccess.com`)
      return { ok: false, motivo: "emissor" };
    const audiencias = Array.isArray(dados.aud) ? dados.aud : [dados.aud];
    if (!audiencias.includes(aud)) return { ok: false, motivo: "audiencia" };
    if (typeof dados.exp !== "number" || dados.exp <= agoraS)
      return { ok: false, motivo: "expirado" };
    const email = dados.email?.trim().toLowerCase();
    if (!email || email !== permitido) return { ok: false, motivo: "email" };
    return { ok: true, email };
  } catch {
    return { ok: false, motivo: "erro" };
  }
}
