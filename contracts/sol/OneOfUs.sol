pragma solidity ^0.5.11;

import { Poap } from "./Poap.sol";
import { Semaphore } from "./semaphore/Semaphore.sol";
import { ECDSA } from "./oz-2.3.0-contracts/cryptography/ECDSA.sol";

contract OneOfUs {
    // The POAP token contract
    Poap public poap;

    // The Semaphore contract
    Semaphore public semaphore;

    // The event at which OneOfUs will operate
    uint256 public poapEventId;

    // The minimum fee that anyone who posts a question must pay along with
    // their transaction
    uint256 public postQuestionFee = 0.05 ether;

    // The reward that a relayer will receive if they relay a register()
    // transaction
    uint256 public relayRegisterReward = 0.005 ether;

    // The reward that a relayer will receive if they relay an answerQuestion()
    // transaction
    uint256 public relayAnswerReward = 0.01 ether;

    mapping (uint256 => bool) public registeredTokenIds;

    constructor (address _poap, address _semaphore, uint256 _poapEventId) public {
        poap = Poap(_poap);
        semaphore = Semaphore(_semaphore);
        poapEventId = _poapEventId;
    }

    /*
     * Anyone may pre-fund this contract
     */
    function () external payable {}

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
     * pass or fail because of the reasons listed in `checkRegistrationToken()`
     */
    function verifyRegistrationToken(uint256 _tokenId) public view returns (bool) {
        return 
            isTokenIdRegistered(_tokenId) == false && 
            poap.tokenEvent(_tokenId) == poapEventId;
    }

    /*
     * @param _tokenId The ERC721 POAP token ID
     * Ensures that the user has not already registered with the given token,
     * and that they are registering for the correct event.
     */
    modifier checkRegistrationToken(uint256 _tokenId) {
        // The token must not have already been used to register the user's identity
        require(isTokenIdRegistered(_tokenId) == false, "OneOfUs: token already registered");

        // The token must be for the correct event
        require(poap.tokenEvent(_tokenId) == poapEventId, "OneOfUs: wrong POAP event ID");

        _;
    }

    function register(
		uint256 _identityCommitment,
		uint256 _tokenId,
		bytes memory _signature
	)
        checkRegistrationToken(_tokenId)
    public {
        // Recover the address of the private key used to sign the data.
        // This proves that the token owner's true intent to register their
        // token and identity commmitment.
        bytes32 hash = keccak256(abi.encode(_identityCommitment, _tokenId));
        address recoveredSigner = ECDSA.recover(
			keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)),
            _signature
        );

        require(recoveredSigner == poap.ownerOf(_tokenId), "OneOfUs: signer does not own this token");

        registeredTokenIds[_tokenId] = true;
        semaphore.insertIdentity(_identityCommitment);

        // reward whoever submits the transaction
        msg.sender.transfer(relayRegisterReward);
    }

    function getLeaves() public view returns (uint256[] memory) { 
        return semaphore.leaves(semaphore.id_tree_index());
    }

    function hasQuestion(uint256 _questionHash) public view returns (bool) {
        return semaphore.hasExternalNullifier(_questionHash);
    }

    function getPostQuestionFee() public view returns (uint256) {
        return postQuestionFee;
    }

    function postQuestion(uint256 _questionHash) public payable {
        // We don't check whether the user owns a POAP token. Anyone should be
        // able to post a question, as long as they are willing to pay the
        // deposit for answerers' transaction relay refunds

        // check whether the amount paid is high enough
        require(msg.value >= getPostQuestionFee(), "OneOfUs: the fee is too low");

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

        // reward whoever submits the transaction
        msg.sender.transfer(relayAnswerReward);
    }
}
