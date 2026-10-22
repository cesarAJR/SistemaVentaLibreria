/**
 * MÓDULO 3: GESTIÓN DE INVENTARIO Y CATÁLOGO DE PRODUCTOS
 * Registro con validación de código único, precios, stock entero positivo y foto PNG.
 */

const Inventory = {
  products: [],
  selectedCategory: 'Todas',
  searchQuery: '',

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadProducts();
  },

  cacheDOM() {
    this.tbody = document.getElementById('tbody-inventory-products');
    this.searchInput = document.getElementById('inventory-search-input');
    this.categorySelect = document.getElementById('inventory-category-select');
    this.btnAddProduct = document.getElementById('btn-inventory-add-product');
    this.btnNavAddProduct = document.getElementById('btn-open-new-product');

    // Modal Form Elements
    this.modal = document.getElementById('modal-product-backdrop');
    this.modalTitle = document.getElementById('modal-product-title');
    this.form = document.getElementById('form-product');
    this.btnCloseModal = document.getElementById('btn-close-product-modal');
    this.btnCancelModal = document.getElementById('btn-cancel-modal-prod');

    // Inputs
    this.idInput = document.getElementById('prod-id');
    this.codeInput = document.getElementById('prod-code');
    this.categoryInput = document.getElementById('prod-category');
    this.nameInput = document.getElementById('prod-name');
    this.descInput = document.getElementById('prod-desc');
    this.costInput = document.getElementById('prod-cost');
    this.priceInput = document.getElementById('prod-price');
    this.stockInput = document.getElementById('prod-stock');
    this.photoFileInput = document.getElementById('prod-photo-file');
    this.presetPhotoSelect = document.getElementById('prod-preset-photo');
    this.previewImg = document.getElementById('preview-prod-img');
  },

  bindEvents() {
    // Buscador
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.render();
    });

    // Filtro por categoría
    this.categorySelect.addEventListener('change', (e) => {
      this.selectedCategory = e.target.value;
      this.render();
    });

    // Abrir modal de nuevo producto
    const openNew = () => this.openModal();
    this.btnAddProduct.addEventListener('click', openNew);
    this.btnNavAddProduct.addEventListener('click', openNew);

    // Cerrar modal
    const close = () => this.closeModal();
    this.btnCloseModal.addEventListener('click', close);
    this.btnCancelModal.addEventListener('click', close);

    // Vista previa dinámica de foto PNG (archivo)
    this.photoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.name.toLowerCase().endsWith('.png') && file.type !== 'image/png') {
          App.showToast('Solo se admiten archivos en formato PNG (.png).', 'error');
          e.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          this.previewImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    // Vista previa dinámica de plantilla PNG seleccionada
    this.presetPhotoSelect.addEventListener('change', (e) => {
      if (!this.photoFileInput.files || this.photoFileInput.files.length === 0) {
        this.previewImg.src = e.target.value;
      }
    });

    // Envío del formulario (Crear / Editar)
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Refrescar al concretarse una venta
    window.addEventListener('sale:completed', () => this.loadProducts());
  },

  async loadProducts() {
    try {
      this.products = await API.getProducts();
      this.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  render() {
    let list = this.products;

    if (this.selectedCategory !== 'Todas') {
      list = list.filter(p => p.categoria.toLowerCase() === this.selectedCategory.toLowerCase());
    }

    if (this.searchQuery) {
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(this.searchQuery) ||
        p.codigo.toLowerCase().includes(this.searchQuery)
      );
    }

    if (list.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 3rem;">
            No se encontraron productos en el inventario.
          </td>
        </tr>
      `;
      return;
    }

    this.tbody.innerHTML = list.map(p => {
      const stock = parseInt(p.stock, 10);
      const compra = parseFloat(p.precio_compra);
      const venta = parseFloat(p.precio_venta);
      const margen = venta > 0 ? (((venta - compra) / venta) * 100).toFixed(1) : '0';

      let stockBadgeClass = 'badge-stock-ok';
      if (stock === 0) stockBadgeClass = 'badge-stock-out';
      else if (stock <= 5) stockBadgeClass = 'badge-stock-low';

      return `
        <tr>
          <td>
            <img src="${p.foto_url}" class="table-prod-img" alt="${p.nombre}" onerror="this.src='/uploads/lib-101.png'">
          </td>
          <td>
            <strong style="font-family: monospace; color: var(--accent-cyan);">${p.codigo}</strong>
          </td>
          <td>
            <div style="font-weight: 600; color: #f8fafc; font-size: 0.88rem;">${p.nombre}</div>
            <small style="color: var(--text-muted); font-size: 0.75rem;">${p.descripcion || 'Sin descripción'}</small>
          </td>
          <td>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${p.categoria}</span>
          </td>
          <td>S/ ${compra.toFixed(2)}</td>
          <td><strong>S/ ${venta.toFixed(2)}</strong></td>
          <td>
            <span style="color: var(--accent-emerald); font-weight: 600; font-size: 0.82rem;">+${margen}%</span>
          </td>
          <td>
            <span class="urgency-badge ${stockBadgeClass}">${stock} uds</span>
          </td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-icon" onclick="Inventory.editProduct('${p.id}')" title="Editar Producto">
                ✏️
              </button>
              <button class="btn btn-danger btn-icon" onclick="Inventory.deleteProduct('${p.id}', '${p.nombre}')" title="Eliminar">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openModal(product = null) {
    this.form.reset();
    this.photoFileInput.value = '';

    if (product) {
      this.modalTitle.textContent = `✏️ Editar Producto: ${product.codigo}`;
      this.idInput.value = product.id;
      this.codeInput.value = product.codigo;
      this.codeInput.readOnly = true; // No modificar SKU
      this.categoryInput.value = product.categoria;
      this.nameInput.value = product.nombre;
      this.descInput.value = product.descripcion || '';
      this.costInput.value = product.precio_compra;
      this.priceInput.value = product.precio_venta;
      this.stockInput.value = product.stock;
      this.previewImg.src = product.foto_url || '/uploads/lib-101.png';
      this.presetPhotoSelect.value = product.foto_url || '/uploads/lib-101.png';
    } else {
      this.modalTitle.textContent = '📦 Nuevo Producto de Librería';
      this.idInput.value = '';
      this.codeInput.readOnly = false;
      this.previewImg.src = '/uploads/lib-101.png';
      this.presetPhotoSelect.value = '/uploads/lib-101.png';
    }

    this.modal.classList.add('open');
  },

  closeModal() {
    this.modal.classList.remove('open');
  },

  editProduct(productId) {
    const prod = this.products.find(p => p.id === productId);
    if (prod) this.openModal(prod);
  },

  async deleteProduct(productId, name) {
    if (!confirm(`¿Estás seguro de eliminar el producto "${name}" del catálogo?`)) {
      return;
    }
    try {
      await API.deleteProduct(productId);
      App.showToast(`Producto "${name}" eliminado.`, 'info');
      await this.loadProducts();
      window.dispatchEvent(new CustomEvent('inventory:updated'));
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async handleSubmit(e) {
    e.preventDefault();

    const isEdit = Boolean(this.idInput.value);
    const code = this.codeInput.value.trim().toUpperCase();
    const name = this.nameInput.value.trim();
    const stockVal = Number(this.stockInput.value);
    const costVal = Number(this.costInput.value);
    const priceVal = Number(this.priceInput.value);

    // Validaciones estrictas requeridas
    if (!code || !name) {
      App.showToast('El código y el nombre son obligatorios.', 'error');
      return;
    }

    if (!Number.isInteger(stockVal) || stockVal < 0) {
      App.showToast('El stock debe ser un número entero mayor o igual a cero.', 'error');
      return;
    }

    if (isNaN(costVal) || costVal < 0) {
      App.showToast('El precio de compra debe ser mayor o igual a 0.', 'error');
      return;
    }

    if (isNaN(priceVal) || priceVal <= 0) {
      App.showToast('El precio de venta debe ser mayor a 0.', 'error');
      return;
    }

    const formData = new FormData(this.form);

    const submitBtn = document.getElementById('btn-save-prod');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
      if (isEdit) {
        await API.updateProduct(this.idInput.value, formData);
        App.showToast('Producto actualizado exitosamente.', 'success');
      } else {
        await API.createProduct(formData);
        App.showToast(`Producto ${code} registrado en catálogo.`, 'success');
      }

      this.closeModal();
      await this.loadProducts();
      window.dispatchEvent(new CustomEvent('inventory:updated'));
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Producto';
    }
  }
};
