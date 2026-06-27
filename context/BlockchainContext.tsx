import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { walletApi, WalletData } from '../services/api';
import { useAuth } from './AuthContext';

interface BlockchainContextType {
  wallet: WalletData | null;
  isLoading: boolean;
  createWallet: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

export function BlockchainProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { token, isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshWallet = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setWallet(null);
      return;
    }
    setIsLoading(true);
    try {
      const result = await walletApi.getWallet(token);
      setWallet(result.wallet);
    } catch (err) {
      console.error('Failed to load wallet:', err);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  const createWallet = useCallback(async () => {
    if (!token) throw new Error('Not authenticated');
    setIsLoading(true);
    try {
      const result = await walletApi.createWallet(token);
      setWallet({
        ...result.wallet,
        muzBalance: '0',
        xlmBalance: '0',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  return (
    <BlockchainContext.Provider value={{ wallet, isLoading, createWallet, refreshWallet }}>
      {children}
    </BlockchainContext.Provider>
  );
}

export function useBlockchain(): BlockchainContextType {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
}
