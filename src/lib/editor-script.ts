// Script injecté dans l'iframe d'aperçu en mode édition.
//
// Il rend le rendu réel du site directement manipulable (sélection de blocs,
// barre d'outils flottante, zones d'insertion, édition de texte en place) et
// communique avec l'éditeur parent (StudioEditor) par postMessage.
//
// Messages émis vers le parent (window.parent) :
//   { source:"bd-editor", type:"ready" }
//   { source:"bd-editor", type:"select", index }
//   { source:"bd-editor", type:"edit", index, path, value }
//   { source:"bd-editor", type:"action", action, index }   action: up|down|duplicate|delete|settings
//   { source:"bd-editor", type:"action", action:"reorder", index, to }   glisser-déposer
//   { source:"bd-editor", type:"insert", at }
// Messages reçus du parent :
//   { type:"select", index }   met en surbrillance un bloc

export function editorScriptHtml(): string {
  const css = `
/* Édition sur canvas */
[data-bd-block]{ position:relative; transition:box-shadow .15s ease, opacity .15s ease; }
.bd-ed-hover{ outline:2px dashed #ddc076 !important; outline-offset:-2px; }
.bd-ed-selected{ outline:3px solid #ddc076 !important; outline-offset:-3px; }
[contenteditable="true"]{ cursor:text; }
[contenteditable="true"]:hover{ background:rgba(221,192,118,.10); }
[contenteditable="true"]:focus{ background:rgba(11,87,208,.06); outline:2px solid #0b57d0 !important; outline-offset:2px; border-radius:3px; }
.bd-ed-toolbar{ position:absolute; top:0; right:0; transform:translateY(-100%); z-index:2147483000;
  display:flex; gap:2px; background:#1f2430; border-radius:8px 8px 0 0; padding:4px; box-shadow:0 -2px 12px rgba(0,0,0,.25);
  animation:bd-ed-toolbar-in .12s ease; }
@keyframes bd-ed-toolbar-in{ from{ opacity:0; transform:translateY(-100%) translateY(4px); } to{ opacity:1; transform:translateY(-100%); } }
.bd-ed-toolbar button{ border:0; background:transparent; color:#fff; min-width:30px; height:28px; padding:0 6px;
  border-radius:6px; cursor:pointer; font-size:13px; font-family:sans-serif; transition:background .1s ease; }
.bd-ed-toolbar button:hover{ background:#343b4d; }
.bd-ed-toolbar button:disabled{ opacity:.3; cursor:default; }
.bd-ed-toolbar button.bd-ed-grip{ cursor:grab; }
.bd-ed-toolbar button.bd-ed-grip:active{ cursor:grabbing; }
.bd-ed-toolbar .lbl{ font-size:11px; color:#9aa1b5; padding:0 8px; display:flex; align-items:center; }
.bd-ed-insert{ position:relative; height:0; z-index:2147483001; }
.bd-ed-insert > button{ position:absolute; left:50%; top:0; transform:translate(-50%,-50%);
  width:30px; height:30px; border-radius:50%; border:2px solid #ddc076; background:#fff; color:#1f2430;
  cursor:pointer; font-size:18px; line-height:1; box-shadow:0 2px 8px rgba(0,0,0,.25); opacity:.55; transition:opacity .12s, transform .12s; }
.bd-ed-insert > button:hover{ opacity:1; transform:translate(-50%,-50%) scale(1.12); }
.bd-ed-insert.bd-ed-drop-target{ height:14px; margin:-7px 0; }
.bd-ed-insert.bd-ed-drop-target::before{ content:""; position:absolute; left:0; right:0; top:50%; transform:translateY(-50%);
  height:4px; border-radius:2px; background:#ddc076; box-shadow:0 0 0 4px rgba(221,192,118,.25); }
.bd-ed-insert.bd-ed-drop-target > button{ opacity:0; }
[data-bd-block].bd-ed-dragging{ opacity:.35; box-shadow:0 0 0 2px #ddc076 inset; }
.bd-ed-empty{ padding:60px 20px; text-align:center; color:#9aa1b5; font-family:sans-serif; }
`;

  const js = `
(function(){
  "use strict";
  var post = function(msg){ msg.source="bd-editor"; parent.postMessage(msg, "*"); };
  var blocks = function(){ return Array.prototype.slice.call(document.querySelectorAll("[data-bd-block]")); };
  var indexOf = function(el){ var b=el.closest("[data-bd-block]"); return b?parseInt(b.getAttribute("data-bd-block"),10):null; };
  var selectedIndex = null;
  var toolbar = null;

  // --- neutralise la navigation (liens/boutons/formulaires) dans le canvas ---
  document.addEventListener("click", function(e){
    var a = e.target.closest("a");
    if(a){ e.preventDefault(); }
    var form = e.target.closest("form");
    if(form && e.target.closest("button,input[type=submit]")){ e.preventDefault(); }
  }, true);
  document.addEventListener("submit", function(e){ e.preventDefault(); }, true);

  // --- survol ---
  var hovered = null;
  document.addEventListener("mouseover", function(e){
    var b = e.target.closest("[data-bd-block]");
    if(hovered && hovered!==b) hovered.classList.remove("bd-ed-hover");
    if(b && !b.classList.contains("bd-ed-selected")){ b.classList.add("bd-ed-hover"); hovered=b; }
  });
  document.addEventListener("mouseout", function(e){
    var b = e.target.closest("[data-bd-block]");
    if(b) b.classList.remove("bd-ed-hover");
  });

  // --- sélection ---
  function select(index, notify){
    blocks().forEach(function(b){
      var i = parseInt(b.getAttribute("data-bd-block"),10);
      b.classList.toggle("bd-ed-selected", i===index);
      if(i===index) b.classList.remove("bd-ed-hover");
    });
    selectedIndex = index;
    placeToolbar();
    if(notify) post({ type:"select", index: index });
  }

  document.addEventListener("mousedown", function(e){
    if(e.target.closest(".bd-ed-toolbar") || e.target.closest(".bd-ed-insert")) return;
    var i = indexOf(e.target);
    if(i!==null && i!==selectedIndex) select(i, true);
  });

  // --- édition de texte en place ---
  // Lecture du texte SANS transformation CSS (innerText appliquerait
  // text-transform:uppercase de certains styles). On lit les nœuds texte bruts
  // et on insère des retours à la ligne aux frontières de blocs / <br>.
  function readText(el){
    var out = "";
    el.childNodes.forEach(function(node){
      if(node.nodeType===3){ out += node.nodeValue; }
      else if(node.nodeType===1){
        if(node.classList && (node.classList.contains("bd-ed-toolbar") || node.classList.contains("bd-ed-insert"))) return;
        var tag = node.tagName;
        if(tag==="BR"){ out += "\\n"; return; }
        var block = /^(P|DIV|LI|UL|OL|H1|H2|H3|H4|H5|H6)$/.test(tag);
        if(block && out && !/\\n$/.test(out)) out += "\\n";
        out += readText(node);
        if(block && !/\\n$/.test(out)) out += "\\n";
      }
    });
    return out;
  }
  function fieldValue(f){
    return readText(f).replace(/\\n{3,}/g,"\\n\\n").replace(/^\\n+|\\n+$/g,"");
  }
  var debTimer = null;
  document.addEventListener("input", function(e){
    var f = e.target.closest("[data-bd-field]");
    if(!f) return;
    var index = indexOf(f), path = f.getAttribute("data-bd-field"), value = fieldValue(f);
    clearTimeout(debTimer);
    debTimer = setTimeout(function(){ post({ type:"edit", index:index, path:path, value:value }); }, 250);
  });
  // synchronisation finale à la perte de focus
  document.addEventListener("blur", function(e){
    var f = e.target.closest && e.target.closest("[data-bd-field]");
    if(!f) return;
    post({ type:"edit", index:indexOf(f), path:f.getAttribute("data-bd-field"), value: fieldValue(f) });
  }, true);

  // --- barre d'outils flottante ---
  function makeBtn(txt, title, cb, disabled){
    var b=document.createElement("button"); b.type="button"; b.textContent=txt; b.title=title;
    if(disabled) b.disabled=true;
    b.addEventListener("mousedown", function(ev){ ev.preventDefault(); ev.stopPropagation(); });
    b.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); cb(); });
    return b;
  }
  function placeToolbar(){
    if(toolbar){ toolbar.remove(); toolbar=null; }
    if(selectedIndex===null) return;
    var el = document.querySelector('[data-bd-block="'+selectedIndex+'"]');
    if(!el) return;
    var n = blocks().length;
    toolbar = document.createElement("div");
    toolbar.className="bd-ed-toolbar";
    toolbar.setAttribute("contenteditable","false");
    var grip = makeBtn("⠿","Glisser pour réordonner",function(){});
    grip.classList.add("bd-ed-grip");
    grip.draggable = true;
    grip.addEventListener("dragstart", function(ev){ onGripDragStart(ev, selectedIndex); });
    grip.addEventListener("dragend", onGripDragEnd);
    toolbar.appendChild(grip);
    toolbar.appendChild(makeBtn("↑","Monter",function(){ post({type:"action",action:"up",index:selectedIndex}); }, selectedIndex===0));
    toolbar.appendChild(makeBtn("↓","Descendre",function(){ post({type:"action",action:"down",index:selectedIndex}); }, selectedIndex===n-1));
    toolbar.appendChild(makeBtn("⧉","Dupliquer",function(){ post({type:"action",action:"duplicate",index:selectedIndex}); }));
    toolbar.appendChild(makeBtn("⚙","Réglages",function(){ post({type:"action",action:"settings",index:selectedIndex}); }));
    toolbar.appendChild(makeBtn("🗑","Supprimer",function(){ post({type:"action",action:"delete",index:selectedIndex}); }));
    el.appendChild(toolbar);
  }

  // --- glisser-déposer des blocs (via la poignée de la barre d'outils) ----
  var dragFrom = null;
  function onGripDragStart(ev, index){
    dragFrom = index;
    var el = document.querySelector('[data-bd-block="'+index+'"]');
    if(el) el.classList.add("bd-ed-dragging");
    if(ev.dataTransfer){ ev.dataTransfer.effectAllowed = "move"; try{ ev.dataTransfer.setData("text/plain", String(index)); }catch(e){} }
    document.querySelectorAll(".bd-ed-insert").forEach(function(z){ z.classList.add("bd-ed-drop-armed"); });
  }
  function onGripDragEnd(){
    var el = dragFrom!==null ? document.querySelector('[data-bd-block="'+dragFrom+'"]') : null;
    if(el) el.classList.remove("bd-ed-dragging");
    document.querySelectorAll(".bd-ed-insert").forEach(function(z){ z.classList.remove("bd-ed-drop-armed","bd-ed-drop-target"); });
    dragFrom = null;
  }

  // --- zones d'insertion "+" (aussi cibles de dépôt pour le glisser-déposer) ---
  function addInsertZones(){
    var bs = blocks();
    function zone(at){
      var z=document.createElement("div"); z.className="bd-ed-insert"; z.setAttribute("contenteditable","false");
      var b=document.createElement("button"); b.type="button"; b.textContent="+"; b.title="Insérer un bloc ici";
      b.addEventListener("mousedown", function(ev){ ev.preventDefault(); ev.stopPropagation(); });
      b.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); post({type:"insert", at:at}); });
      z.appendChild(b);
      z.addEventListener("dragover", function(ev){
        if(dragFrom===null) return;
        ev.preventDefault();
        if(ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
        z.classList.add("bd-ed-drop-target");
      });
      z.addEventListener("dragleave", function(){ z.classList.remove("bd-ed-drop-target"); });
      z.addEventListener("drop", function(ev){
        ev.preventDefault();
        z.classList.remove("bd-ed-drop-target");
        if(dragFrom===null) return;
        var to = at;
        if(to!==dragFrom && to!==dragFrom+1){ post({type:"action", action:"reorder", index:dragFrom, to:to}); }
      });
      return z;
    }
    if(bs.length===0){
      var empty=document.querySelector(".bd-ed-empty-host");
      return;
    }
    bs.forEach(function(el, i){ el.parentNode.insertBefore(zone(i), el); });
    var last=bs[bs.length-1];
    last.parentNode.insertBefore(zone(bs.length), last.nextSibling);
  }

  window.addEventListener("message", function(e){
    var d=e.data||{};
    if(d.type==="select"){ select(d.index, false); }
  });

  addInsertZones();
  post({ type:"ready" });
})();
`;

  return `<style>${css}</style><script>${js}</script>`;
}
