/**
 * API Wrapper para el Sistema de Librería
 */
const API = {
  // Productos
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/products${query ? '?' + query : ''}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al obtener productos');
    return json.data;
  },

  async getProduct(id) {
    const res = await fetch(`/api/products/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al obtener producto');
    return json.data;
  },

  async createProduct(formData) {
    const res = await fetch('/api/products', {
      method: 'POST',
      body: formData // multipart/form-data
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al crear producto');
    return json.data;
  },

  async updateProduct(id, formData) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      body: formData
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al actualizar producto');
    return json.data;
  },

  async deleteProduct(id) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al eliminar producto');
    return json;
  },

  // Ventas (POS)
  async registerSale(saleData) {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al registrar venta');
    return json.data;
  },

  async getSales(limit = 50) {
    const res = await fetch(`/api/sales?limit=${limit}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al obtener ventas');
    return json.data;
  },

  // Estadísticas de Demanda
  async getDemandStats(days = 14) {
    const res = await fetch(`/api/stats/demand?days=${days}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al obtener estadísticas de demanda');
    return json.data;
  },

  // Health check / estado
  async getHealth() {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch (e) {
      return { status: 'offline', storage_mode: 'Desconectado' };
    }
  }
};
