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

    /*
     * @param _tokenId The ERC721 POAP token ID
     * Returns true/false depending on whether the user has already registered
     * their token with ID _tokenId
     */
    function isTokenIdRegistered(uint256 _tokenId) public view returns (bool) {
        return registeredTokenIds[_tokenId];
    }

    /*
     * @param _tokenId The ERC721 POAP token ID
     * A convenience view function for clients to check whether register() will
     * pass or fail because of the reasons listed in `preRegistrationChecks()`
     */
    function preRegistrationVerify(uint256 _tokenId) public view returns (bool) {
        return 
            isTokenIdRegistered(_tokenId) == false && 
            poap.tokenEvent(_tokenId) == poapEventId;
    }

    /*
     * @param _tokenId The ERC721 POAP token ID
     * Ensures that the user has not already registered with the given token,
     * and that they are registering for the correct event.
     */
    modifier preRegistrationChecks(uint256 _tokenId) {
        require(isTokenIdRegistered(_tokenId) == false, "OneOfUs: token ID already registered");
        require(poap.tokenEvent(_tokenId) == poapEventId, "OneOfUs: wrong POAP event ID");
        _;
    }

    function register(uint256 identityCommitment, uint256 _tokenId)
        preRegistrationChecks(_tokenId)
    public {

        registeredTokenIds[_tokenId] = true;

        semaphore.insertIdentity(identityCommitment);
    }
}
