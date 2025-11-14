// Sample product data
const products = [
    { id: 1, name: 'Camisa Casual', price: 25, category: 'hombre', image: 'images/camisa.jpg', description: 'Camisa cómoda para el día a día.' },
    { id: 2, name: 'Vestido Elegante', price: 50, category: 'mujer', image: 'images/vestido.jpg', description: 'Vestido perfecto para ocasiones especiales.' },
    { id: 3, name: 'Pantalones Jeans', price: 40, category: 'hombre', image: 'images/pantalones.jpg', description: 'Pantalones jeans de alta calidad.' },
    { id: 4, name: 'Blusa Floral', price: 30, category: 'mujer', image: 'images/blusa.jpg', description: 'Blusa con estampado floral.' },
    { id: 5, name: 'Zapatillas Deportivas', price: 60, category: 'hombre', image: 'images/zapatillas.jpg', description: 'Zapatillas cómodas para el deporte.' },
    { id: 6, name: 'Falda Plisada', price: 35, category: 'mujer', image: 'images/falda.jpg', description: 'Falda plisada elegante.' },
    { id: 7, name: 'Sudadera con Capucha', price: 45, category: 'hombre', image: 'images/sudadera.jpg', description: 'Sudadera cálida y cómoda.' },
    { id: 8, name: 'Bolso de Mano', price: 55, category: 'accesorios', image: 'images/bolso.jpg', description: 'Bolso elegante para llevar tus essentials.' },
    { id: 9, name: 'Gorra Deportiva', price: 20, category: 'accesorios', image: 'images/gorra.jpg', description: 'Gorra perfecta para actividades al aire libre.' },
    { id: 10, name: 'Vestido de Niña', price: 28, category: 'ninos', image: 'images/vestido-nina.jpg', description: 'Vestido adorable para niñas.' },
    { id: 11, name: 'Camiseta de Niño', price: 15, category: 'ninos', image: 'images/camiseta-nino.jpg', description: 'Camiseta cómoda para niños.' },
    { id: 12, name: 'Pantalones Cortos', price: 22, category: 'ninos', image: 'images/pantalones-cortos.jpg', description: 'Pantalones cortos ideales para el verano.' }
];

// Sample reviews
const reviews = [
    { productId: 1, user: 'Juan', rating: 5, comment: 'Excelente calidad, muy cómodo.' },
    { productId: 1, user: 'María', rating: 4, comment: 'Buen producto, llegó rápido.' },
    { productId: 2, user: 'Ana', rating: 5, comment: 'Me encanta, perfecto para una cena.' }
];

// Cart functionality
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// User authentication
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let users = JSON.parse(localStorage.getItem('users')) || [];

// Orders
let orders = JSON.parse(localStorage.getItem('orders')) || [];

// Firebase Auth
let firebaseAuth = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    loadFeaturedProducts();
    loadProducts();
    loadProductDetail();
    loadCart();
    loadUserInfo();
    loadOrderHistory();
    setupEventListeners();

    // Handle Firebase redirect result
    if (window.firebaseAuth) {
        firebaseAuth.getRedirectResult(firebaseAuth.auth).then((result) => {
            if (result.user) {
                // User successfully signed in with redirect
                console.log('User signed in with redirect:', result.user);
            }
        }).catch((error) => {
            console.error('Redirect sign-in error:', error);
        });
    }
});

// Load featured products on home page
function loadFeaturedProducts() {
    const featuredContainer = document.getElementById('featured-products');
    if (!featuredContainer) return;

    const featuredProducts = products.slice(0, 4);
    featuredContainer.innerHTML = featuredProducts.map(product => `
        <div class="product">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
            <a href="product-detail.html?id=${product.id}" class="btn">Ver Detalles</a>
        </div>
    `).join('');
}

// Load products on products page
function loadProducts() {
    const productContainer = document.getElementById('product-list');
    if (!productContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');

    let filteredProducts = category ? products.filter(p => p.category === category) : products;

    productContainer.innerHTML = filteredProducts.map(product => `
        <div class="product">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
            <a href="product-detail.html?id=${product.id}" class="btn">Ver Detalles</a>
        </div>
    `).join('');
}

// Load product detail
function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    if (!productId) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-image').src = product.image;
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-price').textContent = `$${product.price}`;
    document.getElementById('product-description').textContent = product.description;

    // Load reviews
    const productReviews = reviews.filter(r => r.productId === productId);
    const reviewContainer = document.getElementById('review-list');
    reviewContainer.innerHTML = productReviews.map(review => `
        <div class="review">
            <h4>${review.user}</h4>
            <p>Calificación: ${review.rating}/5</p>
            <p>${review.comment}</p>
        </div>
    `).join('');
}

// Load cart
function loadCart() {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;

    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <p>Talla: ${item.size}, Color: ${item.color}</p>
                <p>Cantidad: ${item.quantity}</p>
                <p>Precio: $${item.price * item.quantity}</p>
            </div>
            <button onclick="removeFromCart(${item.id})" class="btn">Eliminar</button>
        </div>
    `).join('');

    const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    document.getElementById('total-price').textContent = totalPrice;
}

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const size = document.getElementById('size').value;
    const color = document.getElementById('color').value;

    const existingItem = cart.find(item => item.id === productId && item.size === size && item.color === color);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, size, color, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Producto agregado al carrito');
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

// Load user info
function loadUserInfo() {
    const userInfoContainer = document.getElementById('user-info');
    if (!userInfoContainer || !currentUser) return;

    userInfoContainer.innerHTML = `
        <h3>Información del Usuario</h3>
        <p>Nombre: ${currentUser.name}</p>
        <p>Email: ${currentUser.email}</p>
    `;
}

// Load order history
function loadOrderHistory() {
    const orderContainer = document.getElementById('order-history');
    if (!orderContainer || !currentUser) return;

    const userOrders = orders.filter(o => o.userId === currentUser.id);
    orderContainer.innerHTML = userOrders.map(order => `
        <div class="order">
            <h4>Pedido #${order.id}</h4>
            <p>Fecha: ${order.date}</p>
            <p>Total: $${order.total}</p>
            <p>Estado: ${order.status}</p>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Initialize Firebase Auth
    if (window.firebaseAuth) {
        firebaseAuth = window.firebaseAuth;
        firebaseAuth.onAuthStateChanged(firebaseAuth.auth, (user) => {
            if (user) {
                currentUser = { id: user.uid, name: user.displayName || user.email, email: user.email };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateNavForLoggedInUser();
                // Redirect to profile if on login/register page
                if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
                    window.location.href = 'profile.html';
                }
            } else {
                currentUser = null;
                localStorage.removeItem('currentUser');
                updateNavForLoggedOutUser();
            }
        });
    }

    // Add to cart button
    const addToCartBtn = document.getElementById('add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = parseInt(urlParams.get('id'));
            addToCart(productId);
        });
    }

    // Filters
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            login(email, password);
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            register(name, email, password);
        });
    }

    // Google Login
    const googleLoginBtn = document.getElementById('google-login');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', googleLogin);
    }

    // Google Register
    const googleRegisterBtn = document.getElementById('google-register');
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', googleRegister);
    }

    // Phone Login
    const phoneLoginBtn = document.getElementById('phone-login');
    if (phoneLoginBtn) {
        phoneLoginBtn.addEventListener('click', function() {
            const phoneNumber = prompt('Ingresa tu número de teléfono (con código de país, ej: +1234567890):');
            if (phoneNumber) {
                phoneLogin(phoneNumber);
            }
        });
    }

    // Anonymous Login
    const anonymousLoginBtn = document.getElementById('anonymous-login');
    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', anonymousLogin);
    }

    // Checkout form
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!currentUser) {
                alert('Debes iniciar sesión para realizar un pedido');
                window.location.href = 'login.html';
                return;
            }
            processOrder();
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const message = document.getElementById('contact-message').value;
            alert(`Gracias ${name}, tu mensaje ha sido enviado. Te contactaremos pronto.`);
            contactForm.reset();
        });
    }
}

// Filter products
function filterProducts() {
    const category = document.getElementById('category-filter').value;
    const searchTerm = document.getElementById('search').value.toLowerCase();

    let filteredProducts = products;

    if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
    }

    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    const productContainer = document.getElementById('product-list');
    productContainer.innerHTML = filteredProducts.map(product => `
        <div class="product">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
            <a href="product-detail.html?id=${product.id}" class="btn">Ver Detalles</a>
        </div>
    `).join('');
}

// Login
function login(email, password) {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        alert('Inicio de sesión exitoso');
        window.location.href = 'profile.html';
    } else {
        alert('Credenciales incorrectas');
    }
}

// Register
function register(name, email, password) {
    if (users.find(u => u.email === email)) {
        alert('El email ya está registrado');
        return;
    }

    const newUser = { id: Date.now(), name, email, password };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    alert('Registro exitoso. Ahora puedes iniciar sesión.');
    window.location.href = 'login.html';
}

// Google Login
async function googleLogin() {
    try {
        const result = await firebaseAuth.signInWithPopup(firebaseAuth.auth, firebaseAuth.provider);
        console.log('Usuario autenticado:', result.user);
        // No alert needed, handled by onAuthStateChanged
    } catch (error) {
        alert('Error en el inicio de sesión con Google: ' + error.message);
    }
}

// Google Register
async function googleRegister() {
    try {
        const result = await firebaseAuth.signInWithPopup(firebaseAuth.auth, firebaseAuth.provider);
        console.log('Usuario registrado:', result.user);
        // No alert needed, handled by onAuthStateChanged
    } catch (error) {
        alert('Error en el registro con Google: ' + error.message);
    }
}

// Phone Login
async function phoneLogin(phoneNumber) {
    try {
        const appVerifier = new firebaseAuth.RecaptchaVerifier('recaptcha-container', {
            size: 'invisible'
        });
        const confirmationResult = await firebaseAuth.signInWithPhoneNumber(firebaseAuth.auth, phoneNumber, appVerifier);
        const code = prompt('Ingresa el código de verificación enviado a tu teléfono:');
        const result = await confirmationResult.confirm(code);
        alert('Inicio de sesión con teléfono exitoso');
        window.location.href = 'profile.html';
    } catch (error) {
        alert('Error en el inicio de sesión con teléfono: ' + error.message);
    }
}

// Anonymous Login
async function anonymousLogin() {
    try {
        const result = await firebaseAuth.signInAnonymously(firebaseAuth.auth);
        alert('Inicio de sesión anónimo exitoso');
        window.location.href = 'profile.html';
    } catch (error) {
        alert('Error en el inicio de sesión anónimo: ' + error.message);
    }
}

// Update navigation for logged in user
function updateNavForLoggedInUser() {
    const nav = document.querySelector('nav ul');
    if (nav) {
        nav.innerHTML = `
            <li><a href="index.html">Inicio</a></li>
            <li><a href="products.html">Productos</a></li>
            <li><a href="cart.html">Carrito</a></li>
            <li><a href="about.html">Acerca de</a></li>
            <li><a href="contact.html">Contacto</a></li>
            <li><a href="profile.html">Perfil</a></li>
            <li><a href="#" id="logout">Cerrar Sesión</a></li>
        `;
        document.getElementById('logout').addEventListener('click', logout);
    }
}

// Update navigation for logged out user
function updateNavForLoggedOutUser() {
    const nav = document.querySelector('nav ul');
    if (nav) {
        nav.innerHTML = `
            <li><a href="index.html">Inicio</a></li>
            <li><a href="products.html">Productos</a></li>
            <li><a href="cart.html">Carrito</a></li>
            <li><a href="about.html">Acerca de</a></li>
            <li><a href="contact.html">Contacto</a></li>
            <li><a href="login.html">Iniciar Sesión</a></li>
        `;
    }
}

// Logout
function logout() {
    if (firebaseAuth) {
        firebaseAuth.signOut(firebaseAuth.auth);
    }
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateNavForLoggedOutUser();
    window.location.href = 'index.html';
}

// Process order
function processOrder() {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = {
        id: Date.now(),
        userId: currentUser.id,
        items: cart,
        total,
        date: new Date().toLocaleDateString(),
        status: 'Pendiente'
    };

    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Pedido realizado exitosamente');
    window.location.href = 'profile.html';
}
