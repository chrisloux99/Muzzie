import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const STREAM_COSTS: Record<string, number> = {
  standard: 0,
  high: 1,
  lossless: 2,
};

const TIER_QUALITY: Record<string, string> = {
  free: 'standard',
  pro: 'high',
  creator: 'lossless',
};

function getMaxQuality(tier: string): string {
  return TIER_QUALITY[tier] || 'standard';
}

router.get('/access/:songId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const songId = req.params.songId;

    const songResult = await pool.query(
      'SELECT id, user_id, is_public FROM songs WHERE id = ?',
      [songId]
    );
    if (songResult.rows.length === 0) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    const song = songResult.rows[0];
    if (song.user_id === userId) {
      res.json({ requiresPayment: false, hasAccess: true, quality: 'lossless', isOwner: true });
      return;
    }

    const subResult = await pool.query(
      "SELECT tier FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
      [userId]
    );
    const tier = subResult.rows.length > 0 ? subResult.rows[0].tier : 'free';
    const maxQuality = getMaxQuality(tier);

    if (tier !== 'free') {
      res.json({
        requiresPayment: false,
        hasAccess: true,
        quality: maxQuality,
        tier,
        isOwner: false,
      });
      return;
    }

    res.json({
      requiresPayment: true,
      hasAccess: false,
      quality: 'standard',
      tier: 'free',
      costs: STREAM_COSTS,
      isOwner: false,
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

router.post('/play', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { songId, quality = 'standard' } = req.body;

    if (!songId) {
      res.status(400).json({ error: 'songId required' });
      return;
    }

    const cost = STREAM_COSTS[quality] || 0;

    const songResult = await pool.query(
      'SELECT id, user_id FROM songs WHERE id = ?',
      [songId]
    );
    if (songResult.rows.length === 0) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    const songOwnerId = songResult.rows[0].user_id;

    const subResult = await pool.query(
      "SELECT tier FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
      [userId]
    );
    const tier = subResult.rows.length > 0 ? subResult.rows[0].tier : 'free';
    const maxQuality = getMaxQuality(tier);

    const qualities = ['standard', 'high', 'lossless'];
    if (qualities.indexOf(quality) > qualities.indexOf(maxQuality)) {
      res.status(403).json({ error: `Your ${tier} plan supports up to ${maxQuality} quality` });
      return;
    }

    const playId = uuidv4();
    const actualCost = tier === 'free' ? cost : 0;

    await pool.query(
      `INSERT INTO stream_plays (id, user_id, song_id, quality, cost_muz, paid)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [playId, userId, songId, quality, String(actualCost), actualCost > 0 ? 0 : 1]
    );

    if (actualCost > 0 && songOwnerId !== userId) {
      const creatorEarningId = uuidv4();
      const creatorShare = Math.floor(actualCost * 0.7);
      await pool.query(
        `INSERT INTO creator_earnings (id, creator_id, source, amount_muz, reference_id, reference_type)
         VALUES (?, ?, 'stream', ?, ?, 'stream_play')`,
        [creatorEarningId, songOwnerId, String(creatorShare), playId]
      );
    }

    await pool.query(
      `UPDATE songs SET view_count = COALESCE(view_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [songId]
    );

    res.json({
      playId,
      quality,
      costPaid: actualCost,
      tier,
    });
  } catch (error) {
    console.error('Log play error:', error);
    res.status(500).json({ error: 'Failed to log play' });
  }
});

router.get('/quality/:songId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const subResult = await pool.query(
      "SELECT tier FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
      [userId]
    );
    const tier = subResult.rows.length > 0 ? subResult.rows[0].tier : 'free';
    const maxQuality = getMaxQuality(tier);

    const allQualities = ['standard', 'high', 'lossless'];
    const maxIndex = allQualities.indexOf(maxQuality);
    const available = allQualities.slice(0, maxIndex + 1).map(q => ({
      quality: q,
      cost: tier === 'free' ? STREAM_COSTS[q] : 0,
      available: true,
    }));

    const locked = allQualities.slice(maxIndex + 1).map(q => ({
      quality: q,
      cost: STREAM_COSTS[q],
      available: false,
      requiredTier: Object.entries(TIER_QUALITY).find(([, v]) => v === q)?.[0],
    }));

    res.json({ qualities: [...available, ...locked], tier, maxQuality });
  } catch (error) {
    console.error('Get qualities error:', error);
    res.status(500).json({ error: 'Failed to get qualities' });
  }
});

export default router;
