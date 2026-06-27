import StellarSdk from 'stellar-sdk';
import { config } from '../config/index.js';

const server = new StellarSdk.Horizon.Server(
  config.blockchain.stellar.horizonUrl
);

export function createKeypair(): { publicKey: string; secret: string } {
  const keypair = StellarSdk.Keypair.random();
  return { publicKey: keypair.publicKey(), secret: keypair.secret() };
}

export async function fundTestnet(publicKey: string): Promise<void> {
  if (config.blockchain.stellar.network !== 'testnet') return;
  try {
    await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  } catch (err) {
    console.error('Failed to fund testnet account:', err);
  }
}

export async function trustMuzAsset(secret: string): Promise<string> {
  const keypair = StellarSdk.Keypair.fromSecret(secret);
  const account = await server.loadAccount(keypair.publicKey());
  const issuerPublicKey = StellarSdk.Keypair.fromSecret(
    config.blockchain.stellar.issuerSecret
  ).publicKey();

  const muz = new StellarSdk.Asset(
    config.blockchain.stellar.muzAssetCode,
    issuerPublicKey
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: await server.fetchBaseFee(),
    networkPassphrase: config.blockchain.stellar.network === 'testnet'
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC,
  })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: muz }))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

export async function transferMuz(
  fromSecret: string,
  toPublicKey: string,
  amount: string
): Promise<string> {
  const fromKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
  const account = await server.loadAccount(fromKeypair.publicKey());
  const issuerPublicKey = StellarSdk.Keypair.fromSecret(
    config.blockchain.stellar.issuerSecret
  ).publicKey();

  const muz = new StellarSdk.Asset(
    config.blockchain.stellar.muzAssetCode,
    issuerPublicKey
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: await server.fetchBaseFee(),
    networkPassphrase: config.blockchain.stellar.network === 'testnet'
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: toPublicKey,
      asset: muz,
      amount,
    }))
    .setTimeout(30)
    .build();

  tx.sign(fromKeypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

export async function getMuzBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const issuerPublicKey = StellarSdk.Keypair.fromSecret(
      config.blockchain.stellar.issuerSecret
    ).publicKey();

    const balance = account.balances.find(
      (b: any) =>
        b.asset_type !== 'native' &&
        b.asset_code === config.blockchain.stellar.muzAssetCode &&
        b.asset_issuer === issuerPublicKey
    );
    return balance ? balance.balance : '0';
  } catch {
    return '0';
  }
}

export async function getNativeBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const native = account.balances.find((b: any) => b.asset_type === 'native');
    return native ? native.balance : '0';
  } catch {
    return '0';
  }
}

export async function distributeMuz(
  toPublicKey: string,
  amount: string
): Promise<string> {
  const distSecret = config.blockchain.stellar.distributionSecret;
  if (!distSecret) throw new Error('Distribution secret not configured');
  return transferMuz(distSecret, toPublicKey, amount);
}

export { server };
