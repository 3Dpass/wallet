# 3DPass Web3 Wallet
The wallet is a WEB3 UI for ["The Ledger of Things" (LoT)](https://github.com/3Dpass/3DP), which is a non-custodial js app that allows for import of user accounts directly or its injection from a third-party keychain extension (ex. from the [polka js](https://polkadot.js.org/extension/) extension).

The wallet page: https://wallet.3dpass.org/

[![DeepSource](https://app.deepsource.com/gh/3Dpass/wallet.svg/?label=resolved+issues&show_trend=true&token=z_DO8FXnvAQwY3HBOodOfScB)](https://app.deepsource.com/gh/3Dpass/wallet/)

## Interaction
The wallet interacts with the blockchain [Node](https://github.com/3Dpass/3DP) available via the RPC API websocket endpoint directly from your web browser. You can change the RPC API endpoint in Settings. Explore these ["How To" tips](https://3dpass.org/mainnet#wallet) for more detail.

### The LoT RPC API Endpoints:
- Mainnet `wss://rpc.3dpscan.io`
- Testnet `wss://test-rpc.3dpass.org`
- Local Node `wss://127.0.0.1:9944`

### Transaction history
The wallet fetches transaction history available for finalized blocks via the [Block Explorer graphql server](https://explorer-api.3dpscan.io/graphql/) API.

## Installation

```sh
pnpm install
```

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

Now you'll need to pick up a host to deploy it to.

## Localization

In order for the application to support new local translation on the UI, it is required that you create a JSON file with the language code for its name (e.g., "en.json" for English) and place it into the translations folder. The JSON file must contain key-value pairs where the keys are the identifiers used in the application code, and the values are the translated text in that language.

Follow these steps to add a new local translation:

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

Copyright (C) 2022-2025  3DPass 3dpass.org
