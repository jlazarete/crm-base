// Acesso ao banco do CRM. Cada função recebe um contexto (banco, relógio e gerador de ids)
// para ser testada com relógio fixo. Escritas com mais de um comando usam db.batch, que é
// uma transação: ou grava tudo, ou nada.
import type { D1Database, D1PreparedStatement } from "@/integrations/d1/client.server";
import { dataLocal } from "./datas";
import type { DadosContato, FiltroContatos, NovoContato } from "./esquemas";
import { escaparLike, normalizarBusca } from "./texto";
import {
  TIPOS_DE_RESPOSTA,
  type CodigoErro,
  type Configuracoes,
  type ContatoDetalhado,
  type ContatoResumo,
  type Etapa,
  type Evento,
  type ItemHoje,
  type Origem,
  type ResultadoOp,
  type TipoEvento,
} from "./tipos";

export interface ContextoCrm {
  db: D1Database;
  agora: () => Date;
  novoId: () => string;
}

export const POR_PAGINA = 50;
const ok = <T>(dados: T): ResultadoOp<T> => ({ ok: true, dados });
const falha = (codigo: CodigoErro): ResultadoOp<never> => ({ ok: false, codigo });
const iso = (ctx: ContextoCrm) => ctx.agora().toISOString();

// ---------- leitura de apoio ----------

export async function lerConfiguracoes(ctx: ContextoCrm): Promise<Configuracoes> {
  const { results } = await ctx.db
    .prepare("SELECT chave, valor FROM configuracoes")
    .all<{ chave: string; valor: string }>();
  const mapa = new Map(results.map((r) => [r.chave, r.valor]));
  return {
    fusoHorario: mapa.get("fuso_horario") ?? "America/Sao_Paulo",
    etapaInicial: mapa.get("etapa_inicial") ?? "novo",
    retencaoMeses: Number(mapa.get("retencao_meses") ?? 24),
    mensagemWhatsapp: mapa.get("whatsapp_mensagem_padrao") ?? "Olá, {primeiro_nome}!",
  };
}

export async function listarEtapas(
  ctx: ContextoCrm,
  opcoes: { incluirInativas?: boolean } = {},
): Promise<Etapa[]> {
  const { results } = await ctx.db
    .prepare(
      `SELECT id, nome, ordem, tipo, ativa FROM etapas ${opcoes.incluirInativas ? "" : "WHERE ativa = 1"} ORDER BY ordem`,
    )
    .all<{ id: string; nome: string; ordem: number; tipo: Etapa["tipo"]; ativa: number }>();
  return results.map((r) => ({ ...r, ativa: r.ativa === 1 }));
}

export async function listarOrigens(
  ctx: ContextoCrm,
  opcoes: { incluirInativas?: boolean } = {},
): Promise<Origem[]> {
  const { results } = await ctx.db
    .prepare(
      `SELECT id, nome, ordem, ativa FROM origens ${opcoes.incluirInativas ? "" : "WHERE ativa = 1"} ORDER BY ordem, nome`,
    )
    .all<{ id: string; nome: string; ordem: number; ativa: number }>();
  return results.map((r) => ({ ...r, ativa: r.ativa === 1 }));
}

async function existeAtiva(ctx: ContextoCrm, tabela: "etapas" | "origens", id: string) {
  const linha = await ctx.db
    .prepare(`SELECT 1 AS x FROM ${tabela} WHERE id = ? AND ativa = 1`)
    .bind(id)
    .first();
  return linha !== null;
}

function textoDeBusca(d: {
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  segmento: string | null;
}) {
  return normalizarBusca(
    [d.nome, d.email, d.telefone, d.empresa, d.segmento].filter(Boolean).join(" "),
  );
}

// O D1 devolve o texto da restrição violada; traduz para um código nosso.
function codigoDeDuplicado(erro: unknown): CodigoErro | null {
  const texto = erro instanceof Error ? erro.message : "";
  if (!texto.includes("UNIQUE")) return null;
  if (texto.includes("email")) return "email-duplicado";
  if (texto.includes("telefone")) return "telefone-duplicado";
  return null;
}

async function duplicado(
  ctx: ContextoCrm,
  email: string | null,
  telefone: string | null,
  ignorarId: string | null,
): Promise<CodigoErro | null> {
  const ignora = ignorarId ?? "";
  if (email) {
    const l = await ctx.db
      .prepare("SELECT 1 AS x FROM contatos WHERE email = ? AND id <> ?")
      .bind(email, ignora)
      .first();
    if (l) return "email-duplicado";
  }
  if (telefone) {
    const l = await ctx.db
      .prepare("SELECT 1 AS x FROM contatos WHERE telefone = ? AND id <> ?")
      .bind(telefone, ignora)
      .first();
    if (l) return "telefone-duplicado";
  }
  return null;
}

const INSERT_EVENTO = `INSERT INTO eventos (id, contato_id, tipo, origem, detalhe, etapa_de, etapa_para, ocorrido_em, registrado_em)`;

function eventoManual(
  ctx: ContextoCrm,
  contatoId: string,
  tipo: TipoEvento,
  detalhe: string | null,
  agora: string,
  origem = "manual",
): D1PreparedStatement {
  return ctx.db
    .prepare(`${INSERT_EVENTO} VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`)
    .bind(ctx.novoId(), contatoId, tipo, origem, detalhe, agora, agora);
}

// ---------- contatos ----------

export async function criarContato(
  ctx: ContextoCrm,
  d: NovoContato,
): Promise<ResultadoOp<{ id: string }>> {
  const config = await lerConfiguracoes(ctx);
  const etapaId = d.etapaId ?? config.etapaInicial;
  if (!(await existeAtiva(ctx, "etapas", etapaId))) return falha("etapa-invalida");
  if (!(await existeAtiva(ctx, "origens", d.origemId))) return falha("origem-invalida");
  const dup = await duplicado(ctx, d.email, d.telefone, null);
  if (dup) return falha(dup);

  const agora = iso(ctx);
  const id = ctx.novoId();
  const comandos: D1PreparedStatement[] = [
    ctx.db
      .prepare(
        `INSERT INTO contatos (id, nome, email, telefone, empresa, segmento, origem_inicial, etapa_id,
           valor_estimado_centavos, proxima_acao_em, proxima_acao_texto, texto_busca,
           criado_em, atualizado_em, ultima_atividade_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        d.nome,
        d.email,
        d.telefone,
        d.empresa,
        d.segmento,
        d.origemId,
        etapaId,
        d.valorEstimadoCentavos,
        d.proximaAcaoEm,
        d.proximaAcaoTexto,
        textoDeBusca(d),
        agora,
        agora,
        agora,
      ),
    eventoManual(ctx, id, "contato_criado", null, agora, d.origemId),
  ];
  if (d.notaInicial) comandos.push(eventoManual(ctx, id, "nota", d.notaInicial, agora));
  if (d.proximaAcaoEm && d.proximaAcaoTexto) {
    comandos.push(
      eventoManual(
        ctx,
        id,
        "proxima_acao_alterada",
        `${d.proximaAcaoEm}: ${d.proximaAcaoTexto}`,
        agora,
      ),
    );
  }
  try {
    await ctx.db.batch(comandos);
  } catch (erro) {
    const codigo = codigoDeDuplicado(erro);
    if (codigo) return falha(codigo);
    throw erro;
  }
  return ok({ id });
}

export async function atualizarContato(
  ctx: ContextoCrm,
  d: DadosContato,
): Promise<ResultadoOp<null>> {
  const atual = await ctx.db.prepare("SELECT 1 AS x FROM contatos WHERE id = ?").bind(d.id).first();
  if (!atual) return falha("nao-encontrado");
  if (!(await existeAtiva(ctx, "origens", d.origemId))) return falha("origem-invalida");
  const dup = await duplicado(ctx, d.email, d.telefone, d.id);
  if (dup) return falha(dup);
  try {
    const r = await ctx.db
      .prepare(
        `UPDATE contatos SET nome = ?, email = ?, telefone = ?, empresa = ?, segmento = ?, origem_inicial = ?,
           valor_estimado_centavos = ?, texto_busca = ?, atualizado_em = ? WHERE id = ?`,
      )
      .bind(
        d.nome,
        d.email,
        d.telefone,
        d.empresa,
        d.segmento,
        d.origemId,
        d.valorEstimadoCentavos,
        textoDeBusca(d),
        iso(ctx),
        d.id,
      )
      .run();
    if (r.meta.changes === 0) return falha("nao-encontrado");
  } catch (erro) {
    const codigo = codigoDeDuplicado(erro);
    if (codigo) return falha(codigo);
    throw erro;
  }
  return ok(null);
}

interface LinhaContato {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  segmento: string | null;
  etapa_id: string;
  etapa_nome: string;
  origem_inicial: string;
  origem_nome: string;
  valor_estimado_centavos: number | null;
  proxima_acao_em: string | null;
  proxima_acao_texto: string | null;
  criado_em: string;
  atualizado_em: string;
}

const COLUNAS = `c.id, c.nome, c.email, c.telefone, c.empresa, c.segmento, c.etapa_id, e.nome AS etapa_nome,
  c.origem_inicial, o.nome AS origem_nome, c.valor_estimado_centavos, c.proxima_acao_em,
  c.proxima_acao_texto, c.criado_em, c.atualizado_em`;
const JUNCOES = `FROM contatos c JOIN etapas e ON e.id = c.etapa_id JOIN origens o ON o.id = c.origem_inicial`;

function resumo(l: LinhaContato): ContatoResumo {
  return {
    id: l.id,
    nome: l.nome,
    email: l.email,
    telefone: l.telefone,
    empresa: l.empresa,
    etapaId: l.etapa_id,
    etapaNome: l.etapa_nome,
    origemId: l.origem_inicial,
    origemNome: l.origem_nome,
    proximaAcaoEm: l.proxima_acao_em,
    proximaAcaoTexto: l.proxima_acao_texto,
    atualizadoEm: l.atualizado_em,
  };
}

export async function obterContato(ctx: ContextoCrm, id: string): Promise<ContatoDetalhado | null> {
  const l = await ctx.db
    .prepare(`SELECT ${COLUNAS} ${JUNCOES} WHERE c.id = ?`)
    .bind(id)
    .first<LinhaContato>();
  if (!l) return null;
  return {
    ...resumo(l),
    segmento: l.segmento,
    valorEstimadoCentavos: l.valor_estimado_centavos,
    criadoEm: l.criado_em,
  };
}

export async function listarEventos(
  ctx: ContextoCrm,
  contatoId: string,
  opcoes: { limite?: number } = {},
): Promise<Evento[]> {
  const { results } = await ctx.db
    .prepare(
      `SELECT id, tipo, origem, detalhe, etapa_de, etapa_para, ocorrido_em FROM eventos
       WHERE contato_id = ? ORDER BY ocorrido_em DESC, registrado_em DESC, id DESC LIMIT ?`,
    )
    .bind(contatoId, opcoes.limite ?? 200)
    .all<{
      id: string;
      tipo: TipoEvento;
      origem: string | null;
      detalhe: string | null;
      etapa_de: string | null;
      etapa_para: string | null;
      ocorrido_em: string;
    }>();
  return results.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    origem: r.origem,
    detalhe: r.detalhe,
    etapaDe: r.etapa_de,
    etapaPara: r.etapa_para,
    ocorridoEm: r.ocorrido_em,
  }));
}

export async function buscarContatos(
  ctx: ContextoCrm,
  f: FiltroContatos,
): Promise<{ itens: ContatoResumo[]; total: number; pagina: number; porPagina: number }> {
  const condicoes: string[] = [];
  const params: unknown[] = [];
  if (f.busca) {
    const termo = normalizarBusca(f.busca);
    const digitos = termo.replace(/\D/g, "");
    const padrao = `%${escaparLike(termo)}%`;
    if (digitos.length >= 3) {
      condicoes.push("(c.texto_busca LIKE ? ESCAPE '\\' OR c.texto_busca LIKE ? ESCAPE '\\')");
      params.push(padrao, `%${digitos}%`);
    } else {
      condicoes.push("c.texto_busca LIKE ? ESCAPE '\\'");
      params.push(padrao);
    }
  }
  if (f.etapa) {
    condicoes.push("c.etapa_id = ?");
    params.push(f.etapa);
  }
  if (f.origem) {
    condicoes.push("c.origem_inicial = ?");
    params.push(f.origem);
  }
  const onde = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";
  const contagem = await ctx.db
    .prepare(`SELECT COUNT(*) AS total ${JUNCOES} ${onde}`)
    .bind(...params)
    .first<{ total: number }>();
  const { results } = await ctx.db
    .prepare(
      `SELECT ${COLUNAS} ${JUNCOES} ${onde} ORDER BY c.atualizado_em DESC, c.id LIMIT ? OFFSET ?`,
    )
    .bind(...params, POR_PAGINA, (f.pagina - 1) * POR_PAGINA)
    .all<LinhaContato>();
  return {
    itens: results.map(resumo),
    total: contagem?.total ?? 0,
    pagina: f.pagina,
    porPagina: POR_PAGINA,
  };
}

// ---------- linha do tempo e funil ----------

export async function adicionarNota(
  ctx: ContextoCrm,
  d: { contatoId: string; texto: string },
): Promise<ResultadoOp<null>> {
  const agora = iso(ctx);
  const r = await ctx.db
    .prepare(
      `${INSERT_EVENTO} SELECT ?, ?, 'nota', 'manual', ?, NULL, NULL, ?, ?
       WHERE EXISTS (SELECT 1 FROM contatos WHERE id = ?)`,
    )
    .bind(ctx.novoId(), d.contatoId, d.texto, agora, agora, d.contatoId)
    .run();
  return r.meta.changes === 0 ? falha("nao-encontrado") : ok(null);
}

export async function mudarEtapa(
  ctx: ContextoCrm,
  d: { contatoId: string; etapaDe: string; etapaPara: string; nota: string | null },
): Promise<ResultadoOp<null>> {
  const atual = await ctx.db
    .prepare("SELECT etapa_id FROM contatos WHERE id = ?")
    .bind(d.contatoId)
    .first<{ etapa_id: string }>();
  if (!atual) return falha("nao-encontrado");
  if (d.etapaDe === d.etapaPara) return falha("sem-mudanca");
  if (atual.etapa_id !== d.etapaDe) return falha("conflito");
  if (!(await existeAtiva(ctx, "etapas", d.etapaPara))) return falha("etapa-invalida");

  const agora = iso(ctx);
  const comandos: D1PreparedStatement[] = [
    // 1) o evento só entra se o contato ainda estiver na etapa que a tela mostrou
    ctx.db
      .prepare(
        `${INSERT_EVENTO} SELECT ?, ?, 'etapa_alterada', 'manual', NULL, ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM contatos WHERE id = ? AND etapa_id = ?)`,
      )
      .bind(
        ctx.novoId(),
        d.contatoId,
        d.etapaDe,
        d.etapaPara,
        agora,
        agora,
        d.contatoId,
        d.etapaDe,
      ),
    // 2) a troca, com a mesma condição
    ctx.db
      .prepare("UPDATE contatos SET etapa_id = ?, atualizado_em = ? WHERE id = ? AND etapa_id = ?")
      .bind(d.etapaPara, agora, d.contatoId, d.etapaDe),
  ];
  if (d.nota) {
    comandos.push(
      ctx.db
        .prepare(
          `${INSERT_EVENTO} SELECT ?, ?, 'nota', 'manual', ?, NULL, NULL, ?, ?
           WHERE EXISTS (SELECT 1 FROM contatos WHERE id = ? AND etapa_id = ?)`,
        )
        .bind(ctx.novoId(), d.contatoId, d.nota, agora, agora, d.contatoId, d.etapaPara),
    );
  }
  const resultados = await ctx.db.batch(comandos);
  return resultados[1]?.meta.changes === 0 ? falha("conflito") : ok(null);
}

export async function definirProximaAcao(
  ctx: ContextoCrm,
  d: { contatoId: string; data: string; texto: string },
): Promise<ResultadoOp<null>> {
  const agora = iso(ctx);
  const resultados = await ctx.db.batch([
    ctx.db
      .prepare(
        "UPDATE contatos SET proxima_acao_em = ?, proxima_acao_texto = ?, atualizado_em = ? WHERE id = ?",
      )
      .bind(d.data, d.texto, agora, d.contatoId),
    ctx.db
      .prepare(
        `${INSERT_EVENTO} SELECT ?, ?, 'proxima_acao_alterada', 'manual', ?, NULL, NULL, ?, ?
         WHERE EXISTS (SELECT 1 FROM contatos WHERE id = ?)`,
      )
      .bind(ctx.novoId(), d.contatoId, `${d.data}: ${d.texto}`, agora, agora, d.contatoId),
  ]);
  return resultados[0]?.meta.changes === 0 ? falha("nao-encontrado") : ok(null);
}

export async function concluirProximaAcao(
  ctx: ContextoCrm,
  d: { contatoId: string },
): Promise<ResultadoOp<null>> {
  const atual = await ctx.db
    .prepare("SELECT proxima_acao_texto AS texto FROM contatos WHERE id = ?")
    .bind(d.contatoId)
    .first<{ texto: string | null }>();
  if (!atual) return falha("nao-encontrado");
  if (!atual.texto) return falha("sem-acao");
  const agora = iso(ctx);
  const resultados = await ctx.db.batch([
    ctx.db
      .prepare(
        `${INSERT_EVENTO} SELECT ?, ?, 'proxima_acao_alterada', 'manual', ?, NULL, NULL, ?, ?
         WHERE EXISTS (SELECT 1 FROM contatos WHERE id = ? AND proxima_acao_em IS NOT NULL)`,
      )
      .bind(ctx.novoId(), d.contatoId, `Concluída: ${atual.texto}`, agora, agora, d.contatoId),
    ctx.db
      .prepare(
        `UPDATE contatos SET proxima_acao_em = NULL, proxima_acao_texto = NULL, atualizado_em = ?
         WHERE id = ? AND proxima_acao_em IS NOT NULL`,
      )
      .bind(agora, d.contatoId),
  ]);
  return resultados[1]?.meta.changes === 0 ? falha("sem-acao") : ok(null);
}

export async function apagarContato(ctx: ContextoCrm, id: string): Promise<ResultadoOp<null>> {
  // Os eventos saem junto, por ON DELETE CASCADE.
  const r = await ctx.db.prepare("DELETE FROM contatos WHERE id = ?").bind(id).run();
  return r.meta.changes === 0 ? falha("nao-encontrado") : ok(null);
}

// ---------- tela Hoje ----------

interface LinhaHoje {
  id: string;
  nome: string;
  telefone: string | null;
  empresa: string | null;
  proxima_acao_em: string | null;
  proxima_acao_texto: string | null;
  criado_em: string;
  etapa_nome: string;
}

function itemHoje(l: LinhaHoje): ItemHoje {
  return {
    id: l.id,
    nome: l.nome,
    telefone: l.telefone,
    empresa: l.empresa,
    etapaNome: l.etapa_nome,
    proximaAcaoEm: l.proxima_acao_em,
    proximaAcaoTexto: l.proxima_acao_texto,
    criadoEm: l.criado_em,
  };
}

export async function obterHoje(
  ctx: ContextoCrm,
): Promise<{ hoje: string; acoes: ItemHoje[]; semResposta: ItemHoje[] }> {
  const config = await lerConfiguracoes(ctx);
  const hoje = dataLocal(ctx.agora(), config.fusoHorario);
  const colunas = `c.id, c.nome, c.telefone, c.empresa, c.proxima_acao_em, c.proxima_acao_texto, c.criado_em, e.nome AS etapa_nome`;
  const acoes = await ctx.db
    .prepare(
      `SELECT ${colunas} FROM contatos c JOIN etapas e ON e.id = c.etapa_id
       WHERE c.proxima_acao_em IS NOT NULL AND c.proxima_acao_em <= ?
       ORDER BY c.proxima_acao_em, c.nome`,
    )
    .bind(hoje)
    .all<LinhaHoje>();
  // A lista de tipos vem de uma constante nossa, nunca de entrada do usuário.
  const tipos = TIPOS_DE_RESPOSTA.map((t) => `'${t}'`).join(",");
  const semResposta = await ctx.db
    .prepare(
      `SELECT ${colunas} FROM contatos c JOIN etapas e ON e.id = c.etapa_id
       WHERE c.etapa_id = ?
         AND NOT EXISTS (SELECT 1 FROM eventos ev WHERE ev.contato_id = c.id AND ev.tipo IN (${tipos}))
         AND NOT (c.proxima_acao_em IS NOT NULL AND c.proxima_acao_em <= ?)
       ORDER BY c.criado_em`,
    )
    .bind(config.etapaInicial, hoje)
    .all<LinhaHoje>();
  return {
    hoje,
    acoes: acoes.results.map(itemHoje),
    semResposta: semResposta.results.map(itemHoje),
  };
}
