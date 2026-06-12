/**
 * Core Application Coordinator
 * 
 * Manages full-screen cinematic scrolling using Lenis and GSAP ScrollTrigger,
 * interactive hotspots, account auth forms, and dynamic data binding.
 */

class SkincareApp {
  constructor() {
    this.currentSectionIndex = 0;
    this.totalSections = 4;
    this.isTransitioning = false;
    this.isProgrammaticScroll = false;
    this.scrollAnimationsInitialized = false;
    
    // Slideshow settings
    this.isPlaying = false;
    this.slideshowDuration = 8000; // 8 seconds per section
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.tickRate = 100; // update progress every 100ms
    
    // Active botanical data
    this.botanicals = {
      gold: {
        title: "Pure 24k Gold Flakes",
        subtitle: "Noble Metal Infusion",
        desc: "Suspended micro-particles of 24-karat gold stimulate microcirculation, support natural collagen production, and neutralize oxidative stressors to impart a radiant, youthful glow.",
        benefits: ["Enhances cellular luminosity", "Improves tissue elasticity", "Calms environmental inflammation"]
      },
      squalane: {
        title: "Olive-Derived Squalane",
        subtitle: "Biomimetic Lipid Shield",
        desc: "A highly stable, plant-derived oil that perfectly mimics the skin's natural moisture barrier. It absorbs instantly without greasy residue, locking in deep hydration.",
        benefits: ["Prevents transepidermal water loss", "Softens texture and refines lines", "Non-comedogenic barrier support"]
      },
      greentea: {
        title: "EGCG Green Tea Extract",
        subtitle: "Antioxidant Powerhouse",
        desc: "Concentrated organic green tea leaves rich in epigallocatechin gallate (EGCG) catechins. It neutralizes skin-aging free radicals, refines pores, and balances sebum production.",
        benefits: ["Defends against UV-induced stress", "Soothes redness and irritation", "Regulates sebum & refines pores"]
      },
      ceramides: {
        title: "3x Essential Ceramides",
        subtitle: "Stratum Corneum Replenishment",
        desc: "A bio-identical blend of Ceramides NP, AP, and EOP that helps rebuild the intercellular lipid structure. It seals micro-tears in the outer skin layer, keeping moisture in and irritants out.",
        benefits: ["Repairs compromised skin barriers", "Locks in moisture for sensitive skin", "Protects against dryness and flaking"]
      }
    };

    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.bindDOMEvents();
      this.loadProducts();
      
      // Initialize Lenis smooth scroll
      this.lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // premium soft acceleration/deceleration
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2
      });

      // Sync ScrollTrigger with Lenis
      this.lenis.on('scroll', ScrollTrigger.update);

      // Hook Lenis raf loop into GSAP ticker
      gsap.ticker.add((time) => {
        this.lenis.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);

      // Pause auto-play when user scrolls manually
      this.lenis.on('scroll', (e) => {
        if (!this.isProgrammaticScroll && e.velocity !== 0) {
          if (this.isPlaying) {
            this.isPlaying = false;
            // Update play/pause button icon visually
            const pauseIcon = document.getElementById('pause-icon');
            const playIcon = document.getElementById('play-icon');
            const toggle = document.getElementById('play-pause-toggle');
            if (pauseIcon) pauseIcon.style.display = 'none';
            if (playIcon) playIcon.style.display = 'block';
            if (toggle) {
              toggle.setAttribute('aria-label', 'Play Auto Advance');
            }
          }
          this.resetSlideshowTimer();
        }
      });

      this.startSlideshowTimer();
      this.checkUserSession();
    });
  }

  // --- BIND INTERACTIVE ACTIONS ---
  bindDOMEvents() {
    // Header Links & Dot Nav
    const navLinks = document.querySelectorAll('.nav-link');
    const dots = document.querySelectorAll('.nav-dot');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(link.getAttribute('data-index'));
        this.navigateToSection(idx);
      });
    });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-index'));
        this.navigateToSection(idx);
      });
    });

    // Play/Pause button
    const playPauseBtn = document.getElementById('play-pause-toggle');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Prevent browser default arrow key scrolling to let Lenis handle it
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        this.nextSection();
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        this.prevSection();
      }
    });

    // Ingredient Hotspots
    const hotspots = document.querySelectorAll('.ingredient-hotspot');
    hotspots.forEach(hotspot => {
      hotspot.addEventListener('click', () => {
        const id = hotspot.getAttribute('data-id');
        this.selectBotanical(id);
      });
    });

    // Auth Dialog Triggers
    const accountBtn = document.getElementById('account-toggle');
    const closeAuth = document.getElementById('close-auth');
    
    if (accountBtn) accountBtn.addEventListener('click', () => this.openAuthModal());
    if (closeAuth) closeAuth.addEventListener('click', () => this.closeAuthModal());
    
    const authOverlay = document.getElementById('auth-modal');
    if (authOverlay) {
      authOverlay.addEventListener('click', (e) => {
        if (e.target === authOverlay) this.closeAuthModal();
      });
    }
  }

  // --- TRANSITION ANIMATIONS (LENIS + GSAP SMOOTH SCROLL) ---
  navigateToSection(index) {
    if (index < 0 || index >= this.totalSections || this.isTransitioning) return;
    
    const sections = gsap.utils.toArray(".section");
    const targetSection = sections[index];

    if (targetSection && this.lenis) {
      this.isTransitioning = true;
      const wasPlaying = this.isPlaying;
      this.isPlaying = false;
      this.resetSlideshowTimer();
      
      this.isProgrammaticScroll = true; // Set programmatic flag to ignore scroll callbacks

      this.lenis.scrollTo(targetSection, {
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // match Lenis premium ease
        onComplete: () => {
          this.isPlaying = wasPlaying;
          this.isProgrammaticScroll = false; // Clear programmatic flag
          this.isTransitioning = false;
          this.updateActiveIndicators(index);
          
          if (this.isPlaying) {
            this.resetSlideshowTimer();
          }
        }
      });
    }
  }

  nextSection() {
    const nextIdx = (this.currentSectionIndex + 1) % this.totalSections;
    this.navigateToSection(nextIdx);
  }

  prevSection() {
    const prevIdx = (this.currentSectionIndex - 1 + this.totalSections) % this.totalSections;
    this.navigateToSection(prevIdx);
  }

  // --- GSAP SCROLLTRIGGERS AND TEXT REVEALS ---
  initScrollAnimations() {
    if (this.scrollAnimationsInitialized) return;
    this.scrollAnimationsInitialized = true;

    // Register GSAP ScrollTrigger Plugin
    gsap.registerPlugin(ScrollTrigger);

    const sections = gsap.utils.toArray(".section");

    // 1. Stack Stacking Pinning Transitions (Scene-to-scene layered scrolling)
    sections.forEach((section, index) => {
      // Entrance: Scroll next section up from bottom
      if (index > 0) {
        gsap.fromTo(section,
          { yPercent: 100 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top top",
              scrub: true,
              id: `slide-${index}`
            }
          }
        );
      }

      // Exit: Pin current section and scale/fade it down as next section enters on top
      if (index < sections.length - 1) {
        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "+=100%",
          pin: true,
          pinSpacing: false,
          id: `pin-${index}`
        });

        const nextSection = sections[index + 1];
        gsap.to(section, {
          scale: 0.93,
          opacity: 0.3,
          ease: "none",
          scrollTrigger: {
            trigger: nextSection,
            start: "top bottom",
            end: "top top",
            scrub: true
          }
        });
      }
    });

    // 2. Background Parallax
    sections.forEach((section) => {
      const bgImage = section.querySelector('.bg-image');
      if (bgImage) {
        gsap.fromTo(bgImage,
          { yPercent: -12, scale: 1.15 },
          {
            yPercent: 12,
            scale: 1.02,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: true
            }
          }
        );
      }
    });

    // 3. Staggered Text and Content Reveal Animations
    sections.forEach((section) => {
      const content = section.querySelector('.section-content, .hero-box');
      if (content) {
        const title = content.querySelector('.hero-title, .section-title-white');
        const subtitle = content.querySelector('.hero-subtitle, .section-subtitle');
        
        const targets = [];
        if (subtitle) targets.push(subtitle);
        if (title) targets.push(title);
        
        const mainLayout = content.querySelector('.products-slider-wrapper, .ingredients-layout, .testimonials-layout, .hero-desc');
        if (mainLayout) {
          if (mainLayout.classList.contains('products-slider-wrapper')) {
            const cards = mainLayout.querySelectorAll('.product-card');
            if (cards.length > 0) {
              targets.push(...cards);
            } else {
              targets.push(mainLayout);
            }
          } else if (mainLayout.classList.contains('testimonials-layout')) {
            const tcards = mainLayout.querySelectorAll('.testimonial-card');
            if (tcards.length > 0) {
              targets.push(...tcards);
            } else {
              targets.push(mainLayout);
            }
          } else {
            targets.push(mainLayout);
          }
        }

        const actions = content.querySelector('.hero-actions');
        if (actions) targets.push(actions);

        if (targets.length > 0) {
          gsap.fromTo(targets,
            {
              opacity: 0,
              y: 40,
              filter: "blur(8px)"
            },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              stagger: 0.12,
              duration: 1.2,
              ease: "power3.out",
              scrollTrigger: {
                trigger: section,
                start: "top 45%",
                toggleActions: "play none none reverse"
              }
            }
          );
        }
      }
    });

    // 4. Sync Navigation active state dots and links on Scroll
    sections.forEach((section, index) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top 40%",
        end: "bottom 40%",
        onToggle: (self) => {
          if (self.isActive && !this.isProgrammaticScroll) {
            this.updateActiveIndicators(index);
          }
        }
      });
    });

    // 5. Update overall progress bar in the bottom controls based on scroll
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (!this.isPlaying) {
          const percent = self.progress * 100;
          const barFill = document.getElementById('progress-bar-fill');
          if (barFill) barFill.style.width = `${percent}%`;
        }
      }
    });
  }

  updateActiveIndicators(index) {
    this.currentSectionIndex = index;

    // Header Links
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) activeLink.classList.remove('active');
    const targetLink = document.querySelector(`.nav-link[data-index="${index}"]`);
    if (targetLink) targetLink.classList.add('active');

    // Dot navigation
    const activeDot = document.querySelector('.nav-dot.active');
    if (activeDot) activeDot.classList.remove('active');
    const targetDot = document.querySelector(`.nav-dot[data-index="${index}"]`);
    if (targetDot) targetDot.classList.add('active');
  }

  // --- AUTO-PLAY SLIDESHOW TIMER ---
  startSlideshowTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      if (this.isPlaying) {
        this.elapsedTime += this.tickRate;
        const percent = (this.elapsedTime / this.slideshowDuration) * 100;
        
        const barFill = document.getElementById('progress-bar-fill');
        if (barFill) barFill.style.width = `${percent}%`;

        if (this.elapsedTime >= this.slideshowDuration) {
          this.nextSection();
        }
      }
    }, this.tickRate);
  }

  resetSlideshowTimer() {
    this.elapsedTime = 0;
    const barFill = document.getElementById('progress-bar-fill');
    if (barFill) barFill.style.width = '0%';
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    const pauseIcon = document.getElementById('pause-icon');
    const playIcon = document.getElementById('play-icon');
    const toggle = document.getElementById('play-pause-toggle');

    if (this.isPlaying) {
      if (pauseIcon) pauseIcon.style.display = 'block';
      if (playIcon) playIcon.style.display = 'none';
      if (toggle) toggle.setAttribute('aria-label', 'Pause Auto Advance');
      this.resetSlideshowTimer();
    } else {
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (playIcon) playIcon.style.display = 'block';
      if (toggle) toggle.setAttribute('aria-label', 'Play Auto Advance');
    }
  }

  // --- PRODUCTS DATA BINDING ---
  async loadProducts() {
    const listContainer = document.getElementById('products-list');
    if (!listContainer) return;

    try {
      const products = await window.OnSpaceBackend.getProducts();
      
      let html = '';
      products.forEach(prod => {
        html += `
          <div class="product-card">
            <div class="product-card-top">
              <div class="product-card-image-box">
                <img src="${prod.image}" alt="${prod.name}" class="product-card-img">
                <div class="badge-overlay">
                  ${prod.badges.map(b => `<span class="badge">${b}</span>`).join('')}
                </div>
              </div>
              
              <div class="product-info">
                <p class="product-volume">${prod.volume}</p>
                <h3 class="product-name">${prod.name}</h3>
                <p class="product-tagline">${prod.tagline}</p>
                <div class="product-rating">
                  <span>&#9733; ${prod.rating.toFixed(1)}</span>
                  <span class="rating-count">(${prod.reviewsCount})</span>
                </div>
              </div>
            </div>

            <div class="product-card-bottom">
              <span class="product-price">$${prod.price.toFixed(2)}</span>
              <button class="btn-card-add" onclick="window.App.addProductToCart('${prod.id}')">
                Add to Cart
              </button>
            </div>
          </div>
        `;
      });

      listContainer.innerHTML = html;

      // Trigger scroll animations setup once the products are in the DOM
      this.initScrollAnimations();

    } catch (err) {
      listContainer.innerHTML = `
        <div class="quiz-error" style="color: white; text-align: center; width: 100%; padding: 40px;">
          <p>Failed to load skincare catalog. Please reload.</p>
        </div>
      `;
      // Run scroll animations even if product loading fails
      this.initScrollAnimations();
    }
  }

  async addProductToCart(productId) {
    try {
      const product = await window.OnSpaceBackend.getProductById(productId);
      if (product && window.Cart) {
        window.Cart.addItem(product);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- BOTANICAL INTERACTIVE PANEL ---
  selectBotanical(id) {
    const details = this.botanicals[id];
    const detailsPanel = document.getElementById('ingredient-details-content');
    
    if (!details || !detailsPanel) return;

    // Fade out details panel
    detailsPanel.style.opacity = '0';
    detailsPanel.style.transform = 'translateY(10px)';

    setTimeout(() => {
      detailsPanel.innerHTML = `
        <span class="ing-details-subtitle">${details.subtitle}</span>
        <h3 class="ing-details-title">${details.title}</h3>
        <p class="ing-details-desc">${details.desc}</p>
        <div class="ing-details-benefits">
          ${details.benefits.map(b => `
            <div class="benefit-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>${b}</span>
            </div>
          `).join('')}
        </div>
      `;
      // Fade in new details
      detailsPanel.style.opacity = '1';
      detailsPanel.style.transform = 'translateY(0)';
    }, 250);
  }

  // --- USER AUTHENTICATION & DASHBOARD MODAL ---
  async openAuthModal(checkoutMessage = '') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Check if user is already logged in
    const currentUser = await window.OnSpaceBackend.getCurrentUser();
    
    if (currentUser) {
      this.renderDashboard(currentUser);
    } else {
      this.renderAuthForm('login', checkoutMessage);
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('active');
      
      // Only restore scroll if cart drawer is not open
      const cartDrawer = document.getElementById('cart-drawer');
      if (!cartDrawer || !cartDrawer.classList.contains('active')) {
        document.body.style.overflow = '';
      }
    }
  }

  async checkUserSession() {
    const user = await window.OnSpaceBackend.getCurrentUser();
    const dot = document.getElementById('account-status-dot');
    if (dot) {
      dot.style.display = user ? 'block' : 'none';
    }
  }

  renderAuthForm(view = 'login', checkoutMessage = '') {
    const container = document.getElementById('auth-card-content');
    if (!container) return;

    container.innerHTML = `
      ${checkoutMessage ? `<div class="auth-message-banner">${checkoutMessage}</div>` : ''}
      
      <div class="auth-tabs">
        <button class="auth-tab-btn ${view === 'login' ? 'active' : ''}" onclick="window.App.renderAuthForm('login', '${checkoutMessage}')">Sign In</button>
        <button class="auth-tab-btn ${view === 'register' ? 'active' : ''}" onclick="window.App.renderAuthForm('register', '${checkoutMessage}')">Register</button>
      </div>

      <form class="auth-form" id="auth-form" onsubmit="window.App.handleAuthSubmit(event, '${view}', '${checkoutMessage}')">
        ${view === 'register' ? `
          <div class="form-group">
            <label for="reg-name">Full Name</label>
            <input type="text" id="reg-name" required placeholder="Eleanor Vance">
          </div>
        ` : ''}
        
        <div class="form-group">
          <label for="auth-email">Email Address</label>
          <input type="email" id="auth-email" required placeholder="eleanor@example.com">
        </div>

        <div class="form-group">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" required placeholder="••••••••" minlength="6">
        </div>

        <div id="auth-error" class="auth-error-msg" style="display: none;"></div>

        <button type="submit" class="btn-primary gold-btn" id="auth-submit-btn" style="width: 100%; margin-top: 15px;">
          <span class="btn-text">${view === 'login' ? 'Enter Sanctuary' : 'Create Ritual Account'}</span>
          <span class="spinner"></span>
        </button>
      </form>
    `;
  }

  async handleAuthSubmit(event, view, checkoutMessage) {
    event.preventDefault();
    const form = event.target;
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const submitBtn = document.getElementById('auth-submit-btn');
    const buttonText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');
    const errorDiv = document.getElementById('auth-error');

    if (errorDiv) errorDiv.style.display = 'none';
    if (buttonText) buttonText.style.opacity = '0';
    if (spinner) spinner.classList.add('active');
    submitBtn.disabled = true;

    try {
      if (view === 'login') {
        await window.OnSpaceBackend.login(email, password);
      } else {
        const name = document.getElementById('reg-name').value;
        await window.OnSpaceBackend.register(name, email, password);
      }
      
      // Update logged-in session indicator
      await this.checkUserSession();
      
      // Close modal
      this.closeAuthModal();
      
      // If we were logging in for checkout, re-trigger checkout immediately
      if (checkoutMessage) {
        if (window.Cart) window.Cart.open();
      }

    } catch (err) {
      if (errorDiv) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
      }
    } finally {
      if (buttonText) buttonText.style.opacity = '1';
      if (spinner) spinner.classList.remove('active');
      submitBtn.disabled = false;
    }
  }

  async renderDashboard(user) {
    const container = document.getElementById('auth-card-content');
    if (!container) return;

    container.innerHTML = `
      <div class="dashboard-header">
        <div>
          <span class="quiz-subtitle">Ritual Profile</span>
          <h3 class="dashboard-title">${user.name}</h3>
          <p class="dashboard-subtitle">${user.email}</p>
        </div>
        <button class="btn-logout" onclick="window.App.handleLogout()">Sign Out</button>
      </div>

      <div class="orders-section">
        <h4>Order History</h4>
        <div class="orders-list-wrapper" id="dashboard-orders-container">
          <div class="quiz-loading" style="min-height: 150px;">
            <div class="loading-spinner"></div>
            <p class="loading-text">Synchronizing order logs...</p>
          </div>
        </div>
      </div>
    `;

    // Fetch user orders asynchronously
    try {
      const orders = await window.OnSpaceBackend.getUserOrders();
      const ordersContainer = document.getElementById('dashboard-orders-container');
      
      if (!ordersContainer) return;

      if (orders.length === 0) {
        ordersContainer.innerHTML = `
          <div class="no-orders-msg">
            <p>No rituals ordered yet.</p>
            <p style="font-size: 0.75rem; color: #999; margin-top: 5px;">Your checkout history will materialize here.</p>
          </div>
        `;
        return;
      }

      let html = `
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Formulations</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      orders.forEach(order => {
        const dateStr = new Date(order.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        const itemsSummary = order.items.map(i => `${i.name} (${i.quantity})`).join(', ');

        html += `
          <tr>
            <td style="font-weight: 600; font-family: monospace;">${order.id}</td>
            <td>${dateStr}</td>
            <td><div class="order-items-summary" title="${itemsSummary}">${itemsSummary}</div></td>
            <td style="font-weight: 500;">$${order.total.toFixed(2)}</td>
            <td><span class="order-status-badge processing">${order.status}</span></td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;

      ordersContainer.innerHTML = html;

    } catch (e) {
      const ordersContainer = document.getElementById('dashboard-orders-container');
      if (ordersContainer) {
        ordersContainer.innerHTML = `<div class="no-orders-msg">Failed to load orders.</div>`;
      }
    }
  }

  async handleLogout() {
    await window.OnSpaceBackend.logout();
    await this.checkUserSession();
    this.closeAuthModal();
  }

  // --- ORDER SUCCESS DIALOG WORKFLOW ---
  showOrderSuccess(order) {
    const successModal = document.getElementById('order-success-modal');
    if (!successModal) return;

    // Set dynamic text fields
    document.getElementById('success-order-id').textContent = order.id;
    document.getElementById('success-shipping-name').textContent = order.userName;
    document.getElementById('success-order-total').textContent = `$${order.total.toFixed(2)}`;
    document.getElementById('success-order-status').textContent = order.status;

    successModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeOrderSuccess() {
    const successModal = document.getElementById('order-success-modal');
    if (successModal) {
      successModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
}

// Instantiate and export to window for global access in layout click triggers
window.App = new SkincareApp();
