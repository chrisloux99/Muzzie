import { Router, Response } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const totalResult = await pool.query(
      "SELECT COALESCE(SUM(CAST(amount_muz AS REAL)), 0) as total FROM creator_earnings WHERE creator_id = ?",
      [userId]
    );

    const bySource = await pool.query(
      "SELECT source, COALESCE(SUM(CAST(amount_muz AS REAL)), 0) as total FROM creator_earnings WHERE creator_id = ? GROUP BY source",
      [userId]
    );

    const thisMonth = await pool.query(
      "SELECT COALESCE(SUM(CAST(amount_muz AS REAL)), 0) as total FROM creator_earnings WHERE creator_id = ? AND created_at >= date('now', 'start of month')",
      [userId]
    );

    const sourceMap: Record<string, number> = {};
    for (const row of bySource.rows) {
      sourceMap[row.source] = row.total;
    }

    res.json({
      totalMuz: totalResult.rows[0].total,
      thisMonthMuz: thisMonth.rows[0].total,
      bySource: {
        streams: sourceMap['stream'] || 0,
        nftSales: sourceMap['nft_sale'] || 0,
        tips: sourceMap['tip'] || 0,
      },
    });
  } catch (error) {
    console.error('Get earnings summary error:', error);
    res.status(500).json({ error: 'Failed to get earnings summary' });
  }
});

router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT id, source, amount_muz, reference_id, reference_type, status, created_at
       FROM creator_earnings
       WHERE creator_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    res.json({ earnings: result.rows });
  } catch (error) {
    console.error('Get earnings history error:', error);
    res.status(500).json({ error: 'Failed to get earnings history' });
  }
});

router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const songCount = await pool.query(
      'SELECT COUNT(*) as count FROM songs WHERE user_id = ?',
      [userId]
    );

    const nftCount = await pool.query(
      "SELECT COUNT(*) as count FROM nft_collections WHERE creator_id = ? AND status = 'minted'",
      [userId]
    );

    const totalPlays = await pool.query(
      'SELECT COALESCE(SUM(view_count), 0) as total FROM songs WHERE user_id = ?',
      [userId]
    );

    const totalLikes = await pool.query(
      'SELECT COALESCE(SUM(like_count), 0) as total FROM songs WHERE user_id = ?',
      [userId]
    );

    res.json({
      songs: songCount.rows[0].count,
      nfts: nftCount.rows[0].count,
      totalPlays: totalPlays.rows[0].total,
      totalLikes: totalLikes.rows[0].total,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
