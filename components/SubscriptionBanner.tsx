import React, { useState, useEffect } from 'react';
import { X, Check, Crown, Zap, Music } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBlockchain } from '../context/BlockchainContext';
import { subscriptionsApi, SubscriptionTier } from '../services/api';

interface SubscriptionBannerProps {
  onClose: () => void;
  onSubscribed?: () => void;
  requiredQuality?: string;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ onClose, onSubscribed, requiredQuality }) => {
  const { token } = useAuth();
  const { refreshWallet } = useBlockchain();
  const [tiers, setTiers] = useState<Record<string, SubscriptionTier>>({});
  const [currentTier, setCurrentTier] = useState('free');
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    subscriptionsApi.getTiers().then(r => setTiers(r.tiers)).catch(() => {});
    subscriptionsApi.getCurrent(token).then(r => setCurrentTier(r.subscription.tier)).catch(() => {});
  }, [token]);

  const handleSubscribe = async (tier: string) => {
    if (!token) return;
    setIsSubscribing(tier);
    setError(null);
    try {
      await subscriptionsApi.subscribe(tier, token);
      setCurrentTier(tier);
      await refreshWallet();
      onSubscribed?.();
    } catch (err: any) {
      setError(err.message || 'Subscription failed');
    } finally {
      setIsSubscribing(null);
    }
  };

  const tierIcons: Record<string, React.ReactNode> = {
    free: <Music size={24} />,
    pro: <Zap size={24} />,
    creator: <Crown size={24} />,
  };

  const tierColors: Record<string, string> = {
    free: 'border-zinc-300 dark:border-zinc-600',
    pro: 'border-muzzie-copper',
    creator: 'border-purple-500',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold">Choose Your Plan</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {requiredQuality ? `Unlock ${requiredQuality} quality streaming` : 'Upgrade for the best music experience'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {Object.entries(tiers).map(([key, tier]) => (
            <div
              key={key}
              className={`relative rounded-xl border-2 p-6 flex flex-col ${tierColors[key]} ${currentTier === key ? 'ring-2 ring-muzzie-copper' : ''}`}
            >
              {currentTier === key && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-muzzie-copper text-white text-xs rounded-full font-medium">
                  Current Plan
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-white/10 flex items-center justify-center">
                  {tierIcons[key]}
                </div>
                <div>
                  <h3 className="font-bold">{tier.name}</h3>
                  <p className="text-sm text-zinc-500">
                    {tier.priceMuz > 0 ? `${tier.priceMuz} MUZ/month` : 'Free forever'}
                  </p>
                </div>
              </div>
              <ul className="flex-1 space-y-2 mb-6">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {key !== 'free' && currentTier !== key && (
                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={isSubscribing === key}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-muzzie-copper to-muzzie-terracotta text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSubscribing === key ? 'Subscribing...' : `Subscribe for ${tier.priceMuz} MUZ`}
                </button>
              )}
              {currentTier === key && (
                <div className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-white/10 text-center text-sm font-medium">
                  Active
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
