# Plano do crm-base

---

<p align="center">
  <a href="README.md">Índice</a> • <strong>Plano do crm-base</strong> • <a href="referencias/Dn4LHBxypa8/resumo.md">Resumo do vídeo</a>
</p>

---

Proposta para aprovação de José. Nada deste plano foi implementado. Escrita em 19/11/2026.

## 1. Decisões de escopo (José, 19/11/2026)

- **Uso só de José.** Um usuário, sem cadastro de equipe nem permissões por perfil.
- **Canais da primeira versão:** formulário do site e WhatsApp.
- **Sem rastrear visitantes anônimos.** Nenhum pixel, cookie ou histórico de navegação. O CRM só conhece quem se identificou (preencheu o formulário ou conversou no WhatsApp).

Consequência: o que o vídeo chama de "anônimo para identificado" fica fora. Aproveita-se o resto da ideia, a **linha do tempo de eventos de cada contato com a origem registrada**.

## 2. O que o sistema faz

Responde a três perguntas de José:
1. **Quem preciso procurar hoje?** (próximas ações vencidas ou do dia)
2. **O que aconteceu com este contato?** (linha do tempo completa)
3. **De onde vêm os contatos que viram cliente?** (medição por origem)

## 3. Modelo de dados

Cinco tabelas, todas no D1.

| Tabela | Campos principais |
|---|---|
| `contatos` | id, nome, e-mail, telefone, empresa, segmento, origem_inicial, etapa_id, valor_estimado, proxima_acao_em, proxima_acao_texto, criado_em, atualizado_em |
| `eventos` | id, contato_id, tipo, origem (texto livre curto), detalhe, ocorrido_em |
| `etapas` | id, nome, ordem, tipo (aberta, ganha, perdida) |
| `origens` | id, nome (ex.: site-formulario, site-diagnostico, whatsapp-direto, indicacao, instagram) |
| `configuracoes` | chave, valor (para o que o `crm-lazarete` personaliza) |

Tipos de evento: `formulario_enviado`, `whatsapp_enviado`, `whatsapp_recebido`, `reuniao`, `proposta_enviada`, `nota`, `etapa_alterada`, `ganho`, `perda`.

Regras:
- A linha do tempo só recebe novos eventos. Não se edita nem apaga evento (só o contato inteiro, por LGPD).
- Etapas e origens são **configuráveis**, e é isso que o `crm-lazarete` muda.
- Mensagem inteira do WhatsApp não é guardada na primeira versão, só o evento e uma nota curta.

## 4. Telas

1. **Hoje:** contatos com próxima ação vencida ou do dia, mais os novos sem resposta.
2. **Contatos:** lista com busca e filtro por etapa e origem.
3. **Contato:** dados, linha do tempo, botão de nota, mudar etapa, agendar próxima ação, botão "abrir no WhatsApp".
4. **Funil:** quadro com as etapas em colunas, arrastar o contato muda a etapa.
5. **Medição:** contatos por origem, quantos chegaram a cada etapa, quantos ganharam, tempo médio até o fechamento.
6. **Configurações:** etapas, origens e exportação.

## 5. Entrada de dados

### Formulário do site

O site já sabe avisar um endereço externo quando alguém envia o formulário (`CONTACT_WEBHOOK_URL` em `src/lib/contact-handler.ts`, hoje não usado). O CRM recebe esse aviso em `POST /api/entrada/formulario`:
- protegido por um segredo compartilhado (comparação em tempo constante, como nos webhooks do Telegram);
- cria o contato e o evento `formulario_enviado` com a origem (`site-formulario` ou `site-diagnostico`);
- aceita só os campos que o formulário já coleta, nada de dado de navegação;
- se o CRM estiver fora do ar, o contato continua gravado no D1 e no e-mail do site. O CRM não é ponto único de falha.

Mudança necessária no site: ligar o webhook e enviar o segredo. Passa pelo fluxo normal de branch e aprovação no repositório do site.

### WhatsApp

Duas fases, por causa do que o WhatsApp permite:
- **Primeira versão (manual, segura):** botão que abre `wa.me` com uma mensagem pronta, e botões de um clique para registrar "enviei" ou "recebi" com uma nota. Sem integração com conta nenhuma.
- **Depois, se valer a pena:** WhatsApp Cloud API oficial da Meta, com webhook de mensagens recebidas. Exige conta empresarial verificada e modelos de mensagem aprovados. **Não recomendo** ligar o WhatsApp pessoal ou o do aplicativo por ferramentas não oficiais: o vídeo mostra isso, mas há risco de bloqueio do número.

## 6. Acesso e segurança

- **Login:** Cloudflare Access na frente do app (gratuito até 50 usuários), liberando só o e-mail de José por código de uso único. Dispensa construir autenticação própria. Configuração feita por José no painel; o app confere o cabeçalho de identidade do Access.
- **Endereço sugerido:** `crm.lazarete.com.br`, nunca exposto sem o Access.
- **Segredos** só como Secrets do Worker. Nada no repositório.
- **Dados pessoais (LGPD):** base legal é o legítimo interesse de responder quem pediu contato. Prever exportar e apagar um contato, e um prazo de retenção a definir.
- **Alertas:** reaproveitar o módulo do Telegram do site (aviso de erro e de falha na entrada).
- **Backup:** D1 Time Travel e uma exportação periódica (a confirmar no plano de segurança do site, que também tem esse item pendente).

## 7. Stack

Mesma do site, para José operar uma única: Bun, TanStack Start, Cloudflare Workers e D1, Tailwind. Testes com `bun test`. Deploy automático pela `main`, com branch e aprovação como no site.

## 8. Fases

| Fase | Entrega | Pronto quando |
|---|---|---|
| 0 | Esqueleto, D1, Access, deploy em `crm.lazarete.com.br` | Só José entra; qualquer outro é barrado |
| 1 | Contatos, etapas, linha do tempo, notas, próxima ação, tela Hoje | Cadastro manual e consulta funcionam |
| 2 | Entrada do formulário do site | Um envio real de teste aparece no CRM com origem correta |
| 3 | WhatsApp manual (botão `wa.me` e registro de eventos) | Registrar uma conversa leva menos de 30 segundos |
| 4 | Funil em quadro e tela de medição | Contagem por origem confere com a lista |
| 5 | Personalização `crm-lazarete` a partir do template | Funil e campos da Lazarete em uso |

Cada fase termina com teste automatizado e conferência no ar, e só segue com sua aprovação. Sem estimativa de prazo.

## 9. Fora do escopo (por enquanto)

Rastreamento de visitantes, pixel, múltiplos usuários, campanhas e disparos em massa, construtor visual de funil, telefonia, e-mail integrado, agentes de IA decidindo ações.

## 10. Para decidir antes da fase 0

1. **Nome:** `crm-base` fica como nome do template? E o do seu, `crm-lazarete`?
2. **Domínio:** pode ser `crm.lazarete.com.br`?
3. **Retenção:** por quanto tempo guardar um contato sem negócio (sugestão: 24 meses, com aviso antes de apagar)?
4. **Etapas iniciais para a Lazarete** (sugestão): Novo, Contato feito, Diagnóstico agendado, Diagnóstico feito, Proposta enviada, Ganho, Perdido.
5. **Importar os 15 contatos já guardados no D1 do site**, ou começar do zero?
