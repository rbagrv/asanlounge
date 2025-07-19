import { createElement, createAdminProductForm, createTableCard, createAnalyticsCard, createProductCard, createDiscountForm, createTableForm, createInventoryItemForm, createPurchaseForm, createEmployeeForm, createCategoryForm } from './components.js';
import { DataService } from './services/dataService.js'; 
import { NotificationService } from './utils/notificationService.js';
import { isAdmin, requireAdmin, getCurrentRole, isManager, isCashier, registerUser, loginAdmin } from './auth.js'; 
import { CartService } from './utils/cartService.js';
import { StatusUtils } from './utils/statusUtils.js'; 
import { db } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

let adminCartService = new CartService();
let currentModal = null; 
let audioContext;
let newOrderSoundBuffer;
let knownOrderIds = new Set();
let orderListener = null;

// Initialize audio for notifications
const initAudio = async () => {
    try {
        document.body.addEventListener('click', async () => {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            if (!newOrderSoundBuffer) {
                const response = await fetch('new_order_alert.mp3');
                const arrayBuffer = await response.arrayBuffer();
                newOrderSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
            }
        }, { once: true });
    } catch (error) {
        console.warn('Could not initialize audio for notifications.', error);
    }
};

const playNewOrderSound = () => {
    if (!audioContext || !newOrderSoundBuffer) {
        return;
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            const source = audioContext.createBufferSource();
            source.buffer = newOrderSoundBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        });
    } else {
        const source = audioContext.createBufferSource();
        source.buffer = newOrderSoundBuffer;
        source.connect(audioContext.destination);
        source.start(0);
    }
};

// Real-time order monitoring
const startOrderMonitoring = () => {
    if (orderListener) {
        orderListener(); // Unsubscribe previous listener
    }

    const ordersColRef = collection(db, 'orders');
    const q = query(ordersColRef, orderBy('createdAt', 'desc'));

    orderListener = onSnapshot(q, (snapshot) => {
        let isFirstLoad = knownOrderIds.size === 0;
        const newKnownOrderIds = new Set();

        snapshot.docs.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            newKnownOrderIds.add(order.id);

            if (!isFirstLoad && !knownOrderIds.has(order.id) && order.status === 'pending') {
                // New order detected
                playNewOrderSound();
                showNewOrderPopup(order);
                NotificationService.show(`🔔 Yeni sifariş: Masa ${order.tableNumber}`, 'info', 8000);
            }
        });

        knownOrderIds = newKnownOrderIds;
    }, (error) => {
        console.error("Error listening to orders: ", error);
    });
};

const showNewOrderPopup = (order) => {
    const popup = createElement('div', {
        className: 'fixed top-4 right-4 z-[60] max-w-sm w-full transform translate-x-full transition-transform duration-500'
    });

    const total = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);

    popup.innerHTML = `
        <div class="ultra-modern-card p-6 border-l-4 border-orange-500 shadow-2xl animate-pulse">
            <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-bold text-slate-800 flex items-center">
                    🔔 Yeni Sifariş
                </h4>
                <button class="close-popup w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center text-slate-600">×</button>
            </div>
            <div class="space-y-2">
                <p class="font-semibold text-primary-600">Masa ${order.tableNumber}</p>
                <div class="text-sm text-slate-600">
                    ${order.items.map(item => `<p>• ${item.name} x${item.quantity}</p>`).join('')}
                </div>
                <p class="font-bold text-green-600 text-lg">${total.toFixed(2)} AZN</p>
            </div>
            <button class="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm view-order-btn">
                Sifarişi Gör
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    // Animate in
    setTimeout(() => {
        popup.classList.remove('translate-x-full');
    }, 100);

    // Auto remove after 10 seconds
    const autoRemove = setTimeout(() => {
        if (popup.parentNode) {
            popup.classList.add('translate-x-full');
            setTimeout(() => {
                if (popup.parentNode) {
                    document.body.removeChild(popup);
                }
            }, 500);
        }
    }, 10000);

    popup.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-popup')) {
            clearTimeout(autoRemove);
            popup.classList.add('translate-x-full');
            setTimeout(() => {
                if (popup.parentNode) {
                    document.body.removeChild(popup);
                }
            }, 500);
        }

        if (e.target.classList.contains('view-order-btn')) {
            clearTimeout(autoRemove);
            popup.classList.add('translate-x-full');
            setTimeout(() => {
                if (popup.parentNode) {
                    document.body.removeChild(popup);
                }
            }, 500);
            // Switch to orders section
            const ordersNavItem = document.querySelector('[data-section="orders"]');
            if (ordersNavItem) {
                ordersNavItem.click();
            }
        }
    });
};

const renderSidebarNav = (currentRole) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z', roles: ['admin', 'manager', 'cashier'] },
        { id: 'pos', label: 'POS Sistemi', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3h10a3 3 0 00-3 3m0 0V5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4', roles: ['admin', 'manager', 'cashier'] },
        { id: 'orders', label: 'Sifarişlər', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4', roles: ['admin', 'manager', 'cashier'] },
        { id: 'cashier', label: 'Kassa', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', roles: ['admin', 'manager', 'cashier'] },
        { id: 'products', label: 'Məhsullar', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', roles: ['admin', 'manager'] },
        { id: 'categories', label: 'Kateqoriyalar', icon: 'M19 11H5m14-7H5m14 14H5', roles: ['admin', 'manager'] },
        { id: 'customers', label: 'Müştərilər', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', roles: ['admin', 'manager', 'cashier'] },
        { id: 'suppliers', label: 'Təchizatçılar', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', roles: ['admin', 'manager'] },
        { id: 'tables', label: 'Masalar', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l2.5 5m6.5-5l2.5 5', roles: ['admin', 'manager'] },
        { id: 'discounts', label: 'Endirimlər', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1', roles: ['admin', 'manager'] },
        { id: 'inventory', label: 'Inventar', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', roles: ['admin', 'manager'] },
        { id: 'purchases', label: 'Alışlar', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5l2.5 5', roles: ['admin', 'manager'] },
        { id: 'employees', label: 'İşçilər', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', roles: ['admin'] },
        { id: 'reports', label: 'Hesabatlar', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', roles: ['admin', 'manager'] },
        { id: 'settings', label: 'Tənzimləmələr', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 011.065 2.572c1.756.426-1.756 2.924 0 3.35a1.724 1.724 0 01-1.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', roles: ['admin', 'manager'] }
    ];

    return navItems
        .filter(item => item.roles.includes(currentRole))
        .map(item => `
            <button class="nav-item w-full flex items-center px-3 py-3 text-sm font-medium rounded-xl text-slate-600 hover:bg-primary-50 hover:text-primary-700 transition-colors duration-200 group" data-section="${item.id}">
                <svg class="mr-3 flex-shrink-0 h-5 w-5 group-hover:text-primary-500 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"/>
                </svg>
                ${item.label}
            </button>
        `).join('');
};

export const showAdminLoginPrompt = () => {
    const modal = createElement('div', {
        className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    });

    modal.innerHTML = `
        <div class="ultra-modern-card p-8 w-full max-w-md animate-scale-in">
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 0v2m0-2h2m-2 0h-2m9-6a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-slate-800 mb-2">Admin Girişi</h2>
                <p class="text-slate-600">Admin panelinə daxil olmaq üçün məlumatlarınızı daxil edin</p>
            </div>
            
            <form id="admin-login-form" class="space-y-4">
                <div>
                    <label for="admin-email" class="block text-sm font-bold text-slate-700 mb-2">Email</label>
                    <input type="email" id="admin-email" name="email" required value="admin@restaurant.com"
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base"
                           placeholder="admin@restaurant.com">
                </div>
                
                <div>
                    <label for="admin-password" class="block text-sm font-bold text-slate-700 mb-2">Şifrə</label>
                    <input type="password" id="admin-password" name="password" required value="admin123"
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base"
                           placeholder="••••••••">
                </div>
                
                <div class="flex space-x-3 pt-4">
                    <button type="button" id="cancel-admin-login" 
                            class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300">
                        Ləğv et
                    </button>
                    <button type="submit" 
                            class="flex-1 premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
                        Daxil ol
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('#cancel-admin-login').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        const result = await loginAdmin(email, password);
        if (result.success) {
            document.body.removeChild(modal);
            NotificationService.show('Admin girişi uğurla tamamlandı!', 'success');
            // Trigger app reinitialization
            window.dispatchEvent(new Event('reinitialize-app'));
        } else {
            NotificationService.show(`Giriş xətası: ${result.error}`, 'error');
        }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
};

export const renderAdminSection = (container) => {
    const currentRole = getCurrentRole();
    const authorizedRoles = ['admin', 'manager', 'cashier'];

    if (!authorizedRoles.includes(currentRole)) {
        container.innerHTML = `
            <div class="max-w-md mx-auto mt-20 animate-slide-in">
                <div class="ultra-modern-card p-8 text-center">
                    <div class="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 0v2m0-2h2m-2 0h-2m9-6a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800 mb-4">Giriş Tələb Olunur</h2>
                    <p class="text-slate-600 mb-6">Admin panelinə daxil olmaq üçün giriş etməlisiniz.</p>
                    <button id="admin-login-btn" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                        Admin Girişi
                    </button>
                </div>
            </div>
        `;
        
        container.querySelector('#admin-login-btn').addEventListener('click', () => {
            showAdminLoginPrompt();
        });
        
        return;
    }

    // Modern admin dashboard with sidebar navigation
    container.innerHTML = `
        <div class="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <!-- Sidebar -->
            <div class="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
                <div class="flex-1 flex flex-col min-h-0">
                    <div class="glass-card border-r border-white/20 h-full">
                        <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                            <div class="flex items-center flex-shrink-0 px-4 mb-8">
                                <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <h1 class="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Restoran</h1>
                                    <p class="text-xs text-slate-500 font-medium">Admin Panel</p>
                                </div>
                            </div>
                            <nav class="flex-1 px-2 space-y-2">
                                ${renderSidebarNav(currentRole)}
                            </nav>
                        </div>
                        <div class="flex-shrink-0 flex border-t border-white/20 p-4">
                            <div class="flex items-center w-full">
                                <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm font-bold text-slate-800 capitalize">${currentRole}</p>
                                    <p class="text-xs text-slate-500 flex items-center">
                                        <div class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                        Onlayn
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile sidebar -->
            <div id="mobile-sidebar" class="fixed inset-0 flex z-50 lg:hidden hidden">
                <div class="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm" id="sidebar-overlay"></div>
                <div class="relative flex-1 flex flex-col max-w-xs w-full bg-white/95 backdrop-blur-xl">
                    <div class="absolute top-0 right-0 -mr-12 pt-2">
                        <button id="close-sidebar" class="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                            <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div class="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                        <div class="flex items-center flex-shrink-0 px-4 mb-8">
                            <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                                </svg>
                            </div>
                            <div class="ml-3">
                                <h1 class="text-lg font-bold text-slate-800">Restoran</h1>
                                <p class="text-xs text-slate-500 font-medium">Admin Panel</p>
                            </div>
                        </div>
                        <nav class="px-2 space-y-2">
                            ${renderSidebarNav(currentRole)}
                        </nav>
                    </div>
                </div>
            </div>

            <!-- Main content -->
            <div class="lg:pl-64 flex flex-col flex-1 min-h-screen">
                <div class="sticky top-0 z-20 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gradient-to-r from-white/95 to-white/90 backdrop-blur-xl border-b border-white/20">
                    <button id="open-sidebar" class="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                <!-- Main content area -->
                <main class="flex-1 p-6">
                    <div id="admin-content">
                        <!-- Content will be loaded here -->
                    </div>
                </main>
            </div>
        </div>
    `;

    // Initialize functionality
    initAudio();
    startOrderMonitoring();
    setupAdminEventListeners(container);
    showDashboard(); // Show dashboard by default
};

const setupAdminEventListeners = (container) => {
    // Navigation event listeners
    container.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            const section = navItem.dataset.section;
            
            // Update active nav item
            container.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('bg-primary-50', 'text-primary-700');
                item.classList.add('text-slate-600');
            });
            navItem.classList.add('bg-primary-50', 'text-primary-700');
            navItem.classList.remove('text-slate-600');
            
            // Load section content
            loadAdminSection(section);
        }

        // Mobile sidebar controls
        if (e.target.closest('#open-sidebar')) {
            container.querySelector('#mobile-sidebar').classList.remove('hidden');
        }
        
        if (e.target.closest('#close-sidebar') || e.target.closest('#sidebar-overlay')) {
            container.querySelector('#mobile-sidebar').classList.add('hidden');
        }
    });
};

const loadAdminSection = (section) => {
    const contentArea = document.querySelector('#admin-content');
    
    switch (section) {
        case 'dashboard':
            showDashboard();
            break;
        case 'pos':
            showPOSSection();
            break;
        case 'orders':
            showOrdersSection();
            break;
        case 'cashier':
            showCashierSection();
            break;
        case 'products':
            showProductsSection();
            break;
        case 'categories':
            showCategoriesSection();
            break;
        case 'customers':
            showCustomersSection();
            break;
        case 'suppliers':
            showSuppliersSection();
            break;
        case 'tables':
            showTablesSection();
            break;
        case 'discounts':
            showDiscountsSection();
            break;
        case 'inventory':
            showInventorySection();
            break;
        case 'purchases':
            showPurchasesSection();
            break;
        case 'employees':
            showEmployeesSection();
            break;
        case 'reports':
            showReportsSection();
            break;
        case 'settings':
            showSettingsSection();
            break;
        default:
            showDashboard();
    }
};

const showDashboard = async () => {
    const contentArea = document.querySelector('#admin-content');
    
    try {
        const analytics = await DataService.getAnalytics();
        
        contentArea.innerHTML = `
            <div class="space-y-8">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
                    <p class="text-slate-600">Restoranın ümumi statistikası və təzə məlumatlar</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${createAnalyticsCard('Ümumi Sifarişlər', analytics?.totalOrders || 0, '', 'blue').outerHTML}
                    ${createAnalyticsCard('Bugünkü Sifarişlər', analytics?.todayOrders || 0, '', 'green').outerHTML}
                    ${createAnalyticsCard('Ümumi Gəlir', `${(analytics?.totalRevenue || 0).toFixed(2)} AZN`, '', 'purple').outerHTML}
                    ${createAnalyticsCard('Bugünkü Gəlir', `${(analytics?.todayRevenue || 0).toFixed(2)} AZN`, '', 'orange').outerHTML}
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="ultra-modern-card p-6">
                        <h2 class="text-xl font-bold text-slate-800 mb-4">Aktiv Sifarişlər</h2>
                        <div id="active-orders-list">
                            <!-- Real-time orders will be loaded here -->
                        </div>
                    </div>
                    
                    <div class="ultra-modern-card p-6">
                        <h2 class="text-xl font-bold text-slate-800 mb-4">Populyar Məhsullar</h2>
                        <div class="space-y-3">
                            ${analytics?.popularItems?.map(item => `
                                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span class="font-medium text-slate-700">${item.name}</span>
                                    <span class="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-semibold">${item.count}</span>
                                </div>
                            `).join('') || '<p class="text-slate-500">Məlumat yoxdur</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        loadActiveOrders();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        contentArea.innerHTML = `<p class="text-red-500">Dashboard yüklənərkən xəta baş verdi. Zəhmət olmasa internet bağlantınızı və Firebase konfiqurasiyanızı yoxlayın.</p>`;
        NotificationService.show('Dashboard yüklənərkən xəta baş verdi.', 'error');
    }
};

const loadActiveOrders = async () => {
    try {
        const orders = await DataService.getOrders();
        const activeOrders = orders.filter(order => 
            ['pending', 'in-prep', 'ready'].includes(order.status)
        );
        
        const activeOrdersList = document.querySelector('#active-orders-list');
        if (activeOrdersList) {
            if (activeOrders.length === 0) {
                activeOrdersList.innerHTML = '<p class="text-slate-500 text-center py-8">Aktiv sifariş yoxdur</p>';
            } else {
                activeOrdersList.innerHTML = activeOrders.slice(0, 5).map(order => `
                    <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg mb-3">
                        <div>
                            <p class="font-medium text-slate-800">Masa ${order.tableNumber}</p>
                            <p class="text-sm text-slate-500">${order.items.length} məhsul</p>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${StatusUtils.getStatusColor(order.status)}">
                            ${StatusUtils.getStatusText(order.status)}
                        </span>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading active orders:', error);
        const activeOrdersList = document.querySelector('#active-orders-list');
        if (activeOrdersList) {
            activeOrdersList.innerHTML = '<p class="text-red-500 text-center py-8">Aktiv sifarişlər yüklənə bilmədi.</p>';
        }
    }
};

const showPOSSection = async () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">POS Sistemi</h1>
                    <p class="text-slate-600">Satış nöqtəsi sistemi - sürətli sifariş qəbulu</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Products Selection -->
                <div class="lg:col-span-2 ultra-modern-card p-6">
                    <div class="mb-4">
                        <div id="pos-categories-filter" class="flex flex-wrap gap-2 mb-4">
                            <button class="pos-category-filter bg-primary-500 text-white px-4 py-2 rounded-lg" data-category="all">Hamısı</button>
                        </div>
                        <input type="text" id="pos-search" placeholder="Məhsul axtar..." 
                               class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                    
                    <div id="pos-products-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div class="flex justify-center py-8 col-span-full">
                            <div class="loading-spinner"></div>
                        </div>
                    </div>
                </div>
                
                <!-- POS Cart -->
                <div class="ultra-modern-card p-6">
                    <h2 class="text-xl font-bold text-slate-800 mb-4">Cari Sifariş</h2>
                    <div class="mb-4">
                        <label class="block text-sm font-bold text-slate-700 mb-2">Masa Nömrəsi</label>
                        <input type="number" id="pos-table-number" min="1" 
                               class="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500"
                               placeholder="Masa nömrəsi">
                    </div>
                    
                    <div id="pos-cart-items" class="space-y-3 mb-6 max-h-60 overflow-y-auto">
                        <p class="text-slate-500 text-center py-8">Məhsul seçin</p>
                    </div>
                    
                    <div class="border-t pt-4 mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold">Ara cəm:</span>
                            <span id="pos-subtotal">0.00 AZN</span>
                        </div>
                        <div class="flex justify-between items-center mb-2">
                            <span>Vergi (18%):</span>
                            <span id="pos-tax">0.00 AZN</span>
                        </div>
                        <div class="flex justify-between items-center text-lg font-bold">
                            <span>Ümumi:</span>
                            <span id="pos-total">0.00 AZN</span>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <button id="pos-place-order" disabled
                                class="w-full premium-gradient-btn disabled:bg-slate-300 text-white px-4 py-3 rounded-xl font-semibold">
                            Sifariş Ver
                        </button>
                        <button id="pos-clear-cart" 
                                class="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-3 rounded-xl font-semibold">
                            Səbəti Təmizlə
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await loadPOSProducts();
    setupPOSEventListeners();
};

const showCashierSection = async () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Kassa Sistemi</h1>
                    <p class="text-slate-600">Ödəniş qəbulu və satış hesabatları</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="ultra-modern-card p-6 text-center">
                    <h3 class="text-lg font-bold text-slate-800 mb-2">Günlük Satış</h3>
                    <p id="daily-sales" class="text-3xl font-bold text-green-600">0.00 AZN</p>
                </div>
                <div class="ultra-modern-card p-6 text-center">
                    <h3 class="text-lg font-bold text-slate-800 mb-2">Günlük Sifarişlər</h3>
                    <p id="daily-orders" class="text-3xl font-bold text-blue-600">0</p>
                </div>
                <div class="ultra-modern-card p-6 text-center">
                    <h3 class="text-lg font-bold text-slate-800 mb-2">Orta Sifariş</h3>
                    <p id="average-order" class="text-3xl font-bold text-purple-600">0.00 AZN</p>
                </div>
            </div>
            
            <div class="ultra-modern-card p-6">
                <h2 class="text-xl font-bold text-slate-800 mb-4">Ödəniş Gözləyən Sifarişlər</h2>
                <div id="payment-pending-orders" class="space-y-4">
                    <div class="flex justify-center py-8">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await loadCashierData();
    setupCashierEventListeners();
};

const showProductsSection = async () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Məhsullar</h1>
                    <p class="text-slate-600">Məhsul kataloqunu idarə edin</p>
                </div>
                <button id="add-product-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Məhsul Əlavə Et
                </button>
            </div>
            
            <div class="ultra-modern-card p-6">
                <div id="products-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div class="flex justify-center py-8 col-span-full">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    try {
        const [products, categories] = await Promise.all([
            DataService.getProducts(),
            DataService.getCategories()
        ]);
        
        const productsList = document.querySelector('#products-list');
        
        if (products.length === 0) {
            productsList.innerHTML = '<p class="text-slate-500 text-center py-8 col-span-full">Məhsul yoxdur</p>';
        } else {
            productsList.innerHTML = products.map(product => {
                const productCard = createProductCard(product, false);
                productCard.innerHTML += `
                    <div class="mt-4 flex space-x-2">
                        <button class="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm edit-product-btn" data-product-id="${product.id}">
                            Redaktə
                        </button>
                        <button class="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm delete-product-btn" data-product-id="${product.id}">
                            Sil
                        </button>
                    </div>
                `;
                return productCard.outerHTML;
            }).join('');
        }
        
        // Event listeners
        document.querySelector('#add-product-btn').addEventListener('click', () => {
            showProductModal(null, categories);
        });
        
        productsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-product-btn')) {
                const productId = e.target.dataset.productId;
                const product = products.find(p => p.id === productId);
                showProductModal(product, categories);
            }
            
            if (e.target.classList.contains('delete-product-btn')) {
                const productId = e.target.dataset.productId;
                const product = products.find(p => p.id === productId);
                showDeleteConfirmation(`${product.name} məhsulunu silmək`, () => deleteProduct(productId));
            }
        });
        
    } catch (error) {
        console.error('Error loading products:', error);
        NotificationService.show('Məhsullar yüklənərkən xəta baş verdi.', 'error');
    }
};

const showProductModal = (product, categories) => {
    const modal = createElement('div', {
        className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    });
    
    modal.innerHTML = `
        <div class="ultra-modern-card p-0 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div class="p-6 border-b border-slate-200">
                <h2 class="text-2xl font-bold text-slate-800">
                    ${product ? 'Məhsulu Redaktə Et' : 'Yeni Məhsul Əlavə Et'}
                </h2>
            </div>
            <div class="p-6">
                ${createAdminProductForm(product, categories).outerHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    currentModal = modal;
    
    // Form submission
    const form = modal.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            imageUrl: formData.get('imageUrl'),
            category: formData.get('category'),
            discountPercentage: parseInt(formData.get('discountPercentage')) || 0,
            stock: parseInt(formData.get('stock')) || 0,
            isCampaignItem: formData.has('isCampaignItem')
        };
        
        try {
            if (product) {
                await DataService.updateProduct(product.id, productData);
                NotificationService.show('Məhsul uğurla yeniləndi', 'success');
            } else {
                await DataService.addProduct(productData);
                NotificationService.show('Məhsul uğurla əlavə edildi', 'success');
            }
            
            closeModal();
            showProductsSection();
        } catch (error) {
            NotificationService.show('Xəta baş verdi', 'error');
        }
    });
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
};

const showCategoriesSection = async () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Kateqoriyalar</h1>
                    <p class="text-slate-600">Məhsul kateqoriyalarını idarə edin</p>
                </div>
                <button id="add-category-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Kateqoriya Əlavə Et
                </button>
            </div>
            
            <div class="ultra-modern-card p-6">
                <div id="categories-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="flex justify-center py-8 col-span-full">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    try {
        const categories = await DataService.getCategories();
        const categoriesList = document.querySelector('#categories-list');
        
        if (categories.length === 0) {
            categoriesList.innerHTML = '<p class="text-slate-500 text-center py-8 col-span-full">Kateqoriya yoxdur</p>';
        } else {
            categoriesList.innerHTML = categories.map(category => `
                <div class="ultra-modern-card p-4">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">${category.name}</h3>
                    <div class="flex space-x-2">
                        <button class="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm edit-category-btn" data-category-id="${category.id}">
                            Redaktə
                        </button>
                        <button class="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm delete-category-btn" data-category-id="${category.id}">
                            Sil
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        // Event listeners
        document.querySelector('#add-category-btn').addEventListener('click', () => {
            showCategoryModal(null);
        });
        
        categoriesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-category-btn')) {
                const categoryId = e.target.dataset.categoryId;
                const category = categories.find(c => c.id === categoryId);
                showCategoryModal(category);
            }
            
            if (e.target.classList.contains('delete-category-btn')) {
                const categoryId = e.target.dataset.categoryId;
                const category = categories.find(c => c.id === categoryId);
                showDeleteConfirmation(`${category.name} kateqoriyasını silmək`, () => deleteCategory(categoryId));
            }
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
        NotificationService.show('Kateqoriyalar yüklənərkən xəta baş verdi.', 'error');
    }
};

const showCategoryModal = (category) => {
    const modal = createElement('div', {
        className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    });
    
    modal.innerHTML = `
        <div class="ultra-modern-card p-0 w-full max-w-md">
            <div class="p-6 border-b border-slate-200">
                <h2 class="text-2xl font-bold text-slate-800">
                    ${category ? 'Kateqoriyanı Redaktə Et' : 'Yeni Kateqoriya Əlavə Et'}
                </h2>
            </div>
            <div class="p-6">
                ${createCategoryForm(category).outerHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    currentModal = modal;
    
    // Form submission
    const form = modal.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const categoryData = {
            name: formData.get('name')
        };
        
        try {
            if (category) {
                await DataService.updateCategory(category.id, categoryData);
                NotificationService.show('Kateqoriya uğurla yeniləndi', 'success');
            } else {
                await DataService.addCategory(categoryData);
                NotificationService.show('Kateqoriya uğurla əlavə edildi', 'success');
            }
            
            closeModal();
            showCategoriesSection();
        } catch (error) {
            NotificationService.show('Xəta baş verdi', 'error');
        }
    });
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
};

const showTablesSection = async () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Masalar</h1>
                    <p class="text-slate-600">Masa idarəetmə sistemi</p>
                </div>
                <button id="add-table-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Masa Əlavə Et
                </button>
            </div>
            
            <div class="ultra-modern-card p-6">
                <div id="tables-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div class="flex justify-center py-8 col-span-full">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    try {
        const tables = await DataService.getTables();
        const tablesList = document.querySelector('#tables-list');
        
        if (tables.length === 0) {
            tablesList.innerHTML = '<p class="text-slate-500 text-center py-8 col-span-full">Masa yoxdur</p>';
        } else {
            tablesList.innerHTML = tables.map(table => createTableCard(table).outerHTML).join('');
        }
        
        // Event listeners
        document.querySelector('#add-table-btn').addEventListener('click', () => {
            showTableModal(null);
        });
        
        tablesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-table-btn')) {
                const tableId = e.target.dataset.tableId;
                const table = tables.find(t => t.id === tableId);
                showTableModal(table);
            }
            
            if (e.target.classList.contains('qr-code-btn')) {
                const tableId = e.target.dataset.tableId;
                const table = tables.find(t => t.id === tableId);
                showQRCodeModal(table);
            }
        });
        
    } catch (error) {
        console.error('Error loading tables:', error);
        NotificationService.show('Masalar yüklənərkən xəta baş verdi.', 'error');
    }
};

const showTableModal = (table) => {
    const modal = createElement('div', {
        className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    });
    
    modal.innerHTML = `
        <div class="ultra-modern-card p-0 w-full max-w-md">
            <div class="p-6 border-b border-slate-200">
                <h2 class="text-2xl font-bold text-slate-800">
                    ${table ? 'Masanı Redaktə Et' : 'Yeni Masa Əlavə Et'}
                </h2>
            </div>
            <div class="p-6">
                ${createTableForm(table).outerHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    currentModal = modal;
    
    // Form submission
    const form = modal.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const tableData = {
            number: parseInt(formData.get('number')),
            capacity: parseInt(formData.get('capacity')),
            isOccupied: formData.has('isOccupied')
        };
        
        try {
            if (table) {
                await DataService.updateTable(table.id, tableData);
                NotificationService.show('Masa uğurla yeniləndi', 'success');
            } else {
                await DataService.addTable(tableData);
                NotificationService.show('Masa uğurla əlavə edildi', 'success');
            }
            
            closeModal();
            showTablesSection();
        } catch (error) {
            NotificationService.show('Xəta baş verdi', 'error');
        }
    });
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
};

const showQRCodeModal = (table) => {
    const modal = createElement('div', {
        className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    });
    
    modal.innerHTML = `
        <div class="ultra-modern-card p-8 w-full max-w-md text-center">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Masa ${table.number} QR Kodu</h2>
            <div id="qr-code" class="mb-6 flex justify-center"></div>
            <p class="text-slate-600 mb-4">Bu QR kodu Masa ${table.number} üçün menyu linkini açır</p>
            <button id="close-qr-modal" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                Bağla
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Generate QR Code
    try {
        const qrCodeContainer = modal.querySelector('#qr-code');
        const qrcode = new QRCode(qrCodeContainer, {
            text: table.qrCode,
            width: 200,
            height: 200,
            colorDark: '#1f2937',
            colorLight: '#ffffff',
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        modal.querySelector('#qr-code').innerHTML = '<p class="text-red-500">QR kod yaradıla bilmədi</p>';
    }
    
    modal.querySelector('#close-qr-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
};

const showDiscountsSection = () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Endirimlər</h1>
                    <p class="text-slate-600">Endirim kampaniyalarını idarə edin</p>
                </div>
                <button id="add-discount-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Endirim Əlavə Et
                </button>
            </div>
            
            <div class="ultra-modern-card p-6">
                <p class="text-slate-500 text-center py-8">Endirimlər bölməsi hazırlanır...</p>
            </div>
        </div>
    `;
};

const showInventorySection = () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Inventar</h1>
                    <p class="text-slate-600">Anbar idarəetməsi</p>
                </div>
                <button id="add-inventory-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Məhsul Əlavə Et
                </button>
            </div>
            
            <div class="ultra-modern-card p-6">
                <p class="text-slate-500 text-center py-8">Inventar bölməsi hazırlanır...</p>
            </div>
        </div>
    `;
};

const showPurchasesSection = () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Alışlar</h1>
                    <p class="text-slate-600">Satınalma idarəetməsi</p>
                </div>
                <button id="add-purchase-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Alış Əlavə Et
                </button>
            </div>
            
            <div class="ultra-modern-card p-6">
                <p class="text-slate-500 text-center py-8">Alışlar bölməsi hazırlanır...</p>
            </div>
        </div>
    `;
};

const showEmployeesSection = () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">İşçilər</h1>
                    <p class="text-slate-600">İşçi idarəetməsi</p>
                </div>
                <button id="add-employee-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    İşçi Əlavə Et
                </button>
            </div>
            
            <div class="ultra-modern-card p-6">
                <p class="text-slate-500 text-center py-8">İşçilər bölməsi hazırlanır...</p>
            </div>
        </div>
    `;
};

const showReportsSection = () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Hesabatlar</h1>
                    <p class="text-slate-600">Satış və gəlir hesabatları</p>
                </div>
            </div>
            
            <div class="ultra-modern-card p-6">
                <p class="text-slate-500 text-center py-8">Hesabatlar bölməsi hazırlanır...</p>
            </div>
        </div>
    `;
};

const showCustomersSection = () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Müştərilər</h1>
                    <p class="text-slate-600">Müştəri məlumatları və tarixçəsi</p>
                </div>
                <button id="add-customer-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Müştəri Əlavə Et
                </button>
            </div>
            
            <div class="ultra-modern-card p-6">
                <div class="mb-6">
                    <div class="flex space-x-4">
                        <input type="text" id="customer-search" placeholder="Müştəri axtar..." 
                               class="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <select id="customer-filter" class="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="all">Bütün Müştərilər</option>
                            <option value="vip">VIP Müştərilər</option>
                            <option value="regular">Adi Müştərilər</option>
                        </select>
                    </div>
                </div>
                
                <div id="customers-list" class="space-y-4">
                    <div class="text-center py-8">
                        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path>
                            </svg>
                        </div>
                        <p class="text-slate-500">Müştəri məlumatları sistemi hazırlanır...</p>
                        <p class="text-sm text-slate-400 mt-2">Müştəri qeydiyyatı və tarixçə əlavə ediləcək</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const showSuppliersSection = () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Təchizatçılar</h1>
                    <p class="text-slate-600">Təchizatçı şirkətləri və əlaqə məlumatları</p>
                </div>
                <button id="add-supplier-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                    Təchizatçı Əlavə Et
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="ultra-modern-card p-6 text-center">
                    <h3 class="text-lg font-bold text-slate-800 mb-2">Ümumi Təchizatçı</h3>
                    <p class="text-3xl font-bold text-blue-600">0</p>
                </div>
                <div class="ultra-modern-card p-6 text-center">
                    <h3 class="text-lg font-bold text-slate-800 mb-2">Aktiv Təchizatçı</h3>
                    <p class="text-3xl font-bold text-green-600">0</p>
                </div>
                <div class="ultra-modern-card p-6 text-center">
                    <h3 class="text-lg font-bold text-slate-800 mb-2">Bu Ay Alışlar</h3>
                    <p class="text-3xl font-bold text-purple-600">0.00 AZN</p>
                </div>
            </div>
            
            <div class="ultra-modern-card p-6">
                <div class="mb-6">
                    <input type="text" id="supplier-search" placeholder="Təchizatçı axtar..." 
                           class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500">
                </div>
                
                <div id="suppliers-list" class="space-y-4">
                    <div class="text-center py-8">
                        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                        </div>
                        <p class="text-slate-500">Təchizatçı idarəetmə sistemi hazırlanır...</p>
                        <p class="text-sm text-slate-400 mt-2">Təchizatçı əlaqələri və müqavilə idarəetməsi əlavə ediləcək</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const showSettingsSection = () => {
    const contentArea = document.querySelector('#admin-content');
    contentArea.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">Tənzimləmələr</h1>
                    <p class="text-slate-600">Sistem tənzimləmələri və konfiqurasiya</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Restaurant Settings -->
                <div class="ultra-modern-card p-6">
                    <h2 class="text-xl font-bold text-slate-800 mb-4">Restoran Məlumatları</h2>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Restoran Adı</label>
                            <input type="text" class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500" value="Mənim Restoranım">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Ünvan</label>
                            <textarea class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500" rows="3">Bakı şəhəri, Nəsimi rayonu</textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Telefon</label>
                            <input type="tel" class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500" value="+994 xx xxx xx xx">
                        </div>
                        <button class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                            Yenilə
                        </button>
                    </div>
                </div>
                
                <!-- System Settings -->
                <div class="ultra-modern-card p-6">
                    <h2 class="text-xl font-bold text-slate-800 mb-4">Sistem Tənzimləmələri</h2>
                    <div class="space-y-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="font-semibold text-slate-800">Səsli Bildirişlər</p>
                                <p class="text-sm text-slate-600">Yeni sifariş bildirişləri</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="font-semibold text-slate-800">Avtomatik Sifariş Qəbulu</p>
                                <p class="text-sm text-slate-600">QR kod sifarişlərini avtomatik qəbul et</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Vergi Faizi (%)</label>
                            <input type="number" min="0" max="100" step="0.1" class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500" value="18">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Xidmət Haqqı (%)</label>
                            <input type="number" min="0" max="100" step="0.1" class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500" value="10">
                        </div>
                    </div>
                </div>
                
                <!-- Database Settings -->
                <div class="ultra-modern-card p-6">
                    <h2 class="text-xl font-bold text-slate-800 mb-4">Məlumat Bazası</h2>
                    <div class="space-y-4">
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                                <p class="text-sm text-yellow-800 font-medium">Diqqət: Bu əməliyyat geri qaytarıla bilməz!</p>
                            </div>
                        </div>
                        
                        <button id="backup-database" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">
                            Məlumat Bazasının Ehtiyat Nüsxəsi
                        </button>
                        
                        <button id="reset-database" class="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold">
                            Məlumat Bazasını Sıfırla
                        </button>
                    </div>
                </div>
                
                <!-- User Management -->
                <div class="ultra-modern-card p-6">
                    <h2 class="text-xl font-bold text-slate-800 mb-4">İstifadəçi İdarəetməsi</h2>
                    <div class="space-y-4">
                        <div>
                            <p class="text-sm text-slate-600 mb-4">Cari istifadəçi rolları və icazələri</p>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span class="font-medium">Admin</span>
                                    <span class="text-green-600 text-sm">Tam İcazə</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span class="font-medium">Menecer</span>
                                    <span class="text-blue-600 text-sm">İdarəetmə İcazəsi</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span class="font-medium">Kassir</span>
                                    <span class="text-purple-600 text-sm">Satış İcazəsi</span>
                                </div>
                            </div>
                        </div>
                        
                        <button class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                            İcazələri İdarə Et
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setupSettingsEventListeners();
};

// Helper functions for new sections
const loadPOSProducts = async () => {
    try {
        const [products, categories] = await Promise.all([
            DataService.getProducts(),
            DataService.getCategories()
        ]);
        
        // Update categories filter
        const categoriesFilter = document.querySelector('#pos-categories-filter');
        if (categoriesFilter) {
            categoriesFilter.innerHTML = `
                <button class="pos-category-filter bg-primary-500 text-white px-4 py-2 rounded-lg" data-category="all">Hamısı</button>
                ${categories.map(category => `
                    <button class="pos-category-filter bg-slate-200 text-slate-700 hover:bg-slate-300 px-4 py-2 rounded-lg" data-category="${category.name}">
                        ${category.name}
                    </button>
                `).join('')}
            `;
        }
        
        renderPOSProducts(products);
        
        // Setup category filter listeners
        categoriesFilter?.addEventListener('click', (e) => {
            if (e.target.classList.contains('pos-category-filter')) {
                const category = e.target.dataset.category;
                
                // Update active state
                categoriesFilter.querySelectorAll('.pos-category-filter').forEach(btn => {
                    btn.classList.remove('bg-primary-500', 'text-white');
                    btn.classList.add('bg-slate-200', 'text-slate-700');
                });
                e.target.classList.add('bg-primary-500', 'text-white');
                e.target.classList.remove('bg-slate-200', 'text-slate-700');
                
                // Filter products
                const filteredProducts = category === 'all' ? products : products.filter(p => p.category === category);
                renderPOSProducts(filteredProducts);
            }
        });
        
    } catch (error) {
        console.error('Error loading POS products:', error);
        NotificationService.show('Məhsullar yüklənərkən xəta', 'error');
    }
};

const renderPOSProducts = (products) => {
    const productsGrid = document.querySelector('#pos-products-grid');
    if (!productsGrid) return;
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<p class="text-slate-500 text-center py-8 col-span-full">Məhsul tapılmadı</p>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => `
        <div class="pos-product-card ultra-modern-card p-3 cursor-pointer hover:scale-105 transition-transform duration-200" data-product-id="${product.id}">
            <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-20 object-cover rounded-lg mb-2" onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
            <h4 class="font-semibold text-sm text-slate-800 truncate">${product.name}</h4>
            <p class="text-primary-600 font-bold text-sm">${product.price.toFixed(2)} AZN</p>
            ${product.stock !== undefined ? `<p class="text-xs text-slate-500">Stok: ${product.stock}</p>` : ''}
        </div>
    `).join('');
};

const setupPOSEventListeners = () => {
    const productsGrid = document.querySelector('#pos-products-grid');
    const cartItems = document.querySelector('#pos-cart-items');
    const tableNumberInput = document.querySelector('#pos-table-number');
    const placeOrderBtn = document.querySelector('#pos-place-order');
    const clearCartBtn = document.querySelector('#pos-clear-cart');
    
    let posCart = [];
    
    const updatePOSCart = () => {
        if (!cartItems) return;
        
        if (posCart.length === 0) {
            cartItems.innerHTML = '<p class="text-slate-500 text-center py-8">Məhsul seçin</p>';
        } else {
            cartItems.innerHTML = posCart.map((item, index) => `
                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div class="flex-1">
                        <p class="font-semibold text-sm">${item.name}</p>
                        <p class="text-xs text-slate-500">×${item.quantity}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="font-bold text-sm">${(item.price * item.quantity).toFixed(2)} AZN</span>
                        <button class="remove-pos-item w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full text-xs" data-index="${index}">×</button>
                    </div>
                </div>
            `).join('');
        }
        
        // Update totals
        const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.18;
        const total = subtotal + tax;
        
        document.querySelector('#pos-subtotal').textContent = `${subtotal.toFixed(2)} AZN`;
        document.querySelector('#pos-tax').textContent = `${tax.toFixed(2)} AZN`;
        document.querySelector('#pos-total').textContent = `${total.toFixed(2)} AZN`;
        
        // Enable/disable place order button
        const tableNumber = tableNumberInput?.value;
        placeOrderBtn.disabled = !(posCart.length > 0 && tableNumber && parseInt(tableNumber) > 0);
    };
    
    // Product click handler
    productsGrid?.addEventListener('click', async (e) => {
        const productCard = e.target.closest('.pos-product-card');
        if (productCard) {
            const productId = productCard.dataset.productId;
            
            try {
                const products = await DataService.getProducts();
                const product = products.find(p => p.id === productId);
                
                if (product) {
                    const existingItem = posCart.find(item => item.id === productId);
                    if (existingItem) {
                        existingItem.quantity += 1;
                    } else {
                        posCart.push({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            quantity: 1
                        });
                    }
                    updatePOSCart();
                }
            } catch (error) {
                console.error('Error adding product to POS cart:', error);
            }
        }
    });
    
    // Remove item handler
    cartItems?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-pos-item')) {
            const index = parseInt(e.target.dataset.index);
            posCart.splice(index, 1);
            updatePOSCart();
        }
    });
    
    // Table number change handler
    tableNumberInput?.addEventListener('input', updatePOSCart);
    
    // Place order handler
    placeOrderBtn?.addEventListener('click', async () => {
        const tableNumber = parseInt(tableNumberInput.value);
        
        if (posCart.length === 0 || !tableNumber || tableNumber <= 0) {
            NotificationService.show('Zəhmət olmasa məhsul seçin və masa nömrəsi daxil edin', 'error');
            return;
        }
        
        try {
            const orderData = {
                tableNumber: tableNumber,
                items: posCart.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    priceAtOrder: item.price
                })),
                status: 'pending',
                orderSource: 'pos'
            };
            
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = 'Göndərilir...';
            
            await DataService.addOrder(orderData);
            
            // Clear cart
            posCart = [];
            tableNumberInput.value = '';
            updatePOSCart();
            
            NotificationService.show(`Masa ${tableNumber} üçün sifariş uğurla göndərildi!`, 'success');
            
        } catch (error) {
            console.error('Error placing POS order:', error);
            NotificationService.show('Sifariş göndərilərkən xəta baş verdi', 'error');
        } finally {
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Sifariş Ver';
        }
    });
    
    // Clear cart handler
    clearCartBtn?.addEventListener('click', () => {
        posCart = [];
        tableNumberInput.value = '';
        updatePOSCart();
    });
    
    // Initial update
    updatePOSCart();
};

const loadCashierData = async () => {
    try {
        const orders = await DataService.getOrders();
        const todayOrders = orders.filter(order => {
            if (order.createdAt && order.createdAt.seconds) {
                const orderDate = new Date(order.createdAt.seconds * 1000);
                const today = new Date();
                return orderDate.toDateString() === today.toDateString();
            }
            return false;
        });
        
        const dailySales = todayOrders
            .filter(order => order.status === 'paid')
            .reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (item.priceAtOrder * item.quantity), 0), 0);
        
        document.getElementById('daily-sales').textContent = `${dailySales.toFixed(2)} AZN`;
        document.getElementById('daily-orders').textContent = todayOrders.length;
        document.getElementById('average-order').textContent = todayOrders.length > 0 ? `${(dailySales / todayOrders.length).toFixed(2)} AZN` : '0.00 AZN';
        
        // Load payment pending orders
        const paymentPendingOrders = orders.filter(order => ['ready', 'served'].includes(order.status));
        const paymentOrdersList = document.querySelector('#payment-pending-orders');
        
        if (paymentPendingOrders.length === 0) {
            paymentOrdersList.innerHTML = '<p class="text-slate-500 text-center py-8">Ödəniş gözləyən sifariş yoxdur</p>';
        } else {
            paymentOrdersList.innerHTML = paymentPendingOrders.map(order => `
                <div class="ultra-modern-card p-4 ${StatusUtils.getKitchenStatusBorder(order.status)}">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-bold text-lg">Masa ${order.tableNumber}</h3>
                            <p class="text-sm text-slate-500">Sifariş #${order.id.substring(0, 8)}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${StatusUtils.getStatusColor(order.status)}">
                            ${StatusUtils.getStatusText(order.status)}
                        </span>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <p class="font-bold text-lg">Ümumi: ${order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)} AZN</p>
                        <button class="mark-as-paid-btn text-white px-4 py-2 rounded-lg text-sm update-order-status" data-order-id="${order.id}" data-status="paid">
                            Ödənildi
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading cashier data:', error);
    }
};

const setupCashierEventListeners = () => {
    const paymentOrdersList = document.querySelector('#payment-pending-orders');
    paymentOrdersList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('update-order-status')) {
            const orderId = e.target.dataset.orderId;
            const newStatus = e.target.dataset.status;
            
            try {
                await DataService.updateOrder(orderId, newStatus);
                NotificationService.show('Ödəniş qeydiyyatda!', 'success');
                loadCashierData(); // Reload data
            } catch (error) {
                NotificationService.show('Ödəniş qeydində xəta', 'error');
            }
        }
    });
};

const setupSettingsEventListeners = () => {
    const resetBtn = document.querySelector('#reset-database');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            showDeleteConfirmation('Bütün məlumat bazasını sıfırlamaq', async () => {
                try {
                    await DataService.resetDatabase();
                    NotificationService.show('Məlumat bazası sıfırlandı!', 'success');
                } catch (error) {
                    NotificationService.show('Sıfırlamada xəta baş verdi', 'error');
                }
            });
        });
    }
};

// Utility functions
const closeModal = () => {
    if (currentModal) {
        document.body.removeChild(currentModal);
        currentModal = null;
    }
};

const showDeleteConfirmation = (message, onConfirm) => {
    const modal = createElement('div', {
        className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    });
    
    modal.innerHTML = `
        <div class="ultra-modern-card p-8 w-full max-w-md text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">Əminsən?</h3>
            <p class="text-slate-600 mb-6">${message} istəyirsən?</p>
            <div class="flex space-x-3">
                <button id="cancel-delete" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-semibold">
                    Ləğv et
                </button>
                <button id="confirm-delete" class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold">
                    Bəli, Sil
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#cancel-delete').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#confirm-delete').addEventListener('click', () => {
        onConfirm();
        document.body.removeChild(modal);
    });
};

const deleteProduct = async (productId) => {
    try {
        await DataService.deleteProduct(productId);
        NotificationService.show('Məhsul silindi', 'success');
        showProductsSection();
    } catch (error) {
        NotificationService.show('Silinərkən xəta baş verdi', 'error');
    }
};

const deleteCategory = async (categoryId) => {
    try {
        await DataService.deleteCategory(categoryId);
        NotificationService.show('Kateqoriya silindi', 'success');
        showCategoriesSection();
    } catch (error) {
        NotificationService.show('Silinərkən xəta baş verdi', 'error');
    }
};