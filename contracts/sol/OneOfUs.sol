pragma solidity ^0.5.0;

import { Poap } from "./Poap.sol";
import { Semaphore } from "./semaphore/Semaphore.sol";

contract OneOfUs {
    Poap public poap;
    Semaphore public semaphore;
    uint256 public poapEventId;

    mapping (uint256 => bool) public registeredTokenIds;

    constructor (address _poap, address _semaphore, uint256 _poapEventId) public {
        poap = Poap(_poap);
        semaphore = Semaphore(_semaphore);
        poapEventId = _poapEventId;
    }

    function isTokenIdRegistered(uint256 _tokenId) public view returns (bool) {
        return registeredTokenIds[_tokenId];
    }

    function register(uint256 identityCommitment, uint256 _tokenId) public {
        require(isTokenIdRegistered(_tokenId) == false, "OneOfUs: token ID already registered");
        registeredTokenIds[_tokenId] = true;

        require(poap.tokenEvent(_tokenId) == poapEventId, "OneOfUs: wrong POAP event ID");

        semaphore.insertIdentity(identityCommitment);
    }
}
