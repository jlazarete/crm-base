import { linkWhatsApp } from "@/lib/crm/whatsapp";
import { botaoSecundario } from "./estilos";

export function BotaoWhatsApp({
  telefone,
  nome,
  mensagem,
}: {
  telefone: string | null;
  nome: string;
  mensagem: string;
}) {
  const href = linkWhatsApp(telefone, mensagem, nome);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
      Abrir no WhatsApp
    </a>
  );
}
