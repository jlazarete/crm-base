// Minúsculo e sem acento, para busca.
export function normalizarBusca(valor: string): string {
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Trata % _ e \ como texto comum num LIKE ... ESCAPE '\'.
export function escaparLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`);
}
