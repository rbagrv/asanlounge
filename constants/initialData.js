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

export const INITIAL_CATEGORIES = [
    { name: 'Əsas Yeməklər' },
    { name: 'Pizzalar' },
    { name: 'Salatlar' },
    { name: 'İçkilər' },
    { name: 'Şirniyyatlar' }
];