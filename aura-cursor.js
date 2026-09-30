/*
 * Serenity Stays: "aura" cursor glow
 *
 * A soft, glowing fluid effect that follows the cursor (or finger on phones).
 * It sits on top of the page but never blocks clicks or scrolling.
 *
 * Built on the open source "webgl-fluid" library (pinned to v0.4.0 and
 * integrity-checked), loaded from jsDelivr like the hero frames already are.
 *
 * NOTE: Do NOT add code that tears down / rebuilds the WebGL context on
 * resize, rotate or scroll (no loseContext()/restoreContext()). The library
 * already resizes its own drawing buffers every frame, and a manual restart
 * causes a white flash across the whole page. The only rebuild here is for a
 * genuine, browser-reported GPU context loss.
 */
(function () {
  "use strict";

  if (window.__auraCursorInit) return;
  window.__auraCursorInit = true;

  // Respect visitors who turn off motion in their device settings.
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var LIB_SRC = "https://cdn.jsdelivr.net/npm/webgl-fluid@0.4.0/dist/webgl-fluid.umd.js";
  var LIB_INTEGRITY = "sha384-u+WE/t6r8FvSz0wY0iciY6oFV1ppCCi4YM7YaZCLHh+uLLZIlMyqDSnEBBGzu0Ml";

  // Sits above the nav bar (z-index 1000) but below the photo lightbox (9999).
  var Z_INDEX = 9998;
  var OPACITY = 0.55;

  // Desktop look: soft, colorful "smokey cursor" (longer, swirlier trails).
  var DESKTOP_CONFIG = {
    IMMEDIATE: false,
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1440,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 3.5,
    VELOCITY_DISSIPATION: 2,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: 20,
    CURL: 3,
    SPLAT_RADIUS: 0.2,
    SPLAT_FORCE: 6000,
    SHADING: true,
    TRANSPARENT: true,
    COLORFUL: true,
    COLOR_UPDATE_SPEED: 10,
    SUNRAYS: false,
    BLOOM: false,
    BLOOM_INTENSITY: 0.35,
    BLOOM_THRESHOLD: 0.85
  };

  // Lighter version for touch screens (same as leepai.io).
  var MOBILE_CONFIG = {};
  var k;
  for (k in DESKTOP_CONFIG) MOBILE_CONFIG[k] = DESKTOP_CONFIG[k];
  MOBILE_CONFIG.VELOCITY_DISSIPATION = 3;
  MOBILE_CONFIG.CURL = 0;
  MOBILE_CONFIG.SPLAT_FORCE = 2000;
  MOBILE_CONFIG.SHADING = false;
  MOBILE_CONFIG.COLOR_UPDATE_SPEED = 2;
  MOBILE_CONFIG.BLOOM = true;
  MOBILE_CONFIG.SIM_RESOLUTION = 64;
  MOBILE_CONFIG.DYE_RESOLUTION = 512;
  MOBILE_CONFIG.DENSITY_DISSIPATION = 4;
  MOBILE_CONFIG.SPLAT_RADIUS = 0.25;
  MOBILE_CONFIG.SUNRAYS = true;
  MOBILE_CONFIG.BLOOM_INTENSITY = 0.8;
  MOBILE_CONFIG.BLOOM_THRESHOLD = 0.6;

  var isTouch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  var TOUCH_EVENTS = ["touchstart", "touchmove", "touchend", "touchcancel"];

  var wrap = null;
  var canvas = null;
  var libReady = false;
  var wantStart = false;
  var started = false;
  var touching = false;
  var lastX = 0;
  var lastY = 0;
  var lastBuild = 0;

  function getFluid() {
    var f = window.WebGLFluid;
    if (f && typeof f !== "function" && typeof f.default === "function") f = f.default;
    return typeof f === "function" ? f : null;
  }

  function unmount() {
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    wrap = null;
    canvas = null;
  }

  function mount() {
    unmount();

    wrap = document.createElement("div");
    wrap.id = "aura-cursor";
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText =
      "position:fixed;top:0;right:0;bottom:0;left:0;z-index:" + Z_INDEX + ";" +
      "pointer-events:none;transform:translateZ(0);-webkit-transform:translateZ(0);will-change:transform;";

    canvas = document.createElement("canvas");
    canvas.id = "aura-cursor-canvas";
    canvas.style.cssText =
      "display:block;width:100%;height:100%;pointer-events:none;" +
      "mix-blend-mode:normal;opacity:" + OPACITY + ";transition:opacity 0.6s ease;";

    // Real, browser-reported GPU context loss only.
    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
    }, false);
    canvas.addEventListener("webglcontextrestored", function () {
      begin();
    }, false);

    wrap.appendChild(canvas);
    document.body.appendChild(wrap);
  }

  // Build a fresh canvas and start the simulation on it.
  function begin() {
    var fluid = getFluid();
    if (!fluid) return;
    lastBuild = Date.now();
    mount();

    var realAdd = EventTarget.prototype.addEventListener;
    if (isTouch) {
      // The library wires up its own touch handlers, which expect a page that
      // never scrolls. Hold them back; touches are forwarded as mouse moves.
      EventTarget.prototype.addEventListener = function (type, fn, opts) {
        if (TOUCH_EVENTS.indexOf(type) !== -1) return;
        return realAdd.call(this, type, fn, opts);
      };
    }

    try {
      var cfg = {};
      var src = isTouch ? MOBILE_CONFIG : DESKTOP_CONFIG;
      for (var key in src) cfg[key] = src[key];
      fluid(canvas, cfg);
    } catch (err) {
      unmount(); // no WebGL or something went wrong: the site just carries on without the glow
    } finally {
      EventTarget.prototype.addEventListener = realAdd;
    }
  }

  // iPhone Safari can silently drop the GPU drawing surface after a lot of
  // scrolling. If the browser says it is gone, build a fresh one. This only
  // runs on a real, browser-reported loss, never on scroll or resize alone.
  function contextLost() {
    try {
      if (!canvas) return false;
      var gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      return !!(gl && gl.isContextLost && gl.isContextLost());
    } catch (err) {
      return false;
    }
  }

  function recoverIfLost() {
    if (started && Date.now() - lastBuild > 2000 && contextLost()) begin();
  }

  function tryStart() {
    if (started || !libReady || !wantStart) return;
    started = true;
    begin();
  }

  // The library listens on the canvas itself, but the canvas ignores the
  // pointer so clicks pass through. So pointer positions are forwarded to it.
  function send(type, x, y) {
    if (!canvas) return;
    try {
      var ev = new MouseEvent(type, { clientX: x, clientY: y, bubbles: false });
      // Safari miscounts offsets on fixed elements after scrolling, so set them directly.
      try {
        Object.defineProperty(ev, "offsetX", { value: x });
        Object.defineProperty(ev, "offsetY", { value: y });
      } catch (e2) {}
      canvas.dispatchEvent(ev);
    } catch (err) {}
  }

  window.addEventListener("mousemove", function (e) {
    send("mousemove", e.clientX, e.clientY);
  }, { passive: true });

  function onTouch(type) {
    return function (e) {
      wantStart = true;
      tryStart();
      recoverIfLost();
      var t = e.touches && e.touches[0];
      if (t) {
        touching = true;
        lastX = t.clientX;
        lastY = t.clientY;
        send(type, lastX, lastY);
      }
    };
  }
  window.addEventListener("touchstart", onTouch("mousedown"), { passive: true });
  window.addEventListener("touchmove", onTouch("mousemove"), { passive: true });
  function onTouchEnd() { touching = false; }
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });

  // Safari may pause touch-move events once a page scroll takes over. While a
  // finger is down, keep a gentle glow going under it as the page scrolls.
  if (isTouch) {
    var flip = 1;
    window.addEventListener("scroll", function () {
      if (!touching) return;
      flip = -flip;
      send("mousemove", lastX, lastY + flip * 6);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) recoverIfLost();
    });
    window.addEventListener("pageshow", recoverIfLost);
  }

  function loadLibrary(done) {
    if (getFluid()) { done(); return; }
    var s = document.createElement("script");
    s.src = LIB_SRC;
    s.integrity = LIB_INTEGRITY;
    s.crossOrigin = "anonymous";
    s.async = true;
    s.onload = done;
    s.onerror = function () {}; // fail quietly: the site works fine without the glow
    document.head.appendChild(s);
  }

  function boot() {
    loadLibrary(function () {
      libReady = true;
      tryStart();
    });
  }

  // Mouse devices start right away; touch devices start on the first touch.
  if (!isTouch) wantStart = true;

  if (window.requestIdleCallback) window.requestIdleCallback(boot, { timeout: 3000 });
  else setTimeout(boot, 800);
})();
