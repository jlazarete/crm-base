<h1 align="center">crm-base</h1>

<p align="center">CRM genérico, centrado na jornada de eventos de cada contato, para ser personalizado por negócio.</p>

---

## Estado

Fase 0 (esqueleto e acesso protegido) e fase 1 (contatos, etapas, linha do tempo e tela Hoje) escritas e testadas localmente; falta colocar no ar. O contexto está em [CONTEXT.md](CONTEXT.md) e as pendências em [BACKLOG.md](BACKLOG.md).

## Estrutura

```
crm-base/
├── migrations/        # esquema do banco D1
├── wrangler.jsonc     # banco D1 (fonte única)
├── CLAUDE.md          # regras para sessões de IA
├── CONTEXT.md         # contexto, decisões e perguntas abertas
├── BACKLOG.md         # pendências
├── src/ tests/        # app (TanStack Start) e testes
└── docs/
    ├── README.md      # índice dos documentos
    ├── plano-crm-base.md
    ├── fase-0-passo-a-passo.md
    ├── fase-1.md
    └── referencias/   # transcrições e resumos que embasam o projeto
```

## Documentação de apoio

- [Índice dos documentos](docs/README.md)
- [Plano do crm-base](docs/plano-crm-base.md)
- [Fase 0, passo a passo](docs/fase-0-passo-a-passo.md)
- [Fase 1: contatos e tela Hoje](docs/fase-1.md)
- [Resumo do vídeo de referência](docs/referencias/Dn4LHBxypa8/resumo.md)
