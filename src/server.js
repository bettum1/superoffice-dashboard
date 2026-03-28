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
    console.log(`SuperOffice Dashboard running on port ${PORT}`);
    if (!process.env.SO_BASE_URL) {
        console.log('  No SO_BASE_URL configured \u2014 dashboard will use demo data');
    }
});

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// REALISTIC DEMO DATA (based on YX Norge Cust30093 structure)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function generateDemoData(days) {
    const categories = [
        { name: 'Stasjonst\u00f8tte', weight: 57 },
        { name: 'Stasjonst\u00f8tte/Avvik/Pumpe', weight: 6 },
        { name: 'Stasjonst\u00f8tte/EG kasse', weight: 5.5 },
        { name: 'Stasjonst\u00f8tte/Avvik/Kortleser', weight: 4.3 },
        { name: 'Stasjonst\u00f8tte/Avvik/Kortleser/OPT/Ute av Drift', weight: 2.6 },
        { name: 'Stasjonst\u00f8tte/T7', weight: 1.7 },
        { name: 'Stasjonst\u00f8tte/Fusion', weight: 1.7 },
        { name: 'Stasjonst\u00f8tte/Avvik/Kortleser/OPT', weight: 1.4 },
        { name: 'Stasjonst\u00f8tte/ChainWeb', weight: 1.1 },
        { name: 'Stasjonst\u00f8tte/Yara', weight: 0.9 },
        { name: 'Stasjonst\u00f8tte/Avvik/Pumpe/Pistol', weight: 0.8 },
        { name: 'Stasjonst\u00f8tte/Shop24', weight: 0.8 },
        { name: 'Stasjonst\u00f8tte/Drivstoff/Soolo', weight: 0.8 },
        { name: 'Stasjonst\u00f8tte/Avvik/Nettverk', weight: 0.7 },
        { name: 'Stasjonst\u00f8tte/Nettec', weight: 0.6 },
        { name: 'Stasjonst\u00f8tte/Skanol/Levering', weight: 0.5 },
        { name: 'Stasjonst\u00f8tte/Avvik/Kasse', weight: 0.5 },
        { name: 'Stasjonst\u00f8tte/Avvik/Tank', weight: 0.4 },
        { name: 'Stasjonst\u00f8tte/Til info', weight: 0.4 },
        { name: 'Stasjonst\u00f8tte/Arbeidsordre', weight: 0.3 },
    ];

    const stations = [
        'YX R\u00f8ra', 'YX Magnor', 'YX Karasjok', 'YX Sykkylven', 'YX Skulestadmo',
        'YX Myre', 'YX Sortland', 'YX Fauske', 'YX Stryn', 'YX \u00d8rsta',
        'YX Eidsvoll', 'YX \u00c5lesund', 'YX Molde', 'YX Kirkenes', 'YX Sandnessj\u00f8en',
        'YX Br\u00f8nn\u00f8ysund', 'YX Verdal', 'YX Steinkjer', 'YX Namsos', 'YX Mosj\u00f8en',
        'YX Leknes', 'YX Svolv\u00e6r', 'YX Narvik', 'YX Harstad', 'YX Troms\u00f8',
        'YX Alta', 'YX Hammerfest', 'YX Lakselv', 'YX Vads\u00f8', 'YX Vard\u00f8'
    ];

    const handlers = [
        { name: 'Einar Dahlen', focus: ['Avvik'] },
        { name: 'J\u00f8rgen R\u00f8nning', focus: ['Avvik', 'Stasjonst\u00f8tte'] },
        { name: 'Astrid Johanne Ustad', focus: ['Stasjonst\u00f8tte', 'EG kasse'] },
        { name: 'Reidun Olsen', focus: ['Stasjonst\u00f8tte'] },
        { name: 'EG Retail NO', focus: ['EG kasse', 'ChainWeb'] },
        { name: 'Cato Nyg\u00e5rd', focus: ['Stasjonst\u00f8tte', 'Drivstoff'] },
        { name: 'Arild Berg', focus: ['T7', 'OPT'] },
        { name: 'Lars Petter Holm', focus: ['Fusion', 'Nettec'] },
    ];

    const titleTemplates = {
        'Stasjonst\u00f8tte': ['{station} - generell henvendelse', 'Arbeidsordre {nr} sluttf\u00f8rt', '{station} - sp\u00f8rsm\u00e5l om drift'],
        'Avvik/Pumpe': ['{station} - pumpe {n} stopper', '{station} - drivstofflekkasje pumpe {n}', '{station} - pumpe ute av drift'],
        'Avvik/Kortleser': ['{station} - kortleser nede', 'OPT {n} Midlertidig stengt', '{station} - betalingsterminal feil'],
        'EG kasse': ['{station} - kasse henger', '{station} - kassefeil ved oppstart', '{station} - EG POS feilmelding'],
        'T7': ['OPT {n} Midlertidig stengt', 'T7 feil {station}', '{station} - T7 kommunikasjonsfeil'],
        'Fusion': ['{station} - Fusion integrasjon nede', 'Fusion synkfeil', '{station} - Fusion timeout'],
        'ChainWeb': ['{station} - ChainWeb nede', 'ChainWeb rapportfeil', '{station} - ChainWeb innlogging feiler'],
        'default': ['{station} - driftsproblem', '{station} - trenger assistanse', 'Automatisk alarm - {station}']
    };

    const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
    const now = Date.now();
    const ticketCount = Math.round(days * 1693 / 90);
    const tickets = [];

    for (let i = 0; i < ticketCount; i++) {
        let r = Math.random() * totalWeight;
        let cat = categories[0];
        for (const c of categories) {
            r -= c.weight;
            if (r <= 0) { cat = c; break; }
        }

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

        const catShort = cat.name.replace('Stasjonst\u00f8tte/', '').replace('Stasjonst\u00f8tte', 'default');
        const templateKey = Object.keys(titleTemplates).find(k => catShort.startsWith(k)) || 'default';
        const templates = titleTemplates[templateKey];
        let title = templates[Math.floor(Math.random() * templates.length)]
            .replace('{station}', station)
            .replace('{n}', Math.floor(Math.random() * 4) + 1)
            .replace('{nr}', 1020000 + Math.floor(Math.random() * 9000));

        const handler = handlers[Math.floor(Math.random() * handlers.length)];
        const closed = status === 'Closed' ? new Date(created.getTime() + resolveMin * 60000) : null;

        tickets.push({
            TicketId: 40000 + i,
            Title: title,
            CreatedAt: created.toISOString(),
            ClosedAt: closed ? closed.toISOString() : null,
            BaseStatus: status,
            Category: { Name: cat.name },
            Priority: { Name: Math.random() < 0.83 ? 'Stasjonst\u00f8tte' : 'Standard Kundesst\u00f8tte YX' },
            OwnedBy: { FullName: '' },
            TicketType: { Name: 'Request' },
            TimeToClose: resolveMin,
            RealTimeToClose: resolveMin ? Math.round(resolveMin * (0.8 + Math.random() * 0.4)) : null,
            TimeToReply: Math.round(Math.random() * 60 + 5),
            RealTimeToReply: Math.round(Math.random() * 60 + 5),
            Deadline: new Date(created.getTime() + (Math.random() < 0.5 ? 24 : 48) * 3600000).toISOString(),
            NumberOfMessages: Math.floor(Math.random() * 5) + 1,
            NumberOfReplies: Math.floor(Math.random() * 3),
            ContactName: station,
            PersonName: '',
            _handler: handler.name
        });
    }

    return tickets.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
}
