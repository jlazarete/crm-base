INSERT INTO etapas (id, nome, ordem, tipo) VALUES
 ('novo','Novo',10,'aberta'), ('contato-feito','Contato feito',20,'aberta'),
 ('diagnostico-agendado','Diagnóstico agendado',30,'aberta'), ('diagnostico-feito','Diagnóstico feito',40,'aberta'),
 ('proposta-enviada','Proposta enviada',50,'aberta'), ('ganho','Ganho',60,'ganha'), ('perdido','Perdido',70,'perdida');

INSERT INTO origens (id, nome, ordem) VALUES
 ('site-formulario','Formulário do site',10), ('site-diagnostico','Diagnóstico do site',20),
 ('whatsapp-direto','WhatsApp direto',30), ('indicacao','Indicação',40), ('instagram','Instagram',50), ('outra','Outra',90);

INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES
 ('fuso_horario','America/Sao_Paulo', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('etapa_inicial','novo',              strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('retencao_meses','24',               strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('retencao_aviso_dias','30',          strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('whatsapp_mensagem_padrao','Olá, {primeiro_nome}! Tudo bem?', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
