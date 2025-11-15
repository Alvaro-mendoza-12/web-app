// Global variables
let products = [];
let reviews = [];
let cart = [];
let currentUser = null;
let orders = [];
let wishlist = [];
// Removed users array as authentication is now handled by Firebase

// Firebase references
let firebaseAuth = null;
let db = null;

// Initialize Firebase and load data
async function initializeApp() {
    // Wait for Firebase Auth to load
    let attempts = 0;
    while (!window.firebaseAuth && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not loaded');
        return;
    }

    firebaseAuth = window.firebaseAuth;

    // Setup auth listener
    firebaseAuth.onAuthStateChanged(firebaseAuth.auth, async (user) => {
        if (user) {
            currentUser = { id: user.uid, name: user.displayName || user.email, email: user.email };
            if (window.firestore) {
                db = window.firestore.db;
                await loadUserProfileFromFirestore(user.uid);
            }
            updateNavForLoggedInUser();
            // Redirect to profile if on login/register page
            if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
                window.location.href = 'profile.html';
            }
        } else {
            currentUser = null;
            updateNavForLoggedOutUser();
        }
    });

    if (window.firestore) {
        db = window.firestore.db;

        // Load data from Firestore
        await loadProductsFromFirestore();
        await loadReviewsFromFirestore();
        await loadOrdersFromFirestore();

        // Load cart from localStorage (for now, later migrate to Firestore)
        cart = JSON.parse(localStorage.getItem('cart')) || [];

        // Load UI
        loadFeaturedProducts();
        loadProducts();
        loadProductDetail();
        loadCart();
        loadUserInfo();
        loadOrderHistory();
        await loadWishlistFromFirestore();
        loadWishlist();
    } else {
        console.log('Firestore not initialized, using local data');
        // Load cart from localStorage
        cart = JSON.parse(localStorage.getItem('cart')) || [];
        wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    }

    setupEventListeners();
}

// Setup hamburger menu (independent of Firebase)
function setupHamburgerMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
}

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup hamburger menu immediately (not dependent on Firebase)
    setupHamburgerMenu();
    // Initialize app (Firebase dependent)
    initializeApp();
});

// Load featured products on home page
function loadFeaturedProducts() {
    const featuredContainer = document.getElementById('featured-products');
    if (!featuredContainer) return;

    const featuredProducts = products.slice(0, 4);
    featuredContainer.innerHTML = featuredProducts.map(product => `
        <div class="product fade-in">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
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
        <div class="product fade-in">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
            <a href="product-detail.html?id=${product.id}" class="btn">Ver Detalles</a>
        </div>
    `).join('');
}

// Load product detail
function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-image').src = product.image;
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-price').textContent = `$${product.price}`;
    document.getElementById('product-description').textContent = product.description;

    // Load reviews
    const productReviews = reviews.filter(r => r.productId == productId);
    const reviewContainer = document.getElementById('review-list');
    reviewContainer.innerHTML = productReviews.map(review => `
        <div class="review">
            <h4>${review.user}</h4>
            <div class="rating">${'⭐'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
            <p>${review.comment}</p>
            <p class="review-date">${new Date(review.date).toLocaleDateString()}</p>
        </div>
    `).join('');

    // Show review form always visible
    const addReviewDiv = document.getElementById('add-review');
    if (addReviewDiv) {
        addReviewDiv.style.display = 'block';
    }
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

    // Load user reviews
    loadUserReviews();
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
    // Hamburger menu toggle is already set up in setupHamburgerMenu()

    // Add to cart button
    const addToCartBtn = document.getElementById('add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            addToCart(productId);
        });
    }

    // Add to wishlist button
    const addToWishlistBtn = document.getElementById('add-to-wishlist');
    if (addToWishlistBtn) {
        addToWishlistBtn.addEventListener('click', async function() {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            await addToWishlist(productId);
            await saveWishlistToFirestore();
        });
    }

    // Review form
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            const rating = document.getElementById('rating').value;
            const comment = document.getElementById('comment').value;
            await addReview(productId, rating, comment);
        });
    }

    // Filters
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search');
    const sortFilter = document.getElementById('sort-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', filterProducts);
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
    const sortBy = document.getElementById('sort-filter') ? document.getElementById('sort-filter').value : '';

    let filteredProducts = products;

    if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
    }

    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    // Sorting
    if (sortBy) {
        switch (sortBy) {
            case 'price-low':
                filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'rating':
                filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
        }
    }

    const productContainer = document.getElementById('product-list');
    productContainer.innerHTML = filteredProducts.map(product => `
        <div class="product fade-in">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
            <a href="product-detail.html?id=${product.id}" class="btn">Ver Detalles</a>
        </div>
    `).join('');
}

// Login
async function login(email, password) {
    try {
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(firebaseAuth.auth, email, password);
        console.log('Usuario autenticado:', userCredential.user);
        // No alert needed, handled by onAuthStateChanged
    } catch (error) {
        alert('Error en el inicio de sesión: ' + error.message);
    }
}

// Register
async function register(name, email, password) {
    try {
        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAuth.auth, email, password);
        console.log('Usuario registrado:', userCredential.user);
        // Update display name
        await firebaseAuth.updateProfile(firebaseAuth.auth.currentUser, {
            displayName: name
        });
        // No alert needed, handled by onAuthStateChanged
    } catch (error) {
        alert('Error en el registro: ' + error.message);
    }
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
    console.log('Google register button clicked');
    if (!firebaseAuth) {
        console.error('Firebase Auth not initialized');
        alert('Error: Firebase Auth no inicializado');
        return;
    }
    try {
        const result = await firebaseAuth.signInWithPopup(firebaseAuth.auth, firebaseAuth.provider);
        console.log('Usuario registrado:', result.user);
        // No alert needed, handled by onAuthStateChanged
    } catch (error) {
        console.error('Error en el registro con Google:', error);
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



// Update navigation for logged in user
function updateNavForLoggedInUser() {
    const nav = document.querySelector('nav ul');
    if (nav) {
        nav.innerHTML = `
            <li><a href="index.html"><i class="fas fa-home"></i> Inicio</a></li>
            <li><a href="products.html"><i class="fas fa-tshirt"></i> Productos</a></li>
            <li><a href="cart.html"><i class="fas fa-shopping-cart"></i> Carrito</a></li>
            <li><a href="about.html"><i class="fas fa-info-circle"></i> Acerca de</a></li>
            <li><a href="contact.html"><i class="fas fa-envelope"></i> Contacto</a></li>
            <li><a href="profile.html"><i class="fas fa-user"></i> Perfil</a></li>
            <li><a href="#" id="logout"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a></li>
        `;
        document.getElementById('logout').addEventListener('click', logout);
    }
}

// Update navigation for logged out user
function updateNavForLoggedOutUser() {
    const nav = document.querySelector('nav ul');
    if (nav) {
        nav.innerHTML = `
            <li><a href="index.html"><i class="fas fa-home"></i> Inicio</a></li>
            <li><a href="products.html"><i class="fas fa-tshirt"></i> Productos</a></li>
            <li><a href="cart.html"><i class="fas fa-shopping-cart"></i> Carrito</a></li>
            <li><a href="about.html"><i class="fas fa-info-circle"></i> Acerca de</a></li>
            <li><a href="contact.html"><i class="fas fa-envelope"></i> Contacto</a></li>
            <li><a href="login.html"><i class="fas fa-sign-in-alt"></i> Iniciar Sesión</a></li>
        `;
    }
}

// Logout
function logout() {
    if (firebaseAuth) {
        firebaseAuth.signOut(firebaseAuth.auth);
    }
    currentUser = null;
    updateNavForLoggedOutUser();
    window.location.href = 'index.html';
}

// Process order
async function processOrder() {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = {
        id: Date.now(),
        userId: currentUser.id,
        items: cart,
        total,
        date: new Date().toLocaleDateString(),
        status: 'Pendiente'
    };

    try {
        await addDoc(collection(db, 'orders'), order);
        orders.push(order);
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        alert('Pedido realizado exitosamente');
        window.location.href = 'profile.html';
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Error al procesar el pedido. Inténtalo de nuevo.');
    }
}

// Firestore data loading functions
async function loadProductsFromFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Products loaded from Firestore:', products.length);
    } catch (error) {
        console.error('Error loading products:', error);
        // Fallback to sample data if Firestore fails
        products = [
            { id: '1', name: 'Camisa Casual', price: 25, category: 'hombre', image: 'images/camisa.jpg', description: 'Camisa cómoda para el día a día.' },
            { id: '2', name: 'Vestido Elegante', price: 50, category: 'mujer', image: 'images/vestido.jpg', description: 'Vestido perfecto para ocasiones especiales.' },
            { id: '3', name: 'Pantalones Jeans', price: 40, category: 'hombre', image: 'images/pantalones.jpg', description: 'Pantalones jeans de alta calidad.' },
            { id: '4', name: 'Blusa Floral', price: 30, category: 'mujer', image: 'images/blusa.jpg', description: 'Blusa con estampado floral.' },
            { id: '5', name: 'Zapatillas Deportivas', price: 60, category: 'hombre', image: 'images/zapatillas.jpg', description: 'Zapatillas cómodas para el deporte.' },
            { id: '6', name: 'Falda Plisada', price: 35, category: 'mujer', image: 'images/falda.jpg', description: 'Falda plisada elegante.' },
            { id: '7', name: 'Sudadera con Capucha', price: 45, category: 'hombre', image: 'images/sudadera.jpg', description: 'Sudadera cálida y cómoda.' },
            { id: '8', name: 'Bolso de Mano', price: 55, category: 'accesorios', image: 'images/bolso.jpg', description: 'Bolso elegante para llevar tus essentials.' },
            { id: '9', name: 'Gorra Deportiva', price: 20, category: 'accesorios', image: 'images/gorra.jpg', description: 'Gorra perfecta para actividades al aire libre.' },
            { id: '10', name: 'Vestido de Niña', price: 28, category: 'ninos', image: 'images/vestido-nina.jpg', description: 'Vestido adorable para niñas.' },
            { id: '11', name: 'Camiseta de Niño', price: 15, category: 'ninos', image: 'images/camiseta-nino.jpg', description: 'Camiseta cómoda para niños.' },
            { id: '12', name: 'Pantalones Cortos', price: 22, category: 'ninos', image: 'images/pantalones-cortos.jpg', description: 'Pantalones cortos ideales para el verano.' }
        ];
    }
}

async function loadReviewsFromFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, 'reviews'));
        reviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Reviews loaded from Firestore:', reviews.length);
    } catch (error) {
        console.error('Error loading reviews:', error);
        // Fallback to sample data
        reviews = [
            { productId: '1', user: 'Juan', rating: 5, comment: 'Excelente calidad, muy cómodo.' },
            { productId: '1', user: 'María', rating: 4, comment: 'Buen producto, llegó rápido.' },
            { productId: '2', user: 'Ana', rating: 5, comment: 'Me encanta, perfecto para una cena.' }
        ];
    }
}

async function loadOrdersFromFirestore() {
    if (!currentUser) return;
    try {
        const q = query(collection(db, 'orders'), where('userId', '==', currentUser.id));
        const querySnapshot = await getDocs(q);
        orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Orders loaded from Firestore:', orders.length);
    } catch (error) {
        console.error('Error loading orders:', error);
        orders = [];
    }
}

async function loadUserProfileFromFirestore(uid) {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const userData = docSnap.data();
            currentUser = { ...currentUser, ...userData };
        } else {
            // Create user profile if it doesn't exist
            await setDoc(docRef, {
                name: currentUser.name,
                email: currentUser.email,
                createdAt: new Date()
            });
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Load wishlist
function loadWishlist() {
    const wishlistContainer = document.getElementById('wishlist-items');
    if (!wishlistContainer) return;

    wishlistContainer.innerHTML = wishlist.map(item => `
        <div class="wishlist-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="wishlist-item-details">
                <h3>${item.name}</h3>
                <p>$${item.price}</p>
            </div>
            <button onclick="addToCart(${item.id})" class="btn">Agregar al Carrito</button>
            <button onclick="removeFromWishlist(${item.id})" class="btn">Eliminar</button>
        </div>
    `).join('');
}

// Add to wishlist
function addToWishlist(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = wishlist.find(item => item.id === productId);
    if (!existingItem) {
        wishlist.push(product);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        alert('Producto agregado a la lista de deseos');
    } else {
        alert('El producto ya está en la lista de deseos');
    }
}

// Remove from wishlist
function removeFromWishlist(productId) {
    wishlist = wishlist.filter(item => item.id !== productId);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    loadWishlist();
}

// Load wishlist from Firestore
async function loadWishlistFromFirestore() {
    if (!currentUser) return;
    try {
        const q = query(collection(db, 'wishlists'), where('userId', '==', currentUser.id));
        const querySnapshot = await getDocs(q);
        wishlist = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Wishlist loaded from Firestore:', wishlist.length);
    } catch (error) {
        console.error('Error loading wishlist:', error);
        wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    }
}

// Save wishlist to Firestore
async function saveWishlistToFirestore() {
    if (!currentUser) return;
    try {
        const userWishlistRef = collection(db, 'wishlists');
        // Clear existing wishlist
        const q = query(userWishlistRef, where('userId', '==', currentUser.id));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
        // Add new wishlist items
        for (const item of wishlist) {
            await addDoc(userWishlistRef, { ...item, userId: currentUser.id });
        }
    } catch (error) {
        console.error('Error saving wishlist:', error);
    }
}

// Add review
async function addReview(productId, rating, comment) {
    const userName = currentUser ? currentUser.name : 'Anónimo';
    const userId = currentUser ? currentUser.id : null;
    try {
        await addDoc(collection(db, 'reviews'), {
            productId,
            userId,
            user: userName,
            rating: parseInt(rating),
            comment,
            date: new Date().toISOString()
        });
        alert('Reseña agregada exitosamente');
        loadProductDetail(); // Reload to show new review
    } catch (error) {
        console.error('Error adding review:', error);
        alert('Error al agregar la reseña. Inténtalo de nuevo.');
    }
}

// Load user reviews
function loadUserReviews() {
    const userReviewsContainer = document.getElementById('user-reviews');
    if (!userReviewsContainer || !currentUser) return;

    const userReviews = reviews.filter(r => r.userId === currentUser.id);
    userReviewsContainer.innerHTML = userReviews.map(review => `
        <div class="review">
            <h4>Producto: ${products.find(p => p.id === review.productId)?.name || 'Producto desconocido'}</h4>
            <div class="rating">${'⭐'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
            <p>${review.comment}</p>
            <p>Fecha: ${new Date(review.date).toLocaleDateString()}</p>
        </div>
    `).join('');
}


