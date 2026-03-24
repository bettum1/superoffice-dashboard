let allTickets = [];
let filteredTickets = [];
let charts = {};
let isDemo = false;
let sortField = 'CreatedAt';
let sortDir = -1;
let currentPage = 1;
const PAGE_SIZE = 30;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const status = await fetch('/api/status').then(r => r.json());
        isDemo = !status.configured;
        setBadge(isDemo ? 'DEMO' : 'LIVE', isDemo ? 'badge-demo' : 'badge-live');
    } catch {
        isDemo = true;
        setBadge('DEMO', 'badge-demo');
    }
    await loadData();
});

async function loadData() {
    const days = parseInt(document.getElementById('periodSelect').value);
    document.getElementById('modeBadge').textContent = 'Laster…';
    try {
        const endpoint = isDemo ? '/api/demo-tickets' : '/api/tickets';
        const res = await fetch(`${endpoint}?days=${days}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allTickets = await res.json();
        filteredTickets = [...allTickets];
        currentPage = 1;
        renderAll(allTickets);
        updateRefreshInfo();
        setBadge(isDemo ? 'DEMO' : 'LIVE', isDemo ? 'badge-demo' : 'badge-live');
    } catch (err) {
        console.error('Load failed:', err);
        setBadge('FEIL', 'badge-error');
        if (!isDemo) { isDemo = true; await loadData(); }
    }
}

function renderAll(tickets) {
    renderKPIs(tickets);
    renderCharts(tickets);
    renderHandlerTable(tickets);
    renderStationTable(tickets);
    renderTable();
}

function updateRefreshInfo() {
    document.getElementById('refreshInfo').textContent =
        `Oppdatert ${new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`;
}

function renderKPIs(tickets) {
    const total = tickets.length;
    const open = tickets.filter(t => t.BaseStatus === 'Open');
    const closed = tickets.filter(t => t.BaseStatus === 'Closed');
    const postponed = tickets.filter(t => t.BaseStatus === 'Postponed');
    const resolveRate = total > 0 ? Math.round(closed.length / total * 100) : 0;
    const resolveTimes = closed.map(t => t.RealTimeToClose || t.TimeToClose).filter(Boolean);
    const avgMin = resolveTimes.length ? resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length : 0;
    const sortedRT = [...resolveTimes].sort((a, b) => a - b);
    const medianMin = sortedRT.length ? sortedRT[Math.floor(sortedRT.length / 2)] : 0;
    const p90Min = sortedRT.length ? sortedRT[Math.floor(sortedRT.length * 0.9)] : 0;
    const avvik = tickets.filter(t => (t.Category?.Name || '').includes('Avvik'));
    const avvikOpen = avvik.filter(t => t.BaseStatus === 'Open');
    setKpi('kpiTotal', total, `${closed.length} løst, ${postponed.length} utsatt`);
    setKpi('kpiOpen', open.length, `${Math.round(open.length / Math.max(total, 1) * 100)}% av totalt`,
        open.length > total * 0.15 ? 'red' : open.length > total * 0.08 ? 'yellow' : 'green');
    setKpi('kpiResolveRate', `${resolveRate}%`, `${closed.length} av ${total} saker`,
        resolveRate >= 90 ? 'green' : resolveRate >= 75 ? 'yellow' : 'red');
    setKpi('kpiAvgResolve', fmtDur(avgMin / 60), `P90: ${fmtDur(p90Min / 60)}`);
    setKpi('kpiMedianResolve', fmtDur(medianMin / 60), `Basert på ${resolveTimes.length} løste saker`);
    setKpi('kpiAvvik', avvikOpen.length, `${avvik.length} totalt (${avvikOpen.length} åpne)`,
        avvikOpen.length > 20 ? 'red' : avvikOpen.length > 10 ? 'yellow' : 'green');
}

function setKpi(id, value, sub, colorClass) {
    const el = document.getElementById(id);
    el.textContent = value;
    el.className = colorClass ? `kpi-value ${colorClass}` : 'kpi-value';
    const subEl = document.getElementById(id + 'Sub');
    if (subEl && sub) subEl.textContent = sub;
}

function fmtDur(hours) {
    if (!hours || hours === 0) return '–';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 48) return `${hours.toFixed(1)}t`;
    return `${(hours / 24).toFixed(1)}d`;
}

function renderCharts(tickets) {
    Object.values(charts).forEach(c => c.destroy?.());
    Chart.defaults.color = '#8b8fa3';
    Chart.defaults.borderColor = '#2a2e3f';
    const P = ['#6366f1','#22c55e','#f97316','#3b82f6','#a855f7','#06b6d4','#eab308','#ef4444','#ec4899','#14b8a6','#64748b','#d946ef'];
    const days = parseInt(document.getElementById('periodSelect').value);
    const buckets = days <= 14 ? days : days <= 60 ? Math.ceil(days / 7) : Math.ceil(days / 30);
    const bSize = days / buckets;
    const now = Date.now();
    const tLabels = [], tCreated = [], tResolved = [];
    for (let i = buckets - 1; i >= 0; i--) {
        const s = new Date(now - (i + 1) * bSize * 864e5), e = new Date(now - i * bSize * 864e5);
        tLabels.push(days <= 14 ? s.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric' }) :
            days <= 60 ? `Uke ${weekNum(s)}` : s.toLocaleDateString('nb-NO', { month: 'short' }));
        tCreated.push(tickets.filter(t => { const d = new Date(t.CreatedAt); return d >= s && d < e; }).length);
        tResolved.push(tickets.filter(t => { if (!t.ClosedAt) return false; const d = new Date(t.ClosedAt); return d >= s && d < e; }).length);
    }
    charts.timeline = new Chart(document.getElementById('chartTimeline'), {
        type: 'bar', data: { labels: tLabels, datasets: [
            { label: 'Opprettet', data: tCreated, backgroundColor: 'rgba(99,102,241,.75)', borderRadius: 4, borderSkipped: false },
            { label: 'Løst', data: tResolved, backgroundColor: 'rgba(34,197,94,.75)', borderRadius: 4, borderSkipped: false }
        ]}, options: { responsive: true, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', labels: { usePointStyle: true } } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(42,46,63,.5)' } }, x: { grid: { display: false } } } }
    });
    const catMap = {};
    tickets.forEach(t => { const c = (t.Category?.Name || '').split('/').slice(0, 2).join('/') || 'Ukjent'; catMap[c] = (catMap[c] || 0) + 1; });
    let catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const top8 = catSorted.slice(0, 8);
    const otherCount = catSorted.slice(8).reduce((s, e) => s + e[1], 0);
    if (otherCount > 0) top8.push(['Andre', otherCount]);
    charts.category = new Chart(document.getElementById('chartCategory'), {
        type: 'doughnut', data: { labels: top8.map(s => s[0].replace('Stasjonstøtte/', '').replace('Stasjonstøtte', 'Generell støtte')), datasets: [{ data: top8.map(s => s[1]), backgroundColor: P, borderWidth: 0, hoverOffset: 6 }] },
        options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { padding: 8, usePointStyle: true, font: { size: 11 } } } } }
    });
    const catRes = {};
    tickets.filter(t => t.BaseStatus === 'Closed').forEach(t => { const c = (t.Category?.Name || '').split('/').slice(0, 2).join('/') || 'Ukjent'; if (!catRes[c]) catRes[c] = []; const rt = t.RealTimeToClose || t.TimeToClose; if (rt) catRes[c].push(rt / 60); });
    const resSorted = Object.entries(catRes).filter(([, v]) => v.length >= 3).map(([c, v]) => ({ cat: c.replace('Stasjonstøtte/', '').replace('Stasjonstøtte', 'Generell'), avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length })).sort((a, b) => b.avg - a.avg);
    charts.resolve = new Chart(document.getElementById('chartResolveTime'), {
        type: 'bar', data: { labels: resSorted.map(s => s.cat), datasets: [{ label: 'Timer', data: resSorted.map(s => Math.round(s.avg * 10) / 10), backgroundColor: P, borderRadius: 4, borderSkipped: false }] },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: ctx => `${resSorted[ctx.dataIndex].n} saker` } } }, scales: { x: { beginAtZero: true, grid: { color: 'rgba(42,46,63,.5)' } }, y: { grid: { display: false } } } }
    });
    const avvikMap = {};
    tickets.filter(t => (t.Category?.Name || '').includes('Avvik')).forEach(t => { const type = (t.Category?.Name || '').split('/').slice(1).join('/') || 'Avvik (generelt)'; avvikMap[type] = (avvikMap[type] || 0) + 1; });
    const avvikSorted = Object.entries(avvikMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    charts.avvik = new Chart(document.getElementById('chartAvvik'), {
        type: 'doughnut', data: { labels: avvikSorted.map(s => s[0]), datasets: [{ data: avvikSorted.map(s => s[1]), backgroundColor: ['#ef4444','#f97316','#eab308','#3b82f6','#a855f7','#06b6d4','#22c55e','#ec4899'], borderWidth: 0, hoverOffset: 6 }] },
        options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { padding: 8, usePointStyle: true, font: { size: 11 } } } } }
    });
    const handlerMap = {};
    tickets.forEach(t => { const h = t._handler || t.OwnedBy?.FullName || ''; if (!h || h === 'Ikke tildelt') return; handlerMap[h] = (handlerMap[h] || 0) + 1; });
    const hSorted = Object.entries(handlerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    charts.handlers = new Chart(document.getElementById('chartHandlers'), {
        type: 'bar', data: { labels: hSorted.map(s => s[0].split(' ').map(w => w[0]).join('')), datasets: [{ data: hSorted.map(s => s[1]), backgroundColor: P, borderRadius: 4, borderSkipped: false }] },
        options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { title: ctx => hSorted[ctx[0].dataIndex][0] } } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(42,46,63,.5)' } }, x: { grid: { display: false } } } }
    });
    const stationData = getStationStats(tickets);
    const stSorted = stationData.slice(0, 10);
    charts.stations = new Chart(document.getElementById('chartStations'), {
        type: 'bar', data: { labels: stSorted.map(s => s.station.replace('YX ', '')), datasets: [{ data: stSorted.map(s => s.total), backgroundColor: P, borderRadius: 4, borderSkipped: false }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(42,46,63,.5)' } }, x: { grid: { display: false } } } }
    });
    const sDist = { 'Open': 0, 'Closed': 0, 'Postponed': 0 };
    tickets.forEach(t => { sDist[t.BaseStatus] = (sDist[t.BaseStatus] || 0) + 1; });
    const sColors = { 'Open': '#22c55e', 'Closed': '#6366f1', 'Postponed': '#eab308' };
    const sLabels = { 'Open': 'Aktiv', 'Closed': 'Lukket', 'Postponed': 'Utsatt' };
    charts.status = new Chart(document.getElementById('chartStatus'), {
        type: 'doughnut', data: { labels: Object.keys(sDist).map(k => sLabels[k] || k), datasets: [{ data: Object.values(sDist), backgroundColor: Object.keys(sDist).map(k => sColors[k]), borderWidth: 0 }] },
        options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { padding: 8, usePointStyle: true } } } }
    });
}

function getStationStats(tickets) {
    const map = {};
    tickets.forEach(t => {
        let station = t.ContactName || '';
        if (!station || station.length < 3) {
            const title = t.Title || '';
            const m = title.match(/^(YX\s+[A-ZÆØÅa-zæøåé][A-ZÆØÅa-zæøåé\s-]*?)(?:\s*[-–:,.]|\s+(?:på|har|er|mangler|feil|problem|OPT|pumpe|kasse|filter|ingen|ikke|melder|trenger|ute|nede))/i);
            station = m ? m[1].trim() : '';
        }
        if (!station || station.length < 4 || station.length > 40 || station.match(/^(Arbeidsordre|OPT|Automatisk|PROD|Rayvn|Yara)/i)) return;
        if (!map[station]) map[station] = { total: 0, open: 0, cats: {}, resMin: [] };
        map[station].total++;
        if (t.BaseStatus === 'Open') map[station].open++;
        if (t.BaseStatus === 'Closed') { const rt = t.RealTimeToClose || t.TimeToClose; if (rt) map[station].resMin.push(rt); }
        const subcat = (t.Category?.Name || '').replace('Stasjonstøtte/', '').replace('Stasjonstøtte', 'Generelt');
        map[station].cats[subcat] = (map[station].cats[subcat] || 0) + 1;
    });
    return Object.entries(map).filter(([, d]) => d.total >= 2)
        .map(([station, d]) => ({ station, total: d.total, open: d.open,
            avgResolveH: d.resMin.length ? Math.round(d.resMin.reduce((a, b) => a + b, 0) / d.resMin.length / 60 * 10) / 10 : null,
            topIssues: Object.entries(d.cats).sort((a, b) => b[1] - a[1]).slice(0, 3) }))
        .sort((a, b) => b.total - a.total);
}

function renderHandlerTable(tickets) {
    const tbody = document.getElementById('handlerTableBody');
    const map = {};
    tickets.forEach(t => { const h = t._handler || t.OwnedBy?.FullName || ''; if (!h || h === 'Ikke tildelt') return; if (!map[h]) map[h] = { tickets: 0, replies: 0, cats: {} }; map[h].tickets++; map[h].replies += (t.NumberOfReplies || 0); const cat = (t.Category?.Name || '').split('/').slice(0, 2).join('/').replace('Stasjonstøtte/', '').replace('Stasjonstøtte', 'Generelt'); map[h].cats[cat] = (map[h].cats[cat] || 0) + 1; });
    const sorted = Object.entries(map).sort((a, b) => b[1].tickets - a[1].tickets);
    if (!sorted.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">Ingen tilordnede medarbeidere funnet.</td></tr>'; return; }
    tbody.innerHTML = sorted.map(([name, d]) => { const topCats = Object.entries(d.cats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `<span class="tag">${esc(c)} (${n})</span>`).join(' '); return `<tr><td><strong>${esc(name)}</strong></td><td>${d.tickets}</td><td>${d.replies}</td><td>${topCats}</td></tr>`; }).join('');
}

function renderStationTable(tickets) {
    const tbody = document.getElementById('stationTableBody');
    const stations = getStationStats(tickets).slice(0, 20);
    if (!stations.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">Ingen gjenganger-stasjoner identifisert</td></tr>'; return; }
    tbody.innerHTML = stations.map(s => { const issues = s.topIssues.map(([c, n]) => `<span class="tag">${esc(c)} (${n})</span>`).join(' '); return `<tr><td><strong>${esc(s.station)}</strong></td><td>${s.total}</td><td>${s.open > 0 ? `<span class="highlight-red">${s.open}</span>` : '0'}</td><td>${s.avgResolveH ? fmtDur(s.avgResolveH) : '–'}</td><td>${issues}</td></tr>`; }).join('');
}

function renderTable() {
    const tbody = document.getElementById('ticketTableBody');
    const page = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    if (!filteredTickets.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">Ingen saker funnet</td></tr>'; document.getElementById('tableCount').textContent = ''; document.getElementById('pagination').innerHTML = ''; return; }
    tbody.innerHTML = page.map(t => { const status = t.BaseStatus || 'Ukjent'; const sc = status === 'Open' ? 'status-active' : status === 'Postponed' ? 'status-postponed' : 'status-closed'; const sl = { 'Open': 'Aktiv', 'Closed': 'Lukket', 'Postponed': 'Utsatt' }[status] || status; const cat = (t.Category?.Name || '').replace('Stasjonstøtte/', '').replace('Stasjonstøtte', 'Generelt'); const rt = t.RealTimeToClose || t.TimeToClose; return `<tr><td>#${t.TicketId}</td><td class="title-cell">${esc(t.Title)}</td><td>${esc(cat)}</td><td><span class="status-dot ${sc}"></span>${sl}</td><td>${esc(t.Priority?.Name || '–')}</td><td>${new Date(t.CreatedAt).toLocaleDateString('nb-NO')}</td><td>${rt ? fmtDur(rt / 60) : '–'}</td></tr>`; }).join('');
    document.getElementById('tableCount').textContent = `Viser ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredTickets.length)} av ${filteredTickets.length}`;
    renderPagination();
}

function renderPagination() {
    const total = Math.ceil(filteredTickets.length / PAGE_SIZE);
    const el = document.getElementById('pagination');
    if (total <= 1) { el.innerHTML = ''; return; }
    let html = currentPage > 1 ? `<button onclick="goPage(${currentPage - 1})">←</button>` : '';
    for (let i = 1; i <= total; i++) { if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - currentPage) > 1) { if (!html.endsWith('… ')) html += '<span style="padding:0 4px;color:var(--text-muted)">… </span>'; continue; } html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`; }
    if (currentPage < total) html += `<button onclick="goPage(${currentPage + 1})">→</button>`;
    el.innerHTML = html;
}
function goPage(p) { currentPage = p; renderTable(); document.querySelector('.table-card:last-of-type').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function filterTable() {
    const q = document.getElementById('tableSearch').value.toLowerCase().trim();
    filteredTickets = q ? allTickets.filter(t => (t.Title || '').toLowerCase().includes(q) || (t.Category?.Name || '').toLowerCase().includes(q) || (t.Priority?.Name || '').toLowerCase().includes(q) || String(t.TicketId).includes(q)) : [...allTickets];
    currentPage = 1;
    renderTable();
}

function sortTable(field) {
    if (sortField === field) sortDir *= -1;
    else { sortField = field; sortDir = field === 'CreatedAt' || field === 'TimeToClose' ? -1 : 1; }
    filteredTickets.sort((a, b) => { let va, vb; switch (field) { case 'TicketId': va = a.TicketId; vb = b.TicketId; break; case 'Title': va = a.Title || ''; vb = b.Title || ''; break; case 'Category': va = a.Category?.Name || ''; vb = b.Category?.Name || ''; break; case 'BaseStatus': va = a.BaseStatus || ''; vb = b.BaseStatus || ''; break; case 'Priority': va = a.Priority?.Name || ''; vb = b.Priority?.Name || ''; break; case 'CreatedAt': va = new Date(a.CreatedAt); vb = new Date(b.CreatedAt); break; case 'TimeToClose': va = a.RealTimeToClose || a.TimeToClose || 99999; vb = b.RealTimeToClose || b.TimeToClose || 99999; break; default: va = 0; vb = 0; } return va < vb ? -sortDir : va > vb ? sortDir : 0; });
    currentPage = 1;
    renderTable();
}

function setBadge(t, c) { const b = document.getElementById('modeBadge'); b.textContent = t; b.className = `badge ${c}`; }
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function weekNum(d) { const dt = new Date(d); dt.setHours(0, 0, 0, 0); dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7); const w1 = new Date(dt.getFullYear(), 0, 4); return 1 + Math.round(((dt - w1) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7); }
