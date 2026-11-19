import { createFileRoute } from "@tanstack/react-router";

// Confere que o app está no ar e que o acesso foi autorizado (o middleware já barrou
// quem não tem token). Não devolve dado nenhum além do estado.
export const Route = createFileRoute("/api/saude")({
  server: {
    handlers: {
      GET: () => Response.json({ ok: true }),
    },
  },
});
