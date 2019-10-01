import * as ethers from 'ethers'

const signForRegistration = (wallet, idComm, tokenId) => {
    const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256'],
        [idComm, tokenId].map((x) => '0x' + x.toString(16)),
    )
    const hash = ethers.utils.keccak256(payload)

    return wallet.signMessage(ethers.utils.arrayify(hash))
}

export {
    signForRegistration,
}
