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

const fetchQns = () => {
    return post('oou_list_qns', {})
}

export {
    fetchQns,
}
