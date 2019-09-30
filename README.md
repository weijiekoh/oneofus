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
