# Fase 1: contatos, etapas, linha do tempo e tela Hoje

---

<p align="center">
  <a href="README.md">Índice</a> • <a href="plano-crm-base.md">Plano do crm-base</a> • <a href="fase-0-passo-a-passo.md">Fase 0</a> • <strong>Fase 1</strong>
</p>

---

Registro do que a fase 1 entregou, das decisões tomadas e de como aplicar em produção. O plano foi feito por um agente em Opus e executado e validado em Sonnet.

## Decisões (19/11/2026)

Perguntas do plano, resolvidas pelas recomendações dele (trocáveis):

1. **Próxima ação só com data**, sem hora. A tela Hoje funciona por dia, e a hora pode ser acrescentada depois por migration.
2. **E-mail e telefone únicos** por contato. A fase 2 usa isso para juntar novos envios do formulário ao contato que já existe.
3. **Migration em produção rodada à mão** (`bun run db:migrar:producao`), antes do merge. Assim um erro de esquema não derruba o deploy, e o token do Workers Builds não precisa de permissão para editar o D1.

Outras decisões embutidas:
- `valor_estimado` guardado em centavos (`valor_estimado_centavos`).
- Dois tipos de evento a mais que o plano geral: `contato_criado` e `proxima_acao_alterada`. `ganho` e `perda` existem no esquema, mas a fase 1 só registra `etapa_alterada` (mudar para Ganho ou Perdido não duplica a linha do tempo).
- "Novo sem resposta" = contato na etapa inicial sem nenhum evento de `whatsapp_enviado`, `reuniao`, `proposta_enviada` ou `etapa_alterada` (nota não conta) e sem ação vencida (que aparece em "Ações para hoje").
- A linha do tempo é imutável: o banco recusa `UPDATE` e `DELETE` avulso de evento (triggers). Eventos só saem junto com o contato (LGPD).
- Mudar a etapa e registrar o evento é atômico (`db.batch`, com a mesma condição nos dois comandos). Se a etapa mudou em outra aba, a tela avisa e nada é gravado.

## O que foi entregue

- `migrations/`: esquema (5 tabelas, restrições, índices, triggers) e dados iniciais (7 etapas, 6 origens, configurações).
- `src/lib/crm/`: validação (zod), repositório, funções de servidor, tratamento de erros sem vazar dado pessoal.
- `src/lib/csrf.ts`: proteção CSRF nas funções de servidor, antes do controle de acesso.
- Telas: Hoje, Contatos (busca e filtros), Novo contato, Contato (etapa, nota, próxima ação, linha do tempo, WhatsApp via `wa.me`, editar, apagar com confirmação).
- `wrangler.jsonc`: fonte única do banco D1. O `vite.config.ts` não declara mais o D1 (declarar nos dois lugares duplicaria o binding).

## Como foi validado

- 69 testes automatizados (`bun test`), com um dublê de D1 em `bun:sqlite` que aplica os mesmos arquivos de `migrations/`. Typecheck e lint limpos.
- Build de produção rodando no simulador do Cloudflare, com token de acesso de teste assinado localmente:
  - token do e-mail certo entra (200); sem token, e-mail errado, chave de outro emissor e token vencido recebem 401;
  - POST de outro site ou sem origem recebe 403 mesmo com token válido (o CSRF roda antes do acesso).
- Fluxo completo no navegador (largura de celular, 390px), 19 conferências sem falha: cadastro, e-mail duplicado, busca por nome e por telefone com máscara, filtros, tela Hoje, mudar etapa com nota, conflito entre duas abas, concluir ação, editar, apagar com confirmação e página não encontrada. Depois de apagar, não sobrou nenhum evento órfão no banco.

> [!NOTE]
> O `bun run dev` não serve para ver as telas: no navegador a página não hidrata em desenvolvimento (erro de `node:async_hooks`, o mesmo que o site já registra). Para ver o app rodando, use `bun run build` e `bun run simulador`. Como o app exige o token do Access, o simulador precisa das variáveis `CF_ACCESS_TEAM`, `CF_ACCESS_AUD`, `CRM_EMAIL_PERMITIDO` e, só para teste local, `CF_ACCESS_CERTS_URL` apontando para um servidor de chaves de teste. **Nunca configure `CF_ACCESS_CERTS_URL` em produção.**

## Não provado

- Rodar contra o D1 real do Cloudflare e contra o Access real: depende dos painéis da fase 0.
- Comportamento do D1 de produção com os triggers (o simulador usa o mesmo motor, mas o D1 real só se prova no ar).

## Colocar em produção

1. Conclua a fase 0 (`fase-0-passo-a-passo.md`). O ID do banco D1 agora vai em `wrangler.jsonc`.
2. Com `wrangler login` feito, rode `bun run db:migrar:producao`.
3. Faça o merge da branch `fase-1` na `main` (deploy automático).
4. Confira em `crm.lazarete.com.br`: cadastre um contato fictício, mude a etapa, agende uma ação, veja em Hoje, e apague o contato.
5. No aplicativo do Access, ajuste o cookie para SameSite Lax (reforço do CSRF).

## Fica para as próximas fases

Entrada do formulário do site e importação dos 15 contatos (fase 2); botões "enviei" e "recebi" do WhatsApp (fase 3); funil em quadro e medição (fase 4); configurações, exportação por contato, rotina de retenção de 24 meses e backup.
