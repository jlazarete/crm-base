export const DDI_PADRAO = "55";

// Só dígitos. Com 10 ou 11 dígitos (DDD + número) acrescenta o 55 do Brasil.
// Devolve null se vazio ou fora de 10 a 15 dígitos.
export function normalizarTelefone(valor: string): string | null {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return null;
  const completo = digitos.length === 10 || digitos.length === 11 ? DDI_PADRAO + digitos : digitos;
  return completo.length >= 10 && completo.length <= 15 ? completo : null;
}

// 5511900000001 -> +55 (11) 90000-0001. Formatos fora do padrão brasileiro voltam como "+dígitos".
export function formatarTelefone(telefone: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(telefone);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${telefone}`;
}
