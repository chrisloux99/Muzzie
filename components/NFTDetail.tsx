import React, { useState, useEffect } from 'react';
import { ArrowLeft, Music, Users, ExternalLink, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { nftApi } from '../services/api';

interface NFTDetailProps {
  collectionId: string;
  onBack: () => void;
}

export const NFTDetail: React.FC<NFTDetailProps> = ({ collectionId, onBack }) => {
  const { token } = useAuth();
  const [collection, setCollection] = useState<any>(null);
  const [owners, setOwners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    nftApi.getCollection(collectionId)
      .then(r => {
        setCollection(r.collection);
        setOwners(r.owners || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [collectionId]);

  const handleBuy = async () => {
    if (!token) return;
    setIsBuying(true);
    setMessage(null);
    try {
      await nftApi.buyNFT(collectionId, token);
      setMessage({ type: 'success', text: 'NFT purchased successfully!' });
      const r = await nftApi.getCollection(collectionId);
      setCollection(r.collection);
      setOwners(r.owners || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Purchase failed' });
    } finally {
      setIsBuying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-muzzie-copper border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <p>Collection not found</p>
        <button onClick={onBack} className="mt-4 text-muzzie-copper">Go back</button>
      </div>
    );
  }

  const soldOut = collection.current_supply >= collection.max_supply;
  const alreadyOwned = owners.some((o: any) => o.owner_user_id === token);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-white/5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold truncate">{collection.title}</h2>
      </div>

      <div className="p-4 space-y-6">
        <div className="aspect-square max-w-md mx-auto rounded-2xl overflow-hidden">
          <img
            src={collection.cover_url || `https://picsum.photos/seed/${collection.song_id}/400/400`}
            alt={collection.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{collection.title}</h1>
            <p className="text-zinc-500 mt-1">by {collection.creator_name}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-center">
              <p className="text-xs text-zinc-500">Price</p>
              <p className="font-mono font-bold">{collection.price_wei} WEI</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-center">
              <p className="text-xs text-zinc-500">Supply</p>
              <p className="font-bold">{collection.current_supply}/{collection.max_supply}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-center">
              <p className="text-xs text-zinc-500">Royalty</p>
              <p className="font-bold">{collection.royalty_bps / 100}%</p>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              {message.text}
            </div>
          )}

          {!soldOut && !alreadyOwned && (
            <button
              onClick={handleBuy}
              disabled={isBuying || !token}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-muzzie-copper to-muzzie-terracotta text-white font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isBuying ? 'Buying...' : `Buy for ${collection.price_wei} WEI`}
            </button>
          )}

          {soldOut && (
            <div className="w-full py-3 rounded-xl bg-zinc-200 dark:bg-white/10 text-center font-medium text-zinc-500">
              Sold Out
            </div>
          )}

          {alreadyOwned && (
            <div className="w-full py-3 rounded-xl bg-green-500/10 text-green-600 text-center font-medium">
              You own a copy
            </div>
          )}

          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Users size={16} /> Owners ({owners.length})
            </h3>
            {owners.length === 0 ? (
              <p className="text-sm text-zinc-500">No owners yet</p>
            ) : (
              <div className="space-y-2">
                {owners.map((owner: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5">
                    <span className="text-sm font-mono">
                      {owner.username || `${owner.owner_address?.slice(0, 6)}...${owner.owner_address?.slice(-4)}`}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(owner.purchased_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
