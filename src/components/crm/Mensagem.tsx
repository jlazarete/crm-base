// Região de status lida por leitores de tela. Mantida na página mesmo vazia.
export function Mensagem({ texto, erro = false }: { texto: string | null; erro?: boolean }) {
  return (
    <p
      role={erro ? "alert" : "status"}
      aria-live="polite"
      className={erro ? "mt-2 text-sm text-red-300" : "mt-2 text-sm text-emerald-300"}
    >
      {texto}
    </p>
  );
}

export function ErroDeCampo({ id, texto }: { id: string; texto?: string | undefined }) {
  return texto ? (
    <p id={id} className="mt-1 text-sm text-red-300">
      {texto}
    </p>
  ) : null;
}
