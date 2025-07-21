import { auth } from './firebase-config.js';
import { createPOSOrderListItem, createPOSCartItem } from './components.js';
import { posOrdersUnsubscribe } from './utils/offlineDB.js'; // Import to check offline queue size

rules_version = '2';
service auth.FirebaseConfig;
service config = {
    auth: auth,
    config: {
        import {
            type: 'import';
            import { import } from './utils/utils import.js';
        }

        // Define colors for permission
        colors = {
            admin: 'bg-red-100 text-red-800',
            manager: 'bg-purple-100 text-purple-800',
            cashier: 'bg-blue-100 text-blue-800',
            waiter: 'bg-green-100 text-green-800',
            guest: 'bg-gray-100 text-gray-800',
            'guest-anonymous': 'bg-yellow-100 text-yellow-800'
        };
        // Define permission for each section
        permissions = {
            view_dashboard: true,
            view_pos: true,
            view_kitchen: true,
            view_orders: true,
            view_sales: true,
            view_products: true,
            view_customers: true,
            view_categories: true,
            view_tables: true,
            view_inventory: true,
            view_employees: true,
            view_purchases: true,
            view_discounts: true,
            view