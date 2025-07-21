import { createElement, createAnalyticsCard, createProductCard, createAdminProductForm, createOrderCard, createTableCard, createTableForm, createDiscountForm, createInventoryItemForm, createPurchaseForm, createEmployeeForm, createCategoryForm, createRecipeForm, createSupplierForm, createPOSOrderListItem, createUserCard, createSalesTableRow, createPOSProductCard, createPOSCartItem } from './components.js';
import { DataService } from './services/dataService.js';
import { NotificationService } from './utils/notificationService.js';
import { CartService } from './utils/cartService.js';
import { StatusUtils } from './utils/statusUtils.js';
import { getCurrentRole, loginAdmin, getCurrentUser, logout } from './auth.js';
import { renderWaiterSection } from './waiter.js';
import { db } from './firebase-config.js';
import { collection, onSnapshot, orderBy, query, doc, updateDoc, getDoc } from 'firebase/firestore';

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

let currentTabCleanup = null; // To store the cleanup function for the active tab

// --- Menu Configuration ---
const MENU_ITEMS = {
    dashboard: { text: 'Göstərici Lövhə', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>` },
    pos: { text: 'Kassa (POS)', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>` },
    kitchen: { text: 'Mətbəx', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 01-1.806.547M8 4h8l-1 1v5.172a2 2 0 01-5.356-1.857M8 4h2m0 0l-2.5 5M8 4l2.5 5m6.5-5l2.5 5"></path></svg>` },
    orders: { text: 'Sifarişlər', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m-6-4v10m6-10v10m6-10v10M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>` },
    sales: { text: 'Satışlar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-4m3 4v-2m3-4V7m-6 4v3m0 0H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v10a2 2 0 01-2 2h-1m8-10a3 3 0 01-3-3V7a3 3 0 013-3h1a2 2 0 012 2v10a2 2 0 01-2 2h-1a3 3 0 01-3-3z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>` },
    products: { text: 'Məhsullar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>` },
    customers: { text: 'Müştərilər', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-5.197M15 21H7m10 0v-2c0-.653-.255-1.274-.71-1.743M7 21H2v-2a3 3 0 015.356-1.857M7 21v-2c0-.653.255-1.274.71-1.743M11 5a4 4 0 11-8 0 4 4 0 018 0zM21 8a4 4 0 11-18 0 4 4 0 0118 0z"></path></svg>` },
    categories: { text: 'Kateqoriyalar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>` },
    tables: { text: 'Masalar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21v-3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>` },
    inventory: { text: 'Anbar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 0H4m8 8v2m0 0h2m-2 4h-2m9-14V5m-5 4a1 1 0 11-2 0 1 1 0 012 0v1m-1 4a1 1 0 00-1 1v3M4 7h16"></path></svg>` },
    employees: { text: 'İşçilər', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.255-1.274-.71-1.743M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.255-1.274.71-1.743M11 5a4 4 0 11-8 0 4 4 0 018 0zM21 8a4 4 0 11-18 0 4 4 0 0118 0z"></path></svg>` },
    purchases: { text: 'Alışlar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2v-5m0-8a2 2 0 012 2v2m0 0H9m0 0l3 3m-3-3l3-3m-3 3V8m0 4a2 2 0 01-2-2H5a2 2 0 01-2-2v-3m9 4H3"></path></svg>` },
    discounts: { text: 'Endirimlər', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>` },
    recipes: { text: 'Reseptlər', icon: `<img src="/chef-hat.png" class="w-5 h-5">` },
    suppliers: { text: 'Təchizatçılar', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>` },
    settings: { text: 'Tənzimləmələr', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>` }
};

const ROLE_MENU_ITEMS = {
    admin: ['dashboard', 'pos', 'kitchen', 'orders', 'sales', 'products', 'categories', 'customers', 'tables', 'inventory', 'employees', 'purchases', 'discounts', 'recipes', 'suppliers', 'settings'],
    manager: ['dashboard', 'pos', 'kitchen', 'orders', 'sales', 'inventory', 'employees'],
    cashier: ['pos', 'orders']
};

export const showAdminLoginPrompt = () => {
    // Remove any existing modals first
    const existingModal = document.querySelector('.admin-login-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }

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
                <h2 class="text-2xl font-bold text-slate-800 mb-2">Admin Girişi</h2>
                <p class="text-slate-600">Admin paneline giriş üçün məlumatları daxil edin.</p>
            </div>
            
            <form id="admin-login-form" class="space-y-4">
                <div>
                    <label for="adminEmailInput" class="block text-sm font-semibold text-slate-700 mb-2">Email ünvanı</label>
                    <input type="email" id="adminEmailInput" name="email" required 
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl text-base"
                           placeholder="admin@restaurant.com">
                </div>
                
                <div>
                    <label for="adminPasswordInput" class="block text-sm font-semibold text-slate-700 mb-2">Şifrə</label>
                    <input type="password" id="adminPasswordInput" name="password" required 
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl text-base"
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

export const renderAdminSection = (container) => {
    const role = getCurrentRole();
    if (['admin', 'manager', 'cashier'].includes(role)) {
        renderAdminPanel(container, role);
    } else {
        container.innerHTML = `<p>Bu bölməyə giriş icazəniz yoxdur.</p>`;
    }
};

const renderAdminPanel = (container, role) => {
    const availableTabs = ROLE_MENU_ITEMS[role] || [];
    const defaultTab = availableTabs[0] || 'dashboard';

    container.innerHTML = `
        <div class="flex flex-col h-screen lg:flex-row admin-panel-container">
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
    }
};

const showAdminTab = async (tabName, container) => {
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
                await showSales(container);
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
    container.innerHTML = `
        <div class="flex justify-center py-8">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        const analytics = await DataService.getAnalytics();
        
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                ${createAnalyticsCard('Ümumi Sifarişlər', analytics.totalOrders, '', 'blue').outerHTML}
                ${createAnalyticsCard('Bugünkü Sifarişlər', analytics.todayOrders, '', 'green').outerHTML}
                ${createAnalyticsCard('Ümumi Gəlir', `${analytics.totalRevenue.toFixed(2)} AZN`, '', 'purple').outerHTML}
                ${createAnalyticsCard('Bugünkü Gəlir', `${analytics.todayRevenue.toFixed(2)} AZN`, '', 'orange').outerHTML}
                ${createAnalyticsCard('Aktiv Sifarişlər', analytics.activeOrders, '', 'blue').outerHTML}
            </div>
            
            ${analytics.popularItems.length > 0 ? `
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
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Məlumatlar yüklənərkən xəta baş verdi.</p>
            </div>
        `;
    }
};

const showSales = async (container) => {
    container.innerHTML = `
        <div class="flex justify-center py-8">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        const orders = await DataService.getOrders();
        const salesData = orders.filter(o => o.status === 'paid');

        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-800">Satışlar Hesabatı</h3>
            </div>
            <div class="ultra-modern-card overflow-x-auto">
                <table class="w-full text-sm text-left text-slate-500">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" class="px-6 py-3">Sifariş ID</th>
                            <th scope="col" class="px-6 py-3">Masa</th>
                            <th scope="col" class="px-6 py-3">Tarix</th>
                            <th scope="col" class="px-6 py-3">Məhsul Sayı</th>
                            <th scope="col" class="px-6 py-3">Ümumi Məbləğ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${salesData.length > 0 ? salesData.map(order => createSalesTableRow(order).outerHTML).join('') : `<tr><td colspan="5" class="text-center p-6">Heç bir satış qeydə alınmayıb.</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading sales data:', error);
        container.innerHTML = `<div class="text-center py-8"><p class="text-red-500">Satış məlumatları yüklənərkən xəta baş verdi.</p></div>`;
    }
};

const showCustomers = async (container) => {
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
    container.innerHTML = `
        <div class="flex justify-center py-8">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        const tables = await DataService.getTables();

        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-800">Masa İdarəetməsi</h3>
                <button id="add-table-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Masa Əlavə Et</button>
            </div>
            
            <div id="tables-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${tables.map(table => createTableCard(table).outerHTML).join('')}
            </div>
            
            <div id="table-modal-container"></div>
        `;

        // Add event listeners
        setupTablesEventListeners(container);
    } catch (error) {
        console.error('Error loading tables:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Masalar yüklənərkən xəta baş verdi.</p>
            </div>
        `;
    }
};

const showCategories = async (container) => {
    container.innerHTML = `
        <div class="flex justify-center py-8">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        const categories = await DataService.getCategories();

        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-800">Kateqoriya İdarəetməsi</h3>
                <button id="add-category-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Kateqoriya Əlavə Et</button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${categories.map(category => `
                    <div class="ultra-modern-card p-6">
                        <h4 class="text-lg font-bold text-slate-800 mb-4">${category.name}</h4>
                        <div class="flex space-x-2">
                            <button class="edit-category-btn flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-600" data-category-id="${category.id}">
                                Redaktə
                            </button>
                            <button class="delete-category-btn flex-1 bg-red-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-600" data-category-id="${category.id}">
                                Sil
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div id="category-modal-container"></div>
        `;

        // Add event listeners
        setupCategoriesEventListeners(container);
    } catch (error) {
        console.error('Error loading categories:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Kateqoriyalar yüklənərkən xəta baş verdi.</p>
            </div>
        `;
    }
};

const showEmployees = async (container) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">İşçilər</h3>
            <button id="add-employee-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni İşçi</button>
        </div>
        <div id="employees-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="employee-modal-container"></div>
    `;
    const employees = await DataService.getUsers();
    const grid = container.querySelector('#employees-grid');
    grid.innerHTML = employees.length
        ? ''
        : '<p class="col-span-full text-center text-slate-500 py-8">Heç bir işçi yoxdur.</p>';
    employees.forEach(emp => {
        grid.appendChild(createUserCard(emp));
    });
    // TODO: wire up add/edit/delete event listeners using #add-employee-btn and .createEmployeeForm
};

const showInventory = async (container) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Anbar (Inventory)</h3>
            <button id="add-inventory-item-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Məhsul</button>
        </div>
        <div id="inventory-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="inventory-modal-container"></div>
    `;
    const items = await DataService.getInventoryItems();
    const list = container.querySelector('#inventory-list');
    if (items.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-500 py-8">Heç bir məhsul tapılmadı.</p>';
    } else {
        list.innerHTML = '';
        items.forEach(item => {
            const card = createElement('div', { className: 'ultra-modern-card p-4 flex justify-between items-center' });
            card.innerHTML = `
                <div>
                    <h4 class="font-semibold text-slate-800">${item.name || item.id}</h4>
                    <p class="text-sm text-slate-600">Miqdar: ${item.quantity || ''} ${item.unit || ''}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-inventory-btn bg-blue-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${item.id}">Redaktə</button>
                    <button class="delete-inventory-btn bg-red-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${item.id}">Sil</button>
                </div>
            `;
            list.appendChild(card);
        });
    }
};

const showPurchases = async (container) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Alışlar</h3>
            <button id="add-purchase-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Alış</button>
        </div>
        <div id="purchases-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="purchase-modal-container"></div>
    `;
    const purchases = await DataService.getPurchases();
    const list = container.querySelector('#purchases-list');
    if (purchases.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-500 py-8">Heç bir alış yoxdur.</p>';
    } else {
        list.innerHTML = '';
        purchases.forEach(p => {
            const card = createElement('div', { className: 'ultra-modern-card p-4 flex justify-between items-center' });
            card.innerHTML = `
                <div>
                    <h4 class="font-semibold text-slate-800">${p.itemName || p.id}</h4>
                    <p class="text-sm text-slate-600">${p.quantity} ${p.unit || ''} @ ${p.unitCost} AZN</p>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-purchase-btn bg-blue-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${p.id}">Redaktə</button>
                    <button class="delete-purchase-btn bg-red-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${p.id}">Sil</button>
                </div>
            `;
            list.appendChild(card);
        });
    }
};

const showDiscounts = async (container) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Endirimlər</h3>
            <button id="add-discount-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Endirim</button>
        </div>
        <div id="discounts-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="discount-modal-container"></div>
    `;
    const discounts = await DataService.getDiscounts();
    const list = container.querySelector('#discounts-list');
    if (discounts.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-500 py-8">Heç bir endirim yoxdur.</p>';
    } else {
        list.innerHTML = '';
        discounts.forEach(d => {
            const card = createElement('div', { className: 'ultra-modern-card p-4 flex justify-between items-center' });
            card.innerHTML = `
                <div>
                    <h4 class="font-semibold text-slate-800">${d.name}</h4>
                    <p class="text-sm text-slate-600">${d.percentage}% ${d.isActive ? 'aktiv' : 'passiv'}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-discount-btn bg-blue-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${d.id}">Redaktə</button>
                    <button class="delete-discount-btn bg-red-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${d.id}">Sil</button>
                </div>
            `;
            list.appendChild(card);
        });
    }
};

const showRecipes = async (container) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Reseptlər</h3>
            <button id="add-recipe-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Resept</button>
        </div>
        <div id="recipes-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="recipe-modal-container"></div>
    `;
    const recipes = await DataService.getRecipes();
    const list = container.querySelector('#recipes-list');
    if (recipes.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-500 py-8">Heç bir resept yoxdur.</p>';
    } else {
        list.innerHTML = '';
        recipes.forEach(r => {
            const card = createElement('div', { className: 'ultra-modern-card p-4 flex justify-between items-center' });
            card.innerHTML = `
                <div>
                    <h4 class="font-semibold text-slate-800">${r.name || 'Resept'} </h4>
                    <p class="text-sm text-slate-600">Məhsul ID: ${r.productId || '-'}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-recipe-btn bg-blue-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${r.id}">Redaktə</button>
                    <button class="delete-recipe-btn bg-red-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${r.id}">Sil</button>
                </div>
            `;
            list.appendChild(card);
        });
    }
};

const showSuppliers = async (container) => {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800">Təchizatçılar</h3>
            <button id="add-supplier-btn" class="premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">Yeni Təchizatçı</button>
        </div>
        <div id="suppliers-list" class="space-y-4">
            <div class="flex justify-center py-8"><div class="loading-spinner"></div></div>
        </div>
        <div id="supplier-modal-container"></div>
    `;
    const suppliers = await DataService.getSuppliers();
    const list = container.querySelector('#suppliers-list');
    if (suppliers.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-500 py-8">Heç bir təchizatçı yoxdur.</p>';
    } else {
        list.innerHTML = '';
        suppliers.forEach(s => {
            const card = createElement('div', { className: 'ultra-modern-card p-4 flex justify-between items-center' });
            card.innerHTML = `
                <div>
                    <h4 class="font-semibold text-slate-800">${s.name}</h4>
                    <p class="text-sm text-slate-600">${s.contactPerson || ''} ${s.phone || ''}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-supplier-btn bg-blue-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${s.id}">Redaktə</button>
                    <button class="delete-supplier-btn bg-red-500 text-white px-3 py-2 rounded-lg text-sm" data-id="${s.id}">Sil</button>
                </div>
            `;
            list.appendChild(card);
        });
    }
};

const showSettings = async (container) => {
    container.innerHTML = `
        <div class="flex justify-center py-8">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        const businessInfo = await DataService.getBusinessInfo();
        const users = await DataService.getUsers();

        container.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <h3 class="text-xl font-bold text-slate-800 mb-6">Sistem Tənzimləmələri</h3>
                
                <!-- Settings Tabs -->
                <div class="flex flex-wrap gap-2 mb-6">
                    <button class="settings-tab active" data-tab="business">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        <span>Biznes Məlumatları</span>
                    </button>
                    <button class="settings-tab" data-tab="users">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-5.197M15 21H7"></path>
                        </svg>
                        <span>İstifadəçilər</span>
                    </button>
                    <button class="settings-tab" data-tab="database">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                        </svg>
                        <span>Baza Tənzimləmələri</span>
                    </button>
                    <button class="settings-tab" data-tab="integrations">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                        <span>İnteqrasiyalar</span>
                    </button>
                </div>

                <!-- Tab Contents -->
                <div id="settings-content">
                    <!-- Business Info Tab -->
                    <div id="business-tab" class="settings-tab-content">
                        <form id="business-info-form" class="ultra-modern-card p-6 space-y-6">
                            <div>
                                <label for="businessName" class="block text-sm font-bold text-slate-700 mb-2">Biznes Adı</label>
                                <input type="text" id="businessName" name="businessName" value="${businessInfo.businessName || ''}" 
                                       class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                                       placeholder="Restoran adı">
                            </div>
                            
                            <div>
                                <label for="businessAddress" class="block text-sm font-bold text-slate-700 mb-2">Ünvan</label>
                                <input type="text" id="businessAddress" name="address" value="${businessInfo.address || ''}" 
                                       class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                                       placeholder="Tam ünvan">
                            </div>
                            
                            <div>
                                <label for="businessPhone" class="block text-sm font-bold text-slate-700 mb-2">Telefon</label>
                                <input type="tel" id="businessPhone" name="phone" value="${businessInfo.phone || ''}" 
                                       class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                                       placeholder="+994 xx xxx xx xx">
                            </div>
                            
                            <div class="space-y-4">
                                <h4 class="text-lg font-bold text-slate-800">Sosial Medialar</h4>
                                
                                <div>
                                    <label for="instagram" class="block text-sm font-bold text-slate-700 mb-2">Instagram</label>
                                    <input type="url" id="instagram" name="instagram" value="${businessInfo.socials?.instagram || ''}" 
                                           class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                                           placeholder="https://instagram.com/username">
                                </div>
                                
                                <div>
                                    <label for="facebook" class="block text-sm font-bold text-slate-700 mb-2">Facebook</label>
                                    <input type="url" id="facebook" name="facebook" value="${businessInfo.socials?.facebook || ''}" 
                                           class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                                           placeholder="https://facebook.com/page">
                                </div>
                                
                                <div>
                                    <label for="tiktok" class="block text-sm font-bold text-slate-700 mb-2">TikTok</label>
                                    <input type="url" id="tiktok" name="tiktok" value="${businessInfo.socials?.tiktok || ''}" 
                                           class="ultra-modern-input w-full px-4 py-3 rounded-xl"
                                           placeholder="https://tiktok.com/@username">
                                </div>
                            </div>
                            
                            <button type="submit" class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold">
                                Yadda saxla
                            </button>
                        </form>
                    </div>

                    <!-- Users Tab -->
                    <div id="users-tab" class="settings-tab-content hidden">
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
                                                    <button class="edit-user-btn text-blue-600 hover:text-blue-800" data-user-id="${user.id}">
                                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1-4H9a2 2 0 00-2-2V6a2 2 0 012-2h2m-1 4h2m-1 4v2m-9 4h2"></path>
                                                        </svg>
                                                    </button>
                                                    ${user.role !== 'admin' ? `
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
                    </div>

                    <!-- Database Tab -->
                    <div id="database-tab" class="settings-tab-content hidden">
                        <div class="ultra-modern-card p-6 space-y-6">
                            <h4 class="text-lg font-bold text-slate-800 mb-4">Verilənlər Bazası İdarəetməsi</h4>
                            
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
                                    <h5 class="font-semibold text-slate-700">Baza Əməliyyatları</h5>
                                    <div class="space-y-3">
                                        <button id="refresh-stats-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors">
                                            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                            </svg>
                                            Statistikları Yenilə
                                        </button>
                                        
                                        <button id="backup-db-btn" class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors">
                                            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                                            </svg>
                                            Yedəkləmə Yarat
                                        </button>
                                        
                                        <button id="reset-db-btn" class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors">
                                            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                            </svg>
                                            Bazanı Sıfırla
                                        </button>
                                    </div>
                                    
                                    <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                        <div class="flex">
                                            <svg class="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                            </svg>
                                            <div class="text-sm text-yellow-700">
                                                <strong>Diqqət:</strong> Baza əməliyyatları geri qaytarıla bilməz. Əməliyyat öncəsi yedəkləmə yaradın.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Integrations Tab -->
                    <div id="integrations-tab" class="settings-tab-content hidden">
                        <div class="ultra-modern-card p-6">
                            <h4 class="text-lg font-bold text-slate-800 mb-6">Xarici Servislər və İnteqrasiyalar</h4>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Payment Systems -->
                                <div class="border border-slate-200 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-slate-800">Ödəniş Sistemləri</h5>
                                                <p class="text-sm text-slate-500">Online ödəniş üçün</p>
                                            </div>
                                        </div>
                                        <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Gələcəkdə</span>
                                    </div>
                                    <p class="text-sm text-slate-600">Kapital Bank, Unibank, PayPal və digər ödəniş sistemləri ilə inteqrasiya.</p>
                                </div>

                                <!-- SMS Service -->
                                <div class="border border-slate-200 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-slate-800">SMS Xidməti</h5>
                                                <p class="text-sm text-slate-500">Müştəri bildirişləri</p>
                                            </div>
                                        </div>
                                        <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Gələcəkdə</span>
                                    </div>
                                    <p class="text-sm text-slate-600">Sifariş statusu və kampanyalar haqqında SMS bildirişləri.</p>
                                </div>

                                <!-- Accounting -->
                                <div class="border border-slate-200 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-slate-800">Mühasibat Sistemi</h5>
                                                <p class="text-sm text-slate-500">Maliyyə hesabatları</p>
                                            </div>
                                        </div>
                                        <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Gələcəkdə</span>
                                    </div>
                                    <p class="text-sm text-slate-600">1C, SAP və digər mühasibat sistemləri ilə inteqrasiya.</p>
                                </div>

                                <!-- Delivery -->
                                <div class="border border-slate-200 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-slate-800">Çatdırılma Xidməti</h5>
                                                <p class="text-sm text-slate-500">Kuryerlər üçün</p>
                                            </div>
                                        </div>
                                        <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Gələcəkdə</span>
                                    </div>
                                    <p class="text-sm text-slate-600">Bolt Food, Wolt və digər çatdırılma platformaları.</p>
                                </div>
                            </div>

                            <div class="mt-8 text-center">
                                <p class="text-slate-500 text-sm">Bu funksiyalar növbəti versiyalarda əlavə ediləcək.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Setup settings tabs event listeners
        setupSettingsEventListeners(container);
        
        // Load database statistics
        loadDatabaseStatistics();

        // Add event listener for business info form submission
        container.querySelector('#business-info-form').addEventListener('submit', async (e) => {
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
    // Settings tabs
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

    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', loadDatabaseStatistics);
    }

    if (backupDbBtn) {
        backupDbBtn.addEventListener('click', async () => {
            NotificationService.show('Yedəkləmə funksiyas gələcəkdə əlavə ediləcək.', 'info');
        });
    }

    if (resetDbBtn) {
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
                            class="ultra-modern-input w-24 text-center px-3 py-2 rounded-xl text-base font-semibold"
                            min="1" value="${posCurrentTableNumber || ''}">
                    </div>
                </div>
                
                <!-- Function Buttons -->
                <div class="flex items-center space-x-2">
                    <button id="pos-quick-sale-btn" class="pos-func-btn bg-green-100 text-green-700" title="F10 - Cəld Satış">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        <span class="hidden sm:inline">Cəld Satış (F10)</span>
                    </button>
                    <button id="pos-hold-order-btn" class="pos-func-btn bg-yellow-100 text-yellow-700" title="F2 - Sifarişi Saxla">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3v-6a3 3 0 013-3h1a2 2 0 012 2v10a2 2 0 01-2 2h-1a3 3 0 01-3-3z"></path></svg>
                        <span class="hidden sm:inline">Saxla (F2)</span>
                    </button>
                    <button id="pos-new-order-btn" class="pos-func-btn bg-blue-100 text-blue-700" title="F1 - Yeni Sifariş">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3v-6a3 3 0 013-3h1a2 2 0 012 2v10a2 2 0 01-2 2h-1a3 3 0 01-3-3z"></path></svg>
                        <span class="hidden sm:inline">Yeni (F1)</span>
                    </button>
                    <!-- New "Ödənişlər" button -->
                    <button id="pos-payments-btn" class="pos-func-btn bg-purple-100 text-purple-700" title="Ödənişlər">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        <span class="hidden sm:inline">Ödənişlər</span>
                    </button>
                    <!-- Renamed "Geri" to "Çıxış" -->
                    <button id="pos-logout-btn" class="pos-func-btn bg-red-500 text-white" title="Çıxış">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3v-6a3 3 0 013-3h1a2 2 0 012 2v10a2 2 0 01-2 2h-1a3 3 0 01-3-3z"></path></svg>
                        <span class="hidden sm:inline">Çıxış</span>
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
                            class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base">
                    </div>
                    <div id="pos-category-filters" class="flex flex-wrap gap-2 mb-3 flex-shrink-0">
                        <button class="pos-category-btn active" data-category="all">Hamısı</button>
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
                        <div class="grid grid-cols-2 gap-2 pt-3">
                            <button id="pos-send-order-btn" class="pos-action-btn bg-blue-500 text-white disabled:bg-blue-300">
                                Sifarişi Göndər
                            </button>
                            <button id="pos-mark-served-btn" class="pos-action-btn bg-orange-500 text-white disabled:bg-orange-300">
                                Servis Edildi
                            </button>
                            <button id="pos-hold-order-btn-2" class="pos-action-btn bg-yellow-500 text-white disabled:bg-yellow-300">
                                Saxla
                            </button>
                            <button id="pos-mark-paid-btn" class="pos-action-btn mark-as-paid-btn text-white disabled:opacity-50">
                                Ödəniş Alındı
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

const showPOS = async (container) => {
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
    // Basic event listener setup - implementation would be more detailed
    console.log('Setting up tables event listeners');
};

const setupCategoriesEventListeners = (container) => {
    // Basic event listener setup - implementation would be more detailed
    console.log('Setting up categories event listeners');
};

const setupPOSEventListeners = (container) => {
    // Get all POS specific elements from within the container
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

    // Event delegation for product clicks
    if (posProductList) {
        posProductList.addEventListener('click', async (event) => {
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

    // Place/Update Order button
    if (posPlaceOrderBtn) {
        posPlaceOrderBtn.addEventListener('click', async () => {
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
                        orderSource: 'pos'
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
            if (!posCurrentSelectedOrderId) {
                NotificationService.show('Zəhmət olmasa servis ediləcək sifarişi seçin.', 'warning');
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
            if (!posCurrentSelectedOrderId) {
                NotificationService.show('Zəhmət olmasa ödəniş alınacaq sifarişi seçin.', 'warning');
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
            adminCartService.clear();
            posCurrentSelectedOrderId = null;
            posTableNumberInput.value = '';
            localStorage.removeItem('posTableNumber');
            posCurrentTableNumber = null;
            NotificationService.show('Yeni sifariş üçün səbət təmizləndi.', 'info');
        });
    }

    // Payments button handler
    if (posPaymentsBtn) {
        posPaymentsBtn.addEventListener('click', () => {
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
            NotificationService.show('Sifariş masadan ayrıldı.', 'info');
        } else {
            // If a new order is being built, this would typically save it as a draft.
            // For now, we'll just clear it like a 'new order' action but keep table number if set.
            adminCartService.clear();
            NotificationService.show('Cari sifariş saxlanıldı.', 'info');
        }
    };
    if (posHoldOrderBtn) posHoldOrderBtn.addEventListener('click', handleHoldOrder);
    if (posHoldOrderBtn2) posHoldOrderBtn2.addEventListener('click', handleHoldOrder);

    // Quick Sale button
    if (posQuickSaleBtn) {
        posQuickSaleBtn.addEventListener('click', () => {
            adminCartService.clear();
            posCurrentSelectedOrderId = null;
            posTableNumberInput.value = '999'; // Use a special table number for quick sales
            localStorage.setItem('posTableNumber', 999);
            posCurrentTableNumber = 999;
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
                    NotificationService.show(`Masa ${selectedOrder.tableNumber} sifarişi yükləndi.`, 'info');
                }
                loadPOSExistingOrders(container); // Re-render to show selection
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
            document.getElementById('pos-new-order-btn')?.click();
            break;
        case 'F2':
            e.preventDefault();
            document.getElementById('pos-hold-order-btn')?.click();
            break;
        // F3 for recall or other function if needed
        case 'F10':
            e.preventDefault();
            document.getElementById('pos-quick-sale-btn')?.click();
            break;
        case 'Enter':
            if (e.ctrlKey) { // Ctrl+Enter to place/update order
                e.preventDefault();
                document.getElementById('pos-send-order-btn')?.click();
            }
            break;
        case 'F9': // Example: F9 to mark as paid
            e.preventDefault();
            document.getElementById('pos-mark-paid-btn')?.click();
            break;
    }
};

const setupPOSKeyboardShortcuts = () => {
    document.addEventListener('keydown', handlePOSKeyboardShortcuts);
};

const filterPOSProducts = (searchTerm, category) => {
    let filtered = posProducts;

    if (category && category !== 'all') {
        if (category === 'campaign') {
            filtered = filtered.filter(p => p.isCampaignItem || (p.discountPercentage && p.discountPercentage > 0));
        } else {
            filtered = filtered.filter(p => p.category === category);
        }
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.description && p.description.toLowerCase().includes(searchTerm)) ||
            p.category.toLowerCase().includes(searchTerm)
        );
    }
    renderPOSProducts(filtered);
};

const renderPOSProducts = (productsToRender) => {
    const productListContainer = document.getElementById('pos-product-list');
    if (!productListContainer) return;
    productListContainer.innerHTML = '';
    
    if (productsToRender && productsToRender.length > 0) {
        productsToRender.forEach(product => {
            productListContainer.appendChild(createPOSProductCard(product));
        });
    } else {
        productListContainer.innerHTML = `<p class="col-span-full text-center text-slate-500 py-8">Məhsul tapılmadı.</p>`;
    }
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

    // Enable/disable buttons based on cart state and selected order
    const hasItems = items.length > 0;
    const hasTableNumber = posCurrentTableNumber > 0;
    const hasSelectedOrder = posCurrentSelectedOrderId !== null;

    posPlaceOrderBtn.disabled = !hasItems || (!hasTableNumber && !hasSelectedOrder);
    posPlaceOrderBtn.textContent = hasSelectedOrder ? 'Sifarişi Yenilə' : 'Sifarişi Göndər';
    
    posMarkServedBtn.disabled = !hasSelectedOrder;
    posMarkPaidBtn.disabled = !hasSelectedOrder;
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
        listContainer.innerHTML = `<p class="text-center text-slate-500 py-8">Açıq sifariş yoxdur.</p>`;
    }
};