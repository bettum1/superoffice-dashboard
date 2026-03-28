import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchTickets, fetchMessageAuthors, fetchCategories, fetchPriorities } from './superoffice.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/status', (req, res) => {
    const configured = !!(process.env.SO_BASE_URL && (
        process.env.SO_TICKET || process.env.SO_BEARER_TOKEN || process.env.SO_BASIC_USER
    ));
    res.json({
        configured,
        environment: process.env.SO_BASE_URL ? new URL(process.env.SO_BASE_URL).hostname : null,
        authMethod: process.env.SO_AUTH_METHOD || 'ticket'
    });
});

app.get('/api/tickets', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 180;
        const tickets = await fetchTickets(days);
        res.json(tickets);
    } catch (err) {
        console.error('Error fetching tickets:', err.message);
        res.status(502).json({ error: err.message });
    }
});

app.get('/api/message-authors', async (req, res) => {
    try {
        const ids = (req.query.ids || '').split(',').map(Number).filter(Boolean);
        if (!ids.length) return res.json({});
        const authors = await fetchMessageAuthors(ids);
        res.json(authors);
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try { res.json(await fetchCategories()); }
    catch (err) { res.status(502).json({ error: err.message }); }
});

app.get('/api/priorities', async (req, res) => {
    try { res.json(await fetchPriorities()); }
    catch (err) { res.status(502).json({ error: err.message }); }
});

app.get('/api/demo-tickets', (req, res) => {
    const days = parseInt(req.query.days) || 180;
    res.json(generateDemoData(days));
});

app.listen(PORT, () => {
import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchTickets, fetchMessageAuthors, fetchCategories, fetchPriorities } from './superoffice.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/status', (req, res) => {
    const configured = !!(process.env.SO_BASE_URL && (
        process.env.SO_TICKET || process.env.SO_BEARER_TOKEN || process.env.SO_BASIC_USER
    ));
    res.json({
        configured,
        environment: process.env.SO_BASE_URL ? new URL(process.env.SO_BASE_URL).hostname : null,
        authMethod: process.env.SO_AUTH_METHOD || 'ticket'
    });
});

app.get('/api/tickets', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const tickets = await fetchTickets(days);
        res.json(tickets);
    } catch (err) {
        console.error('Error fetching tickets:', err.message);
        res.status(502).json({ error: err.message });
    }
});

app.get('/api/message-authors', async (req, res) => {
    try {
        const ids = (req.query.ids || '').split(',').map(Number).filter(Boolean);
        if (!ids.length) return res.json({});
        const authors = await fetchMessageAuthors(ids);
        res.json(authors);
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try { res.json(await fetchCategories()); }
    catch (err) { res.status(502).json({ error: err.message }); }
});

app.get('/api/priorities', async (req, res) => {
    try { res.json(await fetchPriorities()); }
    catch (err) { res.status(502).json({ error: err.message }); }
});

app.get('/api/demo-tickets', (req, res) => {
    const days = parseInt(req.query.days) || 30;
    res.json(generateDemoData(days));
});

app.listen(PORT, () => {
    console.log(`SuperOffice Dashboard running on port ${PORT}`);
    if (!process.env.SO_BASE_URL) {
        console.log('  No SO_BASE_URL configured — dashboard will use demo data');
    }
});

// Demo data generator
function generateDemoData(days) {
    const categories = [
        { name: 'Stasjonstøtte', weight: 57 },
        { name: 'Stasjonstøtte/Avvik/Pumpe', weight: 6 },
        { name: 'Stasjonstøtte/EG kasse', weight: 5.5 },
        { name: 'Stasjonstøtte/Avvik/Kortleser', weight: 4.3 },
        { name: 'Stasjonstøtte/Avvik/Kortleser/OPT/Ute av Drift', weight: 2.6 },
        { name: 'Stasjonstøtte/T7', weight: 1.7 },
        { name: 'Stasjonstøtte/Fusion', weight: 1.7 },
        { name: 'Stasjonstøtte/Avvik/Kortleser/OPT', weight: 1.4 },
        { name: 'Stasjonstøtte/ChainWeb', weight: 1.1 },
        { name: 'Stasjonstøtte/Yara', weight: 0.9 },
        { name: 'Stasjonstøtte/Avvik/Pumpe/Pistol', weight: 0.8 },
        { name: 'Stasjonstøtte/Shop24', weight: 0.8 },
        { name: 'Stasjonstøtte/Drivstoff/Soolo', weight: 0.8 },
        { name: 'Stasjonstøtte/Avvik/Nettverk', weight: 0.7 },
        { name: 'Stasjonstøtte/Nettec', weight: 0.6 },
        { name: 'Stasjonstøtte/Skanol/Levering', weight: 0.5 },
        { name: 'Stasjonstøtte/Avvik/Kasse', weight: 0.5 },
        { name: 'Stasjonstøtte/Avvik/Tank', weight: 0.4 },
        { name: 'Stasjonstøtte/Til info', weight: 0.4 },
        { name: 'Stasjonstøtte/Arbeidsordre', weight: 0.3 },
    ];
    const stations = [
        'YX Røra','YX Magnor','YX Karasjok','YX Sykkylven','YX Skulestadmo',
        'YX Myre','YX Sortland','YX Fauske','YX Stryn','YX Ørsta',
        'YX Eidsvoll','YX Ålesund','YX Molde','YX Kirkenes','YX Sandnessjøen',
        'YX Brønnøysund','YX Verdal','YX Steinkjer','YX Namsos','YX Mosjøen',
        'YX Leknes','YX Svolvær','YX Narvik','YX Harstad','YX Tromsø',
        'YX Alta','YX Hammerfest','YX Lakselv','YX Vadsø','YX Vardø'
    ];
    const handlers = [
        { name: 'Einar Dahlen', focus: ['Avvik'] },
        { name: 'Jørgen Rønning', focus: ['Avvik','Stasjonstøtte'] },
        { name: 'Astrid Johanne Ustad', focus: ['Stasjonstøtte','EG kasse'] },
        { name: 'Reidun Olsen', focus: ['Stasjonstøtte'] },
        { name: 'EG Retail NO', focus: ['EG kasse','ChainWeb'] },
        { name: 'Cato Nygård', focus: ['Stasjonstøtte','Drivstoff'] },
        { name: 'Arild Berg', focus: ['T7','OPT'] },
        { name: 'Lars Petter Holm', focus: ['Fusion','Nettec'] },
    ];
    const titleTemplates = {
        'Stasjonstøtte': ['{station} - generell henvendelse','Arbeidsordre {nr} sluttført','{station} - spørsmål om drift'],
        'Avvik/Pumpe': ['{station} - pumpe {n} stopper','{station} - drivstofflekkasje pumpe {n}','{station} - pumpe ute av drift'],
        'Avvik/Kortleser': ['{station} - kortleser nede','OPT {n} Midlertidig stengt','{station} - betalingsterminal feil'],
        'EG kasse': ['{station} - kasse henger','{station} - kassefeil ved oppstart','{station} - EG POS feilmelding'],
        'T7': ['OPT {n} Midlertidig stengt','T7 feil {station}','{station} - T7 kommunikasjonsfeil'],
        'Fusion': ['{station} - Fusion integrasjon nede','Fusion synkfeil','{station} - Fusion timeout'],
        'ChainWeb': ['{station} - ChainWeb nede','ChainWeb rapportfeil','{station} - ChainWeb innlogging feiler'],
        'default': ['{station} - driftsproblem','{station} - trenger assistanse','Automatisk alarm - {station}']
    };
    const totalWeight = categories.reduce((s,c) => s+c.weight, 0);
    const now = Date.now();
    const ticketCount = Math.round(days * 1693 / 90);
    const tickets = [];
    for (let i = 0; i < ticketCount; i++) {
        let r = Math.random() * totalWeight;
        let cat = categories[0];
        for (const c of categories) { r -= c.weight; if (r <= 0) { cat = c; break; } }
        const station = stations[Math.floor(Math.random() * stations.length)];
        const created = new Date(now - Math.random() * days * 86400000);
        const statusRoll = Math.random();
        const status = statusRoll < 0.069 ? 'Open' : statusRoll < 0.071 ? 'Postponed' : 'Closed';
        let resolveMin = null;
        if (status === 'Closed') {
            const catKey = cat.name.includes('Avvik') ? 'avvik' : cat.name.includes('EG kasse') ? 'eg' : 'general';
            const baseH = catKey === 'avvik' ? 180 : catKey === 'eg' ? 100 : 40;
            resolveMin = Math.round((Math.random() * baseH * 1.5 + 0.5) * 60);
        }
        const catShort = cat.name.replace('Stasjonstøtte/','').replace('Stasjonstøtte','default');
        const templateKey = Object.keys(titleTemplates).find(k => catShort.startsWith(k)) || 'default';
        const templates = titleTemplates[templateKey];
        let title = templates[Math.floor(Math.random() * templates.length)]
            .replace('{station}', station).replace('{n}', Math.floor(Math.random()*4)+1)
            .replace('{nr}', 1020000 + Math.floor(Math.random()*9000));
        const handler = handlers[Math.floor(Math.random() * handlers.length)];
        const closed = status === 'Closed' ? new Date(created.getTime() + resolveMin * 60000) : null;
        tickets.push({
            TicketId: 40000+i, Title: title, CreatedAt: created.toISOString(),
            ClosedAt: closed ? closed.toISOString() : null, BaseStatus: status,
            Category: { Name: cat.name },
            Priority: { Name: Math.random() < 0.83 ? 'Stasjonstøtte' : 'Standard Kundestøtte YX' },
            OwnedBy: { FullName: '' }, TicketType: { Name: 'Request' },
            TimeToClose: resolveMin,
            RealTimeToClose: resolveMin ? Math.round(resolveMin * (0.8 + Math.random() * 0.4)) : null,
            TimeToReply: Math.round(Math.random()*60+5),
            RealTimeToReply: Math.round(Math.random()*60+5),
            Deadline: new Date(created.getTime() + (Math.random()<0.5?24:48)*3600000).toISOString(),
            NumberOfMessages: Math.floor(Math.random()*5)+1,
            NumberOfReplies: Math.floor(Math.random()*3),
            ContactName: station, PersonName: '',
            _handler: handler.name
        });
    }
    return tickets.sort((a,b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
}
