import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Music, ShoppingBag, Heart, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBlockchain } from '../context/BlockchainContext';
import { earningsApi, EarningsSummary } from '../services/api';

interface CreatorDashboardProps {
  onBack: () => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ onBack }) => {
  const { token } = useAuth();
  const { wallet } = useBlockchain();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      earningsApi.getSummary(token).catch(() => null),
      earningsApi.getHistory(token).catch(() => ({ earnings: [] })),
      earningsApi.getStats(token).catch(() => null),
    ]).then(([s, h, st]) => {
      setSummary(s);
      setHistory(h.earnings);
      setStats(st);
    }).finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-muzzie-copper border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-white/5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">Creator Dashboard</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Total Earnings Card */}
        <div className="rounded-2xl bg-gradient-to-br from-muzzie-copper to-muzzie-terracotta p-6 text-white">
          <p className="text-sm opacity-80">Total Earnings</p>
          <p className="text-3xl font-bold mt-1">{Number(summary?.totalMuz || 0).toFixed(2)} MUZ</p>
          <p className="text-sm opacity-60 mt-1">This month: {Number(summary?.thisMonthMuz || 0).toFixed(2)} MUZ</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-white/5 text-center">
            <Music size={20} className="mx-auto mb-2 text-muzzie-copper" />
            <p className="text-2xl font-bold">{stats?.songs || 0}</p>
            <p className="text-xs text-zinc-500">Songs</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-white/5 text-center">
            <ShoppingBag size={20} className="mx-auto mb-2 text-muzzie-copper" />
            <p className="text-2xl font-bold">{stats?.nfts || 0}</p>
            <p className="text-xs text-zinc-500">NFTs</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-white/5 text-center">
            <TrendingUp size={20} className="mx-auto mb-2 text-muzzie-copper" />
            <p className="text-2xl font-bold">{stats?.totalPlays || 0}</p>
            <p className="text-xs text-zinc-500">Total Plays</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-white/5 text-center">
            <Heart size={20} className="mx-auto mb-2 text-muzzie-copper" />
            <p className="text-2xl font-bold">{stats?.totalLikes || 0}</p>
            <p className="text-xs text-zinc-500">Total Likes</p>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 p-4">
          <h3 className="font-medium mb-3">Earnings Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Streams</span>
              <span className="font-mono font-medium">{Number(summary?.bySource?.streams || 0).toFixed(2)} MUZ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">NFT Sales</span>
              <span className="font-mono font-medium">{Number(summary?.bySource?.nftSales || 0).toFixed(2)} MUZ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Tips</span>
              <span className="font-mono font-medium">{Number(summary?.bySource?.tips || 0).toFixed(2)} MUZ</span>
            </div>
          </div>
        </div>

        {/* Recent History */}
        <div>
          <h3 className="font-medium mb-3">Recent Earnings</h3>
          {history.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No earnings yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map(earning => (
                <div key={earning.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5">
                  <div>
                    <p className="text-sm font-medium capitalize">{earning.source}</p>
                    <p className="text-xs text-zinc-500">{new Date(earning.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-mono text-green-500">+{earning.amount_muz} MUZ</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
