const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== Middleware ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// ========== إعداد رفع الصور ==========
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// ========== قاعدة البيانات ==========
const DATA_FILE = path.join(__dirname, 'data', 'database.json');

// تهيئة قاعدة البيانات
function initDatabase() {
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
        fs.mkdirSync(path.join(__dirname, 'data'));
    }
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            products: [
                { 
                    id: 1, 
                    name: "أحمر شفاه وردي", 
                    desc: "لون ثابت يدوم طويلاً، تركيبة غنية بزيت الأرغان", 
                    price: 89, 
                    category: "مكياج", 
                    rating: 4.5, 
                    sales: 120, 
                    image: "/uploads/default1.jpg", 
                    badge: "الأكثر مبيعاً", 
                    stock: 50, 
                    createdAt: new Date().toISOString() 
                },
                { 
                    id: 2, 
                    name: "سيروم فيتامين C", 
                    desc: "مشرق للبشرة، يقلل التصبغات ويمنح نضارة فورية", 
                    price: 159, 
                    category: "عناية بالبشرة", 
                    rating: 5, 
                    sales: 85, 
                    image: "/uploads/default2.jpg", 
                    badge: "جديد", 
                    stock: 30, 
                    createdAt: new Date().toISOString() 
                },
                { 
                    id: 3, 
                    name: "عطر وردي فاخر", 
                    desc: "روائح شرقية فواحة تدوم طويلاً، 50 مل", 
                    price: 220, 
                    category: "عطور", 
                    rating: 4.8, 
                    sales: 45, 
                    image: "/uploads/default3.jpg", 
                    badge: "فاخر", 
                    stock: 20, 
                    createdAt: new Date().toISOString() 
                }
            ],
            users: [],
            orders: [],
            admins: [{ 
                username: "admin", 
                password: bcrypt.hashSync("ZariasAdmin2025", 10) 
            }],
            settings: { 
                siteName: "Zarias", 
                deliveryFee: 30, 
                freeDeliveryThreshold: 200 
            }
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
}

function readDatabase() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeDatabase(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
    return Date.now() + Math.floor(Math.random() * 10000);
}

initDatabase();

// ========== دوال مساعدة ==========
function sanitizeInput(str) {
    if (!str) return '';
    return str.replace(/[&<>/\\]/g, function(match) {
        const escape = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '/': '&#x2F;',
            '\\': '&#x5C;'
        };
        return escape[match];
    });
}

function validatePhone(phone) {
    return /^01[0-9]{9}$/.test(phone);
}

function validatePrice(price) {
    return !isNaN(price) && price > 0 && price < 100000;
}

// ========== Middleware التوثيق ==========
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ success: false, message: 'غير مصرح به' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zarias_secret_key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
};

const verifyAdmin = (req, res, next) => {
    const adminPassword = req.headers['admin-password'];
    const db = readDatabase();
    const admin = db.admins[0];
    if (!admin || !bcrypt.compareSync(adminPassword, admin.password)) {
        return res.status(403).json({ success: false, message: 'غير مصرح به - كلمة مرور غير صحيحة' });
    }
    next();
};

// ========== مسارات API ==========

// ===== المنتجات =====
app.get('/api/products', (req, res) => {
    const db = readDatabase();
    let { category, search, sort } = req.query;
    let products = [...db.products];
    
    if (category && category !== 'all') {
        products = products.filter(p => p.category === category);
    }
    if (search) {
        products = products.filter(p => p.name.includes(search) || p.desc.includes(search));
    }
    
    switch(sort) {
        case 'bestseller':
            products.sort((a, b) => (b.sales || 0) - (a.sales || 0));
            break;
        case 'price_asc':
            products.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            products.sort((a, b) => b.price - a.price);
            break;
        case 'rating':
            products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        default:
            products.sort((a, b) => a.id - b.id);
    }
    
    res.json({ success: true, products });
});

app.get('/api/products/:id', (req, res) => {
    const db = readDatabase();
    const product = db.products.find(p => p.id == req.params.id);
    if (!product) {
        return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }
    res.json({ success: true, product });
});

app.post('/api/products', verifyAdmin, upload.single('image'), (req, res) => {
    const db = readDatabase();
    const { name, desc, price, category, rating, badge, stock } = req.body;
    
    const cleanName = sanitizeInput(name);
    const cleanDesc = sanitizeInput(desc);
    
    if (!cleanName || !validatePrice(parseFloat(price))) {
        return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
    }
    
    const newProduct = {
        id: generateId(),
        name: cleanName,
        desc: cleanDesc,
        price: parseFloat(price),
        category: category || 'مكياج',
        rating: parseFloat(rating) || 4,
        sales: 0,
        image: req.file ? `/uploads/${req.file.filename}` : '/uploads/default.jpg',
        badge: sanitizeInput(badge) || '',
        stock: parseInt(stock) || 0,
        createdAt: new Date().toISOString()
    };
    
    db.products.push(newProduct);
    writeDatabase(db);
    res.json({ success: true, product: newProduct });
});

app.put('/api/products/:id', verifyAdmin, upload.single('image'), (req, res) => {
    let db = readDatabase();
    const index = db.products.findIndex(p => p.id == req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }
    
    if (req.file && db.products[index].image && db.products[index].image !== '/uploads/default.jpg') {
        const oldPath = path.join(__dirname, db.products[index].image);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }
    
    db.products[index] = {
        ...db.products[index],
        name: sanitizeInput(req.body.name) || db.products[index].name,
        desc: sanitizeInput(req.body.desc) || db.products[index].desc,
        price: req.body.price ? parseFloat(req.body.price) : db.products[index].price,
        category: req.body.category || db.products[index].category,
        rating: req.body.rating ? parseFloat(req.body.rating) : db.products[index].rating,
        badge: sanitizeInput(req.body.badge) || db.products[index].badge,
        stock: req.body.stock ? parseInt(req.body.stock) : db.products[index].stock,
        image: req.file ? `/uploads/${req.file.filename}` : db.products[index].image
    };
    
    writeDatabase(db);
    res.json({ success: true, product: db.products[index] });
});

app.delete('/api/products/:id', verifyAdmin, (req, res) => {
    let db = readDatabase();
    const product = db.products.find(p => p.id == req.params.id);
    
    if (product && product.image && product.image !== '/uploads/default.jpg') {
        const imagePath = path.join(__dirname, product.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
    
    db.products = db.products.filter(p => p.id != req.params.id);
    writeDatabase(db);
    res.json({ success: true });
});

// ===== المستخدمين =====
app.post('/api/auth/register', (req, res) => {
    const db = readDatabase();
    const { name, phone, address, password } = req.body;
    
    const cleanName = sanitizeInput(name);
    
    if (!cleanName || !validatePhone(phone)) {
        return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
    }
    
    if (db.users.find(u => u.phone === phone)) {
        return res.status(400).json({ success: false, message: 'رقم الهاتف مسجل مسبقاً' });
    }
    
    const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
    
    const newUser = {
        id: generateId(),
        name: cleanName,
        phone: phone,
        address: sanitizeInput(address) || '',
        password: hashedPassword,
        role: 'user',
        createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    writeDatabase(db);
    
    const token = jwt.sign(
        { id: newUser.id, name: newUser.name, phone: newUser.phone },
        process.env.JWT_SECRET || 'zarias_secret_key',
        { expiresIn: '7d' }
    );
    
    res.json({
        success: true,
        user: { id: newUser.id, name: newUser.name, phone: newUser.phone },
        token
    });
});

app.post('/api/auth/login', (req, res) => {
    const db = readDatabase();
    const { phone, password } = req.body;
    
    const user = db.users.find(u => u.phone === phone);
    
    if (!user) {
        return res.status(401).json({ success: false, message: 'رقم الهاتف غير مسجل' });
    }
    
    if (user.password && !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }
    
    const token = jwt.sign(
        { id: user.id, name: user.name, phone: user.phone },
        process.env.JWT_SECRET || 'zarias_secret_key',
        { expiresIn: '7d' }
    );
    
    res.json({
        success: true,
        user: { id: user.id, name: user.name, phone: user.phone, address: user.address },
        token
    });
});

// ===== الطلبات =====
app.post('/api/orders', verifyToken, (req, res) => {
    const db = readDatabase();
    const { items, total, paymentMethod, address } = req.body;
    const user = db.users.find(u => u.id === req.user.id);
    
    if (!user) {
        return res.status(401).json({ success: false, message: 'مستخدم غير موجود' });
    }
    
    const orderNumber = 'ZRS-' + Date.now().toString().slice(-8);
    
    const newOrder = {
        id: generateId(),
        orderNumber: orderNumber,
        userId: user.id,
        customer: {
            name: user.name,
            phone: user.phone,
            address: address || user.address || ''
        },
        items: items,
        total: total,
        paymentMethod: paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    db.orders.push(newOrder);
    writeDatabase(db);
    
    res.json({ success: true, order: newOrder });
});

app.get('/api/orders/my', verifyToken, (req, res) => {
    const db = readDatabase();
    const userOrders = db.orders
        .filter(o => o.userId === req.user.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, orders: userOrders });
});

app.get('/api/orders/:orderNumber', (req, res) => {
    const db = readDatabase();
    const order = db.orders.find(o => o.orderNumber === req.params.orderNumber);
    
    if (!order) {
        return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    
    res.json({ success: true, order });
});

app.put('/api/orders/:orderNumber/status', verifyAdmin, (req, res) => {
    let db = readDatabase();
    const order = db.orders.find(o => o.orderNumber === req.params.orderNumber);
    
    if (!order) {
        return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    
    order.status = req.body.status;
    order.updatedAt = new Date().toISOString();
    writeDatabase(db);
    
    res.json({ success: true, order });
});

// ===== إحصائيات المشرف =====
app.get('/api/admin/stats', verifyAdmin, (req, res) => {
    const db = readDatabase();
    
    const stats = {
        totalProducts: db.products.length,
        totalOrders: db.orders.length,
        totalUsers: db.users.length,
        totalRevenue: db.orders.reduce((sum, o) => sum + o.total, 0),
        pendingOrders: db.orders.filter(o => o.status === 'pending').length
    };
    
    res.json({ success: true, stats });
});

app.get('/api/admin/orders', verifyAdmin, (req, res) => {
    const db = readDatabase();
    const orders = db.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, orders });
});

// ===== التحقق من كلمة مرور المشرف =====
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    const db = readDatabase();
    const admin = db.admins[0];
    
    if (admin && bcrypt.compareSync(password, admin.password)) {
        res.json({ success: true, message: 'كلمة المرور صحيحة' });
    } else {
        res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }
});

// ===== رفع الصور =====
app.post('/api/upload', verifyAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'لم يتم رفع الصورة' });
    }
    res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
});

// ===== مسار ترحيبي =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== تشغيل الخادم =====
app.listen(PORT, () => {
    console.log(`✅ Zarias Backend running at http://localhost:${PORT}`);
    console.log(`🔒 Admin password: ZariasAdmin2025`);
    console.log(`📁 API: http://localhost:${PORT}/api/products`);
});