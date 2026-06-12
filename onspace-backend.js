/**
 * Simulated OnSpace Cloud Backend Service
 * 
 * Provides database and authentication services, persisting to localStorage.
 * Simulates a real-world asynchronous API with network latency.
 */

class OnSpaceBackendService {
  constructor() {
    this.latency = 600; // milliseconds
    this.initDatabase();
  }

  // Helper to simulate network delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.latency));
  }

  // Initialize mock database tables
  initDatabase() {
    if (!localStorage.getItem('onspace_users')) {
      // Create a default admin/test user
      const defaultUsers = [
        {
          id: 'usr_1',
          email: 'guest@luxury.com',
          password: 'password123',
          name: 'Eleanor Vance',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('onspace_users', JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem('onspace_orders')) {
      localStorage.setItem('onspace_orders', JSON.stringify([]));
    }

    // Static product catalog (Database source of truth)
    this.products = [
      {
        id: 'prod_luminous_nectar',
        name: 'Luminous Hydration Nectar',
        tagline: 'Deep Moisture & Plumping Serum',
        price: 88.00,
        volume: '50ml',
        rating: 4.9,
        reviewsCount: 124,
        badges: ['Squalane 2%', 'Hyaluronic Acid', 'Hydrating'],
        description: 'A luxurious, ultra-lightweight nectar designed to flood the skin with multi-depth moisture, leaving a dewy, glass-like finish.',
        ingredients: 'Water, Squalane, Sodium Hyaluronate, Glycerin, Panthenol, Phenoxyethanol, Ethylhexylglycerin.',
        image: 'images/OIP-1030333186.jpg', 
        skinTypeMatch: ['dry', 'combination', 'sensitive']
      },
      {
        id: 'prod_auric_elixir',
        name: 'Auric Youth Elixir',
        tagline: 'Restorative 24k Gold Face Oil',
        price: 120.00,
        volume: '30ml',
        rating: 5.0,
        reviewsCount: 88,
        badges: ['24k Gold Flakes', 'Rosehip Oil', 'Anti-Aging'],
        description: 'Infused with genuine 24-karat gold flakes and cold-pressed botanical oils, this elixir stimulates cellular renewal and restores youthful elasticity.',
        ingredients: 'Rosa Moschata (Rosehip) Seed Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Gold (CI 77480), Tocopherol, Jasmine Essential Oil.',
        image: 'images/OIP-2217239342.jpg',
        skinTypeMatch: ['dry', 'combination']
      },
      {
        id: 'prod_botanical_cleanser',
        name: 'Botanical Reset Cleanser',
        tagline: 'pH-Balanced Soothing Milk Cleanser',
        price: 45.00,
        volume: '150ml',
        rating: 4.8,
        reviewsCount: 210,
        badges: ['Green Tea', 'Centella Asiatica', 'Soothing'],
        description: 'A velvety, non-foaming emulsion that effortlessly dissolves makeup, pollution, and excess sebum while preserving the skin\'s vital acid mantle.',
        ingredients: 'Camellia Sinensis (Green Tea) Leaf Extract, Centella Asiatica Extract, Aloe Barbadensis Leaf Juice, Coco-Glucoside, Cetearyl Alcohol.',
        image: 'images/OIP-3050139748.jpg',
        skinTypeMatch: ['oily', 'sensitive', 'combination']
      },
      {
        id: 'prod_barrier_balm',
        name: 'Ceramide Barrier Balm',
        tagline: 'Deep Recovery & Shielding Cream',
        price: 95.00,
        volume: '50ml',
        rating: 4.9,
        reviewsCount: 156,
        badges: ['3x Ceramides', 'Colloidal Oat 1%', 'Barrier Repair'],
        description: 'A cocooning lipid-replenishing cream that seals micro-tears in the stratum corneum, instantly calming redness and extreme dryness.',
        ingredients: 'Ceramide NP, Ceramide AP, Ceramide EOP, Colloidal Oatmeal, Shea Butter, Squalane, Phytosphingosine.',
        image: 'images/pngtree-skin-care-products-beauty-splash-green-background-picture-image_2491905-1471984412.png',
        skinTypeMatch: ['dry', 'sensitive']
      }
    ];
  }

  // --- CATALOG API ---
  async getProducts() {
    await this.delay();
    return [...this.products];
  }

  async getProductById(id) {
    await this.delay(200);
    return this.products.find(p => p.id === id) || null;
  }

  // --- AUTHENTICATION API ---
  async register(name, email, password) {
    await this.delay();
    const users = JSON.parse(localStorage.getItem('onspace_users') || '[]');
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name,
      email,
      password, // In a real app, this would be hashed on the server.
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('onspace_users', JSON.stringify(users));

    // Auto-login
    this.setSession(newUser);
    return { user: { id: newUser.id, name: newUser.name, email: newUser.email } };
  }

  async login(email, password) {
    await this.delay();
    const users = JSON.parse(localStorage.getItem('onspace_users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (!user) {
      throw new Error('Invalid email or password. Please try again.');
    }

    this.setSession(user);
    return { user: { id: user.id, name: user.name, email: user.email } };
  }

  async logout() {
    await this.delay(200);
    localStorage.removeItem('onspace_session');
    return { success: true };
  }

  async getCurrentUser() {
    await this.delay(100);
    const session = localStorage.getItem('onspace_session');
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch (e) {
      return null;
    }
  }

  setSession(user) {
    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem('onspace_session', JSON.stringify(sessionData));
  }

  // --- ORDERS API ---
  async createOrder(items, totalAmount, shippingDetails) {
    await this.delay();
    const currentUser = await this.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('Please sign in or register to place an order.');
    }

    const orders = JSON.parse(localStorage.getItem('onspace_orders') || '[]');
    
    const newOrder = {
      id: 'ord_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total: totalAmount,
      status: 'Processing',
      shippingDetails,
      date: new Date().toISOString()
    };

    orders.unshift(newOrder); // Newest orders first
    localStorage.setItem('onspace_orders', JSON.stringify(orders));
    return newOrder;
  }

  async getUserOrders() {
    await this.delay();
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return [];

    const orders = JSON.parse(localStorage.getItem('onspace_orders') || '[]');
    return orders.filter(o => o.userId === currentUser.id);
  }
}

// Instantiate and export to window for global access in frontend files
window.OnSpaceBackend = new OnSpaceBackendService();
