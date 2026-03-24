const BASE_URL = process.env.SO_BASE_URL?.replace(/\/+$/, '');

function getHeaders() {
    const headers = { 'Accept': 'application/json' };
    const method = process.env.SO_AUTH_METHOD || 'ticket';
    switch (method) {
        case 'ticket':
            if (!process.env.SO_TICKET || !process.env.SO_APP_TOKEN)
                throw new Error('SO_TICKET and SO_APP_TOKEN must be set for SOTicket authentication');
            headers['Authorization'] = `SOTicket ${process.env.SO_TICKET}`;
            headers['SO-AppToken'] = process.env.SO_APP_TOKEN;
            break;
        case 'bearer':
            if (!process.env.SO_BEARER_TOKEN)
                throw new Error('SO_BEARER_TOKEN must be set for Bearer authentication');
            headers['Authorization'] = `Bearer ${process.env.SO_BEARER_TOKEN}`;
            break;
        case 'basic':
            if (!process.env.SO_BASIC_USER || !process.env.SO_BASIC_PASS)
                throw new Error('SO_BASIC_USER and SO_BASIC_PASS must be set for Basic authentication');
            headers['Authorization'] = `Basic ${Buffer.from(`${process.env.SO_BASIC_USER}:${process.env.SO_BASIC_PASS}`).toString('base64')}`;
            break;
        default:
            throw new Error(`Unknown auth method: ${method}`);
    }
    return headers;
}

async function apiGet(path, retries = 2) {
    if (!BASE_URL) throw new Error('SO_BASE_URL is not configured');
    const url = `${BASE_URL}${path}`;
    const headers = getHeaders();
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
            if (res.status === 429) {
                const wait = parseInt(res.headers.get('Retry-After') || '5');
                await sleep(wait * 1000);
                continue;
            }
            if (res.status === 401 || res.status === 403)
                throw new Error(`Authentication failed (${res.status}). Check your credentials.`);
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`API error ${res.status}: ${res.statusText}. ${body}`);
            }
            return await res.json();
        } catch (err) {
            if (err.name === 'TimeoutError' && attempt < retries) continue;
            throw err;
        }
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeTicket(t) {
    return {
        TicketId: t.ticketId, Title: t.title || '',
        CreatedAt: t.createdAt,
        ClosedAt: t.closedAt && !t.closedAt.startsWith('0001') ? t.closedAt : null,
        BaseStatus: t.status || 'Unknown',
        Category: { Name: t.categoryFullName || '' },
        Priority: { Name: t.priorityName || '' },
        OwnedBy: { FullName: t.ownedByName || '' },
        TicketType: { Name: t.ticketTypeName || '' },
        TimeToClose: t.timeToClose ? Math.round(t.timeToClose / 60) : null,
        RealTimeToClose: t.realTimeToClose ? Math.round(t.realTimeToClose / 60) : null,
        TimeToReply: t.timeToReply ? Math.round(t.timeToReply / 60) : null,
        RealTimeToReply: t.realTimeToReply ? Math.round(t.realTimeToReply / 60) : null,
        Deadline: t.deadline && !t.deadline.startsWith('0001') ? t.deadline : null,
        NumberOfMessages: t.numberOfMessages || 0,
        NumberOfReplies: t.numberOfReplies || 0,
        ContactName: t.contactName || '',
        PersonName: t.personName || ''
    };
}

export async function fetchTickets(days = 30) {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const select = ['ticketId','title','createdAt','closedAt','lastChanged','status','categoryFullName','priorityName','ticketTypeName','ownedByName','contactName','personName','timeToClose','realTimeToClose','timeToReply','realTimeToReply','numberOfMessages','numberOfReplies','deadline','readStatus'].join(',');
    let tickets = [];
    let skip = 0;
    const batchSize = 200;
    while (true) {
        const path = `/api/v1/Ticket?$select=${select}&$filter=createdAt afterTime '${since}'&$top=${batchSize}&$skip=${skip}&$orderBy=createdAt desc`;
        const data = await apiGet(path);
        const batch = Array.isArray(data) ? data : (data.value || []);
        tickets = tickets.concat(batch.map(normalizeTicket));
        if (batch.length < batchSize) break;
        skip += batchSize;
        if (tickets.length >= 10000) break;
    }
    console.log(`Fetched ${tickets.length} tickets (since ${since})`);
    return tickets;
}

export async function fetchMessageAuthors(ticketIds) {
    const authorMap = {};
    for (const tid of ticketIds) {
        try {
            const data = await apiGet(`/api/v1/Ticket/${tid}/Messages?$select=author,slevel`);
            const msgs = data.value || data || [];
            msgs.forEach(m => {
                const author = m.author || '';
                const level = m.slevel || '';
                if (author && level === 'Internal') {
                    if (!authorMap[author]) authorMap[author] = { replies: 0, ticketIds: [] };
                    authorMap[author].replies++;
                    if (!authorMap[author].ticketIds.includes(tid)) authorMap[author].ticketIds.push(tid);
                }
            });
        } catch (e) {}
        await sleep(100);
    }
    return authorMap;
}

export async function fetchCategories() {
    return apiGet('/api/v1/List/TicketCategory/Items');
}

export async function fetchPriorities() {
    return apiGet('/api/v1/List/TicketPriority/Items');
}
