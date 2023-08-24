export async function onRequest({ request, env }) {
    const { searchParams } = new URL(request.url)
    const apiSecret = env.GA4_API_SECRET;
    const measurementId = searchParams.get('tid');
    const url = `https://www.google-analytics.com/mp/collect?api_secret=${apiSecret}&measurement_id=${measurementId}`;
    const ipAddress = request.headers.get('cf-connecting-ip');
    const userAgent = request.headers.get('user-agent');
    const clientId = await hashText(ipAddress + userAgent);
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
            'content-type': 'application/json',
        },
    });
}

async function hashText(input) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
