import { StatusUtils } from './utils/statusUtils.js';

export const createElement = (tag, attributes = {}, children = []) => {
    const element = document.createElement(tag);
    for (const key in attributes) {
        if (key === 'className') {
            element.className = attributes[key];
        } else if (key === 'style') {
            Object.assign(element.style, attributes[key]);
        } else if (key === 'dataset') {
            for (const dataKey in attributes[key]) {
                element.dataset[dataKey] = attributes[key][dataKey];
            }
        } else {
            element.setAttribute(key, attributes[key]);
        }
    }
    
    const childrenArray = Array.isArray(children) ? children : (children !== undefined && children !== null ? [children] : []);
    
    childrenArray.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });
    return element;
};

export const createProductCard = (product, actions = true) => {
    const card = createElement('div', { 
        className: 'product-card p-4 sm:p-6 group cursor-pointer float-animation', 
        dataset: { productId: product.id } 
    });
    
    const imgContainer = createElement('div', { className: 'relative mb-4 sm:mb-6 overflow-hidden rounded-2xl' });
    const img = createElement('img', { 
        src: product.imageUrl, 
        alt: product.name,
        className: 'w-full h-40 sm:h-56 object-cover transition-all duration-500 group-hover:scale-115'
    });
    
    // Add error handling for images
    img.onerror = function() {
        this.src = 'https://placehold.co/400x300/e0f2fe/0284c7?text=No+Image';
    };
    
    imgContainer.appendChild(img);
    
    // Enhanced overlay gradient
    const overlay = createElement('div', { 
        className: 'absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500' 
    });
    imgContainer.appendChild(overlay);
    
    if (product.discountPercentage > 0) {
        const discountBadge = createElement('span', { 
            className: 'absolute top-2 right-2 sm:top-3 sm:right-3 bg-gradient-to-r from-red-500 via-red-600 to-pink-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-xl animate-pulse' 
        }, [`-${product.discountPercentage}%`]);
        imgContainer.appendChild(discountBadge);
    }
    
    card.appendChild(imgContainer);
    
    const info = createElement('div', { className: 'space-y-3 sm:space-y-4' });
    
    // Enhanced product title
    const title = createElement('h3', { 
        className: 'text-lg sm:text-xl font-bold text-slate-800 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-accent-600 group-hover:bg-clip-text transition-all duration-400' 
    }, [product.name]);
    info.appendChild(title);
    
    // Enhanced description
    const description = createElement('p', { 
        className: 'text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-2 group-hover:text-slate-700 transition-colors duration-300' 
    }, [product.description]);
    info.appendChild(description);

    // Enhanced price section
    const priceSection = createElement('div', { className: 'flex items-center justify-between' });
    const priceContainer = createElement('div', { className: 'space-y-1' });
    
    if (product.discountPercentage > 0) {
        const originalPrice = product.price.toFixed(2);
        const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2);
        
        priceContainer.appendChild(createElement('span', { 
            className: 'text-xs sm:text-sm text-slate-400 line-through' 
        }, [`${originalPrice} AZN`]));
        priceContainer.appendChild(createElement('span', { 
            className: 'text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-pink-500 bg-clip-text text-transparent animate-pulse' 
        }, [`${discountedPrice} AZN`]));
    } else {
        priceContainer.appendChild(createElement('span', { 
            className: 'text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-700 via-primary-600 to-accent-600 bg-clip-text text-transparent' 
        }, [`${product.price.toFixed(2)} AZN`]));
    }
    
    priceSection.appendChild(priceContainer);

    // Enhanced stock info
    const stockInfo = createElement('div', { className: 'text-right' });
    const stockQuantity = product.stock !== undefined && product.stock !== null ? product.stock : 0;
    const stockStatus = stockQuantity > 10 ? 'var' : stockQuantity > 0 ? 'az' : 'bitib';
    const stockColor = stockStatus === 'var' ? 'text-green-600' : stockStatus === 'az' ? 'text-amber-600' : 'text-red-600';
    const stockText = stockStatus === 'var' ? `Stokda: ${stockQuantity}` : stockStatus === 'az' ? `Az qalıb: ${stockQuantity}` : 'Stokda yoxdur';
    
    stockInfo.appendChild(createElement('span', { className: `text-xs sm:text-sm font-semibold ${stockColor} bg-white/60 px-2 py-1 rounded-full backdrop-blur-sm`}, [stockText]));
    priceSection.appendChild(stockInfo);

    info.appendChild(priceSection);
    card.appendChild(info);

    if (actions && stockQuantity > 0) {
        const actionsDiv = createElement('div', { className: 'mt-4 sm:mt-6 space-y-3 sm:space-y-4' });
        
        // Enhanced quantity selector
        const quantityDiv = createElement('div', { className: 'flex items-center justify-center space-x-3 sm:space-x-4' });
        const minusBtn = createElement('button', { 
            className: 'quantity-minus-btn w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 flex items-center justify-center transition-all duration-300 hover:scale-125 shadow-lg hover:shadow-xl' 
        });
        minusBtn.innerHTML = '<span class="text-lg font-bold">−</span>';
        
        const quantityInput = createElement('input', {
            type: 'number',
            value: '1',
            min: '1',
            max: stockQuantity.toString(),
            className: 'w-12 sm:w-16 text-center bg-gradient-to-r from-white to-slate-50 border-2 border-slate-200 rounded-xl py-2 focus:outline-none focus:border-primary-500 focus:bg-white focus:shadow-lg transition-all duration-300 text-sm sm:text-base font-semibold'
        });
        
        const plusBtn = createElement('button', { 
            className: 'quantity-plus-btn w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 flex items-center justify-center transition-all duration-300 hover:scale-125 shadow-lg hover:shadow-xl' 
        });
        plusBtn.innerHTML = '<span class="text-lg font-bold">+</span>';
        
        quantityDiv.appendChild(minusBtn);
        quantityDiv.appendChild(quantityInput);
        quantityDiv.appendChild(plusBtn);
        actionsDiv.appendChild(quantityDiv);
        
        // Enhanced add to cart button
        const addButton = createElement('button', { 
            className: 'add-to-cart-btn w-full bg-gradient-to-r from-primary-500 via-primary-600 to-accent-600 hover:from-primary-600 hover:via-accent-600 hover:to-accent-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-400 transform hover:scale-105 hover:-rotate-1' 
        });
        addButton.innerHTML = `
            <span class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l2.5 5M9.99 17.93"></path>
                </svg>
                <span>Səbətə əlavə et</span>
            </span>
        `;
        actionsDiv.appendChild(addButton);
        card.appendChild(actionsDiv);
    } else if (actions && stockQuantity <= 0) {
        const outOfStockDiv = createElement('div', { className: 'mt-4 sm:mt-6' });
        const outOfStockBtn = createElement('button', { 
            className: 'w-full bg-slate-300 text-slate-500 px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold cursor-not-allowed',
            disabled: true
        });
        outOfStockBtn.innerHTML = 'Stokda yoxdur';
        outOfStockDiv.appendChild(outOfStockBtn);
        card.appendChild(outOfStockDiv);
    }

    return card;
};

export const createAdminProductForm = (product = null, categories = []) => {
    const form = createElement('form', { 
        id: product ? `edit-product-form-${product.id}` : 'add-product-form',
        className: 'modern-form p-8 space-y-6'
    });
    
    form.innerHTML = `
        <input type="hidden" name="id" value="${product ? product.id : ''}">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="name" class="block text-sm font-bold text-slate-700 mb-3">Məhsul adı</label>
                <input type="text" id="name" name="name" value="${product ? product.name : ''}" required
                       class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base"
                       placeholder="Məs. Burger">
            </div>
            
            <div>
                <label for="price" class="block text-sm font-bold text-slate-700 mb-3">Qiymət (AZN)</label>
                <input type="number" id="price" name="price" step="0.01" value="${product ? product.price : ''}" required
                       class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base"
                       placeholder="0.00">
            </div>
        </div>
        
        <div>
            <label for="description" class="block text-sm font-bold text-slate-700 mb-3">Təsvir</label>
            <textarea id="description" name="description" required rows="4"
                      class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base resize-none"
                      placeholder="Məhsul haqqında məlumat...">${product ? product.description : ''}</textarea>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="imageUrl" class="block text-sm font-bold text-slate-700 mb-3">Şəkil URL</label>
                <input type="text" id="imageUrl" name="imageUrl" value="${product ? product.imageUrl : ''}" required
                       class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base"
                       placeholder="https://...">
            </div>
            
            <div>
                <label for="category" class="block text-sm font-bold text-slate-700 mb-3">Kateqoriya</label>
                <select id="category" name="category" required
                        class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base">
                    <option value="">Kateqoriya seçin</option>
                    ${categories.map(cat => `
                        <option value="${cat.name}" ${product && product.category === cat.name ? 'selected' : ''}>${cat.name}</option>
                    `).join('')}
                </select>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="discountPercentage" class="block text-sm font-bold text-slate-700 mb-3">Endirim (%)</label>
                <input type="number" id="discountPercentage" name="discountPercentage" min="0" max="100" value="${product ? product.discountPercentage : 0}"
                       class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base"
                       placeholder="0">
            </div>
            
            <div>
                <label for="stock" class="block text-sm font-bold text-slate-700 mb-3">Stok Miqdarı</label>
                <input type="number" id="stock" name="stock" min="0" value="${product ? product.stock : 0}" required
                       class="ultra-modern-input w-full px-4 py-3 rounded-xl focus:outline-none text-base"
                       placeholder="0">
            </div>
        </div>
        
        <div class="flex items-center space-x-3 pt-8">
            <input type="checkbox" id="isCampaignItem" name="isCampaignItem" ${product && product.isCampaignItem ? 'checked' : ''}
                   class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2">
            <label for="isCampaignItem" class="text-sm font-bold text-slate-700">Kampaniya məhsulu</label>
        </div>
        
        <div class="flex space-x-4 pt-4">
            <button type="submit" 
                    class="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <span class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m8-8H4"></path>
                    </svg>
                    <span>${product ? 'Yenilə' : 'Əlavə et'}</span>
                </span>
            </button>
        </div>
    `;
    return form;
};

export const createProductRow = (product) => {
    const row = createElement('tr', {
        className: 'bg-white border-b hover:bg-slate-50'
    });

    const price = product.discountPercentage > 0 
        ? (product.price * (1 - product.discountPercentage / 100)) 
        : product.price;

    row.innerHTML = `
        <td class="px-6 py-4">
            <img src="${product.imageUrl || 'https://placehold.co/50x50/e0f2fe/0284c7?text=No+Image'}" alt="${product.name}" 
                 class="w-12 h-12 object-cover rounded-md shadow-sm"
                 onerror="this.src='https://placehold.co/50x50/e0f2fe/0284c7?text=No+Image';">
        </td>
        <td class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">${product.name}</td>
        <td class="px-6 py-4">${product.category || 'Naməlum'}</td>
        <td class="px-6 py-4">
            ${product.discountPercentage > 0 ? `<span class="line-through text-slate-400 text-sm mr-1">${product.price.toFixed(2)}</span>` : ''}
            <span class="font-semibold text-slate-800">${price.toFixed(2)} AZN</span>
        </td>
        <td class="px-6 py-4">${product.stock !== undefined ? product.stock : 'N/A'}</td>
        <td class="px-6 py-4">
            ${product.discountPercentage > 0 ? `<span class="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-semibold">-${product.discountPercentage}%</span>` : 'Yox'}
        </td>
        <td class="px-6 py-4">
            <div class="flex space-x-2">
                <button class="edit-product-btn bg-blue-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-blue-600 transition" data-product-id="${product.id}">
                    Redaktə
                </button>
                <button class="delete-product-btn bg-red-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-red-600 transition" data-product-id="${product.id}">
                    Sil
                </button>
            </div>
        </td>
    `;
    return row;
};

export const createOrderCard = (order) => {
    const card = createElement('div', { 
        className: 'bg-white rounded-2xl shadow-lg p-6 card-hover', 
        dataset: { orderId: order.id } 
    });
    
    const header = createElement('div', { className: 'flex justify-between items-start mb-4' });
    header.appendChild(createElement('h3', { className: 'text-xl font-bold text-gray-800' }, [`Sifariş #${order.id.substring(0, 8)}`]));
    header.appendChild(createElement('span', { className: `px-3 py-1 rounded-full text-sm font-semibold ${StatusUtils.getStatusColor(order.status)}` }, [StatusUtils.getStatusText(order.status)]));
    card.appendChild(header);
    
    card.appendChild(createElement('p', { className: 'text-gray-600 mb-2' }, [`Stol: #${order.tableNumber}`]));
    
    // Safely handle timestamp
    const timestampText = (order.createdAt && typeof order.createdAt.seconds === 'number')
        ? new Date(order.createdAt.seconds * 1000).toLocaleString()
        : 'Tarix yoxdur';
    card.appendChild(createElement('p', { className: 'text-gray-500 text-sm mb-4' }, [timestampText]));

    const itemsList = createElement('div', { className: 'space-y-2 mb-4' });
    order.items.forEach(item => {
        const itemDiv = createElement('div', { className: 'flex justify-between items-center text-sm' });
        itemDiv.appendChild(createElement('span', { className: 'text-gray-700' }, [`${item.name} x${item.quantity}`]));
        itemDiv.appendChild(createElement('span', { className: 'font-semibold text-gray-800' }, [`${(item.priceAtOrder * item.quantity).toFixed(2)} AZN`]));
        itemsList.appendChild(itemDiv);
    });
    card.appendChild(itemsList);

    const total = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
    card.appendChild(createElement('p', { className: 'text-xl font-bold text-gray-800 mb-4' }, [`Ümumi: ${total.toFixed(2)} AZN`]));

    if (order.status !== 'paid') {
        const actionsDiv = createElement('div', { className: 'flex space-x-2' });
        const nextStatus = StatusUtils.getNextStatus(order.status);
        if (nextStatus) {
            actionsDiv.appendChild(createElement('button', { 
                className: 'flex-1 gradient-btn text-white px-4 py-2 rounded-lg font-semibold transition duration-300 update-status-btn', 
                dataset: { status: nextStatus.key } 
            }, [nextStatus.text]));
        }
        card.appendChild(actionsDiv);
    }

    return card;
};

export const createTableCard = (table) => {
    const card = createElement('div', { 
        className: `bg-white rounded-2xl shadow-lg p-6 card-hover ${table.isOccupied ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'}`, 
        dataset: { tableId: table.id } 
    });
    
    card.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800">Masa ${table.number}</h3>
            <span class="px-3 py-1 rounded-full text-sm font-semibold ${table.isOccupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                ${table.isOccupied ? 'Məişğul' : 'Boş'}
            </span>
        </div>
        <p class="text-gray-600 mb-4">Tutum: ${table.capacity} nəfər</p>
        <div class="flex space-x-2">
            <button class="flex-1 bg-blue-500 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-600 transition qr-code-btn" data-table-id="${table.id}">
                QR Kod
            </button>
            <button class="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-600 transition edit-table-btn" data-table-id="${table.id}">
                Redaktə
            </button>
        </div>
    `;
    
    return card;
};

export const createAnalyticsCard = (title, value, subtitle = '', color = 'blue') => {
    const card = createElement('div', { className: 'admin-stat-card p-6' });
    
    const iconMap = {
        'blue': `<svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>`,
        'green': `<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>`,
        'purple': `<svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9a6 6 0 00-6 6v2a4 4 0 01-4 4 4 4 0 01-4-4v-2a4 4 0 014-4 4 4 0 014 4v2a4 4 0 01-4 4 4 4 0 01-4-4v-2H6v2a4 4 0 01-4 4 4 4 0 01-4-4v-2H6v2z"></path>
                   </svg>`,
        'orange': `<svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m8-8H4"></path>
                   </svg>`
    };

    card.innerHTML = `
        <div class="flex items-center mb-4">
            <div class="p-2 mr-3 rounded-full bg-${color}-100">
                ${iconMap[color] || iconMap.blue}
            </div>
            <div>
                <p class="text-sm font-medium text-slate-500">${title}</p>
                <h3 class="text-2xl font-bold text-slate-800">${value}</h3>
                ${subtitle ? `<p class="text-xs text-slate-400">${subtitle}</p>` : ''}
            </div>
        </div>
    `;
    return card;
};

export const createOrderCard = (order) => {
    const card = createElement('div', { 
        className: 'bg-white rounded-2xl shadow-lg p-6 card-hover', 
        dataset: { orderId: order.id } 
    });
    
    const header = createElement('div', { className: 'flex justify-between items-start mb-4' });
    header.appendChild(createElement('h3', { className: 'text-xl font-bold text-gray-800' }, [`Sifariş #${order.id.substring(0, 8)}`]));
    header.appendChild(createElement('span', { className: `px-3 py-1 rounded-full text-sm font-semibold ${StatusUtils.getStatusColor(order.status)}` }, [StatusUtils.getStatusText(order.status)]));
    card.appendChild(header);
    
    card.appendChild(createElement('p', { className: 'text-gray-600 mb-2' }, [`Stol: #${order.tableNumber}`]));
    
    // Safely handle timestamp
    const timestampText = (order.createdAt && typeof order.createdAt.seconds === 'number')
        ? new Date(order.createdAt.seconds * 1000).toLocaleString()
        : 'Tarix yoxdur';
    card.appendChild(createElement('p', { className: 'text-gray-500 text-sm mb-4' }, [timestampText]));

    const itemsList = createElement('div', { className: 'space-y-2 mb-4' });
    order.items.forEach(item => {
        const itemDiv = createElement('div', { className: 'flex justify-between items-center text-sm' });
        itemDiv.appendChild(createElement('span', { className: 'text-gray-700' }, [`${item.name} x${item.quantity}`]));
        itemDiv.appendChild(createElement('span', { className: 'font-semibold text-gray-800' }, [`${(item.priceAtOrder * item.quantity).toFixed(2)} AZN`]));
        itemsList.appendChild(itemDiv);
    });
    card.appendChild(itemsList);

    const total = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
    card.appendChild(createElement('p', { className: 'text-xl font-bold text-gray-800 mb-4' }, [`Ümumi: ${total.toFixed(2)} AZN`]));

    if (order.status !== 'paid') {
        const actionsDiv = createElement('div', { className: 'flex space-x-2' });
        const nextStatus = StatusUtils.getNextStatus(order.status);
        if (nextStatus) {
            actionsDiv.appendChild(createElement('button', { 
                className: 'flex-1 gradient-btn text-white px-4 py-2 rounded-lg font-semibold transition duration-300 update-status-btn', 
                dataset: { status: nextStatus.key } 
            }, [nextStatus.text]));
        }
        card.appendChild(actionsDiv);
    }

    return card;
};

export const createTableForm = (table = null) => {
    return createElement('div', { className: 'ultra-modern-card p-6' }, `
        <h3 class="text-xl font-bold text-slate-800 mb-4">${table ? 'Masanı Redaktə Et' : 'Yeni Masa Əlavə Et'}</h3>
        <p class="text-slate-600">Bu hissə hazırlanır. Zəhmət olmasa gözləyin.</p>
        <button type="button" class="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg close-placeholder-modal">Bağla</button>
    `);
};

export const createDiscountForm = (discount = null) => {
    return createElement('div', { className: 'ultra-modern-card p-6' }, `
        <h3 class="text-xl font-bold text-slate-800 mb-4">${discount ? 'Endirimi Redaktə Et' : 'Yeni Endirim Əlavə Et'}</h3>
        <p class="text-slate-600">Bu hissə hazırlanır. Zəhmət olmasa gözləyin.</p>
        <button type="button" class="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg close-placeholder-modal">Bağla</button>
    `);
};

export const createInventoryItemForm = (item = null) => {
    return createElement('div', { className: 'ultra-modern-card p-6' }, `
        <h3 class="text-xl font-bold text-slate-800 mb-4">${item ? 'Anbar Məhsulunu Redaktə Et' : 'Yeni Anbar Məhsulu Əlavə Et'}</h3>
        <p class="text-slate-600">Bu hissə hazırlanır. Zəhmət olmasa gözləyin.</p>
        <button type="button" class="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg close-placeholder-modal">Bağla</button>
    `);
};

export const createPurchaseForm = (purchase = null) => {
    return createElement('div', { className: 'ultra-modern-card p-6' }, `
        <h3 class="text-xl font-bold text-slate-800 mb-4">${purchase ? 'Alışı Redaktə Et' : 'Yeni Alış Əlavə Et'}</h3>
        <p class="text-slate-600">Bu hissə hazırlanır. Zəhmət olmasa gözləyin.</p>
        <button type="button" class="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg close-placeholder-modal">Bağla</button>
    `);
};

export const createEmployeeForm = (employee = null) => {
    return createElement('div', { className: 'ultra-modern-card p-6' }, `
        <h3 class="text-xl font-bold text-slate-800 mb-4">${employee ? 'İşçini Redaktə Et' : 'Yeni İşçi Əlavə Et'}</h3>
        <p class="text-slate-600">Bu hissə hazırlanır. Zəhmət olmasa gözləyin.</p>
        <button type="button" class="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg close-placeholder-modal">Bağla</button>
    `);
};

export const createCategoryForm = (category = null) => {
    return createElement('div', { className: 'ultra-modern-card p-6' }, `
        <h3 class="text-xl font-bold text-slate-800 mb-4">${category ? 'Kateqoriyanı Redaktə Et' : 'Yeni Kateqoriya Əlavə Et'}</h3>
        <p class="text-slate-600">Bu hissə hazırlanır. Zəhmət olmasa gözləyin.</p>
        <button type="button" class="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg close-placeholder-modal">Bağla</button>
    `);
};

export const createRecipeForm = (recipe = null) => {
    return createElement('div', { className: 'ultra-modern-card p-6' }, `
        <h3 class="text-xl font-bold text-slate-800 mb-4">${recipe ? 'Resepti Redaktə Et' : 'Yeni Resept Əlavə Et'}</h3>
        <p class="text-slate-600">Bu hissə hazırlanır. Zəhmət olmasa gözləyin.</p>
        <button type="button" class="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg close-placeholder-modal">Bağla</button>
    `);
};

export const createSupplierForm = (supplier = null) => {
    return createElement('div', { className: 'ultra-modern-card p-6' }, `
        <h3 class="text-xl font-bold text-slate-800 mb-4">${supplier ? 'Təchizatçını Redaktə Et' : 'Yeni Təchizatçı Əlavə Et'}</h3>
        <p class="text-slate-600">Bu hissə hazırlanır. Zəhmət olmasa gözləyin.</p>
        <button type="button" class="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg close-placeholder-modal">Bağla</button>
    `);
};

export const createPOSOrderListItem = (order, isSelected = false) => {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const orderTime = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    const item = createElement('div', {
        className: `pos-order-list-item flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 
                    ${isSelected ? 'bg-blue-100 border border-blue-400 shadow-md' : 'bg-slate-50 hover:bg-slate-100'}`,
        dataset: { orderId: order.id }
    });

    item.innerHTML = `
        <div>
            <p class="font-semibold text-slate-800">Masa ${order.tableNumber} <span class="text-slate-500 text-xs ml-1">#${order.id.substring(0, 6)}</span></p>
            <p class="text-sm text-slate-600">${totalItems} məhsul · ${order.total?.toFixed(2) || '0.00'} AZN</p>
        </div>
        <div class="text-right">
            <span class="text-xs text-slate-500">${orderTime}</span>
            <span class="block px-2 py-0.5 rounded-full text-xs font-semibold ${StatusUtils.getStatusColor(order.status)} mt-1">
                ${StatusUtils.getStatusText(order.status)}
            </span>
        </div>
    `;
    return item;
};

export const createUserCard = (user) => {
    return createElement('div', { className: 'ultra-modern-card p-4 flex flex-col items-center text-center' }, `
        <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <svg class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m8-8H4"></path></svg>
        </div>
        <h4 class="font-semibold text-slate-800">${user.email}</h4>
        <p class="text-sm text-slate-600 capitalize">${user.role || 'user'}</p>
        <div class="mt-3 flex space-x-2">
            <button class="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs">Redaktə</button>
            <button class="bg-red-500 text-white px-3 py-1 rounded-lg text-xs">Sil</button>
        </div>
    `);
};

export const createSalesTableRow = (order) => {
    const row = createElement('tr', { className: 'bg-white border-b hover:bg-slate-50' });
    const orderDate = order.createdAt && order.createdAt.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
    const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const totalAmount = order.total !== undefined ? order.total.toFixed(2) : '0.00';

    row.innerHTML = `
        <td class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">${order.id?.substring(0, 8) || 'N/A'}</td>
        <td class="px-6 py-4">${order.tableNumber || 'N/A'}</td>
        <td class="px-6 py-4">${orderDate}</td>
        <td class="px-6 py-4">${totalItems}</td>
        <td class="px-6 py-4 font-semibold">${totalAmount} AZN</td>
    `;
    return row;
};

export const createPOSProductCard = (product) => {
    const card = createElement('div', {
        className: `pos-product-card p-3 flex flex-col justify-end relative h-32 sm:h-40 ${product.stock <= 0 ? 'out-of-stock' : ''}`,
        dataset: { productId: product.id }
    });

    const img = createElement('img', {
        src: product.imageUrl,
        alt: product.name,
        className: 'absolute inset-0 w-full h-full object-cover rounded-md',
        onerror: `this.src='https://placehold.co/150x150/e0f2fe/0284c7?text=No+Image'`
    });
    card.appendChild(img);

    const overlay = createElement('div', {
        className: 'absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-md'
    });
    card.appendChild(overlay);

    const name = createElement('span', {
        className: 'product-name text-white text-sm font-semibold relative z-10'
    }, [product.name]);
    card.appendChild(name);

    const price = product.discountPercentage > 0
        ? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
        : product.price.toFixed(2);

    const priceTag = createElement('span', {
        className: 'product-price absolute z-10'
    }, [`${price} AZN`]);
    card.appendChild(priceTag);

    if (product.stock <= 0) {
        const stockOverlay = createElement('div', {
            className: 'absolute inset-0 bg-red-500/70 flex items-center justify-center rounded-md z-20'
        });
        const stockText = createElement('span', {
            className: 'text-white text-base font-bold rotate-45'
        }, ['Stokda yoxdur']);
        stockOverlay.appendChild(stockText);
        card.appendChild(stockOverlay);
    }
    
    return card;
};

export const createPOSCartItem = (item, index) => {
    const itemDiv = createElement('div', {
        className: 'pos-cart-item flex items-center justify-between bg-slate-50 p-3 rounded-lg shadow-sm',
        dataset: { index: index }
    });

    itemDiv.innerHTML = `
        <div class="flex-1">
            <p class="font-semibold text-slate-800">${item.name}</p>
            <p class="text-sm text-slate-500">${item.priceAtOrder.toFixed(2)} AZN / ədəd</p>
        </div>
        <div class="flex items-center">
            <button class="cart-quantity-btn" data-action="decrease">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
            </button>
            <input type="number" value="${item.quantity}" min="1" class="w-12 text-center bg-transparent border-none focus:outline-none font-semibold text-slate-800 text-base">
            <button class="cart-quantity-btn" data-action="increase">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
            <span class="font-bold text-slate-800 ml-3 mr-1 w-20 text-right">${(item.priceAtOrder * item.quantity).toFixed(2)} AZN</span>
            <button class="cart-remove-btn" data-action="remove">
                &times;
            </button>
        </div>
    `;
    return itemDiv;
};