pragma solidity ^0.5.0;

import { ERC721Mintable } from "./oz-2.3.0-contracts/token/ERC721/ERC721Mintable.sol";
import { ERC721Enumerable } from "./oz-2.3.0-contracts/token/ERC721/ERC721Enumerable.sol";

contract Poap is ERC721Mintable, ERC721Enumerable {
    // EventId for each token
    mapping(uint256 => uint256) private _tokenEvent;

    function tokenEvent(uint256 tokenId) public view returns (uint256) {
        return _tokenEvent[tokenId];
    }

    /**
     * @dev Function to mint tokens
     * @param eventId EventId for the new token
     * @param tokenId The token id to mint.
     * @param to The address that will receive the minted tokens.
     * @return A boolean that indicates if the operation was successful.
     */
    function mintToken(uint256 eventId, uint256 tokenId, address to) public returns (bool) {
        _mint(to, tokenId);
        _tokenEvent[tokenId] = eventId;
        return true;
    }
}
