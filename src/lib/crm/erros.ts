import type { ZodTypeAny, z } from "zod";
import type { CodigoErro } from "./tipos";

export const MENSAGENS: Record<CodigoErro, string> = {
  "nao-encontrado": "Contato não encontrado. Ele pode ter sido apagado.",
  "email-duplicado": "Já existe um contato com este e-mail.",
  "telefone-duplicado": "Já existe um contato com este telefone.",
  "etapa-invalida": "Etapa inválida.",
  "origem-invalida": "Origem inválida.",
  "sem-mudanca": "O contato já está nesta etapa.",
  conflito: "A etapa mudou em outra aba. Recarregue e tente de novo.",
  "sem-acao": "Este contato não tem próxima ação.",
  "entrada-invalida": "Confira os campos e tente de novo.",
  "erro-interno": "Algo deu errado. Tente de novo em instantes.",
};

export type Resposta<T> =
  { ok: true; dados: T } | { ok: false; codigo: CodigoErro; mensagem: string };

export const respostaErro = (codigo: CodigoErro): Resposta<never> => ({
  ok: false,
  codigo,
  mensagem: MENSAGENS[codigo],
});

// Validador das funções de servidor. Se falhar, a mensagem leva só os NOMES dos campos,
// nunca os valores enviados (podem ser dado pessoal).
export function validar<S extends ZodTypeAny>(schema: S) {
  return (dados: unknown): z.output<S> => {
    const r = schema.safeParse(dados);
    if (r.success) return r.data;
    const campos = [...new Set(r.error.issues.map((i) => i.path.join(".") || "(raiz)"))];
    throw new Error(`entrada-invalida: ${campos.join(",")}`);
  };
}
