export interface Song {
  id: string;
  title: string;
  lyrics: string;
  style: string;
  coverUrl: string;
  duration: string;
  createdAt: Date;
  isGenerating?: boolean;
  queuePosition?: number; // Position in queue (undefined = actively generating, number = waiting in queue)
  progress?: number;
  stage?: string;
  generationParams?: any;
  tags: string[];
  audioUrl?: string;
  isPublic?: boolean;
  likeCount?: number;
  viewCount?: number;
  userId?: string;
  creator?: string;
  creator_avatar?: string;
  ditModel?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  cover_url?: string;
  songIds?: string[];
  isPublic?: boolean;
  is_public?: boolean;
  user_id?: string;
  creator?: string;
  created_at?: string;
  song_count?: number;
  songs?: any[];
}

export interface Comment {
  id: string;
  songId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
}

export interface GenerationParams {
  // Mode
  customMode: boolean;

  // Simple Mode
  songDescription?: string;

  // Custom Mode
  prompt: string;
  lyrics: string;
  style: string;
  title: string;
  ditModel?: string;

  // Common
  instrumental: boolean;
  vocalLanguage: string;

  // Music Parameters
  bpm: number;
  keyScale: string;
  timeSignature: string;
  duration: number;

  // Generation Settings
  inferenceSteps: number;
  guidanceScale: number;
  batchSize: number;
  randomSeed: boolean;
  seed: number;
  thinking: boolean;
  enhance?: boolean;
  audioFormat: 'mp3' | 'flac';
  inferMethod: 'ode' | 'sde';
  shift: number;

  // LM Parameters
  lmTemperature: number;
  lmCfgScale: number;
  lmTopK: number;
  lmTopP: number;
  lmNegativePrompt: string;
  lmBackend?: 'pt' | 'vllm';
  lmModel?: string;

  // Expert Parameters
  referenceAudioUrl?: string;
  sourceAudioUrl?: string;
  referenceAudioTitle?: string;
  sourceAudioTitle?: string;
  audioCodes?: string;
  repaintingStart?: number;
  repaintingEnd?: number;
  instruction?: string;
  audioCoverStrength?: number;
  taskType?: string;
  useAdg?: boolean;
  cfgIntervalStart?: number;
  cfgIntervalEnd?: number;
  customTimesteps?: string;
  useCotMetas?: boolean;
  useCotCaption?: boolean;
  useCotLanguage?: boolean;
  autogen?: boolean;
  constrainedDecodingDebug?: boolean;
  allowLmBatch?: boolean;
  getScores?: boolean;
  getLrc?: boolean;
  scoreScale?: number;
  lmBatchChunkSize?: number;
  trackName?: string;
  completeTrackClasses?: string[];
  isFormatCaption?: boolean;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
}

export interface User {
  id: string;
  username: string;
  createdAt: Date;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isAdmin?: boolean;
  avatar_url?: string;
  banner_url?: string;
}

export interface UserProfile {
  user: User;
  publicSongs: Song[];
  publicPlaylists: Playlist[];
  stats: {
    totalSongs: number;
    totalLikes: number;
  };
}

// Simplified views for Muzzie

export interface Wallet {
  stellarPublicKey: string;
  baseAddress: string;
  isCustodial: boolean;
  muzBalance?: string;
  xlmBalance?: string;
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
