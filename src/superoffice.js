/**
 * SuperOffice REST API Client for YX Norge Service Dashboard
 *
 * Handles authentication and data fetching from the SuperOffice WebAPI.
 * For SuperOffice Online (CRM Online), uses session-based auth:
 *   1. Calls /api/v1/Agents/Authentication/Authenticate with user/pass
 *   2. Gets a session ticket (SOTicket) back
 *   3. Uses SOTicket header for all subsequent API calls
 *
 * Data model notes (discovered from Cust30093):
 * - Archive provider returns lowercase fields: ticketId, categoryFullName, ownedByName, etc.
 * - timeToClose and realTimeToClose are in SECONDS
 * - Tickets are mostly unassigned (ownedBy empty) â actual handlers found via message authors
 * - Categories follow pattern: StasjonstÃ¸tte/Avvik/Pumpe, StasjonstÃ¸tte/EG kasse, etc.
 * - Priorities: "StasjonstÃ¸tte", "Standard KundestÃ¸tte YX"
 *
 * API Reference: https://docs.superoffice.com/en/api/reference/restful/rest/index.html
 */

const BASE_URL = process.env.SO_BASE_URL?.replace(/\/+$/, '');

// Session ticket cache
let sessionTicket = null;
let ticketExpiry = 0;

/**
 * Authenticate with SuperOffice Online and get a session ticket.
 * The ticket is cached and refreshed when expired (every 5 minutes for safety).
 */
async function getSessionTicket() {
    const now = Date.now();
    if (sessionTicket && now < ticketExpiry) return sessionTicket;

    const user = process.env.SO_BASIC_USER;
    const pass = process.env.SO_BASIC_PASS;
    if (!user || !pass) throw new Error('SO_BASIC_USER and SO_BASIC_PASS must be set');

    console.log('Authenticating with SuperOffice Online...');
    const authUrl = `${BASE_URL}/api/v1/Agents/Authentication/Authenticate`;
    const res = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ UserName: user, Password: pass }),
        signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Authentication failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    // Response contains either Credentials or a ticket string
    const ticket = data.Credentials || data.Ticket || data;
    if (typeof ticket === 'string' && ticket.length > 10) {
        sessionTicket = ticket;
    } else if (data.Credentials) {
        sessionTicket = data.Credentials;
    } else {
        // Try to extract from response headers or body
        const setCookie = res.headers.get('set-cookie') || '';
        const match = setCookie.match(/SOAuth-Ticket=([^;]+)/);
        if (match) sessionTicket = match[1];
        else throw new Error('Could not extract session ticket from auth response: ' + JSON.stringify(data).substring(0, 200));
    }

    // Cache for 5 minutes (tickets typically last 6h but refresh often for safety)
    ticketExpiry = now + 5 * 60 * 1000;
    console.log('Successfully authenticated with SuperOffice Online');
    return sessionTicket;
}

async function getHeaders() {
    const headers = { 'Accept': 'application/json' };
    const method = process.env.SO_AUTH_METHOD || 'ticket';

    switch (method) {
        case 'basic': {
            // Standard HTTP Basic auth â SuperOffice Online accepts this directly
            const user = process.env.SO_BASIC_USER;
            const pass = process.env.SO_BASIC_PASS;
            if (!user || !pass) throw new Error('SO_BASIC_USER and SO_BASIC_PASS must be set');
            const token = Buffer.from(`${user}:${pass}`).toString('base64');
            headers['Authorization'] = `Basic ${token}`;
            break;
        }
        case 'ticket':
            if (!process.env.SO_TICKET)
                throw new Error('SO_TICKET must be set for SOTicket authentication');
            headers['Authorization'] = `SOTicket ${process.env.SO_TICKET}`;
            if (process.env.SO_APP_TOKEN) headers['SO-AppToken'] = process.env.SO_APP_TOKEN;
            break;
        case 'bearer':
            if (!process.env.SO_BEARER_TOKEN)
                throw new Error('SO_BEARER_TOKEN must be set for Bearer authentication');
            headers['Authorization'] = `Bearer ${process.env.SO_BEARER_TOKEN}`;
            break;
        default:
            throw new Error(`Unknown auth method: ${method}`);
    }
    return headers;
}

async function apiGet(path, retries = 2) {
    if (!BASE_URL) throw new Error('SO_BASE_URL is not configured');
    const url = `${BASE_URL}${path}`;
    const headers = await getHeaders();

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
            if (res.status === 429) {
                const wait = parseInt(res.headers.get('Retry-After') || '5');
                await sleep(wait * 1000);
                continue;
            }
            if (res.status === 401 || res.status === 403) {
                // Invalidate cached ticket and retry once
                sessionTicket = null;
                ticketExpiry = 0;
                if (attempt < retries) {
                    const newHeaders = await getHeaders();
                    const retryRes = await fetch(url, { headers: newHeaders, signal: AbortSignal.timeout(30000) });
                    if (retryRes.ok) return await retryRes.json();
                }
                throw new Error(`Authentication failed (${res.status}). Check your credentials.`);
            }
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

/**
 * Normalize a ticket from SuperOffice archive provider format
 * to the dashboard's internal format.
 */
function normalizeTicket(t) {
    return {
        TicketId: t.ticketId,
        Title: t.title || '',
        CreatedAt: t.createdAt,
        ClosedAt: t.closedAt && !t.closedAt.startsWith('0001') ? t.closedAt : null,
        BaseStatus: t.status || 'Unknown',
        Category: { Name: t.categoryFullName || '' },
        Priority: { Name: t.priorityName || '' },
        OwnedBy: { FullName: t.ownedByName || '' },
        TicketType: { Name: t.ticketTypeName || '' },
        // Convert seconds â minutes for dashboard
        TimeToClose: t.timeToClose ? Math.round(t.timeToClose / 60) : null,
        RealTimeToClose: t.realTimeToClose ? Math.round(t.realTimeToClose / 60) : null,
        TimeToReply: t.timeToReply ? Math.round(t.timeToReply / 60) : null,
        RealTimeToReply: t.realTimeToReply ? Math.round(t.realTimeToReply / 60) : null,
        Deadline: t.deadline && !t.deadline.startsWith('0001') ? t.deadline : null,
        NumberOfMessages: t.numberOfMessages || 0,
        NumberOfReplies: t.numberOfReplies || 0,
        // Preserve raw contactName for station extraction
        ContactName: t.contactName || '',
        PersonName: t.personName || ''
    };
}

/**
 * Fetch all tickets created within the given number of days.
 */
export async function fetchTickets(days = 30) {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const select = [
        'ticketId', 'title', 'createdAt', 'closedAt', 'lastChanged',
        'status', 'categoryFullName', 'priorityName', 'ticketTypeName',
        'ownedByName', 'contactName', 'personName',
        'timeToClose', 'realTimeToClose', 'timeToReply', 'realTimeToReply',
        'numberOfMessages', 'numberOfReplies',
        'deadline', 'readStatus'
    ].join(',');

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

/**
 * Fetch message authors for a batch of ticket IDs.
 * Used to determine which employees actually handle tickets.
 */
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
                    if (!authorMap[author].ticketIds.includes(tid)) {
                        authorMap[author].ticketIds.push(tid);
                    }
                }
            });
        } catch (e) {
            // Skip individual failures
        }
        // Rate limit protection
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
