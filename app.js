import { login, logout, getCurrentRole, initAuth, loginAsGuest, getCurrentUser } from './auth.js';
import { GuestModule } from './guest.js';
import { renderWaiterSection } from './waiter.js';
import { renderAdminSection, showAdminLoginPrompt } from './admin.js';
import { NotificationService } from './utils/notificationService.js';
import { DataService } from './services/dataService.js';

const splashScreen = document.getElementById('splash-screen');
const appContent = document.getElementById('app-content');
const guestBtn = document.getElementById('guest-btn');
const staffLoginBtn = document.getElementById('staff-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginSection = document.getElementById('login-section');
const roleSelectionSection = document.getElementById('role-selection-section');
const loginForm = document.getElementById('login-form');
const roleGuestBtn = document.getElementById('role-guest-btn');
const roleStaffBtn = document.getElementById('role-staff-btn');
const roleAdminBtn = document.getElementById('role-admin-btn');
const guestTableEntrySection = document.getElementById('guest-table-entry-section'); // New element
const userActions = document.getElementById('user-actions');
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutIconBtn = document.getElementById('logout-icon-btn');
const guestNotificationsBtn = document.getElementById('guest-notifications-btn');

const sections = {
    'guest': document.getElementById('guest-section'),
    'guest-anonymous': document.getElementById('guest-section'),
    'waiter': document.getElementById('waiter-section'),
    'admin': document.getElementById('admin-section'),
    'manager': document.getElementById('admin-section'),
    'cashier': document.getElementById('admin-section'),
    'guest-table-entry': guestTableEntrySection, // New section
};

// New utility function to update all logos
window.updateAllLogos = (logoUrl) => {
    document.querySelectorAll('.app-logo').forEach(img => {
        img.src = logoUrl;
    });
};

// Instantiate GuestModule once
const guestApp = new GuestModule();

const hideAllSections = () => {
    Object.values(sections).forEach(section => section.classList.add('hidden'));
    loginSection.classList.add('hidden');
    roleSelectionSection.classList.add('hidden');
    guestNotificationsBtn.classList.add('hidden');
};

const showSection = (role) => {
    hideAllSections();
    if (sections[role]) {
        sections[role].classList.remove('hidden');
        if (role === 'guest' || role === 'guest-anonymous') {
            // Render guestApp. It will handle its own state, including table number.
            guestApp.render(sections[role]);
        }
        if (role === 'waiter') renderWaiterSection(sections[role]);
        // Admin, Manager, Cashier roles all use the admin panel structure
        if (['admin', 'manager', 'cashier'].includes(role)) renderAdminSection(sections[role]);
        
        userActions.classList.remove('hidden');
        guestBtn.classList.add('hidden');
        staffLoginBtn.classList.add('hidden');
        logoutIconBtn.classList.remove('hidden'); // Show the icon logout button

        // Populate profile dropdown
        const user = getCurrentUser();
        const userRole = getCurrentRole();
        if(user) {
            document.getElementById('profile-email').textContent = user.email;
        }
        if(userRole) {
            document.getElementById('profile-role').textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        }

    } else { // 'login' or default state
        roleSelectionSection.classList.remove('hidden');
        userActions.classList.add('hidden');
        guestBtn.classList.remove('hidden');
        staffLoginBtn.classList.remove('hidden');
        logoutIconBtn.classList.add('hidden'); // Hide icon logout when not logged in
    }
};

// New function to show guest table entry screen
const showGuestTableEntryScreen = () => {
    hideAllSections();
    guestTableEntrySection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden'); // Allow logout from this screen
    guestBtn.classList.add('hidden');
    staffLoginBtn.classList.add('hidden');
};

const initializeApp = async () => {
    // Show splash screen immediately
    if (splashScreen) {
        splashScreen.classList.remove('hidden');
    }

    const minimumDisplayTime = new Promise(resolve => setTimeout(resolve, 2000)); // Minimum 2 seconds
    
    // The app will now use the appicon.png file directly.
    // The localStorage logic for the logo has been removed for simplicity and robustness.
    
    // Get table number from URL if provided
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');

    // Attempt to set guestTableNumber in guestApp if from URL
    if (tableFromUrl) {
        const parsedTable = parseInt(tableFromUrl);
        if (parsedTable > 0) {
            guestApp.guestTableNumber = parsedTable;
            localStorage.setItem('guestTableNumber', parsedTable); // Store it for persistence

             // If a table is specified in the URL, log in as a guest automatically
            await loginAsGuest();
        }
        // Clear params from URL to avoid re-triggering guest login on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // If no table in URL, try to get it from local storage
        const storedTable = localStorage.getItem('guestTableNumber');
        if (storedTable) {
            guestApp.guestTableNumber = parseInt(storedTable);
        } else {
            guestApp.guestTableNumber = null; // Ensure it's null if not found
        }
    }
    
    // Normal authentication flow
    console.log('Starting normal auth flow...');
    const authPromise = initAuth();

    // Wait for both auth check and minimum splash time
    const [isLoggedIn] = await Promise.all([authPromise, minimumDisplayTime]);

    // Hide splash screen after initialization
    if (splashScreen) {
        splashScreen.classList.add('hidden');
    }

    if (isLoggedIn) {
        const role = getCurrentRole();
        console.log('User logged in with role:', role);

        if (role === 'guest-anonymous' && !guestApp.guestTableNumber) {
            // If logged in as guest but no table number, show table entry screen
             showGuestTableEntryScreen();
        } else {
            showSection(role);
        }
    } else {
        console.log('No user logged in, showing role selection');
        showSection(null); // This will now show the role selection
    }
};

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;

    const result = await login(email, password);
    if (result.success) {
        showSection(result.role);
    } else {
        NotificationService.show(`Giriş xətası: ${result.error}`, 'error');
    }
});

roleGuestBtn.addEventListener('click', async () => {
    const result = await loginAsGuest();
    if (result.success) {
        // After successful anonymous login, show the table entry screen.
        showGuestTableEntryScreen();
    } else {
        NotificationService.show(`Giriş xətası: ${result.error}`, 'error');
    }
});

// New event listener for the guest table entry form
const guestTableForm = document.getElementById('guest-table-form');
if (guestTableForm) {
    guestTableForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const tableInput = document.getElementById('guestTableNumberInput');
        const tableNumber = parseInt(tableInput.value, 10);

        if (tableNumber > 0) {
            guestApp.guestTableNumber = tableNumber;
            localStorage.setItem('guestTableNumber', tableNumber); // Persist table number
            showSection('guest-anonymous'); // Now render the actual guest menu
        } else {
            NotificationService.show('Zəhmət olmasa düzgün masa nömrəsi daxil edin.', 'error');
        }
    });
}

roleStaffBtn.addEventListener('click', () => {
    hideAllSections();
    loginSection.classList.remove('hidden');
});

roleAdminBtn.addEventListener('click', () => {
    // Call the showAdminLoginPrompt function from admin.js
    showAdminLoginPrompt();
});

staffLoginBtn.addEventListener('click', () => {
    hideAllSections();
    loginSection.classList.remove('hidden');
});

// Admin login prompt function
// This function is now defined and exported from admin.js, no need to duplicate it here.

logoutBtn.addEventListener('click', async () => {
    // Clear guest table number from local storage on logout
    localStorage.removeItem('guestTableNumber');
    guestApp.guestTableNumber = null; // Reset internal state
    if (guestApp.orderListenerUnsubscribe) {
        guestApp.orderListenerUnsubscribe();
    }
    guestNotificationsBtn.classList.add('hidden');
    profileDropdown.classList.add('hidden'); // Hide dropdown on logout
    const result = await logout();
    if (result.success) {
        showSection(null); // Go to role selection screen directly
        NotificationService.show('Uğurla çıxış etdiniz.', 'success');
    } else {
        NotificationService.show(`Çıxış xətası: ${result.error}`, 'error');
    }
});

// Listener for custom event to reinitialize app after admin login from modal
window.addEventListener('reinitialize-app', () => {
    // After admin login, just re-check auth and show the right section
    initAuth().then(isLoggedIn => {
        if (isLoggedIn) {
            const role = getCurrentRole();
            showSection(role);
        }
    });
});

// Profile dropdown logic
profileBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    profileDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (event) => {
    if (!profileBtn.contains(event.target) && !profileDropdown.contains(event.target)) {
        profileDropdown.classList.add('hidden');
    }
});

document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    logoutBtn.click();
});

// Event listener for the new logout icon button
logoutIconBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logoutBtn.click();
});

// Event listener for the new info button
document.getElementById('info-btn').addEventListener('click', async () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4';
    
    modal.innerHTML = `
        <div class="ultra-modern-card p-6 sm:p-8 w-full max-w-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
    `;
    document.body.appendChild(modal);

    const info = await DataService.getBusinessInfo();

    const socialLinksHTML = `
        <div class="flex justify-center items-center space-x-4 mt-6">
            ${info.socials?.instagram ? `<a href="${info.socials.instagram}" target="_blank" class="social-icon-btn instagram-bg"><svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>` : ''}
            ${info.socials?.facebook ? `<a href="${info.socials.facebook}" target="_blank" class="social-icon-btn facebook-bg"><svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg></a>` : ''}
            ${info.socials?.tiktok ? `<a href="${info.socials.tiktok}" target="_blank" class="social-icon-btn tiktok-bg"><svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>` : ''}
        </div>
    `;

    const mapHTML = info.address ? `
        <div class="mt-6 border-t pt-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4 text-center">Xəritədə Biz</h3>
            <div class="aspect-w-16 aspect-h-9 rounded-2xl overflow-hidden shadow-lg border relative group">
                <iframe src="https://maps.google.com/maps?q=${encodeURIComponent(info.address)}&t=m&z=15&ie=UTF8&iwloc=&output=embed" width="100%" height="100%" style="border:0;" class="grayscale group-hover:grayscale-0 transition-all duration-300" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div class="bg-white/80 backdrop-blur-sm p-1 rounded-full shadow-2xl">
                        <img src="/appicon.png" class="w-12 h-12 app-logo">
                     </div>
                </div>
            </div>
        </div>
    ` : '';
    
    modal.querySelector('.ultra-modern-card').innerHTML = `
        <div class="text-center mb-6">
            <img src="/appicon.png" alt="Logo" class="app-logo w-24 h-24 mx-auto mb-4">
            <h2 class="text-2xl font-bold text-slate-800 mb-2">${info.businessName || 'Eat & Drink App'}</h2>
        </div>
        
        <div class="text-sm text-slate-700 space-y-3 text-center">
            <p><strong class="font-semibold">Ünvan:</strong> ${info.address || 'Təyin edilməyib'}</p>
            <p><strong class="font-semibold">Telefon:</strong> ${info.phone || 'Təyin edilməyib'}</p>
        </div>

        ${socialLinksHTML}
        ${mapHTML}

        <div class="mt-8 text-center">
            <button id="close-info-modal" class="premium-gradient-btn text-white px-8 py-3 rounded-xl font-semibold">
                Bağla
            </button>
        </div>
    `;

    const closeModal = () => {
        if (modal.parentNode) {
            document.body.removeChild(modal);
        }
    };

    modal.querySelector('#close-info-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

const launchPOS = async () => {
    const posContainer = document.getElementById('pos-modal-container');
    const mainHeader = document.querySelector('header');
    const appContent = document.getElementById('app-content');
    
    // Hide main header and adjust content padding
    if(mainHeader) mainHeader.style.display = 'none';
    if(appContent) appContent.style.paddingTop = '0';
    
    // Load products and categories for POS
    posProducts = await DataService.getProducts();
};

// Initial app load
initializeApp();