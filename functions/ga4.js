export async function onRequest({ request, env }) {
    const { searchParams } = new URL(request.url)
    const api_secret = env.GA4_API_SECRET;
    const measurement_id = searchParams.get('tid');
    const url = `https://www.google-analytics.com/mp/collect?api_secret=${api_secret}&measurement_id=${measurement_id}`;
    const ipAddress = request.headers.get('cf-connecting-ip');
    const userAgent = request.headers.get('user-agent');
    const clientId = await getClientId(ipAddress, userAgent);
    const body = {
        client_id: clientId,
        events: [{
            name: 'page_view',
            params: {
                page_location: searchParams.get('dl'),
                page_title: searchParams.get('dt'),
                ip_override: ipAddress,
                user_agent: userAgent,
            },
        }],
        user_properties: {
            country: {
                value: request.headers.get('cf-ipcountry'),
            },
            language: {
                value: request.headers.get('accept-language')?.split(',')?.[0],
            },
            platform: {
                value: 'web',
            },
        },
    };
    return await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json; charset=UTF-8',
        },
    });
};

async function getClientId(ipAddress, userAgent) {
    const source = ipAddress + userAgent;
    const data = new TextEncoder().encode(source);
    const hash = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
