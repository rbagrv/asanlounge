import { createElement, createAnalyticsCard, createProductCard, createAdminProductForm, createOrderCard, createTableCard, createTableForm, createDiscountForm, createInventoryItemForm, createPurchaseForm, createEmployeeForm, createCategoryForm, createRecipeForm, createSupplierForm, createPOSOrderListItem, createUserCard, createSalesTableRow, createPOSCartItem, createPOSCategoryCard } from './components.js';
import { DataService } from './services/dataService.js';
import { NotificationService } from './utils/notificationService.js';
import { CartService } from './utils/cartService.js';
import { StatusUtils } from './utils/statusUtils.js';
import { getCurrentRole, loginAdmin, getCurrentUser, logout, AuthService } from './auth.js'; // Import AuthService
import { renderWaiterSection } from './waiter.js';
import { db } from './firebase-config.js';
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { PAYMENT_TYPES } from './constants/initialData.js'; // Import PAYMENT_TYPES

// Global variables for admin functionality
let currentAdminTab = 'dashboard';
let adminCartService = new CartService();

// POS specific variables
let posProducts = [];
let posCategories = [];
let posCurrentTableNumber = null;
let posCurrentSelectedOrderId = null; // To store fetched active orders
let posActiveOrders = []; // To store fetched active orders
let posOrdersUnsubscribe = null; // Listener for real-time POS orders
let posCurrentPaymentType = PAYMENT_TYPES.CASH; // Default payment type

let currentTabCleanup = null; // To store the cleanup function for the active tab

// New: Sales module specific variables
let salesUnsubscribe = null; // To store the unsubscribe function for sales listener
let salesChartInstances = {}; // To store Chart.js instances

// --- Menu Configuration ---
const MENU_ITEMS = {
    dashboard: { text: 'Göstərici Lövhə', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`, permission: 'view_dashboard' },
    pos: { text: 'Kassa (POS)', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`, permission: 'view_pos' },
    kitchen: { text: 'Mətbəx', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`, permission: 'view_kitchen' },
    orders: { text: 'Sifarişlər', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m6-4h-6m-6 4h6m6 4h-6m-6 4h6m-6-4h6m6-4v10m6-10v10m6-10v10M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>`, permission: 'view_orders' },
    sales: { text: 'Satışlar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-4m3 4v-2m3-4V7m-6 4v3m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`, permission: 'view_sales' },
    products: { text: 'Məhsullar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`, permission: 'view_products' },
    customers: { text: 'Müştərilər', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-5.197M15 21H7"></path></svg>`, permission: 'view_customers' },
    categories: { text: 'Kateqoriyalar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`, permission: 'view_categories' },
    tables: { text: 'Masalar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`, permission: 'view_tables' },
    inventory: { text: 'Anbar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7m4 10v2m0 0v-2m-2 0V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16m6-4c1.1 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.1 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`, permission: 'view_inventory' },
    employees: { text: 'İşçilər', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-2.12-2.19L15 6v14m-3-7v-6a1 1 0 00-1.94-1.78L10.75 5.14a1 1 0 00-1.94 1.78v6m-8-1H2v-4a1 1 0 00-1-1h-1m12 0a1 1 0 00-1 1v4m0 0H4v4a1 1 0 001 1h12a1 1 0 001-1v-4m0 0H2v-1a1 1 0 00-1-1V7a1 1 0 011-1h2m3 3H3m18 0h-2m-3 4l-2-2m0 0l-2 2m-2 2v1m6-4h-4m-4 0H7m6-4l2 2m6 2v1m-6 4h4m4-4l2-2m-2-2v-1"></path></svg>`, permission: 'view_employees' },
    purchases: { text: 'Alışlar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10m-4-4l4-4m4 4H7m6-4v4m4-4H7"></path></svg>`, permission: 'view_purchases' },
    discounts: { text: 'Endirimlər', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`, permission: 'view_discounts' },
    recipes: { text: 'Reseptlər', icon: `<img src="/chef-hat.png" class="w-5 h-5">`, permission: 'view_recipes' },
    suppliers: { text: 'Təchizatçılar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>`, permission: 'view_suppliers' },
    settings: { text: 'Tənzimləmələr', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`, permission: 'view_settings' }
};

const ROLE_MENU_ITEMS = {
    admin: ['dashboard', 'pos', 'kitchen', 'orders', 'sales', 'products', 'categories', 'customers', 'tables', 'inventory', 'employees', 'purchases', 'discounts', 'recipes', 'suppliers', 'settings'],
    manager: ['dashboard', 'pos', 'kitchen', 'orders', 'sales', 'inventory', 'employees'],
    cashier: ['pos', 'orders', 'sales']
};

export const showAdminLoginPrompt = () => {
    const modal = createElement('div', {
        className: 'admin-login-modal fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4'
    });

    modal.innerHTML = `
        <div class="ultra-modern-card p-6 sm:p-8 w-full max-w-md animate-scale-in">
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-2">Admin Girişi</h2>
                <p class="text-slate-600">Admin paneline giriş üçün məlumatları daxil edin.</p>
            </div>
            
            <form id="admin-login-form" class="space-y-4">
                <div>
                    <label for="adminEmailInput" class="block text-sm font-semibold text-slate-700 mb-2">Email ünvanı</label>
                    <input type="email" id="adminEmailInput" name="email" required 
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                           placeholder="admin@restaurant.com">
                </div>
                
                <div>
                    <label for="adminPasswordInput" class="block text-sm font-semibold text-slate-700 mb-2">Şifrə</label>
                    <input type="password" id="adminPasswordInput" name="password" required 
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                           placeholder="••••••••">
                </div>
                
                <div class="flex space-x-3 pt-4">
                    <button type="button" id="cancel-admin-login" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300">
                        Ləğv et
                    </button>
                    <button type="submit" class="flex-1 premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
                        Daxil ol
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#adminEmailInput').focus();

    const closeModal = () => {
        if (modal.parentNode) {
            document.body.removeChild(modal);
        }
    };
    
    modal.querySelector('#cancel-admin-login').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    modal.querySelector('#admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = modal.querySelector('#adminEmailInput').value;
        const password = modal.querySelector('#adminPasswordInput').value;

        const submitBtn = modal.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="flex items-center justify-center space-x-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Daxil olunur...</span>
            </span>
        `;

        try {
            const result = await loginAdmin(email, password);
            
            if (result.success) {
                closeModal();
                NotificationService.show('Admin paneline xoş gəlmisiniz!', 'success');
                // Trigger app reinitialization
                window.dispatchEvent(new CustomEvent('reinitialize-app'));
            } else {
                NotificationService.show(`${result.error}`, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Admin login error:', error);
            NotificationService.show('Giriş zamanı xəta baş verdi.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
};

export const renderAdminSection = (container, forceTab = null) => {
    const role = getCurrentRole();
    if (AuthService.hasPermission('view_dashboard') || AuthService.hasPermission('view_pos') || AuthService.hasPermission('view_kitchen') || AuthService.hasPermission('view_orders') || AuthService.hasPermission('view_sales')) { // Check if user has permission to view ANY admin panel section
        if (role === 'cashier' || forceTab === 'pos') {
            // If cashier, render POS directly without the full admin panel shell.
            showPOS(container);
        } else {
            renderAdminPanel(container, role);
        }
    } else {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Bu bölməyə giriş icazəniz yoxdur. Zəhmət olmasa, admin ilə əlaqə saxlayın.</p>`;
    }
};

const renderAdminPanel = (container, role) => {
    // Filter available tabs based on user's permissions
    const availableTabs = (ROLE_MENU_ITEMS[role] || []).filter(tabKey => 
        MENU_ITEMS[tabKey] && AuthService.hasPermission(MENU_ITEMS[tabKey].permission)
    );
    const defaultTab = availableTabs[0] || 'dashboard'; // Default to dashboard or first available tab

    container.innerHTML = `
        <div class="flex flex-col lg:flex-row admin-panel-container">
            <!-- Mobile Header -->
            <header class="lg:hidden glass-header flex items-center justify-between p-4 border-b border-slate-200">
                <div class="flex items-center space-x-3">
                    <button id="mobile-menu-btn" class="p-2 -ml-2">
                        <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                     <div class="flex items-center space-x-2">
                        <img src="/appicon.png" alt="Logo" class="app-logo h-8 w-auto">
                        <h1 class="text-lg font-bold text-slate-800">Admin Panel</h1>
                    </div>
                </div>
            </header>

            <!-- Sidebar -->
            <aside id="admin-sidebar" class="admin-sidebar fixed inset-y-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-lg transform -translate-x-full lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col">
                <div class="p-4 border-b border-slate-200 hidden lg:block flex-shrink-0">
                    <div class="flex items-center space-x-3">
                        <img src="/appicon.png" alt="Logo" class="app-logo h-10 w-auto">
                        <div>
                            <h2 class="text-lg font-bold text-slate-800">Admin Panel</h2>
                            <p class="text-xs text-slate-500 capitalize">${role}</p>
                        </div>
                    </div>
                </div>
                <nav id="admin-menu" class="p-4 space-y-2 flex-grow overflow-y-auto">
                    ${availableTabs.map(tabKey => {
                        const item = MENU_ITEMS[tabKey];
                        return `
                            <button class="admin-menu-item w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left" data-tab="${tabKey}">
                                ${item.icon}
                                <span class="font-medium">${item.text}</span>
                            </button>
                        `;
                    }).join('')}
                </nav>
            </aside>

             <!-- Sidebar Overlay for Mobile -->
            <div id="sidebar-overlay" class="lg:hidden fixed inset-0 bg-black/50 z-30 hidden"></div>

            <!-- Main Content Area -->
            <main class="flex-1 flex flex-col overflow-hidden">
                <div class="hidden lg:flex items-center bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4">
                    <h1 id="admin-page-title" class="text-2xl font-bold text-slate-800"></h1>
                </div>
                <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
                    <div id="admin-tab-content" class="admin-content">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </main>
        </div>
    `;

    const sidebar = container.querySelector('#admin-sidebar');
    const overlay = container.querySelector('#sidebar-overlay');
    const mobileMenuBtn = container.querySelector('#mobile-menu-btn');
    const menuItems = container.querySelectorAll('.admin-menu-item');
    const pageTitle = container.querySelector('#admin-page-title');

    const closeMenu = () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    };

    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    });

    overlay.addEventListener('click', closeMenu);

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Run cleanup for the previous tab
            if (currentTabCleanup) {
                currentTabCleanup();
                currentTabCleanup = null;
            }

            // Clear all chart instances before loading a new tab
            Object.values(salesChartInstances).forEach(chart => chart.destroy());
            salesChartInstances = {};

            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            const tabName = item.dataset.tab;
            
            if (pageTitle) {
                pageTitle.textContent = MENU_ITEMS[tabName].text;
            }
            
            showAdminTab(tabName, container.querySelector('#admin-tab-content'));
            if (window.innerWidth < 1024) {
                closeMenu();
            }
        });
    });

    // Load default tab
    const defaultMenuItem = container.querySelector(`.admin-menu-item[data-tab="${defaultTab}"]`);
    if (defaultMenuItem) {
        defaultMenuItem.click();
    } else {
        // If no default tab is available due to permissions, show a message
        container.querySelector('#admin-tab-content').innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Bu rolda heç bir panelə giriş icazəniz yoxdur.</p>
            </div>
        `;
    }
};

const showAdminTab = async (tabName, container) => {
    // First, check permission for the tab itself
    const requiredPermission = MENU_ITEMS[tabName]?.permission;
    if (requiredPermission && !AuthService.hasPermission(requiredPermission)) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Bu bölməyə daxil olmaq üçün icazəniz yoxdur.</p>
            </div>
        `;
        return; // Stop execution if permission is denied
    }

    currentAdminTab = tabName;
    
    // Reset content area for new tab
    container.innerHTML = `
        <div class="flex justify-center py-8">
            <div class="loading-spinner"></div>
        </div>
    `;

    // Run cleanup for the previous tab before loading new one
    if (currentTabCleanup) {
        currentTabCleanup();
        currentTabCleanup = null;
    }
    // Also clear sales specific unsubscribe if switching from sales tab
    if (salesUnsubscribe) {
        salesUnsubscribe();
        salesUnsubscribe = null;
    }
    // Destroy existing chart instances
    Object.values(salesChartInstances).forEach(chart => chart.destroy());
    salesChartInstances = {};

    try {
        switch (tabName) {
            case 'dashboard':
                await showDashboard(container);
                break;
            case 'products':
                await showProducts(container);
                break;
            case 'orders':
                currentTabCleanup = await showOrders(container);
                break;
            case 'sales':
                currentTabCleanup = await showSales(container); // Assign cleanup function
                break;
            case 'kitchen':
                // The renderWaiterSection returns a cleanup function
                currentTabCleanup = renderWaiterSection(container);
                break;
            case 'customers':
                await showCustomers(container);
                break;
            case 'tables':
                await showTables(container);
                break;
            case 'categories':
                await showCategories(container);
                break;
            case 'employees':
                await showEmployees(container);
                break;
            case 'inventory':
                await showInventory(container);
                break;
            case 'purchases':
                await showPurchases(container);
                break;
            case 'discounts':
                await showDiscounts(container);
                break;
            case 'recipes':
                await showRecipes(container);
                break;
            case 'suppliers':
                await showSuppliers(container);
                break;
            case 'settings':
                await showSettings(container);
                break;
            case 'pos':
                currentTabCleanup = await showPOS(container);
                break;
            default:
                container.innerHTML = '<p class="text-center text-slate-500 py-8">Bu bölmə hazırlanmaqdadır...</p>';
        }
    } catch (error) {
        console.error('Error loading tab:', error);
        container.innerHTML = `<div class="text-center py-8"><p class="text-red-500">Məlumatlar yüklənərkən xəta baş verdi.</p></div>`;
    }
};

const showDashboard = async (container) => {
    if (!AuthService.hasPermission('view_dashboard')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Göstərici lövhəni görmək üçün icazəniz yoxdur.</p>`;
        return;
    }
    container.innerHTML = `
        <div class="flex justify-center py-8">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        const analytics = await DataService.getAnalytics();
        
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                ${AuthService.hasPermission('view_dashboard') ? createAnalyticsCard('Ümumi Sifarişlər', analytics.totalOrders, '', 'blue').outerHTML : ''}
                ${AuthService.hasPermission('view_dashboard') ? createAnalyticsCard('Bugünkü Sifarişlər', analytics.todayOrders, '', 'green').outerHTML : ''}
                ${AuthService.hasPermission('view_dashboard') ? createAnalyticsCard('Ümumi Gəlir', `${analytics.totalRevenue.toFixed(2)} AZN`, '', 'purple').outerHTML : ''}
                ${AuthService.hasPermission('view_dashboard') ? createAnalyticsCard('Bugünkü Gəlir', `${analytics.todayRevenue.toFixed(2)} AZN`, '', 'orange').outerHTML : ''}
                ${AuthService.hasPermission('view_dashboard') ? createAnalyticsCard('Aktiv Sifarişlər', analytics.activeOrders, '', 'blue').outerHTML : ''}
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                ${AuthService.hasPermission('view_dashboard') && analytics.popularItems.length > 0 ? `
                    <div class="ultra-modern-card p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-4">Populyar Məhsullar</h3>
                        <div class="space-y-3">
                            ${analytics.popularItems.map(item => `
                                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                    <span class="font-semibold text-slate-700">${item.name}</span>
                                    <span class="bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-bold">${item.count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${AuthService.hasPermission('view_dashboard') ? `
                    <div class="ultra-modern-card p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-4">Ödəniş Növünə görə Satış</h3>
                        <div class="space-y-3">
                            ${Object.keys(analytics.salesByPaymentType).length > 0 ? Object.entries(analytics.salesByPaymentType).map(([type, total]) => `
                                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                    <span class="font-semibold text-slate-700 capitalize">${type}</span>
                                    <span class="font-bold text-green-600">${total.toFixed(2)} AZN</span>
                                </div>
                            `).join('') : '<p class="text-slate-500 text-center py-4">Heç bir ödəniş məlumatı yoxdur.</p>'}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                ${AuthService.hasPermission('view_dashboard') ? `
                    <div class="ultra-modern-card p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-4">Top 5 Müştəri</h3>
                        <div class="space-y-3">
                            ${analytics.topCustomers.length > 0 ? analytics.topCustomers.map(customer => `
                                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                    <span class="font-semibold text-slate-700 truncate" title="${customer.name}">${customer.name}</span>
                                    <span class="font-bold text-purple-600">${customer.totalSpent.toFixed(2)} AZN</span>
                                </div>
                            `).join('') : '<p class="text-slate-500 text-center py-4">Heç bir müştəri məlumatı yoxdur.</p>'}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                ${AuthService.hasPermission('view_dashboard') ? `
                    <div class="ultra-modern-card p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-4">Gündəlik Satış Trendi (Saatlıq)</h3>
                        <canvas id="hourlySalesChart" width="400" height="200"></canvas>
                    </div>
                ` : ''}
                ${AuthService.hasPermission('view_dashboard') ? `
                    <div class="ultra-modern-card p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-4">Kateqoriyalara görə Satış Bölgüsü</h3>
                        <canvas id="categorySalesChart" width="400" height="200"></canvas>
                    </div>
                ` : ''}
            </div>
        `;

        // Render Charts after DOM is ready
        if (AuthService.hasPermission('view_dashboard')) {
            // Hourly Sales Chart
            const hourlySalesCtx = document.getElementById('hourlySalesChart')?.getContext('2d');
            if (hourlySalesCtx) {
                new Chart(hourlySalesCtx, {
                    type: 'line',
                    data: {
                        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                        datasets: [{
                            label: 'Satış (AZN)',
                            data: analytics.hourlySales,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.1,
                            fill: true,
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false },
                    plugins: {
                        title: {
                            display: false,
                            text: 'Gündəlik Satış Trendi (Saatlıq)'
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'AZN'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Saat'
                            }
                        }
                    }
                });
            }

            // Category Sales Chart
            const categorySalesCtx = document.getElementById('categorySalesChart')?.getContext('2d');
            if (categorySalesCtx) {
                const categoryLabels = Object.keys(analytics.categorySales);
                const categoryData = Object.values(analytics.categorySales);
                
                const backgroundColors = [
                    'rgba(255, 99, 132, 0.7)', // Red
                    'rgba(54, 162, 235, 0.7)', // Blue
                    'rgba(255, 206, 86, 0.7)', // Yellow
                    'rgba(75, 192, 192, 0.7)', // Green
                    'rgba(153, 102, 255, 0.7)', // Purple
                    'rgba(255, 159, 64, 0.7)',  // Orange
                    'rgba(199, 199, 199, 0.7)', // Grey
                    'rgba(83, 102, 255, 0.7)'   // Indigo
                ];
                const borderColors = [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)',
                    'rgba(83, 102, 255, 1)'
                ];

                new Chart(categorySalesCtx, {
                    type: 'doughnut',
                    data: {
                        labels: categoryLabels,
                        datasets: [{
                            label: 'Satış (AZN)',
                            data: categoryData,
                            backgroundColor: backgroundColors,
                            borderColor: borderColors,
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false },
                    plugins: {
                        legend: {
                            position: 'right',
                            align: 'center',
                            labels: {
                                boxWidth: 20
                            }
                        },
                        title: {
                            display: false,
                            text: 'Kateqoriyalara görə Satış Bölgüsü'
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading dashboard analytics:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Məlumatlar yüklənərkən xəta baş verdi.</p>
            </div>
        `;
    }
};

const showSales = async (container) => {
    if (!AuthService.hasPermission('view_sales')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Satış hesabatlarını görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }

    // Initial loading state
    container.innerHTML = `
        <div class="flex justify-center py-8">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        const [allProducts, allUsers] = await Promise.all([
            DataService.getProducts(),
            DataService.getUsers()
        ]);
        
        // Define filters and initial state
        let salesData = [];
        let currentFilters = {
            salesType: 'all', // all, pos, qr-code, manual
            productSearch: '',
            employeeId: 'all', // all, or a specific employee UID
            startDate: '',
            endDate: ''
        };

        const getEmployeeDisplayName = (userId) => {
            const user = allUsers.find(u => u.id === userId);
            return user ? (user.name || user.email) : 'N/A';
        };

        const getProductDisplayName = (productId) => {
            const product = allProducts.find(p => p.id === productId);
            return product ? product.name : 'N/A';
        };

        const renderSalesUI = () => {
            container.innerHTML = `
                <div class="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                    <h3 class="text-xl font-bold text-slate-800">Satışlar Analitikası və Hesabatlar</h3>
                    <div class="flex space-x-2">
                        ${AuthService.hasPermission('export_sales_data') ? `<button id="export-csv-btn" class="modern-btn bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-semibold">CSV İxrac</button>` : ''}
                        ${AuthService.hasPermission('export_sales_data') ? `<button id="export-excel-btn" class="modern-btn bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold">Excel İxrac (Gələcəkdə)</button>` : ''}
                    </div>
                </div>

                <div class="ultra-modern-card p-4 sm:p-6 mb-8">
                    <h4 class="text-lg font-bold text-slate-800 mb-4">Filtrlər</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label for="sales-type-filter" class="block text-sm font-medium text-slate-700">Satış Növü</label>
                            <select id="sales-type-filter" class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg">
                                <option value="all">Hamısı</option>
                                <option value="pos">POS</option>
                                <option value="qr-code">QR Kod</option>
                                <option value="manual">Əl ilə</option>
                            </select>
                        </div>
                        <div>
                            <label for="product-search-filter" class="block text-sm font-medium text-slate-700">Məhsul Axtar</label>
                            <input type="text" id="product-search-filter" placeholder="Məhsul adı..." class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg">
                        </div>
                        <div>
                            <label for="employee-filter" class="block text-sm font-medium text-slate-700">İşçi</label>
                            <select id="employee-filter" class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg">
                                <option value="all">Hamısı</option>
                                ${allUsers.filter(u => ['admin', 'cashier', 'manager'].includes(u.role)).map(user => `
                                    <option value="${user.id}">${user.email || user.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="start-date-filter" class="block text-sm font-medium text-slate-700">Başlanğıc Tarixi</label>
                            <input type="date" id="start-date-filter" class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg">
                        </div>
                        <div>
                            <label for="end-date-filter" class="block text-sm font-medium text-slate-700">Son Tarix</label>
                            <input type="date" id="end-date-filter" class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg">
                        </div>
                    </div>
                    <div class="mt-6 text-right">
                        <button id="apply-filters-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Filtrlə</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="ultra-modern-card p-6">
                        <h4 class="text-lg font-bold text-slate-800 mb-4">Gündəlik Satış Trendi</h4>
                        <canvas id="dailySalesChart"></canvas>
                    </div>
                    <div class="ultra-modern-card p-6">
                        <h4 class="text-lg font-bold text-slate-800 mb-4">Məhsula Göre Satış Miqdarı</h4>
                        <canvas id="productSalesChart"></canvas>
                    </div>
                    <div class="ultra-modern-card p-6">
                        <h4 class="text-lg font-bold text-slate-800 mb-4">İşçilərə Göre Satış</h4>
                        <canvas id="employeeSalesChart"></canvas>
                    </div>
                    <div class="ultra-modern-card p-6">
                        <h4 class="text-lg font-bold text-slate-800 mb-4">Ödəniş Növünə Göre Satış</h4>
                        <canvas id="paymentTypeSalesChart"></canvas>
                    </div>
                </div>

                <div class="ultra-modern-card overflow-x-auto">
                    <table class="w-full text-sm text-left text-slate-500">
                        <thead class="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" class="px-6 py-3">Sifariş ID</th>
                                <th scope="col" class="px-6 py-3">Masa</th>
                                <th scope="col" class="px-6 py-3">Tarix</th>
                                <th scope="col" class="px-6 py-3">Məhsullar</th>
                                <th scope="col" class="px-6 py-3">İşçi</th>
                                <th scope="col" class="px-6 py-3">Ödəniş Növü</th>
                                <th scope="col" class="px-6 py-3">Ümumi Məbləğ</th>
                            </tr>
                        </thead>
                        <tbody id="sales-table-body">
                            <!-- Sales data will be inserted here -->
                        </tbody>
                    </table>
                    <div id="no-sales-data" class="text-center py-8 text-slate-500 hidden">Filtrlərə uyğun satış tapılmadı.</div>
                </div>
            `;
        };

        renderSalesUI(); // Initial render of the UI structure

        // Get filter elements
        const salesTypeFilter = container.querySelector('#sales-type-filter');
        const productSearchFilter = container.querySelector('#product-search-filter');
        const employeeFilter = container.querySelector('#employee-filter');
        const startDateFilter = container.querySelector('#start-date-filter');
        const endDateFilter = container.querySelector('#end-date-filter');
        const applyFiltersBtn = container.querySelector('#apply-filters-btn');
        const salesTableBody = container.querySelector('#sales-table-body');
        const noSalesData = container.querySelector('#no-sales-data');
        const exportCsvBtn = container.querySelector('#export-csv-btn');
        const exportExcelBtn = container.querySelector('#export-excel-btn')


        const updateCharts = () => {
            // Destroy existing charts
            Object.values(salesChartInstances).forEach(chart => chart.destroy());
            salesChartInstances = {};

            const filteredOrders = filterSalesData(salesData, currentFilters, allProducts);

            // 1. Daily Sales Chart
            const dailySalesCtx = document.getElementById('dailySalesChart')?.getContext('2d');
            if (dailySalesCtx) {
                const dailyData = {}; // { 'YYYY-MM-DD': totalSales }
                filteredOrders.forEach(order => {
                    const date = new Date(order.createdAt.seconds * 1000).toISOString().split('T')[0];
                    dailyData[date] = (dailyData[date] || 0) + order.total;
                });
                const sortedDates = Object.keys(dailyData).sort();
                salesChartInstances.daily = new Chart(dailySalesCtx, {
                    type: 'line',
                    data: {
                        labels: sortedDates,
                        datasets: [{
                            label: 'Gündəlik Satış (AZN)',
                            data: sortedDates.map(date => dailyData[date]),
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.1,
                            fill: true,
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            // 2. Product Sales Chart (Top 10 products by quantity)
            const productSalesCtx = document.getElementById('productSalesChart')?.getContext('2d');
            if (productSalesCtx) {
                const productQuantities = {};
                filteredOrders.forEach(order => {
                    order.items.forEach(item => {
                        const productName = getProductDisplayName(item.id);
                        productQuantities[productName] = (productQuantities[productName] || 0) + item.quantity;
                    });
                });
                const sortedProducts = Object.entries(productQuantities).sort(([, a], [, b]) => b - a).slice(0, 10);
                salesChartInstances.product = new Chart(productSalesCtx, {
                    type: 'bar',
                    data: {
                        labels: sortedProducts.map(([name]) => name),
                        datasets: [{
                            label: 'Satılan Miqdar',
                            data: sortedProducts.map(([, qty]) => qty),
                            backgroundColor: 'rgba(153, 102, 255, 0.7)',
                            borderColor: 'rgb(153, 102, 255)',
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            // 3. Employee Sales Chart
            const employeeSalesCtx = document.getElementById('employeeSalesChart')?.getContext('2d');
            if (employeeSalesCtx) {
                const employeeSales = {};
                filteredOrders.forEach(order => {
                    if (order.orderSource === 'pos' && order.userId) { // Only track sales initiated by POS users
                        const employeeName = getEmployeeDisplayName(order.userId);
                        employeeSales[employeeName] = (employeeSales[employeeName] || 0) + order.total;
                    } else if (order.orderSource !== 'pos') { // Other order sources can be grouped under a generic label
                        employeeSales['Digər'] = (employeeSales['Digər'] || 0) + order.total;
                    }
                });
                const sortedEmployees = Object.entries(employeeSales).sort(([, a], [, b]) => b - a);
                salesChartInstances.employee = new Chart(employeeSalesCtx, {
                    type: 'bar',
                    data: {
                        labels: sortedEmployees.map(([name]) => name),
                        datasets: [{
                            label: 'Satış Məbləği (AZN)',
                            data: sortedEmployees.map(([, total]) => total),
                            backgroundColor: 'rgba(255, 159, 64, 0.7)',
                            borderColor: 'rgb(255, 159, 64)',
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            // 4. Payment Type Sales Chart
            const paymentTypeSalesCtx = document.getElementById('paymentTypeSalesChart')?.getContext('2d');
            if (paymentTypeSalesCtx) {
                const paymentTypeData = {};
                filteredOrders.forEach(order => {
                    const type = order.paymentType || PAYMENT_TYPES.CASH;
                    paymentTypeData[type] = (paymentTypeData[type] || 0) + order.total;
                });
                const labels = Object.keys(paymentTypeData);
                const data = Object.values(paymentTypeData);
                
                const backgroundColors = [
                    'rgba(255, 99, 132, 0.7)', // Red for Cash
                    'rgba(54, 162, 235, 0.7)', // Blue for Credit
                    'rgba(255, 206, 86, 0.7)', // Yellow for QR
                ];

                salesChartInstances.paymentType = new Chart(paymentTypeSalesCtx, {
                    type: 'pie',
                    data: {
                        labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)), // Capitalize
                        datasets: [{
                            label: 'Ödəniş Növünə Göre Satış',
                            data: data,
                            backgroundColor: backgroundColors,
                            hoverOffset: 4
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        };

        const updateSalesTable = (filteredOrders) => {
            salesTableBody.innerHTML = '';
            if (filteredOrders.length === 0) {
                noSalesData.classList.remove('hidden');
            } else {
                noSalesData.classList.add('hidden');
                filteredOrders.forEach(order => {
                    const row = createSalesTableRow({
                        id: order.id,
                        tableNumber: order.tableNumber,
                        date: order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A',
                        items: order.items.map(item => `${item.name} x${item.quantity}`).join(', '),
                        employee: (order.orderSource === 'pos' && order.userId) ? getEmployeeDisplayName(order.userId) : (order.customerName || 'Anonim/Qonaq'),
                        paymentType: order.paymentType || 'Nağd',
                        total: order.total
                    });
                    salesTableBody.appendChild(row);
                });
            }
        };

        const filterSalesData = (data, filters, products) => {
            return data.filter(order => {
                // Filter by sales type
                if (filters.salesType !== 'all' && order.orderSource !== filters.salesType) {
                    return false;
                }

                // Filter by product name
                if (filters.productSearch) {
                    const lowerCaseSearch = filters.productSearch.toLowerCase();
                    const hasMatchingProduct = order.items.some(item => {
                        const product = products.find(p => p.id === item.id);
                        return product && product.name.toLowerCase().includes(lowerCaseSearch);
                    });
                    if (!hasMatchingProduct) return false;
                }

                // Filter by employee
                if (filters.employeeId !== 'all') {
                    if (order.orderSource !== 'pos' || order.userId !== filters.employeeId) {
                        return false;
                    }
                }

                // Filter by date range
                if (order.createdAt && order.createdAt.seconds) {
                    const orderDate = new Date(order.createdAt.seconds * 1000);
                    if (filters.startDate) {
                        const start = new Date(filters.startDate);
                        if (orderDate < start) return false;
                    }
                    if (filters.endDate) {
                        const end = new Date(filters.endDate);
                        end.setHours(23, 59, 59, 999); // Include whole end day
                        if (orderDate > end) return false;
                    }
                }
                return true;
            });
        };
        
        // Initial data load for sales
        salesUnsubscribe = onSnapshot(query(collection(db, 'orders'), where('status', '==', 'paid'), orderBy('createdAt', 'desc')), (snapshot) => {
            salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const filtered = filterSalesData(salesData, currentFilters, allProducts);
            updateSalesTable(filtered);
            updateCharts(); // Update charts with new data
        }, (error) => {
            console.error("Error listening to sales orders:", error);
            NotificationService.show('Satış məlumatları yüklənərkən xəta baş verdi.', 'error');
        });

        // Event listeners for filters
        applyFiltersBtn.addEventListener('click', () => {
            currentFilters.salesType = salesTypeFilter.value;
            currentFilters.productSearch = productSearchFilter.value;
            currentFilters.employeeId = employeeFilter.value;
            currentFilters.startDate = startDateFilter.value;
            currentFilters.endDate = endDateFilter.value;
            const filtered = filterSalesData(salesData, currentFilters, allProducts);
            updateSalesTable(filtered);
            updateCharts();
        });

        // Export to CSV function
        if (exportCsvBtn && AuthService.hasPermission('export_sales_data')) {
            exportCsvBtn.addEventListener('click', () => {
                const filtered = filterSalesData(salesData, currentFilters, allProducts);
                if (filtered.length === 0) {
                    NotificationService.show('İxrac ediləcək satış məlumatı yoxdur.', 'info');
                    return;
                }

                const headers = ["Sifariş ID", "Masa Nömrəsi", "Tarix", "Məhsullar", "İşçi", "Ödəniş Növü", "Ümumi Məbləğ"];
                const rows = filtered.map(order => [
                    order.id,
                    order.tableNumber,
                    order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A',
                    order.items.map(item => `${getProductDisplayName(item.id)} x${item.quantity}`).join('; '),
                    (order.orderSource === 'pos' && order.userId) ? getEmployeeDisplayName(order.userId) : (order.customerName || 'Anonim/Qonaq'),
                    order.paymentType || 'Nağd',
                    order.total.toFixed(2)
                ]);

                let csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add BOM for UTF-8 compatibility in Excel
                               + headers.map(h => `"${h}"`).join(',') + "\n"
                               + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join("\n");

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link); // Required for Firefox
                link.click();
                link.remove();
                NotificationService.show('Satış məlumatları CSV olaraq ixrac edildi!', 'success');
            });
        }
        
        // Export to Excel (placeholder)
        if (exportExcelBtn && AuthService.hasPermission('export_sales_data')) {
            exportExcelBtn.addEventListener('click', () => {
                NotificationService.show('Excel ixrac funksiyası gələcəkdə əlavə ediləcək.', 'info');
            });
        }

        // Return a cleanup function for the sales tab
        return () => {
            if (salesUnsubscribe) {
                salesUnsubscribe();
                salesUnsubscribe = null;
            }
            Object.values(salesChartInstances).forEach(chart => chart.destroy());
            salesChartInstances = {};
        };

    } catch (error) {
        console.error('Error loading sales data:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Satış məlumatları yüklənərkən xəta baş verdi.</p>
            </div>
        `;
        return () => {}; // Return empty cleanup on error
    }
};

const showCustomers = async (container) => {
    if (!AuthService.hasPermission('view_customers')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Müştəri siyahısını görmək üçün icazəniz yoxdur.</p>`;
        return;
    }
    try {
        const users = await DataService.getUsers();

        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-800">Müştəri Siyahısı</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${users.length > 0 ? users.map(user => createUserCard(user).outerHTML).join('') : `<div class="col-span-full text-center p-6">Heç bir müştəri tapılmadı.</div>`}
            </div>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = `<div class="text-center py-8"><p class="text-red-500">Müştəri məlumatları yüklənərkən xəta baş verdi.</p></div>`;
    }
};

const showOrders = async (container) => {
    if (!AuthService.hasPermission('view_orders')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Sifarişləri görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="mb-6">
            <h3 class="text-xl font-bold text-slate-800">Sifarişlər</h3>
        </div>
        
        <div id="orders-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="flex justify-center py-8 col-span-full">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;

    const ordersGrid = container.querySelector('#orders-grid');

    // Real-time listener for orders
    const ordersColRef = collection(db, 'orders');
    const q = query(ordersColRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        ordersGrid.innerHTML = ''; // Clear existing orders
        
        if (orders.length > 0) {
            orders.forEach(order => {
                ordersGrid.appendChild(createOrderCard(order));
            });
        } else {
            ordersGrid.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-slate-500">Heç bir sifariş tapılmadı.</p>
                </div>
            `;
        }
    }, (error) => {
        console.error("Error listening to orders: ", error);
        ordersGrid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-red-500">Sifarişlər yüklənərkən xəta baş verdi.</p>
            </div>
        `;
        NotificationService.show('Sifarişləri yükləyərkən xəta baş verdi!', 'error');
    });

    // Add event listeners for order status updates
    setupOrdersEventListeners(container);

    // Return the unsubscribe function for cleanup
    return unsubscribe;
};

const showTables = async (container) => {
    if (!AuthService.hasPermission('view_tables')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Masaları görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Masa İdarəetməsi</h3>
            ${AuthService.hasPermission('add_table') ? `<button id="add-table-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Masa Əlavə Et</button>` : ''}
        </div>
        
        <div id="tables-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div class="flex justify-center py-8 col-span-full">
                <div class="loading-spinner"></div>
            </div>
        </div>
        
        <div id="table-modal-container"></div>
    `;

    // Add event listeners
    setupTablesEventListeners(container);
};

const showCategories = async (container) => {
    if (!AuthService.hasPermission('view_categories')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Kateqoriyaları görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Kateqoriya İdarəetməsi</h3>
            ${AuthService.hasPermission('add_category') ? `<button id="add-category-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Kateqoriya Əlavə Et</button>` : ''}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="ultra-modern-card p-6">
                <h4 class="text-lg font-bold text-slate-800 mb-4">Kateqoriya</h4>
                <div class="flex space-x-2">
                    ${AuthService.hasPermission('edit_category') ? `<button class="edit-category-btn flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-600" data-category-id="1">
                        Redaktə
                    </button>` : ''}
                    ${AuthService.hasPermission('delete_category') ? `<button class="delete-category-btn flex-1 bg-red-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-600" data-category-id="1">
                        Sil
                    </button>` : ''}
                </div>
            </div>
        </div>
        
        <div id="category-modal-container"></div>
    `;

    // Add event listeners
    setupCategoriesEventListeners(container);
};

const showEmployees = async (container) => {
    if (!AuthService.hasPermission('view_employees')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">İşçiləri görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">İşçilər</h3>
            ${AuthService.hasPermission('add_employee') ? `<button id="add-employee-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni İşçi</button>` : ''}
        </div>
        <div id="employees-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${createUserCard({ name: 'John Doe', email: 'john@example.com' }).outerHTML}
        </div>
        <div id="employee-modal-container"></div>
    `;
};

const showInventory = async (container) => {
    if (!AuthService.hasPermission('view_inventory')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Anbarı görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Anbar (Inventory)</h3>
            ${AuthService.hasPermission('add_inventory_item') ? `<button id="add-inventory-item-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Məhsul</button>` : ''}
        </div>
        <div id="inventory-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="inventory-modal-container"></div>
    `;
};

const showPurchases = async (container) => {
    if (!AuthService.hasPermission('view_purchases')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Alışları görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Alışlar</h3>
            ${AuthService.hasPermission('add_purchase') ? `<button id="add-purchase-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Alış</button>` : ''}
        </div>
        <div id="purchases-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="purchase-modal-container"></div>
    `;
};

const showDiscounts = async (container) => {
    if (!AuthService.hasPermission('view_discounts')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Endirimləri görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Endirimlər</h3>
            ${AuthService.hasPermission('add_discount') ? `<button id="add-discount-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Endirim</button>` : ''}
        </div>
        <div id="discounts-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="discount-modal-container"></div>
    `;
};

const showRecipes = async (container) => {
    if (!AuthService.hasPermission('view_recipes')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Reseptləri görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Reseptlər</h3>
            ${AuthService.hasPermission('add_recipe') ? `<button id="add-recipe-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Resept</button>` : ''}
        </div>
        <div id="recipes-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="recipe-modal-container"></div>
    `;
};

const showSuppliers = async (container) => {
    if (!AuthService.hasPermission('view_suppliers')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Təchizatçıları görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Təchizatçılar</h3>
            ${AuthService.hasPermission('add_supplier') ? `<button id="add-supplier-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Təchizatçı</button>` : ''}
        </div>
        <div id="suppliers-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="supplier-modal-container"></div>
    `;
};

const showSettings = async (container) => {
    if (!AuthService.hasPermission('view_settings')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">Tənzimləmələri görmək üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    try {
        const [businessInfo, users] = await Promise.all([
            DataService.getBusinessInfo(),
            DataService.getUsers()
        ]);

        container.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <h3 class="text-xl font-bold text-slate-800 mb-6">Sistem Tənzimləmələri</h3>
                
                <!-- Settings Tabs -->
                <div class="flex flex-wrap gap-2 mb-6">
                    ${AuthService.hasPermission('update_business_info') ? `
                        <button class="settings-tab active" data-tab="business">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                            <span>Biznes Məlumatları</span>
                        </button>
                    ` : ''}
                    ${AuthService.hasPermission('manage_users_roles') ? `
                        <button class="settings-tab ${!AuthService.hasPermission('update_business_info') ? 'active' : ''}" data-tab="users">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-5.197M15 21H7"></path>
                            </svg>
                            <span>İstifadəçilər</span>
                        </button>
                    ` : ''}
                    ${AuthService.hasPermission('reset_database') ? `
                        <button class="settings-tab" data-tab="database">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                            </svg>
                            <span>Baza Tənzimləmələri</span>
                        </button>
                    ` : ''}
                    ${AuthService.hasPermission('access_integrations') ? `
                        <button class="settings-tab" data-tab="integrations">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                            </svg>
                            <span>İnteqrasiyalar</span>
                        </button>
                    ` : ''}
                </div>

                <!-- Tab Contents -->
                <div id="settings-content">
                    <!-- Business Info Tab -->
                    <div id="business-tab" class="settings-tab-content ${AuthService.hasPermission('update_business_info') ? '' : 'hidden'}">
                        ${AuthService.hasPermission('update_business_info') ? `
                        <form id="business-info-form" class="ultra-modern-card p-6 space-y-6">
                            <div>
                                <label for="businessName" class="block text-sm font-medium text-slate-700 mb-2">Biznes Adı</label>
                                <input type="text" id="businessName" name="businessName" value="${businessInfo.businessName || ''}" 
                                    class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg"
                                    placeholder="Restoran adı">
                            </div>
                            
                            <div>
                                <label for="businessAddress" class="block text-sm font-medium text-slate-700 mb-2">Ünvan</label>
                                <input type="text" id="businessAddress" name="address" value="${businessInfo.address || ''}" 
                                    class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg"
                                    placeholder="Tam ünvan">
                            </div>
                            
                            <div>
                                <label for="businessPhone" class="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                                <input type="tel" id="businessPhone" name="phone" value="${businessInfo.phone || ''}" 
                                    class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg"
                                    placeholder="+994 xx xxx xx xx">
                            </div>
                            
                            <div class="space-y-4">
                                <h4 class="text-lg font-bold text-slate-800 mb-4">Sosial Medialar</h4>
                                
                                <div>
                                    <label for="instagram" class="block text-sm font-medium text-slate-700 mb-2">Instagram</label>
                                    <input type="url" id="instagram" name="instagram" value="${businessInfo.socials?.instagram || ''}" 
                                        class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg"
                                        placeholder="https://instagram.com/username">
                                </div>
                                
                                <div>
                                    <label for="facebook" class="block text-sm font-medium text-slate-700 mb-2">Facebook</label>
                                    <input type="url" id="facebook" name="facebook" value="${businessInfo.socials?.facebook || ''}" 
                                        class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg"
                                        placeholder="https://facebook.com/page">
                                </div>
                                
                                <div>
                                    <label for="tiktok" class="block text-sm font-medium text-slate-700 mb-2">TikTok</label>
                                    <input type="url" id="tiktok" name="tiktok" value="${businessInfo.socials?.tiktok || ''}" 
                                        class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg"
                                        placeholder="https://tiktok.com/@username">
                                </div>
                            </div>
                            
                            <button type="submit" class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                                Yadda saxla
                            </button>
                        </form>
                        ` : '<p class="text-center text-red-500 py-8">Biznes məlumatlarını redaktə etmək üçün icazəniz yoxdur.</p>'}
                    </div>

                    <!-- Users Tab -->
                    <div id="users-tab" class="settings-tab-content ${AuthService.hasPermission('manage_users_roles') && !AuthService.hasPermission('update_business_info') ? '' : 'hidden'}">
                        ${AuthService.hasPermission('manage_users_roles') ? `
                        <div class="flex justify-between items-center mb-6">
                            <h4 class="text-lg font-bold text-slate-800">Sistem İstifadəçiləri</h4>
                            <button id="add-user-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                                Yeni İstifadəçi
                            </button>
                        </div>
                        <div class="ultra-modern-card p-6">
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm text-left text-slate-500">
                                    <thead class="text-xs text-slate-700 uppercase bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3">Email</th>
                                            <th class="px-4 py-3">Rol</th>
                                            <th class="px-4 py-3">Qeydiyyat Tarixi</th>
                                            <th class="px-4 py-3">Status</th>
                                            <th class="px-4 py-3">Əməliyyatlar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${users.map(user => `
                                            <tr class="bg-white border-b hover:bg-slate-50">
                                                <td class="px-4 py-3 font-medium text-slate-900">${user.email || user.id}</td>
                                                <td class="px-4 py-3">
                                                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}">
                                                        ${getRoleText(user.role)}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3">${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                                                <td class="px-4 py-3">
                                                    <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aktiv</span>
                                                </td>
                                                <td class="px-4 py-3 flex space-x-2">
                                                    ${AuthService.hasPermission('edit_employee') ? `
                                                        <button class="edit-user-btn text-blue-600 hover:text-blue-800" data-user-id="${user.id}">
                                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2-2V5a2 2 0 012-2h11a2 2 0 012 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                                            </svg>
                                                        </button>
                                                    ` : ''}
                                                    ${AuthService.hasPermission('delete_employee') && user.role !== 'admin' ? `
                                                        <button class="delete-user-btn text-red-600 hover:text-red-800" data-user-id="${user.id}">
                                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                            </svg>
                                                        </button>
                                                    ` : ''}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : '<p class="text-center text-red-500 py-8">İstifadəçiləri idarə etmək üçün icazəniz yoxdur.</p>'}
                    </div>

                    <!-- Database Tab -->
                    <div id="database-tab" class="settings-tab-content hidden">
                        ${AuthService.hasPermission('reset_database') ? `
                        <div class="ultra-modern-card p-6 space-y-6">
                            <h4 class="text-lg font-bold text-slate-800 mb-6">Verilənlər Bazası İdarəetməsi</h4>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Database Statistics -->
                                <div class="space-y-4">
                                    <h5 class="font-semibold text-slate-700">Baza Statistikaları</h5>
                                    <div class="space-y-3">
                                        <div class="flex justify-between p-3 bg-slate-50 rounded-xl">
                                            <span class="text-slate-600">Məhsullar:</span>
                                            <span class="font-bold" id="stats-products">-</span>
                                        </div>
                                        <div class="flex justify-between p-3 bg-slate-50 rounded-xl">
                                            <span class="text-slate-600">Sifarişlər:</span>
                                            <span class="font-bold" id="stats-orders">-</span>
                                        </div>
                                        <div class="flex justify-between p-3 bg-slate-50 rounded-xl">
                                            <span class="text-slate-600">İstifadəçilər:</span>
                                            <span class="font-bold" id="stats-users">${users.length}</span>
                                        </div>
                                        <div class="flex justify-between p-3 bg-slate-50 rounded-xl">
                                            <span class="text-slate-600">Masalar:</span>
                                            <span class="font-bold" id="stats-tables">-</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Database Actions -->
                                <div class="space-y-4">
                                    <h5 class="font-semibold text-slate-700">Baza İmərləri</h5>
                                    <div class="space-y-3">
                                        <button id="refresh-stats-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors">
                                            Statistikaları Yenilə
                                        </button>
                                        <button id="backup-db-btn" class="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors">
                                            Bazanı Yedəklə (JSON)
                                        </button>
                                        <button id="reset-db-btn" class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors">
                                            Bazanı Sıfırla (Diqqət!)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ` : '<p class="text-center text-red-500 py-8">Baza tənzimləmələrinə daxil olmaq üçün icazəniz yoxdur.</p>'}
                    </div>

                    <!-- Integrations Tab -->
                    <div id="integrations-tab" class="settings-tab-content hidden">
                        ${AuthService.hasPermission('access_integrations') ? `
                        <div class="ultra-modern-card p-6">
                            <h4 class="text-lg font-bold text-slate-800 mb-6">Xarici Servislər və İnteqrasiyalar</h4>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Payment Systems -->
                                <div class="border border-slate-200 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 16h-1v-4h-1m-9-4H3a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h2a2 2 0 012 2v3"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-slate-800">Ödəniş Sistemləri</h5>
                                                <p class="text-xs text-slate-500">Məs. Stripe, PayPal</p>
                                            </div>
                                        </div>
                                        <label class="inline-flex items-center cursor-pointer">
                                            <input type="checkbox" value="" class="sr-only peer">
                                            <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    <p class="text-sm text-slate-600">Ödəniş qapılarını qoşmaq üçün tənzimləmələr.</p>
                                </div>
                                <!-- SMS Gateway -->
                                <div class="border border-slate-200 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-slate-800">SMS Gateway</h5>
                                                <p class="text-xs text-slate-500">Məs. Twilio, Nexmo</p>
                                            </div>
                                        </div>
                                        <label class="inline-flex items-center cursor-pointer">
                                            <input type="checkbox" value="" class="sr-only peer">
                                            <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    <p class="text-sm text-slate-600">Müştərilərə SMS bildirişləri göndərmək üçün.</p>
                                </div>
                                <!-- Email Service -->
                                <div class="border border-slate-200 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-slate-800">Email Servisi</h5>
                                                <p class="text-xs text-slate-500">Məs. SendGrid, Mailgun</p>
                                            </div>
                                        </div>
                                        <label class="inline-flex items-center cursor-pointer">
                                            <input type="checkbox" value="" class="sr-only peer">
                                            <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    <p class="text-sm text-slate-600">Avtomatik email bildirişləri göndərmək üçün.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : '<p class="text-center text-red-500 py-8">İnteqrasiya tənzimləmələrinə daxil olmaq üçün icazəniz yoxdur.</p>'}
                </div>
            </div>
        </div>
    `;

    // Setup settings tabs event listeners
    setupSettingsEventListeners(container);
    
    // Load database statistics
    loadDatabaseStatistics();

    // Add event listener for business info form submission
    const businessInfoForm = container.querySelector('#business-info-form');
    if (AuthService.hasPermission('update_business_info') && businessInfoForm) {
        businessInfoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                businessName: formData.get('businessName'),
                address: formData.get('address'),
                phone: formData.get('phone'),
                socials: {
                    instagram: formData.get('instagram'),
                    facebook: formData.get('facebook'),
                    tiktok: formData.get('tiktok')
                }
            };

            const success = await DataService.updateBusinessInfo(data);
            if (success) {
                NotificationService.show('Biznes məlumatları yeniləndi!', 'success');
            } else {
                NotificationService.show('Məlumatlar yenilənərkən xəta baş verdi!', 'error');
            }
        });
    }

    // Activate the first available tab if one exists
    const firstAvailableTab = container.querySelector('.settings-tab.active');
    if (firstAvailableTab) {
        const targetTabContent = container.querySelector(`#${firstAvailableTab.dataset.tab}-tab`);
        if (targetTabContent) {
            targetTabContent.classList.remove('hidden');
        }
    }

    } catch (error) {
        console.error('Error loading settings:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Tənzimləmələr yüklənərkən xəta baş verdi.</p>
            </div>
        `;
    }
};

// Helper functions for user management
const getRoleColor = (role) => {
    const colors = {
        admin: 'bg-red-100 text-red-800',
        manager: 'bg-purple-100 text-purple-800',
        cashier: 'bg-blue-100 text-blue-800',
        waiter: 'bg-green-100 text-green-800',
        guest: 'bg-gray-100 text-gray-800',
        'guest-anonymous': 'bg-yellow-100 text-yellow-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
};

const getRoleText = (role) => {
    const texts = {
        admin: 'Admin',
        manager: 'Menecer',
        cashier: 'Kassir',
        waiter: 'Ofisant',
        guest: 'Qonaq',
        'guest-anonymous': 'Anonim Qonaq'
    };
    return texts[role] || role;
};

const setupSettingsEventListeners = (container) => {
    const tabs = container.querySelectorAll('.settings-tab');
    const tabContents = container.querySelectorAll('.settings-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.add('hidden'));

            // Add active to clicked tab
            tab.classList.add('active');
            const targetTab = container.querySelector(`#${tab.dataset.tab}-tab`);
            if (targetTab) {
                targetTab.classList.remove('hidden');
            }
        });
    });

    // Database operations
    const refreshStatsBtn = container.querySelector('#refresh-stats-btn');
    const backupDbBtn = container.querySelector('#backup-db-btn');
    const resetDbBtn = container.querySelector('#reset-db-btn');

    if (AuthService.hasPermission('reset_database') && refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', loadDatabaseStatistics);
    }

    if (AuthService.hasPermission('reset_database') && backupDbBtn) {
        backupDbBtn.addEventListener('click', async () => {
            NotificationService.show('Yedəkləmə funksiyası gələcəkdə əlavə ediləcək.', 'info');
        });
    }

    if (AuthService.hasPermission('reset_database') && resetDbBtn) {
        resetDbBtn.addEventListener('click', async () => {
            const confirmed = await NotificationService.showConfirm(
                'Bütün məlumatlar silinəcək və sistem başlanğıc vəziyyətə qaytarılacaq. Bu əməliyyat geri qaytarıla bilməz.',
                'Bazanı Sıfırlamaq İstədiyinizə Əminsinizmi?',
                'Bəli, Sıfırla',
                'Xeyr'
            );

            if (confirmed) {
                const loading = NotificationService.showLoading('Baza sıfırlanır...');
                try {
                    await DataService.resetDatabase();
                    NotificationService.hideLoading(loading);
                    NotificationService.show('Baza uğurla sıfırlandı!', 'success');
                    loadDatabaseStatistics(); // Refresh stats
                } catch (error) {
                    NotificationService.hideLoading(loading);
                    console.error('Error resetting database:', error);
                    NotificationService.show('Baza sıfırlanarkən xəta baş verdi!', 'error');
                }
            }
        });
    }
};

const loadDatabaseStatistics = async () => {
    try {
        const [products, orders, tables] = await Promise.all([
            DataService.getProducts(),
            DataService.getOrders(),
            DataService.getTables()
        ]);

        const statsProducts = document.getElementById('stats-products');
        const statsOrders = document.getElementById('stats-orders');
        const statsTables = document.getElementById('stats-tables');

        if (statsProducts) statsProducts.textContent = products.length;
        if (statsOrders) statsOrders.textContent = orders.length;
        if (statsTables) statsTables.textContent = tables.length;
    } catch (error) {
        console.error('Error loading database statistics:', error);
    }
};

// Helper function for POS HTML template
const getPOSHtmlTemplate = (posCurrentTableNumber, posCategories) => `
    <div class="pos-wrapper bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen flex flex-col">
        <!-- POS Header with Function Buttons -->
        <div class="pos-header glass-header sticky top-0 z-50">
            <div class="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
                <div class="flex items-center space-x-4">
                    <img src="/appicon.png" alt="Logo" class="app-logo h-10 w-auto hidden sm:block">
                    <h1 class="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">POS Sistemi</h1>
                    <div class="relative">
                        <input type="number" id="pos-table-number" placeholder="Masa №" 
                            class="ultra-modern-input w-24 text-center px-3 py-2 rounded-xl"
                            min="1" value="${posCurrentTableNumber || ''}">
                    </div>
                </div>
                
                <!-- Function Buttons -->
                <div class="flex items-center space-x-2">
                    ${AuthService.hasPermission('process_pos_order') ? `
                        <button id="pos-quick-sale-btn" class="pos-func-btn bg-green-100 text-green-700" title="F10 - Quick Sale">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 16h-1v-4h-1m-9-4H3a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h2a2 2 0 012 2v3"></path></svg>
                            <span class="hidden sm:inline">Quick Sale (F10)</span>
                        </button>
                        <button id="pos-hold-order-btn" class="pos-func-btn bg-yellow-100 text-yellow-700" title="F2 - Hold Order">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0l-4-4m4 4H7m6-4v4m4-4H7"></path></svg>
                            <span class="hidden sm:inline">Hold Order (F2)</span>
                        </button>
                        <button id="pos-new-order-btn" class="pos-func-btn bg-blue-100 text-blue-700" title="F1 - New Order">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 16h-1v-4h-1m-9-4H3a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h2a2 2 0 012 2v3"></path></svg>
                            <span class="hidden sm:inline">New Order (F1)</span>
                        </button>
                    ` : ''}
                    ${AuthService.hasPermission('view_sales') ? `
                        <button id="pos-payments-btn" class="pos-func-btn bg-purple-100 text-purple-700" title="View Payments">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9v-4m3 4v-2m3-4V7m-6 4v3m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span class="hidden sm:inline">Payments</span>
                        </button>
                    ` : ''}
                    <button id="pos-logout-btn" class="pos-func-btn bg-red-500 text-white" title="Logout">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3v-6a3 3 0 013-3h1a2 2 0 012 2v10a2 2 0 01-2 2h-1a3 3 0 01-3-3v-6a2 2 0 012-2h2a2 2 0 012 2v3"></path></svg>
                        <span class="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- POS Content Area -->
        <div class="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
            <!-- Left Panel: Existing Orders List -->
            <div id="pos-existing-orders-panel" class="col-span-12 lg:col-span-3 flex flex-col overflow-hidden">
                <div class="ultra-modern-card flex-grow flex flex-col p-4 shadow-xl h-full">
                    <h2 class="text-lg font-bold text-slate-800 mb-3 flex-shrink-0">Açıq Sifarişlər</h2>
                    <div id="pos-open-orders-list" class="flex-1 space-y-2 overflow-y-auto custom-scroll pr-2">
                        <!-- Orders will be loaded here -->
                        <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
                    </div>
                </div>
            </div>

            <!-- Middle Panel: Products & Search -->
            <div class="col-span-12 lg:col-span-5 flex flex-col overflow-hidden">
                <div class="ultra-modern-card flex-grow flex flex-col p-4 shadow-xl h-full">
                    <div class="mb-3 flex-shrink-0">
                        <input type="text" id="pos-product-search" placeholder="Məhsul axtar..." 
                            class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                            autocomplete="off">
                    </div>
                    <div id="pos-category-filters" class="ultra-modern-input flex flex-wrap gap-2 mb-3">
                        <button class="pos-category-btn ${posCategories.length === 0 ? 'hidden' : ''} active" data-category="all">Hamısı</button>
                        ${posCategories.map(cat => `
                            <button class="pos-category-btn" data-category="${cat.name}">${cat.name}</button>
                        `).join('')}
                        <button class="pos-category-btn campaign-btn" data-category="campaign">Kampaniyalar</button>
                    </div>
                    <div id="pos-product-list" class="flex-1 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 overflow-y-auto custom-scroll pr-2">
                        <!-- Products will be loaded here -->
                    </div>
                </div>
            </div>

            <!-- Right Panel: Current Order Details -->
            <div id="pos-right-panel" class="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
                <div class="ultra-modern-card flex-grow flex flex-col p-4 shadow-xl h-full">
                    <h2 class="text-lg font-bold text-slate-800 mb-3 flex-shrink-0">Sifariş Detalları</h2>
                    <div id="pos-current-order-items" class="flex-1 space-y-2 overflow-y-auto custom-scroll mb-3 pr-2">
                        <!-- Order items will be loaded here -->
                    </div>
                    <div class="border-t border-slate-200 pt-3 space-y-3 flex-shrink-0">
                        <div class="flex justify-between font-semibold text-slate-700 text-sm">
                            <span>Cəmi:</span>
                            <span id="pos-subtotal">0.00 AZN</span>
                        </div>
                        <div class="flex justify-between font-semibold text-slate-700 text-sm">
                            <span>Endirim:</span>
                            <span id="pos-discount">0.00 AZN</span>
                        </div>
                        <div class="flex justify-between text-xl font-bold text-slate-800 border-t pt-2">
                            <span>Ümumi:</span>
                            <span id="pos-total">0.00 AZN</span>
                        </div>
                        
                        <!-- New: Payment Type Selection -->
                        <div id="pos-payment-type-selection" class="flex flex-wrap gap-2 mb-3 mt-4 justify-center">
                            <button class="pos-payment-type-btn bg-slate-200 text-slate-700 active" data-payment-type="cash">Nağd</button>
                            <button class="pos-payment-type-btn bg-slate-200 text-slate-700" data-payment-type="credit">Kredit Kartı</button>
                            <button class="pos-payment-type-btn bg-slate-200 text-slate-700" data-payment-type="qr">QR Ödəniş</button>
                        </div>

                        <div class="grid grid-cols-2 gap-2 pt-3">
                            ${AuthService.hasPermission('process_pos_order') ? `
                                <button id="pos-send-order-btn" class="pos-action-btn bg-blue-500 text-white disabled:bg-blue-300">
                                    Sifarişi Göndər
                                </button>
                            ` : ''}
                            ${AuthService.hasPermission('mark_order_served') ? `
                                <button id="pos-mark-served-btn" class="pos-action-btn bg-orange-500 text-white disabled:bg-orange-300">
                                    Servis Edildi
                                </button>
                            ` : ''}
                            ${AuthService.hasPermission('process_pos_order') ? `
                                <button id="pos-hold-order-btn-2" class="pos-action-btn bg-yellow-500 text-white disabled:bg-yellow-300">
                                    Saxla
                                </button>
                            ` : ''}
                            ${AuthService.hasPermission('mark_order_paid') ? `
                                <button id="pos-mark-paid-btn" class="pos-action-btn mark-as-paid-btn text-white disabled:opacity-50">
                                    Ödəniş Alındı
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

const showPOS = async (container) => {
    if (!AuthService.hasPermission('view_pos')) {
        container.innerHTML = `<p class="text-center text-red-500 py-8">POS sisteminə daxil olmaq üçün icazəniz yoxdur.</p>`;
        return () => {}; // Return empty cleanup
    }
    try {
        const loadingNotification = NotificationService.showLoading('POS sistemi yüklənir...');

        // Load products and categories for POS
        [posProducts, posCategories] = await Promise.all([
            DataService.getProducts(),
            DataService.getCategories()
        ]);

        NotificationService.hideLoading(loadingNotification);

        // Get persistent table number
        posCurrentTableNumber = parseInt(localStorage.getItem('posTableNumber')) || null;
        posCurrentSelectedOrderId = null; // Ensure no order is selected by default
        posCurrentPaymentType = PAYMENT_TYPES.CASH; // Reset to default payment type

        container.innerHTML = getPOSHtmlTemplate(posCurrentTableNumber, posCategories);

        setupPOSEventListeners(container); // Pass the correct container to setup listeners
        renderPOSProducts(posProducts); // Initial rendering of all products
        adminCartService.subscribe(updatePOSCartDisplay); // Subscribe to cart changes
        updatePOSCartDisplay(); // Initial cart display
        loadPOSExistingOrders(container); // Load existing orders when POS launches
        setupPOSKeyboardShortcuts();

        // Return a cleanup function for the POS tab
        return () => {
            if (posOrdersUnsubscribe) {
                posOrdersUnsubscribe(); // Unsubscribe from real-time updates
                posOrdersUnsubscribe = null;
            }
            adminCartService.unsubscribe(updatePOSCartDisplay); // Unsubscribe cart listener
            document.removeEventListener('keydown', handlePOSKeyboardShortcuts); // Remove keyboard shortcuts
        };

    } catch (error) {
        console.error('Error loading POS:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">POS sistemi yüklənərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.</p>
            </div>
        `;
        return () => {}; // Return an empty cleanup function on error
    }
};

// Helper functions (simplified implementations)
const setupProductsEventListeners = (container, categories) => {
    // Basic event listener setup - implementation would be more detailed
    console.log('Setting up products event listeners');
};

const setupOrdersEventListeners = (container) => {
    container.addEventListener('click', async (event) => {
        const targetBtn = event.target.closest('.update-status-btn');
        if (targetBtn) {
            if (!AuthService.hasPermission('update_order_status')) {
                NotificationService.show('Sifariş statusunu yeniləmək üçün icazəniz yoxdur.', 'error');
                return;
            }
            const orderCard = targetBtn.closest('[data-order-id]');
            if (!orderCard) return;

            const orderId = orderCard.dataset.orderId;
            const newStatus = targetBtn.dataset.status;

            // Show loading state on button
            const originalButtonContent = targetBtn.innerHTML;
            targetBtn.disabled = true;
            targetBtn.innerHTML = `
                <span class="flex items-center justify-center space-x-2">
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Yenilənir...</span>
                </span>
            `;

            try {
                const success = await DataService.updateOrder(orderId, newStatus);
                if (success) {
                    NotificationService.show(`Sifariş #${orderId.substring(0, 6)} statusu yeniləndi!`, 'success');
                } else {
                    NotificationService.show('Sifariş statusu yenilənərkən xəta baş verdi.', 'error');
                    targetBtn.innerHTML = originalButtonContent; // Revert on failure
                }
            } catch (error) {
                console.error("Error updating order status:", error);
                NotificationService.show('Status yenilənərkən xəta baş verdi!', 'error');
                targetBtn.innerHTML = originalButtonContent; // Revert on failure
            } finally {
                targetBtn.disabled = false; // Button will be re-rendered by snapshot anyway, but good practice
            }
        }
    });
    console.log('Orders event listeners are set up.');
};

const setupTablesEventListeners = (container) => {
    const addTableBtn = container.querySelector('#add-table-btn');
    if (AuthService.hasPermission('add_table') && addTableBtn) {
        addTableBtn.addEventListener('click', () => showAddEditTableModal(container));
    }
};

const showAddEditTableModal = (container, table = null) => {
    const modal = createElement('div', { className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4' });
    modal.innerHTML = `
        <div class="ultra-modern-card p-6 w-full max-w-md animate-scale-in">
            <h3 class="text-2xl font-bold text-slate-800 mb-6 text-center">${table ? 'Masayı Redaktə Et' : 'Yeni Masa Əlavə Et'}</h3>
            ${createTableForm(table).outerHTML}
            <div class="flex justify-end mt-4">
                <button class="close-modal bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-semibold">Ləğv et</button>
            </div>
        </div>
    `;

    const modalContainer = container.querySelector('#table-modal-container');
    modalContainer.appendChild(modal);

    const form = modal.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
            number: parseInt(formData.get('number')),
            capacity: parseInt(formData.get('capacity')),
            isOccupied: formData.get('isOccupied') === 'on'
        };

        const loading = NotificationService.showLoading(table ? 'Masa yenilənir...' : 'Masa əlavə edilir...');
        let success;
        try {
            if (table) {
                success = await DataService.updateTable(table.id, data);
            } else {
                success = await DataService.addTable(data);
            }
            NotificationService.hideLoading(loading);
            if (success) {
                NotificationService.show(`Masa uğurla ${table ? 'yeniləndi' : 'əlavə edildi'}!`, 'success');
                modalContainer.innerHTML = '';
                showTables(container); // Refresh table list
            } else {
                NotificationService.show(`Masa ${table ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi!`, 'error');
            }
        } catch (error) {
            NotificationService.hideLoading(loading);
            console.error('Error updating table:', error);
            NotificationService.show(`Masa ${table ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi: ${error.message}`, 'error');
        }
    });

    modal.querySelector('.close-modal').addEventListener('click', () => {
        modalContainer.innerHTML = '';
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modalContainer.innerHTML = '';
        }
    });
};

const setupCategoriesEventListeners = (container) => {
    const addCategoryBtn = container.querySelector('#add-category-btn');
    if (AuthService.hasPermission('add_category') && addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => showAddEditCategoryModal(container));
    }
};

const showAddEditCategoryModal = (container, category = null) => {
    const modal = createElement('div', { className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4' });
    modal.innerHTML = `
        <div class="ultra-modern-card p-6 w-full max-w-md animate-scale-in">
            <h3 class="text-2xl font-bold text-slate-800 mb-6 text-center">${category ? 'Kateqoriyanı Redaktə Et' : 'Yeni Kateqoriya Əlavə Et'}</h3>
            ${createCategoryForm(category).outerHTML}
            <div class="flex justify-end mt-4">
                <button class="close-modal bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-semibold">Ləğv et</button>
            </div>
        </div>
    `;

    const modalContainer = container.querySelector('#category-modal-container');
    modalContainer.appendChild(modal);

    const form = modal.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
            name: formData.get('name')
        };

        const loading = NotificationService.showLoading(category ? 'Kateqoriya yenilənir...' : 'Kateqoriya əlavə edilir...');
        let success;
        try {
            if (category) {
                success = await DataService.updateCategory(category.id, data);
            } else {
                success = await DataService.addCategory(data);
            }
            NotificationService.hideLoading(loading);
            if (success) {
                NotificationService.show(`Kateqoriya uğurla ${category ? 'yeniləndi' : 'əlavə edildi'}!`, 'success');
                modalContainer.innerHTML = '';
                showCategories(container); // Refresh category list
            } else {
                NotificationService.show(`Kateqoriya ${category ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi!`, 'error');
            }
        } catch (error) {
            NotificationService.hideLoading(loading);
            console.error(`Error ${category ? 'updating' : 'adding'} category:`, error);
            NotificationService.show(`Kateqoriya ${category ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi: ${error.message}`, 'error');
        }
    });

    modal.querySelector('.close-modal').addEventListener('click', () => {
        modalContainer.innerHTML = '';
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modalContainer.innerHTML = '';
        }
    });
};

const setupPOSEventListeners = (container) => {
    const posTableNumberInput = container.querySelector('#pos-table-number');
    const posProductSearchInput = container.querySelector('#pos-product-search');
    const posCategoryFilters = container.querySelector('#pos-category-filters');
    const posProductList = container.querySelector('#pos-product-list');
    const posCurrentOrderItems = container.querySelector('#pos-current-order-items');
    const posPlaceOrderBtn = container.querySelector('#pos-send-order-btn');
    const posMarkServedBtn = container.querySelector('#pos-mark-served-btn');
    const posMarkPaidBtn = container.querySelector('#pos-mark-paid-btn');

    const posNewOrderBtn = container.querySelector('#pos-new-order-btn');
    const posHoldOrderBtn = container.querySelector('#pos-hold-order-btn'); // Header button
    const posHoldOrderBtn2 = container.querySelector('#pos-hold-order-btn-2'); // Right panel button
    const posQuickSaleBtn = container.querySelector('#pos-quick-sale-btn');
    const posPaymentsBtn = container.querySelector('#pos-payments-btn'); // New payments button
    const posLogoutBtn = container.querySelector('#pos-logout-btn'); // New logout button
    const posPaymentTypeSelection = container.querySelector('#pos-payment-type-selection'); // New element

    // Event delegation for product clicks
    if (posProductList) {
        posProductList.addEventListener('click', async (event) => {
            if (!AuthService.hasPermission('process_pos_order')) { // Check permission for adding items to cart (part of processing order)
                NotificationService.show('Sifarişə məhsul əlavə etmək üçün icazəniz yoxdur.', 'error');
                return;
            }
            const card = event.target.closest('.pos-product-card');
            if (!card) return;
            const productId = card.dataset.productId;
            const product = posProducts.find(p => p.id === productId);
            if (product) {
                if (product.stock > 0 || product.stock === undefined) { // Allow undefined stock for simplicity if not tracked
                    adminCartService.addItem(product);
                } else {
                    NotificationService.show('Məhsul stokda yoxdur', 'warning');
                }
            }
        });
    }

    // Event delegation for category filters
    if (posCategoryFilters) {
        posCategoryFilters.addEventListener('click', (event) => {
            const btn = event.target.closest('.pos-category-btn');
            if (btn) {
                container.querySelectorAll('.pos-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const category = btn.dataset.category;
                const searchTerm = posProductSearchInput ? posProductSearchInput.value.toLowerCase() : '';
                filterPOSProducts(searchTerm, category);
            }
        });
    }

    // Event delegation for cart item quantity/remove
    if (posCurrentOrderItems) {
        posCurrentOrderItems.addEventListener('click', (event) => {
            if (!AuthService.hasPermission('process_pos_order')) { // Check permission for modifying cart
                NotificationService.show('Sifarişə dəyişiklik etmək üçün icazəniz yoxdur.', 'error');
                return;
            }
            const btn = event.target.closest('button');
            if (!btn) return;

            const itemEl = btn.closest('.pos-cart-item');
            if (!itemEl) return;

            const index = Number(itemEl.dataset.index);
            const action = btn.dataset.action;
            const items = adminCartService.getItems();

            if (isNaN(index) || index < 0 || index >= items.length) {
                console.error('Invalid cart item index or action.');
                return;
            }

            if (action === 'remove') {
                adminCartService.removeItem(index);
                NotificationService.show('Məhsul səbətdən silindi.', 'info');
            } else if (action === 'increase') {
                adminCartService.updateQuantity(index, items[index].quantity + 1);
            } else if (action === 'decrease') {
                adminCartService.updateQuantity(index, items[index].quantity - 1);
            }
        });

        // Handle direct input for quantity
        posCurrentOrderItems.addEventListener('change', (event) => {
            if (!AuthService.hasPermission('process_pos_order')) {
                NotificationService.show('Sifarişə dəyişiklik etmək üçün icazəniz yoxdur.', 'error');
                return;
            }
            const input = event.target;
            if (input.tagName === 'INPUT' && input.type === 'number') {
                const itemEl = input.closest('.pos-cart-item');
                if (!itemEl) return;
                const index = Number(itemEl.dataset.index);
                const newQuantity = parseInt(input.value, 10);

                if (!isNaN(newQuantity) && newQuantity >= 0) {
                    adminCartService.updateQuantity(index, newQuantity);
                } else {
                    input.value = adminCartService.getItems()[index].quantity; // Revert to current quantity
                }
            }
        });
    }
    
    // Search input listener
    if (posProductSearchInput) {
        posProductSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const activeCategoryBtn = container.querySelector('.pos-category-btn.active');
            const activeCategory = activeCategoryBtn ? activeCategoryBtn.dataset.category : 'all';
            filterPOSProducts(searchTerm, activeCategory);
        });
    }

    // Table number input listener
    if (posTableNumberInput) {
        posTableNumberInput.addEventListener('change', (e) => {
            posCurrentTableNumber = parseInt(e.target.value);
            if(posCurrentTableNumber > 0) {
                localStorage.setItem('posTableNumber', posCurrentTableNumber);
                updatePOSCartDisplay(); // Re-enable place order button if cart has items
            } else {
                localStorage.removeItem('posTableNumber');
                posCurrentTableNumber = null;
                updatePOSCartDisplay(); // Disable place order button
            }
        });
    }

    // New: Payment type selection listener
    if (posPaymentTypeSelection) {
        posPaymentTypeSelection.addEventListener('click', (event) => {
            const btn = event.target.closest('.pos-payment-type-btn');
            if (btn) {
                container.querySelectorAll('.pos-payment-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                posCurrentPaymentType = btn.dataset.paymentType;
                NotificationService.show(`Ödəniş növü: ${posCurrentPaymentType.charAt(0).toUpperCase() + posCurrentPaymentType.slice(1)}`, 'info', 1500);
            }
        });
    }

    // Place/Update Order button
    if (posPlaceOrderBtn) {
        posPlaceOrderBtn.addEventListener('click', async () => {
            if (!AuthService.hasPermission('process_pos_order')) {
                NotificationService.show('Sifariş göndərmək/yeniləmək üçün icazəniz yoxdur.', 'error');
                return;
            }
            const loading = NotificationService.showLoading('Sifariş göndərilir...');
            const orderItems = adminCartService.getItems();
            
            if (orderItems.length === 0) {
                NotificationService.show('Səbət boşdur.', 'error');
                NotificationService.hideLoading(loading);
                return;
            }

            if (!posCurrentTableNumber || posCurrentTableNumber <= 0) {
                NotificationService.show('Zəhmət olmasa masa nömrəsini daxil edin.', 'error');
                posTableNumberInput.focus();
                NotificationService.hideLoading(loading);
                return;
            }

            try {
                if (posCurrentSelectedOrderId) {
                    // Update existing order
                    const success = await DataService.updateOrderItems(posCurrentSelectedOrderId, orderItems);
                    if (success) {
                        NotificationService.show(`Masa ${posCurrentTableNumber} sifarişi yeniləndi!`, 'success');
                    } else {
                        NotificationService.show('Sifariş yenilənərkən xəta baş verdi.', 'error');
                    }
                } else {
                    // Place new order
                    const newOrder = {
                        tableNumber: posCurrentTableNumber,
                        items: orderItems.map(item => ({
                            id: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            priceAtOrder: item.priceAtOrder
                        })),
                        status: 'pending',
                        userId: getCurrentUser()?.uid || 'pos-user', // Assign a user ID for POS orders
                        orderSource: 'pos',
                        paymentType: posCurrentPaymentType // Pass the selected payment type
                    };
                    const result = await DataService.addOrder(newOrder);
                    if (result && result.id) {
                        NotificationService.show(`Masa ${posCurrentTableNumber} üçün yeni sifariş göndərildi!`, 'success');
                        posCurrentSelectedOrderId = result.id; // Select the new order
                    } else {
                        NotificationService.show('Yeni sifariş göndərilərkən xəta baş verdi.', 'error');
                    }
                }
                adminCartService.clear();
                posTableNumberInput.value = '';
                localStorage.removeItem('posTableNumber');
                posCurrentTableNumber = null;
                posCurrentSelectedOrderId = null;
                // Reset payment type to default
                posCurrentPaymentType = PAYMENT_TYPES.CASH;
                container.querySelector(`.pos-payment-type-btn[data-payment-type="${PAYMENT_TYPES.CASH}"]`).click();
                // No need to manually reload orders, real-time listener will handle it.
            } catch (error) {
                console.error('Error processing order:', error);
                NotificationService.show(`Sifariş xətası: ${error.message}`, 'error');
            } finally {
                NotificationService.hideLoading(loading);
            }
        });
    }

    // Mark as Served button
    if (posMarkServedBtn) {
        posMarkServedBtn.addEventListener('click', async () => {
            if (!AuthService.hasPermission('mark_order_served')) {
                NotificationService.show('Sifarişi servis etmək üçün icazəniz yoxdur.', 'error');
                return;
            }
            if (!posCurrentSelectedOrderId) {
                NotificationService.show('Servis ediləcək sifarişi seçin.', 'warning');
                return;
            }
            const loading = NotificationService.showLoading('Sifariş servis edilir...');
            try {
                const success = await DataService.updateOrder(posCurrentSelectedOrderId, 'served');
                if (success) {
                    NotificationService.show('Sifariş servis edildi!', 'success');
                    adminCartService.clear();
                    posTableNumberInput.value = '';
                    localStorage.removeItem('posTableNumber');
                    posCurrentTableNumber = null;
                    posCurrentSelectedOrderId = null;
                    posCurrentPaymentType = PAYMENT_TYPES.CASH;
                    container.querySelector(`.pos-payment-type-btn[data-payment-type="${PAYMENT_TYPES.CASH}"]`).click();
                } else {
                    NotificationService.show('Sifariş statusu yenilənərkən xəta baş verdi.', 'error');
                }
            } catch (error) {
                console.error('Error marking order as served:', error);
                NotificationService.show('Servis zamanı xəta baş verdi.', 'error');
            } finally {
                NotificationService.hideLoading(loading);
            }
        });
    }

    // Mark as Paid button
    if (posMarkPaidBtn) {
        posMarkPaidBtn.addEventListener('click', async () => {
            if (!AuthService.hasPermission('mark_order_paid')) {
                NotificationService.show('Ödənişi qeydə almaq üçün icazəniz yoxdur.', 'error');
                return;
            }
            if (!posCurrentSelectedOrderId) {
                NotificationService.show('Ödəniş alınacaq sifarişi seçin.', 'warning');
                return;
            }
            const loading = NotificationService.showLoading('Ödəniş qeydə alınır...');
            try {
                const success = await DataService.updateOrder(posCurrentSelectedOrderId, 'paid');
                if (success) {
                    NotificationService.show('Sifariş ödəndi və tamamlandı!', 'success');
                    adminCartService.clear();
                    posTableNumberInput.value = '';
                    localStorage.removeItem('posTableNumber');
                    posCurrentTableNumber = null;
                    posCurrentSelectedOrderId = null;
                    posCurrentPaymentType = PAYMENT_TYPES.CASH;
                    container.querySelector(`.pos-payment-type-btn[data-payment-type="${PAYMENT_TYPES.CASH}"]`).click();
                } else {
                    NotificationService.show('Ödəniş qeydə alınarkən xəta baş verdi.', 'error');
                }
            } catch (error) {
                console.error('Error marking order as paid:', error);
                NotificationService.show('Ödəniş zamanı xəta baş verdi.', 'error');
            } finally {
                NotificationService.hideLoading(loading);
            }
        });
    }

    // New Order button
    if (posNewOrderBtn) {
        posNewOrderBtn.addEventListener('click', () => {
            if (!AuthService.hasPermission('process_pos_order')) {
                NotificationService.show('Yeni sifariş yaratmaq üçün icazəniz yoxdur.', 'error');
                return;
            }
            adminCartService.clear();
            posCurrentSelectedOrderId = null;
            posTableNumberInput.value = '';
            localStorage.removeItem('posTableNumber');
            posCurrentTableNumber = null;
            posCurrentPaymentType = PAYMENT_TYPES.CASH;
            container.querySelector(`.pos-payment-type-btn[data-payment-type="${PAYMENT_TYPES.CASH}"]`).click();
            NotificationService.show('Yeni sifariş üçün səbət təmizləndi.', 'info');
        });
    }

    // Payments button handler
    if (posPaymentsBtn) {
        posPaymentsBtn.addEventListener('click', () => {
            if (!AuthService.hasPermission('view_sales')) { // Reusing view_sales for payments
                NotificationService.show('Ödənişlər panelinə daxil olmaq üçün icazəniz yoxdur.', 'error');
                return;
            }
            // Programmatically switch to the 'sales' tab in the admin panel
            const adminMenu = document.getElementById('admin-menu');
            if (adminMenu) {
                const salesTabButton = adminMenu.querySelector('.admin-menu-item[data-tab="sales"]');
                if (salesTabButton) {
                    salesTabButton.click();
                } else {
                    NotificationService.show('Satışlar paneli tapılmadı.', 'error');
                }
            }
        });
    }

    // Logout button handler
    if (posLogoutBtn) {
        posLogoutBtn.addEventListener('click', async () => {
            const confirmed = await NotificationService.showConfirm('POS sistemindən çıxmaq istədiyinizə əminsinizmi?');
            if (!confirmed) {
                return; // User cancelled logout
            }

            localStorage.removeItem('posTableNumber'); // Clear POS specific state
            posCurrentTableNumber = null;
            posCurrentSelectedOrderId = null;
            adminCartService.clear(); // Clear any remaining cart items
            posCurrentPaymentType = PAYMENT_TYPES.CASH; // Reset payment type
            const result = await logout(); // Use the global logout function
            if (result.success) {
                NotificationService.show('POS sistemindən uğurla çıxış etdiniz.', 'success');
                window.dispatchEvent(new CustomEvent('reinitialize-app')); // Reinitialize app to go back to role selection
            } else {
                NotificationService.show(`Çıxış xətası: ${result.error}`, 'error');
            }
        });
    }

    // Hold Order button (both header and right panel)
    const handleHoldOrder = () => {
        if (!AuthService.hasPermission('process_pos_order')) {
            NotificationService.show('Sifariş saxlamaq üçün icazəniz yoxdur.', 'error');
            return;
        }
        if (adminCartService.getItems().length === 0 && !posCurrentSelectedOrderId) {
            NotificationService.show('Saxlanacaq sifariş yoxdur.', 'warning');
            return;
        }

        if (posCurrentSelectedOrderId) {
            // If an existing order is selected, simply unselect it and clear the cart
            adminCartService.clear();
            posCurrentSelectedOrderId = null;
            posTableNumberInput.value = '';
            localStorage.removeItem('posTableNumber');
            posCurrentTableNumber = null;
            posCurrentPaymentType = PAYMENT_TYPES.CASH;
            container.querySelector(`.pos-payment-type-btn[data-payment-type="${PAYMENT_TYPES.CASH}"]`).click();
            NotificationService.show('Sifariş masadan ayrıldı.', 'info');
        } else {
            // If a new order is being built, this would typically save it as a draft.
            // For now, we'll just clear it like a 'new order' action but keep table number if set.
            adminCartService.clear();
            posCurrentPaymentType = PAYMENT_TYPES.CASH;
            container.querySelector(`.pos-payment-type-btn[data-payment-type="${PAYMENT_TYPES.CASH}"]`).click();
            NotificationService.show('Cari sifariş saxlanıldı.', 'info');
        }
    };
    if (posHoldOrderBtn && AuthService.hasPermission('process_pos_order')) posHoldOrderBtn.addEventListener('click', handleHoldOrder);
    if (posHoldOrderBtn2 && AuthService.hasPermission('process_pos_order')) posHoldOrderBtn2.addEventListener('click', handleHoldOrder);

    // Quick Sale button
    if (posQuickSaleBtn) {
        posQuickSaleBtn.addEventListener('click', () => {
            if (!AuthService.hasPermission('process_pos_order')) {
                NotificationService.show('Cəld satış etmək üçün ic!azəniz yoxdur.', 'error');
                return;
            }
            adminCartService.clear();
            posCurrentSelectedOrderId = null;
            posTableNumberInput.value = '999'; // Use a special table number for quick sales
            localStorage.setItem('posTableNumber', 999);
            posCurrentTableNumber = 999;
            posCurrentPaymentType = PAYMENT_TYPES.CASH;
            container.querySelector(`.pos-payment-type-btn[data-payment-type="${PAYMENT_TYPES.CASH}"]`).click();
            NotificationService.show('Cəld satış rejiminə keçdiniz (Masa 999).', 'info');
        });
    }

    // Event delegation for selecting existing orders
    const posOpenOrdersList = container.querySelector('#pos-open-orders-list');
    if (posOpenOrdersList) {
        posOpenOrdersList.addEventListener('click', (event) => {
            const openOrder = event.target.closest('.pos-order-list-item');
            if (openOrder) {
                const orderId = openOrder.dataset.orderId;
                posCurrentSelectedOrderId = orderId;
                const selectedOrder = posActiveOrders.find(o => o.id === posCurrentSelectedOrderId);
                if (selectedOrder) {
                    adminCartService.clear(); // Clear current cart
                    selectedOrder.items.forEach(item => {
                        // Ensure priceAtOrder is used as the base price for cart items
                        adminCartService.addItem({ ...item, price: item.priceAtOrder }, item.quantity);
                    });
                    posTableNumberInput.value = selectedOrder.tableNumber;
                    localStorage.setItem('posTableNumber', selectedOrder.tableNumber);
                    posCurrentTableNumber = selectedOrder.tableNumber;
                    // Set payment type from the loaded order, or default to cash
                    posCurrentPaymentType = selectedOrder.paymentType || PAYMENT_TYPES.CASH;
                    // Update UI for payment type button
                    container.querySelectorAll('.pos-payment-type-btn').forEach(btn => {
                        if (btn.dataset.paymentType === posCurrentPaymentType) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });

                    NotificationService.show(`Masa ${selectedOrder.tableNumber} sifarişi yükləndi.`, 'info');
                }
            }
        });
    }

    // Setup real-time listener for existing orders in POS
    posOrdersUnsubscribe = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
        posActiveOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                                    .filter(o => o.status && !['paid', 'cancelled'].includes(o.status));
        posActiveOrders.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)); // Sort by oldest first
        loadPOSExistingOrders(container); // Re-render the list
    }, (error) => {
        console.error("Error listening to POS orders:", error);
        NotificationService.show('Açıq sifarişlər yüklənərkən xəta baş verdi.', 'error');
    });

    console.log('POS event listeners are set up for container:', container.id);
};

const handlePOSKeyboardShortcuts = (e) => {
    // Check if the current tab is POS to avoid conflicts with other parts of the app
    if (currentAdminTab !== 'pos') return;

    switch(e.key) {
        case 'F1':
            e.preventDefault();
            if (AuthService.hasPermission('process_pos_order')) document.getElementById('pos-new-order-btn')?.click();
            break;
        case 'F2':
            e.preventDefault();
            if (AuthService.hasPermission('process_pos_order')) document.getElementById('pos-hold-order-btn')?.click();
            break;
        // F3 for recall or other function if needed
        case 'F10':
            e.preventDefault();
            if (AuthService.hasPermission('process_pos_order')) document.getElementById('pos-quick-sale-btn')?.click();
            break;
        case 'Enter':
            if (e.ctrlKey) { // Ctrl+Enter to place/update order
                e.preventDefault();
                if (AuthService.hasPermission('process_pos_order')) document.getElementById('pos-send-order-btn')?.click();
            }
            break;
        case 'F9': // Example: F9 to mark as paid
            e.preventDefault();
            if (AuthService.hasPermission('mark_order_paid')) document.getElementById('pos-mark-paid-btn')?.click();
            break;
    }
};

const setupPOSKeyboardShortcuts = () => {
    document.addEventListener('keydown', handlePOSKeyboardShortcuts);
};

const updatePOSCartDisplay = () => {
    const items = adminCartService.getItems();
    const total = adminCartService.getTotal();
    const cartContainer = document.getElementById('pos-current-order-items');
    const subtotalEl = document.getElementById('pos-subtotal');
    const discountEl = document.getElementById('pos-discount');
    const finalTotalEl = document.getElementById('pos-total');
    const posPlaceOrderBtn = document.getElementById('pos-send-order-btn');
    const posMarkServedBtn = document.getElementById('pos-mark-served-btn');
    const posMarkPaidBtn = document.getElementById('pos-mark-paid-btn');

    if (!cartContainer || !subtotalEl || !discountEl || !finalTotalEl || !posPlaceOrderBtn || !posMarkServedBtn || !posMarkPaidBtn) return;

    cartContainer.innerHTML = '';

    if (items.length > 0) {
        items.forEach((item, index) => {
            cartContainer.appendChild(createPOSCartItem(item, index));
        });
    } else {
        cartContainer.innerHTML = `<p class="text-center text-slate-500 py-8">Səbət boşdur</p>`;
    }

    // Assuming no discounts applied at the cart level for simplicity here
    const discount = 0; // In a real POS, this would be calculated based on discounts applied
    const finalTotal = total - discount;

    subtotalEl.textContent = `${total.toFixed(2)} AZN`;
    discountEl.textContent = `${discount.toFixed(2)} AZN`;
    finalTotalEl.textContent = `${finalTotal.toFixed(2)} AZN`;

    // Enable/disable buttons based on cart state and selected order and user permissions
    const hasItems = items.length > 0;
    const hasTableNumber = posCurrentTableNumber > 0;
    const hasSelectedOrder = posCurrentSelectedOrderId !== null;

    if (AuthService.hasPermission('process_pos_order')) {
        posPlaceOrderBtn.disabled = !hasItems || (!hasTableNumber && !hasSelectedOrder);
        posPlaceOrderBtn.textContent = hasSelectedOrder ? 'Sifarişi Yenilə' : 'Sifarişi Göndər';
    } else {
        posPlaceOrderBtn.disabled = true;
    }

    if (AuthService.hasPermission('mark_order_served')) {
        posMarkServedBtn.disabled = !hasSelectedOrder;
    } else {
        posMarkServedBtn.disabled = true;
    }

    if (AuthService.hasPermission('mark_order_paid')) {
        posMarkPaidBtn.disabled = !hasSelectedOrder;
    } else {
        posMarkPaidBtn.disabled = true;
    }
};

const loadPOSExistingOrders = async (container) => {
    const listContainer = container.querySelector('#pos-open-orders-list');
    if(!listContainer) return;

    listContainer.innerHTML = `<div class="flex justify-center py-8"><div class="loading-spinner"></div></div>`;
    
    // posActiveOrders is updated by the real-time listener now, just render
    listContainer.innerHTML = '';
    
    if (posActiveOrders.length > 0) {
        posActiveOrders.forEach(order => {
            const isSelected = order.id === posCurrentSelectedOrderId;
            listContainer.appendChild(createPOSOrderListItem(order, isSelected));
        });
    } else {
        listContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-slate-500">Açıq sifariş yoxdur.</p>
            </div>
        `;
    }
};