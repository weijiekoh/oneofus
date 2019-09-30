pragma solidity ^0.5.0;

import { Poap } from "./Poap.sol";
import { Semaphore } from "./semaphore/Semaphore.sol";

contract OneOfUs {
    // The POAP token contract
    Poap public poap;

    // The Semaphore contract
    Semaphore public semaphore;

    // The event at which OneOfUs will operate
    uint256 public poapEventId;

    // TODO: find out the ideal fee amount
    uint256 public questionPostFee = 32 * 100000 * 4096;

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
        // The token must not have already been used to register the user's identity
        require(isTokenIdRegistered(_tokenId) == false, "OneOfUs: token already registered");

        // The token must be for the correct event
        require(poap.tokenEvent(_tokenId) == poapEventId, "OneOfUs: wrong POAP event ID");

        // msg.sender must own the token 
        require(poap.ownerOf(_tokenId) == msg.sender, "OneOfUs: token not owned by registrant");
        _;
    }

    function register(uint256 _identityCommitment, uint256 _tokenId)
        preRegistrationChecks(_tokenId)
    public {
        registeredTokenIds[_tokenId] = true;

        semaphore.insertIdentity(_identityCommitment);
    }

    function getLeaves() public view returns (uint256[] memory) { 
        return semaphore.leaves(semaphore.id_tree_index());
    }

    function hasQuestion(uint256 _questionHash) public view returns (bool) {
        return semaphore.hasExternalNullifier(_questionHash);
    }

    function postQuestion(uint256 _questionHash) public payable {
        // We don't check whether the user owns a POAP token. Anyone should be
        // able to post a question, as long as they are willing to pay the
        // deposit for answerers' transaction relay refunds

        // check whether the amount paid is high enough
        //require(msg.value >= questionPostFee, "OneOfUs: the question post fee is too low");

        // add the question as an external nullifier
        semaphore.addExternalNullifier(_questionHash);
    }

    function answerQuestion(
        bytes32 _answerHash,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input // (root, nullifiers_hash, signal_hash, external_nullifier)
    ) public {
        require(hasQuestion(input[3]) == true, "OneOfUs: question does not exist");
        semaphore.broadcastSignal(
            abi.encode(_answerHash),
            a,
            b,
            c,
            input
        );
    }
}
