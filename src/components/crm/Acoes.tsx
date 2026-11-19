import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import {
  adicionarNotaFn,
  apagarContatoFn,
  concluirProximaAcaoFn,
  definirProximaAcaoFn,
  mudarEtapaFn,
} from "@/lib/crm/crm.functions";
import { notaSchema } from "@/lib/crm/esquemas";
import type { Etapa } from "@/lib/crm/tipos";
import { botao, botaoPerigo, botaoSecundario, campo, rotulo } from "./estilos";
import { Mensagem } from "./Mensagem";

// Executa uma ação do servidor, atualiza a página e devolve o texto de status.
function useAcao() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ texto: string | null; erro: boolean }>({
    texto: null,
    erro: false,
  });
  const [ocupado, setOcupado] = useState(false);
  async function rodar(
    chamada: () => Promise<{ ok: true } | { ok: false; mensagem: string }>,
    sucesso: string,
    depois?: () => void,
  ) {
    setOcupado(true);
    const r = await chamada();
    setOcupado(false);
    if (!r.ok) return setMsg({ texto: r.mensagem, erro: true });
    setMsg({ texto: sucesso, erro: false });
    depois?.();
    await router.invalidate();
  }
  return { msg, ocupado, rodar };
}

export function FormEtapa({
  contatoId,
  etapaAtual,
  etapas,
}: {
  contatoId: string;
  etapaAtual: string;
  etapas: Etapa[];
}) {
  const mudar = useServerFn(mudarEtapaFn);
  const { msg, ocupado, rodar } = useAcao();
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    void rodar(
      () =>
        mudar({
          data: {
            contatoId,
            etapaDe: etapaAtual,
            etapaPara: String(f.get("etapa")),
            nota: String(f.get("nota") ?? ""),
          },
        }),
      "Etapa alterada.",
      () => form.reset(),
    );
  }
  return (
    <form onSubmit={enviar} className="grid gap-3">
      <div>
        <label htmlFor="etapa" className={rotulo}>
          Mudar etapa
        </label>
        <select
          id="etapa"
          name="etapa"
          defaultValue={etapaAtual}
          key={etapaAtual}
          className={campo}
        >
          {etapas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="nota-etapa" className={rotulo}>
          Nota (opcional)
        </label>
        <input id="nota-etapa" name="nota" maxLength={2000} className={campo} />
      </div>
      <button type="submit" disabled={ocupado} className={botao}>
        Mudar etapa
      </button>
      <Mensagem texto={msg.texto} erro={msg.erro} />
    </form>
  );
}

export function FormNota({ contatoId }: { contatoId: string }) {
  const adicionar = useServerFn(adicionarNotaFn);
  const { msg, ocupado, rodar } = useAcao();
  const [texto, setTexto] = useState("");
  function enviar(e: FormEvent) {
    e.preventDefault();
    const r = notaSchema.safeParse({ contatoId, texto });
    if (!r.success) return void rodar(async () => ({ ok: false, mensagem: "Escreva a nota." }), "");
    void rodar(
      () => adicionar({ data: r.data }),
      "Nota adicionada.",
      () => setTexto(""),
    );
  }
  return (
    <form onSubmit={enviar} className="grid gap-3">
      <div>
        <label htmlFor="nota" className={rotulo}>
          Nova nota
        </label>
        <textarea
          id="nota"
          rows={3}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={campo}
        />
        <p className="mt-1 text-xs text-slate-400">{texto.length}/2000</p>
      </div>
      <button type="submit" disabled={ocupado} className={botao}>
        Adicionar nota
      </button>
      <Mensagem texto={msg.texto} erro={msg.erro} />
    </form>
  );
}

export function FormProximaAcao({
  contatoId,
  atual,
}: {
  contatoId: string;
  atual: { data: string; texto: string } | null;
}) {
  const definir = useServerFn(definirProximaAcaoFn);
  const concluir = useServerFn(concluirProximaAcaoFn);
  const { msg, ocupado, rodar } = useAcao();
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void rodar(
      () =>
        definir({
          data: { contatoId, data: String(f.get("data")), texto: String(f.get("texto")) },
        }),
      "Próxima ação salva.",
    );
  }
  return (
    <div className="grid gap-3">
      <form
        onSubmit={enviar}
        className="grid gap-3"
        key={atual ? `${atual.data}${atual.texto}` : "vazio"}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="acao-data" className={rotulo}>
              Data
            </label>
            <input
              id="acao-data"
              name="data"
              type="date"
              required
              defaultValue={atual?.data ?? ""}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="acao-texto" className={rotulo}>
              O que fazer
            </label>
            <input
              id="acao-texto"
              name="texto"
              required
              maxLength={200}
              defaultValue={atual?.texto ?? ""}
              className={campo}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={ocupado} className={botao}>
            Salvar ação
          </button>
          {atual && (
            <button
              type="button"
              disabled={ocupado}
              className={botaoSecundario}
              onClick={() => void rodar(() => concluir({ data: { contatoId } }), "Ação concluída.")}
            >
              Concluir ação
            </button>
          )}
        </div>
      </form>
      <Mensagem texto={msg.texto} erro={msg.erro} />
    </div>
  );
}

export function BotaoConcluir({ contatoId }: { contatoId: string }) {
  const concluir = useServerFn(concluirProximaAcaoFn);
  const { msg, ocupado, rodar } = useAcao();
  return (
    <>
      <button
        type="button"
        disabled={ocupado}
        className={botaoSecundario}
        onClick={() => void rodar(() => concluir({ data: { contatoId } }), "Ação concluída.")}
      >
        Concluir ação
      </button>
      <Mensagem texto={msg.texto} erro={msg.erro} />
    </>
  );
}

export function DialogoApagar({ contatoId, nome }: { contatoId: string; nome: string }) {
  const router = useRouter();
  const apagar = useServerFn(apagarContatoFn);
  const [aberto, setAberto] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function confirmar() {
    const r = await apagar({ data: { contatoId, confirmacao: true } });
    if (!r.ok) return setErro(r.mensagem);
    await router.navigate({
      to: "/contatos",
      search: {},
    });
  }
  return (
    <>
      <button type="button" className={botaoPerigo} onClick={() => setAberto(true)}>
        Apagar contato
      </button>
      {aberto && (
        <dialog
          open
          aria-labelledby="titulo-apagar"
          className="fixed inset-0 z-10 m-auto w-[min(32rem,92vw)] rounded-lg border border-slate-600 bg-slate-900 p-6 text-slate-100"
        >
          <h2 id="titulo-apagar" className="text-lg font-semibold">
            Apagar {nome}?
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            O contato e toda a linha do tempo serão apagados de vez (pedido de LGPD). Não há como
            desfazer.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              className="mt-1 size-5"
            />
            Entendo que não há como desfazer.
          </label>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!confirmado}
              className={botaoPerigo}
              onClick={() => void confirmar()}
            >
              Apagar de vez
            </button>
            <button
              type="button"
              className={botaoSecundario}
              onClick={() => {
                setAberto(false);
                setConfirmado(false);
              }}
            >
              Cancelar
            </button>
          </div>
          <Mensagem texto={erro} erro />
        </dialog>
      )}
    </>
  );
}
