import { useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { atualizarContatoFn, criarContatoFn } from "@/lib/crm/crm.functions";
import { contatoSchema, dadosContatoSchema } from "@/lib/crm/esquemas";
import type { Etapa, Origem } from "@/lib/crm/tipos";
import { BUSCA_VAZIA, botao, botaoSecundario, campo, rotulo } from "./estilos";
import { ErroDeCampo, Mensagem } from "./Mensagem";

export interface ValoresContato {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  segmento: string;
  origemId: string;
  etapaId: string;
  valor: string;
}

export const CONTATO_VAZIO: ValoresContato = {
  nome: "",
  email: "",
  telefone: "",
  empresa: "",
  segmento: "",
  origemId: "",
  etapaId: "",
  valor: "",
};

// "1.500,00" -> 150000 (centavos). Vazio -> null. Inválido -> NaN.
export function valorParaCentavos(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const numero = Number(limpo.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) : Number.NaN;
}

export function FormContato({
  inicial,
  etapas,
  origens,
  etapaInicial,
}: {
  inicial: ValoresContato;
  etapas: Etapa[];
  origens: Origem[];
  etapaInicial: string;
}) {
  const router = useRouter();
  const criar = useServerFn(criarContatoFn);
  const atualizar = useServerFn(atualizarContatoFn);
  const editando = Boolean(inicial.id);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [geral, setGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (n: string) => String(f.get(n) ?? "");
    const valor = valorParaCentavos(texto("valor"));
    const base = {
      nome: texto("nome"),
      email: texto("email"),
      telefone: texto("telefone"),
      empresa: texto("empresa"),
      segmento: texto("segmento"),
      origemId: texto("origemId"),
      valorEstimadoCentavos: Number.isNaN(valor) ? -1 : valor,
    };
    const bruto = editando
      ? { ...base, id: inicial.id }
      : {
          ...base,
          etapaId: texto("etapaId") || null,
          proximaAcaoEm: texto("proximaAcaoEm") || null,
          proximaAcaoTexto: texto("proximaAcaoTexto"),
          notaInicial: texto("notaInicial"),
        };
    const r = (editando ? dadosContatoSchema : contatoSchema).safeParse(bruto);
    if (!r.success) {
      const porCampo: Record<string, string> = {};
      for (const i of r.error.issues) {
        const chave =
          i.path[0] === "valorEstimadoCentavos" ? "valor" : String(i.path[0] ?? "geral");
        porCampo[chave] ??= chave === "valor" ? "Valor inválido. Exemplo: 1.500,00" : i.message;
      }
      setErros(porCampo);
      setGeral("Corrija os campos indicados.");
      document.getElementById(`campo-${Object.keys(porCampo)[0]}`)?.focus();
      return;
    }
    setErros({});
    setGeral(null);
    setEnviando(true);
    const resposta = editando ? await atualizar({ data: r.data }) : await criar({ data: r.data });
    setEnviando(false);
    if (!resposta.ok) {
      const campoErro =
        resposta.codigo === "email-duplicado"
          ? "email"
          : resposta.codigo === "telefone-duplicado"
            ? "telefone"
            : "geral";
      setErros({ [campoErro]: resposta.mensagem });
      setGeral(resposta.mensagem);
      return;
    }
    const id = editando ? inicial.id! : (resposta.dados as { id: string }).id;
    await router.invalidate();
    await router.navigate({ to: "/contatos/$id", params: { id } });
  }

  const campoTexto = (
    nome: keyof ValoresContato,
    titulo: string,
    tipo = "text",
    extra: Record<string, string | boolean> = {},
  ) => (
    <div>
      <label htmlFor={`campo-${nome}`} className={rotulo}>
        {titulo}
      </label>
      <input
        id={`campo-${nome}`}
        name={nome}
        type={tipo}
        defaultValue={inicial[nome] ?? ""}
        className={campo}
        aria-invalid={erros[nome] ? true : undefined}
        aria-describedby={erros[nome] ? `erro-${nome}` : undefined}
        {...extra}
      />
      <ErroDeCampo id={`erro-${nome}`} texto={erros[nome]} />
    </div>
  );

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4">
      {campoTexto("nome", "Nome", "text", { autoComplete: "off", required: true })}
      {campoTexto("email", "E-mail", "email", { inputMode: "email" })}
      {campoTexto("telefone", "Telefone ou WhatsApp (com DDD)", "tel", { inputMode: "tel" })}
      {campoTexto("empresa", "Empresa")}
      {campoTexto("segmento", "Segmento")}
      <div>
        <label htmlFor="campo-origemId" className={rotulo}>
          Origem
        </label>
        <select
          id="campo-origemId"
          name="origemId"
          defaultValue={inicial.origemId}
          required
          className={campo}
          aria-invalid={erros["origemId"] ? true : undefined}
        >
          <option value="" disabled>
            Escolha a origem
          </option>
          {origens.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
        <ErroDeCampo id="erro-origemId" texto={erros["origemId"]} />
      </div>
      {!editando && (
        <div>
          <label htmlFor="campo-etapaId" className={rotulo}>
            Etapa
          </label>
          <select id="campo-etapaId" name="etapaId" defaultValue={etapaInicial} className={campo}>
            {etapas.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {campoTexto("valor", "Valor estimado (R$)", "text", {
        inputMode: "decimal",
        placeholder: "1.500,00",
      })}
      {!editando && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="campo-proximaAcaoEm" className={rotulo}>
                Próxima ação, data
              </label>
              <input id="campo-proximaAcaoEm" name="proximaAcaoEm" type="date" className={campo} />
            </div>
            <div>
              <label htmlFor="campo-proximaAcaoTexto" className={rotulo}>
                Próxima ação, o que fazer
              </label>
              <input
                id="campo-proximaAcaoTexto"
                name="proximaAcaoTexto"
                maxLength={200}
                className={campo}
                aria-invalid={erros["proximaAcaoTexto"] ? true : undefined}
              />
              <ErroDeCampo id="erro-proximaAcaoTexto" texto={erros["proximaAcaoTexto"]} />
            </div>
          </div>
          <div>
            <label htmlFor="campo-notaInicial" className={rotulo}>
              Nota inicial
            </label>
            <textarea
              id="campo-notaInicial"
              name="notaInicial"
              rows={3}
              maxLength={2000}
              className={campo}
            />
          </div>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={enviando} className={botao}>
          {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar contato"}
        </button>
        {editando ? (
          <Link to="/contatos/$id" params={{ id: inicial.id! }} className={botaoSecundario}>
            Cancelar
          </Link>
        ) : (
          <Link to="/contatos" search={BUSCA_VAZIA} className={botaoSecundario}>
            Cancelar
          </Link>
        )}
      </div>
      <Mensagem texto={geral} erro />
    </form>
  );
}
