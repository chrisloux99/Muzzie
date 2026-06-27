import React from 'react';
import { Wallet } from 'lucide-react';
import { useBlockchain } from '../context/BlockchainContext';

interface WalletButtonProps {
  onClick: () => void;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ onClick }) => {
  const { wallet, isLoading } = useBlockchain();

  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-200"
      title="Wallet"
    >
      <Wallet size={20} />
      {wallet && (
        <span className="text-sm font-medium">
          {Number(wallet.muzBalance).toFixed(1)} MUZ
        </span>
      )}
      {isLoading && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-muzzie-copper animate-pulse" />
      )}
    </button>
  );
};
