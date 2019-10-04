# OneOfUs: an anonymous survey/voting dApp built on POAP and Semaphore built for DevCon 5

OneOfUs lets you ask questions to attendees of [Devcon 5](https://devcon.org/),
and lets them, and only them, reply anonymously.


## How it works

Each attendee at Devcon 5 will receive a non-fungible
[Proof of Attendance Token](http://poap.xyz) (POAP). We assume that only Devcon
5 attendees own POAP tokens associated with this event.

There is an Ethereum contract to which anyone can submit questions. When a user
submits a question, they have to pay a 0.05 ETH fee.

Attendees can register themselves to the contract as long as they own a Devcon
5 POAP token. When they wish to respond to a question, they can use OneOfUs to
generate a proof of their initial registration. This proof does not reveal
their identity, but only their membership in the set of registered identities.
They can then send their proof and an answer to a relayer, who performs a
transaction to verify their membership and broadcast their answer. They relayer
receives a reward for their service, which is drawn from the fees paid out by
those who submit questions.

Under the hood, OneOfUs uses
[Semaphore](https://github.com/kobigurk/semaphore), a zero-knowledge signalling
gadget. Read more about it [here](https://medium.com/coinmonks/to-mixers-and-beyond-presenting-semaphore-a-privacy-gadget-built-on-ethereum-4c8b00857c9b).

### Backend API

#### oou_post_qn

Parameters:

- `question` as a `string` which is the plaintext of the question. Max 280 characters.

- `sig` as an `ethereumSignature` which is the signature of the question hashed with Keccak256

Returns:

If the signature is signed by a registered user, return:

- `questionHash` as a `bytes32` which is the Keccak256 hash of the question

Otherwise, return an `NO_SUCH_USER` error.

#### oou_list_qns

Parameters: none

Returns:

- `questions`: as an list of objects. Each object contains the following keys:

    - `datetime` as a `number`: the time at which the question was posted, in Unix time

    - `question` as a `string`: the text of the question
    
    - `sig` as the signature provided by the user who posted the question

#### oou_post_answer

Parameters:

- `questionHash` as a `string` which is the Keccak256 hash of the question

- `answer` as a `string` which is the answer to the question

- `proof` as a `string` which is the stringified JSON representaiton of the
  zk-SNARK proof of the user's membership in the list of registered users. All
  `BigInts` should be in string form.

If the proof is valid, return:

- `answerHash` as a `hexstring` which is the Keccak256 hash of the answer

Otherwise, return an `INVALID_PROOF` error.

#### oou_list_answers

Parameters:

- `questionHash` as a `string` which is the Keccak256 hash of the question

Returns:

- `answer`: as an list of objects. Each object contains the following keys:

    - `datetime` as a `number`: the time at which the answer was posted, in Unix time

    - `answer` as a `string`: the text of the answer
    
    - `proof` as the zk-SNARK proof provided by the user who posted the answer
