/* ============================================================
   YOFLY CREW — WEBSITE APP SCRIPT
   Shared Supabase auth, profile sync, community, marketplace,
   dashboard data, particles, and motion.
   ============================================================ */

const SUPABASE_URL = 'https://ttjbpmdivtbaagkyszmb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0amJwbWRpdnRiYWFna3lzem1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTE3MjUsImV4cCI6MjA5MDgyNzcyNX0.Pi6ZyX8nXqMh5rpOX6Dyrsz3y0Vq-Y5eDzoqihVIemc';
const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
const PRODUCTION_ORIGIN = 'https://www.yoflycrew.com';
const AUTH_REDIRECT_ORIGIN =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? PRODUCTION_ORIGIN
    : window.location.origin;
const AUTH_REDIRECT_URL = `${AUTH_REDIRECT_ORIGIN}/profile`;
const LOGIN_URL = `${window.location.origin}/login`;

const pageName = window.location.pathname.split('/').pop() || 'index';
const normalizedPageName = pageName.replace(/\.html$/i, '').toLowerCase();
const isLoginPage = normalizedPageName === 'login';
const isHomePage = normalizedPageName === '' || normalizedPageName === 'index';
const isProfilePage = normalizedPageName === 'profile';

const profileDefaults = {
  full_name: '',
  airline: '',
  role: 'PILOT',
  base_airport: 'JFK',
  aircraft: '',
  avatar_url: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  verified_crew: false,
  verified_marketplace: false,
  is_verified: false,
  verification_status: 'UNVERIFIED',
  created_at: null,
  updated_at: null,
  preferences: {
    intelPush: true,
    opsPush: true,
    visibleOnCrewMap: true,
    opsContextMode: 'BASE',
    activeOpsAirport: 'JFK',
  },
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatMonthYear = (value) => {
  if (!value) return 'Just joined';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just joined';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getInitials = (value) => {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return 'YC';
  return words.map((word) => word.charAt(0).toUpperCase()).join('');
};

const getListingCategoryLabel = (category) => {
  switch (category) {
    case 'CRASH_PAD':
      return 'Crash Pad';
    case 'PRIVATE_ROOM':
      return 'Private Room';
    case 'LONG_TERM_STAY':
      return 'Long-Term Stay';
    case 'SHORT_TERM_STAY':
      return 'Short-Term Stay';
    case 'SERVICE':
      return 'Service';
    case 'ITEM':
    default:
      return 'Product';
  }
};

const getVerificationLabel = (status, profile) => {
  if (status === 'VERIFIED_CREW' || profile.verified_crew || profile.is_verified) return 'Verified Crew';
  if (status === 'PENDING_EMAIL') return 'Work Email Pending';
  if (status === 'PENDING_MANUAL') return 'Manual Review';
  if (status === 'REJECTED') return 'Review Required';
  return 'Unverified';
};

const getVerificationTone = (status, profile) => {
  if (status === 'VERIFIED_CREW' || profile.verified_crew || profile.is_verified) return 'success';
  if (status === 'PENDING_EMAIL') return 'accent';
  if (status === 'PENDING_MANUAL') return 'warning';
  return 'muted';
};

const getVerificationDetail = (status, profile) => {
  if (status === 'VERIFIED_CREW' || profile.verified_crew || profile.is_verified) {
    return {
      title: 'Your crew access is verified',
      copy: 'Your profile is trusted across the website and app, and your community presence is fully active.',
    };
  }

  if (status === 'PENDING_EMAIL') {
    return {
      title: 'Work email confirmation is pending',
      copy: 'Finish the crew verification flow to unlock stronger trust markers and marketplace access.',
    };
  }

  if (status === 'PENDING_MANUAL') {
    return {
      title: 'Manual review is in progress',
      copy: 'Your crew account exists and syncs now, but the verification team still needs to review your details.',
    };
  }

  if (status === 'REJECTED') {
    return {
      title: 'Your verification needs attention',
      copy: 'Update your profile details or visit verification again to finish onboarding cleanly.',
    };
  }

  return {
    title: 'Your account is active but not yet verified',
    copy: 'You are signed in and synced. Verification is the next step if you want full crew trust and marketplace access.',
  };
};

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

const setHtml = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.innerHTML = value;
};

const setDisplay = (id, display) => {
  const element = document.getElementById(id);
  if (element) element.style.display = display;
};

function renderNavAuth(session) {
  document.querySelectorAll('.nav .nav-cta').forEach((navCta) => {
    if (!navCta) return;

    if (session?.user) {
      navCta.innerHTML = `
        <a href="profile.html" class="btn btn-ghost">Dashboard</a>
        <button class="btn btn-primary" id="signOutBtn" type="button">Sign Out</button>
      `;
    } else if (isProfilePage) {
      navCta.innerHTML = `
        <a href="login.html" class="btn btn-ghost">Sign In</a>
        <a href="login.html" class="btn btn-primary">Get the App</a>
      `;
    } else {
      navCta.innerHTML = `
        <a href="login.html" class="btn btn-ghost">Sign In</a>
        <a href="login.html" class="btn btn-primary">Get the App</a>
      `;
    }
  });

  bindSignOutButtons();
}

async function handleSignOut(button) {
  if (button) {
    button.disabled = true;
    button.textContent = 'Signing Out...';
  }

  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut({ scope: 'local' });
    }
  } catch (error) {
    console.warn('Sign out fallback redirect after auth error:', error);
  } finally {
    window.location.replace(LOGIN_URL);
  }
}

function bindSignOutButtons() {
  document.querySelectorAll('#signOutBtn').forEach((button) => {
    if (button.dataset.bound === 'true') {
      return;
    }

    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      void handleSignOut(button);
    });
  });
}

async function ensureSharedProfile(user) {
  if (!supabaseClient || !user) return null;

  const { data: existing, error: readError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing) {
    return { ...profileDefaults, ...existing };
  }

  const payload = {
    id: user.id,
    full_name: user.user_metadata?.full_name || '',
    airline: user.user_metadata?.airline || '',
    role: user.user_metadata?.role || user.user_metadata?.role_label || 'PILOT',
    airline_email: user.email || null,
    base_airport: (user.user_metadata?.base_airport || 'JFK').toUpperCase(),
  };

  const { data: inserted, error: insertError } = await supabaseClient
    .from('profiles')
    .upsert(payload)
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return { ...profileDefaults, ...inserted };
}

async function loadDashboardSnapshot(userId) {
  const [
    totalPostsResult,
    ventPostsResult,
    savedPostsResult,
    totalListingsResult,
    recentPostsResult,
    recentListingsResult,
  ] = await Promise.all([
    supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
    supabaseClient
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
      .eq('type', 'VENT'),
    supabaseClient.from('saved_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseClient.from('listings').select('*', { count: 'exact', head: true }).eq('host_id', userId),
    supabaseClient
      .from('posts')
      .select('id, title, type, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseClient
      .from('listings')
      .select('id, title, category, airport_code, price_monthly, created_at')
      .eq('host_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  if (totalPostsResult.error) throw totalPostsResult.error;
  if (ventPostsResult.error) throw ventPostsResult.error;
  if (savedPostsResult.error) throw savedPostsResult.error;
  if (totalListingsResult.error) throw totalListingsResult.error;
  if (recentPostsResult.error) throw recentPostsResult.error;
  if (recentListingsResult.error) throw recentListingsResult.error;

  return {
    totalPosts: totalPostsResult.count || 0,
    ventPosts: ventPostsResult.count || 0,
    savedPosts: savedPostsResult.count || 0,
    totalListings: totalListingsResult.count || 0,
    recentPosts: recentPostsResult.data || [],
    recentListings: recentListingsResult.data || [],
  };
}

function renderDashboardProfile(profile, user) {
  const mergedProfile = {
    ...profileDefaults,
    ...profile,
    preferences: {
      ...profileDefaults.preferences,
      ...(profile.preferences || {}),
    },
  };

  const verificationLabel = getVerificationLabel(mergedProfile.verification_status, mergedProfile);
  const verificationTone = getVerificationTone(mergedProfile.verification_status, mergedProfile);
  const verificationDetail = getVerificationDetail(mergedProfile.verification_status, mergedProfile);
  const heroName = mergedProfile.full_name || 'Crew Member';
  const roleLabel = mergedProfile.role === 'FA' ? 'Flight Attendant' : mergedProfile.role || 'Crew';
  const airlineLabel = mergedProfile.airline || 'YoFly Crew';
  const profileMeta = [airlineLabel, roleLabel, `${mergedProfile.base_airport || 'JFK'} base`].join(' • ');
  const avatarImage = document.getElementById('profileAvatarImage');
  const avatarFallback = document.getElementById('profileAvatarFallback');
  const accountStatus = mergedProfile.verified_marketplace
    ? 'Crew verified with marketplace access'
    : verificationLabel;

  if (avatarImage && avatarFallback) {
    const avatarUrl = String(mergedProfile.avatar_url || '').trim();
    if (avatarUrl) {
      avatarImage.src = avatarUrl;
      avatarImage.style.display = 'block';
      avatarFallback.style.display = 'none';
    } else {
      avatarImage.removeAttribute('src');
      avatarImage.style.display = 'none';
      avatarFallback.style.display = 'inline';
      avatarFallback.textContent = getInitials(mergedProfile.full_name || user.email || 'YoFly Crew');
    }
  }

  setText('profileHeroName', heroName);
  setText(
    'profileHeroSubtitle',
    `${profileMeta}. Your account stays signed in on this browser until you choose Sign Out.`
  );
  setText('profileDisplayName', heroName);
  setText('profileEmail', user.email || 'No email found');
  setText('profileMeta', profileMeta);
  setText('memberSinceValue', formatMonthYear(mergedProfile.created_at));
  setText('baseAirportValue', mergedProfile.base_airport || 'JFK');
  setText('aircraftValue', mergedProfile.aircraft || 'Not set');
  setText('airlineValue', airlineLabel);
  setText('roleValue', roleLabel);
  setText('profileStatusTitle', accountStatus);
  setText('profileStatusCopy', verificationDetail.copy);
  setText('verificationDetailTitle', verificationDetail.title);
  setText('verificationDetailCopy', verificationDetail.copy);
  setText('opsChip', `${mergedProfile.preferences.opsContextMode || 'BASE'} ops context`);
  setText(
    'mapChip',
    mergedProfile.preferences.visibleOnCrewMap ? 'Visible on crew map' : 'Hidden on crew map'
  );
  setText('intelChip', mergedProfile.preferences.intelPush ? 'Intel push enabled' : 'Intel push muted');
  setText('opsContextValue', mergedProfile.preferences.opsContextMode || 'BASE');
  setText('mapVisibilityValue', mergedProfile.preferences.visibleOnCrewMap ? 'Visible' : 'Hidden');
  setText('intelPushValue', mergedProfile.preferences.intelPush ? 'On' : 'Muted');
  setText('opsPushValue', mergedProfile.preferences.opsPush ? 'On' : 'Muted');

  const verificationBadge = document.getElementById('verificationBadge');
  if (verificationBadge) {
    verificationBadge.textContent = verificationLabel;
    verificationBadge.dataset.tone = verificationTone;
  }

  const marketplaceBadge = document.getElementById('marketplaceBadge');
  if (marketplaceBadge) {
    marketplaceBadge.textContent = mergedProfile.verified_marketplace
      ? 'Marketplace Unlocked'
      : 'Marketplace Pending';
  }

  const fullNameInput = document.getElementById('fullNameInput');
  const airlineInput = document.getElementById('airlineInput');
  const baseAirportInput = document.getElementById('baseAirportInput');
  const aircraftInput = document.getElementById('aircraftInput');
  const avatarUrlInput = document.getElementById('avatarUrlInput');
  const airlineEmailInput = document.getElementById('airlineEmailInput');
  const emergencyContactNameInput = document.getElementById('emergencyContactNameInput');
  const emergencyContactPhoneInput = document.getElementById('emergencyContactPhoneInput');
  if (fullNameInput) fullNameInput.value = mergedProfile.full_name || '';
  if (airlineInput) airlineInput.value = mergedProfile.airline || '';
  if (baseAirportInput) baseAirportInput.value = mergedProfile.base_airport || 'JFK';
  if (aircraftInput) aircraftInput.value = mergedProfile.aircraft || '';
  if (avatarUrlInput) avatarUrlInput.value = mergedProfile.avatar_url || '';
  if (airlineEmailInput) airlineEmailInput.value = mergedProfile.airline_email || user.email || '';
  if (emergencyContactNameInput) emergencyContactNameInput.value = mergedProfile.emergency_contact_name || '';
  if (emergencyContactPhoneInput) emergencyContactPhoneInput.value = mergedProfile.emergency_contact_phone || '';

  const selectedRole = mergedProfile.role === 'FA' ? 'FA' : 'PILOT';
  document.querySelectorAll('input[name="role"]').forEach((input) => {
    input.checked = input.value === selectedRole;
  });
}

function renderDashboardSnapshot(snapshot) {
  setText('totalPostsValue', String(snapshot.totalPosts));
  setText('ventPostsValue', String(snapshot.ventPosts));
  setText('savedPostsValue', String(snapshot.savedPosts));
  setText('totalListingsValue', String(snapshot.totalListings));

  const postsMarkup = snapshot.recentPosts.length
    ? snapshot.recentPosts
        .map(
          (post) => `
            <a class="dashboard-list-item" href="community.html">
              <div class="dashboard-list-title">${escapeHtml(post.title || 'Crew Post')}</div>
              <div class="dashboard-list-meta">${escapeHtml(post.type || 'POST')} • ${formatDate(post.created_at)}</div>
            </a>
          `
        )
        .join('')
    : '<div class="dashboard-empty">No posts yet. Your next vent or story will show up here.</div>';

  const listingsMarkup = snapshot.recentListings.length
    ? snapshot.recentListings
        .map(
          (listing) => `
            <a class="dashboard-list-item" href="marketplace.html">
              <div class="dashboard-list-title">${escapeHtml(listing.title || 'Crew Listing')}</div>
              <div class="dashboard-list-meta">${escapeHtml(getListingCategoryLabel(listing.category))} • ${escapeHtml(listing.airport_code || 'JFK')} • $${escapeHtml(listing.price_monthly || 0)}</div>
            </a>
          `
        )
        .join('')
    : '<div class="dashboard-empty">No listings yet. Listings you create on web or app will appear here.</div>';

  setHtml('recentPostsList', postsMarkup);
  setHtml('recentListingsList', listingsMarkup);
}

async function initProfilePage(user) {
  if (!isProfilePage || !supabaseClient || !user) return;

  try {
    const profile = await ensureSharedProfile(user);
    renderDashboardProfile(profile, user);
    const snapshot = await loadDashboardSnapshot(user.id);
    renderDashboardSnapshot(snapshot);
  } catch (error) {
    console.error('Dashboard load failed:', error);
    setHtml(
      'recentPostsList',
      '<div class="dashboard-empty" style="color:#ff4b4b;">Unable to load recent community activity right now.</div>'
    );
    setHtml(
      'recentListingsList',
      '<div class="dashboard-empty" style="color:#ff4b4b;">Unable to load recent marketplace activity right now.</div>'
    );
  }

  const profileForm = document.getElementById('profileForm');
  const profileSaveMessage = document.getElementById('profileSaveMessage');

  bindSignOutButtons();

  if (profileForm && profileForm.dataset.bound !== 'true') {
    profileForm.dataset.bound = 'true';
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(profileForm);
      const payload = {
        id: user.id,
        full_name: String(formData.get('full_name') || '').trim(),
        airline: String(formData.get('airline') || '').trim(),
        role: String(formData.get('role') || 'PILOT').trim().toUpperCase(),
        base_airport: String(formData.get('base_airport') || 'JFK').trim().toUpperCase(),
        aircraft: String(formData.get('aircraft') || '').trim(),
        avatar_url: String(formData.get('avatar_url') || '').trim(),
        emergency_contact_name: String(formData.get('emergency_contact_name') || '').trim(),
        emergency_contact_phone: String(formData.get('emergency_contact_phone') || '').trim(),
        airline_email: user.email || null,
      };

      if (profileSaveMessage) {
        profileSaveMessage.textContent = 'Saving your shared crew profile...';
        profileSaveMessage.style.color = 'var(--text-muted)';
      }

      const { data, error } = await supabaseClient
        .from('profiles')
        .upsert(payload)
        .select('*')
        .single();

      if (error) {
        if (profileSaveMessage) {
          profileSaveMessage.textContent = error.message;
          profileSaveMessage.style.color = '#ff4b4b';
        }
        return;
      }

      renderDashboardProfile(data, user);
      if (profileSaveMessage) {
        profileSaveMessage.textContent = 'Profile saved across web and app.';
        profileSaveMessage.style.color = 'var(--accent)';
      }
    });
  }
}

function updateGatedUi(profile) {
  const isTrusted = Boolean(
    profile && (profile.verified_crew || profile.verified_marketplace || profile.is_verified)
  );
  const ventPostBox = document.getElementById('ventPostBox');
  const listItemBtn = document.getElementById('listItemBtn');

  if (ventPostBox) ventPostBox.style.display = isTrusted ? 'block' : 'none';
  if (listItemBtn) listItemBtn.style.display = isTrusted ? 'inline-flex' : 'none';
}

function bindLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const authModeInput = document.getElementById('authMode');
  const authBadge = document.getElementById('authBadge');
  const authIntroCopy = document.getElementById('authIntroCopy');
  const authFooterCopy = document.getElementById('authFooterCopy');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const switchToRegisterBtn = document.getElementById('switchToRegisterBtn');
  const modeButtons = Array.from(document.querySelectorAll('[data-auth-mode]'));
  if (!loginForm || !supabaseClient) return;

  const setAuthMode = (mode) => {
    const isRegisterMode = mode === 'register';
    if (authModeInput) authModeInput.value = mode;
    if (authBadge) authBadge.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
    if (authIntroCopy) {
      authIntroCopy.textContent = isRegisterMode
        ? 'Create your YoFly Crew account and receive a secure Magic Link to get started.'
        : 'Enter your email to receive a secure Magic Link for your existing account.';
    }
    if (authSubmitBtn) {
      authSubmitBtn.textContent = isRegisterMode ? 'Send Registration Link' : 'Send Sign-In Link';
    }
    if (authFooterCopy) {
      authFooterCopy.innerHTML = isRegisterMode
        ? 'Already have an account? <button type="button" id="switchBackToSignInBtn" class="auth-inline-link">Sign in instead</button>'
        : 'New here? <button type="button" id="switchToRegisterBtn" class="auth-inline-link">Create your account</button>';
    }

    modeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.authMode === mode);
    });

    const nextRegisterSwitch = document.getElementById('switchToRegisterBtn');
    const nextSignInSwitch = document.getElementById('switchBackToSignInBtn');
    if (nextRegisterSwitch) nextRegisterSwitch.onclick = () => setAuthMode('register');
    if (nextSignInSwitch) nextSignInSwitch.onclick = () => setAuthMode('signin');
  };

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setAuthMode(button.dataset.authMode || 'signin');
    });
  });

  if (switchToRegisterBtn) {
    switchToRegisterBtn.addEventListener('click', () => setAuthMode('register'));
  }

  setAuthMode(authModeInput?.value || 'signin');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const mode = authModeInput?.value || 'signin';
    const isRegisterMode = mode === 'register';
    const submitBtn = authSubmitBtn || loginForm.querySelector('button');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    if (loginMessage) {
      loginMessage.textContent = isRegisterMode
        ? 'Creating your crew account...'
        : 'Connecting to your crew account...';
      loginMessage.style.color = 'var(--text-muted)';
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: AUTH_REDIRECT_URL,
        shouldCreateUser: isRegisterMode,
      },
    });

    if (error) {
      if (loginMessage) {
        loginMessage.textContent =
          !isRegisterMode && /signups not allowed|user not found|invalid login credentials/i.test(error.message)
            ? 'No account matched that email. Use Create Account first.'
            : `Error: ${error.message}`;
        loginMessage.style.color = '#ff4b4b';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = isRegisterMode ? 'Send Registration Link' : 'Send Sign-In Link';
      return;
    }

    if (loginMessage) {
      loginMessage.textContent = isRegisterMode
        ? 'Check your email to finish creating your account.'
        : 'Check your email for the sign-in Magic Link.';
      loginMessage.style.color = 'var(--accent)';
    }
    loginForm.style.display = 'none';
  });
}

async function syncCurrentSession() {
  if (!supabaseClient) return;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session?.user) {
    renderNavAuth(null);
    if (isProfilePage) {
      window.location.href = 'login.html';
    }
    return;
  }

  renderNavAuth(session);
  const profile = await ensureSharedProfile(session.user);
  updateGatedUi(profile);

  if (isLoginPage) {
    window.location.replace('profile.html');
    return;
  }

  await initProfilePage(session.user);
}

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      renderNavAuth(session);
      const profile = await ensureSharedProfile(session.user);
      updateGatedUi(profile);

      if (isLoginPage) {
        window.location.replace('profile.html');
        return;
      }

      if (isProfilePage) {
        await initProfilePage(session.user);
      }
    }

    if (event === 'SIGNED_OUT' && isProfilePage) {
      renderNavAuth(null);
      window.location.replace(LOGIN_URL);
    }
  });
}

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
    ventFeed.innerHTML =
      '<div class="content-card" style="text-align: center; opacity: 0.5;">No vents yet. Be the first to share!</div>';
    return;
  }

  ventFeed.innerHTML = data
    .map(
      (post) => `
      <div class="content-card reveal-up visible">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.85em; opacity: 0.6;">
          <span>${escapeHtml(post.profiles?.role || 'Crew Member')} • ${escapeHtml(post.profiles?.airline || 'Verified Account')}</span>
          <span>${new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        <p style="font-size: 1.1em; line-height: 1.5;">${escapeHtml(post.content)}</p>
      </div>
    `
    )
    .join('');
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
    marketplaceFeed.innerHTML =
      '<div class="content-card" style="grid-column: 1/-1; text-align: center; opacity: 0.5;">No items listed yet.</div>';
    return;
  }

  marketplaceFeed.innerHTML = data
    .map(
      (item) => `
      <div class="content-card reveal-up visible">
        <div class="card-image" style="background-image: url('${escapeHtml(
          item.image_url ||
            'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&q=80&w=800'
        )}')"></div>
        <div class="card-tag">${escapeHtml(item.category || 'Gear')}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="price">$${escapeHtml(item.price)}</p>
        <p>${escapeHtml(item.description)}</p>
        <a href="#" class="btn btn-ghost" style="margin-top: 20px;">Contact Seller</a>
      </div>
    `
    )
    .join('');
}

function bindVentPosting() {
  const postVentBtn = document.getElementById('postVentBtn');
  if (!postVentBtn || !supabaseClient) return;

  postVentBtn.addEventListener('click', async () => {
    const ventInput = document.getElementById('ventInput');
    const content = ventInput.value.trim();
    if (!content) return;

    postVentBtn.disabled = true;
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    const { error } = await supabaseClient.from('vent_posts').insert([{ content, user_id: user.id }]);

    if (!error) {
      ventInput.value = '';
      await fetchVents();
    }

    postVentBtn.disabled = false;
  });
}

const cursor = document.getElementById('cursor');
const cursorFollower = document.getElementById('cursorFollower');
let mouseX = 0;
let mouseY = 0;
let followerX = 0;
let followerY = 0;

document.addEventListener('mousemove', (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;
  if (cursor) {
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
  }
});

function animateCursorFollower() {
  if (cursorFollower) {
    followerX += (mouseX - followerX) * 0.15;
    followerY += (mouseY - followerY) * 0.15;
    cursorFollower.style.left = `${followerX}px`;
    cursorFollower.style.top = `${followerY}px`;
  }
  requestAnimationFrame(animateCursorFollower);
}
animateCursorFollower();

document.querySelectorAll('a, button, .feature-card, .content-card, .store-btn').forEach((element) => {
  element.addEventListener('mouseenter', () => {
    if (cursor) cursor.style.transform = 'translate(-50%, -50%) scale(2)';
    if (cursorFollower) cursorFollower.style.transform = 'translate(-50%, -50%) scale(1.5)';
  });

  element.addEventListener('mouseleave', () => {
    if (cursor) cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    if (cursorFollower) cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
  });
});

const canvas = document.getElementById('particlesCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.5 - 0.2,
      size: Math.random() * 2,
      life: Math.random() * 100 + 50,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 1;
      ctx.fillStyle = `rgba(255, 0, 255, ${particle.life / 150})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      if (particle.life <= 0) particles[index] = createParticle();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  for (let index = 0; index < 60; index += 1) particles.push(createParticle());
  draw();
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.reveal-up, .reveal-right').forEach((element) => revealObserver.observe(element));

const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  bindSignOutButtons();
  bindLoginForm();
  bindVentPosting();
  await syncCurrentSession();
  await fetchVents();
  await fetchListings();
});
