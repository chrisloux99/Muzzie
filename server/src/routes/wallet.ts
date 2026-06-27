import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../services/encryption.js';
import {
  createKeypair,
  fundTestnet,
  trustMuzAsset,
  getMuzBalance,
  getNativeBalance,
  distributeMuz,
  transferMuz,
} from '../services/stellar.js';

const router = Router();

router.post('/create', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const existing = await pool.query('SELECT id FROM wallets WHERE user_id = ?', [userId]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'Wallet already exists' });
      return;
    }

    const stellar = createKeypair();
    const baseKeypair = createKeypair();

    await fundTestnet(stellar.publicKey);

    const walletId = uuidv4();
    await pool.query(
      `INSERT INTO wallets (id, user_id, stellar_public_key, stellar_secret_encrypted, base_address, base_private_key_encrypted, is_custodial)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        walletId,
        userId,
        stellar.publicKey,
        encrypt(stellar.secret),
        baseKeypair.publicKey,
        encrypt(baseKeypair.secret),
      ]
    );

    try {
      await trustMuzAsset(stellar.secret);
    } catch (err) {
      console.warn('Trustline may already exist or account not funded yet:', err);
    }

    res.json({
      wallet: {
        stellarPublicKey: stellar.publicKey,
        baseAddress: baseKeypair.publicKey,
        isCustodial: true,
      },
    });
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      'SELECT stellar_public_key, base_address, is_custodial FROM wallets WHERE user_id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      res.json({ wallet: null });
      return;
    }

    const wallet = result.rows[0];
    const muzBalance = await getMuzBalance(wallet.stellar_public_key);
    const xlmBalance = await getNativeBalance(wallet.stellar_public_key);

    res.json({
      wallet: {
        stellarPublicKey: wallet.stellar_public_key,
        baseAddress: wallet.base_address,
        isCustodial: !!wallet.is_custodial,
        muzBalance,
        xlmBalance,
      },
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

router.get('/balance', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      'SELECT stellar_public_key FROM wallets WHERE user_id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No wallet found' });
      return;
    }

    const muzBalance = await getMuzBalance(result.rows[0].stellar_public_key);
    const xlmBalance = await getNativeBalance(result.rows[0].stellar_public_key);

    res.json({ muzBalance, xlmBalance });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

router.post('/deposit', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ error: 'Valid amount required' });
      return;
    }

    const walletResult = await pool.query(
      'SELECT stellar_public_key FROM wallets WHERE user_id = ?',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      res.status(404).json({ error: 'No wallet found' });
      return;
    }

    const txHash = await distributeMuz(
      walletResult.rows[0].stellar_public_key,
      String(amount)
    );

    const txId = uuidv4();
    await pool.query(
      `INSERT INTO muz_transactions (id, user_id, type, amount, to_address, stellar_tx_hash, status)
       VALUES (?, ?, 'purchase', ?, ?, ?, 'confirmed')`,
      [txId, userId, amount, walletResult.rows[0].stellar_public_key, txHash]
    );

    res.json({ txHash, amount: String(amount), status: 'confirmed' });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

router.post('/withdraw', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { toAddress, amount } = req.body;

    if (!toAddress || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ error: 'Valid toAddress and amount required' });
      return;
    }

    const walletResult = await pool.query(
      'SELECT stellar_secret_encrypted FROM wallets WHERE user_id = ?',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      res.status(404).json({ error: 'No wallet found' });
      return;
    }

    const secret = decrypt(walletResult.rows[0].stellar_secret_encrypted);
    const txHash = await transferMuz(secret, toAddress, String(amount));

    const txId = uuidv4();
    await pool.query(
      `INSERT INTO muz_transactions (id, user_id, type, amount, to_address, stellar_tx_hash, status)
       VALUES (?, ?, 'withdrawal', ?, ?, ?, 'confirmed')`,
      [txId, userId, amount, toAddress, txHash]
    );

    res.json({ txHash, amount: String(amount), status: 'confirmed' });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

router.get('/transactions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT id, type, amount, from_address, to_address, stellar_tx_hash, status, created_at
       FROM muz_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

export default router;
