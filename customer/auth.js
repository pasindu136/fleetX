/**
 * FleetX Shared Auth System
 * Handles login state across all pages using Supabase and localStorage.
 * Include this script in every page AFTER the header HTML.
 */

const FX_AUTH_KEY = 'fleetx_session';

const SUPABASE_URL = 'https://vrjgtbvdodggaywqcxzq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyamd0YnZkb2RnZ2F5d3FjeHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NzE3MzksImV4cCI6MjA5ODA0NzczOX0.-U5sUcwwK2InlC2LqHse-nphqmQuETD5ZhxMPO46Gr8';
let supabase = null;

if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── Core helpers ────────────────────────────────────────────────
function fxGetUser() {
    try { return JSON.parse(localStorage.getItem(FX_AUTH_KEY)); } catch { return null; }
}
function fxSetUser(user) { localStorage.setItem(FX_AUTH_KEY, JSON.stringify(user)); }
function fxClearUser() { localStorage.removeItem(FX_AUTH_KEY); }

// ── Render nav auth area ─────────────────────────────────────────
function fxInitNav() {
    const area = document.getElementById('navAuthArea');
    if (!area) return;
    const user = fxGetUser();

    if (user) {
        const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        area.innerHTML = `
            <div class="fx-nav-user" id="fxNavUser">
                <div class="fx-nav-avatar">${initials}</div>
                <div class="fx-nav-info">
                    <span class="fx-nav-name">${user.name.split(' ')[0]}</span>
                    <span class="fx-nav-status"><i class="fas fa-circle" style="font-size:6px;"></i> Active</span>
                </div>
                <i class="fas fa-chevron-down fx-nav-caret"></i>
                <div class="fx-nav-dropdown" id="fxNavDropdown">
                    <div class="fx-dd-header">
                        <div class="fx-dd-avatar">${initials}</div>
                        <div>
                            <div class="fx-dd-name">${user.name}</div>
                            <div class="fx-dd-email">${user.email}</div>
                        </div>
                    </div>
                    <div class="fx-dd-divider"></div>
                    <a href="dashboard.html" class="fx-dd-item"><i class="fas fa-tachometer-alt"></i> My Dashboard</a>
                    <a href="booking.html" class="fx-dd-item"><i class="fas fa-car"></i> Book a Ride</a>
                    <div class="fx-dd-divider"></div>
                    <a href="#" class="fx-dd-item fx-dd-logout" onclick="fxLogout();return false;">
                        <i class="fas fa-sign-out-alt"></i> Sign Out
                    </a>
                </div>
            </div>`;

        // Toggle dropdown on click
        const chip = document.getElementById('fxNavUser');
        if (chip) {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                chip.classList.toggle('open');
            });
            document.addEventListener('click', () => chip.classList.remove('open'));
        }
    } else {
        area.innerHTML = `
            <button class="btn-primary fx-login-trigger" id="fxLoginBtn"
                style="padding:9px 22px;font-size:13px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-lock" style="font-size:11px;"></i> Login
            </button>`;
        const loginBtn = document.getElementById('fxLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => fxOpenAuthPanel());
        }
    }
}

// ── Auth slide panel ─────────────────────────────────────────────
function fxOpenAuthPanel(opts = {}) {
    const existing = document.getElementById('fxAuthPanel');
    if (existing) { existing.classList.add('open'); return; }

    const panel = document.createElement('div');
    panel.id = 'fxAuthPanel';
    panel.className = 'fx-auth-panel';
    panel.innerHTML = `
        <div class="fx-auth-panel-inner">
            <button class="fx-panel-close" onclick="fxCloseAuthPanel()"><i class="fas fa-times"></i></button>

            <div class="fx-panel-logo">FLEET<span>X</span></div>
            <p class="fx-panel-sub">Access your passenger account</p>

            <div class="fx-panel-tabs">
                <button class="fx-ptab active" id="fxTabLogin" onclick="fxSwitchTab('login')">Sign In</button>
                <button class="fx-ptab" id="fxTabRegister" onclick="fxSwitchTab('register')">Register</button>
                <div class="fx-ptab-bar" id="fxPTabBar"></div>
            </div>

            <form id="fxAuthForm" autocomplete="off" onsubmit="fxHandleAuth(event)">
                <div class="fx-pfield" id="fxFieldName" style="display:none;">
                    <i class="fas fa-user"></i>
                    <input type="text" id="fxName" placeholder="Full Name" autocomplete="off">
                </div>
                <div class="fx-pfield">
                    <i class="fas fa-envelope"></i>
                    <input type="email" id="fxEmail" placeholder="Email Address" required autocomplete="off">
                </div>
                <div class="fx-pfield" style="position:relative;">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="fxPassword" placeholder="Password" required>
                    <button type="button" class="fx-eye-toggle" onclick="fxToggleEye(this)">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>

                <div id="fxLoginExtras" style="display:flex;justify-content:space-between;align-items:center;margin:2px 0 18px;font-size:12.5px;">
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);cursor:pointer;">
                        <input type="checkbox" style="accent-color:var(--accent);"> Remember me
                    </label>
                    <a href="#" style="color:var(--accent);text-decoration:none;font-weight:600;">Forgot password?</a>
                </div>

                <div id="fxPanelError" class="fx-panel-error" style="display:none;"></div>

                <button type="submit" class="btn-primary" id="fxSubmitBtn"
                    style="width:100%;padding:14px;font-size:14px;letter-spacing:0.5px;">
                    <span id="fxSubmitText">Sign In &amp; Continue</span>
                    <i class="fas fa-arrow-right" style="margin-left:8px;font-size:12px;"></i>
                </button>
            </form>

            <div class="fx-panel-divider"><span>or continue with</span></div>
            <div style="display:flex;gap:10px;">
                <button class="fx-social-btn" onclick="fxSocialLogin('Google')">
                    <i class="fab fa-google"></i> Google
                </button>
                <button class="fx-social-btn" onclick="fxSocialLogin('Facebook')">
                    <i class="fab fa-facebook-f"></i> Facebook
                </button>
            </div>
        </div>`;

    document.body.appendChild(panel);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'fxAuthBackdrop';
    backdrop.className = 'fx-auth-backdrop';
    backdrop.onclick = fxCloseAuthPanel;
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
        panel.classList.add('open');
        backdrop.classList.add('open');
    });

    // If came from booking page, store intent
    if (opts.intent) panel.dataset.intent = opts.intent;
}

function fxCloseAuthPanel() {
    const panel = document.getElementById('fxAuthPanel');
    const backdrop = document.getElementById('fxAuthBackdrop');
    if (panel) { panel.classList.remove('open'); setTimeout(() => panel.remove(), 400); }
    if (backdrop) { backdrop.classList.remove('open'); setTimeout(() => backdrop.remove(), 400); }
}

let fxCurrentTab = 'login';
function fxSwitchTab(tab) {
    fxCurrentTab = tab;
    const bar = document.getElementById('fxPTabBar');
    const nameField = document.getElementById('fxFieldName');
    const extras = document.getElementById('fxLoginExtras');
    const submitText = document.getElementById('fxSubmitText');
    const tabLogin = document.getElementById('fxTabLogin');
    const tabRegister = document.getElementById('fxTabRegister');
    if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
    if (tabRegister) tabRegister.classList.toggle('active', tab === 'register');
    if (bar) bar.style.transform = tab === 'register' ? 'translateX(100%)' : 'translateX(0)';
    if (nameField) nameField.style.display = tab === 'register' ? 'flex' : 'none';
    if (extras) extras.style.display = tab === 'login' ? 'flex' : 'none';
    if (submitText) submitText.textContent = tab === 'register' ? 'Create Account' : 'Sign In & Continue';
    const err = document.getElementById('fxPanelError');
    if (err) err.style.display = 'none';
}

function fxHandleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('fxEmail').value.trim();
    const password = document.getElementById('fxPassword').value;
    const nameEl = document.getElementById('fxName');
    const errEl = document.getElementById('fxPanelError');
    const btn = document.getElementById('fxSubmitBtn');
    const submitText = document.getElementById('fxSubmitText');

    // Basic validation
    if (!email || !password) return;
    if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.';
        errEl.style.display = 'block';
        return;
    }

    // Loading state
    btn.disabled = true;
    btn.style.opacity = '0.7';
    submitText.textContent = 'Authenticating...';
    errEl.style.display = 'none';

    if (!supabase) {
        errEl.textContent = 'Supabase client is not initialized.';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.style.opacity = '1';
        submitText.textContent = fxCurrentTab === 'register' ? 'Register' : 'Sign In';
        return;
    }

    if (fxCurrentTab === 'register') {
        const name = nameEl.value.trim() || email.split('@')[0];
        supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name
                }
            }
        }).then(({ data, error }) => {
            if (error) {
                errEl.textContent = error.message;
                errEl.style.display = 'block';
                btn.disabled = false;
                btn.style.opacity = '1';
                submitText.textContent = 'Create Account';
            } else {
                if (data.user && data.session === null) {
                    errEl.textContent = 'Registration successful! Please check your email to verify your account.';
                    errEl.style.color = 'var(--success)';
                    errEl.style.display = 'block';
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    submitText.textContent = 'Create Account';
                }
            }
        }).catch(err => {
            errEl.textContent = err.message || 'An error occurred.';
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.style.opacity = '1';
            submitText.textContent = 'Create Account';
        });
    } else {
        // Sign In
        supabase.auth.signInWithPassword({
            email: email,
            password: password
        }).then(({ data, error }) => {
            if (error) {
                errEl.textContent = error.message;
                errEl.style.display = 'block';
                btn.disabled = false;
                btn.style.opacity = '1';
                submitText.textContent = 'Sign In & Continue';
            }
        }).catch(err => {
            errEl.textContent = err.message || 'An error occurred.';
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.style.opacity = '1';
            submitText.textContent = 'Sign In & Continue';
        });
    }
}

function fxToggleEye(btn) {
    const input = btn.previousElementSibling;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ── Social Login ──────────────────────────────────────────────────
function fxSocialLogin(provider) {
    const errEl = document.getElementById('fxPanelError');
    errEl.textContent = `${provider} login coming soon!`;
    errEl.style.display = 'block';
    errEl.style.color = 'var(--accent)';
    errEl.style.background = 'rgba(255,204,0,0.06)';
    errEl.style.borderColor = 'rgba(255,204,0,0.2)';
}

function fxLogout() {
    if (supabase) {
        supabase.auth.signOut().then(() => {
            fxClearUser();
            fxInitNav();
            fxShowToast('Signed out successfully. See you soon!');
            setTimeout(() => {
                if (window.location.pathname.includes('/admin/')) {
                    window.location.href = '../customer/index.html';
                } else {
                    window.location.reload();
                }
            }, 1000);
        });
    } else {
        fxClearUser();
        fxInitNav();
        fxShowToast('Signed out successfully. See you soon!');
    }
}

// ── Toast notifications ──────────────────────────────────────────
function fxShowToast(message, type = 'success') {
    const existing = document.getElementById('fxToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'fxToast';
    toast.className = 'fx-toast';
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ── Require auth guard ───────────────────────────────────────────
function fxRequireAuth(callback, intent = '') {
    const user = fxGetUser();
    if (user) {
        callback(user);
    } else {
        fxOpenAuthPanel({ intent });
        window._fxPendingCallback = callback;
    }
}

// Initialize default data if not present (No-op as we use Supabase)
function fxInitDefaultData() {}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    fxInitNav();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login_trigger') === 'admin') {
        setTimeout(() => {
            fxOpenAuthPanel();
            setTimeout(() => {
                const errEl = document.getElementById('fxPanelError');
                if (errEl) {
                    errEl.textContent = 'Admin authorization required. Please sign in as administrator.';
                    errEl.style.display = 'block';
                    errEl.style.color = 'var(--accent)';
                    errEl.style.background = 'rgba(255,204,0,0.06)';
                    errEl.style.borderColor = 'rgba(255,204,0,0.2)';
                }
            }, 200);
        }, 100);
    }
    fxInitMobileMenu();
});

function fxInitMobileMenu() {
    const header = document.getElementById('mainHeader') || document.querySelector('header');
    if (!header) return;
    
    let menuBtn = document.getElementById('mobileMenuBtn');
    if (!menuBtn) {
        menuBtn = document.createElement('button');
        menuBtn.id = 'mobileMenuBtn';
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        header.appendChild(menuBtn);
    }
    
    const nav = header.querySelector('nav');
    
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (nav) {
            nav.classList.toggle('open');
            const isOpen = nav.classList.contains('open');
            menuBtn.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-ellipsis-v"></i>';
        }
    });
    
    document.addEventListener('click', (e) => {
        if (nav && nav.classList.contains('open') && !nav.contains(e.target) && e.target !== menuBtn) {
            nav.classList.remove('open');
            menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        }
    });
}

// Supabase Auth State Change Listener
if (supabase) {
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            const user = session.user;
            try {
                // Fetch user profile from public.profiles
                let { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (error || !profile) {
                    // Try to wait a moment and query again (trigger might be executing)
                    await new Promise(resolve => setTimeout(resolve, 800));
                    const { data: retryProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    
                    if (retryProfile) {
                        profile = retryProfile;
                    } else {
                        // Fallback profile representation
                        profile = {
                            id: user.id,
                            name: user.user_metadata?.name || user.email.split('@')[0],
                            email: user.email,
                            role: user.email === 'admin@fleetx.com' ? 'admin' : 'user',
                            active: true,
                            joined_at: user.created_at
                        };
                    }
                }
                
                if (profile.active === false) {
                    await supabase.auth.signOut();
                    fxClearUser();
                    fxInitNav();
                    fxShowToast('Access Denied: Your account has been suspended by an administrator.', 'error');
                    if (window.location.pathname.includes('/admin/') || window.location.pathname.includes('dashboard.html')) {
                        setTimeout(() => {
                            window.location.href = '../customer/index.html';
                        }, 1500);
                    }
                    return;
                }

                const userSession = {
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    role: profile.role,
                    joinedAt: profile.joined_at
                };
                
                fxSetUser(userSession);
                fxInitNav();
                fxCloseAuthPanel();

                // Pending callbacks
                if (window._fxPendingCallback) {
                    const callback = window._fxPendingCallback;
                    delete window._fxPendingCallback;
                    callback(userSession);
                }

                // Intent handler for booking
                const panel = document.getElementById('fxAuthPanel');
                const intent = panel ? panel.dataset.intent : null;
                if (intent === 'book') {
                    setTimeout(() => {
                        const bookSection = document.getElementById('bookingSection');
                        if (bookSection) bookSection.scrollIntoView({ behavior: 'smooth' });
                        else window.location.href = 'booking.html';
                    }, 500);
                }

                // Redirect to admin panel if user is admin
                if (profile.role === 'admin') {
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('/customer/') && !currentPath.includes('index.html')) {
                        setTimeout(() => {
                            window.location.href = '../admin/fleet.html';
                        }, 800);
                    } else if (!currentPath.includes('/admin/') && !currentPath.includes('index.html')) {
                        setTimeout(() => {
                            window.location.href = 'admin/fleet.html';
                        }, 800);
                    }
                }
            } catch (err) {
                console.error('Error in auth state sync:', err);
            }
        } else {
            fxClearUser();
            fxInitNav();
        }
    });
}
