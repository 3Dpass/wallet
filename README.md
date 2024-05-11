# 3DPass Web Wallet
3DPass wallet is a WEB3 browser light wallet UI for ["The Ledger of Things"](https://github.com/3Dpass/3DP). It might also be used as a wallet app for [Substrate](https://github.com/paritytech/substrate)-based blockchains.

The wallet page: https://wallet.3dpass.org/

## Interaction
The wallet interacts directly from your browser to the blockchain [Node](https://github.com/3Dpass/3DP) using either public or private API websocket endpoint.

### 3DPass API Endpoints:
- Mainnet `wss://rpc.3dpscan.io`
- Mainnet `wss://rpc2.3dpass.org`
- Testnet `wss://test-rpc.3dpass.org`

In order to connect the wallet to the local Node you can set up `wss://127.0.0.1:9944`

## Explorer features Integration
The wallet reaches out to [Block Explorer](https://github.com/3Dpass/explorer) API for block detais.

## Development

From your terminal:

```sh
pnpm dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Deployment

First, build your app for production:

```sh
pnpm build
```

Then run the app in production mode:

```sh
pnpm start
```

Now you'll need to pick a host to deploy it to.

## Adding New Languages

To add support for a new language in the application, you need to create a new JSON file with the language code as the name (e.g., "en.json" for English) and place it in the translations folder. The JSON file should contain key-value pairs where the keys are the identifiers used in the application code, and the values are the translated text for that language.

Follow these steps to add a new language:

Go to the translations folder.

Create a new JSON file with the appropriate language code as the name (e.g., "fr.json" for French).

Open the newly created file and add the translations using the following format:

```json
{
  "translation": {
    "commons": {
      "lbl_btn_cancel": "Cancel",
      "lbl_btn_delete": "Delete",
      "lbl_btn_copy": "Copy",
      "lbl_btn_paste": "Paste",
      "lbl_btn_close": "Close",
  ...
}
```

Replace the English text with the translated text for the corresponding language.

Save the file.

Open the root.tsx file located in the app directory of the project.

At the top of the file, add an import statement for the new JSON file. Let's assume the new language is Italian ("it"), and the file name is "it.json":

```ts
import it from "./translations/it.json";

i18next
  .use(lngDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // Add the imported language to resource object
    resources: {
      en,
      es,
      fr,
      pt,
      it, // Add the new language to the resources object
    },
    ...
  });
```
Save the root.tsx file.

After completing these steps, the application should be able to load and use the translations for the newly added language.

## Copyright
3DPass web wallet

Copyright (C) 2022-2023  3DPass 3dpass.org
