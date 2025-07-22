export const INITIAL_PRODUCTS = [
    {
        name: 'Burger',
        description: 'Ləzzətli mal əti burgeri pendir və tərəvəzlərlə.',
        price: 12.50,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
        discountPercentage: 10,
        isCampaignItem: false,
        category: 'Əsas Yeməklər',
        stock: 25
    },
    {
        name: 'Pizza Margherita',
        description: 'Klassik pomidor sousu, mozzarella pendiri və reyhan.',
        price: 15.00,
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'Pizzalar',
        stock: 20
    },
    {
        name: 'Sezar Salatı',
        description: 'Toyuq filesi, kahı, parmezan pendiri və Sezar sousu.',
        price: 8.75,
        imageUrl: 'https://images.unsplash.com/photo-1512852939750-1305098529bf?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: true,
        category: 'Salatlar',
        stock: 30
    },
    {
        name: 'Kofe Latte',
        description: 'Süd ilə mükəmməl qəhvə.',
        price: 4.20,
        imageUrl: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400&h=300&fit=crop',
        discountPercentage: 5,
        isCampaignItem: false,
        category: 'İçkilər',
        stock: 50
    },
    {
        name: 'Şokoladlı Sufle',
        description: 'İçərisi maye şokoladlı isti sufle.',
        price: 6.90,
        imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'Şirniyyatlar',
        stock: 15
    },
    {
        name: 'Döner Kebab',
        description: 'Ənənəvi türk döner kebabı tərəvəz və sousla.',
        price: 9.50,
        imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=300&fit=crop',
        discountPercentage: 15,
        isCampaignItem: true,
        category: 'Əsas Yeməklər',
        stock: 18
    },
    {
        name: 'Pepperoni Pizza',
        description: 'Xüsusi pepperoni və mozzarella pendiri ilə.',
        price: 17.50,
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'Pizzalar',
        stock: 22
    },
    {
        name: 'Yunan Salatı',
        description: 'Feta pendiri, zeytun və tərəvəzlərlə yunan salatı.',
        price: 7.50,
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'Salatlar',
        stock: 25
    },
    {
        name: 'Espresso',
        description: 'Güclü və aromatik espresso.',
        price: 3.50,
        imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'İçkilər',
        stock: 40
    },
    {
        name: 'Çay',
        description: 'Ənənəvi Azərbaycan çayı.',
        price: 2.00,
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'İçkilər',
        stock: 60
    },
    {
        name: 'Tiramisu',
        description: 'İtalyan tiramisu deserti.',
        price: 8.50,
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
        discountPercentage: 20,
        isCampaignItem: true,
        category: 'Şirniyyatlar',
        stock: 12
    },
    {
        name: 'Cheesecake',
        description: 'Kremalı cheesecake meyvə ilə.',
        price: 7.00,
        imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'Şirniyyatlar',
        stock: 18
    },
    {
        name: 'Pasta Carbonara',
        description: 'Kremli carbonara pastası.',
        price: 11.00,
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'Əsas Yeməklər',
        stock: 20
    },
    {
        name: 'Balıq Filesi',
        description: 'Qızardılmış salmon filesi tərəvəzlərlə.',
        price: 18.00,
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'Əsas Yeməklər',
        stock: 15
    },
    {
        name: 'Fresh Juice',
        description: 'Təzə portağal şirəsi.',
        price: 5.50,
        imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop',
        discountPercentage: 0,
        isCampaignItem: false,
        category: 'İçkilər',
        stock: 35
    }
];

export const CATEGORIES = [
    'Əsas Yeməklər',
    'Pizzalar',
    'Salatlar',
    'İçkilər',
    'Şirniyyatlar'
];

export const ORDER_STATUSES = {
    PENDING: 'pending',
    IN_PREP: 'in-prep',
    PREPARING: 'preparing',
    READY: 'ready',
    SERVED: 'served',
    PAID: 'paid',
    CANCELLED: 'cancelled'
};

export const PAYMENT_TYPES = {
    CASH: 'cash',
    CREDIT: 'credit',
    QR: 'qr'
};

export const INITIAL_CATEGORIES = [
    { name: 'Əsas Yeməklər' },
    { name: 'Pizzalar' },
    { name: 'Salatlar' },
    { name: 'İçkilər' },
    { name: 'Şirniyyatlar' }
];

export const DEFAULT_PERMISSIONS = {
    admin: {
        view_dashboard: true,
        view_pos: true,
        view_kitchen: true,
        view_orders: true,
        view_sales: true, // Added for admin
        view_products: true,
        view_customers: true,
        view_categories: true,
        view_tables: true,
        view_inventory: true,
        view_employees: true,
        view_purchases: true,
        view_discounts: true,
        view_recipes: true,
        view_suppliers: true,
        view_settings: true,
        
        manage_products: true,
        manage_categories: true,
        manage_tables: true,
        manage_inventory: true,
        manage_employees: true,
        manage_purchases: true,
        manage_discounts: true,
        manage_recipes: true,
        manage_suppliers: true,
        
        update_order_status: true,
        process_pos_order: true,
        mark_order_served: true,
        mark_order_paid: true,
        
        // Granular permissions for CRUD
        add_product: true,
        edit_product: true,
        delete_product: true,

        add_category: true,
        edit_category: true,
        delete_category: true,

        add_table: true,
        edit_table: true,
        delete_table: true,

        add_inventory_item: true,
        edit_inventory_item: true,
        delete_inventory_item: true,

        add_employee: true,
        edit_employee: true,
        delete_employee: true,

        add_purchase: true,
        edit_purchase: true,
        delete_purchase: true,

        add_discount: true,
        edit_discount: true,
        delete_discount: true,

        add_recipe: true,
        edit_recipe: true,
        delete_recipe: true,

        add_supplier: true,
        edit_supplier: true,
        delete_supplier: true,

        manage_users_roles: true, // For changing roles, adding/deleting users
        reset_database: true,
        update_business_info: true,
        access_integrations: true,
        export_sales_data: true, // New permission for sales data export
    },
    manager: {
        view_dashboard: true,
        view_pos: true,
        view_kitchen: true,
        view_orders: true,
        view_sales: true, // Managers can view sales
        view_products: true, // Managers can view products to understand inventory flow
        view_inventory: true,
        view_employees: true,
        view_purchases: true,
        
        manage_inventory: true,
        manage_employees: true, // Can add/edit non-admin employees
        manage_purchases: true,
        
        update_order_status: true,
        process_pos_order: true,
        mark_order_served: true,
        mark_order_paid: true,

        edit_inventory_item: true,
        add_purchase: true,
        edit_purchase: true,

        edit_employee: true, // Can edit employees (not admin)
        export_sales_data: true, // Managers can export sales data
    },
    cashier: {
        view_pos: true,
        view_orders: true,
        view_sales: true, // Can view sales to check past transactions
        
        process_pos_order: true,
        mark_order_served: true,
        mark_order_paid: true,
        export_sales_data: true, // Cashiers can export sales data
    },
    waiter: {
        view_kitchen: true,
        update_order_status: true, // Can mark orders in-prep, ready, served
    },
    guest: {
        // Guests only access specific guest UI, no admin panel permissions
    },
    'guest-anonymous': {
        // Same as guest
    }
};