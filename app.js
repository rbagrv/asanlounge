import { login, logout, getCurrentRole, initAuth, loginAsGuest } from './auth.js';
import { GuestModule } from './guest.js';
import { renderWaiterSection } from './waiter.js';
import { renderAdminSection, showAdminLoginPrompt } from './admin.js';

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

const sections = {
    'guest': document.getElementById('guest-section'),
    'guest-anonymous': document.getElementById('guest-section'),
    'waiter': document.getElementById('waiter-section'),
    'admin': document.getElementById('admin-section'),
    'manager': document.getElementById('admin-section'),
    'cashier': document.getElementById('admin-section'),
    'guest-table-entry': guestTableEntrySection, // New section
};

// Instantiate GuestModule once
const guestApp = new GuestModule();

const hideAllSections = () => {
    Object.values(sections).forEach(section => section.classList.add('hidden'));
    loginSection.classList.add('hidden');
    roleSelectionSection.classList.add('hidden');
};

const showSection = (role) => {
    hideAllSections();
    if (sections[role]) {
        sections[role].classList.remove('hidden');
        if (role === 'guest' || role === 'guest-anonymous') {
            // Only render guestApp here if guestTableNumber is already set from URL or manual entry
            if (guestApp.guestTableNumber) { 
                guestApp.render(sections[role]);
            } else {
                // If no table number, redirect to table entry screen
                showGuestTableEntryScreen();
                return; // Prevent showing guest section yet
            }
        }
        if (role === 'waiter') renderWaiterSection(sections[role]);
        // Admin, Manager, Cashier roles all use the admin panel structure
        if (['admin', 'manager', 'cashier'].includes(role)) renderAdminSection(sections[role]);
        
        logoutBtn.classList.remove('hidden');
        guestBtn.classList.add('hidden');
        staffLoginBtn.classList.add('hidden');

    } else { // 'login' or default state
        roleSelectionSection.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        guestBtn.classList.remove('hidden');
        staffLoginBtn.classList.remove('hidden');
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
    // Get table number from URL if provided
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');

    // Attempt to set guestTableNumber in guestApp if from URL
    if (tableFromUrl) {
        const parsedTable = parseInt(tableFromUrl);
        if (parsedTable > 0) {
            guestApp.guestTableNumber = parsedTable;
            localStorage.setItem('guestTableNumber', parsedTable); // Store it for persistence
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
    
    // Auto-login as anonymous guest for QR code users if table number is present
    if (guestApp.guestTableNumber) {
        console.log('Auto-login for QR user with table:', guestApp.guestTableNumber);
        const result = await loginAsGuest();
        if (result.success) {
            showSection('guest-anonymous');
            return; // Exit after handling QR login
        }
    }
    
    // Normal authentication flow
    console.log('Starting normal auth flow...');
    const isLoggedIn = await initAuth();
    if (isLoggedIn) {
        const role = getCurrentRole();
        console.log('User logged in with role:', role);
        showSection(role);
    } else {
        console.log('No user logged in, showing role selection');
        showSection('login'); // This will now show the role selection
    }
};

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;

    const result = await login(email, password);
    if (result.success) {
        initializeApp();
    } else {
        NotificationService.show(`Giriş xətası: ${result.error}`, 'error');
    }
});

roleGuestBtn.addEventListener('click', async () => {
    const result = await loginAsGuest();
    if (result.success) {
        // After successful anonymous login, if no table number from QR, show table entry screen
        if (!guestApp.guestTableNumber) {
            showGuestTableEntryScreen();
        } else {
            showSection('guest-anonymous'); // Proceed directly if table number is already set (from QR)
        }
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

guestBtn.addEventListener('click', async () => {
    // Auto-login as anonymous guest when guest button is clicked
    const result = await loginAsGuest();
    if (result.success) {
        // After successful anonymous login, if no table number from QR, show table entry screen
        if (!guestApp.guestTableNumber) {
            showGuestTableEntryScreen();
        } else {
            showSection('guest-anonymous'); // Proceed directly if table number is already set (from QR)
        }
    } else {
        NotificationService.show(`Giriş xətası: ${result.error}`, 'error');
    }
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
    const result = await logout();
    if (result.success) {
        initializeApp();
        NotificationService.show('Uğurla çıxış etdiniz.', 'success');
    } else {
        NotificationService.show(`Çıxış xətası: ${result.error}`, 'error');
    }
});

// Listener for custom event to reinitialize app after admin login from modal
window.addEventListener('reinitialize-app', initializeApp);

// Initial app load
initializeApp();