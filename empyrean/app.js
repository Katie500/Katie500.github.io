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
  const empty = () => ({ v:1, characters:[], dragons:[], events:[], theories:[], notices:[] });
  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        data = Object.assign(empty(), JSON.parse(raw)); data.removedSeed = data.removedSeed || [];
        // bring in starter entries added since this browser last loaded the notebook (never resurrecting ones you deleted)
        let added = false;
        for (const list of ["characters","dragons","events","theories","notices"]) for (const s of (window.EMPYREAN_SEED?.[list] || []))
          if (!data[list].some(x => x.id === s.id) && !data.removedSeed.includes(s.id)) { data[list].push(JSON.parse(JSON.stringify(s))); added = true; }
        if (added) save();
        return;
      }
    } catch (e) { console.warn(e); }
    data = JSON.parse(JSON.stringify(window.EMPYREAN_SEED || empty())); save();
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn("Could not save", e); } };
  const upsert = (list, item) => { const i = data[list].findIndex(x => x.id === item.id); item.updated = Date.now(); if (i >= 0) data[list][i] = item; else data[list].push(item); save(); };
  const remove = (list, id) => { if (id.startsWith("s-")) (data.removedSeed ||= []).push(id); data[list] = data[list].filter(x => x.id !== id); save(); };
  const byId = (list, id) => data[list].find(x => x.id === id);
  const sortEvents = list => [...list].sort((a, b) => BOOKS.findIndex(x => x.id === a.book) - BOOKS.findIndex(x => x.id === b.book) || (a.order ?? 0) - (b.order ?? 0));

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

  /* ---------- modal form ---------- */
  // fields: {k,label,type:text|textarea|number|select|multi|cites|checkbox|url|date, options:[{v,l}], stance:bool}
  const form = ({ title, fields, value = {}, onSave, onDelete }) => {
    const dlg = h("dialog");
    const getters = {};
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
      if (f.type === "text" || f.type === "number" || f.type === "url" || f.type === "date") input = h("input", { type:f.type, value:v ?? "", placeholder:f.placeholder || "", step:f.type === "number" ? "any" : null });
      getters[f.k] = () => f.type === "checkbox" ? input.checked : f.type === "multi" ? [...input.querySelectorAll("input:checked")].map(x => x.value) : f.type === "number" ? (input.value === "" ? null : Number(input.value)) : input.value.trim();
      return h("div", { class:"f" }, h("label", {}, f.label), input, f.hint ? h("div", { class:"meta" }, f.hint) : null);
    });
    const f = h("form", { method:"dialog", onsubmit:e => {
      e.preventDefault();
      const out = { ...value, unverified:false }; fields.forEach(x => out[x.k] = getters[x.k]());
      onSave(out); dlg.close(); dlg.remove();
    } }, h("h2", {}, title), body,
      h("div", { class:"actions" },
        onDelete ? h("button", { type:"button", class:"btn danger", onclick:() => { if (confirm("Delete this entry?")) { onDelete(); dlg.close(); dlg.remove(); } } }, "Delete") : null,
        h("button", { type:"button", class:"btn", onclick:() => { dlg.close(); dlg.remove(); } }, "Cancel"),
        h("button", { type:"submit", class:"btn primary" }, "Save")));
    dlg.append(f); document.body.append(dlg); dlg.showModal();
    dlg.addEventListener("cancel", () => dlg.remove());
  };

  /* ---------- layout ---------- */
  const NAV = [["index.html","Home"],["timeline.html","Timeline"],["theories.html","Theories"],["notices.html","Notices"],["dragons.html","Dragons"],["characters.html","Characters"]];
  const layout = (active, title, lede) => {
    const root = document.getElementById("app");
    root.before(h("header", { class:"site" },
      h("a", { class:"brand", href:"index.html" }, "Empyrean Notebook", h("small", {}, "Theories · Timeline · Lineages")),
      h("nav", { class:"main", "aria-label":"Sections" }, NAV.map(([href, l]) => h("a", { href, "aria-current":href === active ? "page" : null }, l)))));
    if (title) root.before(h("h1", { html:title }), lede ? h("p", { class:"lede" }, lede) : null);
    document.querySelector(".wrap").append(h("footer", { class:"site" },
      h("span", {}, "Fan-made and unofficial. Spoilers for the series throughout. Saved only in this browser."),
      h("span", { class:"row" },
        h("button", { class:"btn sm", onclick:exportData }, "Export backup"),
        h("button", { class:"btn sm", onclick:importData }, "Import"),
        h("a", { class:"meta", href:"../index.html" }, "← Portfolio"))));
  };
  const tabs = (items, current, onPick) => h("div", { class:"tabs", role:"group" }, items.map(([k, l]) => h("button", { class:"tab", "aria-pressed":k === current, onclick:() => onPick(k) }, l)));
  const emptyState = msg => h("div", { class:"empty" }, msg);
  const unverified = x => x.unverified ? h("span", { class:"unv", title:"Pre-filled from memory — check against your copy, then edit to clear this flag" }, "check") : null;
  const optionsOf = (list, label = x => x.name, blank) => [...(blank ? [{ v:"", l:blank }] : []), ...data[list].map(x => ({ v:x.id, l:label(x) }))].sort((a, b) => a.v === "" ? -1 : b.v === "" ? 1 : a.l.localeCompare(b.l));

  load();
  return { BOOKS, EDITIONS, bookOf, uid, h, svg, get data() { return data; }, upsert, remove, byId, sortEvents, form, layout, tabs, emptyState, unverified, citeView, citeLabel, optionsOf, exportData, importData };
})();
