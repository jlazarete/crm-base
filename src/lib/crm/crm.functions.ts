import { createServerFn } from "@tanstack/react-start";
import { respostaErro, validar, type Resposta } from "./erros";
import {
  apagarSchema,
  concluirAcaoSchema,
  contatoSchema,
  dadosContatoSchema,
  filtroContatosSchema,
  idContatoSchema,
  mudarEtapaSchema,
  notaSchema,
  proximaAcaoSchema,
} from "./esquemas";
import type {
  Configuracoes,
  ContatoDetalhado,
  ContatoResumo,
  Etapa,
  Evento,
  ItemHoje,
  Origem,
} from "./tipos";

// Os módulos do servidor são carregados dentro dos handlers: ficam fora do bundle do navegador.
const exec = async () => (await import("./execucao.server")).executar;
const repo = () => import("./repositorio.server");

export interface DadosHoje {
  hoje: string;
  acoes: ItemHoje[];
  semResposta: ItemHoje[];
  mensagemWhatsapp: string;
}
export interface DadosContato {
  contato: ContatoDetalhado;
  eventos: Evento[];
  etapas: Etapa[];
  origens: Origem[];
  config: Configuracoes;
}

export const buscarHoje = createServerFn({ method: "GET" }).handler(
  async (): Promise<Resposta<DadosHoje>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("buscarHoje", async (ctx) => {
      const [hoje, config] = await Promise.all([r.obterHoje(ctx), r.lerConfiguracoes(ctx)]);
      return { ok: true, dados: { ...hoje, mensagemWhatsapp: config.mensagemWhatsapp } };
    });
  },
);

export const buscarOpcoes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Resposta<{ etapas: Etapa[]; origens: Origem[]; etapaInicial: string }>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("buscarOpcoes", async (ctx) => {
      const [etapas, origens, config] = await Promise.all([
        r.listarEtapas(ctx),
        r.listarOrigens(ctx),
        r.lerConfiguracoes(ctx),
      ]);
      return { ok: true, dados: { etapas, origens, etapaInicial: config.etapaInicial } };
    });
  },
);

export const buscarContatosFn = createServerFn({ method: "GET" })
  .validator(validar(filtroContatosSchema))
  .handler(
    async ({
      data,
    }): Promise<
      Resposta<{ itens: ContatoResumo[]; total: number; pagina: number; porPagina: number }>
    > => {
      const [executar, r] = await Promise.all([exec(), repo()]);
      return executar("buscarContatos", async (ctx) => ({
        ok: true,
        dados: await r.buscarContatos(ctx, data),
      }));
    },
  );

export const buscarContatoFn = createServerFn({ method: "GET" })
  .validator(validar(idContatoSchema))
  .handler(async ({ data }): Promise<Resposta<DadosContato>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("buscarContato", async (ctx) => {
      const contato = await r.obterContato(ctx, data.id);
      if (!contato) return { ok: false, codigo: "nao-encontrado" };
      const [eventos, etapas, origens, config] = await Promise.all([
        r.listarEventos(ctx, data.id),
        r.listarEtapas(ctx),
        r.listarOrigens(ctx),
        r.lerConfiguracoes(ctx),
      ]);
      return { ok: true, dados: { contato, eventos, etapas, origens, config } };
    });
  });

export const criarContatoFn = createServerFn({ method: "POST" })
  .validator(validar(contatoSchema))
  .handler(async ({ data }): Promise<Resposta<{ id: string }>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("criarContato", (ctx) => r.criarContato(ctx, data));
  });

export const atualizarContatoFn = createServerFn({ method: "POST" })
  .validator(validar(dadosContatoSchema))
  .handler(async ({ data }): Promise<Resposta<null>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("atualizarContato", (ctx) => r.atualizarContato(ctx, data));
  });

export const adicionarNotaFn = createServerFn({ method: "POST" })
  .validator(validar(notaSchema))
  .handler(async ({ data }): Promise<Resposta<null>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("adicionarNota", (ctx) => r.adicionarNota(ctx, data));
  });

export const mudarEtapaFn = createServerFn({ method: "POST" })
  .validator(validar(mudarEtapaSchema))
  .handler(async ({ data }): Promise<Resposta<null>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("mudarEtapa", (ctx) => r.mudarEtapa(ctx, data));
  });

export const definirProximaAcaoFn = createServerFn({ method: "POST" })
  .validator(validar(proximaAcaoSchema))
  .handler(async ({ data }): Promise<Resposta<null>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("definirProximaAcao", (ctx) => r.definirProximaAcao(ctx, data));
  });

export const concluirProximaAcaoFn = createServerFn({ method: "POST" })
  .validator(validar(concluirAcaoSchema))
  .handler(async ({ data }): Promise<Resposta<null>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("concluirProximaAcao", (ctx) => r.concluirProximaAcao(ctx, data));
  });

export const apagarContatoFn = createServerFn({ method: "POST" })
  .validator(validar(apagarSchema))
  .handler(async ({ data }): Promise<Resposta<null>> => {
    const [executar, r] = await Promise.all([exec(), repo()]);
    return executar("apagarContato", (ctx) => r.apagarContato(ctx, data.contatoId));
  });

export { respostaErro };
