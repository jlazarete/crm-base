# CLAUDE.md

Orientações permanentes para sessões de IA neste projeto. Valem junto com `~/.claude/CLAUDE.md`.

## O que é este projeto

CRM genérico (`crm-base`): núcleo de contatos, jornada de eventos, funil configurável e medição por origem. Não contém dado de nenhum negócio. A versão personalizada para a Lazarete nasce de uma cópia deste repositório (`crm-lazarete`), em outro repositório.

## Regras

- **Nenhum dado real aqui.** Sem contatos, clientes, tokens ou chaves. Dados de exemplo são sempre fictícios e marcados como tal.
- **Dependências:** Bun. `bun.lock` é o lockfile oficial. Sem npm, yarn ou pnpm.
- **Stack prevista:** TanStack Start, Cloudflare Workers e D1, como no site da Lazarete. Confirmar no plano antes de instalar qualquer coisa.
- **Git:** autor é o `git config` local (Jose Lazarete). Nunca adicionar trailer, nome ou coautoria de IA em commit, PR ou tag. Não commitar nem fazer push sem pedido explícito.
- **Idioma:** português.
- **Segredos:** nunca ler, repetir ou gravar valores de `.env` em conversa, doc ou commit.
- **Mudança grande** passa por plano aprovado por José antes de virar código.
