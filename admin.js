import { createElement, createAdminProductForm, createTableCard, createAnalyticsCard, createProductCard, createDiscountForm, createTableForm, createInventoryItemForm, createPurchaseForm, createEmployeeForm, createCategoryForm } from './components.js';
import { DataService } from './services/dataService.js'; 
import { NotificationService } from './utils/notificationService.js';
import { isAdmin, requireAdmin, getCurrentRole, isManager, isCashier, registerUser, loginAdmin } from './auth.js'; 
import { CartService } from './utils/cartService.js';
import { StatusUtils } from './utils/statusUtils.js'; 

let adminCartService = new CartService();
let currentModal = null; 

export const renderAdminSection = (container) => {
    const currentRole = getCurrentRole();
    const authorizedRoles = ['admin', 'manager', 'cashier'];

    if (!authorizedRoles.includes(currentRole)) {
        container.innerHTML = `
            <div class="max-w-md mx-auto mt-20 animate-slide-in">
                <div class="ultra-modern-card p-8 text-center">
                    <div class="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
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
            window.dispatchEvent(new CustomEvent('show-admin-login'));
        });
        
        return;
    }

    const tabsConfig = {
        'dashboard-tab': { text: 'Dashboard', icon: '<svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 002-2V9a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'manager'] },
        'pos-tab': { text: 'POS', icon: '<svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2 2v5a2 2 0 002 2h5.586a1 1 0 00.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 00-2 2h-2a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'manager', 'cashier'] },
        'menu-tab': { text: 'Menyu', icon: '<svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>', roles: ['admin', 'manager'] },
        'categories-tab': { text: 'Kateqoriyalar', icon: '<svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a2 2 0 00-2 2h-2a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'manager'] },
        'discounts-tab': { text: 'Endirimlər', icon: '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a2 2 0 00-2 2h-2a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'manager'] },
        'tables-tab': { text: 'Masalar', icon: '<svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'manager'] },
        'sales-report-tab': { text: 'Hesabat', icon: '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 002-2V9a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'manager', 'cashier'] },
        'inventory-tab': { text: 'Anbar', icon: '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 016 0z"></path></svg>', roles: ['admin', 'manager'] },
        'purchases-tab': { text: 'Alışlar', icon: '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2 2v5a2 2 0 002 2h5.586a1 1 0 00.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 00-2 2h-2a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin'] },
        'recipes-tab': { text: 'Reseptlər', icon: '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2 2v5a2 2 0 002 2h5.586a1 1 0 00.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 00-2 2h-2a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'manager'] },
        'employees-tab': { text: 'İşçilər', icon: '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>', roles: ['admin'] },
        'customers-tab': { text: 'Müştərilər', icon: '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7l-4 4m0 0l-4-4m4 4V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>', roles: ['admin', 'manager'] },
        'cashier-tab': { text: 'Kassa', icon: '<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 002-2V9a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'cashier'] },
        'orders-tab': { text: 'Sifarişlər', icon: '<svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 002-2V9a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path></svg>', roles: ['admin', 'manager', 'cashier'] },
        'settings-tab': { text: 'Tənzimləmələr', icon: '<svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>', roles: ['admin'] }
    };

    const visibleTabs = Object.entries(tabsConfig)
        .filter(([tabId, config]) => config.roles.includes(currentRole));

    container.innerHTML = `
        <div class="max-w-7xl mx-auto animate-slide-in">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-10 space-y-4 lg:space-y-0">
                <div class="space-y-2">
                    <h1 class="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">İdarə Paneli</h1>
                    <p class="text-slate-600 text-sm sm:text-base">Sistem idarəetməsi və analitika</p>
                </div>
                <div class="flex overflow-x-auto space-x-3 sm:space-x-4 pb-2">
                    ${visibleTabs.map(([tabId, config], index) => `
                        <button id="${tabId}" class="admin-tab modern-tab px-8 py-5 sm:px-10 sm:py-6 rounded-xl font-semibold transition-all duration-300 text-lg sm:text-xl whitespace-nowrap flex-shrink-0 ${index === 0 ? 'active bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                            <span class="flex items-center space-x-3 sm:space-x-4">
                                <span class="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                                    ${config.icon}
                                </span>
                                <span>${config.text}</span>
                            </span>
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div id="dashboard-content" class="admin-content ${visibleTabs[0][0] !== 'dashboard-tab' ? 'hidden' : ''}">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-10">
                    <div id="analytics-cards" class="contents"></div>
                </div>
                
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                    <div class="ultra-modern-card p-4 sm:p-6 lg:p-8">
                        <div class="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <svg class="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 002-2V9a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg sm:text-xl font-bold text-slate-800">Populyar Məhsullar</h3>
                        </div>
                        <div id="popular-items" class="space-y-3"></div>
                    </div>
                    
                    <div class="ultra-modern-card p-4 sm:p-6 lg:p-8">
                        <div class="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                <svg class="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2 2v5a2 2 0 002 2h5.586a1 1 0 00.707.293l5.414 5.414a1 1 0 00.293.707V19a2 2 0 00-2 2h-2a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg sm:text-xl font-bold text-slate-800">Son Sifarişlər</h3>
                        </div>
                        <div id="recent-orders" class="space-y-3"></div>
                    </div>
                </div>
            </div>
            
            <div id="pos-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">POS Sistemi</h2>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 class="text-lg font-bold text-slate-700 mb-4">Məhsullar</h3>
                            <div id="pos-products" class="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                                <!-- POS products will be loaded here -->
                            </div>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-slate-700 mb-4">Sifariş</h3>
                            <div id="pos-cart" class="space-y-4">
                                <!-- POS cart will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="menu-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-slate-800">Menyu İdarəetməsi</h2>
                        <button id="add-product-btn" class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            <span class="flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                <span>Yeni Məhsul</span>
                            </span>
                        </button>
                    </div>
                    <div id="products-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- Products will be loaded here -->
                    </div>
                </div>
            </div>

            <div id="categories-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-slate-800">Kateqoriya İdarəetməsi</h2>
                        <button id="add-category-btn" class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            <span class="flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                <span>Yeni Kateqoriya</span>
                            </span>
                        </button>
                    </div>
                    <div id="categories-list" class="space-y-4">
                        <!-- Categories will be loaded here -->
                    </div>
                </div>
            </div>

            <div id="discounts-content" class="admin-content hidden">
                 <div class="ultra-modern-card p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-slate-800">Endirim İdarəetməsi</h2>
                        <button id="add-discount-btn" class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            <span class="flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                <span>Yeni Endirim</span>
                            </span>
                        </button>
                    </div>
                    <div id="discounts-list" class="space-y-4">
                        <!-- Discounts will be loaded here -->
                    </div>
                </div>
            </div>

            <div id="tables-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-slate-800">Masa İdarəetməsi</h2>
                        <button id="add-table-btn" class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            <span class="flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                <span>Yeni Masa</span>
                            </span>
                        </button>
                    </div>
                    <div id="tables-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- Tables will be loaded here -->
                    </div>
                </div>
            </div>

            <div id="sales-report-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">Satış Hesabatı</h2>
                    <div id="sales-overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <!-- Sales overview cards -->
                    </div>
                    <div id="detailed-sales-list" class="space-y-4">
                        <!-- Detailed sales list -->
                    </div>
                </div>
            </div>

            <div id="inventory-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-slate-800">Anbar İdarəetməsi</h2>
                        <button id="add-inventory-item-btn" class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            <span class="flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                <span>Yeni Anbar Məhsulu</span>
                            </span>
                        </button>
                    </div>
                    <div id="inventory-list" class="space-y-4">
                        <!-- Inventory items will be loaded here -->
                    </div>
                </div>
            </div>

            <div id="purchases-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-slate-800">Alışlar Jurnalı</h2>
                        <button id="add-purchase-btn" class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            <span class="flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                <span>Yeni Alış</span>
                            </span>
                        </button>
                    </div>
                    <div id="purchases-list" class="space-y-4">
                        <!-- Purchases will be loaded here -->
                    </div>
                </div>
            </div>

            <div id="recipes-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">Reseptlər İdarəetməsi</h2>
                    <p class="text-slate-600 text-center py-8">Bu hissə gələcək versiyalarda əlavə olunacaq və yeməklərin hazırlanma reseptlərini, inqrediyentlərini və təlimatlarını idarə etməyə imkan verəcək.</p>
                </div>
            </div>

            <div id="employees-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-slate-800">İşçilər İdarəetməsi</h2>
                        <button id="add-employee-btn" class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            <span class="flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                <span>Yeni İşçi</span>
                            </span>
                        </button>
                    </div>
                    <div id="employees-list" class="space-y-4">
                        <!-- Employees will be loaded here -->
                    </div>
                </div>
            </div>

            <div id="customers-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">Müştərilər</h2>
                    <p class="text-slate-600">Müştəri məlumatları sifarişlərə əsasən burada göstəriləcək.</p>
                </div>
            </div>

            <div id="cashier-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">Kassa</h2>
                    <div id="cashier-orders-list" class="space-y-4">
                        <!-- Orders ready for payment/serving -->
                    </div>
                </div>
            </div>

            <div id="orders-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">Sifarişlər</h2>
                    <div id="orders-list" class="space-y-4">
                        <!-- Orders will be loaded here -->
                    </div>
                </div>
            </div>

            <div id="settings-content" class="admin-content hidden">
                <div class="ultra-modern-card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">Tənzimləmələr</h2>
                    <div class="space-y-6">
                        <div class="p-4 bg-slate-50 rounded-xl">
                            <h3 class="text-lg font-bold text-slate-700 mb-2">Sistem Məlumatları</h3>
                            <p class="text-slate-600">Restoran İdarəetmə Sistemi v1.0.0</p>
                            <p class="text-slate-600">Hazırlayan: Rauf Bagirov</p>
                        </div>
                         <div class="p-4 bg-slate-50 rounded-xl">
                            <h3 class="text-lg font-bold text-slate-700 mb-2">Məlumat Bazası</h3>
                            <button id="reset-db-btn" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
                                Məlumat Bazası Sıfırla (Diqqətli olun!)
                            </button>
                            <p class="text-xs text-slate-500 mt-2">Bu əməliyyat bütün məhsul, sifariş və masa məlumatlarını siləcək.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const initializeAdminPanel = (container) => {
        const tabs = container.querySelectorAll('.admin-tab');
        const contents = container.querySelectorAll('.admin-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.classList.remove('active', 'bg-gradient-to-r', 'from-primary-500', 'to-primary-600', 'text-white', 'shadow-lg');
                    t.classList.add('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
                });
                
                tab.classList.add('active', 'bg-gradient-to-r', 'from-primary-500', 'to-primary-600', 'text-white', 'shadow-lg');
                tab.classList.remove('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
                
                contents.forEach(content => content.classList.add('hidden'));
                
                const tabId = tab.id;
                const contentId = tabId.replace('-tab', '-content');
                const content = container.querySelector(`#${contentId}`);
                if (content) {
                    content.classList.remove('hidden');
                    
                    switch(contentId) {
                        case 'dashboard-content': loadDashboardData(); break;
                        case 'menu-content': loadMenuContent(); break;
                        case 'pos-content': loadPOSContent(); break;
                        case 'discounts-content': loadDiscountsContent(); break;
                        case 'tables-content': loadTablesContent(); break;
                        case 'sales-report-content': loadSalesReportContent(); break;
                        case 'inventory-content': loadInventoryContent(); break;
                        case 'purchases-content': loadPurchasesContent(); break;
                        case 'recipes-content': loadRecipesContent(); break;
                        case 'employees-content': loadEmployeesContent(); break;
                        case 'customers-content': loadCustomersContent(); break;
                        case 'cashier-content': loadCashierContent(); break;
                        case 'orders-content': loadOrdersContent(); break;
                        case 'settings-content': loadSettingsContent(); break;
                        case 'categories-content': loadCategoriesContent(); break;
                    }
                }
            });
        });

        document.addEventListener('click', async (event) => {
            if (event.target.closest('.edit-product-btn')) {
                const productId = event.target.closest('.edit-product-btn').dataset.id;
                const products = await DataService.getProducts();
                const product = products.find(p => p.id === productId);
                if (product) showAddProductModal(product);
            } else if (event.target.closest('.delete-product-btn')) {
                const productId = event.target.closest('.delete-product-btn').dataset.id;
                if (confirm('Bu məhsulu silməyə əminsinizmi?')) {
                    const loading = NotificationService.showLoading('Məhsul silinir...');
                    const success = await DataService.deleteProduct(productId);
                    NotificationService.hideLoading(loading);
                    if (success) {
                        NotificationService.show('Məhsul uğurla silindi', 'success');
                        loadMenuContent();
                    } else {
                        NotificationService.show('Məhsul silinərkən xəta baş verdi', 'error');
                    }
                }
            } else if (event.target.closest('.qr-code-btn')) {
                const tableId = event.target.closest('.qr-code-btn').dataset.tableId;
                const tables = await DataService.getTables();
                const table = tables.find(t => t.id === tableId);
                if (table && table.qrCode) showQRCodeModal(table.qrCode, table.number);
            } else if (event.target.closest('.edit-table-btn')) {
                const tableId = event.target.closest('.edit-table-btn').dataset.tableId;
                const tables = await DataService.getTables();
                const table = tables.find(t => t.id === tableId);
                if (table) showAddTableModal(table);
            } else if (event.target.closest('.delete-table-btn')) {
                 const tableId = event.target.closest('.delete-table-btn').dataset.tableId;
                if (confirm('Bu masanı silməyə əminsinizmi?')) {
                    const loading = NotificationService.showLoading('Masa silinir...');
                    const success = await DataService.deleteTable(tableId);
                    NotificationService.hideLoading(loading);
                    if (success) {
                        NotificationService.show('Masa uğurla silindi', 'success');
                        loadTablesContent();
                    } else {
                        NotificationService.show('Masa silinərkən xəta baş verdi', 'error');
                    }
                }
            } else if (event.target.closest('.mark-as-paid-btn')) {
                const orderId = event.target.closest('.mark-as-paid-btn').dataset.orderId;
                handleMarkOrderAsPaid(orderId);
            } else if (event.target.closest('.edit-discount-btn')) {
                const discountId = event.target.closest('.edit-discount-btn').dataset.id;
                const discounts = await DataService.getDiscounts();
                const discount = discounts.find(d => d.id === discountId);
                if (discount) showAddDiscountModal(discount);
            } else if (event.target.closest('.delete-discount-btn')) {
                const discountId = event.target.closest('.delete-discount-btn').dataset.id;
                if (confirm('Bu endirimi silməyə əminsinizmi?')) {
                    const loading = NotificationService.showLoading('Endirim silinir...');
                    const success = await DataService.deleteDiscount(discountId);
                    NotificationService.hideLoading(loading);
                    if (success) {
                        NotificationService.show('Endirim uğurla silindi', 'success');
                        loadDiscountsContent();
                    } else {
                        NotificationService.show('Endirim silinərkən xəta baş verdi', 'error');
                    }
                }
            } else if (event.target.closest('.edit-inventory-item-btn')) {
                const itemId = event.target.closest('.edit-inventory-item-btn').dataset.id;
                const items = await DataService.getInventoryItems();
                const item = items.find(i => i.id === itemId);
                if (item) showAddInventoryItemModal(item);
            } else if (event.target.closest('.delete-inventory-item-btn')) {
                const itemId = event.target.closest('.delete-inventory-item-btn').dataset.id;
                if (confirm('Bu anbar məhsulunu silməyə əminsinizmi?')) {
                    const loading = NotificationService.showLoading('Məhsul silinir...');
                    const success = await DataService.deleteInventoryItem(itemId);
                    NotificationService.hideLoading(loading);
                    if (success) {
                        NotificationService.show('Anbar məhsulu uğurla silindi', 'success');
                        loadInventoryContent();
                    } else {
                        NotificationService.show('Anbar məhsulu silinərkən xəta baş verdi', 'error');
                    }
                }
            } else if (event.target.closest('.edit-purchase-btn')) {
                const purchaseId = event.target.closest('.edit-purchase-btn').dataset.id;
                const purchases = await DataService.getPurchases();
                const purchase = purchases.find(p => p.id === purchaseId);
                if (purchase) showAddPurchaseModal(purchase);
            } else if (event.target.closest('.delete-purchase-btn')) {
                const purchaseId = event.target.closest('.delete-purchase-btn').dataset.id;
                if (confirm('Bu alışı silməyə əminsinizmi?')) {
                    const loading = NotificationService.showLoading('Alış silinir...');
                    const success = await DataService.deletePurchase(purchaseId);
                    NotificationService.hideLoading(loading);
                    if (success) {
                        NotificationService.show('Alış uğurla silindi', 'success');
                        loadPurchasesContent();
                    } else {
                        NotificationService.show('Alış silinərkən xəta baş verdi', 'error');
                    }
                }
            } else if (event.target.closest('.edit-category-btn')) {
                const categoryId = event.target.closest('.edit-category-btn').dataset.id;
                const categories = await DataService.getCategories();
                const category = categories.find(c => c.id === categoryId);
                if (category) showAddCategoryModal(category);
            } else if (event.target.closest('.delete-category-btn')) {
                const categoryId = event.target.closest('.delete-category-btn').dataset.id;
                if (confirm('Bu kateqoriyanı silməyə əminsinizmi? Bu həm də bu kateqoriyaya aid bütün məhsulları silə bilər!')) {
                    const loading = NotificationService.showLoading('Kateqoriya silinir...');
                    const success = await DataService.deleteCategory(categoryId);
                    NotificationService.hideLoading(loading);
                    if (success) {
                        NotificationService.show('Kateqoriya uğurla silindi', 'success');
                        loadCategoriesContent(); // Reload categories
                        loadMenuContent(); // Also reload products as categories might change
                    } else {
                        NotificationService.show('Kateqoriya silinərkən xəta baş verdi', 'error');
                    }
                }
            }
        });
    };

    const loadDashboardData = async () => {
        try {
            const analytics = await DataService.getAnalytics();
            const analyticsCards = document.querySelector('#analytics-cards');
            const popularItemsDiv = document.querySelector('#popular-items');
            const recentOrdersDiv = document.querySelector('#recent-orders');
            
            if (analytics && analyticsCards) {
                analyticsCards.innerHTML = '';
                
                analyticsCards.appendChild(createAnalyticsCard('Ümumi Sifarişlər', analytics.totalOrders, '', 'blue'));
                analyticsCards.appendChild(createAnalyticsCard('Bugünkü Sifarişlər', analytics.todayOrders, '', 'green'));
                analyticsCards.appendChild(createAnalyticsCard('Ümumi Gəlir', `${analytics.totalRevenue.toFixed(2)} AZN`, '', 'purple'));
                analyticsCards.appendChild(createAnalyticsCard('Bugünkü Gəlir', `${analytics.todayRevenue.toFixed(2)} AZN`, '', 'orange'));
            }

            if (popularItemsDiv && analytics.popularItems) {
                popularItemsDiv.innerHTML = '';
                if (analytics.popularItems.length === 0) {
                    popularItemsDiv.innerHTML = '<p class="text-slate-500 text-center py-4">Populyar məhsul yoxdur.</p>';
                } else {
                    analytics.popularItems.forEach(item => {
                        popularItemsDiv.appendChild(createElement('div', { className: 'flex justify-between items-center p-3 bg-slate-50 rounded-xl' }, [
                            createElement('span', { className: 'font-semibold text-slate-700' }, [item.name]),
                            createElement('span', { className: 'bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-bold' }, [`${item.count} ədəd`])
                        ]));
                    });
                }
            }

            if (recentOrdersDiv) {
                const orders = await DataService.getOrders();
                const recentOrders = orders.slice(0, 5); 
                recentOrdersDiv.innerHTML = '';
                if (recentOrders.length === 0) {
                    recentOrdersDiv.innerHTML = '<p class="text-slate-500 text-center py-4">Son sifariş yoxdur.</p>';
                } else {
                    recentOrders.forEach(order => {
                        recentOrdersDiv.appendChild(createElement('div', { className: 'flex justify-between items-center p-3 bg-slate-50 rounded-xl' }, [
                            createElement('span', { className: 'font-semibold text-slate-700' }, [`Masa ${order.tableNumber} - ${order.items.length} məhsul`]),
                            createElement('span', { className: `px-2 py-1 rounded-full text-xs font-semibold ${StatusUtils.getStatusColor(order.status)}` }, [StatusUtils.getStatusText(order.status)])
                        ]));
                    });
                }
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            NotificationService.show('Dashboard məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadMenuContent = async () => {
        try {
            const products = await DataService.getProducts();
            const productsList = document.querySelector('#products-list');
            
            if (productsList) {
                productsList.innerHTML = '';
                if (products.length === 0) {
                    productsList.innerHTML = '<p class="text-slate-500 text-center py-8">Menyuda məhsul yoxdur.</p>';
                }
                products.forEach(product => {
                    const productCard = createProductCard(product, false);
                    productCard.classList.add('admin-product-card');
                    
                    const adminActions = createElement('div', { className: 'mt-4 flex space-x-2' });
                    adminActions.appendChild(createElement('button', { 
                        className: 'edit-product-btn flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors', 
                        dataset: { id: product.id } 
                    }, ['Redaktə']));
                    adminActions.appendChild(createElement('button', { 
                        className: 'delete-product-btn flex-1 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors', 
                        dataset: { id: product.id } 
                    }, ['Sil']));
                    
                    productCard.appendChild(adminActions);
                    productsList.appendChild(productCard);
                });
            }
            
            const addProductBtn = document.querySelector('#add-product-btn');
            if (addProductBtn) {
                addProductBtn.onclick = () => showAddProductModal(); 
            }
            
        } catch (error) {
            console.error('Error loading menu content:', error);
            NotificationService.show('Menyu məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadPOSContent = async () => {
        try {
            const products = await DataService.getProducts();
            const posProducts = document.querySelector('#pos-products');
            
            if (posProducts) {
                posProducts.innerHTML = '';
                if (products.length === 0) {
                    posProducts.innerHTML = '<p class="text-slate-500 text-center py-8">Məhsul yoxdur.</p>';
                }
                products.forEach(product => {
                    const productBtn = createElement('button', {
                        className: 'pos-product-btn p-3 bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center',
                        dataset: { productId: product.id }
                    });
                    
                    productBtn.innerHTML = `
                        <img src="${product.imageUrl}" alt="${product.name}" class="w-20 h-20 object-cover rounded-lg mb-2">
                        <p class="font-semibold text-sm text-slate-800 line-clamp-1">${product.name}</p>
                        <p class="text-primary-600 font-bold text-sm">${product.price.toFixed(2)} AZN</p>
                    `;
                    
                    productBtn.onclick = () => { 
                        adminCartService.addItem(product, 1);
                        NotificationService.show(`${product.name} əlavə edildi`, 'success');
                        updatePOSCart();

                        // Add a visual feedback for button click
                        productBtn.classList.add('scale-105', 'ring-2', 'ring-primary-500', 'ring-opacity-50');
                        setTimeout(() => {
                            productBtn.classList.remove('scale-105', 'ring-2', 'ring-primary-500', 'ring-opacity-50');
                        }, 300);
                    };
                    
                    posProducts.appendChild(productBtn);
                });
            }
            
            adminCartService.subscribe(updatePOSCart); 
            updatePOSCart();
        } catch (error) {
            console.error('Error loading POS content:', error);
            NotificationService.show('POS məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const updatePOSCart = () => {
        const posCart = document.querySelector('#pos-cart');
        if (!posCart) return;
        
        const cartItems = adminCartService.getItems();
        const total = adminCartService.getTotal();
        
        posCart.innerHTML = `
            <div class="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                ${cartItems.length === 0 ? '<p class="text-slate-500 text-center py-8">Səbət boşdur</p>' : ''}
                ${cartItems.map((item, index) => `
                    <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                            <p class="font-semibold">${item.name}</p>
                            <p class="text-sm text-slate-500">×${item.quantity}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="font-bold">${(item.priceAtOrder * item.quantity).toFixed(2)} AZN</span>
                            <button class="remove-pos-item w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center" data-index="${index}">
                                 <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="border-t border-slate-200 pt-4">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-bold">Ümumi:</span>
                    <span class="text-xl font-bold text-primary-600">
                        ${total.toFixed(2)} AZN
                    </span>
                </div>
                <input type="number" id="pos-table-number" placeholder="Masa nömrəsi" class="w-full px-4 py-3 ultra-modern-input rounded-xl mb-4" min="1">
                <button id="pos-checkout-btn" class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold ${cartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${cartItems.length === 0 ? 'disabled' : ''}>
                    Sifariş Ver
                </button>
            </div>
        `;
        
        posCart.querySelectorAll('.remove-pos-item').forEach(btn => {
            btn.onclick = () => { 
                const index = parseInt(btn.dataset.index);
                adminCartService.removeItem(index);
            };
        });
        
        const checkoutBtn = posCart.querySelector('#pos-checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.onclick = async () => { 
                const tableNumberInput = document.querySelector('#pos-table-number');
                const tableNumber = parseInt(tableNumberInput.value);
                if (!tableNumber || tableNumber <= 0) {
                    NotificationService.show('Zəhmət olmasa düzgün masa nömrəsi daxil edin.', 'error');
                    return;
                }
                
                const order = {
                    tableNumber: tableNumber,
                    items: cartItems.map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        priceAtOrder: item.priceAtOrder
                    })),
                    status: 'pending', 
                    timestamp: new Date().toISOString(),
                    orderSource: 'pos'
                };
                
                checkoutBtn.disabled = true;
                const originalBtnContent = checkoutBtn.innerHTML;
                checkoutBtn.innerHTML = `
                    <span class="flex items-center justify-center space-x-2">
                        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Göndərilir...</span>
                    </span>
                `;

                try {
                    const result = await DataService.addOrder(order); 
                    if (result) {
                        adminCartService.clear();
                        tableNumberInput.value = '';
                        NotificationService.show(`Masa ${tableNumber} üçün sifariş uğurla əlavə edildi!`, 'success');
                    } else {
                        NotificationService.show('Sifariş əlavə edilərkən xəta baş verdi', 'error');
                    }
                } catch (error) {
                    console.error('Error adding POS order:', error);
                    NotificationService.show('Sifariş əlavə edilərkən xəta baş verdi.', 'error');
                } finally {
                    checkoutBtn.disabled = false;
                    checkoutBtn.innerHTML = originalBtnContent;
                }
            };
        }
    };

    const loadDiscountsContent = async () => {
        try {
            const discounts = await DataService.getDiscounts(); 
            const discountsList = document.querySelector('#discounts-list');
            
            if (discountsList) {
                discountsList.innerHTML = '';
                if (discounts.length === 0) {
                    discountsList.innerHTML = '<p class="text-slate-500 text-center py-8">Heç bir endirim yoxdur.</p>';
                }
                discounts.forEach(discount => {
                    const discountCard = createElement('div', {
                        className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                    });
                    discountCard.innerHTML = `
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-bold text-slate-800">${discount.name}</h3>
                                <p class="text-slate-600">${discount.percentage}% Endirim</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">${discount.isActive ? 'Aktiv' : 'Passiv'}</span>
                        </div>
                        <p class="text-sm text-slate-500 mb-4">${discount.description}</p>
                        <div class="flex space-x-2">
                            <button class="edit-discount-btn flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl" data-id="${discount.id}">Redaktə</button>
                            <button class="delete-discount-btn flex-1 bg-red-500 text-white px-4 py-2 rounded-xl" data-id="${discount.id}">Sil</button>
                        </div>
                    `;
                    discountsList.appendChild(discountCard);
                });
            }

            const addDiscountBtn = document.querySelector('#add-discount-btn');
            if (addDiscountBtn) {
                addDiscountBtn.onclick = () => showAddDiscountModal();
            }
        } catch (error) {
            console.error('Error loading discounts content:', error);
            NotificationService.show('Endirim məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadTablesContent = async () => {
        try {
            const tables = await DataService.getTables(); 
            const tablesList = document.querySelector('#tables-list');
            
            if (tablesList) {
                tablesList.innerHTML = '';
                if (tables.length === 0) {
                    tablesList.innerHTML = '<p class="text-slate-500 text-center py-8">Heç bir masa əlavə edilməyib.</p>';
                }
                tables.forEach(table => {
                    const tableCard = createTableCard(table);
                    tableCard.querySelector('.qr-code-btn').onclick = () => showQRCodeModal(table.qrCode, table.number);
                    tableCard.querySelector('.edit-table-btn').onclick = () => showAddTableModal(table);
                    const deleteBtn = createElement('button', {
                        className: 'flex-1 bg-red-500 text-white px-3 py-2 rounded-md text-sm hover:bg-red-600 transition delete-table-btn',
                        dataset: { tableId: table.id }
                    }, ['Sil']);
                    tableCard.querySelector('.flex.space-x-2').appendChild(deleteBtn);
                    
                    tablesList.appendChild(tableCard);
                });
            }

            const addTableBtn = document.querySelector('#add-table-btn');
            if (addTableBtn) {
                addTableBtn.onclick = () => showAddTableModal();
            }
        } catch (error) {
            console.error('Error loading tables content:', error);
            NotificationService.show('Masa məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadSalesReportContent = async () => {
        try {
            const analytics = await DataService.getAnalytics(); 
            const salesOverview = document.querySelector('#sales-overview');
            const detailedSalesList = document.querySelector('#detailed-sales-list');

            if (salesOverview && analytics) {
                salesOverview.innerHTML = '';
                salesOverview.appendChild(createAnalyticsCard('Ümumi Gəlir', `${analytics.totalRevenue.toFixed(2)} AZN`, '', 'purple'));
                salesOverview.appendChild(createAnalyticsCard('Bugünkü Gəlir', `${analytics.todayRevenue.toFixed(2)} AZN`, '', 'orange'));
                salesOverview.appendChild(createAnalyticsCard('Ümumi Sifarişlər', analytics.totalOrders, '', 'blue'));
            }

            if (detailedSalesList) {
                const purchases = await DataService.getPurchases(); 
                detailedSalesList.innerHTML = '';
                if (purchases.length === 0) {
                    detailedSalesList.innerHTML = '<p class="text-slate-500 text-center py-8">Heç bir satış hesabatı yoxdur.</p>';
                } else {
                    purchases.forEach(purchase => {
                        const purchaseCard = createElement('div', {
                            className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                        });
                        purchaseCard.innerHTML = `
                            <h3 class="text-lg font-bold text-slate-800">Satış ID: #${purchase.id.substring(0,8)}</h3>
                            <p class="text-slate-600">Məbləğ: ${purchase.amount.toFixed(2)} AZN</p>
                            <p class="text-sm text-slate-500">Tarix: ${new Date(purchase.createdAt.seconds * 1000).toLocaleString()}</p>
                            <p class="text-sm text-slate-500">Qeydlər: ${purchase.notes || 'Yoxdur'}</p>
                        `;
                        detailedSalesList.appendChild(purchaseCard);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading sales report content:', error);
            NotificationService.show('Satış hesabatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadInventoryContent = async () => {
        try {
            const inventoryItems = await DataService.getInventoryItems(); 
            const inventoryList = document.querySelector('#inventory-list');
            
            if (inventoryList) {
                inventoryList.innerHTML = '';
                if (inventoryItems.length === 0) {
                    inventoryList.innerHTML = '<p class="text-slate-500 text-center py-8">Anbar boşdur.</p>';
                }
                inventoryItems.forEach(item => {
                    const itemCard = createElement('div', {
                        className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                    });
                    itemCard.innerHTML = `
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-bold text-slate-800">${item.name}</h3>
                                <p class="text-slate-600">Miqdar: ${item.quantity} ${item.unit}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm font-semibold ${item.quantity < item.lowStockThreshold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                ${item.quantity < item.lowStockThreshold ? 'Az qalıb' : 'Normal'}
                            </span>
                        </div>
                        <p class="text-sm text-slate-500 mb-4">Son yenilənmə: ${new Date(item.updatedAt.seconds * 1000).toLocaleString()}</p>
                        <div class="flex space-x-2">
                            <button class="edit-inventory-item-btn flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl" data-id="${item.id}">Redaktə</button>
                            <button class="delete-inventory-item-btn flex-1 bg-red-500 text-white px-4 py-2 rounded-xl" data-id="${item.id}">Sil</button>
                        </div>
                    `;
                    inventoryList.appendChild(itemCard);
                });
            }

            const addInventoryItemBtn = document.querySelector('#add-inventory-item-btn');
            if (addInventoryItemBtn) {
                addInventoryItemBtn.onclick = () => showAddInventoryItemModal();
            }
        } catch (error) {
            console.error('Error loading inventory content:', error);
            NotificationService.show('Anbar məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadPurchasesContent = async () => {
        try {
            const purchases = await DataService.getPurchases(); 
            const purchasesList = document.querySelector('#purchases-list');
            
            if (purchasesList) {
                purchasesList.innerHTML = '';
                if (purchases.length === 0) {
                    purchasesList.innerHTML = '<p class="text-slate-500 text-center py-8">Heç bir alış qeyd edilməyib.</p>';
                }
                purchases.forEach(purchase => {
                    const purchaseCard = createElement('div', {
                        className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                    });
                    purchaseCard.innerHTML = `
                        <h3 class="text-lg font-bold text-slate-800">Alış ID: #${purchase.id.substring(0,8)}</h3>
                        <p class="text-slate-600">Məbləğ: ${purchase.amount.toFixed(2)} AZN</p>
                        <p class="text-sm text-slate-500">Tarix: ${new Date(purchase.createdAt.seconds * 1000).toLocaleString()}</p>
                        <p class="text-sm text-slate-500">Təchizatçı: ${purchase.supplier || 'Qeyd olunmayıb'}</p>
                        <p class="text-sm text-slate-500">Qeydlər: ${purchase.notes || 'Yoxdur'}</p>
                        <div class="flex space-x-2 mt-4">
                            <button class="edit-purchase-btn flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl" data-id="${purchase.id}">Redaktə</button>
                            <button class="delete-purchase-btn flex-1 bg-red-500 text-white px-4 py-2 rounded-xl" data-id="${purchase.id}">Sil</button>
                        </div>
                    `;
                    purchasesList.appendChild(purchaseCard);
                });
            }

            const addPurchaseBtn = document.querySelector('#add-purchase-btn');
            if (addPurchaseBtn) {
                addPurchaseBtn.onclick = () => showAddPurchaseModal();
            }
        } catch (error) {
            console.error('Error loading purchases content:', error);
            NotificationService.show('Alış məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadRecipesContent = () => {
        const recipesContent = document.querySelector('#recipes-content');
        if (recipesContent) {
            recipesContent.innerHTML = `
                <div class="ultra-modern-card p-6">
                    <h2 class="text-2xl font-bold text-slate-800 mb-6">Reseptlər İdarəetməsi</h2>
                    <p class="text-slate-600 text-center py-8">Bu hissə gələcək versiyalarda əlavə olunacaq və yeməklərin hazırlanma reseptlərini, inqrediyentlərini və təlimatlarını idarə etməyə imkan verəcək.</p>
                </div>
            `;
        }
    };

    const loadEmployeesContent = async () => {
        try {
            const employeesList = document.querySelector('#employees-list');
            employeesList.innerHTML = `
                <div class="p-4 bg-yellow-50 text-yellow-800 rounded-xl mb-6">
                    <p class="font-semibold">Qeyd: Demo versiyasında istifadəçi idarəetməsi məhduddur.</p>
                    <p class="text-sm">Əsl tətbiqlərdə bu hissə Firebasenin Server SDK-sı və ya digər backend ilə idarə olunmalıdır.</p>
                </div>
            `;
            
            const demoUsers = [
                { email: 'waiter@restaurant.com', role: 'Ofisant' },
                { email: 'cashier@restaurant.com', role: 'Kassir' },
                { email: 'manager@restaurant.com', role: 'Menecer' },
                { email: 'admin@restaurant.com', role: 'Admin' },
                { email: 'r.bagrv1@gmail.com', role: 'Admin' }, 
            ];

            if (employeesList) {
                if (demoUsers.length === 0) {
                    employeesList.innerHTML += '<p class="text-slate-500 text-center py-8">Heç bir işçi qeyd edilməyib.</p>';
                }
                demoUsers.forEach(user => {
                    const userCard = createElement('div', {
                        className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                    });
                    userCard.innerHTML = `
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-bold text-slate-800">${user.email}</h3>
                                <p class="text-slate-600">Rol: ${user.role}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-800">Aktiv</span>
                        </div>
                    `;
                    employeesList.appendChild(userCard);
                });
            }

            const addEmployeeBtn = document.querySelector('#add-employee-btn');
            if (addEmployeeBtn) {
                addEmployeeBtn.onclick = () => showAddEmployeeModal();
            }
        } catch (error) {
            console.error('Error loading employees content:', error);
            NotificationService.show('İşçi məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadCustomersContent = async () => {
        try {
            const orders = await DataService.getOrders(); 
            const customersList = document.querySelector('#customers-content'); 

            const customerMap = {};
            orders.forEach(order => {
                const tableNumber = order.tableNumber;
                if (!customerMap[tableNumber]) {
                    customerMap[tableNumber] = {
                        totalOrders: 0,
                        lastOrderDate: null,
                        totalSpent: 0
                    };
                }
                customerMap[tableNumber].totalOrders++;
                const orderDate = new Date(order.createdAt.seconds * 1000);
                if (!customerMap[tableNumber].lastOrderDate || orderDate > customerMap[tableNumber].lastOrderDate) {
                    customerMap[tableNumber].lastOrderDate = orderDate;
                }
                customerMap[tableNumber].totalSpent += order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
            });

            const customerCards = Object.entries(customerMap).map(([tableNumber, data]) => {
                return createElement('div', {
                    className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                }, [
                    createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-2' }, [`Masa ${tableNumber}`]),
                    createElement('p', { className: 'text-slate-600' }, [`Ümumi Sifarişlər: ${data.totalOrders}`]),
                    createElement('p', { className: 'text-slate-600' }, [`Ümumi Xərc: ${data.totalSpent.toFixed(2)} AZN`]),
                    createElement('p', { className: 'text-sm text-slate-500' }, [`Son Sifariş: ${data.lastOrderDate.toLocaleString()}`])
                ]);
            });
            
            const contentDiv = createElement('div', { className: 'ultra-modern-card p-6' });
            contentDiv.innerHTML = `
                <h2 class="text-2xl font-bold text-slate-800 mb-6">Müştərilər</h2>
                <div id="customers-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Customer cards -->
                </div>
            `;
            customersList.innerHTML = '';
            customersList.appendChild(contentDiv);
            const customersListContainer = customersList.querySelector('#customers-list-container');

            if (customerCards.length === 0) {
                customersListContainer.innerHTML = '<p class="text-slate-500 text-center py-8">Heç bir müştəri sifariş verməyib.</p>';
            } else {
                customerCards.forEach(card => customersListContainer.appendChild(card));
            }

        } catch (error) {
            console.error('Error loading customers content:', error);
            NotificationService.show('Müştəri məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadCashierContent = async () => {
        try {
            const orders = await DataService.getOrders(); 
            const cashierOrdersList = document.querySelector('#cashier-orders-list');
            
            const payableOrders = orders.filter(order => order.status === 'ready' || order.status === 'served');
            
            if (cashierOrdersList) {
                cashierOrdersList.innerHTML = '';
                if (payableOrders.length === 0) {
                    cashierOrdersList.innerHTML = '<p class="text-slate-500 text-center py-8">Ödəniş gözləyən sifariş yoxdur.</p>';
                }
                payableOrders.forEach(order => {
                    const orderCard = createElement('div', {
                        className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                    });
                    orderCard.innerHTML = `
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-bold text-slate-800">Sifariş #${order.id.substring(0, 8)}</h3>
                                <p class="text-slate-600">Masa: ${order.tableNumber}</p>
                                <p class="text-sm text-slate-500">${new Date(order.createdAt.seconds * 1000).toLocaleString()}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm font-semibold ${StatusUtils.getStatusColor(order.status)}">
                                ${StatusUtils.getStatusText(order.status)}
                            </span>
                        </div>
                        <div class="space-y-2 mb-4">
                            ${order.items.map(item => `
                                <div class="flex justify-between">
                                    <span>${item.name} x${item.quantity}</span>
                                    <span>${(item.priceAtOrder * item.quantity).toFixed(2)} AZN</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="border-t pt-4">
                            <div class="flex justify-between items-center">
                                <span class="text-lg font-bold">Ümumi:</span>
                                <span class="text-xl font-bold text-primary-600">
                                    ${order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)} AZN
                                </span>
                            </div>
                            <button class="mark-as-paid-btn w-full premium-gradient-btn mt-4 text-white px-6 py-3 rounded-xl font-semibold" data-order-id="${order.id}" data-total-amount="${order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)}">
                                Ödənildi olaraq qeyd et
                            </button>
                        </div>
                    `;
                    cashierOrdersList.appendChild(orderCard);
                });
            }
        } catch (error) {
            console.error('Error loading cashier content:', error);
            NotificationService.show('Kassa sifarişləri yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const handleMarkOrderAsPaid = async (orderId) => {
        const loading = NotificationService.showLoading('Ödəniş qeyd edilir...');
        try {
            const success = await DataService.updateOrder(orderId, 'paid'); 
            if (success) {
                const orders = await DataService.getOrders(); 
                const paidOrder = orders.find(o => o.id === orderId);

                if (paidOrder) {
                    const purchaseData = {
                        orderId: paidOrder.id,
                        tableNumber: paidOrder.tableNumber,
                        amount: paidOrder.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0),
                        items: paidOrder.items.map(item => ({ name: item.name, quantity: item.quantity })),
                        paymentMethod: 'cash', 
                        notes: `Masa ${paidOrder.tableNumber} sifarişi üçün ödəniş`
                    };
                    await DataService.addPurchase(purchaseData); 
                    NotificationService.show(`Sifariş #${paidOrder.id.substring(0,8)} ödəndi!`, 'success');
                } else {
                     NotificationService.show('Sifariş tapılmadı, lakin status yeniləndi.', 'warning');
                }
                loadCashierContent(); 
            } else {
                NotificationService.show('Ödəniş qeyd edilərkən xəta baş verdi.', 'error');
            }
        } catch (error) {
            console.error('Error marking order as paid:', error);
            NotificationService.show('Ödəniş qeyd edilərkən xəta baş verdi.', 'error');
        } finally {
            NotificationService.hideLoading(loading);
        }
    };

    const loadOrdersContent = async () => {
        try {
            const orders = await DataService.getOrders(); 
            const ordersList = document.querySelector('#orders-list');
            
            if (ordersList) {
                ordersList.innerHTML = '';
                if (orders.length === 0) {
                    ordersList.innerHTML = '<p class="text-slate-500 text-center py-8">Heç bir sifariş yoxdur.</p>';
                }
                orders.forEach(order => {
                    const orderCard = createElement('div', {
                        className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                    });
                    
                    orderCard.innerHTML = `
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-bold text-slate-800">Sifariş #${order.id.substring(0, 8)}</h3>
                                <p class="text-slate-600">Masa: ${order.tableNumber}</p>
                                <p class="text-sm text-slate-500">${new Date(order.createdAt.seconds * 1000).toLocaleString()}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm font-semibold ${StatusUtils.getStatusColor(order.status)}">
                                ${StatusUtils.getStatusText(order.status)}
                            </span>
                        </div>
                        <div class="space-y-2 mb-4">
                            ${order.items.map(item => `
                                <div class="flex justify-between">
                                    <span>${item.name} x${item.quantity}</span>
                                    <span>${(item.priceAtOrder * item.quantity).toFixed(2)} AZN</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="border-t pt-4">
                            <div class="flex justify-between items-center">
                                <span class="text-lg font-bold">Ümumi:</span>
                                <span class="text-xl font-bold text-primary-600">
                                    ${order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)} AZN
                                </span>
                            </div>
                        </div>
                    `;
                    
                    ordersList.appendChild(orderCard);
                });
            }
        } catch (error) {
            console.error('Error loading orders content:', error);
            NotificationService.show('Sifariş məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const loadSettingsContent = async () => {
        const resetDbBtn = document.querySelector('#reset-db-btn');
        if (resetDbBtn) {
            resetDbBtn.onclick = async () => {
                if (confirm('Bütün məlumat bazasını sıfırlamağa əminsiniz? Bu əməliyyat geri qaytarıla bilməz!')) {
                    if (confirm('Son xəbərdarlıq: Bütün məlumatlar silinəcək. Davam etmək istəyirsinizmi?')) {
                        const loading = NotificationService.showLoading('Məlumat bazası sıfırlanır...');
                        try {
                            await DataService.resetDatabase(); 
                            NotificationService.show('Məlumat bazası uğurla sıfırlandı.', 'success');
                            loadDashboardData();
                            loadMenuContent();
                            loadTablesContent();
                            loadOrdersContent();
                            loadPurchasesContent();
                            loadInventoryContent();
                            loadDiscountsContent();
                            loadCashierContent();
                        } catch (error) {
                            console.error('Database reset failed:', error);
                            NotificationService.show('Məlumat bazası sıfırlanarkən xəta baş verdi.', 'error');
                        } finally {
                            NotificationService.hideLoading(loading);
                        }
                    }
                }
            };
        }
    };

    const showModal = (content, title, closeCallback = () => {}) => {
        if (currentModal) {
            document.body.removeChild(currentModal);
            currentModal = null;
        }

        const modal = createElement('div', {
            className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-8 overflow-y-auto'
        });
        
        const modalContentWrapper = createElement('div', {
            className: 'ultra-modern-card p-8 max-w-2xl w-full mx-auto'
        });

        const header = createElement('div', { className: 'flex justify-between items-center mb-6' });
        header.appendChild(createElement('h2', { className: 'text-2xl font-bold text-slate-800' }, [title]));
        const closeBtn = createElement('button', { 
            className: 'w-8 h-8 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center' 
        });
        closeBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        `;
        header.appendChild(closeBtn);
        modalContentWrapper.appendChild(header);
        modalContentWrapper.appendChild(content);
        modal.appendChild(modalContentWrapper);
        
        document.body.appendChild(modal);
        currentModal = modal;

        closeBtn.onclick = () => {
            document.body.removeChild(modal);
            currentModal = null;
            closeCallback();
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                currentModal = null;
            }
        };
    };

    const showAddProductModal = async (product = null) => {
        const categories = await DataService.getCategories(); 
        const form = createAdminProductForm(product, categories);

        showModal(form, product ? 'Məhsulu Redaktə Et' : 'Yeni Məhsul Əlavə Et', loadMenuContent);
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
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
            
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="flex items-center justify-center space-x-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Yadda saxlanılır...</span></span>`;

            try {
                let result;
                if (product) {
                    result = await DataService.updateProduct(product.id, productData); 
                } else {
                    result = await DataService.addProduct(productData); 
                }

                if (result) {
                    NotificationService.show(`Məhsul uğurla ${product ? 'yeniləndi' : 'əlavə edildi'}`, 'success');
                    if (currentModal) {
                        document.body.removeChild(currentModal);
                        currentModal = null;
                    }
                    loadMenuContent();
                } else {
                    NotificationService.show(`Məhsul ${product ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi`, 'error');
                }
            } catch (error) {
                console.error('Product save error:', error);
                NotificationService.show('Məhsul əməliyyatı zamanı xəta baş verdi.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = product ? '<span class="flex items-center justify-center space-x-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><span>Yenilə</span></span>' : '<span class="flex items-center justify-center space-x-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><span>Əlavə et</span></span>';
            }
        };
    };

    const showAddDiscountModal = async (discount = null) => {
        const form = createDiscountForm(discount); 

        showModal(form, discount ? 'Endirimi Redaktə Et' : 'Yeni Endirim Əlavə Et', loadDiscountsContent);

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const discountData = {
                name: formData.get('name'),
                description: formData.get('description'),
                percentage: parseFloat(formData.get('percentage')),
                isActive: formData.has('isActive')
            };
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="flex items-center justify-center space-x-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Yadda saxlanılır...</span></span>`;

            try {
                let result;
                if (discount) {
                    result = await DataService.updateDiscount(discount.id, discountData); 
                } else {
                    result = await DataService.addDiscount(discountData); 
                }

                if (result) {
                    NotificationService.show(`Endirim uğurla ${discount ? 'yeniləndi' : 'əlavə edildi'}`, 'success');
                    if (currentModal) {
                        document.body.removeChild(currentModal);
                        currentModal = null;
                    }
                    loadDiscountsContent();
                } else {
                    NotificationService.show(`Endirim ${discount ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi`, 'error');
                }
            } catch (error) {
                console.error('Discount save error:', error);
                NotificationService.show('Endirim əməliyyatı zamanı xəta baş verdi.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = discount ? 'Endirimi Yenilə' : 'Endirim Əlavə Et';
            }
        };
    };

    const showAddTableModal = async (table = null) => {
        const form = createTableForm(table); 

        showModal(form, table ? 'Masayı Redaktə Et' : 'Yeni Masa Əlavə Et', loadTablesContent);

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const tableData = {
                number: parseInt(formData.get('number')),
                capacity: parseInt(formData.get('capacity')),
                isOccupied: formData.has('isOccupied')
            };
            
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="flex items-center justify-center space-x-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Yadda saxlanılır...</span></span>`;

            try {
                let result;
                if (table) {
                    result = await DataService.updateTable(table.id, tableData); 
                } else {
                    result = await DataService.addTable(tableData); 
                }

                if (result) {
                    NotificationService.show(`Masa uğurla ${table ? 'yeniləndi' : 'əlavə edildi'}`, 'success');
                    if (currentModal) {
                        document.body.removeChild(currentModal);
                        currentModal = null;
                    }
                    loadTablesContent();
                } else {
                    NotificationService.show(`Masa ${table ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi`, 'error');
                }
            } catch (error) {
                console.error('Table save error:', error);
                NotificationService.show('Masa əməliyyatı zamanı xəta baş verdi.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = table ? 'Masayı Yenilə' : 'Masa Əlavə Et';
            }
        };
    };

    const showQRCodeModal = (qrCodeUrl, tableNumber) => {
        const qrCodeDiv = createElement('div', { className: 'flex flex-col items-center p-4' });
        qrCodeDiv.innerHTML = `
            <h3 class="text-xl font-bold text-slate-800 mb-4">Masa ${tableNumber} üçün QR Kod</h3>
            <div id="qrcode-canvas" class="p-4 bg-white rounded-lg shadow-md mb-4"></div>
            <p class="text-slate-600 text-sm mb-4">Müştərilərinizin bu masada sifariş verməsi üçün kodu skan etməsini xahiş edin.</p>
            <a href="${qrCodeUrl}" target="_blank" class="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors">QR Kodu Aç</a>
        `;

        showModal(qrCodeDiv, `Masa ${tableNumber} QR Kodu`);

        // Ensure QRCode object exists before using it
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrCodeDiv.querySelector('#qrcode-canvas'), {
                text: qrCodeUrl,
                width: 256,
                height: 256,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        } else {
            console.error("QRCode library not loaded.");
            NotificationService.show('QR kod generatoru yüklənmədi. Zəhmət olmasa səhifəni yeniləyin.', 'error');
            qrCodeDiv.querySelector('#qrcode-canvas').innerHTML = '<p class="text-red-500">QR kodu yüklənmədi.</p>';
        }
    };

    const showAddInventoryItemModal = async (item = null) => {
        const form = createInventoryItemForm(item); 

        showModal(form, item ? 'Anbar Məhsulunu Redaktə Et' : 'Yeni Anbar Məhsulu Əlavə Et', loadInventoryContent);

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const itemData = {
                name: formData.get('name'),
                quantity: parseFloat(formData.get('quantity')),
                unit: formData.get('unit'),
                lowStockThreshold: parseFloat(formData.get('lowStockThreshold')) || 0,
                lastUpdated: new Date() 
            };
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="flex items-center justify-center space-x-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Yadda saxlanılır...</span></span>`;

            try {
                let result;
                if (item) {
                    result = await DataService.updateInventoryItem(item.id, itemData); 
                } else {
                    result = await DataService.addInventoryItem(itemData); 
                }

                if (result) {
                    NotificationService.show(`Anbar məhsulu uğurla ${item ? 'yeniləndi' : 'əlavə edildi'}`, 'success');
                    if (currentModal) {
                        document.body.removeChild(currentModal);
                        currentModal = null;
                    }
                    loadInventoryContent();
                } else {
                    NotificationService.show(`Anbar məhsulu ${item ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi`, 'error');
                }
            } catch (error) {
                console.error('Inventory item save error:', error);
                NotificationService.show('Anbar məhsulu əməliyyatı zamanı xəta baş verdi.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = item ? 'Məhsulu Yenilə' : 'Məhsul Əlavə Et';
            }
        };
    };

    const showAddPurchaseModal = async (purchase = null) => {
        const form = createPurchaseForm(purchase); 

        showModal(form, purchase ? 'Alışı Redaktə Et' : 'Yeni Alış Qeyd Et', loadPurchasesContent);

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const purchaseData = {
                itemName: formData.get('itemName'),
                quantity: parseFloat(formData.get('quantity')),
                unitCost: parseFloat(formData.get('unitCost')),
                amount: parseFloat(formData.get('quantity')) * parseFloat(formData.get('unitCost')),
                supplier: formData.get('supplier'),
                notes: formData.get('notes')
            };
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="flex items-center justify-center space-x-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Yadda saxlanılır...</span></span>`;

            try {
                let result;
                if (purchase) {
                    result = await DataService.updatePurchase(purchase.id, purchaseData); 
                } else {
                    result = await DataService.addPurchase(purchaseData); 
                }

                if (result) {
                    NotificationService.show(`Alış uğurla ${purchase ? 'yeniləndi' : 'əlavə edildi'}`, 'success');
                    if (currentModal) {
                        document.body.removeChild(currentModal);
                        currentModal = null;
                    }
                    loadPurchasesContent();
                } else {
                    NotificationService.show(`Alış ${purchase ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi`, 'error');
                }
            } catch (error) {
                console.error('Purchase save error:', error);
                NotificationService.show('Alış əməliyyatı zamanı xəta baş verdi.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = purchase ? 'Alışı Yenilə' : 'Alış Əlavə Et';
            }
        };
    };

    const showAddEmployeeModal = async (employee = null) => {
        const form = createEmployeeForm(employee); 

        showModal(form, employee ? 'İşçini Redaktə Et' : 'Yeni İşçi Əlavə Et', loadEmployeesContent);

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');
            const role = formData.get('role'); 

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="flex items-center justify-center space-x-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Əlavə edilir...</span></span>`;

            try {
                const result = await registerUser(email, password, role); 
                
                if (result.success) {
                    NotificationService.show(`${email} adlı işçi uğurla əlavə edildi!`, 'success');
                    if (currentModal) {
                        document.body.removeChild(currentModal);
                        currentModal = null;
                    }
                    loadEmployeesContent(); 
                } else {
                    NotificationService.show(`İşçi əlavə edilərkən xəta baş verdi: ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('Employee add error:', error);
                NotificationService.show('İşçi əlavə edilməsi zamanı xəta baş verdi.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = employee ? 'İşçini Yenilə' : 'İşçi Əlavə Et';
            }
        };
    };

    const loadCategoriesContent = async () => {
        try {
            const categories = await DataService.getCategories();
            const categoriesList = document.querySelector('#categories-list');

            if (categoriesList) {
                categoriesList.innerHTML = '';
                if (categories.length === 0) {
                    categoriesList.innerHTML = '<p class="text-slate-500 text-center py-8">Heç bir kateqoriya yoxdur.</p>';
                }
                categories.forEach(category => {
                    const categoryCard = createElement('div', {
                        className: 'bg-white p-6 rounded-xl shadow-lg border border-slate-200'
                    });
                    categoryCard.innerHTML = `
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-bold text-slate-800">${category.name}</h3>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="edit-category-btn flex-1 bg-blue-500 text-white px-4 py-2 rounded-xl" data-id="${category.id}">Redaktə</button>
                            <button class="delete-category-btn flex-1 bg-red-500 text-white px-4 py-2 rounded-xl" data-id="${category.id}">Sil</button>
                        </div>
                    `;
                    categoriesList.appendChild(categoryCard);
                });
            }

            const addCategoryBtn = document.querySelector('#add-category-btn');
            if (addCategoryBtn) {
                addCategoryBtn.onclick = () => showAddCategoryModal();
            }
        } catch (error) {
            console.error('Error loading categories content:', error);
            NotificationService.show('Kateqoriya məlumatları yüklənərkən xəta baş verdi.', 'error');
        }
    };

    const showAddCategoryModal = async (category = null) => {
        const form = createCategoryForm(category);

        showModal(form, category ? 'Kateqoriyanı Redaktə Et' : 'Yeni Kateqoriya Əlavə Et', loadCategoriesContent);

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const categoryData = {
                name: formData.get('name')
            };

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="flex items-center justify-center space-x-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Yadda saxlanılır...</span></span>`;

            try {
                let result;
                if (category) {
                    result = await DataService.updateCategory(category.id, categoryData);
                } else {
                    result = await DataService.addCategory(categoryData);
                }

                if (result) {
                    NotificationService.show(`Kateqoriya uğurla ${category ? 'yeniləndi' : 'əlavə edildi'}`, 'success');
                    if (currentModal) {
                        document.body.removeChild(currentModal);
                        currentModal = null;
                    }
                    loadCategoriesContent(); // Reload categories list
                    loadMenuContent(); // Also reload menu to reflect new categories in product form
                } else {
                    NotificationService.show(`Kateqoriya ${category ? 'yenilənərkən' : 'əlavə edilərkən'} xəta baş verdi`, 'error');
                }
            } catch (error) {
                console.error('Category save error:', error);
                NotificationService.show('Kateqoriya əməliyyatı zamanı xəta baş verdi.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = category ? 'Kateqoriyanı Yenilə' : 'Kateqoriya Əlavə Et';
            }
        };
    };

    initializeAdminPanel(container);
    if (visibleTabs[0]) {
        const initialTabId = visibleTabs[0][0];
        const initialContentId = initialTabId.replace('-tab', '-content');
        switch(initialContentId) {
            case 'dashboard-content': loadDashboardData(); break;
            case 'pos-content': loadPOSContent(); break;
            case 'menu-content': loadMenuContent(); break;
            case 'categories-content': loadCategoriesContent(); break;
            case 'discounts-content': loadDiscountsContent(); break;
            case 'tables-content': loadTablesContent(); break;
            case 'sales-report-content': loadSalesReportContent(); break;
            case 'inventory-content': loadInventoryContent(); break;
            case 'purchases-content': loadPurchasesContent(); break;
            case 'recipes-content': loadRecipesContent(); break;
            case 'employees-content': loadEmployeesContent(); break;
            case 'customers-content': loadCustomersContent(); break;
            case 'cashier-content': loadCashierContent(); break;
            case 'orders-content': loadOrdersContent(); break;
            case 'settings-content': loadSettingsContent(); break;
        }
    }
};

export const showAdminLoginPrompt = () => {
    const modal = createElement('div', {
        className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4'
    });

    const modalContent = createElement('div', {
        className: 'ultra-modern-card p-8 max-w-md w-full mx-auto'
    });

    modalContent.innerHTML = `
        <div class="text-center mb-6">
            <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-slate-800 mb-2">Admin Girişi</h2>
                <p class="text-slate-600">Admin panelinə daxil olmaq üçün məlumatlarınızı daxil edin</p>
            </div>
            
            <form id="admin-login-form" class="space-y-4">
                <div>
                    <label for="admin-email" class="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                    <input type="email" id="admin-email" required
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none"
                           placeholder="admin@restaurant.com">
                </div>
                
                <div>
                    <label for="admin-password" class="block text-sm font-semibold text-slate-700 mb-2">Şifrə</label>
                    <input type="password" id="admin-password" required
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none"
                           placeholder="••••••••">
                </div>
                
                <div class="flex space-x-3">
                    <button type="button" id="cancel-admin-login" 
                            class="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300">
                        Ləğv et
                    </button>
                    <button type="submit" 
                            class="flex-1 premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300">
                        Daxil Ol
                    </button>
                </div>
            </form>
            
            <div class="mt-4 p-3 bg-slate-50 rounded-xl">
                <p class="text-xs text-slate-600 text-center">
                    <strong>Demo admin:</strong><br>
                    Email: admin@restaurant.com<br>
                    Şifrə: admin123
                </p>
            </div>
        `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    const form = modalContent.querySelector('#admin-login-form');
    const cancelBtn = modalContent.querySelector('#cancel-admin-login');

    cancelBtn.onclick = () => {
        document.body.removeChild(modal);
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = form.querySelector('#admin-email').value;
        const password = form.querySelector('#admin-password').value;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="flex items-center justify-center space-x-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Giriş edilir...</span>
            </span>
        `;

        try {
            const result = await loginAdmin(email, password);
            
            if (result.success) {
                NotificationService.show('Admin girişi uğurlu oldu!', 'success');
                document.body.removeChild(modal);
                // Trigger app reinitialization
                window.dispatchEvent(new CustomEvent('reinitialize-app'));
            } else {
                NotificationService.show(result.error || 'Admin girişi uğursuz oldu.', 'error');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            NotificationService.show('Giriş zamanı xəta baş verdi.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Daxil Ol';
        }
    };
};