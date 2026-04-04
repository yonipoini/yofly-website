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
const LOGIN_URL = `${window.location.origin}/login.html`;
const PROFILE_URL = `${window.location.origin}/profile.html`;

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

let currentDashboardProfile = null;
let currentDashboardSnapshot = null;
let currentDashboardUser = null;
let sessionSyncCounter = 0;

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

const mergeDashboardProfile = (profile = {}) => ({
  ...profileDefaults,
  ...profile,
  preferences: {
    ...profileDefaults.preferences,
    ...(profile.preferences || {}),
  },
});

const getRoleLabel = (role) => {
  if (role === 'FA') return 'Flight Attendant';
  if (role === 'PILOT') return 'Pilot';
  return role || 'Crew';
};

const getProfileCompletion = (profile, user) => {
  const checks = [
    profile.full_name,
    user?.email,
    profile.airline,
    profile.base_airport,
    profile.aircraft,
    profile.avatar_url,
    profile.emergency_contact_name,
    profile.emergency_contact_phone,
  ];

  const completed = checks.filter((value) => String(value || '').trim()).length;
  return Math.round((completed / checks.length) * 100);
};

const getAccessTier = (profile) => {
  if (profile.verified_crew || profile.is_verified) return 'Trusted Crew';
  if (profile.verification_status === 'PENDING_EMAIL') return 'Email Pending';
  if (profile.verification_status === 'PENDING_MANUAL') return 'Manual Review';
  if (profile.verification_status === 'REJECTED') return 'Needs Attention';
  return 'Basic Access';
};

const getEmergencyReadiness = (profile) => {
  if (profile.emergency_contact_name && profile.emergency_contact_phone) return 'Ready';
  if (profile.emergency_contact_phone) return 'Add contact name';
  return 'Not set';
};

const getCommunityPresence = (snapshot) => {
  if (!snapshot) return 'Loading';
  if (snapshot.totalPosts > 0) return `${snapshot.totalPosts} posts shared`;
  return 'No posts yet';
};

const getNextStep = (profile, user, snapshot) => {
  if (!String(profile.full_name || '').trim() || !String(profile.airline || '').trim()) {
    return {
      title: 'Finish your core profile',
      copy: 'Add your name, airline, and fleet so your dashboard, community presence, and future trust signals feel complete.',
    };
  }

  if (!String(profile.emergency_contact_name || '').trim() || !String(profile.emergency_contact_phone || '').trim()) {
    return {
      title: 'Add your emergency contact',
      copy: 'This makes your dashboard more operationally useful and gives your account a complete safety profile.',
    };
  }

  if (profile.verification_status === 'PENDING_EMAIL') {
    return {
      title: 'Finish your work-email verification',
      copy: `Open the email sent to ${user?.email || 'your inbox'} so your crew trust status and marketplace access can fully unlock.`,
    };
  }

  if (profile.verification_status === 'PENDING_MANUAL') {
    return {
      title: 'Wait for manual review to complete',
      copy: 'Your account is active already. Keep your profile current while the trust review team finishes the verification pass.',
    };
  }

  if (!snapshot || snapshot.totalPosts === 0) {
    return {
      title: 'Introduce yourself in the community',
      copy: 'Your dashboard is ready. The next high-value move is posting your first update so the community side of your account becomes active too.',
    };
  }

  if ((profile.verified_marketplace || profile.verified_crew) && snapshot.totalListings === 0) {
    return {
      title: 'Create your first marketplace listing',
      copy: 'You already have access. Adding a listing makes the dashboard feel more complete and gives the marketplace section real traction.',
    };
  }

  return {
    title: 'Your dashboard is in a healthy state',
    copy: 'Use this space to keep your account details current, track your posts and listings, and tune the ops experience for how you actually fly.',
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
        <button class="btn btn-primary" data-signout-trigger="true" type="button">Sign Out</button>
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

function renderSignedOutProfileState() {
  if (!isProfilePage) return;

  currentDashboardProfile = null;
  currentDashboardSnapshot = null;
  currentDashboardUser = null;

  setText('profileHeroName', 'Session Ended');
  setText(
    'profileHeroSubtitle',
    'You have been signed out. Redirecting you back to the sign-in screen now.'
  );
  setText('profileDisplayName', 'Redirecting to Sign In');
  setText('profileMeta', 'Your crew dashboard is only available while signed in.');
  setText('sidebarUserName', 'Signed out');
  setText('sidebarUserMeta', 'Sign in again to reopen your member console.');
  setText('sidebarVerificationPill', 'Signed out');
  setText('headerUserName', 'Signed out');
  setText('profileEmail', 'Signed out');
  setText('profileStatusTitle', 'Signed out');
  setText('profileStatusCopy', 'You need an active session to view your dashboard.');
  setText('verificationDetailTitle', 'Sign in to view your dashboard');
  setText('verificationDetailCopy', 'Once you sign back in, your crew profile and activity will load here.');
  setText('accountCompletionValue', '0%');
  setText('accountCompletionCopy', 'You need an active session before dashboard data can load.');
  setText('accessTierValue', 'Signed out');
  setText('emergencyReadinessValue', 'Unavailable');
  setText('activeOpsAirportValue', 'N/A');
  setText('communityPresenceValue', 'Unavailable');
  setText('nextStepTitle', 'Return to sign in');
  setText('nextStepCopy', 'You have been signed out of the dashboard and will be redirected to the login page.');
  setText('opsChip', 'Signed out');
  setText('mapChip', 'Signed out');
  setText('intelChip', 'Signed out');
  setText('opsContextValue', 'N/A');
  setText('mapVisibilityValue', 'N/A');
  setText('intelPushValue', 'N/A');
  setText('opsPushValue', 'N/A');
  const accountCompletionFill = document.getElementById('accountCompletionFill');
  if (accountCompletionFill) {
    accountCompletionFill.style.width = '0%';
  }
  const sidebarVerificationPill = document.getElementById('sidebarVerificationPill');
  if (sidebarVerificationPill) {
    sidebarVerificationPill.dataset.tone = 'muted';
  }
  [
    ['sidebarAvatarImage', 'sidebarAvatarFallback'],
    ['headerAvatarImage', 'headerAvatarFallback'],
    ['profileAvatarImage', 'profileAvatarFallback'],
  ].forEach(([imageId, fallbackId]) => {
    const image = document.getElementById(imageId);
    const fallback = document.getElementById(fallbackId);
    if (image && fallback) {
      image.removeAttribute('src');
      image.style.display = 'none';
      fallback.style.display = 'inline';
      fallback.textContent = 'YC';
    }
  });
  setHtml(
    'recentPostsList',
    '<div class="dashboard-empty">Redirecting to sign in...</div>'
  );
  setHtml(
    'recentListingsList',
    '<div class="dashboard-empty">Redirecting to sign in...</div>'
  );
}

async function handleSignOut(button) {
  if (button) {
    button.disabled = true;
    button.textContent = 'Signing Out...';
  }

  renderNavAuth(null);
  updateGatedUi(null);
  renderSignedOutProfileState();

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
  document.querySelectorAll('[data-signout-trigger="true"]').forEach((button) => {
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

function renderDashboardInsights(profile, user, snapshot = currentDashboardSnapshot) {
  if (!profile) return;

  const completion = getProfileCompletion(profile, user);
  const nextStep = getNextStep(profile, user, snapshot);

  setText('accountCompletionValue', `${completion}%`);
  setText(
    'accountCompletionCopy',
    completion >= 88
      ? 'Your account is in strong shape across profile, safety, and ops details.'
      : 'Keep filling in the profile and ops details so this workspace becomes more useful.'
  );
  setText('accessTierValue', getAccessTier(profile));
  setText('emergencyReadinessValue', getEmergencyReadiness(profile));
  setText('activeOpsAirportValue', profile.preferences.activeOpsAirport || profile.base_airport || 'JFK');
  setText('communityPresenceValue', getCommunityPresence(snapshot));
  setText('nextStepTitle', nextStep.title);
  setText('nextStepCopy', nextStep.copy);

  const accountCompletionFill = document.getElementById('accountCompletionFill');
  if (accountCompletionFill) {
    accountCompletionFill.style.width = `${completion}%`;
  }
}

function renderDashboardProfile(profile, user) {
  const mergedProfile = mergeDashboardProfile(profile);
  currentDashboardProfile = mergedProfile;
  currentDashboardUser = user;

  const verificationLabel = getVerificationLabel(mergedProfile.verification_status, mergedProfile);
  const verificationTone = getVerificationTone(mergedProfile.verification_status, mergedProfile);
  const verificationDetail = getVerificationDetail(mergedProfile.verification_status, mergedProfile);
  const heroName = mergedProfile.full_name || 'Crew Member';
  const roleLabel = getRoleLabel(mergedProfile.role);
  const airlineLabel = mergedProfile.airline || 'YoFly Crew';
  const profileMeta = [airlineLabel, roleLabel, `${mergedProfile.base_airport || 'JFK'} base`].join(' • ');
  const accountStatus = mergedProfile.verified_marketplace
    ? 'Crew verified with marketplace access'
    : verificationLabel;
  const avatarUrl = String(mergedProfile.avatar_url || '').trim();
  const initials = getInitials(mergedProfile.full_name || user.email || 'YoFly Crew');

  [
    ['profileAvatarImage', 'profileAvatarFallback'],
    ['sidebarAvatarImage', 'sidebarAvatarFallback'],
    ['headerAvatarImage', 'headerAvatarFallback'],
  ].forEach(([imageId, fallbackId]) => {
    const image = document.getElementById(imageId);
    const fallback = document.getElementById(fallbackId);
    if (!image || !fallback) return;

    if (avatarUrl) {
      image.src = avatarUrl;
      image.style.display = 'block';
      fallback.style.display = 'none';
    } else {
      image.removeAttribute('src');
      image.style.display = 'none';
      fallback.style.display = 'inline';
      fallback.textContent = initials;
    }
  });

  setText('profileHeroName', heroName);
  setText(
    'profileHeroSubtitle',
    `${profileMeta}. This dashboard is focused on your identity, trust, activity, and the controls that matter while signed in.`
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
  setText('sidebarUserName', heroName);
  setText('sidebarUserMeta', `${roleLabel} • ${mergedProfile.base_airport || 'JFK'} base`);
  setText('headerUserName', heroName);
  setText(
    'sessionPersistenceNote',
    `Signed in as ${user.email || 'your account'}. This dashboard stays active on this browser until you choose Sign Out.`
  );
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

  const sidebarVerificationPill = document.getElementById('sidebarVerificationPill');
  if (sidebarVerificationPill) {
    sidebarVerificationPill.textContent = verificationLabel;
    sidebarVerificationPill.dataset.tone = verificationTone;
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
  const opsContextInput = document.getElementById('opsContextInput');
  const activeOpsAirportInput = document.getElementById('activeOpsAirportInput');
  const visibleOnCrewMapInput = document.getElementById('visibleOnCrewMapInput');
  const intelPushInput = document.getElementById('intelPushInput');
  const opsPushInput = document.getElementById('opsPushInput');

  if (fullNameInput) fullNameInput.value = mergedProfile.full_name || '';
  if (airlineInput) airlineInput.value = mergedProfile.airline || '';
  if (baseAirportInput) baseAirportInput.value = mergedProfile.base_airport || 'JFK';
  if (aircraftInput) aircraftInput.value = mergedProfile.aircraft || '';
  if (avatarUrlInput) avatarUrlInput.value = mergedProfile.avatar_url || '';
  if (airlineEmailInput) airlineEmailInput.value = mergedProfile.airline_email || user.email || '';
  if (emergencyContactNameInput) emergencyContactNameInput.value = mergedProfile.emergency_contact_name || '';
  if (emergencyContactPhoneInput) emergencyContactPhoneInput.value = mergedProfile.emergency_contact_phone || '';
  if (opsContextInput) opsContextInput.value = mergedProfile.preferences.opsContextMode || 'BASE';
  if (activeOpsAirportInput) {
    activeOpsAirportInput.value =
      mergedProfile.preferences.activeOpsAirport || mergedProfile.base_airport || 'JFK';
  }
  if (visibleOnCrewMapInput) visibleOnCrewMapInput.checked = Boolean(mergedProfile.preferences.visibleOnCrewMap);
  if (intelPushInput) intelPushInput.checked = Boolean(mergedProfile.preferences.intelPush);
  if (opsPushInput) opsPushInput.checked = Boolean(mergedProfile.preferences.opsPush);

  const selectedRole = mergedProfile.role === 'FA' ? 'FA' : 'PILOT';
  document.querySelectorAll('input[name="role"]').forEach((input) => {
    input.checked = input.value === selectedRole;
  });

  renderDashboardInsights(mergedProfile, user);
}

function renderDashboardSnapshot(snapshot) {
  currentDashboardSnapshot = snapshot;

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

  if (currentDashboardProfile) {
    renderDashboardInsights(currentDashboardProfile, currentDashboardUser, snapshot);
  }
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
      const existingProfile = mergeDashboardProfile(currentDashboardProfile || {});
      const opsContextInput = document.getElementById('opsContextInput');
      const activeOpsAirportInput = document.getElementById('activeOpsAirportInput');
      const visibleOnCrewMapInput = document.getElementById('visibleOnCrewMapInput');
      const intelPushInput = document.getElementById('intelPushInput');
      const opsPushInput = document.getElementById('opsPushInput');
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
        preferences: {
          ...existingProfile.preferences,
          opsContextMode: String(opsContextInput?.value || 'BASE').trim().toUpperCase(),
          activeOpsAirport: String(activeOpsAirportInput?.value || formData.get('base_airport') || 'JFK')
            .trim()
            .toUpperCase(),
          visibleOnCrewMap: Boolean(visibleOnCrewMapInput?.checked),
          intelPush: Boolean(intelPushInput?.checked),
          opsPush: Boolean(opsPushInput?.checked),
        },
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
  const syncId = ++sessionSyncCounter;

  try {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    let resolvedSession = session;

    if (!resolvedSession?.user) {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (user) {
        resolvedSession = { user };
      }
    }

    if (syncId !== sessionSyncCounter) {
      return;
    }

    if (!resolvedSession?.user) {
      renderNavAuth(null);
      updateGatedUi(null);
      if (isProfilePage) {
        renderSignedOutProfileState();
        window.location.replace(LOGIN_URL);
      }
      return;
    }

    renderNavAuth(resolvedSession);

    if (isLoginPage) {
      window.location.replace(PROFILE_URL);
      return;
    }

    const profile = await ensureSharedProfile(resolvedSession.user);

    if (syncId !== sessionSyncCounter) {
      return;
    }

    updateGatedUi(profile);
    await initProfilePage(resolvedSession.user);
  } catch (error) {
    console.error('Session sync failed:', error);
    renderNavAuth(null);
    updateGatedUi(null);

    if (isProfilePage) {
      renderSignedOutProfileState();
      window.location.replace(LOGIN_URL);
    }
  }
}

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      renderNavAuth(session);
      const profile = await ensureSharedProfile(session.user);
      updateGatedUi(profile);

      if (isLoginPage) {
        window.location.replace(PROFILE_URL);
        return;
      }

      if (isProfilePage) {
        await initProfilePage(session.user);
      }
    }

    if (event === 'SIGNED_OUT') {
      renderNavAuth(null);
      updateGatedUi(null);
      renderSignedOutProfileState();
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

function initScrollPlane() {
  const wrap = document.getElementById('scrollPlaneWrap');
  const fill = document.getElementById('scrollPlaneFill');
  const icon = document.getElementById('scrollPlaneIcon');

  if (!wrap || !fill || !icon) {
    return;
  }

  let lastScrollY = window.scrollY;

  const updatePlane = () => {
    const maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1
    );
    const currentScrollY = window.scrollY;
    const progress = Math.min(Math.max(currentScrollY / maxScroll, 0), 1);
    const isAtTop = progress <= 0.001;
    const isAtBottom = progress >= 0.999;
    const isScrollingUp = currentScrollY < lastScrollY;
    const isScrollingDown = currentScrollY > lastScrollY;

    wrap.classList.toggle('visible', maxScroll > 200);
    fill.style.height = `${progress * 100}%`;
    icon.style.top = `${progress * 100}%`;

    if (isAtTop) {
      icon.classList.remove('is-up');
    } else if (isAtBottom) {
      icon.classList.add('is-up');
    } else if (isScrollingUp) {
      icon.classList.add('is-up');
    } else if (isScrollingDown) {
      icon.classList.remove('is-up');
    }

    lastScrollY = currentScrollY;
  };

  updatePlane();
  window.addEventListener('scroll', updatePlane, { passive: true });
  window.addEventListener('resize', updatePlane);
}

function initNavContrailCanvas() {
  const navCanvas = document.getElementById('navCanvas');
  const nav = document.getElementById('nav');

  if (!(navCanvas instanceof HTMLCanvasElement) || !nav) {
    return;
  }

  const context = navCanvas.getContext('2d');
  if (!context) {
    return;
  }

  const hubs = [
    { x: 0.08, y: 0.62, pulseOffset: 0 },
    { x: 0.22, y: 0.28, pulseOffset: 0.7 },
    { x: 0.42, y: 0.58, pulseOffset: 1.2 },
    { x: 0.63, y: 0.34, pulseOffset: 2.1 },
    { x: 0.82, y: 0.56, pulseOffset: 2.7 },
  ];
  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 2],
    [1, 3],
    [2, 4],
  ];

  let width = 0;
  let height = 0;
  let rafId = 0;

  const resize = () => {
    const rect = navCanvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    navCanvas.width = Math.round(width * ratio);
    navCanvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawLink = (from, to, time) => {
    const start = hubs[from];
    const end = hubs[to];
    const startX = start.x * width;
    const startY = start.y * height;
    const endX = end.x * width;
    const endY = end.y * height;
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - 18;

    context.beginPath();
    context.moveTo(startX, startY);
    context.quadraticCurveTo(controlX, controlY, endX, endY);
    context.strokeStyle = 'rgba(255,255,255,0.08)';
    context.lineWidth = 1;
    context.stroke();

    const traveler = (time * 0.00012 + (from + to) * 0.11) % 1;
    const t = traveler;
    const inv = 1 - t;
    const pulseX = inv * inv * startX + 2 * inv * t * controlX + t * t * endX;
    const pulseY = inv * inv * startY + 2 * inv * t * controlY + t * t * endY;

    context.beginPath();
    context.arc(pulseX, pulseY, 2.4, 0, Math.PI * 2);
    context.fillStyle = 'rgba(0,255,255,0.9)';
    context.shadowBlur = 14;
    context.shadowColor = 'rgba(0,255,255,0.8)';
    context.fill();
    context.shadowBlur = 0;
  };

  const draw = (time) => {
    context.clearRect(0, 0, width, height);

    links.forEach(([from, to]) => drawLink(from, to, time));

    hubs.forEach((hub) => {
      const x = hub.x * width;
      const y = hub.y * height;
      const pulse = 0.65 + Math.sin(time * 0.003 + hub.pulseOffset) * 0.25;

      context.beginPath();
      context.arc(x, y, 2.5 + pulse * 2.2, 0, Math.PI * 2);
      context.fillStyle = `rgba(255, 0, 255, ${0.18 + pulse * 0.18})`;
      context.fill();

      context.beginPath();
      context.arc(x, y, 2.2, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255,255,255,0.88)';
      context.fill();
    });

    rafId = requestAnimationFrame(draw);
  };

  resize();
  draw(0);
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', () => cancelAnimationFrame(rafId), { once: true });
}

function initHeroFlightMap() {
  const flightCanvas = document.getElementById('flightCanvas');
  const hero = document.getElementById('hero');

  if (!(flightCanvas instanceof HTMLCanvasElement) || !hero) {
    return;
  }

  const context = flightCanvas.getContext('2d');
  if (!context) {
    return;
  }

  const palettes = {
    cyan: {
      route: 'rgba(83, 225, 255, 0.12)',
      traveler: 'rgba(118, 238, 255, 0.98)',
      travelerShadow: 'rgba(79, 220, 255, 0.9)',
      outer: (pulse) => `rgba(74, 214, 255, ${0.04 + pulse * 0.08})`,
      ring: (shimmer) => `rgba(143, 246, 255, ${0.24 + shimmer * 0.16})`,
      core: 'rgba(220, 252, 255, 0.98)',
      coreShadow: 'rgba(70, 214, 255, 0.88)',
      label: 'rgba(210, 248, 255, 0.78)',
    },
    purple: {
      route: 'rgba(196, 88, 255, 0.11)',
      traveler: 'rgba(255, 92, 244, 0.98)',
      travelerShadow: 'rgba(194, 82, 255, 0.92)',
      outer: (pulse) => `rgba(164, 70, 255, ${0.04 + pulse * 0.08})`,
      ring: (shimmer) => `rgba(244, 117, 255, ${0.22 + shimmer * 0.18})`,
      core: 'rgba(255, 214, 255, 0.98)',
      coreShadow: 'rgba(210, 92, 255, 0.88)',
      label: 'rgba(255, 230, 255, 0.74)',
    },
  };
  const hubs = [
    { key: 'LAX', x: 0.08, y: 0.22, labelDx: 10, labelDy: -12, align: 'left', tone: 'cyan' },
    { key: 'SFO', x: 0.16, y: 0.14, labelDx: 0, labelDy: -12, align: 'center', tone: 'cyan' },
    { key: 'ORD', x: 0.28, y: 0.11, labelDx: 0, labelDy: -12, align: 'center', tone: 'purple' },
    { key: 'DFW', x: 0.40, y: 0.14, labelDx: 0, labelDy: -12, align: 'center', tone: 'purple' },
    { key: 'ATL', x: 0.52, y: 0.18, labelDx: 0, labelDy: -12, align: 'center', tone: 'cyan' },
    { key: 'JFK', x: 0.63, y: 0.12, labelDx: 0, labelDy: -12, align: 'center', tone: 'purple' },
    { key: 'LHR', x: 0.78, y: 0.18, labelDx: 0, labelDy: -12, align: 'center', tone: 'cyan' },
    { key: 'DXB', x: 0.91, y: 0.32, labelDx: -14, labelDy: -12, align: 'right', tone: 'purple' },
    { key: 'HND', x: 0.94, y: 0.56, labelDx: -14, labelDy: -12, align: 'right', tone: 'cyan' },
    { key: 'SIN', x: 0.84, y: 0.82, labelDx: -14, labelDy: -12, align: 'right', tone: 'purple' },
  ];
  const routes = [
    { from: 0, to: 1, tone: 'cyan' },
    { from: 1, to: 4, tone: 'cyan' },
    { from: 4, to: 6, tone: 'cyan' },
    { from: 6, to: 8, tone: 'cyan' },
    { from: 1, to: 6, tone: 'cyan' },
    { from: 2, to: 3, tone: 'purple' },
    { from: 3, to: 5, tone: 'purple' },
    { from: 5, to: 7, tone: 'purple' },
    { from: 7, to: 9, tone: 'purple' },
    { from: 2, to: 7, tone: 'purple' },
    { from: 1, to: 2, tone: 'cyan' },
    { from: 4, to: 5, tone: 'purple' },
    { from: 6, to: 7, tone: 'cyan' },
  ];

  let width = 0;
  let height = 0;
  let rafId = 0;

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    flightCanvas.width = Math.round(width * ratio);
    flightCanvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawRoute = (route, time) => {
    const start = hubs[route.from];
    const end = hubs[route.to];
    const palette = palettes[route.tone] || palettes.purple;
    const startX = start.x * width;
    const startY = start.y * height;
    const endX = end.x * width;
    const endY = end.y * height;
    const arcHeight = Math.max(36, Math.abs(endX - startX) * 0.08);
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - arcHeight;

    context.beginPath();
    context.moveTo(startX, startY);
    context.quadraticCurveTo(controlX, controlY, endX, endY);
    context.strokeStyle = palette.route;
    context.lineWidth = 1;
    context.setLineDash([7, 9]);
    context.stroke();
    context.setLineDash([]);

    const markerOffsets = [0, 0.28, 0.56];
    markerOffsets.forEach((offset, index) => {
      const traveler = (time * 0.00008 + (route.from + 1) * 0.13 + route.to * 0.05 + offset) % 1;
      const t = traveler;
      const inv = 1 - t;
      const x = inv * inv * startX + 2 * inv * t * controlX + t * t * endX;
      const y = inv * inv * startY + 2 * inv * t * controlY + t * t * endY;
      const size = index === 0 ? 3.2 : 2.4;
      const alpha = index === 0 ? 0.98 : 0.5 - index * 0.08;

      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fillStyle = palette.traveler.replace(/0\.98\)/, `${alpha})`);
      context.shadowBlur = index === 0 ? 20 : 12;
      context.shadowColor = palette.travelerShadow;
      context.fill();
      context.shadowBlur = 0;
    });
  };

  const draw = (time) => {
    context.clearRect(0, 0, width, height);
    const showLabels = width >= 900;
    const labelSize = width >= 1180 ? 11 : 10;

    routes.forEach((route) => drawRoute(route, time));

    hubs.forEach((hub, index) => {
      const palette = palettes[hub.tone] || palettes.purple;
      const x = hub.x * width;
      const y = hub.y * height;
      const pulse = 0.55 + Math.sin(time * 0.002 + index) * 0.35;
      const ringRadius = 7 + pulse * 7;
      const outerRadius = ringRadius + 9;
      const shimmer = 0.45 + Math.sin(time * 0.0026 + index * 1.2) * 0.3;

      context.beginPath();
      context.arc(x, y, outerRadius, 0, Math.PI * 2);
      context.fillStyle = palette.outer(pulse);
      context.fill();

      context.beginPath();
      context.arc(x, y, ringRadius, 0, Math.PI * 2);
      context.strokeStyle = palette.ring(shimmer);
      context.lineWidth = 1.4;
      context.stroke();

      context.beginPath();
      context.arc(x, y, 3.2, 0, Math.PI * 2);
      context.fillStyle = palette.core;
      context.shadowBlur = 16;
      context.shadowColor = palette.coreShadow;
      context.fill();
      context.shadowBlur = 0;

      if (showLabels) {
        context.textAlign = hub.align || 'left';
        context.textBaseline = 'middle';
        context.fillStyle = palette.label;
        context.font = `600 ${labelSize}px Inter, sans-serif`;
        context.fillText(hub.key, x + hub.labelDx, y + hub.labelDy);
        context.textAlign = 'left';
        context.textBaseline = 'alphabetic';
      }
    });

    rafId = requestAnimationFrame(draw);
  };

  resize();
  draw(0);
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', () => cancelAnimationFrame(rafId), { once: true });
}

function initHeroTextAnimation() {
  const heroTitle = document.querySelector('.hero-title');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const heroBadge = document.querySelector('.hero-badge');
  const heroLaunchNote = document.querySelector('.hero-launch-note');
  const gradientText = heroTitle?.querySelector('.gradient-text');

  if (!heroTitle || !heroSubtitle || !heroBadge || !heroLaunchNote) {
    return;
  }

  const pulseElements = [
    { element: heroBadge, baseY: 0, amount: 4, speed: 0.0018 },
    { element: heroTitle, baseY: 0, amount: 6, speed: 0.0013 },
    { element: heroSubtitle, baseY: 0, amount: 5, speed: 0.0011 },
    { element: heroLaunchNote, baseY: 0, amount: 4, speed: 0.0016 },
  ];

  let rafId = 0;
  let startTimeoutId = 0;

  const animate = (time) => {
    pulseElements.forEach(({ element, baseY, amount, speed }, index) => {
      const offset = Math.sin(time * speed + index * 0.6) * amount;
      element.style.transform = `translateY(${baseY + offset}px)`;
    });

    if (gradientText) {
      const hue = 180 + Math.sin(time * 0.0012) * 28;
      gradientText.style.filter = `drop-shadow(0 0 14px hsla(${hue}, 100%, 70%, 0.18))`;
    }

    rafId = requestAnimationFrame(animate);
  };

  startTimeoutId = window.setTimeout(() => {
    animate(0);
  }, 1400);

  window.addEventListener(
    'beforeunload',
    () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(startTimeoutId);
    },
    { once: true }
  );
}

function initPhoneMessageSimulation() {
  const incomingMessage = document.getElementById('phoneIncomingMessage');
  const incomingText = document.getElementById('phoneIncomingText');
  const typingIndicator = document.getElementById('phoneTypingIndicator');
  const phoneMessages = document.getElementById('phoneMessages');

  if (!incomingMessage || !incomingText || !typingIndicator || !phoneMessages) {
    return;
  }

  const messages = [
    'Crew van is outside Terminal 5 now.',
    'Heads up: lounge is letting crew in through the side desk.',
    'Gate moved to B22. Still enough time for coffee.',
    'Shuttle to the crash pad leaves in 12 minutes.',
  ];

  let messageIndex = 0;

  const showMessage = () => {
    typingIndicator.classList.add('is-visible');
    incomingMessage.classList.remove('is-visible');

    window.setTimeout(() => {
      incomingText.textContent = messages[messageIndex];
      typingIndicator.classList.remove('is-visible');
      incomingMessage.classList.add('is-visible');
      phoneMessages.scrollTop = phoneMessages.scrollHeight;
      messageIndex = (messageIndex + 1) % messages.length;
    }, 1500);

    window.setTimeout(() => {
      incomingMessage.classList.remove('is-visible');
    }, 5200);
  };

  showMessage();
  window.setInterval(showMessage, 6800);
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
  initScrollPlane();
  initNavContrailCanvas();
  initHeroFlightMap();
  initHeroTextAnimation();
  initPhoneMessageSimulation();
  bindSignOutButtons();
  bindLoginForm();
  bindVentPosting();
  await syncCurrentSession();
  await fetchVents();
  await fetchListings();
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted || isProfilePage || isLoginPage) {
    void syncCurrentSession();
  }
});
