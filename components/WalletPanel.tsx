import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check, ArrowDownToLine, ArrowUpFromLine, RefreshCw, ExternalLink } from 'lucide-react';
import { useBlockchain } from '../context/BlockchainContext';
import { useAuth } from '../context/AuthContext';
import { walletApi } from '../services/api';

interface WalletPanelProps {
  onBack: () => void;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({ onBack }) => {
  const { wallet, isLoading, createWallet, refreshWallet } = useBlockchain();
  const { token } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (token && wallet) {
      walletApi.getTransactions(token).then(r => setTransactions(r.transactions)).catch(() => {});
    }
  }, [token, wallet]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const truncateAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const handleDeposit = async () => {
    if (!token || !depositAmount) return;
    setIsActionLoading(true);
    setMessage(null);
    try {
      await walletApi.deposit(depositAmount, token);
      setMessage({ type: 'success', text: `Deposited ${depositAmount} MUZ successfully!` });
      setDepositAmount('');
      await refreshWallet();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Deposit failed' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!token || !withdrawAddress || !withdrawAmount) return;
    setIsActionLoading(true);
    setMessage(null);
    try {
      await walletApi.withdraw(withdrawAddress, withdrawAmount, token);
      setMessage({ type: 'success', text: `Withdrew ${withdrawAmount} MUZ successfully!` });
      setWithdrawAddress('');
      setWithdrawAmount('');
      await refreshWallet();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Withdrawal failed' });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!wallet && !isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-white/5">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold">Wallet</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muzzie-copper to-muzzie-terracotta flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-10 h-10">
              <path d="M21 12V7H5a2 2 0 010-4h14v4" />
              <path d="M3 5v14a2 2 0 002 2h16v-5" />
              <circle cx="18" cy="12" r="1" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Create Your Wallet</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs">
              Set up your Stellar wallet to start earning and spending MUZ tokens on Muzzie.
            </p>
          </div>
          <button
            onClick={createWallet}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-muzzie-copper to-muzzie-terracotta text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-white/5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">Wallet</h2>
        <button
          onClick={refreshWallet}
          disabled={isLoading}
          className="ml-auto p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <div className="rounded-2xl bg-gradient-to-br from-muzzie-copper to-muzzie-terracotta p-6 text-white">
          <p className="text-sm opacity-80">MUZ Balance</p>
          <p className="text-3xl font-bold mt-1">{Number(wallet?.muzBalance || 0).toFixed(2)} MUZ</p>
          <div className="mt-4 flex gap-4 text-sm opacity-80">
            <span>XLM: {Number(wallet?.xlmBalance || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-white/5">
            <div>
              <p className="text-xs text-zinc-500">Stellar Address</p>
              <p className="text-sm font-mono">{truncateAddress(wallet?.stellarPublicKey || '')}</p>
            </div>
            <button onClick={() => copyToClipboard(wallet?.stellarPublicKey || '', 'stellar')} className="p-1.5">
              {copied === 'stellar' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-white/5">
            <div>
              <p className="text-xs text-zinc-500">Base Address</p>
              <p className="text-sm font-mono">{truncateAddress(wallet?.baseAddress || '')}</p>
            </div>
            <button onClick={() => copyToClipboard(wallet?.baseAddress || '', 'base')} className="p-1.5">
              {copied === 'base' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Deposit */}
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownToLine size={16} className="text-muzzie-copper" />
            <h3 className="font-medium text-sm">Deposit MUZ</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="Amount"
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm outline-none focus:border-muzzie-copper"
            />
            <button
              onClick={handleDeposit}
              disabled={isActionLoading || !depositAmount}
              className="px-4 py-2 rounded-lg bg-muzzie-copper text-white text-sm font-medium disabled:opacity-50"
            >
              Deposit
            </button>
          </div>
        </div>

        {/* Withdraw */}
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpFromLine size={16} className="text-muzzie-copper" />
            <h3 className="font-medium text-sm">Withdraw MUZ</h3>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={withdrawAddress}
              onChange={e => setWithdrawAddress(e.target.value)}
              placeholder="Recipient Stellar address"
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm outline-none focus:border-muzzie-copper"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm outline-none focus:border-muzzie-copper"
              />
              <button
                onClick={handleWithdraw}
                disabled={isActionLoading || !withdrawAddress || !withdrawAmount}
                className="px-4 py-2 rounded-lg bg-muzzie-copper text-white text-sm font-medium disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="font-medium text-sm mb-3">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5">
                  <div>
                    <p className="text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-xs text-zinc-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono ${tx.type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}{tx.amount} MUZ
                    </p>
                    {tx.stellar_tx_hash && (
                      <a
                        href={`https://stellar.expert/tx/${tx.stellar_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muzzie-copper flex items-center gap-1 justify-end"
                      >
                        View <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
