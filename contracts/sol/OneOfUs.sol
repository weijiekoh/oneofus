pragma solidity ^0.5.11;

import { Poap } from "./Poap.sol";
import { Semaphore } from "./semaphore/Semaphore.sol";
import { ECDSA } from "./oz-2.3.0-contracts/cryptography/ECDSA.sol";
import { Ownable } from "./oz-2.3.0-contracts/ownership/Ownable.sol";

contract OneOfUs is Ownable {
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
    uint256 public relayRegisterReward = 0.02 ether;

    // The reward that a relayer will receive if they relay an answerQuestion()
    // transaction
    uint256 public relayAnswerReward = 0.01 ether;

    // All tokens registered via register()
    mapping (uint256 => bool) public registeredTokenIds;

    event Registered(uint256 _identityCommitment);
    event PostedQuestion(uint256 indexed _questionHash, uint256 _amountPaid);
    event AnsweredQuestion(uint256 indexed _answerIndex, bytes32 _answerHash, bytes32 _questionHash);

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
     * @param _newAmt The new amount to set
     * Sets the value of postQuestionFee. Only the owner can do this.
     */
    function setPostQuestionFee(uint256 _newAmt) public onlyOwner {
        postQuestionFee = _newAmt;
    }

    /*
     * @param _newAmt The new amount to set
     * Sets the value of relayRegisterReward. Only the owner can do this.
     */
    function setRelayRegisterReward(uint256 _newAmt) public onlyOwner {
        relayRegisterReward = _newAmt;
    }

    /*
     * @param _newAmt The new amount to set
     * Sets the value of relayAnswerReward. Only the owner can do this.
     */
    function setRelayAnswerReward(uint256 _newAmt) public onlyOwner {
        relayAnswerReward = _newAmt;
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

    /*
     * @param _identityCommitment The Semaphore identity commitment
     * @param _tokenId The ERC721 POAP token ID
     * @param _signature The signature of the token owner. See
     *        signForRegistration() in OneOfUs.test.ts for how the signature is
     *        generated. We don't use EIP712 as it's not supported on some
     *        hardware wallets yet.
     * Allows a user to register their identity as long as they own a valid
     * POAP token for the current event. Anyone can relay this transaction and
     * receive a reward as long as the signature `_signature` is truly signed
     * by the token's owner.
     */
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

        emit Registered(_identityCommitment);
    }

    /*
     * Returns all identity commitments. Use this function to get the leaves of
     * the Merkle tree so you can generate the witness, which is in turn needed
     * to generate the zk-SNARK proof of membership.
     */
    function getLeaves() public view returns (uint256[] memory) { 
        return semaphore.leaves(semaphore.id_tree_index());
    }

    /*
     * Returns all question hashes
     */
    function getQuestions() public view returns (uint256[] memory) {
        uint256 limit = semaphore.getNextExternalNullifierIndex();
        uint256[] memory result = new uint256[](limit);
        for (uint256 i; i < limit; i++){
            result[i] = semaphore.getExternalNullifierByIndex(i);
        }
        return result;
    }

    /*
     * @param _questionHash The hash of the question
     * Returns true/false depending on whether _questionHash had previously
     * been posted.
     */
    function hasQuestion(uint256 _questionHash) public view returns (bool) {
        return semaphore.hasExternalNullifier(_questionHash);
    }

    /*
     * Returns the fee (in wei) required to post a question.
     */
    function getPostQuestionFee() public view returns (uint256) {
        return postQuestionFee;
    }

    /*
     * Returns the reward (in wei) which a relayer can receive for relaying a
     * register() transaction.
     */
    function getRelayRegisterReward() public view returns (uint256) {
        return relayRegisterReward;
    }

    /*
     * Returns the reward (in wei) which a relayer can receive for relaying an
     * answerQuestion() transaction.
     */
    function getRelayAnswerReward() public view returns (uint256) {
        return relayAnswerReward;
    }

    function getAnswerByIndex(uint256 _answerIndex) public view returns (bytes memory) {
        return semaphore.signals(_answerIndex);
    }

    /*
     * @param _questionHash Submit a question to the contract. The caller must
     * pay postQuestionFee wei in order to fund the contract so that it can
     * incentivise relayers to relay register() and answerQuestion()
     * transactions.
     */
    function postQuestion(uint256 _questionHash) public payable {
        // We don't check whether the user owns a POAP token. Anyone should be
        // able to post a question, as long as they are willing to pay the
        // deposit for answerers' transaction relay refunds

        // check whether the amount paid is high enough
        require(msg.value >= getPostQuestionFee(), "OneOfUs: the fee is too low");

        // add the question as an external nullifier
        semaphore.addExternalNullifier(_questionHash);

        emit PostedQuestion(_questionHash, msg.value);
    }

    /*
     * @param _answerHash The hash of the answer
     * @param a The pi_a zk-SNARK proof data
     * @param b The pi_b zk-SNARK proof data
     * @param c The pi_c zk-SNARK proof data
     * @param input The public signals to the zk-SNARK proof. input[3] must be
     * the question hash as an uint.
     * Anonymously submit an answer the contract for a specific question. The
     * contract will accept the answer as long as the zk-SNARK proof is valid.
     * The function rewards the sender (usually a relayer) with
     * relayAnswerReward wei.
     */
    function answerQuestion(
        bytes32 _answerHash,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input // (root, nullifiers_hash, signal_hash, external_nullifier)
    ) public {
        require(hasQuestion(input[3]) == true, "OneOfUs: question does not exist");
        uint256 signalIndex = semaphore.current_signal_index();

        semaphore.broadcastSignal(
            abi.encode(_answerHash),
            a,
            b,
            c,
            input
        );

        // reward whoever submits the transaction
        msg.sender.transfer(relayAnswerReward);

        emit AnsweredQuestion(signalIndex, _answerHash, bytes32(input[3]));
    }
}
