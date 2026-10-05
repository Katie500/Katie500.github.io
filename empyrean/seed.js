/* Starter data. Everything here was pre-filled from memory and is flagged "check" until you edit it.
   Statuses, family trees and page numbers are deliberately left for you to fill in from your own copies. */
window.EMPYREAN_SEED = {
  v: 1,
  characters: [
    { id:"s-violet",  name:"Violet Sorrengail", group:"rider", status:"unknown", rebelChild:false, dragonId:"s-tairn", notes:"Main POV.", unverified:true },
    { id:"s-xaden",   name:"Xaden Riorson",     group:"rider", status:"unknown", rebelChild:true,  dragonId:"s-sgaeyl", notes:"", unverified:true },
    { id:"s-brennan", name:"Brennan Sorrengail", group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-mira",    name:"Mira Sorrengail",   group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-dain",    name:"Dain Aetos",        group:"rider", status:"unknown", rebelChild:false, dragonId:"s-cath", notes:"", unverified:true },
    { id:"s-liam",    name:"Liam Mairi",        group:"rider", status:"unknown", rebelChild:false, dragonId:"s-deigh", notes:"", unverified:true },
    { id:"s-sloane",  name:"Sloane Mairi",      group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-rhi",     name:"Rhiannon Matthias", group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-ridoc",   name:"Ridoc Gamlyn",      group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-garrick", name:"Garrick Tavis",     group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-bodhi",   name:"Bodhi",             group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-imogen",  name:"Imogen",            group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-sawyer",  name:"Sawyer",            group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
    { id:"s-aaric",   name:"Aaric",             group:"rider", status:"unknown", rebelChild:false, notes:"", unverified:true },
  ],
  dragons: [
    { id:"s-tairn",  name:"Tairn",  color:"", family:"", sire:"", dam:"", riderId:"s-violet", status:"unknown", notes:"", unverified:true },
    { id:"s-andarna",name:"Andarna",color:"", family:"", sire:"", dam:"", riderId:"s-violet", status:"unknown", notes:"Violet's second bond.", unverified:true },
    { id:"s-sgaeyl", name:"Sgaeyl", color:"", family:"", sire:"", dam:"", riderId:"s-xaden", status:"unknown", notes:"", unverified:true },
    { id:"s-cath",   name:"Cath",   color:"", family:"", sire:"", dam:"", riderId:"s-dain", status:"unknown", notes:"", unverified:true },
    { id:"s-deigh",  name:"Deigh",  color:"", family:"", sire:"", dam:"", riderId:"s-liam", status:"unknown", notes:"", unverified:true },
  ],
  events: [
    { id:"s-ev-threshing", title:"Violet's Threshing", book:"FW", order:10, chapter:"", page:"", edition:"", kind:"event",
      desc:"Violet takes part in Threshing at Basgiath. Add the page, chapter and details from your copy.", chars:["s-violet"], unverified:true },
  ],
  theories: [
    { id:"s-th-example", title:"Example theory — delete me", status:"speculative", confidence:2,
      body:"This is a placeholder showing how a theory works. Pick the timeline events that foreshadow it, then either link the event where it pays off or leave it as 'not yet revealed'. Add evidence with a book, edition and page number, and mark each piece as support or against.",
      foreshadow:["s-ev-threshing"], revealId:"", revealText:"",
      evidence:[{ book:"FW", edition:"Hardcover", page:"123", note:"Example reference — replace with a real one.", stance:"support" }], created:0, updated:0 },
  ],
  notices: [],
};
