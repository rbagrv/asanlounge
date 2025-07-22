import { openDB } from 'idb';

const DB_NAME = 'EatDrinkAppDB';
const DB_VERSION = 1;
const OFFLINE_ORDERS_STORE = 'offlineOrders';

async function openOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(OFFLINE_ORDERS_STORE)) {
        db.createObjectStore(OFFLINE_ORDERS_STORE, { keyPath: 'id' });
      }
    },
  });
}

export async function saveOfflineOrder(order) {
  const db = await openOfflineDB();
  const tx = db.transaction(OFFLINE_ORDERS_STORE, 'readwrite');
  const store = tx.objectStore(OFFLINE_ORDERS_STORE);
  await store.put(order);
  await tx.done;
  console.log('Order saved to IndexedDB:', order.id);
}

export async function getOfflineOrders() {
  const db = await openOfflineDB();
  const tx = db.transaction(OFFLINE_ORDERS_STORE, 'readonly');
  const store = tx.objectStore(OFFLINE_ORDERS_STORE);
  const orders = await store.getAll();
  await tx.done;
  return orders;
}

export async function clearOfflineOrder(orderId) {
  const db = await openOfflineDB();
  const tx = db.transaction(OFFLINE_ORDERS_STORE, 'readwrite');
  const store = tx.objectStore(OFFLINE_ORDERS_STORE);
  await store.delete(orderId);
  await tx.done;
  console.log('Order removed from IndexedDB:', orderId);
}

export async function getOfflineOrdersCount() {
  const db = await openOfflineDB();
  const tx = db.transaction(OFFLINE_ORDERS_STORE, 'readonly');
  const store = tx.objectStore(OFFLINE_ORDERS_STORE);
  const count = await store.count();
  await tx.done;
  return count;
}

