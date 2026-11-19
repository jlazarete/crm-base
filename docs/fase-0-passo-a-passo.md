# Fase 0: colocar o esqueleto no ar

---

<p align="center">
  <a href="README.md">Índice</a> • <a href="plano-crm-base.md">Plano do crm-base</a> • <strong>Fase 0, passo a passo</strong>
</p>

---

O código da fase 0 está pronto e testado localmente. Estes passos fazem a parte que depende dos painéis (GitHub e Cloudflare). Não cole nenhum valor secreto na conversa com o Claude.

> [!IMPORTANT]
> O app recusa qualquer requisição sem o token do Cloudflare Access (resposta 401). Mesmo que o Access seja configurado errado no painel, ou que o endereço `workers.dev` fique aberto, o app não entrega nada sem o token do seu e-mail.

## O que já foi provado localmente

- 11 testes automatizados do controle de acesso (token válido entra; e-mail errado, audiência errada, emissor errado, token vencido, assinatura de outra chave, corpo adulterado, algoritmo `none`, lixo e configuração ausente são recusados).
- Build de produção rodando no simulador do Cloudflare: `/`, `/api/saude`, uma rota inexistente e uma função de servidor responderam 401 sem token, e com token inválido também.
- Não foi provado: o caminho feliz de ponta a ponta com um token real do Access, porque ele só existe depois dos passos abaixo.

## Passos

1. **Repositório.** Crie o repositório privado `crm-base` no GitHub (ou peça ao Claude, que cria e envia o código só com a sua autorização).
2. **Banco D1.** No Cloudflare, Storage e Databases, D1, crie o banco `crm-base-db`. Copie o ID e informe ao Claude (o ID não é segredo), que o coloca em `wrangler.jsonc` (fonte única do banco).
3. **Worker com deploy automático.** Em Workers e Pages, Create, conecte o repositório `crm-base` ao Workers Builds com o nome `crm-base`. Use os mesmos comandos de build e de deploy do Worker `lazarete-automacoes`.
4. **Endereço.** No Worker, Settings, Domains, adicione `crm.lazarete.com.br`. Desligue o endereço `workers.dev` do Worker.
5. **Cloudflare Access.** No Zero Trust, Access, Applications, Add, Self-hosted:
   - domínio `crm.lazarete.com.br`;
   - política **Allow** só para o seu e-mail, com método **One-time PIN**;
   - ao salvar, copie a **Application Audience (AUD) Tag** e anote o nome do seu time (o trecho antes de `.cloudflareaccess.com`).
6. **Secrets do Worker** (Settings, Variables and Secrets): `CF_ACCESS_TEAM`, `CF_ACCESS_AUD` e `CRM_EMAIL_PERMITIDO` (o seu e-mail).

## Como saber que a fase 0 terminou

1. Abrir `https://crm.lazarete.com.br` em janela anônima: o Cloudflare pede o seu e-mail e envia um código.
2. Depois do código, aparece a página "CRM".
3. `https://crm.lazarete.com.br/api/saude` mostra `{"ok":true}`.
4. Um `curl` sem login ao mesmo endereço não devolve a página (o Access barra antes do app).
5. Um e-mail diferente do seu não recebe código.

## Desligar

Remova o aplicativo no Zero Trust e o domínio no Worker. O app, sozinho, continua recusando tudo.
