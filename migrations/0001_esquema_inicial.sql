CREATE TABLE etapas (
  id    TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 40 AND id NOT GLOB '*[^a-z0-9-]*'),
  nome  TEXT NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 60),
  ordem INTEGER NOT NULL UNIQUE CHECK (ordem >= 0),
  tipo  TEXT NOT NULL CHECK (tipo IN ('aberta','ganha','perdida')),
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0,1))
) STRICT;

CREATE TABLE origens (
  id    TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 40 AND id NOT GLOB '*[^a-z0-9-]*'),
  nome  TEXT NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 60),
  ordem INTEGER NOT NULL DEFAULT 0,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0,1))
) STRICT;

CREATE TABLE configuracoes (
  chave         TEXT PRIMARY KEY CHECK (length(chave) BETWEEN 1 AND 60 AND chave NOT GLOB '*[^a-z0-9_]*'),
  valor         TEXT NOT NULL CHECK (length(valor) <= 1000),
  atualizado_em TEXT NOT NULL
) STRICT;

CREATE TABLE contatos (
  id                      TEXT PRIMARY KEY CHECK (length(id) = 36),
  nome                    TEXT NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 120),
  email                   TEXT CHECK (email IS NULL OR (length(email) <= 254 AND email = lower(email) AND email LIKE '%_@_%')),
  telefone                TEXT CHECK (telefone IS NULL OR (length(telefone) BETWEEN 10 AND 15 AND telefone NOT GLOB '*[^0-9]*')),
  empresa                 TEXT CHECK (empresa IS NULL OR length(empresa) <= 120),
  segmento                TEXT CHECK (segmento IS NULL OR length(segmento) <= 80),
  origem_inicial          TEXT NOT NULL REFERENCES origens(id) ON DELETE RESTRICT,
  etapa_id                TEXT NOT NULL REFERENCES etapas(id) ON DELETE RESTRICT,
  valor_estimado_centavos INTEGER CHECK (valor_estimado_centavos IS NULL OR valor_estimado_centavos BETWEEN 0 AND 100000000000),
  proxima_acao_em         TEXT CHECK (proxima_acao_em IS NULL OR date(proxima_acao_em) IS proxima_acao_em),
  proxima_acao_texto      TEXT CHECK (proxima_acao_texto IS NULL OR length(trim(proxima_acao_texto)) BETWEEN 1 AND 200),
  texto_busca             TEXT NOT NULL,
  criado_em               TEXT NOT NULL,
  atualizado_em           TEXT NOT NULL,
  ultima_atividade_em     TEXT NOT NULL,
  retencao_avisado_em     TEXT,
  CHECK (email IS NOT NULL OR telefone IS NOT NULL),
  CHECK ((proxima_acao_em IS NULL) = (proxima_acao_texto IS NULL))
) STRICT;

CREATE UNIQUE INDEX contatos_email_unico    ON contatos(email)    WHERE email IS NOT NULL;
CREATE UNIQUE INDEX contatos_telefone_unico ON contatos(telefone) WHERE telefone IS NOT NULL;
CREATE INDEX contatos_etapa            ON contatos(etapa_id, atualizado_em DESC);
CREATE INDEX contatos_origem           ON contatos(origem_inicial);
CREATE INDEX contatos_proxima_acao     ON contatos(proxima_acao_em) WHERE proxima_acao_em IS NOT NULL;
CREATE INDEX contatos_criado           ON contatos(criado_em);
CREATE INDEX contatos_ultima_atividade ON contatos(ultima_atividade_em);

CREATE TABLE eventos (
  id            TEXT PRIMARY KEY CHECK (length(id) = 36),
  contato_id    TEXT NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN (
                  'contato_criado','formulario_enviado','whatsapp_enviado','whatsapp_recebido',
                  'reuniao','proposta_enviada','nota','etapa_alterada','proxima_acao_alterada',
                  'ganho','perda')),
  origem        TEXT CHECK (origem IS NULL OR length(origem) BETWEEN 1 AND 40),
  detalhe       TEXT CHECK (detalhe IS NULL OR length(detalhe) <= 2000),
  etapa_de      TEXT REFERENCES etapas(id) ON DELETE RESTRICT,
  etapa_para    TEXT REFERENCES etapas(id) ON DELETE RESTRICT,
  ocorrido_em   TEXT NOT NULL,
  registrado_em TEXT NOT NULL,
  CHECK ((tipo = 'etapa_alterada') = (etapa_para IS NOT NULL)),
  CHECK (tipo <> 'etapa_alterada' OR (etapa_de IS NOT NULL AND etapa_de <> etapa_para)),
  CHECK (tipo <> 'nota' OR detalhe IS NOT NULL)
) STRICT;

CREATE INDEX eventos_contato ON eventos(contato_id, ocorrido_em DESC, registrado_em DESC);
CREATE INDEX eventos_tipo    ON eventos(tipo, ocorrido_em);

-- Linha do tempo imutável: nada de UPDATE; DELETE só pela cascata ao apagar o contato.
CREATE TRIGGER eventos_sem_update BEFORE UPDATE ON eventos
BEGIN SELECT RAISE(ABORT, 'eventos sao imutaveis'); END;

CREATE TRIGGER eventos_sem_delete_avulso BEFORE DELETE ON eventos
WHEN EXISTS (SELECT 1 FROM contatos WHERE id = OLD.contato_id)
BEGIN SELECT RAISE(ABORT, 'evento so sai junto com o contato'); END;

CREATE TRIGGER eventos_atualizam_atividade AFTER INSERT ON eventos
BEGIN
  UPDATE contatos SET ultima_atividade_em = NEW.registrado_em
  WHERE id = NEW.contato_id AND ultima_atividade_em < NEW.registrado_em;
END;
