// Interactive "How to play" tutorial for Anamor's Block Puzzle.
// Same rules as the game: 8x8 board, three blocks, rows/columns clear, combos, game over when nothing fits.
(function () {
  "use strict";
  var N = 8;
  var COLORS = ["#FF4D6D", "#FF9F1C", "#FFD60A", "#3DDC84", "#22D3EE", "#4D7CFE", "#B15CFF"];
  var SHAPES = {
    mono: ["X"], i2_h: ["XX"], i2_v: ["X", "X"], i3_h: ["XXX"], i3_v: ["X", "X", "X"],
    l3_a: ["X.", "XX"], l3_b: [".X", "XX"], l3_c: ["XX", "X."], l3_d: ["XX", ".X"],
    i4_h: ["XXXX"], i4_v: ["X", "X", "X", "X"], sq2: ["XX", "XX"],
    l4_a: ["X.", "X.", "XX"], l4_b: ["XXX", "X.."], j4_a: [".X", ".X", "XX"], j4_b: ["X..", "XXX"],
    t4_a: ["XXX", ".X."], t4_c: [".X.", "XXX"], s4_h: [".XX", "XX."], z4_h: ["XX.", ".XX"],
    i5_h: ["XXXXX"], i5_v: ["X", "X", "X", "X", "X"], sq3: ["XXX", "XXX", "XXX"],
    l5_a: ["X..", "X..", "XXX"], plus5: [".X.", "XXX", ".X."], rect_w3h2: ["XXX", "XXX"]
  };
  var FREE_POOL = ["mono", "i2_h", "i2_v", "i3_h", "i3_v", "l3_a", "l3_b", "l3_c", "l3_d", "sq2", "i4_h", "i4_v",
    "l4_a", "l4_b", "j4_a", "j4_b", "t4_a", "t4_c", "s4_h", "z4_h", "i5_h", "i5_v", "l5_a", "plus5", "sq3", "rect_w3h2"];
  var MULT = [1, 1.2, 1.5, 2, 2.5, 3];
  var LINE_TABLE = [0, 100, 300, 600, 1000, 1500, 2000];

  var STEPS = [
    { en: "Drag the glowing block into the gap to fill the bottom row.",
      de: "Zieh den Block in die Lücke, um die unterste Reihe zu füllen.",
      board: ["........", "........", "........", "........", "........", "........", "........", "XXXXXX.."],
      tray: ["i2_h"], at: [6, 7] },
    { en: "Columns clear too! Fill this column.",
      de: "Auch Spalten werden geleert! Füll diese Spalte.",
      board: ["..X.....", "..X.....", "..X.....", "..X.....", "..X.....", "..X.....", "........", "........"],
      tray: ["i2_v"], at: [2, 6] },
    { en: "Clear a row and a column at once for a big bonus!",
      de: "Leere eine Reihe und eine Spalte gleichzeitig für einen großen Bonus!",
      board: ["....X...", "....X...", "....X...", "....X...", "XXXX.XXX", "....X...", "....X...", "....X..."],
      tray: ["mono"], at: [4, 4] },
    { en: "Your turn! Place all three blocks to get new ones. The game ends when none of them fits – plan ahead.",
      de: "Jetzt du! Leg alle drei Blöcke, dann kommen neue. Das Spiel endet, wenn keiner mehr passt – plane voraus.",
      free: true }
  ];

  var el = {}, board = [], tray = [], step = 0, score = 0, combo = -1, misses = 0, busy = false, drag = null;

  function $(id) { return document.getElementById(id); }
  function cellSize() { return el.cells[0].getBoundingClientRect().width + 4; }
  function gridOrigin() { var r = el.cells[0].getBoundingClientRect(); return { left: r.left - 2, top: r.top - 2 }; }
  function shapeCells(id) {
    var rows = SHAPES[id], out = [];
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) if (rows[y][x] === "X") out.push([x, y]);
    return out;
  }
  function shapeSize(id) { var r = SHAPES[id]; var w = 0; r.forEach(function (s) { w = Math.max(w, s.length); }); return [w, r.length]; }
  function msg(en, de) { el.msg.innerHTML = '<span data-lang="en">' + en + '</span><span data-lang="de">' + de + "</span>"; }

  function makeBlock(color) {
    var b = document.createElement("div");
    b.className = "cb";
    b.style.setProperty("--c", color);
    return b;
  }

  // ---------- board ----------
  function buildBoard() {
    el.board.innerHTML = "";
    el.cells = [];
    for (var i = 0; i < N * N; i++) {
      var c = document.createElement("div");
      c.className = "tc";
      el.board.appendChild(c);
      el.cells.push(c);
    }
  }
  function render() {
    for (var i = 0; i < N * N; i++) {
      var c = el.cells[i];
      c.innerHTML = "";
      if (board[i]) c.appendChild(makeBlock(board[i]));
    }
  }
  function canPlace(id, ax, ay) {
    var cs = shapeCells(id);
    for (var k = 0; k < cs.length; k++) {
      var x = ax + cs[k][0], y = ay + cs[k][1];
      if (x < 0 || y < 0 || x >= N || y >= N || board[y * N + x]) return false;
    }
    return true;
  }
  function fitsAnywhere(id) {
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (canPlace(id, x, y)) return true;
    return false;
  }
  function fullLines(b) {
    var rows = [], cols = [];
    for (var y = 0; y < N; y++) { var f = true; for (var x = 0; x < N; x++) if (!b[y * N + x]) { f = false; break; } if (f) rows.push(y); }
    for (var x2 = 0; x2 < N; x2++) { var g = true; for (var y2 = 0; y2 < N; y2++) if (!b[y2 * N + x2]) { g = false; break; } if (g) cols.push(x2); }
    return { rows: rows, cols: cols };
  }

  // ---------- tray ----------
  function renderTray() {
    el.tray.innerHTML = "";
    tray.forEach(function (p, i) {
      var slot = document.createElement("div");
      slot.className = "slot";
      if (p) {
        var wh = shapeSize(p.id);
        var piece = document.createElement("div");
        piece.className = "piece" + (fitsAnywhere(p.id) ? "" : " dim");
        piece.style.gridTemplateColumns = "repeat(" + wh[0] + ", var(--ts))";
        piece.style.gridTemplateRows = "repeat(" + wh[1] + ", var(--ts))";
        shapeCells(p.id).forEach(function (c) {
          var b = makeBlock(p.color);
          b.style.gridColumn = c[0] + 1;
          b.style.gridRow = c[1] + 1;
          piece.appendChild(b);
        });
        piece.addEventListener("pointerdown", function (e) { startDrag(e, i, piece); });
        slot.appendChild(piece);
      }
      el.tray.appendChild(slot);
    });
  }

  // ---------- drag & drop ----------
  function startDrag(e, slot, piece) {
    if (busy || drag) return;
    e.preventDefault();
    var p = tray[slot], cs = cellSize(), wh = shapeSize(p.id);
    var ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.width = wh[0] * cs + "px";
    ghost.style.height = wh[1] * cs + "px";
    shapeCells(p.id).forEach(function (c) {
      var b = makeBlock(p.color);
      b.style.left = c[0] * cs + "px"; b.style.top = c[1] * cs + "px";
      b.style.width = cs + "px"; b.style.height = cs + "px";
      ghost.appendChild(b);
    });
    document.body.appendChild(ghost);
    piece.classList.add("lifted");
    drag = { slot: slot, piece: piece, ghost: ghost, id: p.id, color: p.color, w: wh[0], h: wh[1], cs: cs,
             lift: e.pointerType === "touch" ? cs * 1.3 : cs * 0.3, anchor: null, valid: false };
    piece.setPointerCapture(e.pointerId);
    piece.addEventListener("pointermove", moveDrag);
    piece.addEventListener("pointerup", endDrag);
    piece.addEventListener("pointercancel", endDrag);
    moveDrag(e);
  }
  function moveDrag(e) {
    if (!drag) return;
    var left = e.clientX - drag.w * drag.cs / 2, top = e.clientY - drag.h * drag.cs - drag.lift;
    drag.ghost.style.transform = "translate(" + left + "px," + top + "px)";
    var r = gridOrigin();
    var ax = Math.round((left - r.left) / drag.cs), ay = Math.round((top - r.top) / drag.cs);
    var over = ax > -drag.w && ay > -drag.h && ax < N && ay < N;
    clearPreview();
    drag.anchor = over ? [ax, ay] : null;
    drag.valid = over && canPlace(drag.id, ax, ay);
    if (!over) return;
    shapeCells(drag.id).forEach(function (c) {
      var x = ax + c[0], y = ay + c[1];
      if (x >= 0 && y >= 0 && x < N && y < N) el.cells[y * N + x].classList.add(drag.valid ? "ok" : "bad");
    });
    if (drag.valid) {
      var test = board.slice();
      shapeCells(drag.id).forEach(function (c) { test[(ay + c[1]) * N + ax + c[0]] = drag.color; });
      var l = fullLines(test);
      l.rows.forEach(function (y) { for (var x = 0; x < N; x++) el.cells[y * N + x].classList.add("hl"); });
      l.cols.forEach(function (x) { for (var y = 0; y < N; y++) el.cells[y * N + x].classList.add("hl"); });
    }
  }
  function clearPreview() {
    el.cells.forEach(function (c) { c.classList.remove("ok", "bad", "hl"); });
  }
  function endDrag(e) {
    if (!drag) return;
    var d = drag;
    drag = null;
    d.piece.removeEventListener("pointermove", moveDrag);
    d.piece.removeEventListener("pointerup", endDrag);
    d.piece.removeEventListener("pointercancel", endDrag);
    clearPreview();
    var st = STEPS[step];
    var ok = d.valid && (!st.at || (d.anchor[0] === st.at[0] && d.anchor[1] === st.at[1]));
    if (!ok) {
      d.ghost.classList.add("back");
      var pr = d.piece.getBoundingClientRect();
      d.ghost.style.transform = "translate(" + pr.left + "px," + pr.top + "px) scale(0.5)";
      setTimeout(function () { d.ghost.remove(); d.piece.classList.remove("lifted"); }, 180);
      return;
    }
    d.ghost.remove();
    place(d.slot, d.anchor[0], d.anchor[1]);
  }

  // ---------- moves ----------
  function place(slot, ax, ay) {
    var p = tray[slot], cs = shapeCells(p.id);
    cs.forEach(function (c) { board[(ay + c[1]) * N + ax + c[0]] = p.color; });
    tray[slot] = null;
    render();
    cs.forEach(function (c) { var b = el.cells[(ay + c[1]) * N + ax + c[0]].firstChild; if (b) b.classList.add("pop"); });
    var l = fullLines(board), n = l.rows.length + l.cols.length;
    var pts = cs.length;
    if (n > 0) {
      combo = combo >= 0 ? combo + 1 : 0; misses = 0;
      pts += Math.round((n < LINE_TABLE.length ? LINE_TABLE[n] : 2000 + (n - 6) * 250) * MULT[Math.min(combo, 5)]);
      busy = true;
      var hit = {};
      l.rows.forEach(function (y) { for (var x = 0; x < N; x++) hit[y * N + x] = 1; });
      l.cols.forEach(function (x) { for (var y = 0; y < N; y++) hit[y * N + x] = 1; });
      Object.keys(hit).forEach(function (i) { var b = el.cells[i].firstChild; if (b) b.classList.add("clear"); });
      l.rows.forEach(function (y) { beam(true, y); });
      l.cols.forEach(function (x) { beam(false, x); });
      if (combo >= 1) popText("Combo ×" + (combo + 1) + "!", "pink");
      else if (n >= 2) popText(n >= 4 ? "Amazing!" : n === 3 ? "Excellent!" : "Great!", "gold");
      setTimeout(function () {
        Object.keys(hit).forEach(function (i) { board[i] = 0; });
        render();
        busy = false;
        afterMove(true);
      }, 380);
    } else {
      if (combo >= 0 && ++misses > 2) { combo = -1; misses = 0; }
      afterMove(false);
    }
    score += pts;
    el.points.textContent = score;
  }
  function afterMove(cleared) {
    var st = STEPS[step];
    if (!st.free) {
      if (cleared) setTimeout(function () { setStep(step + 1); }, 650);
      return;
    }
    if (tray.every(function (p) { return !p; })) dealFree();
    renderTray();
    var alive = tray.some(function (p) { return p && fitsAnywhere(p.id); });
    if (!alive) {
      msg("No more moves – final score " + score + ". That's the whole game! Tap “Restart tutorial” or play another round.",
          "Keine Züge mehr – Endstand " + score + ". Das ist schon das ganze Spiel! Tippe auf „Tutorial neu starten“ oder spiel noch eine Runde.");
      el.board.classList.add("over");
      var again = document.createElement("button");
      again.className = "btn"; again.type = "button";
      again.innerHTML = '<span data-lang="en">Play again</span><span data-lang="de">Nochmal spielen</span>';
      again.onclick = function () { setStep(STEPS.length - 1); };
      el.msg.appendChild(document.createElement("br"));
      el.msg.appendChild(again);
    }
  }
  function beam(horizontal, i) {
    var b = document.createElement("div");
    b.className = "beam " + (horizontal ? "h" : "v");
    b.style.setProperty("--i", i);
    el.board.appendChild(b);
    setTimeout(function () { b.remove(); }, 500);
  }
  function popText(text, cls) {
    var t = document.createElement("div");
    t.className = "pop-text " + cls;
    t.textContent = text;
    el.board.appendChild(t);
    setTimeout(function () { t.remove(); }, 1000);
  }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function dealFree() {
    for (var attempt = 0; attempt < 30; attempt++) {
      var ids = [rnd(FREE_POOL), rnd(FREE_POOL), rnd(FREE_POOL)];
      if (ids.some(fitsAnywhere) || attempt === 29) {
        var cols = COLORS.slice().sort(function () { return Math.random() - 0.5; });
        tray = ids.map(function (id, k) { return { id: id, color: cols[k] }; });
        return;
      }
    }
  }

  // ---------- steps ----------
  function setStep(s) {
    step = s;
    var st = STEPS[s];
    el.board.classList.remove("over");
    board = new Array(N * N).fill(0);
    if (st.board) {
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (st.board[y][x] === "X") board[y * N + x] = COLORS[(x * 3 + y) % COLORS.length];
    }
    combo = -1; misses = 0;
    if (st.free) { score = 0; el.points.textContent = "0"; dealFree(); el.score.hidden = false; }
    else { tray = st.tray.map(function (id) { return { id: id, color: COLORS[6] }; }).concat([null, null]).slice(0, 3); el.score.hidden = true; }
    msg(st.en, st.de);
    render();
    renderTray();
    el.cells.forEach(function (c) { c.classList.remove("target"); });
    if (st.at) {
      shapeCells(st.tray[0]).forEach(function (c) { el.cells[(st.at[1] + c[1]) * N + st.at[0] + c[0]].classList.add("target"); });
    }
    el.steps.innerHTML = STEPS.map(function (_, k) { return '<span class="dot' + (k < s ? " done" : k === s ? " now" : "") + '"></span>'; }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    el.board = $("tut-board"); el.tray = $("tut-tray"); el.msg = $("tut-msg"); el.steps = $("tut-steps");
    el.score = $("tut-score"); el.points = $("tut-points");
    if (!el.board) return;
    buildBoard();
    $("tut-restart").onclick = function () { setStep(0); };
    $("tut-free").onclick = function () { setStep(STEPS.length - 1); };
    setStep(0);
  });
})();
