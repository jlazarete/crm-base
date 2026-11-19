// Link wa.me com mensagem pronta. {primeiro_nome} vira o primeiro nome do contato.
export function linkWhatsApp(
  telefone: string | null,
  mensagemPadrao: string,
  nome: string,
): string | null {
  if (!telefone) return null;
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? "";
  const texto = mensagemPadrao.replaceAll("{primeiro_nome}", primeiroNome);
  return `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
}
