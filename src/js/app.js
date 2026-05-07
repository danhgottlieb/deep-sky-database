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

    let selectedAperture = 'all';

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
            initResources();
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
            const m = obj.other.match(/HCG\s*\d+[A-Za-z]?/);
            if (m) return m[0];
        }
        return null;
    }

    // Extract Abell designation from an object (from name or 'other' field)
    function getAbellDesignation(obj) {
        if (/^Abell\s+\d+/.test(obj.name)) return obj.name;
        if (obj.other) {
            const m = obj.other.match(/Abell\s+\d+/);
            if (m) return m[0];
        }
        return null;
    }

    // Extract KTG designation from an object (from name or 'other' field)
    function getKtgDesignation(obj) {
        if (/^KTG\s+\d+/.test(obj.name)) return obj.name;
        if (obj.other) {
            const m = obj.other.match(/KTG\s+\d+[A-Za-z]?/);
            if (m) return m[0];
        }
        return null;
    }

    // Parse size field to arcminutes for filtering
    function parseSizeArcmin(sizeStr) {
        if (!sizeStr || !sizeStr.trim()) return 0;
        const s = sizeStr.trim();
        // Arcminutes: "2.1'x1.8'" or "5'" — use first (major axis)
        const amMatch = s.match(/(\d+\.?\d*)'/);
        if (amMatch) return parseFloat(amMatch[1]);
        // Arcseconds: "38"" or "150"" or "3.9"/67"" — use first value
        const asMatch = s.match(/(\d+\.?\d*)"/);
        if (asMatch) {
            const arcsec = parseFloat(asMatch[1]);
            const arcmin = arcsec / 60;
            return arcmin < 0.1 ? 0 : arcmin;  // < 6" treated as 0'
        }
        return 0;
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

        const catalogGroups = [
            { label: 'GENERAL', items: ['Messier', 'NGC', 'IC', 'Orion DeepMap', "Gottlieb's Favorites"] },
            { label: 'SPECIALIZED', items: ['Abell planetary nebulae', 'Galaxy Trios (KTG)', 'Hickson Compact Groups (HCG)', 'Uppsala Galaxy Catalog (UGC)'] }
        ];
        const allCatalogs = catalogGroups.flatMap(g => g.items);

        function renderDropdown(filter) {
            filter = filter || '';
            let html = '';
            catalogGroups.forEach(group => {
                const filtered = group.items.filter(c =>
                    !filter || c.toLowerCase().includes(filter)
                );
                if (filtered.length === 0) return;
                html += `<div class="catalog-group-header">${group.label}</div>`;
                filtered.forEach(c => {
                    const isSelected = selectedCatalogs.includes(c);
                    html += `<div class="multi-select-option${isSelected ? ' selected' : ''}" data-value="${c}">${c}</div>`;
                });
            });
            dropdown.innerHTML = html;

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
            const raw = input.value.trim();
            if (raw.length < 1) {
                sugBox.innerHTML = '';
                return;
            }
            searchTimer = setTimeout(() => showSuggestions(raw, sugBox), 150);
        });

        input.addEventListener('keydown', (e) => {
            const items = sugBox.querySelectorAll('.suggestion-item[data-name]');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
                highlightSuggestion(items);
                if (items[suggestionIndex]) items[suggestionIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                suggestionIndex = Math.max(suggestionIndex - 1, -1);
                highlightSuggestion(items);
                if (suggestionIndex >= 0 && items[suggestionIndex]) items[suggestionIndex].scrollIntoView({ block: 'nearest' });
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
        const addedNames = new Set();

        // If the query is a Messier number, find that object first
        const messierKey = parseMessierQuery(q);
        if (messierKey) {
            const messierObj = allData.find(o => o.messierNumber === messierKey);
            if (messierObj) {
                matches.push({ obj: messierObj, matchedAlt: '', messierFirst: true });
                addedNames.add(messierObj.name);
            }
        }

        // Exact match by primary name (highest priority after Messier)
        const spaced = q.replace(/^(ngc|ic|ugc|m|abell|arp|hickson|sh|vv|mcg|pgc|leda)(\d)/, '$1 $2');
        for (const obj of allData) {
            if (addedNames.has(obj.name)) continue;
            const name = obj.name.toLowerCase();
            if (name === q || name === spaced) {
                matches.push({ obj, matchedAlt: '' });
                addedNames.add(obj.name);
                break;
            }
        }

        // Exact match by alternate name
        for (const obj of allData) {
            if (addedNames.has(obj.name)) continue;
            if (obj.other) {
                const alts = obj.other.split(/\s*=\s*/);
                for (const alt of alts) {
                    const altNorm = alt.trim().toLowerCase();
                    if (altNorm === q || altNorm === spaced) {
                        matches.push({ obj, matchedAlt: alt.trim() });
                        addedNames.add(obj.name);
                        break;
                    }
                }
            }
            if (addedNames.size > 0 && addedNames.has(obj.name)) break;
        }

        // Partial matches (fill up to 10 total)
        for (const obj of allData) {
            if (matches.length >= 10) break;
            if (addedNames.has(obj.name)) continue;
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
            addedNames.add(obj.name);
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

    // Name Contains match: if query ends with a digit, the character following
    // the matched substring must NOT be a digit (prevents "NGC 72" matching "NGC 720")
    function nameContainsMatch(haystack, needle) {
        if (!needle) return false;
        const endsWithDigit = /\d$/.test(needle);
        if (!endsWithDigit) return haystack.includes(needle);
        // Use regex: needle followed by non-digit or end of string
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped + '(?!\\d)');
        return re.test(haystack);
    }

    // Parse aperture string to inches (returns null if unrecognizable)
    function parseApertureInches(apertureStr) {
        if (!apertureStr) return null;
        const s = apertureStr.trim();
        if (/^naked-eye$/i.test(s)) return 0;
        // Match inches: "24\"", "17.5\"", "6\"", etc.
        const inchMatch = s.match(/^(\d+\.?\d*)\s*"/);
        if (inchMatch) return parseFloat(inchMatch[1]);
        // Match binoculars/finders: "16x80mm", "15x50mm IS binoculars", "13x80mm finder"
        const binoMatch = s.match(/(\d+)\s*x\s*(\d+)\s*mm/i);
        if (binoMatch) return parseFloat(binoMatch[2]) / 25.4;
        // Match standalone mm: "50mm", "80mm", "30mm"
        const mmMatch = s.match(/^(\d+)\s*mm/);
        if (mmMatch) return parseFloat(mmMatch[1]) / 25.4;
        // NV, etc. — not a recognizable aperture
        return null;
    }

    // Check if an object has any observation matching the selected aperture range
    function objectMatchesAperture(obj, range) {
        if (range === 'all') return true;
        if (!obj.observations || obj.observations.length === 0) return false;
        return obj.observations.some(obs => {
            let inches = parseApertureInches(obs.aperture);
            // If aperture field is empty, try parsing from start of text
            if (inches === null && obs.text) {
                const t = obs.text.trim();
                if (/^Naked-eye/i.test(t)) inches = 0;
                else {
                    const textInch = t.match(/^(\d+\.?\d*)\s*["″]/);
                    if (textInch) inches = parseFloat(textInch[1]);
                    else {
                        const textBino = t.match(/^(\d+)\s*x\s*(\d+)/);
                        if (textBino) inches = parseFloat(textBino[2]) / 25.4;
                    }
                }
            }
            if (inches === null) return false;
            switch (range) {
                case '9-': return inches <= 9;
                case '10-16': return inches >= 10 && inches <= 16;
                case '17-24': return inches >= 17 && inches <= 24;
                case '25+': return inches >= 25;
                default: return true;
            }
        });
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

        // Check alternate designations for exact match (e.g., "Arp 1" in the "other" field)
        const altQueries = [q];
        if (spaced !== q) altQueries.push(spaced);
        const altExact = allData.find(o => {
            const other = (o.other || '').toLowerCase();
            const parts = other.split(/\s*=\s*/);
            return altQueries.some(aq => parts.some(part => part.trim() === aq));
        });
        if (altExact) {
            selectObject(altExact.name);
            return;
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

        // Custom aperture dropdown
        setupApertureSelect();

        // Magnitude default of 13.0 when using spinner
        setupMagDefaults();

        // Print menu
        setupPrintMenu();
    }

    // When magnitude inputs are empty and user clicks up/down arrows,
    // start from 13.0 instead of 0.0
    function setupMagDefaults() {
        ['filter-mag-min', 'filter-mag-max'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            let prevValue = '';
            el.addEventListener('input', () => {
                if (prevValue === '' && el.value !== '') {
                    const v = parseFloat(el.value);
                    if (!isNaN(v) && Math.abs(v) < 1) {
                        el.value = (13.0 + v).toFixed(1);
                    }
                }
                prevValue = el.value;
            });
        });
    }

    function setupApertureSelect() {
        const container = $('#filter-aperture-container');
        const trigger = $('#filter-aperture-trigger');
        const dropdown = $('#aperture-dropdown');
        if (!container || !trigger || !dropdown) return;

        trigger.addEventListener('click', () => {
            const isOpen = dropdown.classList.contains('open');
            closeAllDropdowns();
            if (!isOpen) {
                dropdown.classList.add('open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!dropdown.classList.contains('open')) {
                    dropdown.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');
                }
                const opts = [...dropdown.querySelectorAll('.custom-select-option')];
                const curIdx = opts.findIndex(o => o.classList.contains('selected'));
                const nextIdx = e.key === 'ArrowDown'
                    ? Math.min(curIdx + 1, opts.length - 1)
                    : Math.max(curIdx - 1, 0);
                selectApertureOption(opts[nextIdx]);
            }
        });

        dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
            opt.addEventListener('click', () => {
                selectApertureOption(opt);
                dropdown.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
            });
        });

        function selectApertureOption(opt) {
            dropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            container.setAttribute('data-value', opt.dataset.value);
            trigger.querySelector('.custom-select-label').textContent = opt.textContent;
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdown.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.custom-select-dropdown.open').forEach(d => d.classList.remove('open'));
        document.querySelectorAll('.custom-select-trigger').forEach(t => t.setAttribute('aria-expanded', 'false'));
        const printMenu = $('#print-menu');
        if (printMenu) printMenu.classList.remove('open');
    }

    function setupPrintMenu() {
        const btn = $('#print-btn');
        const menu = $('#print-menu');
        if (!btn || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('open');
            closeAllDropdowns();
            if (!isOpen) menu.classList.add('open');
        });

        menu.querySelectorAll('.print-menu-option').forEach(opt => {
            opt.addEventListener('click', () => {
                menu.classList.remove('open');
                printResults(opt.dataset.mode);
            });
        });

        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('open');
            }
        });
    }

    function printResults(mode) {
        const includeNotes = mode === 'notes';
        let rows = '';
        filteredData.forEach(obj => {
            let obsHtml = '';
            if (includeNotes && obj.observations && obj.observations.length > 0) {
                const realObs = obj.observations.filter(o => !(o.text && o.text.startsWith('=')));
                obsHtml = '<div class="obs-section"><strong>Visual Observations (' + realObs.length + ')</strong>' +
                    realObs.map(o =>
                        '<div class="obs-entry">' +
                        (o.aperture ? '<span class="obs-ap">' + escHtml(o.aperture) + '</span>' : '') +
                        (o.date ? ' <span class="obs-dt">' + escHtml(o.date) + '</span>' : '') +
                        '<div>' + escHtml(o.text) + '</div></div>'
                    ).join('') + '</div>';
            }

            // Collection prefix for Abell/KTG/HCG
            let collPrefix = '';
            if (activeCollection === 'hcg') { const d = getHcgDesignation(obj); if (d && d !== obj.name) collPrefix = escHtml(d) + ' = '; }
            else if (activeCollection === 'abell') { const d = getAbellDesignation(obj); if (d && d !== obj.name) collPrefix = escHtml(d) + ' = '; }
            else if (activeCollection === 'ktg') { const d = getKtgDesignation(obj); if (d && d !== obj.name) collPrefix = escHtml(d) + ' = '; }

            rows += '<div class="obj-card">' +
                '<div class="obj-header">' +
                '<strong>' + (obj.messierNumber ? escHtml(obj.messierNumber) + ' = ' : '') + collPrefix + escHtml(obj.name) + '</strong>' +
                (obj.nickname ? ' &mdash; ' + escHtml(obj.nickname) : '') +
                (obj.other ? ' <span class="aliases">(Also: ' + escHtml(obj.other) + ')</span>' : '') +
                '</div>' +
                '<div class="obj-meta">' +
                (obj.type ? '<span><b>Type:</b> ' + escHtml(obj.type) + '</span>' : '') +
                (obj.con ? '<span><b>Con:</b> ' + escHtml(obj.con) + '</span>' : '') +
                (obj.vmag ? '<span><b>Mag:</b> ' + escHtml(obj.vmag) + '</span>' : '') +
                (obj.size ? '<span><b>Size:</b> ' + escHtml(obj.size) + '</span>' : '') +
                (obj.ra ? '<span><b>RA:</b> ' + escHtml(obj.ra) + '</span>' : '') +
                (obj.dec ? '<span><b>Dec:</b> ' + escHtml(obj.dec) + '</span>' : '') +
                '</div>' +
                obsHtml +
                '</div>';
        });

        const printHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<title>Deep Sky Objects — ' + (includeNotes ? 'List with Notes' : 'Basic List') + '</title>' +
            '<style>' +
            'body{font-family:Georgia,serif;color:#000;margin:24px;font-size:11pt;line-height:1.5;}' +
            'h1{font-size:16pt;margin-bottom:4px;}' +
            '.subtitle{color:#555;font-size:10pt;margin-bottom:20px;}' +
            '.obj-card{padding:6px 0;margin-bottom:2px;border-bottom:1px solid #ddd;}' +
            '.obj-header{font-size:12pt;margin-bottom:2px;}' +
            '.aliases{color:#666;font-size:10pt;}' +
            '.obj-meta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:10pt;color:#333;}' +
            '.obs-section{margin-top:6px;border-top:1px solid #eee;padding-top:4px;font-size:10pt;}' +
            '.obs-entry{margin:4px 0 4px 12px;}' +
            '.obs-ap{font-weight:bold;}' +
            '.obs-dt{color:#666;}' +
            '@media print{body{margin:12px;}}' +
            '</style></head><body>' +
            '<h1>Steve Gottlieb\'s Deep Sky Objects</h1>' +
            '<div class="subtitle">' + filteredData.length.toLocaleString() + ' objects &mdash; ' +
            (includeNotes ? 'List with notes' : 'Basic list') +
            ' &mdash; Printed ' + new Date().toLocaleDateString() + '</div>' +
            rows +
            '</body></html>';

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(printHtml);
            w.document.close();
            w.addEventListener('load', () => w.print());
        }
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
                    (selectedCatalogs.includes("Gottlieb's Favorites") && o.isTopObject) ||
                    (selectedCatalogs.includes('Hickson Compact Groups (HCG)') && getHcgDesignation(o)) ||
                    (selectedCatalogs.includes('Uppsala Galaxy Catalog (UGC)') && o.catalog === 'UGC') ||
                    (selectedCatalogs.includes('Abell planetary nebulae') && getAbellDesignation(o) && o.type !== 'GX' && o.type !== 'NF') ||
                    (selectedCatalogs.includes('Galaxy Trios (KTG)') && getKtgDesignation(o) && o.type === 'GX');
                if (!matchesCatalog) return false;
            }
            if (selectedConstellations.length > 0 && !selectedConstellations.includes(o.con)) return false;
            if (selectedTypes.length > 0 && !selectedTypes.includes(o.type)) return false;
            if (allNameFilters.length > 0) {
                const n = o.name.toLowerCase();
                const nick = (o.nickname || '').toLowerCase();
                const other = (o.other || '').toLowerCase();
                const matchesAny = allNameFilters.some(nf => nameContainsMatch(n, nf) || nameContainsMatch(nick, nf) || nameContainsMatch(other, nf));
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

        // Size filter (arcminutes)
        const sizeMinEl = $('#filter-size-min');
        const sizeMaxEl = $('#filter-size-max');
        const sizeMin = sizeMinEl ? parseFloat(sizeMinEl.value) : NaN;
        const sizeMax = sizeMaxEl ? parseFloat(sizeMaxEl.value) : NaN;
        if (!isNaN(sizeMin) || !isNaN(sizeMax)) {
            filteredData = filteredData.filter(o => {
                const sz = parseSizeArcmin(o.size);
                if (!isNaN(sizeMin) && sz < sizeMin) return false;
                if (!isNaN(sizeMax) && sz > sizeMax) return false;
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

        // Aperture filter
        const apertureContainer = $('#filter-aperture-container');
        selectedAperture = apertureContainer ? apertureContainer.getAttribute('data-value') : 'all';
        if (selectedAperture !== 'all') {
            filteredData = filteredData.filter(o => objectMatchesAperture(o, selectedAperture));
        }

        // Declination filter
        const decMin = parseFloat($('#filter-dec-min').value);
        const decMax = parseFloat($('#filter-dec-max').value);
        if (!isNaN(decMin) || !isNaN(decMax)) {
            filteredData = filteredData.filter(o => {
                const decDeg = parseDec(o.dec);
                if (decDeg === null) return false;
                if (!isNaN(decMin) && decDeg < decMin) return false;
                if (!isNaN(decMax) && decDeg > decMax) return false;
                return true;
            });
        }

        // Set active collection for sorting by catalog-specific designations
        if (selectedCatalogs.length === 1 && selectedCatalogs[0] === 'Hickson Compact Groups (HCG)') {
            activeCollection = 'hcg';
        } else if (selectedCatalogs.length === 1 && selectedCatalogs[0] === 'Messier') {
            activeCollection = 'messier';
        } else if (selectedCatalogs.length === 1 && selectedCatalogs[0] === 'Abell planetary nebulae') {
            activeCollection = 'abell';
        } else if (selectedCatalogs.length === 1 && selectedCatalogs[0] === 'Galaxy Trios (KTG)') {
            activeCollection = 'ktg';
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
        const sizeMinEl = $('#filter-size-min');
        const sizeMaxEl = $('#filter-size-max');
        if (sizeMinEl) sizeMinEl.value = '';
        if (sizeMaxEl) sizeMaxEl.value = '';
        $('#filter-ra-min-h').value = '';
        $('#filter-ra-min-m').value = '';
        $('#filter-ra-max-h').value = '';
        $('#filter-ra-max-m').value = '';
        $('#filter-name').value = '';
        const apertureContainer = $('#filter-aperture-container');
        if (apertureContainer) {
            apertureContainer.setAttribute('data-value', 'all');
            const trigger = $('#filter-aperture-trigger');
            if (trigger) trigger.querySelector('.custom-select-label').textContent = 'All';
            const dropdown = $('#aperture-dropdown');
            if (dropdown) {
                dropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
                const allOpt = dropdown.querySelector('[data-value="all"]');
                if (allOpt) allOpt.classList.add('selected');
            }
        }
        selectedAperture = 'all';
        $('#filter-dec-min').value = '';
        $('#filter-dec-max').value = '';
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
                    if (activeCollection === 'abell') {
                        const aA = getAbellDesignation(a) || '';
                        const aB = getAbellDesignation(b) || '';
                        return naturalSort(aA, aB);
                    }
                    if (activeCollection === 'ktg') {
                        const kA = getKtgDesignation(a) || '';
                        const kB = getKtgDesignation(b) || '';
                        return naturalSort(kA, kB);
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

        // HCG / Abell / KTG designation prefix (similar to Messier)
        const hcgDesig = (activeCollection === 'hcg') ? getHcgDesignation(obj) : null;
        const abellDesig = (activeCollection === 'abell') ? getAbellDesignation(obj) : null;
        const ktgDesig = (activeCollection === 'ktg') ? getKtgDesignation(obj) : null;
        let collectionPrefix = '';
        if (hcgDesig && hcgDesig !== obj.name) collectionPrefix = escHtml(hcgDesig) + ' = ';
        else if (abellDesig && abellDesig !== obj.name) collectionPrefix = escHtml(abellDesig) + ' = ';
        else if (ktgDesig && ktgDesig !== obj.name) collectionPrefix = escHtml(ktgDesig) + ' = ';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-name">${obj.messierNumber ? escHtml(obj.messierNumber) + ' = ' : ''}${collectionPrefix}${escHtml(obj.name)}</div>
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
                    <h3>${obj.messierNumber ? escHtml(obj.messierNumber) + ' = ' : ''}${(() => { const hd = (activeCollection === 'hcg') ? getHcgDesignation(obj) : null; const ad = (activeCollection === 'abell') ? getAbellDesignation(obj) : null; const kd = (activeCollection === 'ktg') ? getKtgDesignation(obj) : null; const d = hd || ad || kd; return (d && d !== obj.name) ? escHtml(d) + ' = ' : ''; })()}${escHtml(obj.name)}</h3>
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

            ${(() => {
                const isNgcIcPlain = /^(NGC|IC) \d+$/.test(obj.name);
                return (isNgcIcPlain && displayNgcDesc) ? `
                <div class="detail-ngc-desc">
                    <h4>NGC/IC Description</h4>
                    <p>${escHtml(displayNgcDesc)}</p>
                </div>
            ` : '';
            })()}

            ${obsSection}

            ${obj.showHistorical && obj.historical ? `
                <div class="detail-historical">
                    <h4>Historical Background</h4>
                    <div class="historical-text">${obj.historical.split(/\n\n+/).map(p => '<p>' + escHtml(p.trim()) + '</p>').join('')}</div>
                </div>
            ` : ''}
            </div>
            <button class="detail-back" id="detail-back-btn-bottom">
                ← Back to results
            </button>
        `;

        // Attach event listeners (no inline onclick)
        const backBtn = detail.querySelector('#detail-back-btn');
        const backBtnBottom = detail.querySelector('#detail-back-btn-bottom');
        const handleBack = () => {
            closeDetailPanel();
        };
        if (backBtn) backBtn.addEventListener('click', handleBack);
        if (backBtnBottom) backBtnBottom.addEventListener('click', handleBack);

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
            43: 'articles/shakhbazian-galaxy-groups.pdf',
            4: 'articles/abell-2065-corona-borealis.pdf',
            3: 'articles/abell-4038-sculptor.pdf',
            5: 'articles/obscure-summer-globular-clusters.pdf',
            6: 'articles/pisces-perseus-supercluster.pdf',
            7: 'articles/hydra-centaurus-supercluster.pdf',
            9: 'articles/restoring-order-deep-sky.pdf',
            16: 'articles/blazar-blazar-burning-bright.pdf'
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

    // --- Resource Links ---
    const RESOURCE_ENTRIES = [
      // STARS ====================================================================
      { name: "AAVSO Light Curve Generator", url: "https://www.aavso.org/LCGv2/",
        summary: "Web tool plotting variable-star light curves from the AAVSO International Database.",
        subject: ["stars"], type: ["tool"] },
      { name: "Carbon Stars (John Barentine)", url: "https://www.johncbarentine.com/carbon-star-list.html",
        summary: "List of the 142 brightest carbon stars across both hemispheres with observing notes.",
        subject: ["stars"], type: ["guide"] },
      { name: "Jim Kaler's Stars", url: "http://stars.astro.illinois.edu/sow/sowlist.html",
        summary: "Compendium of nearly 1,000 stars with detailed astrophysical and historical descriptions.",
        subject: ["stars"], type: ["article", "database"] },
      { name: "Latest Supernovae", url: "https://www.rochesterastronomy.org/supernova.html",
        summary: "Continuously updated list of recently discovered supernovae with magnitudes and host galaxies.",
        subject: ["stars", "galaxies"], type: ["database"] },
      { name: "Stelle Doppie Double Star Database", url: "https://www.stelledoppie.it/",
        summary: "Searchable database of 157,000+ WDS double stars merged with Hipparcos, Tycho, and Gaia data.",
        subject: ["stars"], type: ["database"] },
    
      // GALAXIES, GROUPS & CLUSTERS =============================================
      { name: "32 Best Abell Galaxy Clusters", url: "https://adventuresindeepspace.com/agctable.htm",
        summary: "Curated table of interesting Abell galaxy clusters observable in 17.5-inch and larger telescopes.",
        subject: ["galaxies"], type: ["guide"] },
      { name: "Adam Block Images", url: "https://www.adamblockphotos.com/galaxies.html",
        summary: "Galaxy gallery from award-winning astrophotographer Adam Block, featuring fine processed deep-sky images.",
        subject: ["galaxies"], type: ["images"] },
      { name: "Arp Atlas (NED Level 5)", url: "https://ned.ipac.caltech.edu/level5/Arp/frames.html",
        summary: "Online edition of Arp's 1966 Atlas of Peculiar Galaxies hosted by NED.",
        subject: ["galaxies"], type: ["catalog"] },
      { name: "Arp Atlas of Peculiar Galaxies (ADS)", url: "https://ui.adsabs.harvard.edu/scan/manifest/1966ApJS...14....1A",
        summary: "ADS scan manifest of Arp's 1966 ApJS publication of the peculiar galaxies atlas.",
        subject: ["galaxies"], type: ["historical", "catalog"] },
      { name: "Arp Modern Images (Schoenball)", url: "https://arp.schoenball.de/index_e.htm",
        summary: "Curated 100 best Arp galaxies with amateur observations, drawings, and modern images.",
        subject: ["galaxies"], type: ["images", "notes"] },
      { name: "Atlas of Galaxy Trios (Miles Paul)", url: "https://www.webbdeepsky.com/downloads/free-publications/atlas-of-galaxy-trios.pdf",
        summary: "Miles Paul's PDF atlas covering 137 galaxy trios from -32° to +90° declination.",
        subject: ["galaxies"], type: ["guide"], badges: ["pdf"] },
      { name: "Atlas of Southern Galaxy Trios (Miles Paul)", url: "https://www.webbdeepsky.com/downloads/free-publications/southern-galaxy-trios.pdf",
        summary: "Miles Paul's free Webb Society PDF atlas of 54 compact southern galaxy trios.",
        subject: ["galaxies"], type: ["guide"], region: "southern", badges: ["pdf"] },
      { name: "Barnard's Galaxy (Rick Jakiel)", url: "https://adventuresindeepspace.com/barnard.htm",
        summary: "Observing history and visual notes on Barnard's Galaxy NGC 6822 by Rick Jakiel.",
        subject: ["galaxies"], type: ["notes"] },
      { name: "Chart32 Images", url: "https://www.chart32.de/index.php/galaxies-m",
        summary: "Galaxy images from the Chart32 collaboration using a 32-inch Cassegrain telescope at Cerro Tololo.",
        subject: ["galaxies"], type: ["images"] },
      { name: "Gottlieb's M33 Atlas", url: "https://adventuresindeepspace.com/M33.HII-Star.Clouds.html",
        summary: "Steve Gottlieb's detailed visual observing notes for M33 HII regions and star clouds.",
        subject: ["galaxies"], type: ["notes"] },
      { name: "Hickson CG Guidebook (Huey)", url: "https://faintfuzzies.com/ObservingGuides.html",
        summary: "Alvin Huey's observing guides, including the Hickson Compact Groups guide with charts and sketches.",
        subject: ["galaxies"], type: ["guide"] },
      { name: "Hickson CG Observing Guide (Vogel)", url: "https://www.reinervogel.net/pdf/Hickson.pdf",
        summary: "Reiner Vogel's PDF observing guide selecting interesting Hickson groups for visual amateurs.",
        subject: ["galaxies"], type: ["guide"], badges: ["pdf"] },
      { name: "Howard Banich Galaxy Sketches", url: "https://sites.google.com/site/howardbanichhomepage/observations/observing-notebook-scans/notebook-1",
        summary: "Howard Banich's observing notebook scans containing detailed visual galaxy sketches and notes.",
        subject: ["galaxies"], type: ["sketches"] },
      { name: "Interesting Hickson Compact Groups", url: "https://adventuresindeepspace.com/hicklist.htm",
        summary: "Jim Shields' selection of 32 interesting Hickson compact groups with magnitudes and notes.",
        subject: ["galaxies"], type: ["guide"] },
      { name: "Local Group Galaxies (Atlas of Universe)", url: "http://www.atlasoftheuniverse.com/localgr.html",
        summary: "Map and overview of Local Group galaxies within 5 million light-years.",
        subject: ["galaxies"], type: ["article"] },
      { name: "M33 HII Regions (Labeled Images)", url: "http://www.starkeeper.it/M33_Mapped.htm",
        summary: "Leonardo Orazi astrophotograph of M33 with labeled HII regions, star clouds, and clusters.",
        subject: ["galaxies"], type: ["images"] },
      { name: "Piero Mazza (30,000 galaxies)", url: "https://www.galassiere.it/osservazioni.php",
        summary: "Piero Mazza's Italian site listing his enormous personal galaxy observing log.",
        subject: ["galaxies"], type: ["notes"] },
      { name: "Quasars & Blazars (Frankfurt Quasar Monitoring)", url: "http://quasar.square7.ch/fqm/fqm-home.html",
        summary: "Frankfurt Quasar Monitoring with finder charts, comparison stars, and light curves.",
        subject: ["galaxies"], type: ["guide"] },
      { name: "Ron Buta Galaxy Morphology (NED)", url: "https://ned.ipac.caltech.edu/level5/Sept11/Buta/frames.html",
        summary: "Buta's comprehensive review of galaxy morphology and classification systems hosted on NED.",
        subject: ["galaxies"], type: ["article"] },
      { name: "Siena Galaxy Atlas 2020", url: "https://sga.legacysurvey.org/",
        summary: "Multiwavelength atlas of 383,620 large nearby galaxies derived from the DESI Legacy Surveys.",
        subject: ["galaxies"], type: ["catalog", "tool"] },
      { name: "Superthin Galaxies (Steinicke)", url: "http://klima-luft.de/steinicke/Artikel/sg/sg_e.htm",
        summary: "Wolfgang Steinicke's article on extremely flat edge-on superthin galaxies for amateurs.",
        subject: ["galaxies"], type: ["article"] },
      { name: "Virgo Cluster (SEDS)", url: "http://www.messier.seds.org/more/virgo.html",
        summary: "SEDS overview of the Virgo Cluster covering member Messier galaxies, distance, and history.",
        subject: ["galaxies"], type: ["article"] },
      { name: "VV Catalogue of Interacting Galaxies", url: "https://ned.ipac.caltech.edu/level5/VV_Cat/frames.html",
        summary: "Vorontsov-Velyaminov atlas and catalogue of interacting galaxies hosted on NED Level 5.",
        subject: ["galaxies"], type: ["catalog"] },
    
      // GLOBULAR & OPEN CLUSTERS ================================================
      { name: "Atlas of the Universe — Globulars", url: "http://www.atlasoftheuniverse.com/globular.html",
        summary: "Map and overview of Milky Way globular clusters with distances and basic properties.",
        subject: ["clusters"], type: ["article"] },
      { name: "Dias Open Clusters (VizieR DAML02)", url: "https://vizier.cds.unistra.fr/viz-bin/VizieR-3?-source=B/ocl/clusters",
        summary: "VizieR access to the Dias DAML02 catalogue of optically visible open clusters and candidates.",
        subject: ["clusters"], type: ["catalog", "database"] },
      { name: "Fundamental Parameters of Globulars (Baumgardt)", url: "https://people.smp.uq.edu.au/HolgerBaumgardt/globular/",
        summary: "Baumgardt database of masses, structural parameters, and orbits for 168 Galactic globulars.",
        subject: ["clusters"], type: ["database"] },
      { name: "Gottlieb's M31 Globular Clusters", url: "https://adventuresindeepspace.com/gcm31.htm",
        summary: "Steve Gottlieb's observing notes and finder charts for globular clusters in Andromeda.",
        subject: ["clusters", "galaxies"], type: ["notes"] },
      { name: "Harold Corwin Galactic Globulars", url: "http://www.haroldcorwin.net/globulars/index.html",
        summary: "Corwin's curated list of 158 visually observable Milky Way globulars with photometric data.",
        subject: ["clusters"], type: ["catalog"] },
      { name: "SEDS Milky Way Globular Clusters", url: "http://spider.seds.org/spider/MWGC/mwgc.html",
        summary: "SEDS catalog of 157 Milky Way globular clusters with images and basic data.",
        subject: ["clusters"], type: ["catalog"] },
      { name: "Uwe Glahn's Palomar Globulars", url: "http://www.deepsky-visuell.de/Projekte/PalomarGC_E.htm",
        summary: "Uwe Glahn's visual observations and sketches of 15 challenging Palomar globular clusters.",
        subject: ["clusters"], type: ["sketches", "notes"] },
      { name: "WEBDA Open Cluster Database (Archive)", url: "https://web.archive.org/web/20240301094927/https://webda.physics.muni.cz/ocl_list.html",
        summary: "Wayback Machine snapshot of WEBDA's alphabetical open cluster list page.",
        subject: ["clusters"], type: ["database"], badges: ["archive"] },
      { name: "WEBDA Open Cluster Database (live site)", url: "https://webda.physics.muni.cz/",
        summary: "Live WEBDA database of open and globular cluster observations maintained by Masaryk University.",
        subject: ["clusters"], type: ["database"], badges: ["offline"] },
      { name: "William Harris Milky Way Globulars", url: "https://physics.mcmaster.ca/~harris/mwgc.dat",
        summary: "Harris 1996 (2010 edition) data file of parameters for 157 Milky Way globulars.",
        subject: ["clusters"], type: ["catalog"], badges: ["data"] },
    
      // NEBULAE =================================================================
      { name: "Barnard's Photographic Atlas of Dark Nebulae", url: "https://exhibit-archive.library.gatech.edu/barnard/index.html",
        summary: "Georgia Tech digitized exhibit of E. E. Barnard's 1929 Photographic Atlas of the Milky Way.",
        subject: ["nebulae"], type: ["images", "historical"] },
      { name: "Dissecting the Veil Nebula (Gottlieb)", url: "https://adventuresindeepspace.com/Dissecting%20the%20Veil%20Nebula.html",
        summary: "Steve Gottlieb's detailed visual observing tour of Veil Nebula sections and lesser-known filaments.",
        subject: ["nebulae"], type: ["notes"] },
      { name: "GUM Catalog (Galaxy Map)", url: "http://galaxymap.org/cat/list/gum/1",
        summary: "Browsable list of 97 Gum catalog HII regions with images and coordinate data.",
        subject: ["nebulae"], type: ["catalog"] },
      { name: "RCW Catalog (Galaxy Map)", url: "http://galaxymap.org/cat/list/rcw/1",
        summary: "Browsable list of 182 RCW southern Milky Way star-formation regions with images.",
        subject: ["nebulae"], type: ["catalog"], region: "southern" },
      { name: "Sharpless Catalog (Dean Salman CCD)", url: "http://www.sharplesscatalog.com/Sharpless.aspx",
        summary: "Dean Salman's CCD narrowband image library covering Sharpless catalog HII regions.",
        subject: ["nebulae"], type: ["images"] },
      { name: "Sharpless Catalog (Galaxy Map)", url: "http://galaxymap.org/cat/list/sharpless/1",
        summary: "Browsable Sharpless catalog with DSS/SuperCOSMOS images and descriptions for all 313 objects.",
        subject: ["nebulae"], type: ["catalog"] },
      { name: "Sharpless Observing Guide (Vogel)", url: "https://www.reinervogel.net/pdf/Sharpless.pdf",
        summary: "Reiner Vogel's PDF visual observing atlas covering 305 of the 313 Sharpless nebulae.",
        subject: ["nebulae"], type: ["guide"], badges: ["pdf"] },
      { name: "Wolf-Rayet Nebulae (Vogel)", url: "https://www.reinervogel.net/pdf/WR_shells.pdf",
        summary: "Reiner Vogel's 2012 visual observing guide to Wolf-Rayet ring nebulae and shells.",
        subject: ["nebulae"], type: ["guide"], badges: ["pdf"] },
    
      // PLANETARY NEBULAE =======================================================
      { name: "Abell PN (Eric Honeycutt)", url: "https://www.stathis-firstlight.de/deepsky/abell_honeycutt.htm",
        summary: "Eric Honeycutt's visual observation notes on Abell planetary nebulae using a 22-inch reflector.",
        subject: ["pne"], type: ["notes"] },
      { name: "Abell PN (Uwe Glahn)", url: "http://www.deepsky-visuell.de/Projekte/AbellPN_E.htm",
        summary: "Uwe Glahn's English-language visual observing project with sketches of Abell planetary nebulae.",
        subject: ["pne"], type: ["sketches", "notes"] },
      { name: "Abell PN Excel Spreadsheet", url: "https://adventuresindeepspace.com/Abell.PN.xls",
        summary: "Downloadable Excel file with positions, magnitudes, sizes, and distances for Abell planetary nebulae.",
        subject: ["pne"], type: ["catalog"], badges: ["xls"] },
      { name: "Abell PN Observing Guide (Vogel)", url: "https://www.reinervogel.net/pdf/Abell_PN.pdf",
        summary: "Reiner Vogel's PDF observing guide to Abell planetary nebulae using large Dobsonian telescopes.",
        subject: ["pne"], type: ["guide"], badges: ["pdf"] },
      { name: "Atlas of the Universe — PNe", url: "http://www.atlasoftheuniverse.com/plannebs.html",
        summary: "Reference table of planetary nebulae listing coordinates, magnitudes, sizes, and distance estimates.",
        subject: ["pne"], type: ["catalog"] },
      { name: "HASH PN Database", url: "http://202.189.117.101:8999/gpne/index.php",
        summary: "Hong Kong / AAO / Strasbourg multiwavelength database of 10,000+ Galactic planetary nebula candidates.",
        subject: ["pne"], type: ["database"], badges: ["registration"] },
      { name: "Neat Southern Planetaries (Andrew James)", url: "https://web.archive.org/web/20110520081623/http://blackskies.org/pnweek00.htm",
        summary: "Wayback snapshot of Andrew James's southern planetary nebulae weekly observing guide.",
        subject: ["pne"], type: ["guide"], region: "southern", badges: ["archive"] },
      { name: "PN Spectra and Images (Williams)", url: "https://web.williams.edu/Astronomy/research/PN/nebulae/",
        summary: "Kwitter and Henry's gallery of moderate-resolution spectra and images for 175+ planetary nebulae.",
        subject: ["pne"], type: ["images"] },
      { name: "Planetary Nebulae Haloes (Uwe Glahn)", url: "http://www.deepsky-visuell.de/Projekte/Halo.htm",
        summary: "Uwe Glahn's visual observing project documenting faint extended haloes around bright planetary nebulae.",
        subject: ["pne"], type: ["sketches", "notes"] },
      { name: "Pre-Planetary Nebulae (Uwe Glahn)", url: "http://www.deepsky-visuell.de/Projekte/PPN.htm",
        summary: "Uwe Glahn's visual observing project on protoplanetary nebulae requiring high magnification and good seeing.",
        subject: ["pne"], type: ["sketches", "notes"] },
      { name: "Strasbourg-ESO Catalogue PN — Part I", url: "https://www.eso.org/sci/libraries/historicaldocuments/Strasbourg-ESO_catalogue/Strasbourg-ESO_Catalogue_of_Galactical_Planetary_Nebulae_Part_I.pdf",
        summary: "Acker et al. 1992 catalogue Part I, with explanations, tables, references, and finding charts.",
        subject: ["pne"], type: ["catalog"], badges: ["pdf"] },
      { name: "Strasbourg-ESO Catalogue PN — Part II", url: "https://www.eso.org/sci/libraries/historicaldocuments/Strasbourg-ESO_catalogue/Strasbourg-ESO_Catalogue_of_Galactical_Planetary_Nebulae_Part_II.pdf",
        summary: "Acker et al. 1992 catalogue Part II, containing data on 1,143 confirmed planetary nebulae.",
        subject: ["pne"], type: ["catalog"], badges: ["pdf"] },
    
      // OBSERVING PROGRAMS, LISTS & COMMUNITIES =================================
      { name: "Adventures in Deep Space", url: "https://adventuresindeepspace.com/",
        summary: "Steve Gottlieb and friends' site of challenging observing projects for amateur astronomers.",
        subject: ["programs"], type: ["community"] },
      { name: "Adventures in Deep Space — Catalogs", url: "https://adventuresindeepspace.com/catalogs.html",
        summary: "Catalogs, lists, and links page for challenging deep-sky observing projects and resources.",
        subject: ["programs"], type: ["guide"] },
      { name: "Albert Highe (Archived Website)", url: "https://web.archive.org/web/20060312200423/http://pw2.netcom.com/~ahighe/",
        summary: "Wayback snapshot of the late Albert Highe's telescope-making and observing pages.",
        subject: ["programs"], type: ["community"], badges: ["archive"] },
      { name: "Alvin Huey's Downloadable Guides", url: "https://faintfuzzies.com/DownloadableObservingGuides2.html",
        summary: "Free downloadable deep-sky observing guides by Alvin Huey for medium to large telescopes.",
        subject: ["programs"], type: ["guide"] },
      { name: "Alvin Huey Observing Reports", url: "https://faintfuzzies.com/ObservingReports.html",
        summary: "Alvin Huey's archive of observing reports complementing his faintfuzzies.com guides.",
        subject: ["programs"], type: ["notes"] },
      { name: "Andy Edelen Observing Blog", url: "https://unfrozencavemanastronomer.wordpress.com/",
        summary: "Andy Edelen's \"Unfrozen Caveman Astronomer\" blog with detailed deep-sky observing reports.",
        subject: ["programs"], type: ["community", "notes"] },
      { name: "Astronomy League Observing Programs", url: "https://www.astroleague.org/alphabeticobserving/",
        summary: "Alphabetical listing of all Astronomical League observing programs and certifications offered.",
        subject: ["programs"], type: ["guide", "community"] },
      { name: "CloudyNights Deep Sky Forum", url: "https://www.cloudynights.com/forums/forum/85-deep-sky-observing/",
        summary: "Cloudy Nights' active forum dedicated to deep-sky visual observing discussion.",
        subject: ["programs"], type: ["community"] },
      { name: "DeepSky Archive", url: "http://www.deepsky-archive.com/index.php",
        summary: "International deep-sky observation database and sketch repository run by Finnish observers.",
        subject: ["programs"], type: ["database", "sketches"] },
      { name: "Deep Sky Forum", url: "https://www.deepskyforum.com/",
        summary: "Forum solely dedicated to visual deep-sky observing, featuring weekly Object of the Week.",
        subject: ["programs"], type: ["community"] },
      { name: "DeepSkyLog", url: "http://www.deepskylog.org",
        summary: "Free online deep-sky observation logging database with 150,000+ observations and sketches.",
        subject: ["programs"], type: ["database", "community"] },
      { name: "Don Pensack 500 Favorites", url: "https://www.cloudynights.com/forums/topic/472872-500-best-dso-list/",
        summary: "Cloudy Nights thread hosting Don Pensack's 500 best DSOs list for small scopes.",
        subject: ["programs"], type: ["guide"] },
      { name: "Greg Crinklaw's Deep Sky Archives", url: "https://observing.skyhound.com/archives.html",
        summary: "Skyhound's deep-sky observing archives by Greg Crinklaw, creator of SkyTools.",
        subject: ["programs"], type: ["notes", "guide"] },
      { name: "IAAC Deep-Sky Observing Logs (Archive)", url: "https://web.archive.org/web/20160315234842/http://www.visualdeepsky.org/netastrocatalog/maillist.html",
        summary: "Wayback archive of the Internet Amateur Astronomers Catalog mailing-list observations.",
        subject: ["programs"], type: ["notes", "community"], badges: ["archive"] },
      { name: "Ice in Space Forum", url: "https://www.iceinspace.com.au/forum/index.php",
        summary: "Active Australian and New Zealand amateur astronomy community forum.",
        subject: ["programs"], type: ["community"], region: "southern" },
      { name: "Intro to Deep Sky Observing (Faith Jordan)", url: "https://www.webbdeepsky.com/downloads/free-publications/introduction-to-deep-sky-observing.pdf",
        summary: "Faith Jordan's free Webb Society PDF introduction to visual deep-sky observing.",
        subject: ["programs"], type: ["article", "guide"], badges: ["pdf"] },
      { name: "Jose Torres Deep Sky Astronomy", url: "https://www.uv.es/jrtorres/",
        summary: "Jose Ramon Torres's deep-sky site, home of the TriAtlas Project charts.",
        subject: ["programs"], type: ["community", "guide"] },
      { name: "LMC Observing Guide (Susan Young)", url: "https://largemagellaniccloud.com/",
        summary: "Susan Young's comprehensive observing guide to regions and objects within the LMC.",
        subject: ["programs"], type: ["guide"], region: "southern" },
      { name: "Mark McCarthy Observing Blog", url: "https://markmccarthyobservingblog.blogspot.com/",
        summary: "Bay Area observer Mark McCarthy's blog on double stars and wide-field deep-sky.",
        subject: ["programs"], type: ["community", "notes"] },
      { name: "Nebula Filters Comparison (Knisely)", url: "https://www.prairieastronomyclub.org/filter-performance-comparisons-for-some-common-nebulae/",
        summary: "David Knisely's classic UHC/OIII/H-beta filter performance survey across common nebulae.",
        subject: ["programs", "nebulae"], type: ["article"] },
      { name: "Saguaro Astronomy Club Observing Lists", url: "https://www.saguaroastro.org/observing-lists-and-award-programs/",
        summary: "SAC's hub of observing lists and award programs (Messier, Herschel, Urban, etc.).",
        subject: ["programs"], type: ["guide", "community"] },
      { name: "Sand & Stars (Susan Young)", url: "https://sandandstars.co.za/my-blog/",
        summary: "Susan Young's blog about deep-sky stargazing under Kalahari Desert dark skies.",
        subject: ["programs"], type: ["community", "notes"], region: "southern" },
      { name: "Showpiece Regions in the LMC", url: "https://adventuresindeepspace.com/Showpiece%20regions%20in%20the%20LMC.pdf",
        summary: "Adventures in Deep Space PDF detailing showpiece nebulae and clusters within the LMC.",
        subject: ["programs"], type: ["guide"], region: "southern", badges: ["pdf"] },
      { name: "Texas Star Party Observing Lists", url: "https://texasstarparty.org/activities",
        summary: "TSP activities page linking to telescope, binocular, and advanced observing programs.",
        subject: ["programs"], type: ["guide", "community"] },
      { name: "Uwe Glahn (deepsky-visuell)", url: "http://www.deepsky-visuell.de/",
        summary: "Personal site of Uwe Glahn presenting decades of detailed visual deep-sky pencil sketches.",
        subject: ["programs"], type: ["sketches", "community"] },
      { name: "Vic Menard's 400 Favorites", url: "https://vicmenard.com/wp-content/uploads/2022/01/the_list.pdf",
        summary: "Vic Menard's PDF list of 400 favorite deep-sky objects across multiple catalogs.",
        subject: ["programs"], type: ["guide"], badges: ["pdf"] },
      { name: "Victor van Wulfen's Clear Skies Guides", url: "https://clearskies.eu/",
        summary: "Clear Skies Observing Guides home — thousands of PDF deep-sky guides for tablets.",
        subject: ["programs"], type: ["guide"] },
      { name: "Webb Deep-Sky Society", url: "https://www.webbdeepsky.com/",
        summary: "International society for double-star and deep-sky observers, publisher of Deep-Sky Observer.",
        subject: ["programs"], type: ["community"] },
    
      // TOOLS, VIEWERS & CALCULATORS ============================================
      { name: "Aladin Lite", url: "https://aladin.cds.unistra.fr/AladinLite/",
        summary: "Browser-based interactive sky atlas from CDS Strasbourg for visualizing surveys, catalogs, and FITS images.",
        subject: ["tools"], type: ["tool"] },
      { name: "Astrobin", url: "https://app.astrobin.com/",
        summary: "Image hosting and social platform for astrophotographers with equipment metadata, search, and forums.",
        subject: ["tools"], type: ["tool", "images", "community"] },
      { name: "GalaxyMap: Milky Way Explorer", url: "http://galaxymap.org/mwe/mwe.php",
        summary: "Kevin Jardine's multiwavelength panning interface showing the Milky Way in infrared, radio, and microwave.",
        subject: ["tools"], type: ["tool"] },
      { name: "Legacy Survey Viewer", url: "https://www.legacysurvey.org/viewer",
        summary: "Interactive map viewer for DESI Legacy Imaging Surveys optical and infrared data releases.",
        subject: ["tools"], type: ["tool"] },
      { name: "Magnitude Calculator (Mel Bartels)", url: "https://www.bbastrodesigns.com/magnitude.html",
        summary: "Mel Bartels' calculator for limiting magnitude, telescope and eyepiece performance, and sky-darkness effects.",
        subject: ["tools"], type: ["tool"] },
      { name: "NED Coordinate Calculator", url: "https://ned.ipac.caltech.edu/coordinate_calculator",
        summary: "NED tool for converting between equatorial, ecliptic, galactic, and supergalactic coordinates with precession.",
        subject: ["tools"], type: ["tool"] },
      { name: "Ned Wright's Advanced Cosmology Calculator", url: "https://astro.ucla.edu/~wright/ACC.html",
        summary: "Advanced JavaScript cosmology calculator allowing dark-energy equation-of-state and other parameter inputs.",
        subject: ["tools"], type: ["tool"] },
      { name: "Ned Wright's Cosmology Calculator", url: "https://www.astro.ucla.edu/~wright/CosmoCalc.html",
        summary: "JavaScript calculator computing times, distances, and ages from redshift and standard cosmological parameters.",
        subject: ["tools"], type: ["tool"] },
      { name: "NGC/IC Shorthand Description Translator (Mel Bartels)", url: "https://www.bbastrodesigns.com/objectLib.html",
        summary: "Mel Bartels' tool that translates Dreyer's shorthand description codes into plain-language NGC/IC notes.",
        subject: ["tools", "history"], type: ["tool"] },
      { name: "PanSTARRS-1 Image Access", url: "https://ps1images.stsci.edu/cgi-bin/ps1cutouts",
        summary: "STScI cutout service delivering PS1 grizy images and color stacks for arbitrary positions.",
        subject: ["tools"], type: ["tool", "images"] },
      { name: "Precession Tool (Chandra)", url: "https://cxc.harvard.edu/toolkit/precess.jsp",
        summary: "Chandra X-ray Center calculator that precesses J2000 coordinates between user-specified epochs.",
        subject: ["tools"], type: ["tool"] },
      { name: "Rick Johnson Mantrap Images", url: "https://images.mantrapskies.com/",
        summary: "Searchable archive of the late Rick Johnson's 1,600+ deep-sky CCD images, including unusual targets.",
        subject: ["tools"], type: ["images"] },
      { name: "Sky-Map.org (WikiSky)", url: "https://sky-map.org/?locale=EN",
        summary: "Wiki-style interactive sky map covering hundreds of millions of objects from DSS and SDSS.",
        subject: ["tools"], type: ["tool"] },
      { name: "SkyView Image Server", url: "http://skyview.gsfc.nasa.gov/cgi-bin/query.pl",
        summary: "NASA GSFC virtual observatory generating multiwavelength images from radio through gamma-ray surveys.",
        subject: ["tools"], type: ["tool", "images"] },
      { name: "Sloan Digital Sky Survey DR16", url: "https://skyserver.sdss.org/dr16/en/tools/chart/navi.aspx",
        summary: "SDSS DR16 Navigate tool for browsing imaging cutouts with object metadata and spectra.",
        subject: ["tools"], type: ["tool"] },
      { name: "STScI Digitized Sky Survey", url: "https://stdatu.stsci.edu/cgi-bin/dss_form",
        summary: "MAST form interface for retrieving Palomar and UK Schmidt photographic plate scans as FITS/JPG.",
        subject: ["tools"], type: ["tool", "images"] },
    
      // DATABASES & RESEARCH ====================================================
      { name: "ADS Historical Publications", url: "https://adsabs.harvard.edu/historical.html",
        summary: "ADS index of historical observatory publications scanned from 35mm film with Wolbach Library.",
        subject: ["databases"], type: ["database", "historical"] },
      { name: "ADS Journal Query", url: "https://adsabs.harvard.edu/journals_service.html",
        summary: "ADS query interface to find articles by journal name, volume, and page.",
        subject: ["databases"], type: ["database"] },
      { name: "ADS Observatory/Society Journals", url: "https://adsabs.harvard.edu/bulletins_service.html",
        summary: "ADS query page for observatory and society publications, bulletins, and proceedings.",
        subject: ["databases"], type: ["database"] },
      { name: "Astrophysics Data System (ADS)", url: "https://ui.adsabs.harvard.edu/",
        summary: "Modern ADS interface with search, filtering, and visualizations across 15+ million astronomy/physics records.",
        subject: ["databases"], type: ["database"] },
      { name: "Astrophysics Preprints (arXiv astro-ph)", url: "https://arxiv.org/archive/astro-ph",
        summary: "arXiv astro-ph archive landing page listing all astrophysics preprint subcategories and submission info.",
        subject: ["databases"], type: ["database"] },
      { name: "CDS Portal", url: "https://cdsportal.u-strasbg.fr/",
        summary: "Strasbourg unified gateway providing combined access to SIMBAD, VizieR, and Aladin services.",
        subject: ["databases"], type: ["database", "tool"] },
      { name: "Courtney Seligman's NGC/IC Atlas", url: "https://cseligman.com/text/atlas/ngc00.htm",
        summary: "Seligman's Historical NGC/IC project — NGC/IC/PGC objects with descriptions and historical notes.",
        subject: ["databases"], type: ["catalog", "article"] },
      { name: "Deep*Sky Corner Atlas & Data", url: "https://www.deepskycorner.ch/index.en.php",
        summary: "Online atlas of 1,414 deep-sky objects with charts, photos, sketches, and constellation lore.",
        subject: ["databases"], type: ["catalog", "article"] },
      { name: "Harold Corwin's NGC/IC Notes", url: "http://www.haroldcorwin.net/ngcic/index.html",
        summary: "Corwin's historically aware NGC/IC positions and notes files with Gaia EDR3 coordinates.",
        subject: ["databases"], type: ["catalog", "article"] },
      { name: "History of Deep Sky Discovery (SEDS)", url: "http://www.messier.seds.org/xtra/history/deepskyd.html",
        summary: "SEDS historical chronicle tracing pre-Messier discovery of nebulae and star clusters.",
        subject: ["databases"], type: ["article", "historical"] },
      { name: "HyperLeda", url: "http://atlas.obs-hp.fr/hyperleda/search.html",
        summary: "HyperLeda extragalactic database search by designation for galaxy photometry, kinematics, and spectrophotometry.",
        subject: ["databases", "galaxies"], type: ["database"] },
      { name: "Interactive NGC Catalog (SEDS)", url: "http://spider.seds.org/ngc/ngc.html",
        summary: "SEDS interactive NGC/IC/Messier catalog with cross-links to NED, SIMBAD, ADS, and DSS.",
        subject: ["databases"], type: ["catalog", "tool"] },
      { name: "NASA/IPAC Extragalactic Database (NED)", url: "https://ned.ipac.caltech.edu/",
        summary: "Comprehensive multiwavelength database of 1.1 billion extragalactic objects with cross-IDs and references.",
        subject: ["databases", "galaxies"], type: ["database"] },
      { name: "NED Images / Catalogs / Atlases (Level 5)", url: "https://ned.ipac.caltech.edu/level5/catalogs.html",
        summary: "Online versions of influential galaxy catalogs and atlases archived in NED Level 5.",
        subject: ["databases", "galaxies"], type: ["catalog"] },
      { name: "NED Knowledgebase (Level 5)", url: "https://ned.ipac.caltech.edu/level5/",
        summary: "Curated review articles, monographs, and reference data for extragalactic astronomy and cosmology.",
        subject: ["databases", "galaxies"], type: ["article"] },
      { name: "SIMBAD Astronomical Database", url: "https://simbad.cds.unistra.fr/simbad/",
        summary: "CDS SIMBAD database with identifications, basic data, and bibliography for millions of objects.",
        subject: ["databases"], type: ["database"] },
      { name: "VizieR Catalog Collection", url: "https://vizier.cds.unistra.fr/viz-bin/VizieR",
        summary: "VizieR — the largest collection of curated published astronomical catalogs, hosted by CDS.",
        subject: ["databases"], type: ["catalog", "database"] },
      { name: "Wolfgang Steinicke's Historical NGC/IC", url: "http://www.klima-luft.de/steinicke/index_e.htm",
        summary: "Steinicke's homepage hosting his comprehensive historical NGC/IC compilation, references, and observer biographies.",
        subject: ["databases"], type: ["catalog", "article", "historical"] },
    
      // HISTORICAL CATALOGS — chronological =====================================
      { name: "Messier (1771)", year: 1771, url: "http://www.messier.seds.org/xtra/history/m-cat71.html",
        summary: "SEDS translation of Messier's original 1771 catalog covering objects M1 through M45.",
        subject: ["history"], type: ["historical"] },
      { name: "W. Herschel — Messier Observations (from 1782)", year: 1782, url: "http://www.messier.seds.org/xtra/history/her-obsm.html",
        summary: "SEDS compilation of William Herschel's observations and notes on Messier objects beginning 1782.",
        subject: ["history"], type: ["historical"] },
      { name: "W. Herschel — First Catalogue of 1000 (1786)", year: 1786, url: "https://www.jstor.org/stable/106639",
        summary: "W. Herschel's 1786 Phil. Trans. catalogue of 1,000 new nebulae and star clusters.",
        subject: ["history"], type: ["historical"], badges: ["jstor"] },
      { name: "W. Herschel — Second Catalogue of 1000 (1789)", year: 1789, url: "https://www.jstor.org/stable/106695?origin=ads&seq=1",
        summary: "W. Herschel's second 1,000 nebulae and clusters catalogue with construction-of-the-heavens remarks.",
        subject: ["history"], type: ["historical"], badges: ["jstor"] },
      { name: "W. Herschel — Third Catalogue of 500 (1802)", year: 1802, url: "https://www.jstor.org/stable/107131?origin=ads",
        summary: "W. Herschel's 1802 catalogue of 500 new nebulae, planetary nebulae, and clusters.",
        subject: ["history"], type: ["historical"], badges: ["jstor"] },
      { name: "Dunlop Catalogue (1828)", year: 1828, url: "https://www.jstor.org/stable/107841",
        summary: "JSTOR-hosted Phil. Trans. paper: Dunlop's southern-hemisphere nebulae and star-cluster catalogue from Paramatta.",
        subject: ["history"], type: ["historical"], region: "southern", badges: ["jstor"] },
      { name: "J. Herschel — Slough Catalogue (1833)", year: 1833, url: "https://archive.org/details/jstor-108003",
        summary: "J. Herschel's Slough observations of nebulae and clusters with the 20-foot reflector, 1825-1833.",
        subject: ["history"], type: ["historical"] },
      { name: "J. Herschel — Cape Catalogue (1847)", year: 1847, url: "https://archive.org/details/Resultsastronom00Hers/page/n7/mode/2up",
        summary: "J. Herschel's Cape of Good Hope southern-sky telescopic survey (1834-1838 observations and catalogues).",
        subject: ["history"], type: ["historical"], region: "southern" },
      { name: "Lord Rosse — Selection from Observations of Nebulae (1861)", year: 1861, url: "https://www.jstor.org/stable/pdf/108752.pdf",
        summary: "Rosse's 1861 Phil. Trans. paper on six-foot speculum construction with selected nebulae observations.",
        subject: ["history"], type: ["historical"], badges: ["jstor", "pdf"] },
      { name: "J. Herschel — General Catalogue (1864)", year: 1864, url: "https://archive.org/details/generalcatalogue00hersrich/generalcatalogue00hersrich/page/n3/mode/2up",
        summary: "J. Herschel's 5,079-entry General Catalogue of nebulae and clusters reduced to epoch 1860.0.",
        subject: ["history"], type: ["historical"] },
      { name: "Lord Rosse — Observations of Nebulae (1880)", year: 1880, url: "https://archive.org/details/scientifictr218791882roya/page/n13/mode/2up",
        summary: "Lord Rosse's 1848-1878 Birr Castle nebulae observations published in Royal Dublin Society Transactions.",
        subject: ["history"], type: ["historical"] },
      { name: "Dreyer — New General Catalogue (NGC, 1888)", year: 1888, url: "https://articles.adsabs.harvard.edu/pdf/1888MmRAS..49....1D",
        summary: "Dreyer's foundational New General Catalogue PDF, revising and enlarging Herschel's General Catalogue.",
        subject: ["history"], type: ["historical"], badges: ["pdf"] },
      { name: "Dreyer — Index Catalogue I (1895)", year: 1895, url: "https://articles.adsabs.harvard.edu/pdf/1895MmRAS..51..185D",
        summary: "Dreyer's first Index Catalogue PDF, nebulae found 1888-1894 with NGC corrections.",
        subject: ["history"], type: ["historical"], badges: ["pdf"] },
      { name: "Dreyer — Index Catalogue II (1908)", year: 1908, url: "https://articles.adsabs.harvard.edu/pdf/1910MmRAS..59..105D",
        summary: "Dreyer's Second Index Catalogue PDF, objects found 1895-1907 with corrections to NGC and IC I.",
        subject: ["history"], type: ["historical"], badges: ["pdf"] },
      { name: "Dreyer's Description Codes (reference)", year: null, url: "https://spider.seds.org/ngc/des.html",
        summary: "Reference list of abbreviations Dreyer used in NGC and IC object descriptions.",
        subject: ["history"], type: ["historical"] },
    ];

    const RESOURCE_SUBJECT_DEFS = [
      { value: "galaxies",  label: "Galaxies" },
      { value: "clusters",  label: "Clusters" },
      { value: "nebulae",   label: "Nebulae" },
      { value: "pne",       label: "Planetary Nebulae" },
      { value: "stars",     label: "Stars" },
      { value: "programs",  label: "Programs & Communities" },
      { value: "tools",     label: "Tools & Viewers" },
      { value: "databases", label: "Databases & Research" },
      { value: "history",   label: "Historical" },
    ];

    const RESOURCE_TYPE_DEFS = [
      { value: "catalog",    label: "Catalog" },
      { value: "database",   label: "Database" },
      { value: "guide",      label: "Guide / List" },
      { value: "notes",      label: "Observing notes" },
      { value: "images",     label: "Images" },
      { value: "sketches",   label: "Sketches" },
      { value: "tool",       label: "Tool" },
      { value: "article",    label: "Article" },
      { value: "community",  label: "Community" },
      { value: "historical", label: "Historical paper" },
    ];

    const RESOURCE_REGION_DEFS = [
      { value: "southern", label: "Southern only" },
    ];

    const RESOURCE_BADGE_LABELS = {
      pdf: { cls: "resources-badge-pdf", label: "PDF" },
      xls: { cls: "resources-badge-xls", label: "XLS" },
      data: { cls: "resources-badge-data", label: "DATA" },
      broken: { cls: "resources-badge-broken", label: "Broken" },
      offline: { cls: "resources-badge-offline", label: "Offline" },
      archive: { cls: "resources-badge-archive", label: "Archive only" },
      registration: { cls: "resources-badge-registration", label: "Registration" },
      jstor: { cls: "resources-badge-jstor", label: "JSTOR" },
    };

    const RESOURCE_GROUP_ORDER = [
      "galaxies", "clusters", "nebulae", "pne", "stars",
      "programs", "tools", "databases", "history"
    ];
    const RESOURCE_GROUP_LABELS = {
      stars: "Stars",
      galaxies: "Galaxies, Groups & Clusters of Galaxies",
      clusters: "Globular & Open Clusters",
      nebulae: "Nebulae",
      pne: "Planetary Nebulae",
      programs: "Observing Programs, Lists & Communities",
      tools: "Tools, Viewers & Calculators",
      databases: "Databases & Research",
      history: "Historical Catalogs (chronological)",
    };

    function initResources() {
        const searchInput = document.getElementById('resources-search');
        const resetBtn = document.getElementById('resources-reset');
        const resultsContainer = document.getElementById('resources-results');
        const countEl = document.getElementById('resources-count');
        if (!searchInput || !resultsContainer) return;

        const resState = { subject: new Set(), type: new Set(), region: null, search: '' };

        function countMatches(axis, value) {
            return RESOURCE_ENTRIES.filter(e => {
                if (axis === 'region') return e.region === value;
                return (e[axis] || []).includes(value);
            }).length;
        }

        function buildCheckboxes(containerId, defs, axis, multi, append) {
            const container = document.getElementById(containerId);
            if (!container) return;
            if (append) {
                container.querySelectorAll(`[data-axis="${axis}"]`).forEach(c => { const r = c.closest('.resources-checkbox-row'); if (r) r.remove(); });
                container.querySelectorAll(`.resources-checkbox-divider[data-axis="${axis}"]`).forEach(d => d.remove());
                if (container.querySelectorAll('.resources-checkbox-row').length > 0) {
                    const div = document.createElement('div');
                    div.className = 'resources-checkbox-divider';
                    div.dataset.axis = axis;
                    container.appendChild(div);
                }
            } else {
                container.innerHTML = '';
            }
            for (const def of defs) {
                const count = countMatches(axis, def.value);
                if (count === 0) continue;
                const row = document.createElement('button');
                row.type = 'button';
                row.className = 'resources-checkbox-row';
                row.setAttribute('role', 'checkbox');
                row.dataset.axis = axis;
                row.dataset.value = def.value;
                row.setAttribute('aria-checked', 'false');
                row.innerHTML = `<span class="resources-checkbox-box" aria-hidden="true"></span><span class="resources-checkbox-label">${def.label}</span><span class="resources-checkbox-count">${count}</span>`;
                container.appendChild(row);
                row.addEventListener('click', e => {
                    e.stopPropagation();
                    const wasChecked = row.getAttribute('aria-checked') === 'true';
                    const nowChecked = !wasChecked;
                    row.setAttribute('aria-checked', nowChecked ? 'true' : 'false');
                    if (axis === 'region') {
                        resState.region = nowChecked ? def.value : null;
                        container.querySelectorAll(`.resources-checkbox-row[data-axis='region']`).forEach(other => { if (other !== row) other.setAttribute('aria-checked', 'false'); });
                    } else if (multi) {
                        if (nowChecked) resState[axis].add(def.value); else resState[axis].delete(def.value);
                    }
                    renderResources();
                });
            }
        }

        function entryMatches(e) {
            if (resState.subject.size > 0 && !(e.subject || []).some(s => resState.subject.has(s))) return false;
            if (resState.type.size > 0 && !(e.type || []).some(t => resState.type.has(t))) return false;
            if (resState.region !== null && e.region !== resState.region) return false;
            if (resState.search) {
                const q = resState.search.toLowerCase();
                if (!(e.name + ' ' + e.summary).toLowerCase().includes(q)) return false;
            }
            return true;
        }

        function renderResources() {
            resultsContainer.innerHTML = '';
            document.querySelectorAll('.resources-dropdown-filter').forEach(d => {
                const axis = d.dataset.axis;
                const label = d.querySelector('.resources-dropdown-label');
                if (!label) return;
                const n = axis === 'type' ? resState.type.size + (resState.region ? 1 : 0) : resState[axis].size;
                const base = axis === 'subject' ? 'Subject' : 'Type';
                label.innerHTML = n > 0 ? `${base}<span class="resources-filter-active-count"> (${n})</span>` : base;
            });

            const visible = RESOURCE_ENTRIES.filter(entryMatches);
            countEl.textContent = `${visible.length} of ${RESOURCE_ENTRIES.length} resources`;

            if (visible.length === 0) {
                resultsContainer.innerHTML = '<div class="resources-empty-state">No resources match the current filters.</div>';
                return;
            }

            const groups = new Map();
            for (const subj of RESOURCE_GROUP_ORDER) groups.set(subj, []);
            for (const e of visible) {
                const primary = (e.subject && e.subject[0]) || 'programs';
                if (!groups.has(primary)) groups.set(primary, []);
                groups.get(primary).push(e);
            }

            for (const subj of RESOURCE_GROUP_ORDER) {
                const items = groups.get(subj) || [];
                if (items.length === 0) continue;
                if (subj === 'history') {
                    items.sort((a, b) => { if (a.year == null && b.year == null) return 0; if (a.year == null) return 1; if (b.year == null) return -1; return a.year - b.year; });
                } else {
                    items.sort((a, b) => a.name.localeCompare(b.name));
                }
                const group = document.createElement('section');
                group.className = 'resources-group';
                group.innerHTML = `<h2 class="resources-group-header"><span>${escHtml(RESOURCE_GROUP_LABELS[subj])}</span><span class="resources-group-count">(${items.length})</span></h2>`;
                for (const e of items) {
                    const badgesHtml = [];
                    if (e.region) badgesHtml.push(`<span class="resources-badge resources-badge-${e.region}">${e.region === 'southern' ? 'Southern' : 'Northern'}</span>`);
                    for (const b of (e.badges || [])) { const def = RESOURCE_BADGE_LABELS[b]; if (def) badgesHtml.push(`<span class="resources-badge ${def.cls}">${def.label}</span>`); }
                    const tagsHtml = (e.type || []).map(t => { const def = RESOURCE_TYPE_DEFS.find(d => d.value === t); return def ? `<span class="resources-type-tag">${escHtml(def.label)}</span>` : ''; }).join('');
                    const card = document.createElement('article');
                    card.className = 'resources-entry' + ((e.badges || []).includes('broken') ? ' broken' : '');
                    card.innerHTML = `<div class="resources-entry-head"><h3 class="resources-entry-name"><a href="${escAttr(e.url)}" target="_blank" rel="noopener noreferrer">${escHtml(e.name)}</a></h3>${badgesHtml.length ? '<div class="resources-entry-badges">' + badgesHtml.join('') + '</div>' : ''}</div><p class="resources-entry-summary">${escHtml(e.summary)}</p><div class="resources-entry-tags">${tagsHtml}</div>`;
                    group.appendChild(card);
                }
                resultsContainer.appendChild(group);
            }
        }

        buildCheckboxes('resources-filter-subject', RESOURCE_SUBJECT_DEFS, 'subject', true, false);
        buildCheckboxes('resources-filter-type', RESOURCE_TYPE_DEFS, 'type', true, false);
        buildCheckboxes('resources-filter-type', RESOURCE_REGION_DEFS, 'region', false, true);

        searchInput.addEventListener('input', e => { resState.search = e.target.value; renderResources(); });
        resetBtn.addEventListener('click', () => {
            resState.subject.clear(); resState.type.clear(); resState.region = null; resState.search = '';
            searchInput.value = '';
            document.querySelectorAll('.resources-dropdown-panel .resources-checkbox-row').forEach(r => r.setAttribute('aria-checked', 'false'));
            renderResources();
        });
        document.querySelectorAll('.resources-dropdown-filter').forEach(d => {
            d.addEventListener('toggle', () => { if (d.open) document.querySelectorAll('.resources-dropdown-filter[open]').forEach(o => { if (o !== d) o.open = false; }); });
        });
        document.addEventListener('click', e => { if (!e.target.closest('.resources-dropdown-filter')) document.querySelectorAll('.resources-dropdown-filter[open]').forEach(d => { d.open = false; }); });

        renderResources();
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
