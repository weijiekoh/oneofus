import { getOouContract } from './contracts'

const getLeaves = async (context: any) => {
    const oouContract = await getOouContract(context)
    return await oouContract.getLeaves()
}

export {
    getLeaves,
}
