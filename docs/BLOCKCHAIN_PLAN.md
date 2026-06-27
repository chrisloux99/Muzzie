# Muzzie Blockchain Integration Plan

## 1. Tech Stack Additions

**Frontend (root package.json):**
```
npm install @stellar/stellar-sdk viem wagmi @tanstack/react-query
```

**Backend (server/):**
```
npm install stellar-sdk ethers
```

**Dev tooling (optional, contract deployment):**
```
npm install -D hardhat @openzeppelin/contracts
```

**Infrastructure:**
- Stellar: Testnet → Mainnet via Horizon API (no self-hosted node)
- Base: Sepolia testnet → Mainnet via free Alchemy/Infura RPC
- Optional IPFS/Pinata for NFT metadata + cover art

---

## 2. Smart Contracts

### 2A. Stellar MUZ Token (SEP-41)

Stellar assets are native tokens — no Solidity needed. MUZ is a custom asset issued via keypair.

**Accounts:**
- Issuer keypair: creates the MUZ asset
- Distribution keypair: holds supply, sells/transfers to users

**Core operations (via `@stellar/stellar-sdk`):**

| Function | Purpose |
|----------|-------------|
| `createMuzAsset()` | Establish MUZ on Stellar (issuer + distribution) |
| `trustMuz(userKeypair)` | User creates trustline before receiving MUZ |
| `transferMuz(from, to, amount)` | Standard Stellar payment op |
| `getMuzBalance(publicKey)` | Query Horizon for balance |
| `purchaseMuz(userId, fiatAmount)` | Server-side: charge fiat, transfer MUZ from distribution |

**Asset code:** `MUZ`

### 2B. Base NFT Contract (ERC-721 + EIP-2981)

Single Solidity contract. Each song = one tokenId, copies are minted to same tokenId (ERC-721 multi-token pattern via Enumerable).

**File:** `contracts/MuzzieNFT.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract MuzzieNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, IERC2981 {
    uint256 private _nextTokenId;

    struct TokenInfo {
        address creator;
        uint256 maxSupply;
        uint256 currentSupply;
        uint256 price;
        string songId;
    }

    mapping(uint256 => TokenInfo) public tokenInfos;
    mapping(string => uint256) public songToTokenId;
    mapping(uint256 => address) private _royaltyReceiver;
    mapping(uint256 => uint256) private _royaltyBps;

    event SongMinted(uint256 indexed tokenId, string songId, address creator, uint256 maxSupply);

    constructor(address initialOwner) ERC721("Muzzie Music NFT", "MUZNFT") Ownable(initialOwner) {}

    function mintSong(
        string calldata songId,
        string calldata uri,
        uint256 maxSupply,
        uint256 price,
        uint256 royaltyBps
    ) external returns (uint256) {
        require(songToTokenId[songId] == 0, "Already minted");
        require(royaltyBps <= 5000, "Royalty too high");

        uint256 tokenId = _nextTokenId++;
        songToTokenId[songId] = tokenId;
        tokenInfos[tokenId] = TokenInfo(msg.sender, maxSupply, 0, price, songId);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        _royaltyReceiver[tokenId] = msg.sender;
        _royaltyBps[tokenId] = royaltyBps;

        emit SongMinted(tokenId, songId, msg.sender, maxSupply);
        return tokenId;
    }

    function mintCopy(uint256 tokenId) external payable {
        TokenInfo storage info = tokenInfos[tokenId];
        require(info.currentSupply < info.maxSupply, "Sold out");
        require(msg.value >= info.price, "Insufficient payment");
        info.currentSupply++;
        _safeMint(msg.sender, tokenId);
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external view override returns (address, uint256)
    {
        return (_royaltyReceiver[tokenId], (salePrice * _royaltyBps[tokenId]) / 10000);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, IERC165, IERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
```

Deploy to Base Sepolia (testnet) then mainnet. Store contract address in `server/src/config/index.ts`.

---

## 3. Database Schema

New tables appended to migration string in `server/src/db/migrate.ts`:

```sql
-- Wallets: links Muzzie user to on-chain addresses
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stellar_public_key TEXT,
  stellar_secret_encrypted TEXT,
  base_address TEXT,
  base_private_key_encrypted TEXT,
  is_custodial INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Token transactions (MUZ)
CREATE TABLE IF NOT EXISTS muz_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  stellar_tx_hash TEXT,
  reference_id TEXT,
  reference_type TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  price_muz INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  started_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,
  auto_renew INTEGER DEFAULT 1,
  cancelled_at TEXT
);

-- NFT collections (per-song mint records)
CREATE TABLE IF NOT EXISTS nft_collections (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id),
  base_token_id INTEGER,
  contract_address TEXT,
  max_supply INTEGER NOT NULL,
  current_supply INTEGER DEFAULT 0,
  price_wei TEXT NOT NULL,
  royalty_bps INTEGER DEFAULT 1000,
  metadata_uri TEXT,
  cover_ipfs TEXT,
  status TEXT DEFAULT 'pending',
  minted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- NFT ownership (who owns copies)
CREATE TABLE IF NOT EXISTS nft_ownerships (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES nft_collections(id),
  owner_user_id TEXT REFERENCES users(id),
  owner_address TEXT NOT NULL,
  token_id INTEGER NOT NULL,
  tx_hash TEXT,
  purchased_at TEXT DEFAULT (datetime('now')),
  price_paid_wei TEXT
);

-- Creator earnings ledger
CREATE TABLE IF NOT EXISTS creator_earnings (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL,
  amount_muz TEXT NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Stream play log (for per-stream billing)
CREATE TABLE IF NOT EXISTS stream_plays (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  song_id TEXT NOT NULL REFERENCES songs(id),
  quality TEXT DEFAULT 'standard',
  cost_muz TEXT DEFAULT '0',
  paid INTEGER DEFAULT 0,
  played_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_muz_txn_user ON muz_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_muz_txn_status ON muz_transactions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_nft_collections_song ON nft_collections(song_id);
CREATE INDEX IF NOT EXISTS idx_nft_collections_creator ON nft_collections(creator_id);
CREATE INDEX IF NOT EXISTS idx_nft_ownerships_collection ON nft_ownerships(collection_id);
CREATE INDEX IF NOT EXISTS idx_nft_ownerships_owner ON nft_ownerships(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator ON creator_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_stream_plays_user ON stream_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_plays_song ON stream_plays(song_id);
```

---

## 4. Backend API Routes

### New files in `server/src/routes/`:

**`wallet.ts`** — Wallet management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wallet/create` | Generate Stellar + Base keypairs for user |
| GET | `/api/wallet` | Get user's wallet addresses + MUZ balance |
| GET | `/api/wallet/balance` | Refresh MUZ balance from Stellar |
| POST | `/api/wallet/deposit` | Initiate MUZ purchase (fiat → MUZ transfer) |
| POST | `/api/wallet/withdraw` | Transfer MUZ out to external address |
| GET | `/api/wallet/transactions` | Transaction history with pagination |

**`subscriptions.ts`** — Subscription tiers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/tiers` | List available tiers + pricing |
| POST | `/api/subscriptions/subscribe` | Subscribe to tier (deducts MUZ) |
| GET | `/api/subscriptions/current` | Get user's active subscription |
| POST | `/api/subscriptions/cancel` | Cancel auto-renewal |
| POST | `/api/subscriptions/renew` | Manual renewal |

**`nft.ts`** — NFT marketplace
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/nft/mint` | Create NFT collection for a song |
| GET | `/api/nft/marketplace` | Browse all NFT collections |
| GET | `/api/nft/:collectionId` | Get collection details + owners |
| POST | `/api/nft/:collectionId/buy` | Buy a copy (triggers Base tx) |
| GET | `/api/nft/owned` | Get NFTs owned by current user |
| GET | `/api/nft/created` | Get NFTs created by current user |
| POST | `/api/nft/:collectionId/resale` | List for resale |

**`earnings.ts`** — Creator earnings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/earnings/summary` | Total earnings by source |
| GET | `/api/earnings/history` | Detailed earning history |
| POST | `/api/earnings/withdraw` | Withdraw earnings to wallet |
| GET | `/api/earnings/stats` | Streams, sales, tips breakdown |

**`streaming.ts`** — Premium stream gating
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/streaming/play` | Log play + deduct MUZ if premium |
| GET | `/api/streaming/access/:songId` | Check user's access level for song |
| GET | `/api/streaming/quality/:songId` | Get available quality tiers |

### Register in `server/src/index.ts`:
```typescript
import walletRoutes from './routes/wallet.js';
import subscriptionRoutes from './routes/subscriptions.js';
import nftRoutes from './routes/nft.js';
import earningsRoutes from './routes/earnings.js';
import streamingRoutes from './routes/streaming.js';

app.use('/api/wallet', walletRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/streaming', streamingRoutes);
```

### Config additions in `server/src/config/index.ts`:
```typescript
blockchain: {
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    issuerSecret: process.env.MUZ_ISSUER_SECRET || '',
    distributionSecret: process.env.MUZ_DISTRIBUTION_SECRET || '',
    muzAssetCode: 'MUZ',
  },
  base: {
    rpcUrl: process.env.BASE_RPC_URL || 'https://sepolia.base.org',
    nftContractAddress: process.env.NFT_CONTRACT_ADDRESS || '',
    deployerKey: process.env.BASE_DEPLOYER_KEY || '',
    chainId: parseInt(process.env.BASE_CHAIN_ID || '84532'),
  },
  encryption: {
    key: process.env.WALLET_ENCRYPTION_KEY || '',
  },
},
```

---

## 5. Frontend Components

### New files in `components/`:

**`WalletButton.tsx`** — Header bar wallet indicator
- Shows MUZ balance badge
- Click opens wallet panel
- Integrates with AuthContext

**`WalletPanel.tsx`** — Full wallet management
- Stellar address display (truncated)
- Base address display
- MUZ balance with refresh
- Deposit / Withdraw buttons
- Transaction history list

**`SubscriptionBanner.tsx`** — Shown when free user tries premium content
- Tier comparison cards (Free / Pro / Creator)
- "Subscribe for X MUZ/month" CTA
- Current plan indicator

**`NFTMarketplace.tsx`** — Browse + buy NFTs
- Grid of NFT collection cards
- Cover art, title, creator, price, copies remaining
- Buy button (requires Base wallet connected)
- Filters: genre, price range, availability

**`NFTDetail.tsx`** — Single NFT collection view
- Song preview (30s clip for non-owners, full for owners)
- Ownership info, royalty percentage
- Buy/resale actions
- Owner list

**`MintNFTModal.tsx`** — Creator mints NFT from a song
- Select song → set max supply, price (ETH), royalty %
- Preview metadata
- Confirm → calls `/api/nft/mint` → triggers Base transaction
- Progress indicator during minting

**`CreatorDashboard.tsx`** — Earnings overview
- Total MUZ earned (all time + this month)
- Breakdown: streams / NFT sales / tips
- Withdraw button
- Chart: earnings over time

**`PremiumGate.tsx`** — Wraps content requiring subscription/payment
- Props: `requiredTier`, `fallback`
- Checks user subscription level
- Shows upgrade prompt if insufficient

**`QualitySelector.tsx`** — In-player quality picker
- Standard (free) / High (premium) toggle
- Shows MUZ cost per play for premium

### Context addition:

**`context/BlockchainContext.tsx`**
```typescript
interface BlockchainContextType {
  wallet: Wallet | null;
  muzBalance: string;
  subscription: Subscription | null;
  nfts: NFTOwnership[];
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
  createWallet: () => Promise<void>;
  subscribe: (tier: string) => Promise<void>;
}
```

Wrapped around app in `index.tsx` alongside existing AuthProvider, I18nProvider, ResponsiveProvider.

### New types in `types.ts`:

```typescript
export interface Wallet {
  stellarPublicKey: string;
  baseAddress: string;
  isCustodial: boolean;
}

export interface MUZTransaction {
  id: string;
  type: 'purchase' | 'stream_payment' | 'subscription' | 'tip' | 'nft_sale' | 'creator_earning' | 'withdrawal';
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  stellarTxHash?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  tier: 'free' | 'pro' | 'creator';
  priceMuz: number;
  status: string;
  expiresAt?: string;
}

export interface NFTCollection {
  id: string;
  songId: string;
  creatorId: string;
  baseTokenId: number;
  maxSupply: number;
  currentSupply: number;
  priceWei: string;
  royaltyBps: number;
  status: string;
}

export interface NFTOwnership {
  id: string;
  collectionId: string;
  ownerAddress: string;
  tokenId: number;
  txHash: string;
  purchasedAt: string;
}

export interface CreatorEarnings {
  totalMuz: string;
  bySource: { streams: string; nftSales: string; tips: string };
  history: Array<{ type: string; amount: string; date: string }>;
}

export type View = 'create' | 'library' | 'training' | 'profile' | 'song' | 'playlist' | 'search' | 'news' | 'wallet' | 'marketplace' | 'earnings';
```

---

## 6. Integration Points

### Player.tsx — Premium streaming gate

In `Player.tsx`, before playing a song:

1. Call `GET /api/streaming/access/:songId` to check user's access
2. If `access === 'free'`: serve standard quality (existing audio URL)
3. If `access === 'premium'` and user has subscription or MUZ: serve high-quality, call `POST /api/streaming/play` to log + deduct
4. If insufficient: show `SubscriptionBanner` or "Buy X MUZ" modal

Specific change in `Player.tsx` around line ~137 (the `handleDownload` area) and the play toggle logic — wrap with access check:

```typescript
const handlePlay = async () => {
  if (!currentSong) return;
  const access = await streamingApi.checkAccess(currentSong.id, token);
  if (access.requiresPayment && !access.hasAccess) {
    setShowPaymentModal(true);
    return;
  }
  onTogglePlay();
  if (access.hasAccess) {
    streamingApi.logPlay(currentSong.id, access.quality, token);
  }
};
```

### SongProfile.tsx — NFT ownership badge

Show NFT badge on song profiles that have been minted. Display copy count, "Own this NFT" button if user has one.

### App.tsx — New views

Add `'wallet'`, `'marketplace'`, `'earnings'` to the View type. Wire into the existing manual routing system (`history.pushState` + `popstate`):

```typescript
case 'wallet':
  return <WalletPanel />;
case 'marketplace':
  return <NFTMarketplace />;
case 'earnings':
  return <CreatorDashboard />;
```

### Sidebar.tsx — Navigation items

Add wallet, marketplace, and earnings links to the sidebar navigation.

---

## 7. Phased Implementation

### Phase 1: Wallet + Token (Weeks 1-3)

**Goal:** Users can create wallets, hold MUZ, see balances.

1. Install `@stellar/stellar-sdk` + `viem` + `wagmi`
2. Add wallet + muz_transactions tables to migrate.ts
3. Implement `server/src/routes/wallet.ts` (create, balance, deposit, history)
4. Implement Stellar service layer (`server/src/services/stellar.ts`) with trustline + transfer logic
5. Create `WalletButton.tsx` + `WalletPanel.tsx`
6. Add `BlockchainContext.tsx` with wallet state
7. Add `.env` variables for Stellar keys
8. Test: create wallet, fund with testnet XLM, establish trustline, receive MUZ

### Phase 2: Premium Streaming (Weeks 4-6)

**Goal:** Free tier = standard quality, paid = high quality. Subscriptions work.

1. Add subscriptions + stream_plays tables
2. Implement `server/src/routes/subscriptions.ts` + `server/src/routes/streaming.ts`
3. Create `SubscriptionBanner.tsx` + `PremiumGate.tsx` + `QualitySelector.tsx`
4. Modify `Player.tsx` to check access before play
5. Modify `songsApi.trackPlay()` to handle billing
6. Add subscription tier config (Free: standard / Pro: 500 MUZ/mo / Creator: 1500 MUZ/mo)
7. Test: subscribe, play premium song, verify MUZ deducted, verify free user blocked from high quality

### Phase 3: NFT Marketplace (Weeks 7-10)

**Goal:** Creators mint NFTs, buyers purchase, royalties work on resale.

1. Deploy `MuzzieNFT.sol` to Base Sepolia via Hardhat
2. Add nft_collections + nft_ownerships + creator_earnings tables
3. Implement `server/src/services/base.ts` (ethers.js contract interaction)
4. Implement `server/src/routes/nft.ts` + `server/src/routes/earnings.ts`
5. Create `MintNFTModal.tsx` + `NFTMarketplace.tsx` + `NFTDetail.tsx` + `CreatorDashboard.tsx`
6. Add IPFS metadata upload (or use centralized `/api/nft/metadata/:id` endpoint)
7. Wire marketplace into Sidebar navigation
8. Test: mint song as NFT, buy copy, verify ownership, test resale with royalty

---

## 8. File Summary

| File | Action | Purpose |
|------|--------|---------|
| `server/src/db/migrate.ts` | Modify | Add 7 new tables + indexes |
| `server/src/config/index.ts` | Modify | Add blockchain config block |
| `server/src/index.ts` | Modify | Register 5 new route modules |
| `server/src/routes/wallet.ts` | Create | Wallet CRUD + Stellar ops |
| `server/src/routes/subscriptions.ts` | Create | Subscription management |
| `server/src/routes/nft.ts` | Create | NFT mint/buy/browse |
| `server/src/routes/earnings.ts` | Create | Creator earnings |
| `server/src/routes/streaming.ts` | Create | Stream access control |
| `server/src/services/stellar.ts` | Create | Stellar SDK wrapper |
| `server/src/services/base.ts` | Create | ethers.js Base contract wrapper |
| `server/src/services/encryption.ts` | Create | AES encrypt/decrypt for wallet keys |
| `contracts/MuzzieNFT.sol` | Create | ERC-721 + EIP-2981 contract |
| `hardhat.config.ts` | Create | Contract deployment config |
| `types.ts` | Modify | Add blockchain types |
| `services/api.ts` | Modify | Add wallet/nft/subscription/earnings API clients |
| `context/BlockchainContext.tsx` | Create | Wallet + subscription state |
| `components/WalletButton.tsx` | Create | Header wallet indicator |
| `components/WalletPanel.tsx` | Create | Full wallet management UI |
| `components/SubscriptionBanner.tsx` | Create | Tier upgrade prompts |
| `components/PremiumGate.tsx` | Create | Content access wrapper |
| `components/QualitySelector.tsx` | Create | Stream quality picker |
| `components/NFTMarketplace.tsx` | Create | Browse NFTs |
| `components/NFTDetail.tsx` | Create | Single NFT view |
| `components/MintNFTModal.tsx` | Create | Mint NFT from song |
| `components/CreatorDashboard.tsx` | Create | Earnings overview |
| `components/Sidebar.tsx` | Modify | Add nav items |
| `App.tsx` | Modify | Add 3 new views + BlockchainProvider |
| `index.tsx` | Modify | Wrap with BlockchainProvider |
| `.env` | Modify | Add blockchain env vars |
| `.env.example` | Modify | Document new env vars |
| `package.json` | Modify | Add blockchain deps |
| `server/package.json` | Modify | Add server-side blockchain deps |
