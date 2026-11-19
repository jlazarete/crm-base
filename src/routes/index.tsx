import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">CRM</h1>
      <p className="mt-2 text-slate-400">
        Fase 0: esqueleto e acesso protegido. A tela Hoje chega na fase 1.
      </p>
    </main>
  ),
});
