// contracts/NFT.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NGO_NFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // The constructor now takes the initial owner's address
    constructor(address initialOwner)
        ERC721("NGO Donation NFT", "NGONFT")
        Ownable(initialOwner) // Pass the owner to the Ownable constructor
    {}

    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // --- REQUIRED OVERRIDES TO RESOLVE CONFLICTS ---

    // We must override tokenURI because it's defined in both ERC721 and ERC721URIStorage.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    // We must override supportsInterface for the same reason.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}