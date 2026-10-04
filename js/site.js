/* Dylan Thompson #99: the two bespoke moves on the hero.
   1. Helmet reveal: the pointer, or a finger slid across his face, leaves a
      fluid trail that shows his helmet. On touch the scroll also closes it on.
   2. Tear-off: past the hold, the bone hero peels away like a visor tear-off. */
(function () {
  var hero = document.getElementById('hero');
  var sheet = document.getElementById('sheet');
  var curl = document.getElementById('curl');
  var fig = document.getElementById('figure');
  var cv = document.getElementById('helmet');
  if (!hero || !sheet || !fig || !cv) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce) return; // static portrait, no peel, no canvas

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function heroP() { return parseFloat(hero.style.getPropertyValue('--sc-p')) || 0; }

  /* ---- helmet mask: a small alpha field, thresholded, scaled up ---------- */
  var MW = 96, MH = 144;
  var field = document.createElement('canvas'); field.width = MW; field.height = MH;
  var fx = field.getContext('2d', { willReadFrequently: true });
  var mask = document.createElement('canvas'); mask.width = MW; mask.height = MH;
  var mx = mask.getContext('2d');
  var out = mx.createImageData(MW, MH);
  var ctx = cv.getContext('2d');
  var helmet = new Image();
  var ready = false;
  helmet.onload = function () { ready = true; };
  helmet.src = cv.getAttribute('data-src');

  var W = 0, H = 0, rect = null;
  function size() {
    rect = fig.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(rect.width * d)), h = Math.max(1, Math.round(rect.height * d));
    if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; }
  }

  function blob(x, y, r, a) {
    var g = fx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    fx.fillStyle = g;
    fx.beginPath(); fx.arc(x, y, r, 0, 6.2832); fx.fill();
  }

  var last = null, lastMove = -1e9, dirty = true;
  function onMove(e) {
    if (!rect) return;
    var x = (e.clientX - rect.left) / rect.width * MW;
    var y = (e.clientY - rect.top) / rect.height * MH;
    if (x < -30 || x > MW + 30 || y < -30 || y > MH + 30) { last = null; return; }
    var steps = 1;
    if (last) steps = Math.max(1, Math.ceil(Math.hypot(x - last.x, y - last.y) / 5));
    for (var i = 1; i <= steps; i++) {
      var px = last ? last.x + (x - last.x) * i / steps : x;
      var py = last ? last.y + (y - last.y) * i / steps : y;
      blob(px, py, REACH, 0.5);
    }
    last = { x: x, y: y };
    lastMove = performance.now();
    dirty = true;
  }
  if (fine) window.addEventListener('pointermove', onMove, { passive: true });
  // Touch: a finger slid across his face paints the helmet the same way. The
  // listeners are passive, so a vertical slide still scrolls the page.
  var REACH = fine ? 19 : 24;
  function onTouch(e) { var t = e.touches[0]; if (t) onMove(t); }
  window.addEventListener('touchstart', function (e) { last = null; onTouch(e); }, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  window.addEventListener('touchend', function () { last = null; }, { passive: true });

  function paint(p, now) {
    // decay the trail
    fx.globalCompositeOperation = 'destination-out';
    fx.fillStyle = fine ? 'rgba(0,0,0,0.028)' : 'rgba(0,0,0,0.013)'; // a finger's trail lingers longer
    fx.fillRect(0, 0, MW, MH);
    fx.globalCompositeOperation = 'source-over';

    // idle: the chin bar, full width and centred on his head, so the helmet
    // reads as wrapping his jaw rather than as a patch stuck on his mouth.
    // The helmet spans x 0.19 to 0.80 at this height and ends at y 0.545.
    // Pointer only: a phone opens on his bare face until a finger or the scroll.
    if (fine && now - lastMove > 2200) {
      var cy = MH * (0.492 + 0.008 * Math.sin(now / 900));
      for (var bx = 0.2; bx <= 0.801; bx += 0.075) blob(MW * bx, cy, 14, 0.2);
      for (var cx = 0.35; cx <= 0.651; cx += 0.075) blob(MW * cx, cy + MH * 0.045, 12, 0.2); // the chin tip
      dirty = true;
    }
    if (!fine) {
      // touch: scroll also closes the helmet on from the chin up
      var lvl = smooth(clamp((p - 0.03) / 0.3, 0, 1));
      if (lvl > 0) {
        var top = MH * (0.62 - lvl * 0.7);
        var g = fx.createLinearGradient(0, top - 14, 0, top + 6);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.6)');
        fx.fillStyle = g; fx.fillRect(0, top - 14, MW, MH);
        dirty = true;
      }
    }

    var src = fx.getImageData(0, 0, MW, MH).data, dst = out.data, any = false;
    for (var i = 3; i < src.length; i += 4) {
      var a = (src[i] - 96) / 70; a = a < 0 ? 0 : a > 1 ? 1 : a;
      dst[i - 3] = dst[i - 2] = dst[i - 1] = 255;
      dst[i] = a * a * (3 - 2 * a) * 255;
      if (dst[i]) any = true;
    }
    if (!any && !dirty) return;
    dirty = any;
    mx.putImageData(out, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (!any || !ready) return;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mask, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(helmet, 0, 0, W, H);
  }

  /* ---- tear-off ---------------------------------------------------------- */
  var SLANT = 0.3;
  function peel(p) {
    var t = smooth(clamp((p - 0.42) / 0.44, 0, 1));
    if (t <= 0) { sheet.style.clipPath = 'none'; sheet.style.visibility = ''; curl.style.opacity = 0; return; }
    if (t >= 1) { sheet.style.visibility = 'hidden'; curl.style.opacity = 0; return; }
    var vw = window.innerWidth, vh = window.innerHeight;
    var x1 = (1 + SLANT) - t * (1 + 2 * SLANT + 0.14);
    var x2 = x1 - SLANT;
    sheet.style.visibility = '';
    sheet.style.clipPath = 'polygon(0 0,' + (x1 * 100).toFixed(2) + '% 0,' + (x2 * 100).toFixed(2) + '% 100%,0 100%)';
    var cw = curl.offsetWidth;
    var ang = -Math.atan((SLANT * vw) / (vh * 1.04)) * 180 / Math.PI;
    curl.style.opacity = 1;
    curl.style.transform = 'translate3d(' + (x1 * vw - cw + SLANT * vw * 0.02).toFixed(1) + 'px,0,0) skewX(' + ang.toFixed(2) + 'deg)';
  }

  var running = false;
  function frame(now) {
    var p = heroP();
    var r = hero.getBoundingClientRect();
    if (r.bottom < 0) { running = false; return; }
    size();
    peel(p);
    if (p < 0.9) paint(p, now);
    requestAnimationFrame(frame);
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);
  wake();
})();

/* Lap readout: tied to the same progress the 40 ticks read, so the number and
   the lit tick never disagree. */
(function () {
  var peak = document.querySelector('.peak'), lap = document.getElementById('lap');
  if (!peak || !lap) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { lap.textContent = '40'; return; }
  var shown = 1, queued = false;
  function read() {
    queued = false;
    var p = parseFloat(peak.style.getPropertyValue('--sc-p')) || 0;
    var n = Math.min(40, Math.max(1, Math.floor(p * 68) + 1));
    if (n !== shown) { shown = n; lap.textContent = n; }
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(read); } }, { passive: true });
  read();
})();
