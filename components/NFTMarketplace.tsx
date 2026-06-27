import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, ExternalLink, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { nftApi, NFTCollectionData } from '../services/api';

interface NFTMarketplaceProps {
  onBack: () => void;
  onSelectCollection: (id: string) => void;
}

export const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({ onBack, onSelectCollection }) => {
  const { token } = useAuth();
  const [collections, setCollections] = useState<NFTCollectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    nftApi.getMarketplace()
      .then(r => setCollections(r.collections))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-white/5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">NFT Marketplace</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-muzzie-copper border-t-transparent rounded-full animate-spin" />
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <ShoppingCart size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No NFTs Yet</p>
            <p className="text-sm">Be the first to mint a song as an NFT!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map(coll => (
              <div
                key={coll.id}
                onClick={() => onSelectCollection(coll.id)}
                className="group cursor-pointer rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={coll.cover_url || `https://picsum.photos/seed/${coll.song_id}/400/400`}
                    alt={coll.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                    {coll.current_supply}/{coll.max_supply} minted
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold truncate">{coll.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">by {coll.creator_name}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-mono font-medium">
                      {coll.price_wei} WEI
                    </span>
                    <span className="text-xs text-zinc-500">
                      {coll.royalty_bps / 100}% royalty
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
