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
  const empty = () => ({ v:1, characters:[], dragons:[], events:[], theories:[], notices:[] });
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
          for (const k of ["age","riders"]) if (data[list][i][k] == null && s[k] != null) { data[list][i][k] = s[k]; added = true; }
          if (list === "characters" && s.group === "flier" && data[list][i].gryphon === undefined && ["rider", "civilian"].includes(data[list][i].group)) { data[list][i].group = "flier"; added = true; }
          if (data[list][i].venin === undefined && s.venin) { data[list][i].venin = true; added = true; }
          if ((!data[list][i].status || data[list][i].status === "unknown") && s.status && s.status !== "unknown") { data[list][i].status = s.status; added = true; }
        }
        if (fixSpellings()) added = true;
        if (added) save();
        return;
      }
    } catch (e) { console.warn(e); }
    data = JSON.parse(JSON.stringify(window.EMPYREAN_SEED || empty())); data.fromSeed = true; data.removedSeed = []; save();
    fetchPublished();   // first visit: prefer the owner's published notebook over the bare starter data
  };
  // Corrections to spellings that were dictated wrongly; applied to anything already saved in this browser.
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
  const eventKey = e => e.story != null && e.story !== "" ? Number(e.story) : (BASE[e.book] ?? 5000) + (pageNum(e) ?? e.order ?? 0);
  const eraOf = e => { const k = eventKey(e); return k < 1000 ? "Before Fourth Wing" : k < 2000 ? "Fourth Wing" : k < 3000 ? "Iron Flame" : k < 4000 ? "Onyx Storm" : k < 5000 ? "Threshing Day (not placed yet)" : "Other"; };
  const sortEvents = list => [...list].sort((a, b) => eventKey(a) - eventKey(b));

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
  const NAV = [["index.html","Home"],["timeline.html","Timeline"],["theories.html","Theories"],["notices.html","Notices"],["dragons.html","Dragons"],["characters.html","Characters"]];
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
  const optionsOf = (list, label = x => x.name, blank) => [...(blank ? [{ v:"", l:blank }] : []), ...data[list].map(x => ({ v:x.id, l:label(x) }))].sort((a, b) => a.v === "" ? -1 : b.v === "" ? 1 : a.l.localeCompare(b.l));

  load();
  return { BOOKS, EDITIONS, bookOf, uid, h, svg, get data() { return data; }, upsert, remove, byId, sortEvents, eventKey, eraOf, form, layout, tabs, emptyState, unverified, citeView, citeLabel, optionsOf, exportData, importData };
})();
