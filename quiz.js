/**
 * Interactive Skin Type Quiz Manager
 * 
 * Conducts the skincare diagnostic quiz, calculates the user's skin profile,
 * and renders tailored product suggestions with quick add-to-cart controls.
 */

class SkinQuiz {
  constructor() {
    this.currentStep = 0;
    this.answers = [];
    this.questions = [
      {
        id: 'q1',
        text: 'How does your skin feel in the afternoon?',
        answers: [
          { text: 'Tight, dry, or showing flaky patches', type: 'dry' },
          { text: 'Sleek and shiny all over, especially T-zone', type: 'oily' },
          { text: 'Easily irritated, red, itchy, or warm', type: 'sensitive' },
          { text: 'Shiny on forehead/nose, but dry or tight on cheeks', type: 'combination' }
        ]
      },
      {
        id: 'q2',
        text: 'What is your primary skincare objective?',
        answers: [
          { text: 'Restore deep moisture and smooth fine lines', type: 'dry' },
          { text: 'Control excess sebum and minimize pores', type: 'oily' },
          { text: 'Calm active redness and soothe sensitivity', type: 'sensitive' },
          { text: 'Balance texture and address occasional breakouts', type: 'combination' }
        ]
      },
      {
        id: 'q3',
        text: 'How does your skin typically react to new formulations?',
        answers: [
          { text: 'Requires layers of hydration to feel comfortable', type: 'dry' },
          { text: 'Rarely reacts, but heavy creams feel congested', type: 'oily' },
          { text: 'Frequently stings, blushes, or develops hives', type: 'sensitive' },
          { text: 'Becomes slightly greasy in some areas, dry in others', type: 'combination' }
        ]
      }
    ];

    document.addEventListener('DOMContentLoaded', () => {
      this.bindEvents();
    });
  }

  bindEvents() {
    const quizToggle = document.getElementById('quiz-toggle');
    const quizToggleHero = document.getElementById('quiz-toggle-hero');
    const closeQuiz = document.getElementById('close-quiz');
    const quizOverlay = document.getElementById('quiz-modal');

    if (quizToggle) quizToggle.addEventListener('click', () => this.open());
    if (quizToggleHero) quizToggleHero.addEventListener('click', () => this.open());
    if (closeQuiz) closeQuiz.addEventListener('click', () => this.close());
    
    // Close on clicking overlay (outside the quiz card)
    if (quizOverlay) {
      quizOverlay.addEventListener('click', (e) => {
        if (e.target === quizOverlay) this.close();
      });
    }
  }

  open() {
    const modal = document.getElementById('quiz-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.reset();
    }
  }

  close() {
    const modal = document.getElementById('quiz-modal');
    if (modal) {
      modal.classList.remove('active');
      
      // Only restore scroll if cart drawer is not open
      const cartDrawer = document.getElementById('cart-drawer');
      if (!cartDrawer || !cartDrawer.classList.contains('active')) {
        document.body.style.overflow = '';
      }
    }
  }

  reset() {
    this.currentStep = 0;
    this.answers = [];
    this.renderQuestion();
  }

  selectAnswer(type) {
    this.answers.push(type);
    
    if (this.currentStep < this.questions.length - 1) {
      // Transition to next question with animation
      const cardContent = document.getElementById('quiz-card-content');
      if (cardContent) {
        cardContent.classList.add('fade-out');
        setTimeout(() => {
          this.currentStep++;
          this.renderQuestion();
          cardContent.classList.remove('fade-out');
        }, 300);
      } else {
        this.currentStep++;
        this.renderQuestion();
      }
    } else {
      // Calculate and render results
      const cardContent = document.getElementById('quiz-card-content');
      if (cardContent) {
        cardContent.classList.add('fade-out');
        setTimeout(() => {
          this.renderResults();
          cardContent.classList.remove('fade-out');
        }, 300);
      } else {
        this.renderResults();
      }
    }
  }

  renderQuestion() {
    const container = document.getElementById('quiz-card-content');
    if (!container) return;

    const question = this.questions[this.currentStep];
    const totalQuestions = this.questions.length;
    const progressPercent = ((this.currentStep) / totalQuestions) * 100;

    container.innerHTML = `
      <div class="quiz-header">
        <span class="quiz-subtitle">Skin Diagnostics — Question ${this.currentStep + 1} of ${totalQuestions}</span>
        <h3 class="quiz-question-title">${question.text}</h3>
      </div>
      
      <div class="quiz-progress-wrapper">
        <div class="quiz-progress-bar" style="width: ${progressPercent}%"></div>
      </div>

      <div class="quiz-options">
        ${question.answers.map((ans, idx) => `
          <button class="quiz-option-btn" onclick="window.Quiz.selectAnswer('${ans.type}')">
            <span class="option-index">${String.fromCharCode(65 + idx)}</span>
            <span class="option-text">${ans.text}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  calculateSkinType() {
    // Tally answers
    const tallies = { dry: 0, oily: 0, sensitive: 0, combination: 0 };
    this.answers.forEach(ans => {
      tallies[ans]++;
    });

    // Find the max tally
    let skinType = 'combination';
    let maxCount = 0;
    
    for (const [type, count] of Object.entries(tallies)) {
      if (count > maxCount) {
        maxCount = count;
        skinType = type;
      }
    }
    return skinType;
  }

  async renderResults() {
    const container = document.getElementById('quiz-card-content');
    if (!container) return;

    const skinType = this.calculateSkinType();
    
    // Display loading state during backend fetch
    container.innerHTML = `
      <div class="quiz-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">Analyzing your responses and formulating recommendations...</p>
      </div>
    `;

    // Fetch products matching skin type
    try {
      const allProducts = await window.OnSpaceBackend.getProducts();
      const recommended = allProducts.filter(prod => prod.skinTypeMatch.includes(skinType));

      const typeTitles = {
        dry: 'Dry & Dehydrated',
        oily: 'Oily & Sebum-Prone',
        sensitive: 'Highly Sensitive / Reactive',
        combination: 'Balanced Combination'
      };

      const typeDescriptions = {
        dry: 'Your skin is calling for deeply nourishing lipids, rich emollients, and occlusive barriers to locking in vital cellular moisture.',
        oily: 'Your skin requires lightweight, non-comedogenic, pH-balanced formulas that clarify excess sebum without stripping your moisture barrier.',
        sensitive: 'Your skin has an active inflammatory response. It needs gentle, ceramide-rich, fragrance-free solutions to repair the skin barrier.',
        combination: 'Your skin displays varying needs: oily zones and drier zones. Balanced, hydrating, non-congesting formulas work best.'
      };

      container.innerHTML = `
        <div class="quiz-results">
          <div class="results-header">
            <span class="quiz-subtitle">Diagnostic Results</span>
            <h3 class="results-title">Your skin type is <span class="highlight-gold">${typeTitles[skinType]}</span></h3>
            <p class="results-description">${typeDescriptions[skinType]}</p>
          </div>

          <div class="recommendations-header">
            <h4>Recommended Ritual Formulations</h4>
          </div>

          <div class="recommendations-grid">
            ${recommended.map(prod => `
              <div class="rec-card">
                <div class="rec-card-image-container">
                  <img src="${prod.image}" alt="${prod.name}" class="rec-card-image">
                </div>
                <div class="rec-card-body">
                  <h5 class="rec-card-name">${prod.name}</h5>
                  <p class="rec-card-price">$${prod.price.toFixed(2)}</p>
                  <button class="btn-rec-add" onclick="window.Quiz.addToCartFromQuiz('${prod.id}')">
                    Add to Ritual
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="results-footer">
            <button class="btn-secondary" onclick="window.Quiz.reset()">Retake Diagnostic</button>
            <button class="btn-primary" onclick="window.Quiz.close()">Close & Explore</button>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `
        <div class="quiz-error">
          <p>Unable to retrieve recommendations. Please try again.</p>
          <button class="btn-primary" onclick="window.Quiz.reset()">Retry</button>
        </div>
      `;
    }
  }

  async addToCartFromQuiz(productId) {
    try {
      const product = await window.OnSpaceBackend.getProductById(productId);
      if (product && window.Cart) {
        window.Cart.addItem(product);
        // Toast notification triggers from Cart class
      }
    } catch (err) {
      console.error('Failed to add product to cart', err);
    }
  }
}

// Instantiate and export to window for global access
window.Quiz = new SkinQuiz();
