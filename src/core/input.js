// Keyboard / mouse / touch input
export class Input {
  constructor(dom) {
    this.dom = dom;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered this frame
    this.move = { x: 0, y: 0 };
    this.camDelta = { x: 0, y: 0 };
    this.wheel = 0;
    this.mouseDown = false;
    this.enabled = true;
    this.touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if ([' ', 'tab'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    // Mouse: left = attack, right drag = orbit camera
    let dragging = false, lastX = 0, lastY = 0, dragDist = 0;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.pressed.add('mouse0'); this.mouseDown = true; }
      if (e.button === 2 || e.button === 1) { dragging = true; lastX = e.clientX; lastY = e.clientY; dragDist = 0; }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; if (e.button === 2 || e.button === 1) dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.camDelta.x += e.clientX - lastX; this.camDelta.y += e.clientY - lastY;
      dragDist += Math.abs(e.clientX - lastX);
      lastX = e.clientX; lastY = e.clientY;
    });
    dom.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    // Touch camera drag on canvas (joystick handled by UI)
    const touches = new Map();
    dom.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }, { passive: true });
    dom.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        const p = touches.get(t.identifier);
        if (!p) continue;
        this.camDelta.x += (t.clientX - p.x) * 1.2; this.camDelta.y += (t.clientY - p.y) * 1.2;
        p.x = t.clientX; p.y = t.clientY;
      }
      e.preventDefault();
    }, { passive: false });
    dom.addEventListener('touchend', (e) => { for (const t of e.changedTouches) touches.delete(t.identifier); });

    this.joy = { x: 0, y: 0 };
  }

  // virtual buttons from UI
  press(k) { this.pressed.add(k); }
  hold(k, on) { if (on) { if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k); } else this.keys.delete(k); }

  update() {
    let x = 0, y = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) y += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    x += this.joy.x; y += this.joy.y;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.move.x = x; this.move.y = y;
  }

  wasPressed(k) { return this.enabled && this.pressed.has(k); }
  isDown(k) { return this.enabled && this.keys.has(k); }
  endFrame() { this.pressed.clear(); this.camDelta.x = 0; this.camDelta.y = 0; this.wheel = 0; }
}
