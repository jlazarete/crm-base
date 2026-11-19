import { criarBancoDeTeste } from "./d1-sqlite";
import type { ContextoCrm } from "../../src/lib/crm/repositorio.server";

// Relógio fixo e ids sequenciais no formato UUID: testes determinísticos.
export function criarContexto(inicio = "2026-03-10T15:00:00.000Z") {
  const { db, sqlite } = criarBancoDeTeste();
  let agora = new Date(inicio);
  let n = 0;
  const ctx: ContextoCrm = {
    db,
    agora: () => agora,
    novoId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  };
  return {
    ctx,
    sqlite,
    avancar(ms: number) {
      agora = new Date(agora.getTime() + ms);
    },
    definir(iso: string) {
      agora = new Date(iso);
    },
  };
}

export const novoContatoBase = {
  nome: "Contato Exemplo",
  email: "exemplo@exemplo.invalid",
  telefone: "5500900000001",
  empresa: null,
  segmento: null,
  origemId: "outra",
  valorEstimadoCentavos: null,
  etapaId: null,
  proximaAcaoEm: null,
  proximaAcaoTexto: null,
  notaInicial: null,
};
