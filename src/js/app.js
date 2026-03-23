/* ============================================================
   Gottlieb's Deep Sky Observations — Application Logic
   ============================================================ */

(function () {
    'use strict';

    // --- State ---
    let allData = [];
    let metadata = {};
    let articles = [];
    let filteredData = [];
    let displayedCount = 0;
    const PAGE_SIZE = 50;
    let currentSort = 'name';
    let suggestionIndex = -1;

    // Type abbreviation key
    const TYPE_KEY = {
        'GX': 'Galaxy', '**': 'Double Star', '*': 'Single Star', '***': 'Triple Star',
        'PN': 'Planetary Nebula', 'GC': 'Globular Cluster', 'OC': 'Open Cluster',
        'EN': 'Emission Nebula', 'RN': 'Reflection Nebula', 'DN': 'Dark Nebula',
        'SNR': 'Supernova Remnant', 'AST': 'Asterism', 'QSR': 'Quasar',
        'GXCL': 'Galaxy Cluster', 'GXPair': 'Galaxy Pair', 'GXGroup': 'Galaxy Group',
        'KNT': 'Knot', 'PPN': 'Proto-Planetary Nebula', 'NF': 'Not Found',
        'Dup': 'Duplicate Entry', 'Non': 'Non-existent', 'RV': 'RV Tauri Variable',
        'BH': 'Black Hole', 'EN+RN': 'Emission + Reflection Nebula',
        'NB': 'Nebula', 'HII': 'HII Region', 'Neb': 'Nebula',
        'WR': 'Wolf-Rayet Shell', 'WR-neb': 'Wolf-Rayet Nebula',
        'SMC-OC': 'SMC Open Cluster', 'SMC-GC': 'SMC Globular Cluster',
        'SMC-EN': 'SMC Emission Nebula', 'SMC-GX': 'SMC Galaxy',
        'LMC-OC': 'LMC Open Cluster', 'LMC-GC': 'LMC Globular Cluster',
        'LMC-EN': 'LMC Emission Nebula', 'LMC-GX': 'LMC Galaxy',
        'LMC-PN': 'LMC Planetary Nebula', 'LMC-SNR': 'LMC Supernova Remnant',
        'M31-GC': 'M31 Globular Cluster', 'M31-OC': 'M31 Open Cluster',
        'M31-EN': 'M31 Emission Nebula', 'M31-GX': 'M31 Galaxy',
        'M33-EN': 'M33 Emission Nebula', 'M33-GC': 'M33 Globular Cluster',
        'Cen A-GC': 'Centaurus A Globular Cluster',
        'N253-GC': 'NGC 253 Globular Cluster',
        'Forn A-GC': 'Fornax A Globular Cluster'
    };

    // Constellation full names
    const CON_NAMES = {
        'And': 'Andromeda', 'Ant': 'Antlia', 'Aps': 'Apus', 'Aql': 'Aquila',
        'Aqr': 'Aquarius', 'Ara': 'Ara', 'Ari': 'Aries', 'Aur': 'Auriga',
        'Boo': 'Boötes', 'CMa': 'Canis Major', 'CMi': 'Canis Minor',
        'CVn': 'Canes Venatici', 'Cae': 'Caelum', 'Cam': 'Camelopardalis',
        'Cap': 'Capricornus', 'Car': 'Carina', 'Cas': 'Cassiopeia',
        'Cen': 'Centaurus', 'Cep': 'Cepheus', 'Cet': 'Cetus', 'Cha': 'Chamaeleon',
        'Cir': 'Circinus', 'Cnc': 'Cancer', 'Col': 'Columba', 'Com': 'Coma Berenices',
        'CrA': 'Corona Australis', 'CrB': 'Corona Borealis', 'Crt': 'Crater',
        'Cru': 'Crux', 'Crv': 'Corvus', 'Cyg': 'Cygnus', 'Del': 'Delphinus',
        'Dor': 'Dorado', 'Dra': 'Draco', 'Equ': 'Equuleus', 'Eri': 'Eridanus',
        'For': 'Fornax', 'Gem': 'Gemini', 'Gru': 'Grus', 'Her': 'Hercules',
        'Hor': 'Horologium', 'Hya': 'Hydra', 'Hyi': 'Hydrus', 'Ind': 'Indus',
        'LMi': 'Leo Minor', 'Lac': 'Lacerta', 'Leo': 'Leo', 'Lep': 'Lepus',
        'Lib': 'Libra', 'Lup': 'Lupus', 'Lyn': 'Lynx', 'Lyr': 'Lyra',
        'Men': 'Mensa', 'Mic': 'Microscopium', 'Mon': 'Monoceros', 'Mus': 'Musca',
        'Nor': 'Norma', 'Oct': 'Octans', 'Oph': 'Ophiuchus', 'Ori': 'Orion',
        'Pav': 'Pavo', 'Peg': 'Pegasus', 'Per': 'Perseus', 'Phe': 'Phoenix',
        'Pic': 'Pictor', 'PsA': 'Piscis Austrinus', 'Psc': 'Pisces', 'Pup': 'Puppis',
        'Pyx': 'Pyxis', 'Ret': 'Reticulum', 'Scl': 'Sculptor', 'Sco': 'Scorpius',
        'Sct': 'Scutum', 'Ser': 'Serpens', 'Sex': 'Sextans', 'Sge': 'Sagitta',
        'Sgr': 'Sagittarius', 'Tau': 'Taurus', 'Tel': 'Telescopium',
        'TrA': 'Triangulum Australe', 'Tri': 'Triangulum', 'Tuc': 'Tucana',
        'UMa': 'Ursa Major', 'UMi': 'Ursa Minor', 'Vel': 'Vela', 'Vir': 'Virgo',
        'Vol': 'Volans', 'Vul': 'Vulpecula'
    };

    // Steve's intro text
    const INTRO_TEXT = `<p>Here are my observing notes for every non-stellar object in the entire NGC, which was compiled by John Louis Dreyer in 1888. This famous catalogue includes 7840 entries discovered visually up to that date, the majority from William Herschel and his son John Herschel. As far as I know, these notes are the only detailed visual journal of the entire NGC by a single observer, covering the entire sky from the north to south celestial pole. In addition, I've included visual notes on 2517 objects from the IC (Index Catalogues of 1894 and 1907) for a total of 10,357 NGC/IC designations.</p>

<p>In 2014, I completed a 35-year project of observing every NGC object north of &minus;41&deg; declination. These were all the NGCs accessible from my home in northern California. At that time I had also covered most of the far southern sky from several previous trips to Australia, with 300 NGCs remaining that were not visible from the United States. After a few additional observing trips to the southern hemisphere, I completed the last remaining 34 NGCs on October 18th, 2017 at the OzSky Star Safari, which took place on the Markdale Homestead, a large working sheep ranch and country estate 3&frac12; hour drive west of Sydney. The final object was NGC 2932 using an 18-inch Obsession.</p>

<p>After that date I've started to focus on observing the remaining few hundred galaxies (out of 1529 entries) in the first Index Catalogue (IC I). The vast majority of these were faint galaxies, with over half the total discovered by Stéphane Javelle, who observed with a 30-inch f/23 refractor at the Nice observatory in France. This time I completed the catalog (except for a very few photographic discoveries) in northern California on a cattle ranch. The last object was IC 1493 = LEDA 1458643, a faint smudge in Pegasus (B&nbsp;=&nbsp;16.7, V&nbsp;=&nbsp;15.9, according to SDSS photometry), which was observed on October 18th, 2025, exactly 8 years to the day after finishing the NGC.</p>

<p>All my observations and notes were made at fairly dark observing sites used by clubs and individuals in the San Francisco bay area as well as various northern California star parties at Lassen National Park and northeastern California. In addition, a large number of summer observations were made at high elevation sites in the Sierras or the White Mountains east of Bishop. Generally, these observations were made with SQM readings from 21.3&ndash;21.9. Deep southern objects were observed on 8 weeklong observing trips to Australia using 14&Prime; to 30&Prime; scopes that were provided by Zane Hammond at his &ldquo;Magellan Observatory&rdquo; and at several OzSky Star Safaris. Some southern observations were also made using Ray Cash's 13&Prime; travel scope that I brought to Costa Rica and with a C-8 from the southern end of Baja.</p>

<p>I began taking notes on the Messier objects using a 6&Prime; f/5 reflector in 1978. Three years later I started exploring fainter NGCs with a 13.1&Prime; Odyssey I. The vast majority of my notes, though, were made with a 17.5&Prime; f/4.5 homemade dob (1987&ndash;2002) and an 18&Prime; f/4.3 Starmaster (2003&ndash;2011). Since 2012 I've used a 24&Prime; f/3.7 Starstructure. I've also taken detailed notes on over 500 NGC and IC objects using Jimi Lowrey's 48&Prime; gigantic dobsonian from west Texas. In general, you'll find multiple observations of many NGCs, so their visual appearances can be compared through a variety of apertures.</p>

<p>All of the NGC/IC identifications have been checked for historical accuracy as part of the <a href="http://haroldcorwin.net/ngcic/" target="_blank" rel="noopener">NGC/IC Project</a> (database no longer available but see <a href="http://haroldcorwin.net/ngcic/" target="_blank" rel="noopener">Harold Corwin's site</a>). At the end of my visual observations of each NGC, I've included historical discovery information such as the observer's name, date, telescope, and the original discovery descriptions. Modern catalogue discrepancies and errors are also discussed.</p>

<p>In addition to the NGC and IC, the final link includes observations of nearly 1200 galaxies in the Uppsala General Catalogue (UGC), which are not in the NGC or IC. These are generally fainter galaxies that are at least 1&prime; in diameter on the first National Geographic&ndash;Palomar Observatory Sky Survey (POSS).</p>

<p>I want to acknowledge the investigative work of Dr. Harold Corwin and Dr. Wolfgang Steinicke, who I've communicated with for many years on a number of identification problems. Harold Corwin provides precise positions and extensive historical notes on thousands of NGC and IC objects at <a href="http://haroldcorwin.net/ngcic/" target="_blank" rel="noopener">haroldcorwin.net/ngcic/</a>. Wolfgang Steinicke provides biographical information on 172 NGC/IC astronomers, as well as a number of historically accurate catalogues in .xls format on his web site at <a href="http://www.klima-luft.de/steinicke/index_e.htm" target="_blank" rel="noopener">klima-luft.de/steinicke</a>. For those interested in learning more on the history of the NGC, I highly recommend Wolfgang's book <em>Observing and Cataloguing Nebulae and Star Clusters</em>.</p>`;

    // --- DOM References ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // --- Init ---
    async function init() {
        setupNav();
        setupStarfield();
        setupIntro();
        setupLegend();

        // Load data
        try {
            const [dataRes, metaRes, artRes] = await Promise.all([
                fetch('data.json'),
                fetch('metadata.json'),
                fetch('articles.json')
            ]);
            allData = await dataRes.json();
            metadata = await metaRes.json();
            articles = await artRes.json();

            buildFilters();
            renderArticles();
            setupSearch();
            setupFilters();

            console.log(`Loaded ${allData.length} objects`);
        } catch (e) {
            console.error('Failed to load data:', e);
            $('#results-list').innerHTML = '<p style="color:var(--red);padding:24px;">Failed to load database. Please refresh the page.</p>';
        }
    }

    // --- Navigation ---
    function setupNav() {
        const toggle = $('.nav-toggle');
        const links = $('.nav-links');

        toggle.addEventListener('click', () => {
            links.classList.toggle('open');
        });

        // Close mobile nav on link click
        $$('.nav-links a').forEach(a => {
            a.addEventListener('click', () => links.classList.remove('open'));
        });

        // Active nav tracking
        const sections = $$('section[id]');
        const navLinks = $$('.nav-links a');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(a => a.classList.remove('active'));
                    const active = $(`.nav-links a[href="#${entry.target.id}"]`);
                    if (active) active.classList.add('active');
                }
            });
        }, { rootMargin: '-50% 0px -50% 0px' });

        sections.forEach(s => observer.observe(s));
    }

    // --- Starfield ---
    function setupStarfield() {
        const canvas = $('#starfield');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let stars = [];
        let animId;

        function resize() {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
            generateStars();
        }

        function generateStars() {
            stars = [];
            const count = Math.floor((canvas.width * canvas.height) / 2000);
            for (let i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    r: Math.random() * 1.5 + 0.3,
                    alpha: Math.random() * 0.8 + 0.2,
                    speed: Math.random() * 0.0008 + 0.0002,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Subtle radial gradient background
            const grd = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.7
            );
            grd.addColorStop(0, '#0f1520');
            grd.addColorStop(1, '#0a0e17');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const t = Date.now();
            for (const s of stars) {
                const twinkle = Math.sin(t * s.speed + s.phase) * 0.3 + 0.7;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 210, 240, ${s.alpha * twinkle})`;
                ctx.fill();
            }

            animId = requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        resize();
        draw();

        // Pause animation when not visible
        const heroObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                if (!animId) draw();
            } else {
                cancelAnimationFrame(animId);
                animId = null;
            }
        });
        heroObserver.observe($('.hero'));
    }

    // --- Intro ---
    function setupIntro() {
        const el = $('#intro-text');
        if (el) el.innerHTML = INTRO_TEXT;
    }

    // --- Type Legend ---
    function setupLegend() {
        const grid = $('#legend-grid');
        const btn = $('#legend-toggle');
        const legend = $('#type-legend');

        if (!grid || !btn || !legend) return;

        // Build legend from TYPE_KEY
        const entries = Object.entries(TYPE_KEY).sort((a, b) => a[0].localeCompare(b[0]));
        grid.innerHTML = entries.map(([abbr, full]) =>
            `<div class="legend-item"><span class="legend-abbr">${escHtml(abbr)}</span><span class="legend-full">${escHtml(full)}</span></div>`
        ).join('');

        btn.addEventListener('click', () => {
            const shown = legend.style.display !== 'none';
            legend.style.display = shown ? 'none' : 'block';
            btn.textContent = shown ? 'Object Type Abbreviations ▾' : 'Object Type Abbreviations ▴';
        });
    }

    // --- Build Filter Options ---
    function buildFilters() {
        // Constellations
        const conSelect = $('#filter-con');
        if (metadata.constellations) {
            metadata.constellations.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = `${c} — ${CON_NAMES[c] || c}`;
                conSelect.appendChild(opt);
            });
        }

        // Types
        const typeSelect = $('#filter-type');
        if (metadata.types) {
            Object.entries(metadata.types).forEach(([t, count]) => {
                const opt = document.createElement('option');
                opt.value = t;
                const fullName = TYPE_KEY[t] ? ` — ${TYPE_KEY[t]}` : '';
                opt.textContent = `${t}${fullName} (${count})`;
                typeSelect.appendChild(opt);
            });
        }
    }

    // --- Search ---
    function setupSearch() {
        const input = $('#quick-search');
        const btn = $('#quick-search-btn');
        const sugBox = $('#quick-suggestions');

        input.addEventListener('input', () => {
            const q = input.value.trim();
            if (q.length < 1) {
                sugBox.innerHTML = '';
                return;
            }
            showSuggestions(q, sugBox);
        });

        input.addEventListener('keydown', (e) => {
            const items = sugBox.querySelectorAll('.suggestion-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
                highlightSuggestion(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                suggestionIndex = Math.max(suggestionIndex - 1, -1);
                highlightSuggestion(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestionIndex >= 0 && items[suggestionIndex]) {
                    const name = items[suggestionIndex].dataset.name;
                    selectObject(name);
                    sugBox.innerHTML = '';
                    input.value = name;
                } else {
                    doQuickSearch(input.value.trim());
                    sugBox.innerHTML = '';
                }
            } else if (e.key === 'Escape') {
                sugBox.innerHTML = '';
            }
        });

        btn.addEventListener('click', () => {
            doQuickSearch(input.value.trim());
            sugBox.innerHTML = '';
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.quick-lookup')) sugBox.innerHTML = '';
        });
    }

    function showSuggestions(query, container) {
        const q = normalizeQuery(query);
        const matches = [];
        for (const obj of allData) {
            if (matches.length >= 10) break;
            const name = obj.name.toLowerCase();
            const nick = (obj.nickname || '').toLowerCase();
            if (name.includes(q) || nick.includes(q)) {
                matches.push(obj);
            }
        }

        suggestionIndex = -1;

        if (matches.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `<div class="suggestions-list">${matches.map(m =>
            `<div class="suggestion-item" data-name="${escAttr(m.name)}">
                <span class="suggestion-name">${escHtml(m.name)}${m.nickname ? ' — ' + escHtml(m.nickname) : ''}</span>
                <span class="suggestion-type">${escHtml(m.type || '—')}</span>
            </div>`
        ).join('')}</div>`;

        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                selectObject(item.dataset.name);
                container.innerHTML = '';
                $('#quick-search').value = item.dataset.name;
            });
        });
    }

    function highlightSuggestion(items) {
        items.forEach((item, i) => {
            item.classList.toggle('highlighted', i === suggestionIndex);
        });
    }

    function normalizeQuery(q) {
        return q.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function doQuickSearch(query) {
        if (!query) return;
        const q = normalizeQuery(query);

        // Exact match first
        const exact = allData.find(o => o.name.toLowerCase() === q);
        if (exact) {
            selectObject(exact.name);
            return;
        }

        // Partial match
        filteredData = allData.filter(o => {
            const name = o.name.toLowerCase();
            const nick = (o.nickname || '').toLowerCase();
            const other = (o.other || '').toLowerCase();
            return name.includes(q) || nick.includes(q) || other.includes(q);
        });

        if (filteredData.length === 1) {
            selectObject(filteredData[0].name);
        } else {
            showResults();
        }
    }

    // --- Filters ---
    function setupFilters() {
        const toggle = $('#filter-toggle');
        const body = $('#filter-body');

        toggle.addEventListener('click', () => {
            toggle.classList.toggle('open');
            body.classList.toggle('open');
        });

        $('#apply-filters').addEventListener('click', applyFilters);
        $('#clear-filters').addEventListener('click', clearFilters);
        $('#sort-select').addEventListener('change', () => {
            currentSort = $('#sort-select').value;
            sortResults();
            renderResults();
        });
    }

    function applyFilters() {
        const catalog = $('#filter-catalog').value;
        const con = $('#filter-con').value;
        const type = $('#filter-type').value;
        const magMin = parseFloat($('#filter-mag-min').value);
        const magMax = parseFloat($('#filter-mag-max').value);
        const special = $('#filter-special').value;
        const nameFilter = normalizeQuery($('#filter-name').value);

        filteredData = allData.filter(o => {
            if (catalog && o.catalog !== catalog) return false;
            if (con && o.con !== con) return false;
            if (type && o.type !== type) return false;
            if (!isNaN(magMin) && o.vmag) {
                const mag = parseFloat(o.vmag);
                if (isNaN(mag) || mag < magMin) return false;
            }
            if (!isNaN(magMax) && o.vmag) {
                const mag = parseFloat(o.vmag);
                if (isNaN(mag) || mag > magMax) return false;
            }
            if (special === 'top' && !o.isTopObject) return false;
            if (special === 'orion' && !o.isOrionAtlas) return false;
            if (nameFilter) {
                const n = o.name.toLowerCase();
                const nick = (o.nickname || '').toLowerCase();
                const other = (o.other || '').toLowerCase();
                if (!n.includes(nameFilter) && !nick.includes(nameFilter) && !other.includes(nameFilter)) return false;
            }
            return true;
        });

        // Handle empty mag filter — don't filter out objects without vmag
        if (!isNaN(magMin) || !isNaN(magMax)) {
            filteredData = filteredData.filter(o => {
                if (!o.vmag) return false;
                const mag = parseFloat(o.vmag);
                if (isNaN(mag)) return false;
                if (!isNaN(magMin) && mag < magMin) return false;
                if (!isNaN(magMax) && mag > magMax) return false;
                return true;
            });
        }

        showResults();
    }

    function clearFilters() {
        $('#filter-catalog').value = '';
        $('#filter-con').value = '';
        $('#filter-type').value = '';
        $('#filter-mag-min').value = '';
        $('#filter-mag-max').value = '';
        $('#filter-special').value = '';
        $('#filter-name').value = '';
        filteredData = [];
        $('#results-header').style.display = 'none';
        $('#results-list').innerHTML = '';
        $('#load-more-container').style.display = 'none';
        $('#object-detail').style.display = 'none';
    }

    // --- Results ---
    function showResults() {
        $('#object-detail').style.display = 'none';
        sortResults();
        displayedCount = 0;
        $('#results-list').innerHTML = '';
        renderResults();
        $('#results-header').style.display = 'flex';
        $('#results-count').textContent = `${filteredData.length.toLocaleString()} objects found`;

        // Scroll to results
        document.getElementById('results-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function sortResults() {
        filteredData.sort((a, b) => {
            switch (currentSort) {
                case 'ra': return (a.ra || '').localeCompare(b.ra || '');
                case 'mag': return (parseFloat(a.vmag) || 99) - (parseFloat(b.vmag) || 99);
                case 'con': return (a.con || '').localeCompare(b.con || '');
                case 'type': return (a.type || '').localeCompare(b.type || '');
                default: return naturalSort(a.name, b.name);
            }
        });
    }

    function naturalSort(a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }

    function renderResults() {
        const list = $('#results-list');
        const end = Math.min(displayedCount + PAGE_SIZE, filteredData.length);

        for (let i = displayedCount; i < end; i++) {
            list.appendChild(createObjectCard(filteredData[i]));
        }
        displayedCount = end;

        const more = $('#load-more-container');
        if (displayedCount < filteredData.length) {
            more.style.display = 'block';
            if (!$('#load-more')._bound) {
                $('#load-more').addEventListener('click', renderResults);
                $('#load-more')._bound = true;
            }
        } else {
            more.style.display = 'none';
        }
    }

    function createObjectCard(obj) {
        const card = document.createElement('div');
        card.className = 'object-card';
        card.addEventListener('click', () => selectObject(obj.name));

        const obsPreview = obj.observations && obj.observations.length > 0
            ? obj.observations[0].text.substring(0, 150) + '...'
            : '';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-name">${escHtml(obj.name)}</div>
                    ${obj.nickname ? `<div class="card-nickname">${escHtml(obj.nickname)}</div>` : ''}
                </div>
                <div class="card-badges">
                    ${obj.type ? `<span class="badge badge-type">${escHtml(obj.type)}</span>` : ''}
                    ${obj.isTopObject ? '<span class="badge badge-top">★ Top</span>' : ''}
                    ${obj.isOrionAtlas ? '<span class="badge badge-orion">Orion</span>' : ''}
                </div>
            </div>
            <div class="card-meta">
                ${obj.con ? `<span class="meta-item"><span class="meta-label">Con:</span> <span class="meta-value">${escHtml(obj.con)}</span></span>` : ''}
                ${obj.vmag ? `<span class="meta-item"><span class="meta-label">Mag:</span> <span class="meta-value">${escHtml(obj.vmag)}</span></span>` : ''}
                ${obj.size ? `<span class="meta-item"><span class="meta-label">Size:</span> <span class="meta-value">${escHtml(obj.size)}</span></span>` : ''}
                ${obj.ra ? `<span class="meta-item"><span class="meta-label">RA:</span> <span class="meta-value">${escHtml(obj.ra)}</span></span>` : ''}
                ${obj.observations ? `<span class="meta-item"><span class="meta-label">Obs:</span> <span class="meta-value">${obj.observations.length}</span></span>` : ''}
            </div>
            ${obsPreview ? `<div class="card-obs-preview">${escHtml(obsPreview)}</div>` : ''}
        `;
        return card;
    }

    // --- Object Detail ---
    function selectObject(name) {
        const obj = allData.find(o => o.name === name);
        if (!obj) return;

        const detail = $('#object-detail');
        const simbadUrl = `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(obj.name)}&submit=submit+id`;

        detail.innerHTML = `
            <button class="detail-back" onclick="document.getElementById('object-detail').style.display='none';document.getElementById('results-area').scrollIntoView({behavior:'smooth'});">
                ← Back to results
            </button>
            <div class="detail-header">
                <div class="detail-title-group">
                    <h3>${escHtml(obj.name)}</h3>
                    ${obj.nickname ? `<div class="detail-nickname">${escHtml(obj.nickname)}</div>` : ''}
                    ${obj.other ? `<div class="detail-other">${escHtml(obj.other)}</div>` : ''}
                </div>
                <div class="detail-actions">
                    ${obj.type ? `<span class="badge badge-type">${escHtml(obj.type)}${TYPE_KEY[obj.type] ? ' — ' + TYPE_KEY[obj.type] : ''}</span>` : ''}
                    ${obj.isTopObject ? '<span class="badge badge-top">★ Gottlieb\'s Top</span>' : ''}
                    ${obj.isOrionAtlas ? '<span class="badge badge-orion">Orion Atlas</span>' : ''}
                    <a href="${simbadUrl}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding:6px 16px;font-size:0.85rem;">
                        SIMBAD ↗
                    </a>
                </div>
            </div>

            <div class="detail-grid">
                ${detailField('Right Ascension', obj.ra)}
                ${detailField('Declination', obj.dec)}
                ${detailField('Size', obj.size)}
                ${detailField('Position Angle', obj.pa)}
                ${detailField('Visual Mag', obj.vmag)}
                ${detailField('Blue Mag', obj.bmag)}
                ${detailField('Surface Brightness', obj.sb)}
                ${detailField('Constellation', obj.con ? `${obj.con} — ${CON_NAMES[obj.con] || obj.con}` : '')}
                ${detailField('Classification', obj.class)}
                ${detailField('Discovery Date', obj.discoveryDate)}
                ${detailField('Catalog', obj.catalog)}
            </div>

            ${obj.ngcDescription ? `
                <div class="detail-ngc-desc">
                    <h4>NGC/IC Description</h4>
                    <p>${escHtml(obj.ngcDescription)}</p>
                </div>
            ` : ''}

            ${obj.observations && obj.observations.length > 0 ? `
                <div class="detail-observations">
                    <h4>Visual Observations (${obj.observations.length})</h4>
                    ${obj.observations.map(obs => `
                        <div class="observation">
                            <div class="obs-header">
                                ${obs.aperture ? `<span class="obs-aperture">${escHtml(obs.aperture)}</span>` : ''}
                                ${obs.date ? `<span class="obs-date">${escHtml(obs.date)}</span>` : ''}
                            </div>
                            <div class="obs-text">${escHtml(obs.text)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${obj.showHistorical && obj.historical ? `
                <div class="detail-historical">
                    <h4>Historical Background</h4>
                    <div class="historical-text" id="hist-text">${escHtml(obj.historical).replace(/\n/g, '<br>')}</div>
                    <button class="btn-link historical-read-more" onclick="
                        var el = document.getElementById('hist-text');
                        el.classList.toggle('expanded');
                        this.textContent = el.classList.contains('expanded') ? 'Show less' : 'Read more';
                    ">Read more</button>
                </div>
            ` : ''}
        `;

        detail.style.display = 'block';
        detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function detailField(label, value) {
        if (!value) return `<div class="detail-field"><span class="field-label">${label}</span><span class="field-value empty">—</span></div>`;
        return `<div class="detail-field"><span class="field-label">${label}</span><span class="field-value">${escHtml(value)}</span></div>`;
    }

    // --- Articles ---
    function renderArticles() {
        const list = $('#articles-list');
        if (!list || !articles.length) return;

        list.innerHTML = articles.map(a => `
            <div class="article-item">
                <span class="article-num">#${a.num}</span>
                <div class="article-info">
                    <h4>${escHtml(a.title)}</h4>
                    <span class="article-meta">${escHtml(a.magazine)} · ${escHtml(a.month)} ${a.year}</span>
                </div>
                ${a.url ? `<a href="${escAttr(a.url)}" target="_blank" rel="noopener" class="article-link">${a.urlNote || 'View'} ↗</a>` : '<span></span>'}
            </div>
        `).join('');
    }

    // --- Utilities ---
    function escHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // --- Start ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
