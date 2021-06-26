import TEMPLATE_REDIRECT from './redirect.html'
import cheerio from 'cheerio'

const ME_URL = 'https://me.dubi-stow.ch'

const getMetaData = async (shortLink) => {
    const fallback = {
        'origin': ME_URL,
        'utm_source': 'not-found-fallback',
        'utm_medium': 'web',
        'utm_campaign': 'about.me'
    }
    const metaData = await WORKERS_KV_LINKS.get(shortLink)
    if (!metaData) {
        return fallback
    }
    return JSON.parse(metaData)
}

const utmBilder = (meta) => {
    return `utm_source=${meta.utm_source}&utm_medium=${meta.utm_medium}&utm_campaign=${meta.utm_campaign}`
}

const getMeFallbackLink = (campaign = 'error_fallback') => {
    const utm = utmBilder({
        utm_source: 'cloudflare',
        utm_medium: 'web',
        utm_campaign: campaign
    })
    return `${ME_URL}/?${utm}`
}

const makeResponse = (code, url, content = null) => {
    switch (code) {
        case 200:
            return new Response(content, {
                headers: { 'Content-Type': 'text/html' },
                status: code
            })
        case 301:
            return Response.redirect(url, code)
        case 405:
            return new Response('', { status: code })
    }

}

async function fetchOGData(requestURL) {
    const fetchOpts = {
        redirect: 'follow',
        follow: 20,
        cf: {
            cacheTtl: 10,
            cacheEverything: true
        }
    }
    const response = await fetch(new URL(requestURL), fetchOpts)
    const body = await ((result) => result.text())(response)

    console.log('fetch: ', body.length)
    const $ = cheerio.load(body)
    const title = $('title').toString()
    const metadata = $('meta').toString()
    return { title, metadata }
}

const renderRedirectPage = async (requestURL) => {
    const { title, metadata } = await fetchOGData(requestURL)
    let results = TEMPLATE_REDIRECT.toString()
    results = results.replaceAll('${title}', `${title}`)
    results = results.replaceAll('${metadata}', `${metadata}`)
    results = results.replaceAll('${requestURL}', `${requestURL}`)
    results = results.replaceAll('${cachedAt}', `${(new Date).toISOString()}`)

    return makeResponse(200, null, results)
}

async function handleRequest(event) {

    const { request: { headers, url, method } } = event

    const reqURL = new URL(url)
    const reqUserAgent = (headers.get('User-Agent') || '').toString().toLowerCase()
    const reqMethod = method.toUpperCase()

    if (['GET', 'OPTIONS'].includes(reqMethod) === false) {
        return makeResponse(405)
    }

    let [, ...shortLink] = reqURL.pathname.split('/')
    if (shortLink.length > 0) {
        shortLink = shortLink.join('/')

        try {

            // Get short link data from KV
            const metaData = await getMetaData(shortLink)
            if (reqUserAgent.indexOf('bot') > -1) {
                // If reqeust from a crawler bot
                return makeResponse(301, metaData.origin)
            }
            if (reqURL.search.indexOf('utm_source=') == -1) {
                return makeResponse(301, `${reqURL.origin}${reqURL.pathname}?${utmBilder(metaData)}`)
            }

            // const rendered = await renderRedirectPage(metaData.origin)
            return renderRedirectPage(metaData.origin, event)

        } catch (error) {
            console.log(error)
            return makeResponse(301, getMeFallbackLink('error_fallback'))
        }
    }
    return makeResponse(301, getMeFallbackLink('not_found_fallback'))
}

addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event))
})
