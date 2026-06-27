import React, { useState, useEffect } from 'react';
import { Lock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { streamingApi, QualityInfo } from '../services/api';

interface QualitySelectorProps {
  songId: string;
  currentQuality: string;
  onSelect: (quality: string) => void;
  onUpgrade?: () => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  songId,
  currentQuality,
  onSelect,
  onUpgrade,
}) => {
  const { token } = useAuth();
  const [qualities, setQualities] = useState<QualityInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    streamingApi.getQualities(songId, token)
      .then(r => setQualities(r.qualities))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [songId, token]);

  if (isLoading) return null;

  return (
    <div className="space-y-1">
      {qualities.map(q => (
        <button
          key={q.quality}
          onClick={() => q.available ? onSelect(q.quality) : onUpgrade?.()}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            q.quality === currentQuality
              ? 'bg-muzzie-copper/10 text-muzzie-copper font-medium'
              : q.available
              ? 'hover:bg-zinc-100 dark:hover:bg-white/5'
              : 'opacity-50 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2">
            {q.available ? (
              q.quality === currentQuality ? <Check size={14} /> : <div className="w-3.5" />
            ) : (
              <Lock size={14} />
            )}
            <span className="capitalize">{q.quality}</span>
          </div>
          <span className="text-xs text-zinc-500">
            {q.cost > 0 ? `${q.cost} MUZ` : q.available ? 'Free' : q.requiredTier}
          </span>
        </button>
      ))}
    </div>
  );
};
