/**
 * MÓDULO 1: PUNTO DE VENTA (REGISTRO DE VENTAS - POS)
 * Control de ticket, búsqueda rápida, validación estricta de stock y emisión de comprobantes.
 */

const POS = {
  products: [],
  cart: [],
  selectedCategory: 'Todas',
  searchQuery: '',

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadProducts();
  },

  cacheDOM() {
    this.grid = document.getElementById('pos-product-grid');
    this.searchInput = document.getElementById('pos-search-input');
    this.categoryPills = document.getElementById('pos-category-pills');
    this.cartItemsList = document.getElementById('ticket-items-container');
    this.cartCountBadge = document.getElementById('badge-cart-count');
    this.subtotalEl = document.getElementById('ticket-subtotal');
    this.totalEl = document.getElementById('ticket-total');
    this.profitEl = document.getElementById('ticket-profit');
    this.btnCompleteSale = document.getElementById('btn-complete-sale');
    this.btnClearCart = document.getElementById('btn-clear-cart');
    this.btnCancelTicket = document.getElementById('btn-cancel-ticket');
    this.clientNameInput = document.getElementById('client-name');
    this.paymentMethodSelect = document.getElementById('payment-method');

    // Receipt Modal elements
    this.receiptModal = document.getElementById('modal-receipt-backdrop');
    this.receiptTicketNum = document.getElementById('receipt-ticket-number');
    this.receiptDate = document.getElementById('receipt-date');
    this.receiptClient = document.getElementById('receipt-client');
    this.receiptPayment = document.getElementById('receipt-payment');
    this.receiptItemsTbody = document.getElementById('receipt-items-tbody');
    this.receiptTotal = document.getElementById('receipt-total');
    this.btnCloseReceipt = document.getElementById('btn-close-receipt');
    this.btnCloseReceiptX = document.getElementById('btn-close-receipt-modal');
    this.btnPrintReceipt = document.getElementById('btn-print-receipt');
  },

  bindEvents() {
    // Buscador en tiempo real
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderProducts();
    });

    // Píldoras de Categoría
    this.categoryPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-pill');
      if (!btn) return;
      this.categoryPills.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      this.selectedCategory = btn.dataset.category;
      this.renderProducts();
    });

    // Vaciar Carrito
    this.btnClearCart.addEventListener('click', () => this.clearCart());
    this.btnCancelTicket.addEventListener('click', () => this.clearCart());

    // Finalizar y Cobrar Venta
    this.btnCompleteSale.addEventListener('click', () => this.handleCompleteSale());

    // Modal de Recibo
    const closeReceipt = () => this.receiptModal.classList.remove('open');
    this.btnCloseReceipt.addEventListener('click', closeReceipt);
    this.btnCloseReceiptX.addEventListener('click', closeReceipt);
    this.btnPrintReceipt.addEventListener('click', () => window.print());

    // Atajo de teclado: Enter para cobrar si el ticket está listo
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        if (!this.btnCompleteSale.disabled) {
          this.handleCompleteSale();
        }
      }
    });

    // Escuchar cambios de inventario para refrescar el catálogo
    window.addEventListener('inventory:updated', () => this.loadProducts());
  },

  async loadProducts() {
    try {
      this.products = await API.getProducts();
      this.renderProducts();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  renderProducts() {
    let filtered = this.products;

    if (this.selectedCategory !== 'Todas') {
      filtered = filtered.filter(p => p.categoria.toLowerCase() === this.selectedCategory.toLowerCase());
    }

    if (this.searchQuery) {
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(this.searchQuery) || 
        p.codigo.toLowerCase().includes(this.searchQuery)
      );
    }

    if (filtered.length === 0) {
      this.grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <p>No se encontraron productos que coincidan con la búsqueda.</p>
        </div>
      `;
      return;
    }

    this.grid.innerHTML = filtered.map(p => {
      const stock = parseInt(p.stock, 10);
      let stockBadgeClass = 'badge-stock-ok';
      let stockLabel = `${stock} en stock`;

      if (stock === 0) {
        stockBadgeClass = 'badge-stock-out';
        stockLabel = 'Agotado';
      } else if (stock <= 5) {
        stockBadgeClass = 'badge-stock-low';
        stockLabel = `Bajo stock (${stock})`;
      }

      // Check how many are currently in cart to compute remaining available
      const inCart = this.cart.find(c => c.producto_id === p.id);
      const cartQty = inCart ? inCart.cantidad : 0;
      const canAdd = (stock - cartQty) > 0;

      return `
        <div class="product-card" data-id="${p.id}">
          <div class="card-img-wrapper">
            <img src="${p.foto_url}" alt="${p.nombre}" loading="lazy" onerror="this.src='/uploads/lib-101.png'">
            <span class="card-badge ${stockBadgeClass}">${stockLabel}</span>
            <span class="card-code">${p.codigo}</span>
          </div>
          <div class="card-body">
            <span class="card-category">${p.categoria}</span>
            <h4 class="card-title" title="${p.nombre}">${p.nombre}</h4>
            
            <div class="card-price-row">
              <span class="card-price">S/ ${parseFloat(p.precio_venta).toFixed(2)}</span>
              <span class="card-cost">Costo: S/ ${parseFloat(p.precio_compra).toFixed(2)}</span>
            </div>

            <div class="card-stock-info">
              <span>Disponibles:</span>
              <strong style="color: ${canAdd ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                ${stock - cartQty}
              </strong>
            </div>

            <button 
              class="btn btn-primary btn-add-ticket" 
              onclick="POS.addToCart('${p.id}')"
              ${!canAdd ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''}
            >
              ${canAdd ? '+ Agregar al Ticket' : 'Sin Stock'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  addToCart(productId) {
    const prod = this.products.find(p => p.id === productId);
    if (!prod) return;

    const availableStock = parseInt(prod.stock, 10);
    const existingIndex = this.cart.findIndex(c => c.producto_id === productId);

    if (existingIndex > -1) {
      if (this.cart[existingIndex].cantidad + 1 > availableStock) {
        App.showToast(`Stock máximo alcanzado para "${prod.nombre}" (${availableStock} disponibles).`, 'error');
        return;
      }
      this.cart[existingIndex].cantidad += 1;
    } else {
      if (availableStock <= 0) {
        App.showToast(`El producto "${prod.nombre}" está agotado.`, 'error');
        return;
      }
      this.cart.push({
        producto_id: prod.id,
        codigo: prod.codigo,
        nombre_producto: prod.nombre,
        categoria: prod.categoria,
        precio_unitario: parseFloat(prod.precio_venta),
        costo_unitario: parseFloat(prod.precio_compra),
        foto_url: prod.foto_url,
        cantidad: 1,
        stock_max: availableStock
      });
    }

    this.renderCart();
    this.renderProducts();
    App.showToast(`Agregado al ticket: ${prod.nombre}`, 'info');
  },

  updateQuantity(productId, delta) {
    const item = this.cart.find(c => c.producto_id === productId);
    if (!item) return;

    const prod = this.products.find(p => p.id === productId);
    const maxStock = prod ? parseInt(prod.stock, 10) : item.stock_max;

    const newQty = item.cantidad + delta;

    if (newQty <= 0) {
      this.removeFromCart(productId);
      return;
    }

    if (newQty > maxStock) {
      App.showToast(`No puedes superar el stock disponible (${maxStock} unidades).`, 'error');
      return;
    }

    item.cantidad = newQty;
    this.renderCart();
    this.renderProducts();
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(c => c.producto_id !== productId);
    this.renderCart();
    this.renderProducts();
  },

  clearCart() {
    this.cart = [];
    this.renderCart();
    this.renderProducts();
  },

  renderCart() {
    // Contador en badge
    const totalCount = this.cart.reduce((sum, it) => sum + it.cantidad, 0);
    this.cartCountBadge.textContent = totalCount;

    if (this.cart.length === 0) {
      this.cartItemsList.innerHTML = `
        <div class="empty-ticket">
          <div class="empty-ticket-icon">🛍️</div>
          <p>El ticket está vacío</p>
          <small>Agrega productos del catálogo para comenzar la venta</small>
        </div>
      `;
      this.subtotalEl.textContent = 'S/ 0.00';
      this.totalEl.textContent = 'S/ 0.00';
      this.profitEl.textContent = 'S/ 0.00 (+0%)';
      this.btnCompleteSale.disabled = true;
      return;
    }

    let subtotal = 0;
    let totalCosto = 0;

    this.cartItemsList.innerHTML = this.cart.map(item => {
      const itemSubtotal = item.precio_unitario * item.cantidad;
      const itemCost = item.costo_unitario * item.cantidad;
      subtotal += itemSubtotal;
      totalCosto += itemCost;

      const prod = this.products.find(p => p.id === item.producto_id);
      const isMaxReached = prod && item.cantidad >= prod.stock;

      return `
        <div class="ticket-item">
          <img src="${item.foto_url}" class="ticket-item-img" alt="${item.nombre_producto}" onerror="this.src='/uploads/lib-101.png'">
          <div class="ticket-item-details">
            <div class="ticket-item-title" title="${item.nombre_producto}">${item.nombre_producto}</div>
            <div class="ticket-item-meta">
              <span>${item.codigo}</span>
              <span>•</span>
              <span>S/ ${item.precio_unitario.toFixed(2)} c/u</span>
            </div>
            <div class="ticket-qty-controls">
              <button class="qty-btn" onclick="POS.updateQuantity('${item.producto_id}', -1)">-</button>
              <span class="qty-display">${item.cantidad}</span>
              <button class="qty-btn" onclick="POS.updateQuantity('${item.producto_id}', 1)" ${isMaxReached ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <div class="ticket-item-subtotal">
            <span class="item-subtotal-val">S/ ${itemSubtotal.toFixed(2)}</span>
            <button class="btn-remove-item" onclick="POS.removeFromCart('${item.producto_id}')" title="Quitar ítem">✕</button>
          </div>
        </div>
      `;
    }).join('');

    const totalProfit = subtotal - totalCosto;
    const profitMargin = subtotal > 0 ? ((totalProfit / subtotal) * 100).toFixed(1) : '0';

    this.subtotalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
    this.totalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
    this.profitEl.textContent = `S/ ${totalProfit.toFixed(2)} (+${profitMargin}%)`;
    this.btnCompleteSale.disabled = false;
  },

  async handleCompleteSale() {
    if (this.cart.length === 0) return;

    this.btnCompleteSale.disabled = true;
    this.btnCompleteSale.innerHTML = '<span>⏳</span> Procesando...';

    const clientName = this.clientNameInput.value.trim() || 'Cliente Mostrador';
    const paymentMethod = this.paymentMethodSelect.value;

    const payload = {
      items: this.cart.map(it => ({
        producto_id: it.producto_id,
        codigo: it.codigo,
        nombre_producto: it.nombre_producto,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        costo_unitario: it.costo_unitario
      })),
      cliente_nombre: clientName,
      metodo_pago: paymentMethod
    };

    try {
      const saleResult = await API.registerSale(payload);

      // Presentar recibo digital en el modal
      this.showReceiptModal(saleResult, this.cart, clientName, paymentMethod);

      App.showToast(`¡Venta cobrada con éxito! Ticket: ${saleResult.numero_ticket}`, 'success');

      // Limpiar ticket
      this.cart = [];
      this.renderCart();

      // Recargar catálogo de productos y emitir evento para estadísticas
      await this.loadProducts();
      window.dispatchEvent(new CustomEvent('sale:completed'));

    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      this.btnCompleteSale.disabled = false;
      this.btnCompleteSale.innerHTML = '<span>⚡</span> Cobrar Venta';
    }
  },

  showReceiptModal(saleResult, itemsSold, clientName, paymentMethod) {
    this.receiptTicketNum.textContent = `TICKET: ${saleResult.numero_ticket}`;
    this.receiptDate.textContent = `Fecha: ${new Date().toLocaleString('es-PE')}`;
    this.receiptClient.textContent = clientName;
    this.receiptPayment.textContent = paymentMethod;

    this.receiptItemsTbody.innerHTML = itemsSold.map(it => `
      <tr>
        <td style="font-weight: bold; width: 40px;">${it.cantidad}x</td>
        <td>
          <div>${it.nombre_producto}</div>
          <small style="color: #64748b;">${it.codigo} - S/ ${it.precio_unitario.toFixed(2)}</small>
        </td>
        <td style="text-align: right; font-weight: bold;">
          S/ ${(it.precio_unitario * it.cantidad).toFixed(2)}
        </td>
      </tr>
    `).join('');

    this.receiptTotal.textContent = `S/ ${parseFloat(saleResult.total_venta).toFixed(2)}`;
    this.receiptModal.classList.add('open');
  }
};
