import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // SQLite database
  database: {
    path: process.env.DATABASE_PATH || path.join(__dirname, '../../data/acestep.db'),
  },

  // ACE-Step API (local)
  acestep: {
    apiUrl: process.env.ACESTEP_API_URL || 'http://localhost:8001',
  },

  // Pexels (optional - for video backgrounds)
  pexels: {
    apiKey: process.env.PEXELS_API_KEY || '',
  },

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Storage (local only)
  storage: {
    provider: 'local' as const,
    audioDir: process.env.AUDIO_DIR || path.join(__dirname, '../../public/audio'),
  },

  // Training datasets (inside ACE-Step-1.5 so Gradio can access them)
  datasets: {
    dir: process.env.DATASETS_DIR || path.join(__dirname, '../../../ACE-Step-1.5/datasets'),
    uploadsDir: process.env.DATASETS_UPLOADS_DIR || path.join(__dirname, '../../../ACE-Step-1.5/datasets/uploads'),
  },

  // Simplified JWT (for local session, not critical security)
  jwt: {
    secret: process.env.JWT_SECRET || 'ace-step-ui-local-secret',
    expiresIn: '365d', // Long-lived for local app
  },

  // Blockchain
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
};