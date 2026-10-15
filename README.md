# whatsapp-cloud-api-node

Small, tested Node.js + TypeScript service for the official
[WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
(Meta): outbound text messages and the webhook (verification + receiving).

Escrito em português abaixo; the code and tests are the documentation.

## O que este projeto mostra

- Node 20 + TypeScript com `strict` e `noUncheckedIndexedAccess`.
- Camadas separadas: HTTP (`src/app.ts`), contratos de entrada com Zod
  (`src/schemas.ts`), configuração (`src/config.ts`) e o provider
  externo (`src/services/whatsapp.ts`).
- `fetch` entra como dependência opcional da aplicação, então a
  integração é testada sem chamar a Meta.
- Modo `DRY_RUN`: responde sem enviar nada, para teste local seguro.
- Testes com Vitest e Supertest (`tests/api.test.ts`, 8 casos):
  health, verificação de webhook válida e inválida, recebimento,
  corpo inválido, envio com `fetch` injetado, dry-run e erro do provider.
- CI (`.github/workflows/ci.yml`): typecheck, testes, build e um teste
  ponta a ponta local em dry-run.

## Endpoints

- `GET /health` retorna `{ "status": "ok" }`.
- `GET /webhook` responde ao desafio de verificação da Meta
  (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- `POST /webhook` recebe eventos e retorna `{ "received": true }`.
- `POST /messages/text` envia texto: `{ "to": "5565999990000", "body": "olá" }`.

Corpo inválido retorna 400. Falha do provider retorna 502.

## Rodar

```bash
npm install
npm run dev
```

Variáveis de ambiente (nenhuma é obrigatória em `DRY_RUN`):

- `PORT` (padrão 3000)
- `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`: credenciais do app na Meta
- `WHATSAPP_VERIFY_TOKEN`: texto que você inventa e cadastra no painel
- `WHATSAPP_GRAPH_VERSION` (padrão `v22.0`)
- `WHATSAPP_APP_SECRET`: reservado para a validação de assinatura
- `DRY_RUN=true`: não chama a Meta

## Verificação

```bash
npm run typecheck
npm test
npm run build
npm run test:local   # sobe o servidor e exercita tudo em dry-run
```

## Limites conhecidos

- Não valida `X-Hub-Signature-256` ainda (`WHATSAPP_APP_SECRET` está
  reservado para isso).
- Sem templates, mídia, fila, retry nem persistência de status.
- Não foi testado contra a API real da Meta neste repositório: a
  integração é coberta por `fetch` injetado.

## Licença

MIT.
