import { z } from "zod";
import { normalizarTelefone } from "./telefone";

export const idSchema = z.string().uuid();
export const codigoSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Data inexistente.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().email().safeParse(v).success, "E-mail inválido.");

const telefoneSchema = z
  .string()
  .max(30)
  .regex(/^[0-9()+\-\s]*$/, "Use só números, espaço, parênteses, + e -.")
  .nullish()
  .transform((v, ctx) => {
    if (!v || !v.replace(/\D/g, "")) return null;
    const normalizado = normalizarTelefone(v);
    if (!normalizado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Telefone deve ter de 10 a 15 dígitos.",
      });
      return z.NEVER;
    }
    return normalizado;
  });

const camposBasicos = {
  nome: z.string().trim().min(2, "Informe o nome.").max(120),
  email: emailSchema,
  telefone: telefoneSchema,
  empresa: textoOpcional(120),
  segmento: textoOpcional(80),
  origemId: codigoSchema,
  valorEstimadoCentavos: z
    .number()
    .int()
    .min(0)
    .max(100_000_000_000)
    .nullish()
    .transform((v) => v ?? null),
};

export const contatoSchema = z
  .object({
    ...camposBasicos,
    etapaId: codigoSchema.nullish().transform((v) => v ?? null),
    proximaAcaoEm: dataSchema.nullish().transform((v) => v ?? null),
    proximaAcaoTexto: textoOpcional(200),
    notaInicial: textoOpcional(2000),
  })
  .superRefine((d, ctx) => {
    if (!d.email && !d.telefone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Informe e-mail ou telefone.",
      });
    }
    if ((d.proximaAcaoEm === null) !== (d.proximaAcaoTexto === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proximaAcaoTexto"],
        message: "Informe a data e o texto da ação.",
      });
    }
  });

export const dadosContatoSchema = z
  .object({ id: idSchema, ...camposBasicos })
  .superRefine((d, ctx) => {
    if (!d.email && !d.telefone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Informe e-mail ou telefone.",
      });
    }
  });

export const notaSchema = z.object({
  contatoId: idSchema,
  texto: z.string().trim().min(1, "Escreva a nota.").max(2000),
});
export const mudarEtapaSchema = z.object({
  contatoId: idSchema,
  etapaDe: codigoSchema,
  etapaPara: codigoSchema,
  nota: textoOpcional(2000),
});
export const proximaAcaoSchema = z.object({
  contatoId: idSchema,
  data: dataSchema,
  texto: z.string().trim().min(1, "Descreva a ação.").max(200),
});
export const concluirAcaoSchema = z.object({ contatoId: idSchema });
export const apagarSchema = z.object({ contatoId: idSchema, confirmacao: z.literal(true) });
export const idContatoSchema = z.object({ id: idSchema });

export const filtroContatosSchema = z.object({
  busca: textoOpcional(100),
  etapa: codigoSchema.nullish().transform((v) => v ?? null),
  origem: codigoSchema.nullish().transform((v) => v ?? null),
  pagina: z.coerce.number().int().min(1).max(1000).default(1),
});

export type NovoContato = z.output<typeof contatoSchema>;
export type DadosContato = z.output<typeof dadosContatoSchema>;
export type FiltroContatos = z.output<typeof filtroContatosSchema>;
