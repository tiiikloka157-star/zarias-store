// ========== بيانات المنتجات ==========
let products = [
    { id: 1, name: "أحمر شفاه وردي", desc: "لون ثابت يدوم طويلاً", price: 89, oldPrice: 150, discount: 40, category: "مكياج", rating: 4.5, sales: 120, image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=300&h=200&fit=crop", badge: "خصم 40%" },
    { id: 2, name: "سيروم فيتامين C", desc: "مشرق للبشرة", price: 159, oldPrice: 220, discount: 28, category: "عناية بالبشرة", rating: 5, sales: 85, image: "https://images.unsplash.com/photo-1570194065650-d99fb4b8ccb0?w=300&h=200&fit=crop", badge: "خصم 28%" },
    { id: 3, name: "عطر وردي فاخر", desc: "روائح شرقية", price: 220, oldPrice: null, discount: 0, category: "عطور", rating: 4.8, sales: 45, image: "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=300&h=200&fit=crop", badge: "جديد" },
    { id: 4, name: "بلاش كريمي", desc: "لمسة طبيعية", price: 110, oldPrice: 180, discount: 39, category: "مكياج", rating: 4.2, sales: 200, image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=300&h=200&fit=crop", badge: "خصم 39%" }
];

let cart = [];
let favorites = [];
let orders = JSON.parse(localStorage.getItem('zarias_orders')) || [];
let currentCategory = "all";
let searchQuery = "";
let currentFilter = "default";
let currentUser = JSON.parse(localStorage.getItem('zarias_user'));

// ========== عرض النجوم ==========
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) stars += '<i class="fas fa-star"></i>';
        else if (i - 0.5 <= rating) stars += '<i class="fas fa-star-half-alt"></i>';
        else stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

// ========== البحث ==========
function handleSearch() {
    searchQuery = document.getElementById('searchInput').value;
    renderProducts();
}

// ========== الفلاتر ==========
function applyFilter() {
    let filtered = [...products];
    if (currentCategory !== "all") filtered = filtered.filter(p => p.category === currentCategory);
    if (searchQuery) filtered = filtered.filter(p => p.name.includes(searchQuery) || p.desc.includes(searchQuery));
    switch(currentFilter) {
        case 'bestseller': filtered.sort((a, b) => (b.sales || 0) - (a.sales || 0)); break;
        case 'name_asc': filtered.sort((a, b) => a.name.localeCompare(b.name, 'ar')); break;
        case 'name_desc': filtered.sort((a, b) => b.name.localeCompare(a.name, 'ar')); break;
        case 'price_asc': filtered.sort((a, b) => a.price - b.price); break;
        case 'price_desc': filtered.sort((a, b) => b.price - a.price); break;
        default: filtered.sort((a, b) => a.id - b.id);
    }
    return filtered;
}

function setFilter(filter) { currentFilter = filter; document.getElementById('filterSelect').value = filter; renderProducts(); closeSidebar(); }
function applyFilterFromSelect() { currentFilter = document.getElementById('filterSelect').value; renderProducts(); }

// ========== عرض المنتجات ==========
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const filtered = applyFilter();
    if (filtered.length === 0) { grid.innerHTML = '<div style="text-align:center; padding:2rem;">لا توجد منتجات</div>'; return; }
    grid.innerHTML = filtered.map(p => {
        const hasDiscount = p.oldPrice && p.oldPrice > p.price;
        return `
        <div class="product-card">
            <div class="favorite-icon ${favorites.some(f => f.id === p.id) ? 'active' : ''}" onclick="toggleFavorite(${p.id})"><i class="fas fa-heart"></i></div>
            <div class="product-actions">
                <button class="edit-product-btn" onclick="openEditModal(${p.id})"><i class="fas fa-edit"></i></button>
                <button class="delete-product-btn" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
            </div>
            <img class="product-img" src="${p.image}" alt="${p.name}">
            <div class="product-info">
                ${p.badge ? `<span style="background:#FFB347; color:white; padding:2px 6px; border-radius:15px; font-size:0.6rem;">${p.badge}</span>` : ''}
                <h3 class="product-title">${p.name}</h3>
                <div class="product-rating"><div class="stars">${renderStars(p.rating)}</div><span class="rating-count">(${Math.floor(Math.random() * 100) + 10})</span></div>
                <div class="price-container">
                    ${hasDiscount ? `<span class="old-price">${p.oldPrice} ج</span>` : ''}
                    <span class="new-price">${p.price} ج</span>
                    ${hasDiscount ? `<span class="discount-badge">-${p.discount}%</span>` : ''}
                </div>
                <button class="add-to-cart" onclick="addToCart(${p.id})">🛒 أضف للسلة</button>
            </div>
        </div>
    `}).join('');
}

// ========== سلة التسوق ==========
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.quantity++; else cart.push({ ...product, quantity: 1 });
    saveCart(); showToast(`✅ تم إضافة ${product.name}`);
}

function saveCart() { localStorage.setItem('zarias_cart', JSON.stringify(cart)); updateCartUI(); }
function updateCartUI() {
    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('cartCount').innerText = totalItems;
    const container = document.getElementById('cartItemsList');
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    if (cart.length === 0) container.innerHTML = '<div style="text-align:center; padding:2rem;">🛍️ السلة فارغة</div>';
    else container.innerHTML = cart.map(item => `<div class="cart-item"><img src="${item.image}"><div class="cart-item-info"><h4>${item.name}</h4><div>${item.price} ج × ${item.quantity}</div><div><button onclick="updateQuantity(${item.id}, -1)">-</button><span>${item.quantity}</span><button onclick="updateQuantity(${item.id}, 1)">+</button><button onclick="removeFromCart(${item.id})">حذف</button></div></div></div>`).join('');
    document.getElementById('cartTotal').innerHTML = `الإجمالي: ${total} جنيه`;
}
function updateQuantity(id, delta) { const item = cart.find(i => i.id === id); if (item) { item.quantity += delta; if (item.quantity <= 0) cart = cart.filter(i => i.id !== id); saveCart(); } }
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); saveCart(); showToast('🗑️ تم الإزالة'); }

// ========== المفضلة ==========
function toggleFavorite(productId) {
    const product = products.find(p => p.id === productId);
    const index = favorites.findIndex(f => f.id === productId);
    if (index === -1) { favorites.push(product); showToast(`❤️ تم إضافة ${product.name} إلى المفضلة`); }
    else { favorites.splice(index, 1); showToast(`💔 تم إزالة ${product.name} من المفضلة`); }
    localStorage.setItem('zarias_favorites', JSON.stringify(favorites));
    document.getElementById('favoriteCount').innerText = favorites.length;
    renderProducts();
}

// ========== دوال عامة ==========
function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('active'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('active'); }
function openCart() { document.getElementById('cartSidebar').classList.add('open'); }
function closeCart() { document.getElementById('cartSidebar').classList.remove('open'); }
function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2000); }
function selectCategory(cat, el) { currentCategory = cat; document.querySelectorAll('.sidebar-category').forEach(c => c.classList.remove('active')); el.classList.add('active'); renderProducts(); closeSidebar(); }
function toggleSearch() { document.getElementById('searchModal').classList.toggle('active'); if (document.getElementById('searchModal').classList.contains('active')) document.getElementById('searchInput').focus(); }

// ========== إدارة المستخدم ==========
function saveUserAndProceed() {
    const name = document.getElementById('loginName').value, phone = document.getElementById('loginPhone').value, address = document.getElementById('loginAddress').value;
    if (!name || !phone) { alert('الاسم ورقم الهاتف مطلوبان'); return; }
    currentUser = { name, phone, address };
    localStorage.setItem('zarias_user', JSON.stringify(currentUser));
    document.getElementById('loginModal').classList.remove('active');
    showToast(`مرحباً ${name}!`);
}
function skipLogin() { document.getElementById('loginModal').classList.remove('active'); }

// ========== الأحداث ==========
document.getElementById('searchInput').addEventListener('input', handleSearch);
document.getElementById('searchBtn').onclick = toggleSearch;
document.getElementById('loginBtn').onclick = () => document.getElementById('loginModal').classList.add('active');
document.getElementById('cartBtn').onclick = openCart;
document.getElementById('menuBtn').onclick = openSidebar;

document.addEventListener('click', (e) => { const modal = document.getElementById('searchModal'); const btn = document.getElementById('searchBtn'); if (modal && btn && !modal.contains(e.target) && !btn.contains(e.target)) modal.classList.remove('active'); });

// ========== تحميل البيانات ==========
const savedFav = localStorage.getItem('zarias_favorites');
const savedProducts = localStorage.getItem('zarias_products');
if (savedProducts) products = JSON.parse(savedProducts);
if (savedFav) favorites = JSON.parse(savedFav);
document.getElementById('favoriteCount').innerText = favorites.length;
renderProducts();