/* ============================================================
   YOFLY CREW — JAVASCRIPT
   Scroll animations · Particles · Counter · Cursor · Carousel
   ============================================================ */

// ============ CUSTOM CURSOR ============
const cursor = document.getElementById('cursor');
const cursorFollower = document.getElementById('cursorFollower');
let mouseX = 0, mouseY = 0;
let followerX = 0, followerY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursor.style.left = mouseX + 'px';
  cursor.style.top = mouseY + 'px';
});

function animateCursorFollower() {
  followerX += (mouseX - followerX) * 0.15;
  followerY += (mouseY - followerY) * 0.15;
  cursorFollower.style.left = followerX + 'px';
  cursorFollower.style.top = followerY + 'px';
  requestAnimationFrame(animateCursorFollower);
}
animateCursorFollower();

// Cursor interactions
document.querySelectorAll('a, button, .feature-card, .testimonial-card, .store-btn').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(2)';
    cursorFollower.style.transform = 'translate(-50%, -50%) scale(1.5)';
    cursorFollower.style.borderColor = 'var(--accent)';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
    cursorFollower.style.borderColor = 'var(--primary)';
  });
});

// ============ NAVIGATION ============
const nav = document.getElementById('nav');
const navBurger = document.getElementById('navBurger');
const mobileNav = document.getElementById('mobileNav');

if (nav) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

if (navBurger && mobileNav) {
  navBurger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
  });
}

const mobileNavClose = document.getElementById('mobileNavClose');
if (mobileNavClose && mobileNav) {
  mobileNavClose.addEventListener('click', () => {
    mobileNav.classList.remove('open');
  });
}

document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', () => mobileNav && mobileNav.classList.remove('open'));
});

// ============ PARTICLES ============
const canvas = document.getElementById('particlesCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.8 - 0.2,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '#FF00FF' : '#00FFFF',
      life: 1,
      maxLife: Math.random() * 200 + 100
    };
  }

  for (let i = 0; i < 80; i++) {
    particles.push(createParticle());
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      
      const alpha = (p.life / p.maxLife) * p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
      
      if (p.life <= 0) {
        particles[i] = createParticle();
      }
    });
    
    animFrame = requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

// ============ SCROLL REVEAL ============
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal-up, .reveal-right').forEach(el => {
  revealObserver.observe(el);
});

// ============ COUNTER ANIMATION ============
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  
  const update = () => {
    current += step;
    if (current >= target) {
      el.textContent = target.toLocaleString();
    } else {
      el.textContent = Math.floor(current).toLocaleString();
      requestAnimationFrame(update);
    }
  };
  
  update();
}

const statsSection = document.querySelector('.hero-stats');
let countersStarted = false;

const statsObserver = new IntersectionObserver((entries) => {
  if (entries[0] && entries[0].isIntersecting && !countersStarted) {
    countersStarted = true;
    document.querySelectorAll('.stat-num').forEach(el => {
      setTimeout(() => animateCounter(el), 300);
    });
  }
});

if (statsSection) statsObserver.observe(statsSection);

// ============ STEP LINE ANIMATION ============
const stepLineFill = document.getElementById('stepLineFill');
const stepsContainer = document.querySelector('.steps-container');
if (stepLineFill && stepsContainer) {
  const stepsObserver = new IntersectionObserver((entries) => {
    if (entries[0] && entries[0].isIntersecting) {
      setTimeout(() => {
        stepLineFill.style.width = '100%';
      }, 400);
    }
  }, { threshold: 0.3 });
  stepsObserver.observe(stepsContainer);
}

// ============ TESTIMONIALS CAROUSEL ============
const track = document.getElementById('testimonialsTrack');
const dotsContainer = document.getElementById('testimonialsDots');
let currentSlide = 0;
let autoplayInterval;

if (track) {
  const cards = track.querySelectorAll('.testimonial-card');
  const isMobile = () => window.innerWidth < 768;
  
  const getCardWidth = () => cards[0].offsetWidth + 24;
  const getVisibleCount = () => {
    if (window.innerWidth < 600) return 1;
    if (window.innerWidth < 900) return 2;
    return 3;
  };
  const getMaxSlide = () => Math.max(0, cards.length - getVisibleCount());
  
  // Create dots
  function createDots() {
    dotsContainer.innerHTML = '';
    const dotCount = getMaxSlide() + 1;
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('div');
      dot.className = 'testimonials-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }
  
  function goToSlide(index) {
    currentSlide = Math.max(0, Math.min(index, getMaxSlide()));
    const offset = currentSlide * getCardWidth();
    track.style.transform = `translateX(-${offset}px)`;
    dotsContainer.querySelectorAll('.testimonials-dot').forEach((d, i) => {
      d.classList.toggle('active', i === currentSlide);
    });
  }
  
  function nextSlide() {
    const next = currentSlide >= getMaxSlide() ? 0 : currentSlide + 1;
    goToSlide(next);
  }
  
  createDots();
  
  // Auto-play
  autoplayInterval = setInterval(nextSlide, 4000);
  
  track.addEventListener('mouseenter', () => clearInterval(autoplayInterval));
  track.addEventListener('mouseleave', () => {
    autoplayInterval = setInterval(nextSlide, 4000);
  });
  
  // Touch/drag support
  let startX = 0;
  let isDragging = false;
  
  track.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });
  
  track.addEventListener('touchend', e => {
    if (!isDragging) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goToSlide(diff > 0 ? currentSlide + 1 : currentSlide - 1);
    }
    isDragging = false;
  });
  
  window.addEventListener('resize', () => {
    createDots();
    goToSlide(0);
  });
}

// ============ SMOOTH SCROLL ============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============ PARALLAX ON HERO ORBS ============
document.addEventListener('mousemove', (e) => {
  const mx = (e.clientX / window.innerWidth - 0.5) * 40;
  const my = (e.clientY / window.innerHeight - 0.5) * 40;
  
  const orb1 = document.querySelector('.orb-1');
  const orb2 = document.querySelector('.orb-2');
  const orb3 = document.querySelector('.orb-3');

  if (orb1) orb1.style.setProperty('transform', `translate(${mx * 0.5}px, ${my * 0.5}px)`);
  if (orb2) orb2.style.setProperty('transform', `translate(${-mx * 0.3}px, ${-my * 0.3}px)`);
  if (orb3) orb3.style.setProperty('transform', `translate(${mx * 0.8}px, ${my * 0.8}px)`);
});

// ============ PHONE SCREEN ANIMATION ============
// Simulate live messages appearing
const phoneMessages = document.querySelector('.phone-messages');
if (phoneMessages) {
  const demoMessages = [
    { text: 'Gate B22 has no line right now! 😍', from: 'K', isMe: false },
    { text: 'Thanks! Heading over now', isMe: true },
    { text: 'Lounge is packed but worth it ✈️', from: 'D', isMe: false },
  ];
  
  let msgIndex = 0;
  
  setInterval(() => {
    if (msgIndex >= demoMessages.length) return;
    const msgData = demoMessages[msgIndex];
    const msgEl = document.createElement('div');
    msgEl.className = `phone-msg ${msgData.isMe ? 'phone-msg-me' : 'phone-msg-other'}`;
    msgEl.style.opacity = '0';
    msgEl.style.transform = 'translateY(10px)';
    msgEl.style.transition = 'opacity 0.4s, transform 0.4s';
    
    if (!msgData.isMe) {
      msgEl.innerHTML = `
        <div class="msg-avatar">${msgData.from}</div>
        <div class="msg-bubble">${msgData.text}</div>
      `;
    } else {
      msgEl.innerHTML = `<div class="msg-bubble msg-bubble-me">${msgData.text}</div>`;
    }
    
    phoneMessages.appendChild(msgEl);
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        msgEl.style.opacity = '1';
        msgEl.style.transform = 'translateY(0)';
      }, 50);
    });
    
    // Remove oldest if too many
    const allMsgs = phoneMessages.querySelectorAll('.phone-msg');
    if (allMsgs.length > 5) {
      allMsgs[0].style.opacity = '0';
      setTimeout(() => allMsgs[0].remove(), 300);
    }
    
    msgIndex++;
  }, 3500);
}

// ============ GLOWING CARD BORDER ON MOUSE ============
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,0,255,0.06) 0%, #141414 60%)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.background = '';
  });
});

// ============ NAV CONTRAIL ANIMATION ============
(function initNavContrails() {
  const navCanvas = document.getElementById('navCanvas');
  if (!navCanvas) return;
  const ctx2 = navCanvas.getContext('2d');

  function resize() {
    navCanvas.width = navCanvas.offsetWidth;
    navCanvas.height = navCanvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // A contrail is a plane leaving a glowing streak across the nav
  class Contrail {
    constructor() { this.reset(); }
    reset() {
      const h = navCanvas.height || 72;
      this.x = -300;
      this.y = h * (0.2 + Math.random() * 0.6);
      this.speed = 0.6 + Math.random() * 1.2;
      this.length = 120 + Math.random() * 200;
      this.opacity = 0.04 + Math.random() * 0.07;
      // Slight curve offset
      this.curveFactor = (Math.random() - 0.5) * 12;
      this.cyan = Math.random() > 0.45;  // mostly cyan, sometimes magenta
      // Tiny leading dot ("aircraft")
      this.dotRadius = 1.5 + Math.random();
    }
    update() {
      this.x += this.speed;
      if (this.x > (navCanvas.width || window.innerWidth) + 50) this.reset();
    }
    draw(ctx) {
      const w = navCanvas.width;
      const tailX = this.x - this.length;
      const color = this.cyan ? '0,255,255' : '255,0,255';

      // Gradient contrail — fades in from left, sharp at head
      const grad = ctx.createLinearGradient(tailX, 0, this.x, 0);
      grad.addColorStop(0, `rgba(${color},0)`);
      grad.addColorStop(0.6, `rgba(${color},${this.opacity * 0.5})`);
      grad.addColorStop(1, `rgba(${color},${this.opacity})`);

      ctx.beginPath();
      // Slight arc using quadratic curve
      ctx.moveTo(tailX, this.y + this.curveFactor);
      ctx.quadraticCurveTo(
        tailX + this.length * 0.5, this.y,
        this.x, this.y - this.curveFactor * 0.3
      );
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Leading dot (the "plane")
      ctx.beginPath();
      ctx.arc(this.x, this.y - this.curveFactor * 0.3, this.dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${Math.min(this.opacity * 5, 0.6)})`;
      ctx.fill();

      // Glow bloom on the dot
      const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 10);
      glow.addColorStop(0, `rgba(${color},${this.opacity * 2})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }
  }

  // Stagger start positions so they don't all enter at once
  const contrails = Array.from({ length: 8 }, (_, i) => {
    const c = new Contrail();
    c.x = Math.random() * (navCanvas.width || window.innerWidth);
    return c;
  });

  function drawNav() {
    const w = navCanvas.width;
    const h = navCanvas.height;
    ctx2.clearRect(0, 0, w, h);
    contrails.forEach(c => { c.update(); c.draw(ctx2); });
    requestAnimationFrame(drawNav);
  }
  drawNav();
})();

// ============ SCROLL PROGRESS PLANE ============
(function initScrollPlane() {
  const wrap = document.getElementById('scrollPlaneWrap');
  const fill = document.getElementById('scrollPlaneFill');
  const icon = document.getElementById('scrollPlaneIcon');
  if (!wrap || !fill || !icon) return;

  function updatePlane() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

    // Show after scrolling a little
    if (scrollTop > 60) {
      wrap.classList.add('visible');
    } else {
      wrap.classList.remove('visible');
    }

    // Update fill height and icon position (%)
    const pct = (progress * 100).toFixed(2);
    fill.style.height = pct + '%';
    icon.style.top = pct + '%';
  }

  window.addEventListener('scroll', updatePlane, { passive: true });
  updatePlane();
})();

// ============ HERO WORLD FLIGHT MAP ============
(function initFlightMap() {
  const fc = document.getElementById('flightCanvas');
  if (!fc) return;
  const fctx = fc.getContext('2d');

  function resizeFlight() {
    fc.width = fc.offsetWidth;
    fc.height = fc.offsetHeight;
    buildScene();
  }

  // Hub airport positions — spread WIDE across full canvas (0–1 in both axes)
  const hubDefs = [
    // ── Western edge ──
    { nx: 0.01, ny: 0.18 }, //  0 Vancouver/Seattle
    { nx: 0.02, ny: 0.42 }, //  1 Los Angeles
    { nx: 0.04, ny: 0.72 }, //  2 Lima/South America coast
    // ── Americas ──
    { nx: 0.14, ny: 0.28 }, //  3 New York JFK
    { nx: 0.12, ny: 0.50 }, //  4 Miami
    { nx: 0.20, ny: 0.78 }, //  5 São Paulo GRU
    { nx: 0.08, ny: 0.10 }, //  6 Anchorage / far NW
    // ── Atlantic / Europe ──
    { nx: 0.42, ny: 0.14 }, //  7 London LHR (higher up)
    { nx: 0.45, ny: 0.28 }, //  8 Paris CDG
    { nx: 0.48, ny: 0.10 }, //  9 Frankfurt FRA
    { nx: 0.52, ny: 0.20 }, // 10 Moscow SVO
    { nx: 0.38, ny: 0.82 }, // 11 Johannesburg JNB
    { nx: 0.44, ny: 0.60 }, // 12 Lagos LOS
    // ── Middle East / Asia ──
    { nx: 0.58, ny: 0.44 }, // 13 Dubai DXB
    { nx: 0.63, ny: 0.50 }, // 14 Mumbai BOM
    { nx: 0.68, ny: 0.22 }, // 15 Beijing PEK
    { nx: 0.72, ny: 0.40 }, // 16 Hong Kong HKG
    { nx: 0.76, ny: 0.55 }, // 17 Singapore SIN
    // ── Eastern edge ──
    { nx: 0.82, ny: 0.18 }, // 18 Tokyo NRT
    { nx: 0.88, ny: 0.68 }, // 19 Sydney SYD
    { nx: 0.96, ny: 0.30 }, // 20 Pacific rim / Honolulu far right
    { nx: 0.94, ny: 0.80 }, // 21 New Zealand far SE
    // ── Top / bottom edge accents ──
    { nx: 0.30, ny: 0.05 }, // 22 Iceland/North Atlantic (top strip)
    { nx: 0.62, ny: 0.88 }, // 23 Indian Ocean bottom
  ];

  // Routes — now crosses far left ↔ far right and top ↔ bottom
  const routeDefs = [
    // Transatlantic
    [3, 7],   // JFK → LHR
    [3, 8],   // JFK → CDG
    [4, 8],   // MIA → CDG
    // South America
    [4, 5],   // MIA → GRU
    [5, 8],   // GRU → CDG
    // Transpacific (left edge to right edge — long diagonal!)
    [1, 18],  // LAX → NRT
    [0, 18],  // Vancouver → NRT
    [6, 18],  // Anchorage → NRT
    [6, 0],   // Anchorage → Vancouver
    // Europe ↔ Middle East
    [7, 13],  // LHR → DXB
    [8, 13],  // CDG → DXB
    [9, 10],  // FRA → SVO
    [10, 15], // SVO → PEK
    // Africa
    [7, 11],  // LHR → JNB
    [12, 7],  // LOS → LHR
    [11, 13], // JNB → DXB
    // Asia Pacific
    [13, 14], // DXB → BOM
    [13, 17], // DXB → SIN
    [14, 15], // BOM → PEK
    [15, 18], // PEK → NRT
    [16, 17], // HKG → SIN
    [18, 19], // NRT → SYD
    [17, 19], // SIN → SYD
    [19, 21], // SYD → NZ
    // Far right edge routes
    [18, 20], // NRT → Pacific rim
    [20, 21], // Pacific rim → NZ
    // Top strip routes (high latitude)
    [3, 22],  // JFK → Iceland
    [22, 9],  // Iceland → Frankfurt
    [6, 22],  // Anchorage → Iceland
    // Bottom routes
    [5, 23],  // GRU → Indian Ocean
    [11, 23], // JNB → Indian Ocean  
    [23, 19], // Indian Ocean → SYD
    // Far western routes
    [2, 5],   // Lima → GRU
    [2, 4],   // Lima → MIA
    [1, 4],   // LAX → MIA
  ];

  let hubs = [];
  let routes = [];

  function buildScene() {
    const w = fc.width;
    const h = fc.height;

    hubs = hubDefs.map(d => ({
      x: d.nx * w,
      y: d.ny * h,
      phase: Math.random() * Math.PI * 2, // for pulse offset
    }));

    routes = routeDefs.map(([ai, bi]) => {
      const a = hubs[ai];
      const b = hubs[bi];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      // Arc upward (negative y) — like a great circle over the globe
      const arcHeight = dist * 0.22;
      // Perpendicular offset: push control point upward
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const cpx = mx + (dy / len) * arcHeight * -0.3;
      const cpy = my - arcHeight;

      // Each route gets 1–3 planes at staggered positions
      const planeCount = dist > w * 0.35 ? 2 : 1;
      const planes = Array.from({ length: planeCount }, (_, i) => ({
        t: i / planeCount + Math.random() * 0.1,
        speed: 0.00045 + Math.random() * 0.00055,
        dir: i % 2 === 0 ? 1 : -1,  // alternating direction for realism
        color: Math.random() > 0.45 ? '0,255,255' : '255,0,255',
      }));

      return { ax: a.x, ay: a.y, bx: b.x, by: b.y, cpx, cpy, planes };
    });
  }

  resizeFlight();
  window.addEventListener('resize', resizeFlight);

  // Quadratic bezier position
  function qBez(t, ax, ay, cpx, cpy, bx, by) {
    const u = 1 - t;
    return { x: u*u*ax + 2*u*t*cpx + t*t*bx, y: u*u*ay + 2*u*t*cpy + t*t*by };
  }

  let ft = 0;

  function drawFlightMap() {
    const w = fc.width, h = fc.height;
    fctx.clearRect(0, 0, w, h);

    // ── Route arcs (faint dashed lines) ──
    fctx.setLineDash([3, 9]);
    fctx.lineWidth = 0.8;
    routes.forEach(r => {
      fctx.beginPath();
      fctx.moveTo(r.ax, r.ay);
      fctx.quadraticCurveTo(r.cpx, r.cpy, r.bx, r.by);
      fctx.strokeStyle = 'rgba(255,255,255,0.055)';
      fctx.stroke();
    });
    fctx.setLineDash([]);

    // ── City hub dots + pulse rings ──
    hubs.forEach(hub => {
      hub.phase = (hub.phase + 0.018) % (Math.PI * 2);
      const pulse = (Math.sin(hub.phase) + 1) / 2; // 0–1

      // Expanding ring
      const ringR = 6 + pulse * 10;
      fctx.beginPath();
      fctx.arc(hub.x, hub.y, ringR, 0, Math.PI * 2);
      fctx.strokeStyle = `rgba(0,255,255,${0.06 + pulse * 0.12})`;
      fctx.lineWidth = 1;
      fctx.stroke();

      // Solid inner dot
      fctx.beginPath();
      fctx.arc(hub.x, hub.y, 2.5, 0, Math.PI * 2);
      fctx.fillStyle = `rgba(0,255,255,${0.5 + pulse * 0.4})`;
      fctx.fill();
    });

    // ── Animated planes ──
    routes.forEach(r => {
      r.planes.forEach(plane => {
        plane.t += plane.speed * plane.dir;
        if (plane.t > 1) plane.t = 0;
        if (plane.t < 0) plane.t = 1;

        const pos = qBez(plane.t, r.ax, r.ay, r.cpx, r.cpy, r.bx, r.by);
        const c = plane.color;

        // Glow halo
        const grd = fctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
        grd.addColorStop(0,   `rgba(${c},0.75)`);
        grd.addColorStop(0.35,`rgba(${c},0.25)`);
        grd.addColorStop(1,   `rgba(${c},0)`);
        fctx.beginPath();
        fctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        fctx.fillStyle = grd;
        fctx.fill();

        // Bright core
        fctx.beginPath();
        fctx.arc(pos.x, pos.y, 2.2, 0, Math.PI * 2);
        fctx.fillStyle = `rgba(${c},1)`;
        fctx.fill();

        // Short trailing streak (sample a few past positions)
        const trailLen = 4;
        for (let k = 1; k <= trailLen; k++) {
          const past = Math.max(0, Math.min(1, plane.t - plane.dir * k * 0.012));
          const tp = qBez(past, r.ax, r.ay, r.cpx, r.cpy, r.bx, r.by);
          const alpha = (1 - k / trailLen) * 0.22;
          fctx.beginPath();
          fctx.arc(tp.x, tp.y, 1.5 - k * 0.2, 0, Math.PI * 2);
          fctx.fillStyle = `rgba(${c},${alpha})`;
          fctx.fill();
        }
      });
    });

    ft++;
    requestAnimationFrame(drawFlightMap);
  }

  drawFlightMap();
})();


// Trigger initial reveals for items in view
window.dispatchEvent(new Event('scroll'));
