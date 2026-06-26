/**
 * FleetX Shared Auth System
 * Handles login state across all pages using localStorage.
 * Include this script in every page AFTER the header HTML.
 */

const FX_AUTH_KEY = 'fleetx_session';

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
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            chip.classList.toggle('open');
        });
        document.addEventListener('click', () => chip.classList.remove('open'));
    } else {
        area.innerHTML = `
            <button class="btn-primary fx-login-trigger" id="fxLoginBtn"
                style="padding:9px 22px;font-size:13px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-lock" style="font-size:11px;"></i> Login
            </button>`;
        document.getElementById('fxLoginBtn').addEventListener('click', fxOpenAuthPanel);
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
    document.getElementById('fxTabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('fxTabRegister').classList.toggle('active', tab === 'register');
    bar.style.transform = tab === 'register' ? 'translateX(100%)' : 'translateX(0)';
    nameField.style.display = tab === 'register' ? 'flex' : 'none';
    extras.style.display = tab === 'login' ? 'flex' : 'none';
    submitText.textContent = tab === 'register' ? 'Create Account' : 'Sign In & Continue';
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
    if (password.length < 4) {
        errEl.textContent = 'Password must be at least 4 characters.';
        errEl.style.display = 'block';
        return;
    }

    // Loading state
    btn.disabled = true;
    btn.style.opacity = '0.7';
    submitText.textContent = 'Authenticating...';
    errEl.style.display = 'none';

    setTimeout(() => {
        // Admin credentials bypass
        if (email === 'admin@fleetx.com' && password === 'admin') {
            const user = { name: 'Admin Operations', email, role: 'admin', joinedAt: new Date().toISOString() };
            fxSetUser(user);
            fxCloseAuthPanel();
            fxInitNav();
            fxShowToast('Welcome back, Administrator! 🛠️');
            
            setTimeout(() => {
                const currentPath = window.location.pathname;
                if (currentPath.includes('/customer/')) {
                    window.location.href = '../admin/fleet.html';
                } else {
                    window.location.href = 'fleet.html';
                }
            }, 800);
            return;
        }

        let name = '';
        const users = JSON.parse(localStorage.getItem('fleetx_users') || '[]');
        const existingUser = users.find(u => u.email === email);

        if (existingUser && existingUser.active === false) {
            errEl.textContent = 'Access Denied: Your account has been suspended by an administrator.';
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.style.opacity = '1';
            submitText.textContent = fxCurrentTab === 'register' ? 'Register' : 'Sign In';
            return;
        }

        if (fxCurrentTab === 'register') {
            name = (nameEl.value.trim()) || email.split('@')[0];
            if (!existingUser) {
                users.push({ name, email, joinedAt: new Date().toISOString(), status: 'verified', active: true });
                localStorage.setItem('fleetx_users', JSON.stringify(users));
            }
        } else {
            if (existingUser) {
                name = existingUser.name;
            } else {
                name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                users.push({ name, email, joinedAt: new Date().toISOString(), status: 'verified', active: true });
                localStorage.setItem('fleetx_users', JSON.stringify(users));
            }
        }

        const loggedUser = users.find(u => u.email === email) || { name, email, joinedAt: new Date().toISOString() };
        const user = { name: loggedUser.name, email: loggedUser.email, role: email === 'admin@fleetx.com' ? 'admin' : 'user', joinedAt: loggedUser.joinedAt };
        fxSetUser(user);

        const panel = document.getElementById('fxAuthPanel');
        const intent = panel ? panel.dataset.intent : null;

        fxCloseAuthPanel();
        fxInitNav();

        // Show welcome toast
        fxShowToast(`Welcome back, ${name.split(' ')[0]}! 👋`);

        // Handle post-login intent
        if (intent === 'book') {
            setTimeout(() => {
                const bookSection = document.getElementById('bookingSection');
                if (bookSection) bookSection.scrollIntoView({ behavior: 'smooth' });
                else window.location.href = 'booking.html';
            }, 500);
        }

        btn.disabled = false;
        btn.style.opacity = '1';
    }, 1000);
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
    fxShowToast('Signed out successfully. See you soon!');
    setTimeout(() => {
        // Redirection on signout if they are in admin folder
        if (window.location.pathname.includes('/admin/')) {
            window.location.href = '../customer/index.html';
        }
    }, 1000);
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
// Call this on any action that requires login
function fxRequireAuth(callback, intent = '') {
    const user = fxGetUser();
    if (user) {
        callback(user);
    } else {
        fxOpenAuthPanel({ intent });
        // Store callback to re-invoke after login — simple flag
        window._fxPendingCallback = callback;
    }
}

// Initialize default data if not present
function fxInitDefaultData() {
    if (!localStorage.getItem('fleetx_users')) {
        const defaultUsers = [
            { name: 'Kamal Silva', email: 'kamal@gmail.com', joinedAt: '2026-06-14T08:00:00Z', status: 'verified', active: true },
            { name: 'Nimal Karunaratne', email: 'nimal@outlook.com', joinedAt: '2026-06-15T09:30:00Z', status: 'verified', active: true },
            { name: 'Samanthi Jayawardena', email: 'samanthi@yahoo.com', joinedAt: '2026-06-16T10:15:00Z', status: 'verified', active: true },
            { name: 'Ruvinda Perera', email: 'ruvinda@gmail.com', joinedAt: '2026-06-17T14:20:00Z', status: 'pending', active: true }
        ];
        localStorage.setItem('fleetx_users', JSON.stringify(defaultUsers));
    }
    if (!localStorage.getItem('fleetx_bookings')) {
        const defaultBookings = [
            { id: 'FTX-88294', service: 'FleetX Prime', pickup: 'Colombo 03 Terminal', drop: 'BIA Airport Expressway Node', fare: 4850.00, date: '2026-06-18T08:00:00Z', status: 'completed' },
            { id: 'FTX-87102', service: 'City Ride', pickup: 'Nugegoda Junction', drop: 'Colombo Fort Station Hub', fare: 1220.00, date: '2026-06-12T10:00:00Z', status: 'completed' },
            { id: 'FTX-85591', service: 'Outstation Drop', pickup: 'Colombo Central', drop: 'Kandy Corporate Center', fare: 9800.00, date: '2026-05-29T14:00:00Z', status: 'cancelled' },
            { id: 'FTX-10240', service: 'FleetX Prime', pickup: 'Audi R8 V10', drop: '14 Jun - 18 Jun', fare: 15400.00, date: '2026-06-14T11:00:00Z', status: 'pending' }
        ];
        localStorage.setItem('fleetx_bookings', JSON.stringify(defaultBookings));
    }
    if (!localStorage.getItem('fleetx_vehicles')) {
        const defaultVehicles = [
            { name: 'Audi R8 V10', rate: 240, category: 'SUV/Prime', status: 'Active', image: '../img/audi.jpg' },
            { name: 'Toyota Prius', rate: 110, category: 'Sedan/City', status: 'Active', image: '../img/prius.jpg' },
            { name: 'Mercedes-Benz E350', rate: 240, category: 'Sedan/Prime', status: 'Active', image: '../img/mercedes.jpg' }
        ];
        localStorage.setItem('fleetx_vehicles', JSON.stringify(defaultVehicles));
    }
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    fxInitDefaultData();
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
    }
    fxInitMobileMenu();
});

function fxInitMobileMenu() {
    const header = document.getElementById('mainHeader') || document.querySelector('header');
    if (!header) return;
    
    // Create the mobile menu button if it doesn't exist
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
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (nav && nav.classList.contains('open') && !nav.contains(e.target) && e.target !== menuBtn) {
            nav.classList.remove('open');
            menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        }
    });
}
