# Resumo: "O CRM Morreu. Eu Construí uma Máquina de Receita com IA no Lugar."

- Canal: Kelvin Cleto (Acelera 360)
- Vídeo: https://www.youtube.com/watch?v=Dn4LHBxypa8 (cerca de 20 minutos)
- Transcrição completa: `o-crm-morreu-eu-construi-uma-maquina-de-receita-com-ia-no-lu/transcricao.md`

> [!NOTE]
> O vídeo é conceitual e promocional. Não ensina a construir um CRM passo a passo: apresenta a arquitetura de uma plataforma própria (Growth IA / "Groovy AI", na legenda automática) e termina com a venda da Acelera 360. Os valores de contratos citados (em dólares) e "mais de 40 nichos validados" são afirmações do autor, sem fonte, e não devem ser citados.

## A tese

Um CRM comum só responde em que etapa o lead está ("o João aguarda proposta"). Não conta como o João chegou até ali. A jornada real não é linear: o lead vê anúncio, entra na página, sai, volta, agenda, cancela, preenche formulário, e só em algum momento compra. O valor está em **rastrear a jornada inteira**, para entender o comportamento do lead e saber se a operação de vendas funciona.

## As cinco camadas ("máquina de receita")

1. **Atração**: de onde vem o interesse (vídeo orgânico, anúncio, e-mail).
2. **Captação**: página de captura, formulário ou conversa direta no WhatsApp.
3. **Relacionamento**: grupo de WhatsApp, sequência de e-mail, reaquecimento de quem não agendou.
4. **Conversão**: reunião, contrato ou link de pagamento.
5. **Medição**: fecha a leitura (resultado por peça, por custo e por funil).

Cada peça é um bloco ligado por condições ("se agendou, vai para a conversão; se não, entra na jornada de reaquecimento"), montado num construtor visual.

## Modelo de dados descrito

- **Contato** (a pessoa), sempre ligado a uma **jornada**.
- **Eventos** disparados pelo contato na jornada: impressão, clique, visita à página, formulário, entrada no WhatsApp, participação em webinário, reunião, ganho ou perda.
- **Origem**: fonte de aquisição (Meta Ads, Google Ads, YouTube, Instagram, SEO, site, e-mail, WhatsApp) e os recursos (campanha, conjunto, criativo, página, formulário).
- **Estratégia**: agrupa as peças de um canal (por exemplo, o canal do YouTube).
- **Anônimo para identificado**: um pixel próprio registra a navegação antes do cadastro; quando o lead preenche o formulário, o histórico anterior é ligado a ele.
- **Economics**: quanto foi vendido, custo direto, resultado e cobertura, o que exige que os disparos aconteçam dentro da própria ferramenta.
- **Memória**: a base aprende com as jornadas. O próximo passo do autor é a IA tomar decisões na execução.

## Exemplo de jornada citado

Assistiu a um vídeo no YouTube, inscreveu-se num webinário, preencheu formulário, entrou num grupo de WhatsApp, recebeu lembrete, assistiu a 75% do webinário (54 minutos), clicou no CTA, fez uma call, não fechou, viu outro vídeo, preencheu outro formulário, fez a segunda call e fechou.

## Funcionalidades mostradas na plataforma

Kanban e pipelines de vendas, atendimento (conversas), automações e agentes de IA, agenda dos vendedores, campanhas multicanal (WhatsApp, e-mail), conexões (WhatsApp oficial e não oficial, Instagram, Facebook, LinkedIn, Meta Ads, e-mail, telefonia via Twilio).

## O que aproveitar para um CRM genérico

- Linha do tempo de eventos por contato é o centro do sistema, mais importante que o kanban.
- Origem registrada em cada evento (campo de atribuição), e contato anônimo que vira identificado.
- Funil como etapas configuráveis, não fixas.
- Medição por origem e por peça, com custo quando existir.
- Integrações como camadas opcionais (WhatsApp, formulário, e-mail), não requisito do núcleo.

## O que não vale para o nosso caso (até decidir)

- Construtor visual de máquinas, campanhas multicanal, telefonia e pixel próprio: grande demais para a primeira versão e, no caso do pixel, exige decidir consentimento e privacidade (LGPD, e o site hoje não tem cookies de marketing).
- Agentes de IA decidindo a execução: o próprio autor diz que é o próximo passo, não algo pronto.
