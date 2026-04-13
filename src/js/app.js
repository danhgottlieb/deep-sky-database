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
    const dataIndex = new Map();
    let selectedConstellations = [];
    let selectedCatalogs = [];
    let selectedTypes = [];
    let selectedNames = [];
    let searchTimer;
    let resizeTimer;
    let blogData = [];
    let blogFiltered = [];
    let blogDisplayed = 0;
    const BLOG_PAGE = 200;
    let activeCollection = '';

    // Type abbreviation key
    const TYPE_KEY = {
        'GX': 'Galaxy', '**': 'Double Star', '*': 'Single Star', '***': 'Triple Star',
        '****': 'Quadruple Star', '4*': 'Quadruple Star', '5*': 'Quintuple Star',
        'PN': 'Planetary Nebula', 'PN:': 'Planetary Nebula (uncertain)', 'PN?': 'Possible Planetary Nebula',
        'GC': 'Globular Cluster', 'OC': 'Open Cluster', 'OC:': 'Open Cluster (uncertain)', 'OC?': 'Possible Open Cluster',
        'EN': 'Emission Nebula', 'RN': 'Reflection Nebula', 'DN': 'Dark Nebula',
        'E+R': 'Emission + Reflection Nebula', 'E/R': 'Emission/Reflection Nebula',
        'C+N': 'Cluster + Nebula',
        'SNR': 'Supernova Remnant', 'AST': 'Asterism', 'Ast': 'Asterism',
        'AST?': 'Possible Asterism', 'Ast?': 'Possible Asterism',
        'QSR': 'Quasar', 'QSO': 'Quasi-Stellar Object',
        'GXCL': 'Galaxy Cluster', 'GXPair': 'Galaxy Pair',
        'GXTrpl': 'Galaxy Triple', 'GXTrp': 'Galaxy Triple',
        'GXGrp': 'Galaxy Group', 'GXGRP': 'Galaxy Group',
        'KNT': 'Knot', 'PPN': 'Proto-Planetary Nebula',
        'NF': 'Not Found', 'Dup': 'Duplicate Entry', 'Non': 'Non-existent',
        'RV': 'Red Variable Star', 'MW': 'Milky Way Star Cloud',
        'OBAss': 'OB Association', 'SySt': 'Symbiotic Star',
        'UCD': 'Ultra Compact Dwarf', 'SymBN': 'Symbiotic Bipolar Nebula',
        'ProtoPlanetaryDisc': 'Protoplanetary Disc',
        'BH': 'Black Hole', 'NB': 'Nebula', 'HII': 'HII Region', 'Neb': 'Nebula',
        'WR': 'Wolf-Rayet Shell', 'WR-neb': 'Wolf-Rayet Nebula',
        'LMC-OC': 'LMC Open Cluster', 'LMC-OC:': 'LMC Open Cluster (uncertain)',
        'LMC-GC': 'LMC Globular Cluster', 'LMC-GC:': 'LMC Globular Cluster (uncertain)',
        'LMC-EN': 'LMC Emission Nebula', 'LMC-C+N': 'LMC Cluster + Nebula',
        'LMC-PN': 'LMC Planetary Nebula', 'LMC-SNR': 'LMC Supernova Remnant',
        'LMC-Ass': 'LMC Association', 'LMC-SGS': 'LMC Supergiant Shell',
        'LMC-SGS?': 'LMC Possible Supergiant Shell', 'LMC-YPC': 'LMC Young Pop. Cluster',
        'SMC-OC': 'SMC Open Cluster', 'SMC-EN': 'SMC Emission Nebula',
        'SMC-C+N': 'SMC Cluster + Nebula', 'SMC-E/R': 'SMC Emission/Reflection Nebula',
        'M31-GC': 'M31 Globular Cluster', 'M31-OC': 'M31 Open Cluster',
        'M31-*': 'M31 Star', 'M31-HII': 'M31 HII Region', 'M31-Assn': 'M31 Association',
        'M33-*': 'M33 Star', 'M33-SC': 'M33 Star Cloud', 'M33-HII': 'M33 HII Region',
        'M33-KNT': 'M33 Knot', 'M33-KNT+SC': 'M33 Knot + Star Cloud',
        'M33-OC': 'M33 Open Cluster', 'M33-CL': 'M33 Cluster', 'M33-GC': 'M33 Globular Cluster',
        'Fornax-GC': 'Fornax Dwarf Globular Cluster',
        'NGC6822-KNT': 'NGC 6822 Knot', 'NGC6822-GC': 'NGC 6822 Globular Cluster',
        'M101-KNT': 'M101 Knot', 'M74-HII': 'M74 HII Region', 'M100-KNT': 'M100 Knot',
        'NGC55-KNT': 'NGC 55 Knot', 'N4656-KNT': 'NGC 4656 Knot',
        'NGC2403-KNT': 'NGC 2403 Knot', 'NGC2445-KNT': 'NGC 2445 Knot',
        'NGC4236-KNT': 'NGC 4236 Knot', 'NGC4449-KNT': 'NGC 4449 Knot',
        'NGC4631-KNT': 'NGC 4631 Knot', 'NGC7793-KNT': 'NGC 7793 Knot',
        'NGC4559-KNT': 'NGC 4559 Knot', 'NGC247-KNT': 'NGC 247 Knot',
        'NGC2276-HII': 'NGC 2276 HII Region', 'NGC5921-HII': 'NGC 5921 HII Region',
        'NGC3423-KNT': 'NGC 3423 Knot', 'NGC3938-KNT': 'NGC 3938 Knot',
        'NGC4490-HII': 'NGC 4490 HII Region', 'NGC4536-KNT': 'NGC 4536 Knot',
        'IC10-KNT': 'IC 10 Knot', 'NGC925-KNT': 'NGC 925 Knot',
        'NGC1073-HII': 'NGC 1073 HII Region', 'NGC1097-HII': 'NGC 1097 HII Region',
        'NGC1313-HII': 'NGC 1313 HII Region', 'NGC3184-KNT': 'NGC 3184 Knot',
        'NGC4214-KNT': 'NGC 4214 Knot', 'NGC4395-KNT': 'NGC 4395 Knot',
        'NGC4535-HII': 'NGC 4535 HII Region', 'NGC7479-HII': 'NGC 7479 HII Region'
    };

    // Catalog abbreviation key
    const CATALOG_KEY = {
        'ACO': 'Abell-Corwin-Olowin galaxy clusters',
        'AGC': 'Abell Galaxy Cluster',
        'BU': 'Sherburne Burnham double stars',
        'Ced': 'Cederblad bright diffuse nebulae',
        'CGCG': 'Catalog of Galaxies and Clusters of Galaxies',
        'Cr': 'Collinder open clusters',
        'Do': 'Dolidze open clusters',
        'ESO': 'European Southern Observatory',
        'H': 'Haro planetary nebulae',
        'HCG': 'Hickson Compact Groups',
        'He': 'Henize planetary nebulae',
        'K': 'Kohoutek planetary nebulae',
        'KTG': 'Karachentsev galaxy triplets',
        'KUG': 'Kiso Ultraviolet-excess Galaxies',
        'LBN': 'Lynds Bright Nebulae',
        'LDN': 'Lynds Dark Nebulae',
        'LMC-N': 'Henize emission nebulae in the LMC',
        'M': 'Messier catalog or Minkowski planetary nebulae',
        'M31-G': 'Globular clusters in M31',
        'MCG': 'Morphological Catalogue of Galaxies',
        'Mrk': 'Markarian ultraviolet-excess galaxies',
        'OGC': 'Ogle Galaxy Catalogue',
        'Pe': 'Perek planetary nebula',
        'Ru': 'Ruprecht open cluster',
        'S-L': 'Shapley-Lindsay LMC open cluster',
        'Sh 2': 'Sharpless emission nebulae',
        'SHK': 'Shakhbazian compact galaxy groups',
        'SMC-N': 'Henize emission nebulae in the SMC',
        'STF': 'Wilhelm Struve double stars',
        'STT': 'Otto Struve double star',
        'Tr': 'Trumpler open cluster',
        'UGC': 'Uppsala Galaxy Catalogue',
        'UGCA': 'Uppsala Galaxy Catalogue Addendum',
        'vdB': 'van den Bergh reflection nebulae',
        'VV': 'Vorontsov-Velyaminov interacting galaxies'
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
        'Sct': 'Scutum', 'Ser': 'Serpens', 'SerCd': 'Serpens Cauda', 'Sex': 'Sextans', 'Sge': 'Sagitta',
        'Sgr': 'Sagittarius', 'Tau': 'Taurus', 'Tel': 'Telescopium',
        'TrA': 'Triangulum Australe', 'Tri': 'Triangulum', 'Tuc': 'Tucana',
        'UMa': 'Ursa Major', 'UMi': 'Ursa Minor', 'Vel': 'Vela', 'Vir': 'Virgo',
        'Vol': 'Volans', 'Vul': 'Vulpecula'
    };

    // Steve's intro text
    const INTRO_TEXT = `<p>Here are my observing notes for every non-stellar object in the <a href="https://en.wikipedia.org/wiki/New_General_Catalogue" target="_blank" rel="noopener">New General Catalogue (NGC) of Nebulae and Clusters of Stars</a>, which was compiled by John Louis Dreyer in 1888, as well as Dreyer's first <a href="https://en.wikipedia.org/wiki/New_General_Catalogue" target="_blank" rel="noopener">Index Catalogue (IC&nbsp;I)</a>, published in 1895. The famous NGC includes 7840 entries discovered visually up to that date, the majority from William Herschel and his son John Herschel during systematic surveys of the northern and southern skies from England and South Africa. The database include visual notes on the 1500 objects in the IC&nbsp;I, published in 1895. This represents the only visual journal of the entire NGC and IC&nbsp;I by a single observer, covering the northern to southern celestial poles. In total, there are visual description for 10,357 NGC/IC designations, including the second Index Catalogue (IC&nbsp;II) from 1908. Beyond the NGC and IC, you'll find observing notes on thousands of additional galaxies, clusters, planetaries, emission/reflection nebulae, and double stars.</p>

<p>In 2014, I completed a 35-year project of observing every NGC object north of &minus;41&deg; declination. These roughly 6,800 NGCs were accessible from my home in northern California. At that time I had also covered most of the far southern sky from several previous trips to Australia and had 300 NGCs remaining that were unobservable from the United States. After a few additional trips to the southern hemisphere, I completed the last remaining 34 NGCs on October 18th, 2017 at the OzSky Star Safari which took place on the Markdale Homestead, a large working sheep ranch and country estate, a 3&frac12; hour drive west of Sydney. The final object viewed was NGC 2932 using an 18-inch f/4.5 reflector.</p>

<p>After that milestone, I've started to focus on observing objects in the first Index Catalogue (IC&nbsp;I), which contains 1529 additional discoveries made between 1888 and 1894. The vast majority of these are faint galaxies with blue magnitudes as low as 18th magnitude. Over half were found by the French astronomer St&eacute;phane Javelle, who observed with a 30-inch f/23 refractor at the Nice observatory in southern France. E.E. Barnard and Sherburne Burnham discovered the very faintest IC&nbsp;I galaxies in an Ursa Major cluster known as AGC 1783 using the 36-inch Lick Observatory refractor. By 2014, I only had a few hundred objects remaining and I completed the catalog (except for a handful of photographic nebulae near the Pleiades) on October 18th, 2025, exactly 8 years to the day after finishing the NGC. This time I was observing in northern California on a cattle ranch with my 24&Prime; and the last object observed was IC&nbsp;1493 = LEDA&nbsp;1458643, a faint smudge in Pegasus (B&nbsp;=&nbsp;16.7, V&nbsp;=&nbsp;15.9).</p>

<p>All my observations and notes were made at fairly dark observing sites used by clubs and individuals in the San Francisco bay area, as well as various northern California star parties, such as Lassen National Park and the <a href="https://goldenstatestarparty.org/" target="_blank" rel="noopener">Golden State Star Party</a> (GSSP) in Adin. In addition, a large number of summer observations were made at high elevation sites in the Sierras or the White Mountains east of Bishop (Grandview campground). Generally, observations were made with SQM readings from 21.3&ndash;21.9. Deep southern objects were observed on 11 weeklong observing trips to Australia using 14&Prime; to 30&Prime; scopes that were provided by Zane Hammond at his &ldquo;Magellan Observatory&rdquo; and at several OzSky Star Safaris. Some southern observations were also made using Ray Cash's 13&Prime; travel scope that I brought to Costa Rica and with a C-8 from southern Baja.</p>

<p>I began taking notes on the Messier objects using a 6&Prime; f/5 reflector in 1978 and a C-8 in 1980. Two years later I started exploring fainter NGCs with a 13.1&Prime; Odyssey I. The vast majority of my notes, though, were made with a 17.5&Prime; f/4.5 homemade dob (1987&ndash;2002) and an 18&Prime; f/4.3 Starmaster (2003&ndash;2011). Since 2012 I've used a 24&Prime; f/3.7 Starstructure, as well as a 14.5&Prime; f/4.3 Starmaster. I've also taken detailed notes on over 650 NGC and IC objects using Jimi Lowrey's 48&Prime; f/4.0 mega-sized dobsonian from west Texas. In general, you'll find multiple observations for many NGCs, so their visual appearances can be compared through a variety of apertures.</p>

<p>All of the NGC/IC identifications were checked for historical accuracy as part of the <a href="https://en.wikipedia.org/wiki/New_General_Catalogue" target="_blank" rel="noopener">NGC/IC Project</a>. At the end of my visual observations of each NGC, I've included historical discovery information such as the observer's name, date, telescope, and the original discovery descriptions. Modern catalogue discrepancies and errors are also discussed in detail.</p>

<p>You'll also find my observations of over 1600 galaxies from the <a href="https://en.wikipedia.org/wiki/Uppsala_General_Catalogue" target="_blank" rel="noopener">Uppsala General Catalogue</a> (UGC). These are generally fainter galaxies at least 1&prime; in diameter that were discovered on the first <a href="https://en.wikipedia.org/wiki/National_Geographic_Society_%E2%80%93_Palomar_Observatory_Sky_Survey" target="_blank" rel="noopener">National Geographic&ndash;Palomar Observatory Sky Survey</a> (POSS). Additional galaxy catalogues include the <a href="https://en.wikipedia.org/wiki/Morphological_Catalogue_of_Galaxies" target="_blank" rel="noopener">Morphological Catalogue of Galaxies</a> (MCG), <a href="https://en.wikipedia.org/wiki/Catalogue_of_Galaxies_and_of_Clusters_of_Galaxies" target="_blank" rel="noopener">Catalogue of Galaxies and Clusters of Galaxies</a> (CGCG), and the <a href="https://en.wikipedia.org/wiki/Principal_Galaxies_Catalogue" target="_blank" rel="noopener">Principal Galaxy Catalogue</a> (PGC). For a comprehensive list of common deep sky catalogues of different types of objects see <a href="http://www.messier.seds.org/xtra/supp/cats.html" target="_blank" rel="noopener">this page</a>.</p>

<p>I want to acknowledge the investigative work of Dr. Harold Corwin and Dr. Wolfgang Steinicke, who I've communicated with for many years on a number of identification problems. Harold Corwin provides precise positions and extensive historical notes on thousands of NGC and IC objects at <a href="http://haroldcorwin.net/ngcic/" target="_blank" rel="noopener">haroldcorwin.net/ngcic/</a>. Wolfgang Steinicke, who has authored several books on William Herschel and the history of the NGC, has a website at <a href="http://www.klima-luft.de/steinicke/index_e.htm" target="_blank" rel="noopener">klima-luft.de/steinicke</a>. There you'll find biographical information on 172 NGC/IC astronomers, as well as a numerous historically accurate catalogues in .xls format. For those interested in learning more on the history of the NGC, I highly recommend Wolfgang's book <em>Observing and Cataloguing Nebulae and Star Clusters</em>.</p>

<h3>Telescopes Used in These Observations</h3>
<div class="telescopes-with-photo">
<ul class="telescope-list">
    <li><strong>6&Prime; f/5 reflector</strong>: Early Messier work (1978&ndash;1980)</li>
    <li><strong>C-8 Schmidt-Cassegrain</strong>: Finished the Messier list, many NGCs (1980&ndash;1984)</li>
    <li><strong>13.1&Prime; Odyssey I</strong>: First NGC explorations (1981&ndash;1986)</li>
    <li><strong>17.5&Prime; f/4.5 homemade Dobsonian</strong>: Primary instrument (1987&ndash;2002)</li>
    <li><strong>18&Prime; f/4.3 Starmaster</strong>: Extended surveys (2003&ndash;2011)</li>
    <li><strong>24&Prime; f/3.7 Starstructure</strong>: Current primary telescope (2012&ndash;present)</li>
    <li><strong>25&Prime; f/5.0 Obsession</strong>: Observations in Australia (2015&ndash;2025)</li>
    <li><strong>30&Prime; f/4.5 Obsession</strong>: Observations in Australia (2010&ndash;2019)</li>
    <li><strong>48&Prime; Dobsonian</strong>: Over 500 observations using Jimi Lowrey's giant telescope in west Texas</li>
    <li><strong>82&Prime; Otto Struve Telescope</strong>: Observations at McDonald Observatory</li>
    <li><strong>PVS-14 Gen 3 Night Vision (NV) device</strong></li>
</ul>
<img src="img/steve_with_scope.jpg" alt="Steve Gottlieb with a large Dobsonian telescope" class="telescopes-photo">
</div>`;

    // --- DOM References ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // --- Init ---
    async function init() {
        setupNav();
        setupStarfield();
        setupCarousel();
        setupScrollReveal();
        setupIntro();
        setupBioToggle();
        setupLegend();

        // Load data
        try {
            const [dataRes, metaRes, artRes] = await Promise.all([
                fetch('data.json'),
                fetch('metadata.json'),
                fetch('articles.json')
            ]);
            if (!dataRes.ok || !metaRes.ok || !artRes.ok) throw new Error('Failed to load data');
            allData = await dataRes.json();
            metadata = await metaRes.json();
            articles = await artRes.json();

            // Load blog index (non-blocking)
            fetch('blog/blog_index.json').then(r => r.ok ? r.json() : []).then(data => {
                blogData = data || [];
                blogFiltered = blogData;
                renderBlog();
                setupBlogSearch();
                // Update hero stat with actual count
                const reportStat = document.getElementById('stat-reports');
                if (reportStat) reportStat.textContent = blogData.length.toLocaleString();
            }).catch(() => {});

            // Build name index
            allData.forEach(o => dataIndex.set(o.name, o));

            // Compute and display total observations
            const totalObs = allData.reduce((sum, o) => sum + countVisualObs(o.observations), 0);
            const obsStat = document.getElementById('stat-observations');
            if (obsStat) obsStat.textContent = totalObs.toLocaleString();
            // Update explorer description with total observation count
            const explorerDesc = document.getElementById('explorer-desc');
            if (explorerDesc) explorerDesc.textContent = `Search and explore over 24,700 deep sky objects with ${totalObs.toLocaleString()} detailed visual observations, historical context, and cross-references.`;

            buildFilters();
            renderArticles();
            setupSearch();
            setupFilters();
            handleHashNavigation();

            // Hide and remove loading overlay
            const overlay = $('#loading-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
                setTimeout(() => overlay.remove(), 500);
            }

            console.log(`Loaded ${allData.length} objects`);
        } catch (e) {
            console.error('Failed to load data:', e);
            const overlay = $('#loading-overlay');
            if (overlay) overlay.innerHTML = '<span style="color:var(--red);">Failed to load database. Please refresh.</span>';
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

        // Close mobile nav on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#main-nav')) links.classList.remove('open');
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

    // --- Shooting Stars & Satellites overlay (background image handled by CSS) ---
    function setupStarfield() {
        const canvas = $('#starfield');
        if (!canvas) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const ctx = canvas.getContext('2d');
        let shootingStars = [];
        let satellites = [];
        let nextShootingAt = Date.now() + 4000 + Math.random() * 8000;
        let nextSatelliteAt = Date.now() + 60000 + Math.random() * 120000;
        let animId;
        let homeVisible = true;

        // Track whether the home section is in view
        const homeSection = document.getElementById('home');
        if (homeSection) {
            const homeObserver = new IntersectionObserver(([entry]) => {
                homeVisible = entry.isIntersecting;
            }, { threshold: 0.05 });
            homeObserver.observe(homeSection);
        }

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function spawnShootingStar() {
            const w = canvas.width, h = canvas.height;
            const angle = (10 + Math.random() * 160) * Math.PI / 180;
            const speed = 6 + Math.random() * 8;
            const vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
            const vy = Math.sin(angle) * speed;
            shootingStars.push({
                x: Math.random() * w,
                y: Math.random() * h * 0.3,
                vx, vy,
                life: 0,
                maxLife: 30 + Math.random() * 45,
                tailLen: 50 + Math.random() * 100
            });
            nextShootingAt = Date.now() + 6000 + Math.random() * 14000;
        }

        function spawnSatellite() {
            const w = canvas.width, h = canvas.height;
            // Satellites move slowly in a straight line across the screen
            const fromLeft = Math.random() > 0.5;
            const startX = fromLeft ? -10 : w + 10;
            const endX = fromLeft ? w + 10 : -10;
            const startY = 20 + Math.random() * h * 0.5;
            const endY = startY + (Math.random() - 0.5) * h * 0.3;
            const dist = Math.hypot(endX - startX, endY - startY);
            const speed = 0.6 + Math.random() * 0.4;
            satellites.push({
                x: startX, y: startY,
                vx: ((endX - startX) / dist) * speed,
                vy: ((endY - startY) / dist) * speed,
                life: 0,
                maxLife: Math.ceil(dist / speed),
                brightness: 0.5 + Math.random() * 0.3
            });
            // Next satellite in 1-4 minutes
            nextSatelliteAt = Date.now() + 60000 + Math.random() * 180000;
        }

        function draw() {
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Only spawn new shooting stars/satellites when home section is visible
            if (homeVisible) {
                const t = Date.now();
                if (t >= nextShootingAt) spawnShootingStar();
                if (t >= nextSatelliteAt) spawnSatellite();
            }

            // Draw shooting stars (let existing ones finish their animation)
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const ss = shootingStars[i];
                ss.x += ss.vx;
                ss.y += ss.vy;
                ss.life++;
                const progress = ss.life / ss.maxLife;
                const alpha = progress < 0.12 ? progress / 0.12
                            : progress > 0.65 ? 1 - (progress - 0.65) / 0.35 : 1;
                const len = Math.hypot(ss.vx, ss.vy);
                const tailX = ss.x - (ss.vx / len) * ss.tailLen;
                const tailY = ss.y - (ss.vy / len) * ss.tailLen;
                const sg = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
                sg.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
                sg.addColorStop(0.25, `rgba(200,220,255,${alpha * 0.4})`);
                sg.addColorStop(1, 'rgba(200,220,255,0)');
                ctx.beginPath();
                ctx.moveTo(ss.x, ss.y);
                ctx.lineTo(tailX, tailY);
                ctx.strokeStyle = sg;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${alpha * 0.85})`;
                ctx.fill();
                if (ss.life >= ss.maxLife) shootingStars.splice(i, 1);
            }

            // Draw satellites — small steady dot moving slowly
            for (let i = satellites.length - 1; i >= 0; i--) {
                const sat = satellites[i];
                sat.x += sat.vx;
                sat.y += sat.vy;
                sat.life++;
                const progress = sat.life / sat.maxLife;
                const fade = progress < 0.05 ? progress / 0.05
                           : progress > 0.95 ? (1 - progress) / 0.05 : 1;
                ctx.beginPath();
                ctx.arc(sat.x, sat.y, 1.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,240,${sat.brightness * fade})`;
                ctx.fill();
                if (sat.life >= sat.maxLife) satellites.splice(i, 1);
            }

            animId = requestAnimationFrame(draw);
        }

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 200);
        });
        resize();
        draw();

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { cancelAnimationFrame(animId); animId = null; }
            else if (!animId) draw();
        });
    }

    // --- Photo Carousel ---
    function setupCarousel() {
        const carousel = $('#about-carousel');
        if (!carousel) return;
        const slides = carousel.querySelectorAll('.carousel-slide');
        const dotsContainer = $('#carousel-dots');
        if (slides.length < 2) return;

        let current = 0;
        let timer;

        // Build dots
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Photo ${i + 1}`);
            dot.addEventListener('click', () => goTo(i));
            dotsContainer.appendChild(dot);
        });
        const dots = dotsContainer.querySelectorAll('.carousel-dot');

        function goTo(idx) {
            slides[current].classList.remove('active');
            dots[current].classList.remove('active');
            current = idx;
            slides[current].classList.add('active');
            dots[current].classList.add('active');
            resetTimer();
        }

        function next() { goTo((current + 1) % slides.length); }

        function resetTimer() {
            clearInterval(timer);
            timer = setInterval(next, 5000);
        }

        // Pause on hover
        carousel.addEventListener('mouseenter', () => clearInterval(timer));
        carousel.addEventListener('mouseleave', resetTimer);

        // Pause when not visible
        const cObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) resetTimer();
            else clearInterval(timer);
        });
        cObserver.observe(carousel);

        resetTimer();
    }

    // --- Scroll Reveal ---
    function setupScrollReveal() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
        if (!reveals.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        reveals.forEach(el => observer.observe(el));
    }

    // --- Intro ---
    function setupIntro() {
        const el = $('#intro-text');
        if (el) el.innerHTML = INTRO_TEXT;
    }

    // --- Bio Modal ---
    function setupBioToggle() {
        const btn = $('#bio-toggle-btn');
        const overlay = $('#bio-modal-overlay');
        const closeBtn = $('#bio-modal-close');
        if (!btn || !overlay) return;
        btn.addEventListener('click', () => {
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
        function closeModal() {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
        });
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

        // Catalog abbreviation legend
        const catGrid = $('#catalog-legend-grid');
        const catBtn = $('#catalog-legend-toggle');
        const catLegend = $('#catalog-legend');

        if (catGrid && catBtn && catLegend) {
            const catEntries = Object.entries(CATALOG_KEY).sort((a, b) => a[0].localeCompare(b[0]));
            catGrid.innerHTML = catEntries.map(([abbr, full]) =>
                `<div class="legend-item"><span class="legend-abbr">${escHtml(abbr)}</span><span class="legend-full">${escHtml(full)}</span></div>`
            ).join('');

            catBtn.addEventListener('click', () => {
                const shown = catLegend.style.display !== 'none';
                catLegend.style.display = shown ? 'none' : 'block';
                catBtn.textContent = shown ? 'Catalog Name Abbreviations ▾' : 'Catalog Name Abbreviations ▴';
            });
        }
    }

    // --- Build Filter Options ---
    function buildFilters() {
        // Multi-select constellation filter
        buildConstellationFilter();
        // Multi-select catalog filter
        buildCatalogFilter();
        // Multi-select type filter
        buildTypeFilter();
        // Multi-select name filter
        buildNameFilter();
    }

    // Extract HCG designation from an object (from name or 'other' field)
    function getHcgDesignation(obj) {
        if (obj.name.startsWith('HCG')) return obj.name;
        if (obj.other) {
            const m = obj.other.match(/HCG\s*\d+[A-Ga-g]?/);
            if (m) return m[0];
        }
        return null;
    }

    function buildConstellationFilter() {
        const container = $('#filter-con-container');
        const searchInput = $('#filter-con-search');
        const tagsEl = $('#con-tags');
        const dropdown = $('#con-dropdown');

        if (!container || !searchInput || !tagsEl || !dropdown) return;

        const constellations = metadata.constellations || [];

        function renderDropdown(filter) {
            filter = filter || '';
            const filtered = constellations.filter(c => {
                const full = CON_NAMES[c] || c;
                return !filter || c.toLowerCase().includes(filter) || full.toLowerCase().includes(filter);
            });
            dropdown.innerHTML = filtered.map(c => {
                const isSelected = selectedConstellations.includes(c);
                return `<div class="multi-select-option${isSelected ? ' selected' : ''}" data-value="${c}">${CON_NAMES[c] || c}</div>`;
            }).join('');

            dropdown.querySelectorAll('.multi-select-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const val = opt.dataset.value;
                    const idx = selectedConstellations.indexOf(val);
                    if (idx >= 0) selectedConstellations.splice(idx, 1);
                    else selectedConstellations.push(val);
                    renderTags();
                    renderDropdown(searchInput.value.trim().toLowerCase());
                });
            });
        }

        function renderTags() {
            tagsEl.innerHTML = selectedConstellations.map(c =>
                `<span class="multi-select-tag">${CON_NAMES[c] || c} <button data-value="${c}">&times;</button></span>`
            ).join('');
            tagsEl.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = btn.dataset.value;
                    selectedConstellations = selectedConstellations.filter(x => x !== val);
                    renderTags();
                    renderDropdown(searchInput.value.trim().toLowerCase());
                });
            });
        }

        searchInput.addEventListener('focus', () => { dropdown.classList.add('open'); renderDropdown(searchInput.value.trim().toLowerCase()); });
        searchInput.addEventListener('input', () => renderDropdown(searchInput.value.trim().toLowerCase()));
        document.addEventListener('click', (e) => { if (!e.target.closest('#filter-con-container')) dropdown.classList.remove('open'); });

        renderDropdown();
    }

    function buildCatalogFilter() {
        const container = $('#filter-catalog-container');
        const searchInput = $('#filter-catalog-search');
        const tagsEl = $('#catalog-tags');
        const dropdown = $('#catalog-dropdown');

        if (!container || !searchInput || !tagsEl || !dropdown) return;

        const catalogs = ['Messier', 'NGC', 'IC', 'UGC', 'Hickson Compact Groups', 'Orion DeepMap', "Gottlieb's favorites"];

        function renderDropdown(filter) {
            filter = filter || '';
            const filtered = catalogs.filter(c =>
                !filter || c.toLowerCase().includes(filter)
            );
            dropdown.innerHTML = filtered.map(c => {
                const isSelected = selectedCatalogs.includes(c);
                return `<div class="multi-select-option${isSelected ? ' selected' : ''}" data-value="${c}">${c}</div>`;
            }).join('');

            dropdown.querySelectorAll('.multi-select-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const val = opt.dataset.value;
                    const idx = selectedCatalogs.indexOf(val);
                    if (idx >= 0) selectedCatalogs.splice(idx, 1);
                    else selectedCatalogs.push(val);
                    renderCatalogTags();
                    renderDropdown(searchInput.value.trim().toLowerCase());
                });
            });
        }

        function renderCatalogTags() {
            tagsEl.innerHTML = selectedCatalogs.map(c =>
                `<span class="multi-select-tag">${c} <button data-value="${c}">&times;</button></span>`
            ).join('');
            tagsEl.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = btn.dataset.value;
                    selectedCatalogs = selectedCatalogs.filter(x => x !== val);
                    renderCatalogTags();
                    renderDropdown(searchInput.value.trim().toLowerCase());
                });
            });
        }

        searchInput.addEventListener('focus', () => { dropdown.classList.add('open'); renderDropdown(searchInput.value.trim().toLowerCase()); });
        searchInput.addEventListener('input', () => renderDropdown(searchInput.value.trim().toLowerCase()));
        document.addEventListener('click', (e) => { if (!e.target.closest('#filter-catalog-container')) dropdown.classList.remove('open'); });

        renderDropdown();
    }

    function buildTypeFilter() {
        const container = $('#filter-type-container');
        const searchInput = $('#filter-type-search');
        const tagsEl = $('#type-tags');
        const dropdown = $('#type-dropdown');

        if (!container || !searchInput || !tagsEl || !dropdown) return;

        const types = metadata.types ? Object.entries(metadata.types).map(([t, count]) => {
            const fullName = TYPE_KEY[t] ? ` — ${TYPE_KEY[t]}` : '';
            return { value: t, label: `${t}${fullName} (${count})` };
        }) : [];

        function renderDropdown(filter) {
            filter = filter || '';
            const filtered = types.filter(t =>
                !filter || t.value.toLowerCase().includes(filter) || t.label.toLowerCase().includes(filter)
            );
            dropdown.innerHTML = filtered.map(t => {
                const isSelected = selectedTypes.includes(t.value);
                return `<div class="multi-select-option${isSelected ? ' selected' : ''}" data-value="${t.value}">${t.label}</div>`;
            }).join('');

            dropdown.querySelectorAll('.multi-select-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const val = opt.dataset.value;
                    const idx = selectedTypes.indexOf(val);
                    if (idx >= 0) selectedTypes.splice(idx, 1);
                    else selectedTypes.push(val);
                    renderTypeTags();
                    renderDropdown(searchInput.value.trim().toLowerCase());
                });
            });
        }

        function renderTypeTags() {
            tagsEl.innerHTML = selectedTypes.map(t => {
                const fullName = TYPE_KEY[t] || t;
                return `<span class="multi-select-tag">${fullName} <button data-value="${t}">&times;</button></span>`;
            }).join('');
            tagsEl.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = btn.dataset.value;
                    selectedTypes = selectedTypes.filter(x => x !== val);
                    renderTypeTags();
                    renderDropdown(searchInput.value.trim().toLowerCase());
                });
            });
        }

        searchInput.addEventListener('focus', () => { dropdown.classList.add('open'); renderDropdown(searchInput.value.trim().toLowerCase()); });
        searchInput.addEventListener('input', () => renderDropdown(searchInput.value.trim().toLowerCase()));
        document.addEventListener('click', (e) => { if (!e.target.closest('#filter-type-container')) dropdown.classList.remove('open'); });

        renderDropdown();
    }

    function buildNameFilter() {
        const container = $('#filter-name-container');
        const searchInput = $('#filter-name');
        const tagsEl = $('#name-tags');

        if (!container || !searchInput || !tagsEl) return;

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = searchInput.value.trim();
                if (val && !selectedNames.includes(val.toLowerCase())) {
                    selectedNames.push(val.toLowerCase());
                    renderNameTags();
                    searchInput.value = '';
                }
            }
        });

        function renderNameTags() {
            tagsEl.innerHTML = selectedNames.map(n =>
                `<span class="multi-select-tag">${escHtml(n)} <button data-value="${n}">&times;</button></span>`
            ).join('');
            tagsEl.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = btn.dataset.value;
                    selectedNames = selectedNames.filter(x => x !== val);
                    renderNameTags();
                });
            });
        }
    }

    // --- Search ---
    function setupSearch() {
        const input = $('#quick-search');
        const btn = $('#quick-search-btn');
        const sugBox = $('#quick-suggestions');

        input.addEventListener('input', () => {
            clearTimeout(searchTimer);
            suggestionIndex = -1;
            const q = input.value.trim();
            if (q.length < 1) {
                sugBox.innerHTML = '';
                return;
            }
            searchTimer = setTimeout(() => showSuggestions(q, sugBox), 150);
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

    // Check if a query is a Messier number (M1..M110)
    function parseMessierQuery(q) {
        const m = q.match(/^m\s*(\d{1,3})$/);
        if (!m) return null;
        const num = parseInt(m[1], 10);
        return (num >= 1 && num <= 110) ? 'M' + num : null;
    }

    function showSuggestions(query, container) {
        const q = normalizeQuery(query);
        const matches = [];

        // If the query is a Messier number, find that object first
        const messierKey = parseMessierQuery(q);
        if (messierKey) {
            const messierObj = allData.find(o => o.messierNumber === messierKey);
            if (messierObj) {
                matches.push({ obj: messierObj, matchedAlt: '', messierFirst: true });
            }
        }

        for (const obj of allData) {
            if (matches.length >= 10) break;
            // Skip if already added as Messier priority match
            if (matches.length > 0 && matches[0].messierFirst && obj === matches[0].obj) continue;
            const name = obj.name.toLowerCase();
            const nick = (obj.nickname || '').toLowerCase();
            const other = (obj.other || '').toLowerCase();
            let matchedAlt = '';
            if (flexibleMatch(name, q) || flexibleMatch(nick, q)) {
                // matched by primary name or nickname — no alt needed
            } else if (flexibleMatch(other, q)) {
                // matched via alternate name — find which one
                matchedAlt = findMatchingAlt(obj.other, q);
            } else {
                continue;
            }
            matches.push({ obj, matchedAlt });
        }

        suggestionIndex = -1;

        if (matches.length === 0) {
            container.innerHTML = '<div class="suggestions-list"><div class="suggestion-item" style="color:var(--text-muted);cursor:default;">No objects found</div></div>';
            return;
        }

        container.innerHTML = `<div class="suggestions-list">${matches.map(({ obj: m, matchedAlt, messierFirst }) => {
            // For Messier priority matches, show as "M1 (NGC 1952)" instead of "NGC 1952"
            const displayName = messierFirst && m.messierNumber
                ? m.messierNumber + ' (' + m.name + ')'
                : m.name;
            return `<div class="suggestion-item" data-name="${escAttr(m.name)}">
                <span class="suggestion-name">${escHtml(displayName)}${m.nickname ? ' — ' + escHtml(m.nickname) : ''}${matchedAlt ? ' <span class="suggestion-alt">(' + escHtml(matchedAlt) + ')</span>' : ''}</span>
                <span class="suggestion-type">${escHtml(m.type || '—')}</span>
            </div>`;
        }).join('')}</div>`;

        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                if (!item.dataset.name) return;
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

    function flexibleMatch(haystack, needle) {
        if (haystack.includes(needle)) return true;
        const spaceless = needle.replace(/\s+/g, '');
        const spaced = spaceless.replace(/^(ngc|ic|ugc|m|abell|arp|hickson|sh|vv|mcg|pgc|leda)(\d)/, '$1 $2');
        return haystack.includes(spaceless) || haystack.includes(spaced);
    }

    // Find which specific alternate name matched the query
    function findMatchingAlt(otherField, query) {
        if (!otherField) return '';
        // Split on ' = ' to get individual names
        const parts = otherField.split(/\s*=\s*/);
        for (const part of parts) {
            if (part.toLowerCase().includes(query)) return part.trim();
        }
        // Fallback: flexible match
        for (const part of parts) {
            if (flexibleMatch(part.toLowerCase(), query)) return part.trim();
        }
        return otherField.split('=')[0].trim();
    }

    let lastSearchQuery = '';

    function doQuickSearch(query) {
        if (!query) return;
        lastSearchQuery = normalizeQuery(query);
        const q = lastSearchQuery;

        // Check for Messier number query — resolve to the actual object
        const messierKey = parseMessierQuery(q);
        if (messierKey) {
            const messierObj = allData.find(o => o.messierNumber === messierKey);
            if (messierObj) {
                selectObject(messierObj.name);
                return;
            }
        }

        // Exact match first
        const exact = allData.find(o => o.name.toLowerCase() === q);
        if (exact) {
            selectObject(exact.name);
            return;
        }

        // Also try with space inserted (e.g., "NGC1" → "NGC 1")
        const spaced = q.replace(/^(ngc|ic|ugc|m|abell|arp|hickson|sh|vv|mcg|pgc|leda)(\d)/, '$1 $2');
        if (spaced !== q) {
            const exactSpaced = allData.find(o => o.name.toLowerCase() === spaced);
            if (exactSpaced) {
                selectObject(exactSpaced.name);
                return;
            }
        }

        // Partial match
        filteredData = allData.filter(o => {
            const name = o.name.toLowerCase();
            const nick = (o.nickname || '').toLowerCase();
            const other = (o.other || '').toLowerCase();
            return flexibleMatch(name, q) || flexibleMatch(nick, q) || flexibleMatch(other, q);
        });

        if (filteredData.length === 1) {
            selectObject(filteredData[0].name);
        } else {
            showResults();
        }
    }

    // --- Filters ---
    function setupFilters() {
        $('#apply-filters').addEventListener('click', applyFilters);
        $('#clear-filters').addEventListener('click', clearFilters);
        $('#sort-select').addEventListener('change', () => {
            currentSort = $('#sort-select').value;
            sortResults();
            displayedCount = 0;
            $('#results-list').innerHTML = '';
            renderResults();
        });

        // RA spinner wrap-around: hours 0↔23, minutes 0↔59
        setupRaWrap('filter-ra-min-h', 0, 23);
        setupRaWrap('filter-ra-max-h', 0, 23);
        setupRaWrap('filter-ra-min-m', 0, 59);
        setupRaWrap('filter-ra-max-m', 0, 59);
    }

    // Continuous wrap-around for RA number inputs
    function setupRaWrap(id, min, max) {
        const el = document.getElementById(id);
        if (!el) return;
        const wrap = () => {
            let v = parseInt(el.value, 10);
            if (isNaN(v)) return;
            if (v > max) el.value = min;
            else if (v < min) el.value = max;
        };
        el.addEventListener('input', wrap);
        el.addEventListener('change', wrap);
    }

    // Parse RA string "HH MM SS.s" to decimal hours
    function raToHours(ra) {
        if (!ra) return null;
        const parts = ra.trim().split(/\s+/);
        if (parts.length < 2) return null;
        const h = parseFloat(parts[0]);
        const m = parseFloat(parts[1]);
        const s = parts.length > 2 ? parseFloat(parts[2]) : 0;
        return h + m / 60 + s / 3600;
    }

    function applyFilters() {
        const magMin = parseFloat($('#filter-mag-min').value);
        const magMax = parseFloat($('#filter-mag-max').value);
        const raMinH = $('#filter-ra-min-h').value;
        const raMinM = $('#filter-ra-min-m').value;
        const raMaxH = $('#filter-ra-max-h').value;
        const raMaxM = $('#filter-ra-max-m').value;

        // Collect any text still in the name input that hasn't been added as a tag
        const nameInput = $('#filter-name');
        const pendingName = nameInput ? normalizeQuery(nameInput.value) : '';
        const allNameFilters = [...selectedNames];
        if (pendingName && !allNameFilters.includes(pendingName)) allNameFilters.push(pendingName);

        // Build RA range in decimal hours
        const hasRaMin = raMinH !== '';
        const hasRaMax = raMaxH !== '';
        let raMin = null, raMax = null;
        if (hasRaMin) raMin = parseInt(raMinH, 10) + (raMinM ? parseInt(raMinM, 10) / 60 : 0);
        if (hasRaMax) raMax = parseInt(raMaxH, 10) + (raMaxM ? parseInt(raMaxM, 10) / 60 : 0);

        filteredData = allData.filter(o => {
            if (selectedCatalogs.length > 0) {
                const refs = o.references || '';
                const matchesCatalog = selectedCatalogs.includes(o.catalog) ||
                    (selectedCatalogs.includes('Messier') && o.isMessier) ||
                    (selectedCatalogs.includes('Orion DeepMap') && o.isOrionAtlas) ||
                    (selectedCatalogs.includes("Gottlieb's favorites") && o.isTopObject) ||
                    (selectedCatalogs.includes('Hickson Compact Groups') && refs.includes('h'));
                if (!matchesCatalog) return false;
            }
            if (selectedConstellations.length > 0 && !selectedConstellations.includes(o.con)) return false;
            if (selectedTypes.length > 0 && !selectedTypes.includes(o.type)) return false;
            if (allNameFilters.length > 0) {
                const n = o.name.toLowerCase();
                const nick = (o.nickname || '').toLowerCase();
                const other = (o.other || '').toLowerCase();
                const matchesAny = allNameFilters.some(nf => n.includes(nf) || nick.includes(nf) || other.includes(nf));
                if (!matchesAny) return false;
            }
            return true;
        });

        // Magnitude filter — applied separately so objects without vmag aren't excluded when no mag filter set
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

        // RA filter — supports wrap-around (e.g., 22h to 02h)
        if (raMin !== null || raMax !== null) {
            filteredData = filteredData.filter(o => {
                const objRA = raToHours(o.ra);
                if (objRA === null) return false;
                if (raMin !== null && raMax !== null) {
                    if (raMin <= raMax) {
                        return objRA >= raMin && objRA <= raMax;
                    } else {
                        return objRA >= raMin || objRA <= raMax;
                    }
                }
                if (raMin !== null && objRA < raMin) return false;
                if (raMax !== null && objRA > raMax) return false;
                return true;
            });
        }

        // If HCG catalog is selected, set active collection for sorting
        if (selectedCatalogs.length === 1 && selectedCatalogs[0] === 'Hickson Compact Groups') {
            activeCollection = 'hcg';
        } else if (selectedCatalogs.length === 1 && selectedCatalogs[0] === 'Messier') {
            activeCollection = 'messier';
        } else {
            activeCollection = '';
        }

        showResults();
    }

    function clearFilters() {
        activeCollection = '';
        const catSearch = $('#filter-catalog-search');
        if (catSearch) catSearch.value = '';
        selectedCatalogs = [];
        const catTags = $('#catalog-tags');
        if (catTags) catTags.innerHTML = '';
        const catDropdown = $('#catalog-dropdown');
        if (catDropdown) {
            catDropdown.classList.remove('open');
            catDropdown.querySelectorAll('.multi-select-option').forEach(opt => opt.classList.remove('selected'));
        }
        selectedConstellations = [];
        const conTags = $('#con-tags');
        if (conTags) conTags.innerHTML = '';
        const conSearch = $('#filter-con-search');
        if (conSearch) conSearch.value = '';
        const conDropdown = $('#con-dropdown');
        if (conDropdown) {
            conDropdown.classList.remove('open');
            conDropdown.querySelectorAll('.multi-select-option').forEach(opt => opt.classList.remove('selected'));
        }
        selectedTypes = [];
        const typeTags = $('#type-tags');
        if (typeTags) typeTags.innerHTML = '';
        const typeSearch = $('#filter-type-search');
        if (typeSearch) typeSearch.value = '';
        const typeDropdown = $('#type-dropdown');
        if (typeDropdown) {
            typeDropdown.classList.remove('open');
            typeDropdown.querySelectorAll('.multi-select-option').forEach(opt => opt.classList.remove('selected'));
        }
        selectedNames = [];
        const nameTags = $('#name-tags');
        if (nameTags) nameTags.innerHTML = '';
        $('#filter-mag-min').value = '';
        $('#filter-mag-max').value = '';
        $('#filter-ra-min-h').value = '';
        $('#filter-ra-min-m').value = '';
        $('#filter-ra-max-h').value = '';
        $('#filter-ra-max-m').value = '';
        $('#filter-name').value = '';
        filteredData = [];
        $('#results-header').style.display = 'none';
        $('#results-list').innerHTML = '';
        $('#load-more-container').style.display = 'none';
        closeDetailPanel();
    }

    // --- Results ---
    function showResults() {
        closeDetailPanel();
        sortResults();
        displayedCount = 0;
        $('#results-list').innerHTML = '';
        renderResults();
        $('#results-header').style.display = 'flex';
        $('#results-count').textContent = `${filteredData.length.toLocaleString()} objects found`;

        if (filteredData.length === 0) {
            $('#results-list').innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--text-muted)"><p style="font-size:1.1rem;margin-bottom:8px;">No objects match your search.</p><p>Try broadening your filters or checking the spelling.</p></div>';
        }

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
                default:
                    if (activeCollection === 'messier') {
                        return naturalSort(a.messierNumber || '', b.messierNumber || '');
                    }
                    if (activeCollection === 'hcg') {
                        const hA = getHcgDesignation(a) || '';
                        const hB = getHcgDesignation(b) || '';
                        return naturalSort(hA, hB);
                    }
                    return naturalSort(a.name, b.name);
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
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', () => selectObject(obj.name));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectObject(obj.name); }
        });

        const obsText = obj.observations && obj.observations.length > 0 && obj.observations[0].text
            ? obj.observations[0].text : '';
        const obsPreview = obsText.length > 150 ? obsText.substring(0, 150) + '…' : obsText;

        // Show matched alternate name if search was via the 'other' field
        let altMatch = '';
        if (lastSearchQuery && obj.other) {
            const nameMatch = flexibleMatch(obj.name.toLowerCase(), lastSearchQuery);
            const nickMatch = flexibleMatch((obj.nickname || '').toLowerCase(), lastSearchQuery);
            if (!nameMatch && !nickMatch) {
                altMatch = findMatchingAlt(obj.other, lastSearchQuery);
            }
        }

        // HCG designation prefix (similar to Messier)
        const hcgDesig = (activeCollection === 'hcg') ? getHcgDesignation(obj) : null;
        const hcgPrefix = (hcgDesig && hcgDesig !== obj.name) ? escHtml(hcgDesig) + ' = ' : '';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-name">${obj.messierNumber ? escHtml(obj.messierNumber) + ' = ' : ''}${hcgPrefix}${escHtml(obj.name)}</div>
                    ${obj.nickname ? `<div class="card-nickname">${escHtml(obj.nickname)}</div>` : ''}
                    ${altMatch ? `<div class="card-alt-match">Also known as: ${escHtml(altMatch)}</div>` : ''}
                </div>
                <div class="card-badges">
                    ${obj.type ? `<span class="badge badge-type">${escHtml(obj.type)}</span>` : ''}
                    ${obj.isTopObject ? '<span class="badge badge-top">★ Favorites</span>' : ''}
                    ${obj.isOrionAtlas ? '<span class="badge badge-orion">DeepMap</span>' : ''}
                    ${obj.isMessier ? '<span class="badge badge-messier">M</span>' : ''}
                </div>
            </div>
            <div class="card-meta">
                ${obj.con ? `<span class="meta-item"><span class="meta-label">Con:</span> <span class="meta-value">${escHtml(CON_NAMES[obj.con] || obj.con)}</span></span>` : ''}
                ${obj.vmag ? `<span class="meta-item"><span class="meta-label">Mag:</span> <span class="meta-value">${escHtml(obj.vmag)}</span></span>` : ''}
                ${obj.size ? `<span class="meta-item"><span class="meta-label">Size:</span> <span class="meta-value">${escHtml(obj.size)}</span></span>` : ''}
                ${obj.ra ? `<span class="meta-item"><span class="meta-label">RA:</span> <span class="meta-value">${escHtml(obj.ra)}</span></span>` : ''}
                ${obj.dec ? `<span class="meta-item"><span class="meta-label">Dec:</span> <span class="meta-value">${escHtml(obj.dec)}</span></span>` : ''}
                ${obj.observations ? `<span class="meta-item"><span class="meta-label">Obs:</span> <span class="meta-value">${countVisualObs(obj.observations)}</span></span>` : ''}
            </div>
            ${obsPreview ? `<div class="card-obs-preview">${escHtml(obsPreview)}</div>` : ''}
        `;
        return card;
    }

    // Count actual visual observations, excluding "=" identification notes
    function countVisualObs(observations) {
        if (!observations || observations.length === 0) return 0;
        return observations.filter(o => !(o.text && o.text.startsWith('='))).length;
    }

    // --- Object Detail (slide-over panel) ---
    function selectObject(name, pushState) {
        if (pushState === undefined) pushState = true;
        const obj = dataIndex.get(name);
        if (!obj) return;

        if (pushState) {
            history.pushState({ object: name }, '', '#object/' + encodeURIComponent(name));
        }

        const detail = $('#object-detail');
        const backdrop = $('#detail-backdrop');
        const simbadUrl = `https://simbad.cds.unistra.fr/simbad/sim-coo?Coord=${encodeURIComponent(obj.ra + ' ' + obj.dec)}&CooFrame=FK5&CooEpoch=2000&CooEqui=2000&CooDefinedFrames=none&Radius=0.1&Radius.unit=arcmin&submit=submit+query`;

        // Process NGC/IC description: move special "=" patterns to observations section
        const ngcDescExcludePattern = /=\s*(Not found|Nonexistent|Plate flaw|No visible nebulosity)\b/;
        let displayNgcDesc = obj.ngcDescription || '';
        let extractedDescNote = null;
        const ngcDescMatch = displayNgcDesc.match(ngcDescExcludePattern);
        if (ngcDescMatch) {
            const idx = displayNgcDesc.indexOf(ngcDescMatch[0]);
            extractedDescNote = displayNgcDesc.substring(idx).trim();
            displayNgcDesc = displayNgcDesc.substring(0, idx).replace(/[,\s]+$/, '').trim();
        }

        // Count real visual observations (exclude "=" identification notes)
        const realObsCount = countVisualObs(obj.observations);
        const hasObs = (obj.observations && obj.observations.length > 0) || extractedDescNote;

        const obsSection = hasObs ? `
                <div class="detail-observations">
                    <h4>Visual Observations (${realObsCount})</h4>
                    ${extractedDescNote ? `
                        <div class="observation">
                            <div class="obs-text">${escHtml(extractedDescNote)}</div>
                        </div>
                    ` : ''}
                    ${(obj.observations || []).map(obs => `
                        <div class="observation">
                            <div class="obs-header">
                                ${obs.aperture ? `<span class="obs-aperture">${escHtml(obs.aperture)}</span>` : ''}
                                ${obs.date ? `<span class="obs-date">${escHtml(obs.date)}</span>` : ''}
                            </div>
                            <div class="obs-text">${escHtml(obs.text)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="detail-observations">
                    <h4>Visual Observations</h4>
                    <p style="color:var(--text-muted);font-style:italic;padding:16px 0;">No observations recorded</p>
                </div>
            `;

        detail.innerHTML = `
            <button class="detail-back" id="detail-back-btn">
                ← Back to results
            </button>
            <div class="detail-scroll">
            <div class="detail-header">
                <div class="detail-title-group">
                    <h3>${obj.messierNumber ? escHtml(obj.messierNumber) + ' = ' : ''}${escHtml(obj.name)}</h3>
                    ${obj.nickname ? `<div class="detail-nickname">${escHtml(obj.nickname)}</div>` : ''}
                    ${obj.other ? `<div class="detail-other">${escHtml(obj.other)}</div>` : ''}
                </div>
                <div class="detail-actions">
                    ${obj.type ? `<span class="badge badge-type">${TYPE_KEY[obj.type] || escHtml(obj.type)}</span>` : ''}
                    ${obj.isTopObject ? '<span class="badge badge-top">★ Gottlieb\'s Favorites</span>' : ''}
                    ${obj.isOrionAtlas ? '<span class="badge badge-orion">Orion DeepMap</span>' : ''}
                    ${obj.isMessier ? '<span class="badge badge-messier">Messier</span>' : ''}
                    <a href="${simbadUrl}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding:6px 16px;font-size:0.85rem;">
                        SIMBAD ↗
                    </a>
                </div>
            </div>

            <div class="aladin-wrapper" id="aladin-wrapper">
                <div id="aladin-lite-div"></div>
                <div class="aladin-survey-label" id="aladin-survey-label"></div>
            </div>

            <div class="detail-grid">
                ${detailField('Right Ascension', obj.ra)}
                ${detailField('Declination', obj.dec)}
                ${detailField('Size', obj.size)}
                ${detailField('Position Angle', obj.pa)}
                ${detailField('Visual Mag', obj.vmag)}
                ${detailField('Blue Mag', obj.bmag)}
                ${detailField('Surface Brightness', obj.sb)}
                ${detailField('Constellation', obj.con ? (CON_NAMES[obj.con] || obj.con) : '')}
                ${detailField('Classification', obj.class)}
                ${detailField('Discovery Date', obj.discoveryDate)}
                ${detailField('Catalog', obj.catalog)}
            </div>

            ${displayNgcDesc ? `
                <div class="detail-ngc-desc">
                    <h4>NGC/IC Description</h4>
                    <p>${escHtml(displayNgcDesc)}</p>
                </div>
            ` : ''}

            ${obsSection}

            ${obj.showHistorical && obj.historical ? `
                <div class="detail-historical">
                    <h4>Historical Background</h4>
                    <div class="historical-text">${obj.historical.split(/\n\n+/).map(p => '<p>' + escHtml(p.trim()) + '</p>').join('')}</div>
                </div>
            ` : ''}
            </div>
        `;

        // Attach event listeners (no inline onclick)
        const backBtn = detail.querySelector('#detail-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => closeDetailPanel());
        }

        // Open the slide-over panel
        detail.setAttribute('role', 'dialog');
        detail.setAttribute('aria-modal', 'true');
        detail.setAttribute('aria-label', obj.name + ' detail');
        detail.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
        detail.scrollTop = 0;
        if (window.innerWidth < 900) document.body.style.overflow = 'hidden';

        // Initialize Aladin Lite viewer for this object
        initAladinViewer(obj);

    }

    function closeDetailPanel(updateUrl) {
        if (updateUrl === undefined) updateUrl = true;
        const detail = $('#object-detail');
        const backdrop = $('#detail-backdrop');
        detail.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        document.body.style.overflow = '';
        if (updateUrl && window.location.hash.startsWith('#object/')) {
            history.replaceState(null, '', window.location.pathname + window.location.search + '#explorer');
        }
    }

    // --- Aladin Lite Sky Atlas viewer ---
    let aladinInstance = null;

    function parseRA(ra) {
        // "05 35 17.1" -> degrees
        if (!ra) return null;
        const parts = ra.trim().split(/\s+/);
        if (parts.length < 2) return null;
        const h = parseFloat(parts[0]);
        const m = parseFloat(parts[1]);
        const s = parts.length > 2 ? parseFloat(parts[2]) : 0;
        return (h + m / 60 + s / 3600) * 15; // hours to degrees
    }

    function parseDec(dec) {
        // "+41 16 08" or "-05 23 27" -> degrees
        if (!dec) return null;
        const str = dec.trim();
        const sign = str.startsWith('-') ? -1 : 1;
        const parts = str.replace(/^[+-]/, '').trim().split(/\s+/);
        if (parts.length < 2) return null;
        const d = parseFloat(parts[0]);
        const m = parseFloat(parts[1]);
        const s = parts.length > 2 ? parseFloat(parts[2]) : 0;
        return sign * (d + m / 60 + s / 3600);
    }

    function initAladinViewer(obj) {
        const container = document.getElementById('aladin-lite-div');
        const label = document.getElementById('aladin-survey-label');
        if (!container) return;

        const raDeg = parseRA(obj.ra);
        const decDeg = parseDec(obj.dec);
        if (raDeg === null || decDeg === null) {
            container.parentElement.style.display = 'none';
            return;
        }
        container.parentElement.style.display = '';

        // Use DSS Colored survey for all objects (full sky coverage)
        const surveyId = 'P/DSS2/color';
        const surveyName = 'DSS Colored';

        // Wait for Aladin Lite WASM to initialize
        if (typeof A === 'undefined' || !A.init) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Loading sky atlas…</p>';
            return;
        }

        A.init.then(() => {
            container.innerHTML = '';
            aladinInstance = null;

            aladinInstance = A.aladin('#aladin-lite-div', {
                target: raDeg.toFixed(6) + ' ' + decDeg.toFixed(6),
                fov: 0.25,
                survey: surveyId,
                cooFrame: 'ICRS',
                showReticle: true,
                showZoomControl: true,
                showFullscreenControl: true,
                showLayersControl: true,
                showGotoControl: false,
                showShareControl: false,
                showSimbadPointerControl: false,
                showProjectionControl: false,
                showCooGridControl: false,
                showFrame: true,
                projection: 'SIN',
            });

            if (label) label.textContent = surveyName;
        });
    }

    // Backdrop click closes detail panel
    (function setupBackdrop() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'detail-backdrop') {
                closeDetailPanel();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && $('#object-detail').classList.contains('open')) {
                closeDetailPanel();
            }
        });
    })();

    // --- URL Hash Routing ---
    function handleHashNavigation() {
        const hash = window.location.hash;
        if (hash.startsWith('#object/')) {
            let name;
            try {
                name = decodeURIComponent(hash.substring(8));
            } catch (e) {
                return; // malformed percent-encoded sequence
            }
            if (dataIndex.has(name)) {
                selectObject(name, false);
            }
        } else {
            closeDetailPanel(false);
        }
    }

    window.addEventListener('popstate', () => handleHashNavigation());
    window.addEventListener('hashchange', () => {
        // Close detail panel when navigating to a non-object hash (e.g., nav link clicks)
        if (!window.location.hash.startsWith('#object/') && $('#object-detail').classList.contains('open')) {
            closeDetailPanel(false);
        }
    });

    function detailField(label, value) {
        if (value === null || value === undefined || value === '') return `<div class="detail-field"><span class="field-label">${label}</span><span class="field-value empty">—</span></div>`;
        return `<div class="detail-field"><span class="field-label">${label}</span><span class="field-value">${escHtml(value)}</span></div>`;
    }

    // --- Blog / Observing Reports ---
    function parseBlogDate(dateStr) {
        // Parse varied date formats into a sortable timestamp
        // "August 18, 2023", "Jul 20, 2008", "June 12-16, 2020", "Feb 13/15, 2018", "Jul 2008"
        if (!dateStr) return 0;
        const s = dateStr.replace(/(\d+)[-\/]\d+/, '$1'); // "12-16" → "12", "13/15" → "13"
        const d = new Date(s);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    function extractYear(dateStr) {
        const m = dateStr && dateStr.match(/\b((?:19|20)\d{2})\b/);
        return m ? m[1] : 'Unknown';
    }

    function renderBlog() {
        const grid = $('#blog-grid');
        if (!grid) return;

        // Sort by date descending (most recent first)
        const sorted = [...blogFiltered].sort((a, b) => parseBlogDate(b.date) - parseBlogDate(a.date));

        const toShow = sorted.slice(0, blogDisplayed + BLOG_PAGE);
        blogDisplayed = toShow.length;

        // Group by year
        const groups = [];
        let currentYear = null;
        for (const b of toShow) {
            const yr = extractYear(b.date);
            if (yr !== currentYear) {
                groups.push({ year: yr, items: [] });
                currentYear = yr;
            }
            groups[groups.length - 1].items.push(b);
        }

        // Strip year from displayed date for compactness (year is in heading)
        const shortDate = (d, yr) => d ? d.replace(/,?\s*\b\d{4}\b/, '').replace(/\s+/g, ' ').trim() : '';

        grid.innerHTML = groups.map(g => `
            <div class="blog-year-group">
                <h3 class="blog-year-heading">${escHtml(g.year)}</h3>
                ${g.items.map(b => `
                    <a href="blog/${escAttr(b.filename)}" class="blog-card">
                        <span class="blog-card-date">${escHtml(shortDate(b.date, g.year))}</span>
                        <span class="blog-card-title">${escHtml(b.title)}</span>
                        ${b.images ? `<span class="blog-card-images">📷 ${b.images}</span>` : ''}
                    </a>
                `).join('')}
            </div>
        `).join('');

        // Report count
        const countEl = $('#blog-report-count');
        if (countEl) countEl.textContent = `${blogFiltered.length} report${blogFiltered.length !== 1 ? 's' : ''}`;

        const btn = $('#blog-load-more-container');
        if (btn) btn.style.display = blogDisplayed < blogFiltered.length ? '' : 'none';
    }

    function setupBlogSearch() {
        const input = $('#blog-search');
        const loadMoreBtn = $('#blog-load-more');
        if (!input) return;

        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            blogFiltered = q ? blogData.filter(b =>
                b.title.toLowerCase().includes(q) ||
                b.date.toLowerCase().includes(q) ||
                (b.objects && b.objects.toLowerCase().includes(q))
            ) : blogData;
            blogDisplayed = 0;
            renderBlog();
        });

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => renderBlog());
        }
    }

    // --- Articles ---
    function renderArticles() {
        const list = $('#articles-list');
        if (!list || !articles.length) return;

        // PDF mapping for articles with downloadable PDFs
        const articlePdfs = {
            24: 'articles/digging-deep-in-messier-83.pdf',
            25: 'articles/seeking-interacting-galaxies.pdf',
            30: 'articles/galaxies-in-collision.pdf',
            39: 'articles/lets-get-together.pdf',
            42: 'articles/david-todds-deep-sky-discoveries.pdf',
            43: 'articles/shakhbazian-galaxy-groups.pdf'
        };

        list.innerHTML = articles.map(a => `
            <div class="article-item">
                <span class="article-num">#${escHtml(a.num)}</span>
                <div class="article-info">
                    <h4>${escHtml(a.title)}</h4>
                    <span class="article-meta">${escHtml(a.magazine)} · ${escHtml(a.month)} ${escHtml(a.year)}</span>
                </div>
                <div class="article-actions">
                    ${a.url ? `<a href="${escAttr(a.url)}" target="_blank" rel="noopener" class="article-link">${escHtml(a.urlNote || 'View')} ↗</a>` : ''}
                    ${articlePdfs[a.num] ? `<a href="${escAttr(articlePdfs[a.num])}" target="_blank" rel="noopener" class="article-link article-pdf-link">Read article ↗</a>` : ''}
                </div>
            </div>
        `).join('');
    }

    // --- Utilities ---
    const _escDiv = document.createElement('div');
    function escHtml(str) {
        if (str === null || str === undefined || str === '') return '';
        _escDiv.textContent = String(str);
        return _escDiv.innerHTML;
    }

    function escAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // --- Start ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
