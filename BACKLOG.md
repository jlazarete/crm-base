# Backlog: crm-base

## Em andamento

- [x] Criar a estrutura do projeto (19/11/2026).
- [x] Transcrever e resumir o vídeo de referência (19/11/2026).
- [x] Escrever o plano do CRM genérico (`docs/plano-crm-base.md`, 19/11/2026).
- [x] José aprovou o plano e as 5 decisões, todas como sugeridas (19/11/2026).
- [x] Fase 0, código: esqueleto, acesso por Cloudflare Access, D1 (ID provisório), testes (19/11/2026). Sem commit.
- [x] Fase 1 (contatos, etapas, linha do tempo, Hoje) escrita e validada localmente na branch `fase-1` (19/11/2026). Sem commit. Ver `docs/fase-1.md`.
- [ ] Fase 0, painéis: repositório, D1, Worker, domínio, Access e Secrets (`docs/fase-0-passo-a-passo.md`).
- [ ] Definir como entra o "construtor visual de máquinas" do vídeo, se entrar (fora do escopo do plano atual).

## Próximos

- [ ] Fase 2: entrada do formulário do site (`POST /api/entrada/formulario` com segredo) e importar os 15 contatos já guardados no site.
- [ ] Fase 3: WhatsApp manual (botões "enviei" e "recebi").
- [ ] Fase 4: funil em quadro e tela de medição.
- [ ] Depois: tela de Configurações, exportar contato (LGPD), retenção de 24 meses com aviso, alertas no Telegram, backup do D1.
- [ ] Construir o `crm-base`.
- [ ] Marcar o repositório como template no GitHub e criar o `crm-lazarete` a partir dele.
- [ ] Personalizar para a Lazarete: funil, campos, textos e integração com o formulário do site.
- [ ] Extrair duas skills recorrentes depois de feito: "criar um CRM base a partir de um vídeo ou requisito" e "personalizar o CRM para um negócio" (repositório `00-central/lazarete-skills`).

## Decisões pendentes de José

- Se o construtor visual do vídeo entra, e em qual fase.

Já decidido em 19/11/2026: uso só de José, canais formulário e WhatsApp, sem rastrear anônimos.

