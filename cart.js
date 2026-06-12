/**
 * Shopping Cart & Drawer Manager
 * 
 * Manages cart state, handles local storage synchronization, renders items,
 * and controls drawer slide animations.
 */

class ShoppingCart {
  constructor() {
    this.items = [];
    this.isOpen = false;
    this.init();
  }

  init() {
    // Load saved cart state
    const savedCart = localStorage.getItem('skin_cart');
    if (savedCart) {
      try {
        this.items = JSON.parse(savedCart);
      } catch (e) {
        this.items = [];
      }
    }
    
    // Bind DOM elements after page load
    document.addEventListener('DOMContentLoaded', () => {
      this.bindEvents();
      this.updateUI();
    });
  }

  bindEvents() {
    const cartToggle = document.getElementById('cart-toggle');
    const closeCart = document.getElementById('close-cart');
    const cartOverlay = document.getElementById('cart-overlay');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cartToggle) cartToggle.addEventListener('click', () => this.open());
    if (closeCart) closeCart.addEventListener('click', () => this.close());
    if (cartOverlay) cartOverlay.addEventListener('click', () => this.close());
    
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.handleCheckout());
    }
  }

  open() {
    this.isOpen = true;
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent body scrolling
    }
    this.render();
  }

  close() {
    this.isOpen = false;
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      
      // Only restore scroll if no other fullscreen overlay is active
      const quizModal = document.getElementById('quiz-modal');
      const authModal = document.getElementById('auth-modal');
      if ((!quizModal || !quizModal.classList.contains('active')) && 
          (!authModal || !authModal.classList.contains('active'))) {
        document.body.style.overflow = '';
      }
    }
  }

  addItem(product) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        tagline: product.tagline,
        price: product.price,
        image: product.image,
        volume: product.volume,
        quantity: 1
      });
    }

    this.save();
    this.updateUI();
    this.open(); // Open drawer to show added product
    this.showFloatingToast(`${product.name} added to cart`);
  }

  removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
    this.updateUI();
  }

  updateQuantity(id, change) {
    const item = this.items.find(item => item.id === id);
    if (item) {
      item.quantity += change;
      if (item.quantity <= 0) {
        this.removeItem(id);
      } else {
        this.save();
        this.updateUI();
      }
    }
  }

  clear() {
    this.items = [];
    this.save();
    this.updateUI();
  }

  save() {
    localStorage.setItem('skin_cart', JSON.stringify(this.items));
  }

  getTotalAmount() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getTotalCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  updateUI() {
    const badge = document.getElementById('cart-count');
    if (badge) {
      const count = this.getTotalCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
    this.render();
  }

  render() {
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total-amount');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-message">
          <p class="empty-title">Your ritual cart is empty.</p>
          <p class="empty-subtitle">Select skincare formulations to begin your experience.</p>
        </div>
      `;
      if (totalElement) totalElement.textContent = '$0.00';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (checkoutBtn) checkoutBtn.disabled = false;

    let html = '';
    this.items.forEach(item => {
      html += `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-image-wrapper">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
          </div>
          <div class="cart-item-details">
            <div class="cart-item-header">
              <h4 class="cart-item-name">${item.name}</h4>
              <button class="cart-item-remove" onclick="window.Cart.removeItem('${item.id}')" aria-label="Remove item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p class="cart-item-volume">${item.volume}</p>
            <div class="cart-item-footer">
              <div class="quantity-controls">
                <button onclick="window.Cart.updateQuantity('${item.id}', -1)" aria-label="Decrease quantity">-</button>
                <span class="quantity-value">${item.quantity}</span>
                <button onclick="window.Cart.updateQuantity('${item.id}', 1)" aria-label="Increase quantity">+</button>
              </div>
              <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (totalElement) totalElement.textContent = `$${this.getTotalAmount().toFixed(2)}`;
  }

  showFloatingToast(message) {
    let toast = document.getElementById('cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'cart-toast show';
    setTimeout(() => {
      toast.className = 'cart-toast';
    }, 2500);
  }

  async handleCheckout() {
    const checkoutBtn = document.getElementById('checkout-btn');
    const buttonText = checkoutBtn.querySelector('.btn-text');
    const spinner = checkoutBtn.querySelector('.spinner');

    // 1. Check if user is logged in
    const currentUser = await window.OnSpaceBackend.getCurrentUser();
    if (!currentUser) {
      this.close();
      // Open auth modal and show checkout message
      if (window.App && typeof window.App.openAuthModal === 'function') {
        window.App.openAuthModal('Please sign in or register to place your skincare order.');
      }
      return;
    }

    // 2. Process checkout via OnSpaceBackend
    try {
      if (buttonText) buttonText.style.opacity = '0';
      if (spinner) spinner.classList.add('active');
      checkoutBtn.disabled = true;

      // Create simulated order
      const shippingAddress = {
        street: '128 Lumiere Way',
        city: 'Aura Heights',
        zip: '90210',
        country: 'United States'
      };

      const order = await window.OnSpaceBackend.createOrder(
        this.items,
        this.getTotalAmount(),
        shippingAddress
      );

      // 3. Complete and show order confirmation
      this.clear();
      this.close();

      // Show Order Success Modal
      if (window.App && typeof window.App.showOrderSuccess === 'function') {
        window.App.showOrderSuccess(order);
      } else {
        alert(`Thank you for your ritual order!\nOrder ID: ${order.id}\nTotal: $${order.total.toFixed(2)}`);
      }

    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      if (buttonText) buttonText.style.opacity = '1';
      if (spinner) spinner.classList.remove('active');
      checkoutBtn.disabled = false;
    }
  }
}

// Instantiate and export to window for global access
window.Cart = new ShoppingCart();
