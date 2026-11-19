import { Link } from "@tanstack/react-router";
import { diasEntre, formatarData } from "@/lib/crm/datas";
import type { ItemHoje as Item } from "@/lib/crm/tipos";
import { BotaoWhatsApp } from "./BotaoWhatsApp";
import { BotaoConcluir } from "./Acoes";
import { cartao } from "./estilos";

export function ItemDeHoje({
  item,
  hoje,
  mensagem,
  tipo,
}: {
  item: Item;
  hoje: string;
  mensagem: string;
  tipo: "acao" | "semResposta";
}) {
  const dias = item.proximaAcaoEm ? diasEntre(item.proximaAcaoEm, hoje) : 0;
  const criado = item.criadoEm.slice(0, 10);
  return (
    <li className={cartao}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          to="/contatos/$id"
          params={{ id: item.id }}
          className="text-lg font-medium text-sky-300 underline-offset-2 hover:underline"
        >
          {item.nome}
        </Link>
        <span className="text-sm text-slate-400">{item.etapaNome}</span>
      </div>
      {item.empresa && <p className="text-sm text-slate-300">{item.empresa}</p>}
      {tipo === "acao" && item.proximaAcaoTexto && (
        <p className="mt-2">
          {item.proximaAcaoTexto}{" "}
          <span className={dias > 0 ? "font-medium text-amber-300" : "text-slate-400"}>
            (
            {dias > 0
              ? `atrasada há ${dias} ${dias === 1 ? "dia" : "dias"}`
              : `para hoje, ${formatarData(item.proximaAcaoEm!)}`}
            )
          </span>
        </p>
      )}
      {tipo === "semResposta" && (
        <p className="mt-2 text-sm text-amber-300">
          Aguardando há {Math.max(0, diasEntre(criado, hoje))} dia(s)
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <BotaoWhatsApp telefone={item.telefone} nome={item.nome} mensagem={mensagem} />
        {tipo === "acao" && <BotaoConcluir contatoId={item.id} />}
      </div>
    </li>
  );
}
