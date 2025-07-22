import { db } from '../firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where,
  onSnapshot,
  getDoc,
  setDoc,
  writeBatch, // New: For batch writes in sync
  increment // New: For increment operations
} from 'firebase/firestore';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, DEFAULT_PERMISSIONS, PAYMENT_TYPES } from '../constants/initialData.js';
import { offlineMode } from '../app.js'; // New: Import offlineMode
import { saveOfflineOrder, getOfflineOrders, clearOfflineOrder } from '../utils/offlineDB.js'; // New: Import IndexedDB utilities
import { NotificationService } from '../utils/notificationService.js';
import { AuthService } from '../auth.js';
import { createPOSOrderListItem, createPOSCartItem } from '../components.js';

export class DataService {
  static async getProducts() {
    try {
      const productsCol = collection(db, 'products');
      const productSnapshot = await getDocs(productsCol);
      const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (productList.length > 0) {
        localStorage.setItem('productsCache', JSON.stringify(productList));
        return productList;
      }
    } catch (error) {
      console.error("Error getting products from Firestore: ", error);
    }
  
    // Fallback logic
    console.warn("Could not fetch products from Firestore. Checking cache...");
    const cachedProducts = localStorage.getItem('productsCache');
    if (cachedProducts) {
      try {
        const parsedProducts = JSON.parse(cachedProducts);
        if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
          console.log("Loaded products from cache.");
          return parsedProducts;
        }
      } catch (e) {
        console.error("Error parsing cached products", e);
      }
    }
    
    console.warn("Cache empty or invalid. Falling back to initial product data.");
    const productsWithIds = INITIAL_PRODUCTS.map((product, index) => ({ 
      id: `product-${index}`, 
      ...product,
      stock: product.stock || 20
    }));
    // Attempt to seed initial products if Firestore was empty
    if (db) {
      for (const product of productsWithIds) {
        try {
          // Check if product exists before adding to prevent duplicates on every app load
          const productRef = doc(db, 'products', product.id);
          const productSnap = await getDoc(productRef);
          if (!productSnap.exists()) {
            await setDoc(productRef, product);
          }
        } catch (seedError) {
          console.error("Error seeding product:", product.name, seedError);
        }
      }
    }
    return productsWithIds;
  }

  static async addProduct(productData) {
    if (!AuthService.hasPermission('add_product')) {
      throw new Error('İcazə yoxdur: Məhsul əlavə etmək üçün icazəniz yoxdur.');
    }
    try {
      const docRef = await addDoc(collection(db, 'products'), productData);
      return { id: docRef.id, ...productData };
    } catch (error) {
      console.error("Error adding product: ", error);
      return null;
    }
  }

  static async updateProduct(productId, updatedData) {
    if (!AuthService.hasPermission('edit_product')) {
      throw new Error('İcazə yoxdur: Məhsul redaktə etmək üçün icazəniz yoxdur.');
    }
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, updatedData);
      return true;
    } catch (error) {
      console.error("Error updating product: ", error);
      return false;
    }
  }

  static async deleteProduct(productId) {
    if (!AuthService.hasPermission('delete_product')) {
      throw new Error('İcazə yoxdur: Məhsul silmək üçün icazəniz yoxdur.');
    }
    try {
      await deleteDoc(doc(db, 'products', productId));
      return true;
    } catch (error) {
      console.error("Error deleting product: ", error);
      return false;
    }
  }

  static async getOrders() {
    try {
      const ordersCol = collection(db, 'orders');
      const q = query(ordersCol, orderBy('createdAt', 'desc'));
      const orderSnapshot = await getDocs(q);
      return orderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting orders: ", error);
      console.warn("Could not fetch orders from Firestore.");
      return [];
    }
  }

  static async addOrder(order) {
    if (offlineMode) {
      console.log('App is offline. Storing order in IndexedDB.');
      try {
        const tempOrderId = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const orderToStore = {
          ...order,
          id: tempOrderId, // Assign a temporary ID
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }, // Mock timestamp
          status: 'pending-offline' // Mark as pending offline
        };
        await saveOfflineOrder(orderToStore);
        NotificationService.show('Sifariş offline olaraq saxlanıldı, internet bərpa olunanda göndəriləcək.', 'warning', 5000);
        return orderToStore; // Return the temporarily stored order
      } catch (idbError) {
        console.error('Error saving order to IndexedDB:', idbError);
        NotificationService.show('Offline sifarişi saxlamaq mümkün olmadı!', 'error');
        return null;
      }
    }

    // Online mode: proceed with Firestore
    try {
      const total = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
      const orderWithMetadata = {
        ...order,
        total,
        paymentType: order.paymentType || PAYMENT_TYPES.CASH, // Default to cash if not provided
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'orders'), orderWithMetadata);
      const newOrderData = {
        ...order,
        id: docRef.id,
        total,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      // Telegram notification for QR-origin orders
      if (order.orderSource === 'qr-code') {
        await DataService.sendTelegramNotification(newOrderData);
      }
      // Update customer loyalty points
      if (order.userId) {
        await DataService.updateLoyaltyPoints(order.userId, total);
      }
      return newOrderData;
    } catch (error) {
      console.error("Error adding order to Firestore: ", error);
      NotificationService.show('Sifariş göndərilərkən xəta baş verdi!', 'error');
      return null;
    }
  }

  static async updateOrder(orderId, newStatus) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating order: ", error);
      return false;
    }
  }

  static async getOrdersForUser(userId, callback) {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, where("userId", "==", userId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(orders);
    }, (error) => {
        console.error("Error listening to user orders: ", error);
    });

    return unsubscribe; // Return the unsubscribe function to stop listening
  }

  static async updateOrderItems(orderId, items) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const newTotal = items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
      await updateDoc(orderRef, {
        items: items,
        total: newTotal,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating order items:", error);
      return false;
    }
  }

  // ... rest of the file
```

```pos.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POS Terminal – Eat & Drink App</title>
  <meta name="description" content="POS Terminal for Eat & Drink App - Manage orders, products, and sales efficiently.">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
            },
            accent: {
              50: '#fff7ed',
              100: '#ffedd5',
              500: '#f97316',
              600: '#ea580c',
              700: '#c2410c',
            }
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
  <script type="importmap">
  {
    "imports": {
      "./auth.js": "./auth.js",
      "./components.js": "./components.js",
      "./guest.js": "./guest.js",
      "./waiter.js": "./waiter.js",
      "./admin.js": "./admin.js",
      "./firebase-config.js": "./firebase-config.js",
      "firebase/app": "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js",
      "firebase/firestore": "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js",
      "firebase/auth": "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js",
      "firebase/functions": "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js",
      "idb": "https://cdn.jsdelivr.net/npm/idb@7.1.1/build/index.js"
    }
  }
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>

<body class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen flex flex-col">
  <!-- POS Header with Function Buttons -->
  <div class="pos-header glass-header sticky top-0 z-50">
    <div class="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
      <div class="flex items-center space-x-4">
        <img src="/appicon.png" alt="Logo" class="app-logo h-10 w-auto hidden sm:block">
        <h1 class="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">POS Sistemi</h1>
        <div class="relative">
          <input type="number" id="pos-table-number" placeholder="Masa №" 
              class="ultra-modern-input w-24 text-center px-3 py-2 rounded-xl"
              min="1" value="1">
        </div>
      </div>
      
      <!-- Function Buttons -->
      <div class="flex items-center space-x-2">
        ${AuthService.hasPermission('process_pos_order') ? `
          <button id="pos-quick-sale-btn" class="pos-func-btn bg-green-100 text-green-700" title="F10 - Quick Sale">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 16h-1v-4h-1m-9-4H3a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h2a2 2 0 012 2v3"></path></svg>
            <span class="hidden sm:inline">Quick Sale (F10)</span>
        </button>
        ` : ''}
        ${AuthService.hasPermission('process_pos_order') ? `
          <button id="pos-hold-order-btn" class="pos-func-btn bg-yellow-100 text-yellow-700" title="F2 - Hold Order">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3v-6a3 3 0 013-3h1a2 2 0 012 2v10a2 2 0 01-2 2h-1a3 3 0 01-3-3v-6a2 2 0 012-2h2a2 2 0 012 2v3"></path></svg>
            <span class="hidden sm:inline">Hold Order (F2)</span>
        </button>
        ` : ''}
        ${AuthService.hasPermission('process_pos_order') ? `
          <button id="pos-new-order-btn" class="pos-func-btn bg-blue-100 text-blue-700" title="F1 - New Order">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 16h-1v-4h-1m-9-4H3a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-1a2 2 0 012-2h2a2 2 0 012 2v3"></path></svg>
            <span class="hidden sm:inline">New Order (F1)</span>
        </button>
        ` : ''}
        ${AuthService.hasPermission('view_sales') ? `
          <button id="pos-payments-btn" class="pos-func-btn bg-purple-100 text-purple-700" title="View Payments">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9v-4m3 4v-2m3-4V7m-6 4h16m-4 0h-4m-4 0H7m6-4l4 4m0-8l-4 4"></path></svg>
            <span class="hidden sm:inline">Payments</span>
        </button>
        ` : ''}
        <button id="pos-logout-btn" class="pos-func-btn bg-red-500 text-white" title="Logout">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3v-6a3 3 0 013-3h1a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-1a3 3 0 01-3-3v-6a2 2 0 012-2h2a2 2 0 012 2v3"></path></svg>
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
          <button class="pos-category-btn active" data-category="all">Hamısı</button>
          ${getPOSCategories().map(cat => `
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
              <button class="pos-action-btn mark-as-paid-btn text-white disabled:opacity-50">
                Ödəniş Alındı
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```

``` components.js
import { createElement } from './components.js';

export const getPOSCategories = () => {
  const categories = [
    { name: 'all' },
    { name: 'breakfast' },
    { name: 'lunch' },
    { name: 'dinner' }
  ];
  return categories;
};