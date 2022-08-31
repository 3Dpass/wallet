# 3DP Wallet
3DPass wallet is a WEB browser light wallet UI for ["The Ledger of Things"](https://github.com/3Dpass/3DP). It might also be used as a wallet app for [Substrate](https://github.com/paritytech/substrate)-based blockchains.

The wallet page: https://wallet.3dpass.org/

## Interaction
The wallet interacts directly from your browser to the blockchain [Node](https://github.com/3Dpass/3DP) using either public or private API websocket endpoint. 

### 3DPass API Endpoints:
- Mainnet `wss://rpc.3dpass.org`
- Testnet `wss://rpc2.3dpass.org`

In order to connect the wallet to the local Node you can set up `wss://127.0.0.1:9944` 

## Explorer features Integration
The wallet reaches out to [Block Explorer](https://github.com/3Dpass/explorer) API for block detais.

## Development

From your terminal:

```sh
npm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.
