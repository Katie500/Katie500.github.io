/* Empyrean Notebook — shared core: storage, helpers, forms, layout.
   All data lives in this browser's localStorage; use Export/Import to back up or move it. */
const E = (() => {
  const KEY = "empyrean.notebook.v1";
  const BOOKS = [
    { id:"FW", name:"Fourth Wing", color:"var(--FW)" },
    { id:"IF", name:"Iron Flame", color:"var(--IF)" },
    { id:"OS", name:"Onyx Storm", color:"var(--OS)" },
    { id:"TD", name:"Threshing Day", color:"var(--TD)" },
    { id:"OT", name:"Other / outside the books", color:"var(--OT)" },
  ];
  const EDITIONS = ["Hardcover","Paperback","Ebook","Audiobook","Special / deluxe edition","Other"];
  const bookOf = id => BOOKS.find(b => b.id === id) || BOOKS[4];
  const uid = p => p + "-" + Math.random().toString(36).slice(2, 9);

  /* ---------- tiny DOM helper ---------- */
  const h = (tag, a, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) {
      if (v === false || v == null) continue;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "value") e.value = v;
      else e.setAttribute(k, v === true ? "" : v);
    }
    kids.flat(Infinity).forEach(c => { if (c === false || c == null) return; e.append(c.nodeType ? c : document.createTextNode(c)); });
    return e;
  };
  const svg = (tag, a, ...kids) => {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(a || {})) if (v != null) e.setAttribute(k, v);
    kids.flat().forEach(c => e.append(c.nodeType ? c : document.createTextNode(c)));
    return e;
  };

  /* ---------- storage ---------- */
  let data;
  const SYNC_KEY = "empyrean.sync.v1", PUB_KEY = "empyrean.published.v1", DATA_PATH = "empyrean/data.json";
  const hash = s => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return x + ":" + s.length; };
  const syncDefaults = { owner:"Katie500", repo:"Katie500.github.io", branch:"master", token:"" };
  const syncSettings = () => { try { return { ...syncDefaults, ...JSON.parse(localStorage.getItem(SYNC_KEY) || "{}") }; } catch (e) { return { ...syncDefaults }; } };
  const saveSyncSettings = s => { try { localStorage.setItem(SYNC_KEY, JSON.stringify(s)); } catch (e) { console.warn(e); } };
  const syncState = () => {
    let pub = null; try { pub = localStorage.getItem(PUB_KEY); } catch (e) {}
    return !pub ? "never" : pub === hash(JSON.stringify(data)) ? "clean" : "dirty";
  };
  const empty = () => ({ v:1, characters:[], dragons:[], events:[], theories:[], notices:[], signets:[], locations:[], routes:[], shapes:[] });
  // Places mentioned in the books, with rough schematic positions on a 1000 x 700 canvas. The positions are guesses meant to be dragged into place;
  // places without coordinates start in the "not on the map yet" list. Everything is flagged "check".
  const LC = "Starter note from the notices, snippets and web summaries; check against your copy.";
  const MAPNOTE = "Named on the book's world map; what it is has not been checked.";
  // Places, positioned on the book's world map (one unit = one pixel of that picture, 1000 x 903).
  const LOCATION_SEED = [
    // id, name, kind, parent, x, y, description
    ["s-loc-navarre", "Navarre", "kingdom", "", 428, 177, "The unified kingdom behind the wards, ruled from the Senarium. Five provinces joined it in year 1 (Public Notice 1.1)."],
    ["s-loc-poromiel", "Poromiel", "kingdom", "", 590, 468, "The gryphon kingdom. Ruled by Queen Maraya, then King Tecarus."],
    ["s-loc-tyrrendor", "Tyrrendor", "province", "s-loc-navarre", 225, 402, "Largest and southernmost province of Navarre; home of House Riorson and the failed rebellion."],
    ["s-loc-calldyr", "Calldyr", "province", "s-loc-navarre", 190, 315, "Province of Navarre; the Council of Calldyr agreed Navarre's marriage law (Public Notice 1.249)."],
    ["s-loc-elsum", "Elsum", "province", "s-loc-navarre", 456, 258, "Province of Navarre that borders Poromiel; attacked by Krovlan forces near Resson (Public Notice 1.323)."],
    ["s-loc-luceras", "Luceras", "province", "s-loc-navarre", 213, 205, "Province of Navarre; coastal Luceras and Tyrrendor are asked to watch for sea raiders (Public Notice 442.184)."],
    ["s-loc-morainne", "Morraine", "province", "s-loc-navarre", 426, 220, "Province of Navarre."],
    ["s-loc-deaconshire", "Deaconshire", "province", "s-loc-navarre", 360, 313, "Province of Navarre, named on the book's world map."],
    ["s-loc-cygnisen", "Cygnisen", "province", "s-loc-poromiel", 592, 110, "Province named on the book's world map, at the northern tip."],
    ["s-loc-krovla", "Krovla", "province", "s-loc-poromiel", 572, 531, "Southernmost Poromish province, ruled by Viscount (later King) Tecarus."],
    ["s-loc-braevick", "Braevick", "province", "s-loc-poromiel", 666, 297, "Poromish province whose second city is Zolya."],
    ["s-loc-basgiath", "Basgiath War College", "fortress", "s-loc-navarre", 326, 263, "Navarre's war college: Riders, Scribe, Healer and Infantry Quadrants, and the wardstone."],
    ["s-loc-aretia", "Aretia", "town", "s-loc-tyrrendor", 355, 430, "Tyrrish town burned by dragons after the rebellion; later the rebels' base with an unpowered wardstone."],
    ["s-loc-riorson", "Riorson House", "fortress", "s-loc-tyrrendor", null, null, "Half palace, half barracks, a fortress never breached by an army until dragons burned it. The valley above it holds the old Dubhmadinn hatching grounds. Not labelled on the world map: drag it into place."],
    ["s-loc-kyllendelle", "Kyllendelle", "town", "s-loc-tyrrendor", null, null, "Tyrrish village sacked by raiders from the Emerald Sea (Public Notice 442.184). Not labelled on the world map."],
    ["s-loc-resson", "Resson", "town", "s-loc-poromiel", 485, 456, "Village and trading post at the edge of the dragon-protected border; site of a Krovlan attack and the Fourth Wing finale battle."],
    ["s-loc-athebyne", "Athebyne", "outpost", "s-loc-poromiel", 478, 425, "Border outpost near Resson, repeatedly attacked."],
    ["s-loc-steelridge", "Steel Ridge Range", "region", "s-loc-navarre", null, null, "Mountain range where the green Uaineloidsig dragons offered their hatching grounds (an epigraph). Not labelled on the world map."],
    ["s-loc-zolya", "Zolya", "city", "s-loc-braevick", 668, 368, "Second most populous city in Braevick; home of Cliffsbane Flight Academy. Labelled “Zolya (Cliffsbane)” on the world map."],
    ["s-loc-cliffsbane", "Cliffsbane Flight Academy", "fortress", "s-loc-braevick", 684, 380, "The Poromish gryphon flier academy, counterpart of Basgiath."],
    ["s-loc-cordyn", "Cordyn", "city", "s-loc-krovla", 575, 592, "Seaside city in Krovla where Viscount Tecarus keeps his palace."],
    ["s-loc-emerald", "Emerald Sea", "sea", "", 105, 66, "The sea to the north-west of the Continent; raiders from it sack coastal Tyrrish villages."],
    ["s-loc-barrens", "The Barrens", "region", "", 845, 430, "The large eastern land. Abandoned by dragons and gryphons after the Great War (an epigraph)."],
    ["s-loc-samara", "Samara", "outpost", "s-loc-navarre", 566, 324, "Outpost where Xaden is posted in Iron Flame and which is attacked."],
    ["s-loc-zehyllna", "Zehyllna", "island", "", 200, 703, "Island whose people worship Zihnal; the card game where Trager dies."],
    ["s-loc-draithus", "Draithus", "town", "", 472, 490, "Site of the climactic Onyx Storm battle against the venin. On the south coast of the Continent, below Medaro Pass."],
    ["s-loc-dunne", "Temple of Dunne", "temple", "", null, null, "Temple whose shard Violet uses against Theophanie; its head priestess certifies Violet's marriage."],
    ["s-loc-arctile", "Arctile Ocean", "sea", "", 348, 606, "The ocean south of the Continent. " + MAPNOTE],
    ["s-loc-malek", "Bay of Malek", "sea", "", 740, 468, "The bay between Poromiel and the Barrens. " + MAPNOTE],
    ["s-loc-esben", "Esben Mountains", "region", "", 586, 193, "The mountain chain running down the middle of the Continent (the map labels a second stretch “Esben Mountains” near Sumerton). " + MAPNOTE],
    ["s-loc-medaro", "Medaro Pass", "region", "", 433, 460, "A pass beside a waterfall, just north of Draithus. " + MAPNOTE],
    ["s-loc-dralor", "Cliffs of Dralor", "region", "", 327, 472, "The dark cliffs along Tyrrendor's southern coast. " + MAPNOTE],
    ["s-loc-iakobos", "Iakobos River", "region", "", 326, 222, "River that runs past Basgiath and The Vale to the west coast. " + MAPNOTE],
    ["s-loc-dunness", "Dunness River", "region", "", 770, 235, "River along the Braevick–Barrens border. " + MAPNOTE],
    ["s-loc-montserrat", "Montserrat", "town", "s-loc-navarre", 528, 164, MAPNOTE],
    ["s-loc-suniva", "Suniva", "town", "s-loc-braevick", 670, 198, MAPNOTE],
    ["s-loc-chakir", "Chakir", "town", "s-loc-braevick", 585, 266, MAPNOTE],
    ["s-loc-anica", "Anica", "town", "s-loc-braevick", 636, 350, MAPNOTE],
    ["s-loc-newhall", "Newhall", "town", "s-loc-poromiel", 577, 334, MAPNOTE],
    ["s-loc-sumerton", "Sumerton", "town", "s-loc-poromiel", 515, 386, MAPNOTE],
    ["s-loc-vale", "The Vale", "town", "s-loc-navarre", 309, 263, MAPNOTE],
    ["s-loc-lewellen", "Lewellen", "town", "s-loc-tyrrendor", 155, 428, MAPNOTE],
    ["s-loc-pavis", "Pavis", "town", "s-loc-poromiel", 521, 500, MAPNOTE],
    ["s-loc-calldyr-city", "Calldyr City", "city", "s-loc-calldyr", 165, 297, MAPNOTE],
    ["s-loc-loysam", "Loysam", "island", "", 140, 815, "Island on the world map."],
    ["s-loc-hedotis", "Hedotis", "island", "", 305, 750, "Island on the world map."],
    ["s-loc-unnbriel", "Unnbriel", "island", "", 430, 770, "Island on the world map."],
    ["s-loc-deverelli", "Deverelli", "island", "", 590, 780, "Island on the world map."],
    ["s-loc-unnamed", "Unnamed Isle", "island", "", 78, 718, "Unnamed island on the world map."],
    ["s-loc-xortrys", "Xortrys", "town", "s-loc-zehyllna", 208, 742, MAPNOTE],
    ["s-loc-vidirys", "Vidirys", "town", "s-loc-hedotis", 323, 765, MAPNOTE],
    ["s-loc-eistol", "Eistol", "town", "s-loc-unnbriel", 458, 771, MAPNOTE],
    ["s-loc-matyas", "Matyas", "town", "s-loc-deverelli", 541, 775, MAPNOTE],
  ].map(([id, name, kind, parent, x, y, desc]) => ({ id, name, kind, parent, x, y, desc:/map|Note|Starter/.test(desc) ? desc : desc + " " + LC, unverified:true, rev:3 }));
  // Land, mountains, rivers, roads and province areas for the map: lists of [x, y] points the map page lets you drag.
  // Coast and mountains were traced from the world map picture; provinces, rivers and roads were placed by eye.
  const SHAPE_SEED = ((window.EMPYREAN_MAP || {}).shapes || []).map(([id, name, kind, pts, color, sharp]) => ({ id, name, kind, pts, color, sharp:!!sharp, unverified:true, rev:2 }));
  const applyLocations = () => {
    let changed = false; data.locations = data.locations || []; data.routes = data.routes || []; data.shapes = data.shapes || []; data.removedSeed = data.removedSeed || [];
    if ((data.mapRev || 0) < 2 && SHAPE_SEED.length) {
      // the first map was a rough guess; swap in the traced one and put starter places on their real positions, even ones that were dragged
      data.shapes = data.shapes.filter(s => !s.id.startsWith("s-sh-"));
      for (const s of LOCATION_SEED) { const l = data.locations.find(x => x.id === s.id); if (l) { l.x = s.x; l.y = s.y; if (l.name === "Morainne") l.name = "Morraine"; if (l.id === "s-loc-draithus") l.kind = s.kind; if (l.parent === "s-loc-navarre" && s.parent !== l.parent && l.unverified === true) l.parent = s.parent; } }
      data.mapRev = 2; changed = true;
    }
    const lists = [["locations", LOCATION_SEED]]; if (SHAPE_SEED.length) lists.push(["shapes", SHAPE_SEED]);
    for (const [list, seed] of lists) for (const s of seed) {
      const i = data[list].findIndex(x => x.id === s.id);
      if (i < 0) { if (!data.removedSeed.includes(s.id)) { data[list].push(JSON.parse(JSON.stringify(s))); changed = true; } }
      else if (data[list][i].unverified === true && s.rev > (data[list][i].rev || 0)) { data[list][i] = JSON.parse(JSON.stringify(s)); changed = true; }
    }
    return changed;
  };
  // Signet kinds and who is known to have them. Everything here comes from web summaries and your notes; entries are flagged "check".
  const SG = "Starter note from web summaries of the books; check against your copy.";
  const SIGNET_SEED = {
    signets: [
      ["s-sg-lightning", "Lightning wielding", "Wielding", "Calls and controls lightning."],
      ["s-sg-time", "Stopping time", "Time", "Briefly stops time. Summaries tie Violet's second signet to Andarna."],
      ["s-sg-shadow", "Shadow wielding", "Wielding", "Wields shadows. Xaden also has a second signet revealed in Iron Flame; add it here once you know which."],
      ["s-sg-ice", "Ice wielding", "Wielding", "Calls and controls ice."],
      ["s-sg-storm", "Storm wielding", "Wielding", "Calls and controls storms."],
      ["s-sg-mending", "Mending", "Healing", "Heals wounds. An epigraph calls menders rare and the most precious of signets."],
      ["s-sg-farsight", "Farsight", "Mind", "Sees things at a distance."],
      ["s-sg-memory-read", "Memory reading", "Mind", "Reads another person's memories."],
      ["s-sg-memory-wipe", "Memory wiping", "Mind", "Wipes memories. Seen when Violet loses twelve hours at the end of Onyx Storm."],
      ["s-sg-precog", "Precognition", "Mind", "Sees what is about to happen."],
      ["s-sg-summoning", "Summoning", "Objects", "Makes items disappear and reappear in the rider's possession."],
      ["s-sg-metal", "Metal manipulation", "Objects", "Manipulates metal."],
      ["s-sg-siphon", "Siphoning", "Other", "Siphons magic from others; Sloane's power is vital to the Basgiath ritual in Iron Flame."],
      ["s-sg-counter", "Signet countering", "Defensive", "Counters or dampens other signets."],
      ["s-sg-truthsayer", "Truthsayer", "Mind", "Named in an epigraph as the signet more terrifying than an intrinsic. Details unknown."],
      ["s-sg-intrinsic", "Intrinsic", "Other", "Named in an epigraph as a terrifying signet type. Details unknown."],
    ].map(([id, name, category, desc]) => ({ id, name, category, desc:desc + " " + SG, unverified:true, rev:1 })),
    assign: { "s-violet":["s-sg-lightning","s-sg-time"], "s-xaden":["s-sg-shadow"], "s-ridoc":["s-sg-ice"], "s-lilith":["s-sg-storm"], "s-brennan":["s-sg-mending"],
      "s-liam":["s-sg-farsight"], "s-dain":["s-sg-memory-read"], "s-imogen":["s-sg-memory-wipe"], "s-aaric":["s-sg-precog"], "s-rhi":["s-sg-summoning"],
      "s-sawyer":["s-sg-metal"], "s-sloane":["s-sg-siphon"], "s-bodhi":["s-sg-counter"] },
  };
  const applySignets = () => {
    let changed = false; data.signets = data.signets || []; data.removedSeed = data.removedSeed || [];
    for (const s of SIGNET_SEED.signets) {
      const i = data.signets.findIndex(x => x.id === s.id);
      if (i < 0) { if (!data.removedSeed.includes(s.id)) { data.signets.push({ ...s }); changed = true; } }
      else if (data.signets[i].unverified === true && s.rev > (data.signets[i].rev || 0)) { data.signets[i] = { ...s }; changed = true; }
    }
    for (const [cid, sids] of Object.entries(SIGNET_SEED.assign)) {
      const c = data.characters.find(x => x.id === cid);
      if (c && c.signetIds === undefined) { c.signetIds = sids.filter(id => data.signets.some(x => x.id === id)); changed = true; }
    }
    return changed;
  };
  // Titles are a separate dropdown field; names that started with a title are split once when loaded.
  const TITLES = ["Prince","Princess","King","Queen","Duke","Duchess","Earl","Viscount","Count","Lord","Lady","Professor","Colonel","Lieutenant Colonel","Major","General","Captain","Lieutenant","Commandant","Curator","Cadet","Septon","Healer"];
  const fullName = c => [c.title, c.name].filter(Boolean).join(" ");
  const migrateTitles = () => {
    let changed = false;
    const byLen = [...TITLES].sort((a, b) => b.length - a.length);
    for (const c of data.characters || []) {
      if (c.title !== undefined) continue;
      c.title = "";
      for (const t of byLen) {
        if (c.name.startsWith(t + " ")) {
          const rest = c.name.slice(t.length + 1);
          if (rest && !rest.startsWith("(") && !/^of\b/.test(rest)) { c.title = t; c.name = rest; }
          break;
        }
      }
      changed = true;
    }
    return changed;
  };
  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        data = Object.assign(empty(), JSON.parse(raw)); data.removedSeed = data.removedSeed || [];
        // bring in starter entries added since this browser last loaded the notebook (never resurrecting ones you deleted),
        // and refresh starter entries you haven't edited yet when the starter data has a newer revision
        let added = false;
        for (const list of ["characters","dragons","events","theories","notices"]) for (const s of (window.EMPYREAN_SEED?.[list] || [])) {
          const i = data[list].findIndex(x => x.id === s.id);
          if (i < 0) { if (!data.removedSeed.includes(s.id)) { data[list].push(JSON.parse(JSON.stringify(s))); added = true; } continue; }
          if (data[list][i].unverified === true && (s.rev || 0) > (data[list][i].rev || 0)) { data[list][i] = JSON.parse(JSON.stringify(s)); added = true; continue; }
          // entries you've edited keep your values; only blank fields (and "not set" statuses) are filled from the starter data
          for (const k of ["aliases","tail","fateEventId","text","sex","family","origin","dragonId","gryphon"]) if (!data[list][i][k] && s[k]) { data[list][i][k] = s[k]; added = true; }
          for (const k of ["age","riders","year"]) if (data[list][i][k] == null && s[k] != null) { data[list][i][k] = s[k]; if (k === "year" && data[list][i].yearApprox === undefined) data[list][i].yearApprox = !!s.yearApprox; added = true; }
          if (list === "characters" && s.group === "flier" && data[list][i].gryphon === undefined && ["rider", "civilian"].includes(data[list][i].group)) { data[list][i].group = "flier"; added = true; }
          if (data[list][i].venin === undefined && s.venin) { data[list][i].venin = true; added = true; }
          if ((!data[list][i].status || data[list][i].status === "unknown") && s.status && s.status !== "unknown") { data[list][i].status = s.status; added = true; }
        }
        if (fixSpellings()) added = true;
        if (retire()) added = true;
        if (applySignets()) added = true;
        if (applyLocations()) added = true;
        if (migrateTitles()) added = true;
        if (added) save();
        return;
      }
    } catch (e) { console.warn(e); }
    data = Object.assign(empty(), JSON.parse(JSON.stringify(window.EMPYREAN_SEED || empty()))); data.fromSeed = true; data.removedSeed = []; applySignets(); applyLocations(); migrateTitles(); save();
    fetchPublished();   // first visit: prefer the owner's published notebook over the bare starter data
  };
  // Corrections to spellings that were dictated wrongly; applied to anything already saved in this browser.
  // Starter entries that turned out to be wrong are removed from anything already saved in this browser.
  const RETIRED = { dragons:["s-d-trissa"] };
  const retire = () => { let changed = false; for (const [list, ids] of Object.entries(RETIRED)) { const keep = (data[list] || []).filter(x => !ids.includes(x.id)); if (keep.length !== (data[list] || []).length) { data[list] = keep; changed = true; } } return changed; };
  const SPELLING_FIXES = [
    [/Tacarus/g, "Tecarus"], [/Thaddeus Palme/g, "Thadeus Palme"], [/Mason Sanborn/g, "Masen Sanborn"], [/Offendra/g, "Affendra"], [/grandmothers dragon/g, "grandmother\u2019s dragon"],
    [/Battle of Aretia \[\? you said "Arisha"\]/g, "Battle of Aretia"], [/Treaty of Aretia \[\?\]/g, "Treaty of Aretia"],
    [/\[\?\] abandoning the \[\?\] in the memory of General \[\?\] Moore/g, "abandoning the Barrens and the memory of General Daramor"],
  ];
  const SPELLING_FIELDS = { characters:["name","notes"], dragons:["name","notes"], events:["title","desc"], theories:["title","body"], notices:["title","text","summary"] };
  const fixSpellings = () => {
    let changed = false;
    for (const [list, keys] of Object.entries(SPELLING_FIELDS)) for (const n of data[list] || []) for (const k of keys) if (typeof n[k] === "string") {
      let v = n[k]; for (const [re, to] of SPELLING_FIXES) v = v.replace(re, to);
      if (v !== n[k]) { n[k] = v; changed = true; }
    }
    return changed;
  };
  async function fetchPublished() {
    try {
      const r = await fetch(new URL("data.json", location.href) + "?t=" + Date.now(), { cache:"no-store" });
      if (!r.ok) return;
      const obj = await r.json();
      if (!obj || !Array.isArray(obj.theories) || !data.fromSeed) return;   // never overwrite anything the visitor has started editing
      data = Object.assign(empty(), obj); data.removedSeed = data.removedSeed || []; save();
      try { localStorage.setItem(PUB_KEY, hash(JSON.stringify(data))); } catch (e) {}
      location.reload();
    } catch (e) { /* no published copy yet */ }
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); updateBadge(); } catch (e) { console.warn("Could not save", e); alert("Your browser couldn\u2019t save this (storage may be full). Export a backup, then try smaller pictures."); } };
  const upsert = (list, item) => { delete data.fromSeed; const i = data[list].findIndex(x => x.id === item.id); item.updated = Date.now(); if (i >= 0) data[list][i] = item; else data[list].push(item); save(); };
  const remove = (list, id) => { delete data.fromSeed; if (id.startsWith("s-")) (data.removedSeed ||= []).push(id); data[list] = data[list].filter(x => x.id !== id); save(); };
  const byId = (list, id) => data[list].find(x => x.id === id);
  // Chronological position: an explicit "story" number wins; otherwise book base + order within the book.
  const BASE = { FW:1000, IF:2000, OS:3000, TD:4000, OT:5000 };
  // A page number, when there is one, decides the position within the book; the "order" number is only the fallback.
  const pageNum = e => { const m = String(e.page ?? "").match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  // In-world year (AU) is the main position. An event with no year borrows a default for its book, then page number (or the older
  // "order" number) only breaks ties within a year.
  const DEFAULT_YEAR = { FW:634, IF:635, OS:635.5, TD:634, OT:635 };
  const hasYear = e => e.year != null && e.year !== "" && isFinite(Number(e.year));
  const yearOf = e => hasYear(e) ? Number(e.year) : (e.story != null && e.story !== "" ? (Number(e.story) < 1000 ? 631 : Number(e.story) < 2000 ? 634 : Number(e.story) < 3000 ? 635 : 635.5) : (DEFAULT_YEAR[e.book] ?? 635));
  const withinYear = e => Math.min(9999, pageNum(e) ?? e.order ?? (e.story != null && e.story !== "" ? Number(e.story) % 1000 : 9000));
  const eventKey = e => yearOf(e) * 10000 + withinYear(e);
  const yearLabel = e => (hasYear(e) ? (e.yearApprox ? "~" : "") : "~") + Math.floor(yearOf(e)) + " AU";
  const eraOf = e => Math.floor(yearOf(e)) + " AU";
  const sortEvents = list => [...list].sort((a, b) => eventKey(a) - eventKey(b));
  const sortKey = eventKey;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const a = h("a", { href:URL.createObjectURL(blob), download:"empyrean-notebook-" + new Date().toISOString().slice(0, 10) + ".json" });
    document.body.append(a); a.click(); a.remove();
  };
  const importData = () => {
    const inp = h("input", { type:"file", accept:"application/json" });
    inp.onchange = async () => {
      try {
        const obj = JSON.parse(await inp.files[0].text());
        if (!obj || typeof obj !== "object" || !Array.isArray(obj.theories)) throw new Error("not a notebook file");
        if (!confirm("Replace everything in this browser with the imported file?")) return;
        data = Object.assign(empty(), obj); save(); location.reload();
      } catch (e) { alert("That file couldn't be imported: " + e.message); }
    };
    inp.click();
  };

  /* ---------- citations ---------- */
  const citeLabel = c => [bookOf(c.book).name, c.edition, c.chapter && "ch. " + c.chapter, c.page && "p. " + c.page].filter(Boolean).join(" · ");
  const citeView = c => h("div", { class:"cite " + (c.stance || "") },
    h("b", {}, citeLabel(c) || "No reference"), c.stance ? h("span", { class:"meta" }, " — " + c.stance) : null,
    c.note ? h("div", {}, c.note) : null);

  /* ---------- images: downscale to a small JPEG data URL ---------- */
  const shrink = (file, max) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", .82));
    };
    im.onerror = rej; im.src = url;
  });

  /* ---------- modal form ---------- */
  // fields: {k,label,type:text|textarea|number|select|multi|cites|checkbox|url|date, options:[{v,l}], stance:bool}
  const form = ({ title, fields, value = {}, onSave, onDelete }) => {
    const dlg = h("dialog");
    const getters = {}, setters = {};
    const body = fields.map(f => {
      const v = value[f.k];
      let input;
      if (f.type === "textarea") input = h("textarea", { value:v ?? "" });
      else if (f.type === "select") input = h("select", {}, f.options.map(o => h("option", { value:o.v, selected:(v ?? "") === o.v }, o.l)));
      else if (f.type === "checkbox") input = h("input", { type:"checkbox", checked:!!v });
      else if (f.type === "multi") {
        const sel = new Set(v || []);
        input = h("div", { class:"checks" }, f.options.length ? f.options.map(o => h("label", {}, h("input", { type:"checkbox", value:o.v, checked:sel.has(o.v) }), o.l)) : h("span", { class:"meta" }, "Nothing to pick from yet."));
      } else if (f.type === "cites") {
        let rows = (v || []).map(x => ({ ...x }));
        const box = h("div"), render = () => {
          box.replaceChildren(...rows.map((r, i) => h("div", { class:"crow" + (f.stance ? " stance" : "") },
            h("select", { onchange:e => r.book = e.target.value, "aria-label":"Book" }, BOOKS.map(b => h("option", { value:b.id, selected:r.book === b.id }, b.id))),
            h("select", { onchange:e => r.edition = e.target.value, "aria-label":"Edition" }, h("option", { value:"" }, "Edition…"), EDITIONS.map(x => h("option", { selected:r.edition === x }, x))),
            h("input", { type:"text", placeholder:"Page", value:r.page || "", oninput:e => r.page = e.target.value, "aria-label":"Page" }),
            h("input", { type:"text", placeholder:"Note / what it shows (your words)", value:r.note || "", oninput:e => r.note = e.target.value, "aria-label":"Note" }),
            f.stance ? h("select", { onchange:e => r.stance = e.target.value, "aria-label":"Stance" }, ["support","against","neutral"].map(s => h("option", { selected:(r.stance || "support") === s }, s))) : null,
            h("button", { type:"button", class:"btn sm", onclick:() => { rows.splice(i, 1); render(); }, "aria-label":"Remove" }, "✕"))));
          box.append(h("button", { type:"button", class:"btn sm", onclick:() => { rows.push({ book:"FW", edition:data.lastEdition || "", stance:"support" }); render(); } }, "+ Add page reference"));
        };
        render(); input = box;
        getters[f.k] = () => rows.filter(r => r.page || r.note || r.chapter).map(r => { if (r.edition) data.lastEdition = r.edition; if (f.stance && !r.stance) r.stance = "support"; return r; });
        return h("div", { class:"f" }, h("label", {}, f.label), input);
      }
      if (f.type === "image") {
        let cur = v || "";
        const prev = h("img", { alt:"", style:"width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--line);display:" + (cur ? "block" : "none") + ";margin-bottom:.5rem", src:cur || null });
        const pick = h("input", { type:"file", accept:"image/*", onchange:async e => {
          const file = e.target.files[0]; if (!file) return;
          try { cur = await shrink(file, 360); prev.src = cur; prev.style.display = "block"; } catch (err) { alert("That image couldn\u2019t be read."); }
        } });
        const clear = h("button", { type:"button", class:"btn sm", style:"margin-left:.5rem", onclick:() => { cur = ""; prev.removeAttribute("src"); prev.style.display = "none"; pick.value = ""; } }, "Remove picture");
        getters[f.k] = () => cur;
        return h("div", { class:"f" }, h("label", {}, f.label), prev, pick, clear, h("div", { class:"meta" }, "Resized in your browser and saved only there (and in your backup file)."));
      }
      if (f.type === "text" || f.type === "number" || f.type === "url" || f.type === "date") input = h("input", { type:f.type, value:v ?? "", placeholder:f.placeholder || "", step:f.type === "number" ? "any" : null });
      if (f.type === "select") setters[f.k] = v => { input.value = v; };
      getters[f.k] = () => f.type === "checkbox" ? input.checked : f.type === "multi" ? [...input.querySelectorAll("input:checked")].map(x => x.value) : f.type === "number" ? (input.value === "" ? null : Number(input.value)) : input.value.trim();
      return h("div", { class:"f" }, h("label", {}, f.label), input, f.hint ? h("div", { class:"meta" }, f.hint) : null);
    });
    const applyConds = () => fields.forEach((fd, i) => {
      if (fd.showIf) body[i].style.display = getters[fd.showIf]() ? "" : "none";
      if (fd.hideIf) body[i].style.display = getters[fd.hideIf]() ? "none" : "";
      if (fd.autoSet && getters[fd.autoSet.when]() && !fd.autoSet.ifIn.includes(getters[fd.k]())) setters[fd.k](fd.autoSet.to);
    });
    const f = h("form", { method:"dialog", onchange:applyConds, onsubmit:e => {
      e.preventDefault();
      const out = { ...value, unverified:false }; fields.forEach(x => out[x.k] = getters[x.k]());
      onSave(out); dlg.close(); dlg.remove();
    } }, h("h2", {}, title), body,
      h("div", { class:"actions" },
        onDelete ? h("button", { type:"button", class:"btn danger", onclick:() => { if (confirm("Delete this entry?")) { onDelete(); dlg.close(); dlg.remove(); } } }, "Delete") : null,
        h("button", { type:"button", class:"btn", onclick:() => { dlg.close(); dlg.remove(); } }, "Cancel"),
        h("button", { type:"submit", class:"btn primary" }, "Save")));
    dlg.append(f); document.body.append(dlg); applyConds(); dlg.showModal();
    dlg.addEventListener("cancel", () => dlg.remove());
  };

  /* ---------- publish to the site through the GitHub API ---------- */
  const b64 = s => { const bytes = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const gh = (s, extra = {}) => ({ headers:{ Accept:"application/vnd.github+json", Authorization:"Bearer " + s.token, "X-GitHub-Api-Version":"2022-11-28", ...extra } });
  const ghUrl = s => `https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}/contents/${DATA_PATH}`;
  const ghError = async r => { let m = ""; try { m = (await r.json()).message; } catch (e) {} return r.status === 401 ? "GitHub rejected the token (expired or mistyped)." : r.status === 403 || r.status === 404 ? "GitHub says no access (" + r.status + "). Check the token has Contents: Read and write on this repository. " + (m || "") : "GitHub error " + r.status + ". " + (m || ""); };
  const SHA_KEY = "empyrean.publishedSha.v1";
  const noCache = u => u + (u.includes("?") ? "&" : "?") + "t=" + Date.now();
  // GitHub's API answers can be cached by the browser for a minute, which hands back an out-of-date file id (sha) and causes a 409.
  // So every read asks for a fresh copy, and a write that hits a 409 re-reads the id and tries again.
  async function remoteInfo(s) {
    const r = await fetch(noCache(ghUrl(s) + "?ref=" + encodeURIComponent(s.branch)), { cache:"no-store", ...gh(s) });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(await ghError(r));
    return r.json();
  }
  async function publish(s) {
    const snap = { ...data }; delete snap.fromSeed;
    const content = b64(JSON.stringify(snap, null, 1));
    let known = null; try { known = localStorage.getItem(SHA_KEY); } catch (e) {}
    for (let attempt = 0; attempt < 3; attempt++) {
      const info = await remoteInfo(s);
      if (attempt === 0 && info && known && info.sha !== known &&
          !confirm("The saved copy on the site has changed since you last saved or loaded it (for example, it was edited directly). Saving now replaces those changes with what is in this browser.\n\nPress OK to save anyway, or Cancel and use “Load from site” first.")) throw new Error("Not saved. Use “Load from site” to bring in the newer copy first.");
      const body = { message:"Update Empyrean notebook data", content, branch:s.branch }; if (info) body.sha = info.sha;
      const w = await fetch(ghUrl(s), { method:"PUT", cache:"no-store", ...gh(s, { "Content-Type":"application/json" }), body:JSON.stringify(body) });
      if (w.ok) {
        const res = await w.json();
        try { localStorage.setItem(PUB_KEY, hash(JSON.stringify(data))); if (res.content && res.content.sha) localStorage.setItem(SHA_KEY, res.content.sha); } catch (e) {}
        updateBadge(); return;
      }
      if ((w.status === 409 || w.status === 422) && attempt < 2) continue;   // stale file id: read it again and retry
      throw new Error(await ghError(w));
    }
  }
  async function pull(s) {
    let text, sha = null;
    if (s.token) {
      const info = await remoteInfo(s);
      if (!info) throw new Error("Nothing has been saved to the site yet.");
      sha = info.sha;
      text = new TextDecoder().decode(Uint8Array.from(atob((info.content || "").replace(/\s/g, "")), c => c.charCodeAt(0)));
      if (!text && info.download_url) text = await (await fetch(noCache(info.download_url), { cache:"no-store" })).text();
    } else {
      const r = await fetch(noCache(new URL("data.json", location.href).href), { cache:"no-store" });
      if (r.status === 404) throw new Error("Nothing has been saved to the site yet.");
      if (!r.ok) throw new Error("Couldn\u2019t load the saved copy (" + r.status + ").");
      text = await r.text();
    }
    const obj = JSON.parse(text);
    if (!obj || !Array.isArray(obj.theories)) throw new Error("The saved file isn\u2019t a notebook.");
    if (sha) { try { localStorage.setItem(SHA_KEY, sha); } catch (e) {} }
    return obj;
  }
  const updateBadge = () => {
    const b = document.getElementById("sync-btn"); if (!b) return;
    const st = syncState();
    b.textContent = st === "dirty" ? "● Unsaved changes" : st === "clean" ? "✓ Saved to site" : "Sync";
    b.className = "btn sm sync " + st;
  };
  function syncDialog() {
    const s = syncSettings(), dlg = h("dialog"), msg = h("p", { class:"meta", role:"status", style:"min-height:1.4em;margin-top:.8rem" });
    const inp = (k, type = "text") => h("input", { type, value:s[k] || "", autocomplete:"off", spellcheck:"false", oninput:e => s[k] = e.target.value.trim() });
    const run = async (label, fn) => { msg.style.color = "var(--soft)"; msg.textContent = label + "…"; try { await fn(); } catch (e) { msg.style.color = "var(--bad)"; msg.textContent = e.message || String(e); } };
    dlg.append(h("form", { method:"dialog", onsubmit:e => e.preventDefault() },
      h("h2", {}, "Sync with the site"),
      h("p", { class:"meta" }, "Saving writes your whole notebook to ", h("code", {}, DATA_PATH), " in your GitHub repository, which republishes the site in a minute or two. Anyone visiting the site for the first time then sees it, and so does any other device of yours (use “Load from site”). Saving makes the notebook public."),
      h("div", { class:"f" }, h("label", {}, "GitHub token"), inp("token", "password"),
        h("div", { class:"meta" }, "Stored only in this browser. Never share it. ", h("a", { href:"https://github.com/settings/personal-access-tokens/new", target:"_blank", rel:"noopener" }, "Create one"), ": “Only select repositories” → this repo, permission Contents → Read and write.")),
      h("div", { class:"row" }, h("div", { class:"f", style:"flex:1;min-width:140px" }, h("label", {}, "Owner"), inp("owner")), h("div", { class:"f", style:"flex:1;min-width:160px" }, h("label", {}, "Repository"), inp("repo")), h("div", { class:"f", style:"width:110px" }, h("label", {}, "Branch"), inp("branch"))),
      h("div", { class:"actions", style:"justify-content:flex-start" },
        h("button", { type:"button", class:"btn primary", onclick:() => run("Saving", async () => { if (!s.token) throw new Error("Paste a token first."); saveSyncSettings(s); await publish(s); msg.style.color = "var(--ok)"; msg.textContent = "Saved. The site updates in a minute or two."; }) }, "Save to site"),
        h("button", { type:"button", class:"btn", onclick:() => run("Loading", async () => { saveSyncSettings(s); const obj = await pull(s); if (!confirm("Replace what’s in this browser with the copy saved on the site?")) { msg.textContent = ""; return; } data = Object.assign(empty(), obj); data.removedSeed = data.removedSeed || []; save(); try { localStorage.setItem(PUB_KEY, hash(JSON.stringify(data))); } catch (e) {} location.reload(); }) }, "Load from site"),
        h("button", { type:"button", class:"btn", onclick:() => { s.token = ""; saveSyncSettings(s); dlg.close(); dlg.remove(); } }, "Forget token"),
        h("button", { type:"button", class:"btn", onclick:() => { saveSyncSettings(s); dlg.close(); dlg.remove(); } }, "Close")),
      msg));
    document.body.append(dlg); dlg.showModal(); dlg.addEventListener("cancel", () => { saveSyncSettings(s); dlg.remove(); });
  }

  /* ---------- layout ---------- */
  const NAV = [["index.html","Home"],["timeline.html","Timeline"],["theories.html","Theories"],["notices.html","Notices"],["dragons.html","Dragons"],["characters.html","Characters"],["signets.html","Signets"],["locations.html","Map"]];
  const layout = (active, title, lede) => {
    const root = document.getElementById("app");
    root.before(h("header", { class:"site" },
      h("a", { class:"brand", href:"index.html" }, "Empyrean Notebook", h("small", {}, "Theories · Timeline · Lineages")),
      h("nav", { class:"main", "aria-label":"Sections" }, NAV.map(([href, l]) => h("a", { href, "aria-current":href === active ? "page" : null }, l)), h("button", { id:"sync-btn", class:"btn sm sync", onclick:syncDialog, title:"Save your notebook to the site or load it from there" }, "Sync"))));
    updateBadge();
    if (title) root.before(h("h1", { html:title }), lede ? h("p", { class:"lede" }, lede) : null);
    document.querySelector(".wrap").append(h("footer", { class:"site" },
      h("span", {}, "Fan-made and unofficial. Spoilers for the series throughout. Saved only in this browser."),
      h("span", { class:"row" },
        h("button", { class:"btn sm", onclick:exportData }, "Export backup"),
        h("button", { class:"btn sm", onclick:importData }, "Import"),
        h("a", { class:"meta", href:"../index.html" }, "← Portfolio"))));
  };
  const tabs = (items, current, onPick) => h("div", { class:"tabs", role:"group" }, items.map(([k, l]) => h("button", { class:"tab", "aria-pressed":String(k === current), onclick:() => onPick(k) }, l)));
  const emptyState = msg => h("div", { class:"empty" }, msg);
  const unverified = x => x.unverified ? h("span", { class:"unv", title:"Pre-filled from memory — check against your copy, then edit to clear this flag" }, "check") : null;
  const optionsOf = (list, label = x => x.name, blank, keep = () => true) => [...(blank ? [{ v:"", l:blank }] : []), ...data[list].filter(keep).map(x => ({ v:x.id, l:label(x) }))].sort((a, b) => a.v === "" ? -1 : b.v === "" ? 1 : a.l.localeCompare(b.l));

  load();
  return { TITLES, fullName, yearOf, hasYear, yearLabel, sortKey, BOOKS, EDITIONS, bookOf, uid, h, svg, get data() { return data; }, upsert, remove, byId, sortEvents, eventKey, eraOf, form, layout, tabs, emptyState, unverified, citeView, citeLabel, optionsOf, exportData, importData };
})();
