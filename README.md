# whatsapp-cloud-api-node

Small, tested Node.js + TypeScript service for the official
[WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
(Meta): outbound text messages and the webhook (verification + receiving).

Escrito em português abaixo; the code and tests are the documentation.

## O que este projeto mostra

- Node 22 + TypeScript com `strict` e `noUncheckedIndexedAccess`.
- Camadas separadas: HTTP (`src/app.ts`), contratos de entrada com Zod
  (`src/schemas.ts`), configuração (`src/config.ts`) e o provider
  externo (`src/services/whatsapp.ts`).
- `fetch` entra como dependência opcional da aplicação, então a
  integração é testada sem chamar a Meta.
- Modo `DRY_RUN`: responde sem enviar nada, para teste local seguro.
- Testes com Vitest e Supertest (`tests/api.test.ts`, 14 casos):
  health, verificação de webhook válida e inválida, assinatura do webhook
  (ausente, errada, de outro corpo), chave de envio, corpo inválido,
  envio com `fetch` injetado, dry-run, erro do provider e validação de config e log sem token nem query.
- Segurança: `POST /webhook` confere `X-Hub-Signature-256` (HMAC-SHA256 sobre
  o corpo cru); `POST /messages/text` exige `Authorization: Bearer`; as
  comparações são em tempo constante; o corpo do webhook (telefone e texto de
  terceiros) e a query da URL (que traz o `hub.verify_token`) não vão para o
  log, e cookie e `Authorization` saem mascarados; sem `WHATSAPP_APP_SECRET` e `SEND_API_KEY`
  o serviço não sobe fora do dry-run.
- CI (`.github/workflows/ci.yml`): typecheck, testes, build e um teste
  ponta a ponta local em dry-run.

## Endpoints

- `GET /health` retorna `{ "status": "ok" }`.
- `GET /webhook` responde ao desafio de verificação da Meta
  (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- `POST /webhook` recebe eventos (assinatura obrigatória) e retorna
  `{ "received": true }`. Assinatura inválida retorna 401.
- `POST /messages/text` envia texto, com `Authorization: Bearer <SEND_API_KEY>`:
  `{ "to": "5565999990000", "body": "olá" }`.

Chave ausente retorna 401, corpo inválido 400 e falha do provider 502.

## Rodar

```bash
npm install
npm run dev
```

Variáveis de ambiente (em `DRY_RUN` só `WHATSAPP_VERIFY_TOKEN` é obrigatório):

- `PORT` (padrão 3000)
- `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`: credenciais do app na Meta
- `WHATSAPP_VERIFY_TOKEN` (sempre obrigatório): texto que você inventa e cadastra no painel
- `SEND_API_KEY`: chave que seus clientes mandam em `Authorization: Bearer`
- `WHATSAPP_GRAPH_VERSION` (padrão `v22.0`)
- `WHATSAPP_APP_SECRET`: valida a assinatura do webhook
- `DRY_RUN=true`: não chama a Meta

## Verificação

```bash
npm run typecheck
npm test
npm run build
npm run test:local   # sobe o servidor e exercita tudo em dry-run
```

## Limites conhecidos

- Sem limite de taxa nem rotação de chave de envio.
- Sem templates, mídia, fila, retry nem persistência de status.
- Não foi testado contra a API real da Meta neste repositório: a
  integração é coberta por `fetch` injetado.

## Licença

MIT.
