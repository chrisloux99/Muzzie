import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getMuzBalance, distributeMuz } from '../services/stellar.js';

const router = Router();

const TIERS = {
  free: { name: 'Free', priceMuz: 0, quality: 'standard', features: ['Standard quality audio', 'Limited catalog access', 'Ad-supported'] },
  pro: { name: 'Pro', priceMuz: 500, quality: 'high', features: ['High quality audio', 'Full catalog access', 'No ads', 'Offline downloads'] },
  creator: { name: 'Creator', priceMuz: 1500, quality: 'lossless', features: ['Lossless audio', 'Full catalog access', 'No ads', 'Offline downloads', 'NFT minting tools', 'Priority support'] },
};

router.get('/tiers', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ tiers: TIERS });
});

router.post('/subscribe', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tier } = req.body;

    if (!tier || !TIERS[tier as keyof typeof TIERS]) {
      res.status(400).json({ error: 'Invalid tier' });
      return;
    }

    const tierConfig = TIERS[tier as keyof typeof TIERS];
    if (tierConfig.priceMuz === 0) {
      res.status(400).json({ error: 'Cannot subscribe to free tier' });
      return;
    }

    const walletResult = await pool.query(
      'SELECT stellar_public_key FROM wallets WHERE user_id = ?',
      [userId]
    );
    if (walletResult.rows.length === 0) {
      res.status(400).json({ error: 'Wallet required. Create a wallet first.' });
      return;
    }

    const balance = await getMuzBalance(walletResult.rows[0].stellar_public_key);
    if (Number(balance) < tierConfig.priceMuz) {
      res.status(400).json({ error: `Insufficient MUZ balance. Need ${tierConfig.priceMuz}, have ${balance}` });
      return;
    }

    const existing = await pool.query(
      "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' AND tier != 'free'",
      [userId]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE user_id = ? AND status = 'active'",
        [userId]
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const subId = uuidv4();
    await pool.query(
      `INSERT INTO subscriptions (id, user_id, tier, price_muz, status, started_at, expires_at)
       VALUES (?, ?, ?, ?, 'active', datetime('now'), ?)`,
      [subId, userId, tier, tierConfig.priceMuz, expiresAt.toISOString()]
    );

    const txId = uuidv4();
    await pool.query(
      `INSERT INTO muz_transactions (id, user_id, type, amount, reference_id, reference_type, status)
       VALUES (?, ?, 'subscription', ?, ?, 'subscription', 'confirmed')`,
      [txId, userId, tierConfig.priceMuz, subId]
    );

    res.json({
      subscription: {
        id: subId,
        tier,
        priceMuz: tierConfig.priceMuz,
        status: 'active',
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

router.get('/current', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "SELECT id, tier, price_muz, status, started_at, expires_at, auto_renew FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      res.json({
        subscription: {
          tier: 'free',
          priceMuz: 0,
          status: 'active',
        },
      });
      return;
    }

    const sub = result.rows[0];
    res.json({
      subscription: {
        id: sub.id,
        tier: sub.tier,
        priceMuz: sub.price_muz,
        status: sub.status,
        startedAt: sub.started_at,
        expiresAt: sub.expires_at,
        autoRenew: !!sub.auto_renew,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

router.post('/cancel', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await pool.query(
      "UPDATE subscriptions SET auto_renew = 0 WHERE user_id = ? AND status = 'active'",
      [userId]
    );
    res.json({ success: true, message: 'Auto-renewal disabled' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.post('/renew', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "SELECT id, tier, price_muz FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'No active subscription to renew' });
      return;
    }

    const sub = result.rows[0];
    if (sub.tier === 'free') {
      res.status(400).json({ error: 'Cannot renew free tier' });
      return;
    }

    const walletResult = await pool.query(
      'SELECT stellar_public_key FROM wallets WHERE user_id = ?',
      [userId]
    );
    if (walletResult.rows.length === 0) {
      res.status(400).json({ error: 'Wallet required' });
      return;
    }

    const balance = await getMuzBalance(walletResult.rows[0].stellar_public_key);
    if (Number(balance) < sub.price_muz) {
      res.status(400).json({ error: 'Insufficient MUZ balance' });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.query(
      'UPDATE subscriptions SET expires_at = ?, auto_renew = 1 WHERE id = ?',
      [expiresAt.toISOString(), sub.id]
    );

    const txId = uuidv4();
    await pool.query(
      `INSERT INTO muz_transactions (id, user_id, type, amount, reference_id, reference_type, status)
       VALUES (?, ?, 'subscription', ?, ?, 'subscription', 'confirmed')`,
      [txId, userId, sub.price_muz, sub.id]
    );

    res.json({ success: true, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({ error: 'Failed to renew subscription' });
  }
});

export default router;
