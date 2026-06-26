/**
 * FleetX Shared Auth System
 * Handles login state across all pages using Supabase and localStorage.
 * Include this script in every page AFTER the header HTML.
 */

const FX_AUTH_KEY = 'fleetx_session';

const SUPABASE_URL = 'https://vrjgtbvdodggaywqcxzq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyamd0YnZkb2RnZ2F5d3FjeHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NzE3MzksImV4cCI6MjA5ODA0NzczOX0.-U5sUcwwK2InlC2LqHse-nphqmQuETD5ZhxMPO46Gr8';
if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
            <a href="#" onclick="fxOpenAuthPanel(); return false;" class="fx-login-trigger" id="fxLoginBtn"
                style="padding:9px 22px;font-size:13px;display:flex;align-items:center;gap:8px;text-decoration:none; background: var(--accent, #ffcc00); color: #000; font-weight: 700; border-radius: 8px; transition: opacity 0.2s, transform 0.2s;" onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)';" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
                <i class="fas fa-lock" style="font-size:11px;"></i> Login
            </a>`;
    }
}

// ── Auth Premium Modal ───────────────────────────────────────────
function fxInjectStyles() {
    if (document.getElementById('fxModalStyles')) return;
    const style = document.createElement('style');
    style.id = 'fxModalStyles';
    style.textContent = `
        .fx-modal-backdrop {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(5, 5, 5, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            padding: 20px;
            box-sizing: border-box;
        }
        .fx-modal-backdrop.open { opacity: 1; }
        .fx-modal-card {
            background: rgba(16, 16, 16, 0.9);
            border: 1px solid rgba(255, 204, 0, 0.18);
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 45px rgba(255, 204, 0, 0.05);
            border-radius: 20px;
            padding: 42px 38px;
            max-width: 450px;
            width: 100%;
            transform: scale(0.92) translateY(15px);
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
            position: relative;
            opacity: 0;
            box-sizing: border-box;
        }
        .fx-modal-backdrop.open .fx-modal-card { transform: scale(1) translateY(0); opacity: 1; }
        .fx-modal-close {
            position: absolute; top: 20px; right: 20px;
            background: transparent; border: none; color: #666;
            font-size: 18px; cursor: pointer; transition: all 0.25s ease;
            width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
        }
        .fx-modal-close:hover { color: #fff; background: rgba(255,255,255,0.06); transform: rotate(90deg); }
        
        .fx-modal-header { text-align: center; margin-bottom: 28px; }
        .fx-modal-logo {
            font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 800;
            letter-spacing: 2px; color: #ffffff; text-decoration: none;
            display: inline-flex; align-items: center; gap: 8px; margin-bottom: 8px;
        }
        .fx-modal-logo span { color: var(--accent, #ffcc00); }
        .fx-modal-sub { color: #888; font-size: 13.5px; line-height: 1.5; margin: 0; }
        
        .fx-modal-tabs { display: flex; background: rgba(8, 8, 8, 0.9); border: 1px solid #222; border-radius: 12px; padding: 4px; margin-bottom: 26px; }
        .fx-modal-tab-btn {
            flex: 1; background: transparent; border: none; color: #777;
            font-size: 13.5px; font-weight: 700; padding: 11px 0; cursor: pointer;
            border-radius: 8px; transition: all 0.25s ease; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .fx-modal-tab-btn.active { color: #000; background: var(--accent, #ffcc00); box-shadow: 0 4px 15px rgba(255, 204, 0, 0.3); }
        
        .fx-modal-input-group { display: flex; align-items: center; gap: 12px; background: rgba(10, 10, 10, 0.9); border: 1px solid #262626; border-radius: 12px; padding: 0 16px; margin-bottom: 16px; transition: all 0.25s ease; }
        .fx-modal-input-group:focus-within { border-color: var(--accent, #ffcc00); background: #0a0a0a; box-shadow: 0 0 0 4px rgba(255, 204, 0, 0.08); transform: translateY(-1px); }
        .fx-modal-input-group i { color: #666; font-size: 15px; }
        .fx-modal-input-group:focus-within i { color: var(--accent, #ffcc00); }
        .fx-modal-input-group input { flex: 1; background: transparent; border: none; color: #fff; font-size: 14px; padding: 14px 0; outline: none; font-family: inherit; }
        .fx-modal-input-group input::placeholder { color: #555; }
        
        .fx-modal-eye { background: transparent; border: none; color: #666; cursor: pointer; font-size: 14px; padding: 8px; transition: color 0.2s; }
        .fx-modal-eye:hover { color: #fff; }
        
        .fx-modal-btn {
            width: 100%; background: var(--accent, #ffcc00); color: #000; border: none; padding: 14px;
            border-radius: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
            cursor: pointer; transition: all 0.25s ease; display: flex; align-items: center; justify-content: center; gap: 8px;
            margin-top: 8px; box-shadow: 0 6px 20px rgba(255, 204, 0, 0.2);
        }
        .fx-modal-btn:hover { background: #ffe033; transform: translateY(-1.5px); box-shadow: 0 10px 25px rgba(255, 204, 0, 0.35); }
        .fx-modal-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
        
        .fx-modal-error { display: none; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; line-height: 1.4; margin-bottom: 16px; background: rgba(255, 61, 87, 0.08); border: 1px solid rgba(255, 61, 87, 0.2); color: #ff3d57; }
        
        .fx-modal-divider { display: flex; align-items: center; margin: 24px 0 18px; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; }
        .fx-modal-divider::before, .fx-modal-divider::after { content: ''; flex: 1; height: 1px; background: #222; }
        .fx-modal-divider span { padding: 0 12px; }
        
        .fx-modal-socials { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .fx-modal-soc-btn { background: rgba(255, 255, 255, 0.03); border: 1px solid #222; color: #d0d0d0; padding: 11px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.25s ease; }
        .fx-modal-soc-btn:hover { background: rgba(255, 255, 255, 0.06); border-color: #383838; color: #fff; }
        
        .fx-modal-footer { text-align: center; margin-top: 24px; color: #666; font-size: 12.5px; }
        .fx-modal-footer a { color: var(--accent, #ffcc00); text-decoration: none; font-weight: 600; }
        .fx-modal-footer a:hover { text-decoration: underline; }
    `;
    document.head.appendChild(style);
}

let fxCurrentTab = 'login';

function fxOpenAuthPanel(opts = {}) {
    fxInjectStyles();
    
    // Remove existing modal if any
    const existing = document.getElementById('fxAuthBackdrop');
    if (existing) existing.remove();
    
    const backdrop = document.createElement('div');
    backdrop.id = 'fxAuthBackdrop';
    backdrop.className = 'fx-modal-backdrop';
    if (opts && opts.intent) {
        backdrop.dataset.intent = opts.intent;
    }
    
    backdrop.innerHTML = `
        <div class="fx-modal-card" id="fxAuthCard">
            <button class="fx-modal-close" onclick="fxCloseAuthPanel()"><i class="fas fa-times"></i></button>
            <div class="fx-modal-header">
                <a href="index.html" class="fx-modal-logo">
                    <img src="img/hed-logo.png" alt="Logo" style="height: 32px;"> FLEET<span>X</span>
                </a>
                <p class="fx-modal-sub" id="fxMSubTitle">Enter your credentials to access the passenger hub</p>
            </div>
            
            <div class="fx-modal-tabs">
                <button type="button" class="fx-modal-tab-btn active" id="fxMTabLogin" onclick="fxSwitchTab('login')">Sign In</button>
                <button type="button" class="fx-modal-tab-btn" id="fxMTabRegister" onclick="fxSwitchTab('register')">Register</button>
            </div>
            
            <div id="fxPanelError" class="fx-modal-error"></div>
            
            <form id="fxAuthForm" autocomplete="off" onsubmit="fxHandleAuth(event)">
                <div class="fx-modal-input-group" id="fxMFieldName" style="display: none;">
                    <i class="fas fa-user"></i>
                    <input type="text" id="fxName" placeholder="Full Name" autocomplete="name">
                </div>
                
                <div class="fx-modal-input-group">
                    <i class="fas fa-envelope"></i>
                    <input type="email" id="fxEmail" placeholder="Email Address" required autocomplete="email">
                </div>
                
                <div class="fx-modal-input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="fxPassword" placeholder="Password (min. 6 characters)" required autocomplete="current-password">
                    <button type="button" class="fx-modal-eye" onclick="fxToggleEye(this)" aria-label="Toggle password">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                
                <div id="fxLoginExtras" style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0 20px; font-size: 12.5px;">
                    <label style="display: flex; align-items: center; gap: 6px; color: #888; cursor: pointer;">
                        <input type="checkbox" style="accent-color: var(--accent);"> Remember session
                    </label>
                    <a href="#" onclick="fxShowForgotPassword(); return false;" style="color: var(--accent); text-decoration: none; font-weight: 600;">Forgot password?</a>
                </div>
                
                <button type="submit" class="fx-modal-btn" id="fxSubmitBtn">
                    <span id="fxSubmitText">Sign In & Continue</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            </form>
            
            <div class="fx-modal-divider"><span>Or continue via</span></div>
            
            <div class="fx-modal-socials">
                <button type="button" class="fx-modal-soc-btn" onclick="fxSocialLogin('Google')">
                    <i class="fab fa-google" style="color: #ea4335;"></i> Google
                </button>
                <button type="button" class="fx-modal-soc-btn" onclick="fxSocialLogin('Facebook')">
                    <i class="fab fa-facebook-f" style="color: #1877f2;"></i> Facebook
                </button>
            </div>
            
            <div class="fx-modal-footer" id="fxMFooterNote">
                New passenger node? <a href="#" onclick="fxSwitchTab('register'); return false;">Create free account</a>
            </div>
        </div>
    `;
    
    document.body.appendChild(backdrop);
    
    // Close on backdrop click (but not card click)
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) fxCloseAuthPanel();
    });
    
    // Trigger animation
    requestAnimationFrame(() => {
        backdrop.classList.add('open');
    });
}

function fxCloseAuthPanel() {
    const backdrop = document.getElementById('fxAuthBackdrop');
    if (backdrop) {
        backdrop.classList.remove('open');
        setTimeout(() => backdrop.remove(), 350);
    }
}

function fxSwitchTab(tab) {
    fxCurrentTab = tab;
    const nameField = document.getElementById('fxMFieldName');
    const extras = document.getElementById('fxLoginExtras');
    const submitText = document.getElementById('fxSubmitText');
    const tabLogin = document.getElementById('fxMTabLogin');
    const tabRegister = document.getElementById('fxMTabRegister');
    const subTitle = document.getElementById('fxMSubTitle');
    const footerNote = document.getElementById('fxMFooterNote');
    const passInput = document.getElementById('fxPassword');
    
    if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
    if (tabRegister) tabRegister.classList.toggle('active', tab === 'register');
    
    if (nameField) nameField.style.display = tab === 'register' ? 'flex' : 'none';
    if (extras) extras.style.display = tab === 'login' ? 'flex' : 'none';
    if (submitText) submitText.textContent = tab === 'register' ? 'Create Account' : 'Sign In & Continue';
    if (subTitle) {
        subTitle.textContent = tab === 'register' 
            ? 'Create a new passenger node identity in 60 seconds' 
            : 'Enter your credentials to access the passenger hub';
    }
    if (footerNote) {
        footerNote.innerHTML = tab === 'register'
            ? 'Already registered? <a href="#" onclick="fxSwitchTab(\'login\'); return false;">Sign In here</a>'
            : 'New passenger node? <a href="#" onclick="fxSwitchTab(\'register\'); return false;">Create free account</a>';
    }
    if (passInput) {
        passInput.setAttribute('autocomplete', tab === 'register' ? 'new-password' : 'current-password');
    }
    const err = document.getElementById('fxPanelError');
    if (err) err.style.display = 'none';
}

function fxShowForgotPassword() {
    const errEl = document.getElementById('fxPanelError');
    if (errEl) {
        errEl.textContent = 'Please contact administrator at ops@fleetx.lk for password recovery.';
        errEl.style.display = 'block';
        errEl.style.background = 'rgba(255, 61, 87, 0.08)';
        errEl.style.color = '#ff3d57';
        errEl.style.borderColor = 'rgba(255, 61, 87, 0.2)';
    }
}

function fxHandleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('fxEmail').value.trim();
    const password = document.getElementById('fxPassword').value;
    const nameEl = document.getElementById('fxName');
    const errEl = document.getElementById('fxPanelError');
    const btn = document.getElementById('fxSubmitBtn');
    const submitText = document.getElementById('fxSubmitText');

    // Hardcoded Admin Bypass
    if (email === 'admin@fleetx.com' && password === 'admin123') {
        const adminSession = {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'FleetX Admin',
            email: 'admin@fleetx.com',
            role: 'admin',
            joinedAt: new Date().toISOString()
        };
        fxSetUser(adminSession);
        fxInitNav();
        fxCloseAuthPanel();
        if (typeof fxShowToast === 'function') fxShowToast('Welcome back, Admin!');
        setTimeout(() => {
            const isInsideAdmin = window.location.pathname.includes('/admin/');
            window.location.href = isInsideAdmin ? 'fleet.html' : 'admin/fleet.html';
        }, 500);
        return;
    }

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
        submitText.textContent = fxCurrentTab === 'register' ? 'Create Account' : 'Sign In & Continue';
        return;
    }

    if (fxCurrentTab === 'register') {
        const name = nameEl ? nameEl.value.trim() || email.split('@')[0] : email.split('@')[0];
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
                if (error.message.toLowerCase().includes('rate limit')) {
                    errEl.innerHTML = 'Rate limit hit! To fix this permanently for development:<br>1. Go to <b>Supabase Dashboard</b><br>2. <b>Authentication</b> &rarr; <b>Providers</b> &rarr; <b>Email</b><br>3. Toggle OFF <b>Confirm email</b> and save.';
                    errEl.style.display = 'block';
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    submitText.textContent = 'Create Account';
                    return;
                }
                errEl.textContent = error.message;
                errEl.style.display = 'block';
                btn.disabled = false;
                btn.style.opacity = '1';
                submitText.textContent = 'Create Account';
            } else {
                if (data.user && data.session === null) {
                    errEl.textContent = 'Registration successful! Please check your email to verify your account.';
                    errEl.style.color = 'var(--success)';
                    errEl.style.background = 'rgba(0, 230, 118, 0.08)';
                    errEl.style.borderColor = 'rgba(0, 230, 118, 0.2)';
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
    fxClearUser();
    fxInitNav();
    if (typeof fxShowToast === 'function') fxShowToast('Signed out successfully. See you soon!');
    if (window.supabase && window.supabase.auth) {
        window.supabase.auth.signOut().catch(() => {});
    }
    setTimeout(() => {
        if (window.location.pathname.includes('/admin/')) {
            window.location.href = '../index.html';
        } else {
            window.location.reload();
        }
    }, 400);
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
function fxInitDOM() {
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fxInitDOM);
} else {
    fxInitDOM();
}

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
    supabase.auth.onAuthStateChange((event, session) => {
        setTimeout(async () => {
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
                    if (window.location.pathname.includes('/admin/')) {
                        setTimeout(() => {
                            window.location.href = '../index.html';
                        }, 1500);
                    } else if (window.location.pathname.includes('dashboard.html')) {
                        setTimeout(() => {
                            window.location.href = 'index.html';
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
                const panel = document.getElementById('fxAuthBackdrop');
                const intent = panel ? panel.dataset.intent : null;
                if (intent === 'book') {
                    setTimeout(() => {
                        const bookSection = document.getElementById('bookingSection');
                        if (bookSection) bookSection.scrollIntoView({ behavior: 'smooth' });
                        else window.location.href = 'booking.html';
                    }, 500);
                }

                // Redirect if on login.html or admin
                if (window.location.pathname.includes('login.html')) {
                    setTimeout(() => {
                        window.location.href = profile.role === 'admin' ? 'admin/fleet.html' : 'dashboard.html';
                    }, 400);
                } else if (profile.role === 'admin') {
                    const currentPath = window.location.pathname;
                    if (!currentPath.includes('/admin/') && !currentPath.includes('index.html')) {
                        setTimeout(() => {
                            window.location.href = 'admin/fleet.html';
                        }, 800);
                    }
                }
            } catch (err) {
                console.error('Error in auth state sync:', err);
            }
        } else {
            const currentUser = fxGetUser();
            if (currentUser && currentUser.id === '11111111-1111-4111-8111-111111111111') {
                return; // Do not clear the hardcoded admin session
            }
            fxClearUser();
            fxInitNav();
        }
        }, 0);
    });
}
