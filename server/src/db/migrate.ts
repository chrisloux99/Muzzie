import { db } from './pool.js';

const migrations = `
-- Users table (simplified - no credits, no stripe, no tiers)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lyrics TEXT,
  style TEXT,
  caption TEXT,
  cover_url TEXT,
  audio_url TEXT,
  duration INTEGER,
  bpm INTEGER,
  key_scale TEXT,
  time_signature TEXT,
  tags TEXT DEFAULT '[]',
  is_public INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  has_video INTEGER DEFAULT 0,
  video_url TEXT,
  generation_params TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Generation jobs table (simplified - no credit_reserved)
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acestep_task_id TEXT,
  status TEXT DEFAULT 'pending',
  params TEXT,
  result TEXT,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Playlist songs junction table
CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (playlist_id, song_id)
);

-- Liked songs table
CREATE TABLE IF NOT EXISTS liked_songs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  liked_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, song_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Followers table
CREATE TABLE IF NOT EXISTS followers (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Reference tracks (uploaded audio for use as references)
CREATE TABLE IF NOT EXISTS reference_tracks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  duration INTEGER,
  file_size_bytes INTEGER,
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Contact submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at);
CREATE INDEX IF NOT EXISTS idx_songs_is_public ON songs(is_public);
CREATE INDEX IF NOT EXISTS idx_songs_is_featured ON songs(is_featured);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_song_id ON comments(song_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_reference_tracks_user_id ON reference_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_tracks_created_at ON reference_tracks(created_at);
`;

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

function migrate(): void {
  console.log('Running SQLite database migrations...');

  try {
    // Execute the entire migration script at once
    db.exec(migrations);
    console.log('Migrations completed successfully!');
  } catch (error) {
    // Check if it's just "already exists" errors
    const errorMsg = String(error);
    if (errorMsg.includes('already exists')) {
      console.log('Tables already exist, migrations completed!');
    } else {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

// Run migrations
migrate();