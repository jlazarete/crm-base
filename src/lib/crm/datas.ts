// "Hoje" no dia local do fuso configurado, no formato AAAA-MM-DD.
export function dataLocal(agora: Date, fuso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function formatarDataHora(iso: string, fuso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: fuso,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Dias entre duas datas AAAA-MM-DD (positivo quando `ate` é depois de `de`).
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}
