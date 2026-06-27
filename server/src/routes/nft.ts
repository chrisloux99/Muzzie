import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { mintSongNFT, getNFTInfo } from '../services/base.js';

const router = Router();

router.post('/mint', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { songId, maxSupply, priceWei, royaltyBps = 1000, metadataUri } = req.body;

    if (!songId || !maxSupply || !priceWei) {
      res.status(400).json({ error: 'songId, maxSupply, and priceWei required' });
      return;
    }

    const songResult = await pool.query('SELECT id, user_id, title, cover_url FROM songs WHERE id = ?', [songId]);
    if (songResult.rows.length === 0) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }
    if (songResult.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Only the song creator can mint NFTs' });
      return;
    }

    const existingNft = await pool.query('SELECT id FROM nft_collections WHERE song_id = ?', [songId]);
    if (existingNft.rows.length > 0) {
      res.status(400).json({ error: 'Song already minted as NFT' });
      return;
    }

    const song = songResult.rows[0];
    const finalMetadataUri = metadataUri || `${req.protocol}://${req.get('host')}/api/nft/metadata/${songId}`;

    const collectionId = uuidv4();
    await pool.query(
      `INSERT INTO nft_collections (id, song_id, creator_id, max_supply, price_wei, royalty_bps, metadata_uri, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'minting')`,
      [collectionId, songId, userId, maxSupply, priceWei, royaltyBps, finalMetadataUri]
    );

    try {
      const { tokenId, txHash } = await mintSongNFT(
        songId,
        finalMetadataUri,
        maxSupply,
        priceWei,
        royaltyBps
      );

      await pool.query(
        `UPDATE nft_collections SET base_token_id = ?, status = 'minted', minted_at = datetime('now') WHERE id = ?`,
        [tokenId, collectionId]
      );

      const ownershipId = uuidv4();
      const walletResult = await pool.query('SELECT base_address FROM wallets WHERE user_id = ?', [userId]);
      const ownerAddress = walletResult.rows.length > 0 ? walletResult.rows[0].base_address : '';

      await pool.query(
        `INSERT INTO nft_ownerships (id, collection_id, owner_user_id, owner_address, token_id, tx_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ownershipId, collectionId, userId, ownerAddress, tokenId, txHash]
      );

      await pool.query(
        'UPDATE nft_collections SET current_supply = 1 WHERE id = ?',
        [collectionId]
      );

      res.json({
        collection: {
          id: collectionId,
          tokenId,
          txHash,
          maxSupply,
          priceWei,
          royaltyBps,
          status: 'minted',
        },
      });
    } catch (chainError) {
      await pool.query("UPDATE nft_collections SET status = 'failed' WHERE id = ?", [collectionId]);
      throw chainError;
    }
  } catch (error) {
    console.error('Mint NFT error:', error);
    res.status(500).json({ error: 'Failed to mint NFT' });
  }
});

router.get('/marketplace', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT nc.*, s.title, s.cover_url, s.style, u.username as creator_name, u.avatar_url as creator_avatar
       FROM nft_collections nc
       JOIN songs s ON nc.song_id = s.id
       JOIN users u ON nc.creator_id = u.id
       WHERE nc.status = 'minted'
       ORDER BY nc.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({ collections: result.rows });
  } catch (error) {
    console.error('Get marketplace error:', error);
    res.status(500).json({ error: 'Failed to get marketplace' });
  }
});

router.get('/owned', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT no.*, nc.song_id, nc.max_supply, nc.price_wei, nc.royalty_bps,
              s.title, s.cover_url
       FROM nft_ownerships no
       JOIN nft_collections nc ON no.collection_id = nc.id
       JOIN songs s ON nc.song_id = s.id
       WHERE no.owner_user_id = ?
       ORDER BY no.purchased_at DESC`,
      [userId]
    );

    res.json({ nfts: result.rows });
  } catch (error) {
    console.error('Get owned NFTs error:', error);
    res.status(500).json({ error: 'Failed to get owned NFTs' });
  }
});

router.get('/created', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT nc.*, s.title, s.cover_url
       FROM nft_collections nc
       JOIN songs s ON nc.song_id = s.id
       WHERE nc.creator_id = ?
       ORDER BY nc.created_at DESC`,
      [userId]
    );

    res.json({ collections: result.rows });
  } catch (error) {
    console.error('Get created NFTs error:', error);
    res.status(500).json({ error: 'Failed to get created NFTs' });
  }
});

router.get('/:collectionId', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT nc.*, s.title, s.cover_url, s.style, s.audio_url,
              u.username as creator_name, u.avatar_url as creator_avatar
       FROM nft_collections nc
       JOIN songs s ON nc.song_id = s.id
       JOIN users u ON nc.creator_id = u.id
       WHERE nc.id = ?`,
      [req.params.collectionId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    const owners = await pool.query(
      `SELECT no.owner_address, no.owner_user_id, no.purchased_at, u.username
       FROM nft_ownerships no
       LEFT JOIN users u ON no.owner_user_id = u.id
       WHERE no.collection_id = ?
       ORDER BY no.purchased_at ASC`,
      [req.params.collectionId]
    );

    res.json({ collection: result.rows[0], owners: owners.rows });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ error: 'Failed to get collection' });
  }
});

router.post('/:collectionId/buy', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const collectionId = req.params.collectionId;

    const collResult = await pool.query(
      'SELECT * FROM nft_collections WHERE id = ? AND status = ?',
      [collectionId, 'minted']
    );
    if (collResult.rows.length === 0) {
      res.status(404).json({ error: 'Collection not found or not available' });
      return;
    }

    const coll = collResult.rows[0];
    if (coll.current_supply >= coll.max_supply) {
      res.status(400).json({ error: 'Sold out' });
      return;
    }

    const existingOwnership = await pool.query(
      'SELECT id FROM nft_ownerships WHERE collection_id = ? AND owner_user_id = ?',
      [collectionId, userId]
    );
    if (existingOwnership.rows.length > 0) {
      res.status(400).json({ error: 'You already own a copy' });
      return;
    }

    const ownershipId = uuidv4();
    const walletResult = await pool.query('SELECT base_address FROM wallets WHERE user_id = ?', [userId]);
    const ownerAddress = walletResult.rows.length > 0 ? walletResult.rows[0].base_address : '';

    await pool.query(
      'UPDATE nft_collections SET current_supply = current_supply + 1 WHERE id = ?',
      [collectionId]
    );

    await pool.query(
      `INSERT INTO nft_ownerships (id, collection_id, owner_user_id, owner_address, token_id, price_paid_wei)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownershipId, collectionId, userId, ownerAddress, coll.base_token_id, coll.price_wei]
    );

    if (coll.creator_id !== userId) {
      const earningId = uuidv4();
      const creatorShare = BigInt(coll.price_wei) * 70n / 100n;
      await pool.query(
        `INSERT INTO creator_earnings (id, creator_id, source, amount_muz, reference_id, reference_type)
         VALUES (?, ?, 'nft_sale', ?, ?, 'nft_collection')`,
        [earningId, coll.creator_id, creatorShare.toString(), collectionId]
      );
    }

    res.json({
      ownership: {
        id: ownershipId,
        collectionId,
        tokenId: coll.base_token_id,
        pricePaid: coll.price_wei,
      },
    });
  } catch (error) {
    console.error('Buy NFT error:', error);
    res.status(500).json({ error: 'Failed to buy NFT' });
  }
});

router.get('/metadata/:songId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, style, cover_url, lyrics FROM songs WHERE id = ?',
      [req.params.songId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }
    const song = result.rows[0];
    res.json({
      name: song.title,
      description: `${song.style} - AI Generated Music on Muzzie`,
      image: song.cover_url || `https://picsum.photos/seed/${song.id}/400/400`,
      attributes: [
        { trait_type: 'Style', value: song.style },
        { trait_type: 'Platform', value: 'Muzzie' },
      ],
    });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({ error: 'Failed to get metadata' });
  }
});

export default router;
