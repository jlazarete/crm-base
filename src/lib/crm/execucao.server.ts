import { obterBanco } from "@/integrations/d1/client.server";
import { respostaErro, type Resposta } from "./erros";
import type { ContextoCrm } from "./repositorio.server";
import type { ResultadoOp } from "./tipos";

async function contextoPadrao(): Promise<ContextoCrm> {
  return { db: await obterBanco(), agora: () => new Date(), novoId: () => crypto.randomUUID() };
}

// Executa uma operação do repositório e devolve uma Resposta pronta para a tela.
// Em erro inesperado, registra só o nome da operação e o nome do erro: o Workers Logs guarda
// os registros, e entrada, SQL, nome, e-mail e telefone nunca podem ir parar lá.
export async function executar<T>(
  operacao: string,
  fn: (ctx: ContextoCrm) => Promise<ResultadoOp<T>>,
  criarContexto: () => Promise<ContextoCrm> = contextoPadrao,
): Promise<Resposta<T>> {
  try {
    const r = await fn(await criarContexto());
    return r.ok ? { ok: true, dados: r.dados } : respostaErro(r.codigo);
  } catch (erro) {
    console.error("crm", operacao, erro instanceof Error ? erro.name : "desconhecido");
    return respostaErro("erro-interno");
  }
}
