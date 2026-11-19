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

## Estado

- Fase 0 escrita e testada localmente: esqueleto TanStack Start, build para Cloudflare Workers, binding D1 (ID provisório), cabeçalhos de segurança e controle de acesso por token do Cloudflare Access (falha fechada), 11 testes.
- Falta para fechar a fase 0: repositório no GitHub, banco D1, Worker com deploy automático, domínio, Access e Secrets (ver `docs/fase-0-passo-a-passo.md`).
- Sem commit ainda.

## Documentos

- `docs/README.md`: índice.
- `docs/plano-crm-base.md`: plano (escopo, modelo de dados, telas, fases).
- `docs/fase-0-passo-a-passo.md`: o que falta fazer nos painéis.
- `BACKLOG.md`: pendências.
