import { login, logout, getCurrentRole, initAuth, loginAsGuest, getCurrentUser } from './auth.js';
import { GuestModule } from './guest.js';
import { renderWaiterSection } from './waiter.js';
import { renderAdminSection, showAdminLoginPrompt } from './admin.js';
import { NotificationService } from './utils/notificationService.js';
import { DataService } from './services/dataService.js';
import { getOfflineOrdersCount } from './utils/offlineDB.js'; // Import to check offline queue size

let offlineMode = !navigator.onLine; // Initial state

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
const offlineIndicator = document.getElementById('offline-indicator'); // New element
const pendingOrdersBadge = document.getElementById('pending-orders-badge'); // New element
const systemStatusMessages = document.getElementById('system-status-messages'); // New element for system self-test

export { offlineMode }; // Export offlineMode for other modules

const sections = {
    'guest': document.getElementById('guest-section'),
    'guest-anonymous': document.getElementById('guest-section'),
    'waiter': document.getElementById('waiter-section'),
    'admin': document.getElementById('admin-section'),
    'manager': document.getElementById('admin-section'),
    'cashier': document.getElementById('admin-section'), // Ensure cashier maps to admin section
    'guest-table-entry': guestTableEntrySection, // New section
};

// New utility function to update all logos
window.updateAllLogos = (logoUrl) => {
    document.querySelectorAll('.app-logo').forEach(img => {
        img.src = logoUrl;
    });
};

// New: Global Error Handling
const handleGlobalError = async (error, source, lineno, colno, errorObject) => {
    console.error("Global Error Caught:", { error, source, lineno, colno, errorObject });

    let errorMessage = "Sistemdə gözlənilməz xəta baş verdi. Zəhmət olmasa, yenidən cəhd edin.";
    let errorDetails = {
        message: error?.message || error || "Unknown error",
        stack: errorObject?.stack || (error instanceof Error ? error.stack : 'No stack trace available'),
        type: errorObject?.name || 'Error',
        source: source || 'N/A',
        lineno: lineno || 'N/A',
        colno: colno || 'N/A',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };

    // Show a user-friendly notification
    NotificationService.show(errorMessage, 'error', 8000);

    // Attempt to send the error report via DataService
    try {
        await DataService.sendErrorReport(errorDetails);
    } catch (reportError) {
        console.error("Failed to send error report:", reportError);
    }

    // Return true to suppress default browser error reporting
    return true;
};

// Listen for uncaught JavaScript errors
window.onerror = (message, source, lineno, colno, errorObject) => {
    return handleGlobalError(message, source, lineno, colno, errorObject);
};

// Listen for unhandled promise rejections
window.onunhandledrejection = (event) => {
    const error = event.reason;
    let errorObject = null;
    if (error instanceof Error) {
        errorObject = error;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorObject = new Error(error.message);
        errorObject.stack = error.stack;
        errorObject.name = error.name;
    } else {
        errorObject = new Error(String(error)); // Convert anything to an Error object
    }
    return handleGlobalError(errorObject, 'Unhandled Promise Rejection', null, null, errorObject);
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
            // The guestApp itself will handle prompting for table/customer info if missing
            guestApp.render(sections[role]);
            guestNotificationsBtn.classList.remove('hidden'); // Guest should always see their notifications btn
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

// Function to update the offline indicator UI
const updateOfflineIndicator = async () => {
    if (offlineIndicator) {
        if (offlineMode) {
            offlineIndicator.classList.remove('hidden', 'online');
            offlineIndicator.classList.add('bg-red-100', 'text-red-800');
            // Check for pending orders in IndexedDB
            const pendingCount = await getOfflineOrdersCount();
            if (pendingCount > 0) {
                pendingOrdersBadge.textContent = `(${pendingCount})`;
                pendingOrdersBadge.classList.remove('hidden');
                // Only show notification if not already shown recently to avoid spam
                if (!offlineIndicator.dataset.notified || (Date.now() - offlineIndicator.dataset.notified > 10000)) {
                    NotificationService.show(`Offline rejimdəsiniz. ${pendingCount} sifariş sinxronizasiyanı gözləyir.`, 'warning', 5000);
                    offlineIndicator.dataset.notified = Date.now();
                }
            } else {
                pendingOrdersBadge.classList.add('hidden');
                // No notification if count is 0, as it implies all synced or nothing was pending
            }
        } else {
            offlineIndicator.classList.add('hidden');
            // Check if there were any pending orders that just synced
            const lastPendingCount = await getOfflineOrdersCount();
            if (lastPendingCount === 0 && offlineIndicator.dataset.notified) {
                // If it was hidden before and now zero, means it just synced
                NotificationService.show('İnternet bərpa olundu. Bütün offline sifarişlər sinxronizasiya edildi.', 'success', 5000);
                delete offlineIndicator.dataset.notified; // Reset notification flag
            } else if (lastPendingCount > 0) {
                 NotificationService.show(`İnternet bərpa olundu. ${lastPendingCount} sifariş sinxronizasiyanı gözləyir.`, 'warning', 5000);
            } else {
                NotificationService.show('İnternet bərpa olundu.', 'info', 3000);
            }
            pendingOrdersBadge.classList.add('hidden');
        }
    }
};

// New: Self-test system and critical error display
const checkSystemHealth = async () => {
    let issues = [];

    // Clear previous messages and hide
    systemStatusMessages.innerHTML = '';
    systemStatusMessages.classList.add('hidden');

    // 1. Basic Network Check
    if (!navigator.onLine) {
        issues.push("İnternet bağlantısı yoxdur. Tətbiq offline rejimdə işləyə bilər, lakin məlumat sinxronizasiyası mümkün deyil.");
        offlineMode = true;
        await updateOfflineIndicator();
    } else {
        offlineMode = false;
        await updateOfflineIndicator();
    }

    // 2. Firebase and Data Service Connectivity Check
    // Attempt to fetch a non-critical piece of data from DataService.
    // DataService already has internal fallbacks (cache, initialData),
    // so if this fails, it indicates a severe issue with even those fallbacks or Firebase itself.
    try {
        const businessInfo = await DataService.getBusinessInfo();
        if (!businessInfo || !businessInfo.businessName) {
            issues.push("Biznes məlumatları yüklənə bilmədi. Firebase konfiqurasiyasında və ya məlumat servisində problem ola bilər.");
        }
    } catch (e) {
        console.error("Critical DataService check failed:", e);
        issues.push(`Serverə qoşularkən xəta: ${e.message || 'Naməlum xəta'}. Firewall, VPN və ya Firebase konfiqurasiyasını yoxlayın.`);
    }

    // 3. Display critical issues or indicate success
    if (issues.length > 0) {
        systemStatusMessages.innerHTML = `
            <div class="ultra-modern-card p-6 text-center w-full max-w-lg">
                <h3 class="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent mb-4">Sistem Başlanğıc Xətası!</h3>
                <ul class="text-left text-slate-700 list-disc list-inside space-y-2 mb-6">
                    ${issues.map(issue => `<li class="flex items-start"><span class="mr-2 text-red-500">●</span><span>${issue}</span></li>`).join('')}
                </ul>
                <p class="text-sm text-slate-600 mb-6">
                    Yuxarıdakı problemlər tətbiqin düzgün işləməsinə mane olur.
                    Zəhmət olmasa, internet bağlantınızı yoxlayın, tətbiqi yenidən başladın.
                    Problem davam edərsə, sistem administratoru ilə əlaqə saxlayın.
                </p>
                <button id="retry-app-load" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Yenidən Cəhd Et
                </button>
            </div>
        `;
        systemStatusMessages.classList.remove('hidden');
        return false; // System health check failed
    } else {
        systemStatusMessages.classList.add('hidden');
        return true; // System is healthy
    }
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
            // Set guestTableNumber from URL, also store in localStorage
            guestApp.guestTableNumber = parsedTable;
            localStorage.setItem('guestTableNumber', parsedTable);
            // Optionally, clear name/mobile if starting fresh from QR (or prompt later)
            // localStorage.removeItem('customerName');
            // localStorage.removeItem('customerMobile');
            
             // If a table is specified in the URL, log in as a guest automatically
            await loginAsGuest(); // Login anonymously immediately for QR code users
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

    // Load existing customer info from localStorage if available
    guestApp.customerName = localStorage.getItem('customerName') || null;
    guestApp.customerMobile = localStorage.getItem('customerMobile') || null;

    // Set up online/offline event listeners
    window.addEventListener('online', async () => {
        offlineMode = false;
        await updateOfflineIndicator();
        await DataService.syncOrdersQueue(); // Attempt to sync pending orders
    });
    window.addEventListener('offline', async () => {
        offlineMode = true;
        await updateOfflineIndicator();
    });

    // Initial check and update for offline indicator
    await updateOfflineIndicator();

    // NEW: Perform system health check before proceeding
    const isSystemHealthy = await checkSystemHealth();
    if (!isSystemHealthy) {
        // If system is not healthy, hide splash and stop here.
        // The systemStatusMessages div is now visible.
        if (splashScreen) {
            splashScreen.classList.add('hidden');
        }
        return;
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

        if (role === 'guest-anonymous') {
            // If table number and customer info are all set, go straight to menu
            if (guestApp.guestTableNumber && guestApp.customerName && guestApp.customerMobile) {
                showSection(role);
            } else {
                // Otherwise, show the guest table entry screen to get initial info
                // guestApp's placeOrder will trigger the name/mobile prompt if they are missing
                showGuestTableEntryScreen();
            }
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
        // The guestApp.render() will then decide if it needs to prompt for name/mobile on order.
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
            showSection('guest-anonymous'); // Now render the actual guest menu, guestApp will prompt for name/mobile if needed
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
    // Clear guest specific info from local storage on logout
    localStorage.removeItem('guestTableNumber');
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerMobile');

    guestApp.guestTableNumber = null; // Reset internal state
    guestApp.customerName = null;
    guestApp.customerMobile = null;
    guestApp.lastKnownOrderStatuses = {}; // Clear tracked order statuses for next session

    if (guestApp.orderListenerUnsubscribe) {
        guestApp.orderListenerUnsubscribe(); // Unsubscribe from order tracking
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

document.getElementById('profile-settings-link').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default anchor behavior
    NotificationService.show('Profil tənzimləmələri funksiyası gələcəkdə əlavə ediləcək.', 'info');
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
        <div class="ultra-modern-card p-0 w-full max-w-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
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

// Event listener for guest notifications button in the header
guestNotificationsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    guestApp.showOrderStatusModal();
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

// Add event listener for the retry button in system status messages
systemStatusMessages.addEventListener('click', (event) => {
    if (event.target.id === 'retry-app-load') {
        systemStatusMessages.classList.add('hidden'); // Hide the error message
        initializeApp(); // Re-attempt app initialization
    }
});