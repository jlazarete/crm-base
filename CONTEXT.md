# Contexto: crm-base

Contexto para agentes. Atualizado em 19/11/2026.

## Objetivo

Construir um CRM genérico e depois personalizá-lo para o negócio da Lazarete Automações. A ideia vem do vídeo de Kelvin Cleto (resumo em `docs/referencias/Dn4LHBxypa8/resumo.md`): o centro do sistema é a **jornada de eventos de cada contato**, com a origem registrada, e não só a etapa do funil.

## Decisões já tomadas

- Projeto separado do site `lazarete-automacoes`, em `~/Projetos/02-produtos-internos/crm-base`. Motivo: login e dados de clientes não devem conviver com o site público em produção.
- Dois repositórios no futuro: `crm-base` (genérico, vira template no GitHub) e `crm-lazarete` (criado a partir dele, com funil, campos e dados do negócio).
- Primeiro passo: plano aprovado por José, depois código.

## Decisões de escopo (José, 19/11/2026)

- Uso só de José (um usuário).
- Canais da primeira versão: formulário do site e WhatsApp.
- Sem rastrear visitantes anônimos.

## Decisões de 19/11/2026 (plano, seção 10)

Todas como sugeridas: nomes `crm-base` e `crm-lazarete`; domínio `crm.lazarete.com.br`; retenção de 24 meses com aviso antes de apagar; etapas iniciais Novo, Contato feito, Diagnóstico agendado, Diagnóstico feito, Proposta enviada, Ganho, Perdido; importar os 15 contatos já guardados no site.

## Estado (19/11/2026)

- Fase 0 e fase 1 escritas, na branch `fase-1`, sem commit. Detalhes e validação em `docs/fase-1.md`.
- Fase 1: contatos, etapas, linha do tempo imutável, notas, próxima ação (só data), tela Hoje, busca e filtros, WhatsApp via `wa.me`, apagar contato (LGPD). 69 testes, typecheck e lint limpos, fluxo completo validado no navegador (celular) no simulador do Cloudflare.
- Falta: painéis da fase 0 (GitHub já criado; D1, Worker, domínio, Access, Secrets), migration em produção e conferência no ar.
- `bun run dev` não hidrata no navegador (bug conhecido de `node:async_hooks`); ver as telas com `bun run build` e `bun run simulador`.
- Plano das fases feito por um agente em Opus e executado em Sonnet.

## Documentos

- `docs/README.md`: índice.
- `docs/plano-crm-base.md`: plano (escopo, modelo de dados, telas, fases).
- `docs/fase-0-passo-a-passo.md`: o que falta fazer nos painéis.
- `docs/fase-1.md`: fase 1 (decisões, validação, produção).
- `BACKLOG.md`: pendências.
