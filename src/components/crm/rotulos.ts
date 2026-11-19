import type { TipoEvento } from "@/lib/crm/tipos";

export const ROTULO_EVENTO: Record<TipoEvento, string> = {
  contato_criado: "Contato criado",
  formulario_enviado: "Formulário enviado",
  whatsapp_enviado: "WhatsApp enviado",
  whatsapp_recebido: "WhatsApp recebido",
  reuniao: "Reunião",
  proposta_enviada: "Proposta enviada",
  nota: "Nota",
  etapa_alterada: "Etapa alterada",
  proxima_acao_alterada: "Próxima ação",
  ganho: "Ganho",
  perda: "Perda",
};
