import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { SubscriptionBanner } from './SubscriptionBanner';

interface PremiumGateProps {
  requiresPayment: boolean;
  hasAccess: boolean;
  quality: string;
  cost?: number;
  onPayAndPlay?: () => void;
  children: React.ReactNode;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
  requiresPayment,
  hasAccess,
  quality,
  cost,
  onPayAndPlay,
  children,
}) => {
  const [showBanner, setShowBanner] = useState(false);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm shadow-xl">
            <Lock size={32} className="text-muzzie-copper" />
            <p className="font-medium text-center">Premium Content</p>
            <p className="text-sm text-zinc-500 text-center">
              {requiresPayment && cost ? `Pay ${cost} MUZ per play or subscribe` : 'Subscribe to unlock'}
            </p>
            <div className="flex gap-2">
              {requiresPayment && cost && onPayAndPlay && (
                <button
                  onClick={onPayAndPlay}
                  className="px-4 py-2 rounded-xl bg-muzzie-copper text-white text-sm font-medium hover:opacity-90"
                >
                  Pay {cost} MUZ
                </button>
              )}
              <button
                onClick={() => setShowBanner(true)}
                className="px-4 py-2 rounded-xl border border-muzzie-copper text-muzzie-copper text-sm font-medium hover:bg-muzzie-copper/10"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
      {showBanner && (
        <SubscriptionBanner
          onClose={() => setShowBanner(false)}
          onSubscribed={() => setShowBanner(false)}
          requiredQuality={quality}
        />
      )}
    </>
  );
};
