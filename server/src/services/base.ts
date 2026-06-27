import { ethers } from 'ethers';
import { config } from '../config/index.js';

const NFT_ABI = [
  "function mintSong(string songId, string uri, uint256 maxSupply, uint256 price, uint256 royaltyBps) returns (uint256)",
  "function mintCopy(uint256 tokenId) payable",
  "function getTokenInfo(uint256 tokenId) view returns (address, uint256, uint256, uint256, string)",
  "function songToTokenId(string) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "event SongMinted(uint256 indexed tokenId, string songId, address creator, uint256 maxSupply)",
  "event CopyMinted(uint256 indexed tokenId, address buyer, uint256 supply)",
];

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(config.blockchain.base.rpcUrl);
}

function getContract(): ethers.Contract {
  return new ethers.Contract(
    config.blockchain.base.nftContractAddress,
    NFT_ABI,
    getProvider()
  );
}

function getSigner(): ethers.Wallet {
  if (!config.blockchain.base.deployerKey) throw new Error('Deployer key not configured');
  return new ethers.Wallet(config.blockchain.base.deployerKey, getProvider());
}

export async function mintSongNFT(
  songId: string,
  metadataUri: string,
  maxSupply: number,
  priceWei: string,
  royaltyBps: number
): Promise<{ tokenId: number; txHash: string }> {
  const contract = getContract().connect(getSigner()) as any;
  const tx = await contract.mintSong(songId, metadataUri, maxSupply, priceWei, royaltyBps);
  const receipt = await tx.wait();
  const event = receipt.logs.find((l: any) => {
    try { return contract.interface.parseLog(l)?.name === 'SongMinted'; } catch { return false; }
  });
  const parsed = event ? contract.interface.parseLog(event) : null;
  return {
    tokenId: parsed ? Number(parsed.args[0]) : 0,
    txHash: receipt.hash,
  };
}

export async function buyNFTCopy(
  tokenId: number,
  priceWei: string
): Promise<{ txHash: string }> {
  const contract = getContract().connect(getSigner()) as any;
  const tx = await contract.mintCopy(tokenId, { value: priceWei });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function getNFTInfo(tokenId: number): Promise<{
  creator: string;
  maxSupply: number;
  currentSupply: number;
  price: string;
  songId: string;
}> {
  const contract = getContract();
  const info = await (contract as any).getTokenInfo(tokenId);
  return {
    creator: info[0],
    maxSupply: Number(info[1]),
    currentSupply: Number(info[2]),
    price: info[3].toString(),
    songId: info[4],
  };
}

export async function getNFTOwners(tokenId: number): Promise<string[]> {
  const contract = getContract();
  const info = await (contract as any).getTokenInfo(tokenId);
  const owners: string[] = [];
  const total = Number(info[2]);
  // This is a simplified approach - in production you'd use events or an indexer
  return owners;
}

export { getProvider, getContract, getSigner };
