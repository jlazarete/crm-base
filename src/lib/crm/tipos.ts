export type TipoEtapa = "aberta" | "ganha" | "perdida";

export interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  tipo: TipoEtapa;
  ativa: boolean;
}

export interface Origem {
  id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
}

export interface Configuracoes {
  fusoHorario: string;
  etapaInicial: string;
  retencaoMeses: number;
  mensagemWhatsapp: string;
}

export const TIPOS_DE_EVENTO = [
  "contato_criado",
  "formulario_enviado",
  "whatsapp_enviado",
  "whatsapp_recebido",
  "reuniao",
  "proposta_enviada",
  "nota",
  "etapa_alterada",
  "proxima_acao_alterada",
  "ganho",
  "perda",
] as const;
export type TipoEvento = (typeof TIPOS_DE_EVENTO)[number];

// Eventos que contam como "José respondeu" para a lista "Novos sem resposta" da tela Hoje.
export const TIPOS_DE_RESPOSTA = [
  "whatsapp_enviado",
  "reuniao",
  "proposta_enviada",
  "etapa_alterada",
] as const;

export interface ContatoResumo {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  etapaId: string;
  etapaNome: string;
  origemId: string;
  origemNome: string;
  proximaAcaoEm: string | null;
  proximaAcaoTexto: string | null;
  atualizadoEm: string;
}

export interface ContatoDetalhado extends ContatoResumo {
  segmento: string | null;
  valorEstimadoCentavos: number | null;
  criadoEm: string;
}

export interface Evento {
  id: string;
  tipo: TipoEvento;
  origem: string | null;
  detalhe: string | null;
  etapaDe: string | null;
  etapaPara: string | null;
  ocorridoEm: string;
}

export interface ItemHoje {
  id: string;
  nome: string;
  telefone: string | null;
  empresa: string | null;
  etapaNome: string;
  proximaAcaoEm: string | null;
  proximaAcaoTexto: string | null;
  criadoEm: string;
}

export type CodigoErro =
  | "nao-encontrado"
  | "email-duplicado"
  | "telefone-duplicado"
  | "etapa-invalida"
  | "origem-invalida"
  | "sem-mudanca"
  | "conflito"
  | "sem-acao"
  | "entrada-invalida"
  | "erro-interno";

export type ResultadoOp<T> = { ok: true; dados: T } | { ok: false; codigo: CodigoErro };
