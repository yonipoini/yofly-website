/* ============================================================
   YOFLY CREW — JAVASCRIPT MASTER SCRIPT
   Auth · Community · Marketplace · Particles · Animations
   ============================================================ */

// ============ 1. SUPABASE CONFIG ============
const SUPABASE_URL = 'https://ttjbpmdivtbaagkyszmb.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0amJwbWRpdnRiYWFna3lzem1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTE3MjUsImV4cCI6MjA5MDgyNzcyNX0.Pi6ZyX8nXqMh5rpOX6Dyrsz3y0Vq-Y5eDzoqihVIemc';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ============ 2. SIGN-IN LOGIC ============
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (loginForm && supabaseClient) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const submitBtn = loginForm.querySelector('button');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    if (loginMessage) {
      loginMessage.textContent = 'Connecting to crew server...';
      loginMessage.style.color = 'var(--text-muted)';
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
      if (loginMessage) {
        loginMessage.textContent = 'Error: ' + error.message;
        loginMessage.style.color = '#ff4b4b';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Magic Link';
    } else {
      if (loginMessage) {
        loginMessage.textContent = 'Check your email for the Magic Link!';
        loginMessage.style.color = 'var(--accent)';
      }
      loginForm.style.display = 'none';
    }
  });
}

// Auth State Listener & Redirects
if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const isProfilePage = window.location.pathname.includes('profile.html');
      const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '' || window.location.pathname.endsWith('login.html');
      if (isHomePage) window.location.href = 'profile.html';
    }
    
    // Gated UI elements (Post Boxes)
    const ventPostBox = document.getElementById('ventPostBox');
    const listItemBtn = document.getElementById('listItemBtn');
    
    if (session) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_verified')
        .eq('id', session.user.id)
        .single();

      if (profile && profile.is_verified) {
        if (ventPostBox) ventPostBox.style.display = 'block';
        if (listItemBtn) listItemBtn.style.display = 'inline-flex';
      }
    }
  });
}

// ============ 3. COMMUNITY & MARKETPLACE ============

async function fetchVents() {
  const ventFeed = document.getElementById('ventFeed');
  if (!ventFeed || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from('vent_posts')
    .select('*, profiles(role, airline)')
    .order('created_at', { ascending: false });

  if (error) {
    ventFeed.innerHTML = '<p style="color: #ff4b4b;">Error loading vents.</p>';
    return;
  }

  if (!data || data.length === 0) {
    ventFeed.innerHTML = '<div class="content-card" style="text-align: center; opacity: 0.5;">No vents yet. Be the first to share!</div>';
    return;
  }

  ventFeed.innerHTML = data.map(post => `
    <div class="content-card reveal-up visible">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.85em; opacity: 0.6;">
        <span>${post.profiles?.role || 'Crew Member'} • ${post.profiles?.airline || 'Verified Account'}</span>
        <span>${new Date(post.created_at).toLocaleDateString()}</span>
      </div>
      <p style="font-size: 1.1em; line-height: 1.5;">${post.content}</p>
    </div>
  `).join('');
}

async function fetchListings() {
  const marketplaceFeed = document.getElementById('marketplaceFeed');
  if (!marketplaceFeed || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from('marketplace_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    marketplaceFeed.innerHTML = '<p style="color: #ff4b4b;">Error loading marketplace.</p>';
    return;
  }

  if (!data || data.length === 0) {
    marketplaceFeed.innerHTML = '<div class="content-card" style="grid-column: 1/-1; text-align: center; opacity: 0.5;">No items listed yet.</div>';
    return;
  }

  marketplaceFeed.innerHTML = data.map(item => `
    <div class="content-card reveal-up visible">
      <div class="card-image" style="background-image: url('${item.image_url || 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&q=80&w=800'}')"></div>
      <div class="card-tag">${item.category || 'Gear'}</div>
      <h3>${item.title}</h3>
      <p class="price">$${item.price}</p>
      <p>${item.description}</p>
      <a href="#" class="btn btn-ghost" style="margin-top: 20px;">Contact Seller</a>
    </div>
  `).join('');
}

// Vent Posting
const postVentBtn = document.getElementById('postVentBtn');
if (postVentBtn) {
  postVentBtn.addEventListener('click', async () => {
    const content = document.getElementById('ventInput').value;
    if (!content || !supabaseClient) return;

    postVentBtn.disabled = true;
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const { error } = await supabaseClient
      .from('vent_posts')
      .insert([{ content, user_id: user.id }]);

    if (!error) {
      document.getElementById('ventInput').value = '';
      fetchVents();
    }
    postVentBtn.disabled = false;
  });
}

// ============ 4. CORE UI & ANIMATIONS ============

// Custom Cursor
const cursor = document.getElementById('cursor');
const cursorFollower = document.getElementById('cursorFollower');
let mouseX = 0, mouseY = 0;
let followerX = 0, followerY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (cursor) {
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
  }
});

function animateCursorFollower() {
  if (cursorFollower) {
    followerX += (mouseX - followerX) * 0.15;
    followerY += (mouseY - followerY) * 0.15;
    cursorFollower.style.left = followerX + 'px';
    cursorFollower.style.top = followerY + 'px';
  }
  requestAnimationFrame(animateCursorFollower);
}
animateCursorFollower();

// Cursor Hover Effects
document.querySelectorAll('a, button, .feature-card, .content-card, .store-btn').forEach(el => {
  el.addEventListener('mouseenter', () => {
    if (cursor) cursor.style.transform = 'translate(-50%, -50%) scale(2)';
    if (cursorFollower) cursorFollower.style.transform = 'translate(-50%, -50%) scale(1.5)';
  });
  el.addEventListener('mouseleave', () => {
    if (cursor) cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    if (cursorFollower) cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
  });
});

// Particles
const canvas = document.getElementById('particlesCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function createP() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.5 - 0.2,
      size: Math.random() * 2,
      life: Math.random() * 100 + 50
    };
  }

  for(let i=0; i<60; i++) particles.push(createP());

  function draw() {
    ctx.clearRect(0,0,canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.life--;
      ctx.fillStyle = `rgba(255, 0, 255, ${p.life / 150})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      if(p.life <= 0) particles[i] = createP();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// Scroll Reveal
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal-up, .reveal-right').forEach(el => revealObserver.observe(el));

// Navigation
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
}

// Initial Data Load
window.addEventListener('DOMContentLoaded', () => {
  fetchVents();
  fetchListings();
});
