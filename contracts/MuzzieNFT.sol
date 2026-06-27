// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract MuzzieNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, IERC2981 {
    uint256 private _nextTokenId;

    struct TokenInfo {
        address creator;
        uint256 maxSupply;
        uint256 currentSupply;
        uint256 price;
        string songId;
    }

    mapping(uint256 => TokenInfo) public tokenInfos;
    mapping(string => uint256) public songToTokenId;
    mapping(uint256 => address) private _royaltyReceiver;
    mapping(uint256 => uint256) private _royaltyBps;

    event SongMinted(uint256 indexed tokenId, string songId, address creator, uint256 maxSupply);
    event CopyMinted(uint256 indexed tokenId, address buyer, uint256 supply);

    constructor(address initialOwner) ERC721("Muzzie Music NFT", "MUZNFT") Ownable(initialOwner) {}

    function mintSong(
        string calldata songId,
        string calldata uri,
        uint256 maxSupply,
        uint256 price,
        uint256 royaltyBps
    ) external returns (uint256) {
        require(songToTokenId[songId] == 0, "Already minted");
        require(royaltyBps <= 5000, "Royalty too high");

        uint256 tokenId = _nextTokenId++;
        songToTokenId[songId] = tokenId;
        tokenInfos[tokenId] = TokenInfo(msg.sender, maxSupply, 0, price, songId);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        _royaltyReceiver[tokenId] = msg.sender;
        _royaltyBps[tokenId] = royaltyBps;

        emit SongMinted(tokenId, songId, msg.sender, maxSupply);
        return tokenId;
    }

    function mintCopy(uint256 tokenId) external payable {
        TokenInfo storage info = tokenInfos[tokenId];
        require(info.currentSupply < info.maxSupply, "Sold out");
        require(msg.value >= info.price, "Insufficient payment");
        info.currentSupply++;
        _safeMint(msg.sender, tokenId);
        emit CopyMinted(tokenId, msg.sender, info.currentSupply);
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external view override returns (address receiver, uint256 royaltyAmount)
    {
        receiver = _royaltyReceiver[tokenId];
        royaltyAmount = (salePrice * _royaltyBps[tokenId]) / 10000;
    }

    function getTokenInfo(uint256 tokenId) external view returns (
        address creator,
        uint256 maxSupply,
        uint256 currentSupply,
        uint256 price,
        string memory songId
    ) {
        TokenInfo storage info = tokenInfos[tokenId];
        return (info.creator, info.maxSupply, info.currentSupply, info.price, info.songId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, IERC165, IERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
