const config = require('../exported_config')

const post = async (
    method: string,
    params: any
) => {
    const resp = await fetch(
        '/api', 
        {
            method: 'POST',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params,
            }),
        },
    )

    const response = await resp.json()
    if (response.result) {
        return response.result
    } else {
        throw response.error
    }
}

const listQns = () => {
    return post('oou_list_qns', {})
}

const listAnsToQn = (questionHash: string) => {
    return post('oou_list_ans_to_qn', { questionHash })
}

const postQn = (question: string, tokenId: number, sig: string) => {
    return post('oou_post_qn', { question, tokenId, sig})
}

const postAns = ({
    questionHash,
    answer,
    proof,
    publicSignals,
}) => {
    return post(
        'oou_post_ans',
        { 
            questionHash, answer, proof, publicSignals
        },
    )
}

const fetchWithoutCache = (
    url: string,
) => {
    return fetch(
        url,
        {cache: "no-store"},
    )
}

export {
    fetchWithoutCache,
    listQns,
    postQn,
    postAns,
    listAnsToQn,
}
