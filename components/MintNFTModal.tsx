import React, { useState } from 'react';
import { X, Music } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { nftApi } from '../services/api';

interface MintNFTModalProps {
  songId: string;
  songTitle: string;
  onClose: () => void;
  onMinted?: () => void;
}

export const MintNFTModal: React.FC<MintNFTModalProps> = ({ songId, songTitle, onClose, onMinted }) => {
  const { token } = useAuth();
  const [maxSupply, setMaxSupply] = useState(100);
  const [priceWei, setPriceWei] = useState('1000000000000000');
  const [royaltyBps, setRoyaltyBps] = useState(1000);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
    if (!token) return;
    setIsMinting(true);
    setError(null);
    try {
      await nftApi.mintNFT({ songId, maxSupply, priceWei, royaltyBps }, token);
      onMinted?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Minting failed');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-white/10">
          <h2 className="text-lg font-bold">Mint as NFT</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-white/5">
            <Music size={20} className="text-muzzie-copper" />
            <span className="font-medium">{songTitle}</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Max Supply (copies)</label>
            <input
              type="number"
              value={maxSupply}
              onChange={e => setMaxSupply(Number(e.target.value))}
              min={1}
              max={10000}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 outline-none focus:border-muzzie-copper"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (WEI)</label>
            <input
              type="text"
              value={priceWei}
              onChange={e => setPriceWei(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 outline-none focus:border-muzzie-copper font-mono"
            />
            <p className="text-xs text-zinc-500 mt-1">
              ~{(Number(priceWei) / 1e18).toFixed(6)} ETH
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Royalty ({royaltyBps / 100}%)</label>
            <input
              type="range"
              value={royaltyBps}
              onChange={e => setRoyaltyBps(Number(e.target.value))}
              min={0}
              max={5000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0%</span>
              <span>50%</span>
            </div>
          </div>

          <button
            onClick={handleMint}
            disabled={isMinting || maxSupply < 1}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-muzzie-copper to-muzzie-terracotta text-white font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isMinting ? 'Minting...' : 'Mint NFT'}
          </button>
        </div>
      </div>
    </div>
  );
};
