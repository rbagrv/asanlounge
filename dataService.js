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

  static async sendTelegramNotification(orderData) {
    try {
      const batch = writeBatch(db);
      const orderRef = doc(db, 'orders', orderData.id);
      batch.update(orderRef, { status: 'pending-telegram' });
      await batch.commit();
      NotificationService.show('Telegram sifarişi göndərildi.', 'success', 3000);
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
      NotificationService.show('Telegram sifarişi göndərilərkən xəta baş verdi.', 'error', 3000);
    }
  }

  static async updateLoyaltyPoints(userId, amount) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentPoints = userSnap.data().loyaltyPoints || 0;
        const newPoints = currentPoints + amount;
        await updateDoc(userRef, { loyaltyPoints: newPoints });
        NotificationService.show('Müştəriyə əlavə edildi.', 'success', 3000);
      } else {
        console.warn("User not found in Firestore.");
      }
    } catch (error) {
      console.error("Error updating loyalty points:", error);
      NotificationService.show('Müştəriyə əlavə etmək mümkün olmadı!', 'error', 3000);
    }
  }
}