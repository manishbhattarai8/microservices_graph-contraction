const baseNodes = [
    { id: "gateway", name: "API Gateway", x: 110, y: 250, c: "#725cff" },
    { id: "auth", name: "Auth", x: 275, y: 120, c: "#4cbfd0" },
    { id: "orders", name: "Orders", x: 292, y: 270, c: "#ff8196" },
    { id: "inventory", name: "Inventory", x: 470, y: 180, c: "#f1b64c" },
    { id: "payments", name: "Payments", x: 475, y: 350, c: "#ff8196" },
    { id: "notify", name: "Notify", x: 660, y: 115, c: "#4cbfd0" },
    { id: "analytics", name: "Analytics", x: 670, y: 290, c: "#725cff" },
    { id: "legacy", name: "Legacy CRM", x: 670, y: 430, c: "#a9abb8" },
  ],
  baseEdges = [
    ["gateway", "auth"],
    ["gateway", "orders"],
    ["auth", "orders"],
    ["orders", "inventory"],
    ["orders", "payments"],
    ["orders", "analytics"],
    ["inventory", "notify"],
    ["payments", "notify"],
    ["payments", "analytics"],
  ];
let nodes, edges, selected;
const $ = (s) => document.querySelector(s),
  svg = $("#graph");
function groups() {
  let seen = new Set(),
    out = [];
  nodes.forEach((n) => {
    if (seen.has(n.id)) return;
    let st = [n.id],
      g = [];
    seen.add(n.id);
    while (st.length) {
      let id = st.pop();
      g.push(id);
      edges.forEach(([a, b]) => {
        let q = a === id ? b : b === id ? a : null;
        if (q && !seen.has(q)) {
          seen.add(q);
          st.push(q);
        }
      });
    }
    out.push(g);
  });
  return out;
}
function deg(id) {
  return edges.filter((e) => e.includes(id)).length;
}
function render() {
  let map = Object.fromEntries(nodes.map((n) => [n.id, n]));
  svg.innerHTML =
    edges
      .map(([a, b]) =>
        map[a] && map[b]
          ? '<line class="edge ' +
            (selected.has(a) && selected.has(b) ? "selected-edge" : "") +
            '" x1="' +
            map[a].x +
            '" y1="' +
            map[a].y +
            '" x2="' +
            map[b].x +
            '" y2="' +
            map[b].y +
            '"/>'
          : "",
      )
      .join("") +
    nodes
      .map(
        (n) =>
          '<g class="node ' +
          (selected.has(n.id) ? "selected" : "") +
          '" data-id="' +
          n.id +
          '" transform="translate(' +
          n.x +
          "," +
          n.y +
          ')"><circle r="31" fill="' +
          n.c +
          '" stroke="#fff"/><text class="node-icon" y="5">+</text><text y="49">' +
          n.name +
          '</text><text class="type" y="63">SERVICE</text></g>',
      )
      .join("");
  svg.querySelectorAll(".node").forEach(
    (e) =>
      (e.onclick = () => {
        selected.has(e.dataset.id)
          ? selected.delete(e.dataset.id)
          : selected.add(e.dataset.id);
        render();
      }),
  );
  let g = groups();
  $("#serviceCount").textContent = nodes.length;
  $("#edgeCount").textContent = edges.length;
  $("#groupCount").textContent = g.length;
  $("#selection").innerHTML = selected.size
    ? [...selected]
        .map((x) => '<span class="service-chip">' + map[x].name + "</span>")
        .join("")
    : '<div class="empty-icon">+</div><p>No services selected</p><small>Select nodes in the map.</small>';
  $("#selectedCount").textContent = selected.size + " SELECTED";
  let k = edges.filter((e) => selected.has(e[0]) && selected.has(e[1])).length,
    ok = selected.size > 1;
  $("#callReduction").textContent = ok ? k + " internalized" : "-";
  $("#unitChange").textContent = ok
    ? "-" + (selected.size - 1) + " units"
    : "-";
  $("#confidence").textContent = ok ? Math.min(98, 72 + k * 8) + "%" : "-";
  $("#contractBottom").disabled = !ok;
  $("#components").innerHTML = g
    .map(
      (x, i) =>
        '<article class="component"><div class="component-top"><span class="component-id">GROUP 0' +
        (i + 1) +
        '</span><span class="status ' +
        (x.length === 1 ? "isolated" : "connected") +
        '">' +
        (x.length === 1 ? "ISOLATED" : "CONNECTED") +
        "</span></div><h3>" +
        x.length +
        ' service deployment group</h3><div class="service-list">' +
        x
          .map((id) => '<span class="mini">' + map[id].name + "</span>")
          .join("") +
        "</div></article>",
    )
    .join("");
  $("#metrics").innerHTML =
    "<div>Components <b>" +
    g.length +
    "</b></div><div>Largest component <b>" +
    Math.max(...g.map((x) => x.length)) +
    " services</b></div><div>Average degree <b>" +
    ((edges.length * 2) / nodes.length).toFixed(1) +
    "</b></div><div>Critical services <b>" +
    nodes
      .slice()
      .sort((a, b) => deg(b.id) - deg(a.id))
      .slice(0, 2)
      .map((n) => n.name)
      .join(", ") +
    "</b></div>";
  let f = $("#failureSelect"),
    v = f.value;
  f.innerHTML =
    '<option value="">Choose a service</option>' +
    nodes
      .map((n) => '<option value="' + n.id + '">' + n.name + "</option>")
      .join("");
  f.value = v;
}
function toast(s) {
  let t = $("#toast");
  t.textContent = s;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
function contract() {
  if (selected.size < 2) return;
  let list = [...selected],
    picked = nodes.filter((n) => selected.has(n.id)),
    u = {
      id: "unit" + Date.now(),
      name: "Module (" + list.length + ")",
      x: picked.reduce((s, n) => s + n.x, 0) / list.length,
      y: picked.reduce((s, n) => s + n.y, 0) / list.length,
      c: "#725cff",
    },
    out = [],
    seen = new Set();
  edges.forEach(([a, b]) => {
    let A = selected.has(a) ? u.id : a,
      B = selected.has(b) ? u.id : b,
      key = [A, B].sort().join("-");
    if (A !== B && !seen.has(key)) {
      seen.add(key);
      out.push([A, B]);
    }
  });
  nodes = nodes.filter((n) => !selected.has(n.id));
  nodes.push(u);
  edges = out;
  selected.clear();
  render();
  toast("Deployment unit created");
}
function reset() {
  nodes = structuredClone(baseNodes);
  edges = structuredClone(baseEdges);
  selected = new Set();
  render();
}
document
  .querySelector(".right-panel")
  .insertAdjacentHTML(
    "beforeend",
    '<div class="impact" id="failureBox"><p>FAILURE SIMULATION</p><select id="failureSelect" style="width:100%;padding:7px;border:1px solid #ddd;border-radius:4px"></select><button class="ghost" id="simulate" style="margin-top:8px">Simulate failure</button></div>',
  );
document
  .querySelector(".bottom")
  .insertAdjacentHTML(
    "beforebegin",
    '<section id="metrics" style="display:flex;gap:32px;padding:17px 22px;margin-top:25px;background:#27273c;color:#fff;border-radius:8px;font:11px Manrope"></section>',
  );
$("#reset").onclick = reset;
$("#contract").onclick = contract;
$("#contractBottom").onclick = contract;
$("#cluster").onclick = () => {
  selected = new Set(
    nodes
      .filter((n) => ["orders", "inventory", "payments"].includes(n.id))
      .map((n) => n.id),
  );
  render();
  toast("Suggested module: Commerce Core (96% confidence)");
};
$("#simulate").onclick = () => {
  let id = $("#failureSelect").value;
  if (!id) return toast("Choose a service first");
  let n = nodes.find((x) => x.id === id);
  nodes = nodes.filter((x) => x.id !== id);
  edges = edges.filter((x) => !x.includes(id));
  selected.delete(id);
  render();
  toast(n.name + " failed: graph recomputed");
};
reset();
