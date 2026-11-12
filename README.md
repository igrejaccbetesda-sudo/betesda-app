# Guia Betesda

Aplicação Next.js 14 com Route Handlers server-side. O frontend usa APIs locais em `/api/*`; os handlers chamam Google Apps Script sem expor suas credenciais ao navegador.

## Desenvolvimento

```powershell
npm install
npm run dev
```

O cookie administrativo exige HTTPS. Valide login em preview HTTPS do Netlify; não desative `Secure` em produção.

## Variáveis privadas

Configure no ambiente local e no painel Netlify, sem prefixo `NEXT_PUBLIC_`:

- `APPS_SCRIPT_WEB_APP_URL`: URL do Web App.
- `APPS_SCRIPT_API_SECRET`: segredo correspondente à propriedade de script `API_SECRET`.
- `ADMIN_SESSION_SECRET`: segredo aleatório com pelo menos 32 bytes para assinar sessões.

Não coloque esses valores em commits, respostas HTTP ou logs. O código Apps Script não gera nem altera o segredo existente.

## Hashes de senha administrativa

O login aceita somente hashes no formato `scrypt$16384$8$1$<64 caracteres hexadecimais>` e salt hexadecimal de 16 bytes. O formato previamente armazenado não foi disponibilizado para validação; gere hashes novos antes de ativar o login:

```powershell
node scripts/reset-admin-password.mjs
```

O utilitário solicita senha sem exibi-la e imprime hash/salt para atualização manual na linha correta da aba `administradores`. Não compartilhe esses valores.

## Google Apps Script

`apps-script/Code.gs` é um artefato local para revisão e substituição manual no editor do Google Apps Script. Ele não atualiza nem publica o projeto remoto.

1. Confirme a propriedade existente `API_SECRET` e as permissões do script.
2. Revise o código e a compatibilidade das abas existentes.
3. Atualize o código no editor e publique uma nova versão do Web App.
4. Configure as três variáveis privadas acima no Netlify.

O script não cria, apaga ou recria abas. Somente arquivos individuais destinados à exibição são compartilhados por link; a planilha e a pasta permanecem privadas.

## Testes locais

```powershell
npm run build
npm run lint
node --experimental-strip-types --test tests/validation.test.mjs
```

Os testes locais não acessam nem alteram a planilha ou o Drive de produção. Valide URLs de imagem e login em preview HTTPS antes de ativar o site.
