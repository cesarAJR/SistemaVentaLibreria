/**
 * MÓDULO 2: ESTADÍSTICAS DE DEMANDA DE PRODUCTOS
 * Visualizaciones con Chart.js, análisis predictivo de rotación y alertas de reposición.
 */

const Stats = {
  charts: {
    topDemand: null,
    categoryDemand: null,
    timelineDemand: null
  },
  currentPeriod: 14,

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadStats();
  },

  cacheDOM() {
    this.periodSelect = document.getElementById('stats-period-select');
    this.btnRefresh = document.getElementById('btn-refresh-stats');

    // KPI Elements
    this.kpiIngresos = document.getElementById('kpi-total-ingresos');
    this.kpiTransacciones = document.getElementById('kpi-transacciones-subtext');
    this.kpiGanancia = document.getElementById('kpi-total-ganancia');
    this.kpiMargen = document.getElementById('kpi-margen-subtext');
    this.kpiUnidades = document.getElementById('kpi-unidades-vendidas');
    this.kpiValorInv = document.getElementById('kpi-valor-inventario');
    this.kpiStockSubtext = document.getElementById('kpi-stock-unidades-subtext');

    // Canvas elements
    this.canvasTopDemand = document.getElementById('chart-top-demand');
    this.canvasCategory = document.getElementById('chart-category-demand');
    this.canvasTimeline = document.getElementById('chart-timeline-demand');

    // Tables
    this.tbodyAlertas = document.getElementById('tbody-restock-alerts');
    this.badgeAlertasCount = document.getElementById('badge-alertas-count');
    this.tbodyRanking = document.getElementById('tbody-demand-ranking');
  },

  bindEvents() {
    this.periodSelect.addEventListener('change', (e) => {
      this.currentPeriod = parseInt(e.target.value, 10);
      this.loadStats();
    });

    this.btnRefresh.addEventListener('click', () => {
      this.loadStats();
      App.showToast('Estadísticas de demanda actualizadas.', 'info');
    });

    // Auto-actualización reactiva al registrar una nueva venta
    window.addEventListener('sale:completed', () => {
      this.loadStats();
    });
  },

  async loadStats() {
    try {
      const data = await API.getDemandStats(this.currentPeriod);
      this.renderKPIs(data.kpis);
      this.renderTopDemandChart(data.top_demandados);
      this.renderCategoryChart(data.distribucion_categoria);
      this.renderTimelineChart(data.tendencia_temporal);
      this.renderRestockAlerts(data.alertas_reabastecimiento);
      this.renderRankingTable(data.ranking_completo);
    } catch (err) {
      console.error('Error cargando estadísticas de demanda:', err);
      App.showToast('Error cargando estadísticas: ' + err.message, 'error');
    }
  },

  renderKPIs(kpis) {
    if (!kpis) return;
    this.kpiIngresos.textContent = `S/ ${kpis.total_ingresos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    this.kpiTransacciones.textContent = `${kpis.total_transacciones} ventas registradas`;

    this.kpiGanancia.textContent = `S/ ${kpis.total_ganancia.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    this.kpiMargen.textContent = `Margen promedio: ${kpis.margen_promedio_porcentaje}%`;

    this.kpiUnidades.textContent = kpis.total_unidades_vendidas.toLocaleString('es-PE');
    this.kpiValorInv.textContent = `S/ ${kpis.valor_inventario.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    this.kpiStockSubtext.textContent = `${kpis.stock_total_libreria} unidades en estantería`;
  },

  renderTopDemandChart(topList) {
    if (!this.canvasTopDemand) return;
    const ctx = this.canvasTopDemand.getContext('2d');

    const labels = topList.map(item => item.nombre.length > 22 ? item.nombre.slice(0, 20) + '...' : item.nombre);
    const units = topList.map(item => item.unidades_vendidas);
    const revenues = topList.map(item => item.total_ingresos);

    if (this.charts.topDemand) {
      this.charts.topDemand.destroy();
    }

    // Gradient fill for bars
    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');

    this.charts.topDemand = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Unidades Vendidas',
          data: units,
          backgroundColor: gradient,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { family: 'Outfit', size: 13 },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 12,
            callbacks: {
              afterLabel: function(context) {
                const idx = context.dataIndex;
                return `Ingresos generados: S/ ${revenues[idx].toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#f8fafc', font: { family: 'Outfit', size: 11, weight: '500' } }
          }
        }
      }
    });
  },

  renderCategoryChart(catData) {
    if (!this.canvasCategory) return;
    const ctx = this.canvasCategory.getContext('2d');

    const labels = catData.map(c => c.categoria);
    const units = catData.map(c => c.unidades_vendidas);

    if (this.charts.categoryDemand) {
      this.charts.categoryDemand.destroy();
    }

    const colors = [
      '#6366f1', // Indigo
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6'  // Purple
    ];

    this.charts.categoryDemand = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: units,
          backgroundColor: colors,
          borderColor: '#0f1523',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11 },
              boxWidth: 12,
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val} uds (${pct}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  },

  renderTimelineChart(timeline) {
    if (!this.canvasTimeline) return;
    const ctx = this.canvasTimeline.getContext('2d');

    const labels = timeline.map(t => {
      const parts = t.fecha.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const units = timeline.map(t => t.unidades);
    const revenues = timeline.map(t => t.ingresos);

    if (this.charts.timelineDemand) {
      this.charts.timelineDemand.destroy();
    }

    const gradUnits = ctx.createLinearGradient(0, 0, 0, 250);
    gradUnits.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    gradUnits.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    this.charts.timelineDemand = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Unidades Vendidas',
            data: units,
            borderColor: '#06b6d4',
            backgroundColor: gradUnits,
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            yAxisID: 'y'
          },
          {
            label: 'Ingresos (S/)',
            data: revenues,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
          },
          tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)' }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
          },
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Unidades', color: '#06b6d4', font: { size: 11 } },
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#94a3b8' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Ingresos S/', color: '#10b981', font: { size: 11 } },
            grid: { drawOnChartArea: false },
            ticks: { color: '#10b981' }
          }
        }
      }
    });
  },

  renderRestockAlerts(alerts) {
    this.badgeAlertasCount.textContent = `${alerts.length} producto${alerts.length === 1 ? '' : 's'}`;

    if (alerts.length === 0) {
      this.tbodyAlertas.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            ✅ Todo el inventario tiene niveles óptimos de stock.
          </td>
        </tr>
      `;
      return;
    }

    this.tbodyAlertas.innerHTML = alerts.map(a => {
      let badgeClass = 'urgency-medio';
      let sugerencia = '+15 unidades';

      if (a.nivel_urgencia === 'CRÍTICO') {
        badgeClass = 'urgency-critico';
        sugerencia = 'URGENTE: Pedir +30 uds';
      } else if (a.nivel_urgencia === 'ALTO') {
        badgeClass = 'urgency-alto';
        sugerencia = 'Pedir +20 uds';
      }

      return `
        <tr>
          <td>
            <div class="table-prod-cell">
              <img src="${a.foto_url}" class="table-prod-img" alt="${a.nombre}" onerror="this.src='/uploads/lib-101.png'">
              <div>
                <strong style="color: #f8fafc; font-size: 0.85rem;">${a.nombre}</strong><br>
                <small style="color: var(--text-muted); font-size: 0.72rem;">${a.codigo} • ${a.categoria}</small>
              </div>
            </div>
          </td>
          <td>
            <strong style="color: ${a.stock === 0 ? 'var(--accent-rose)' : 'var(--accent-amber)'}; font-size: 0.95rem;">
              ${a.stock}
            </strong>
          </td>
          <td>
            <span class="urgency-badge ${badgeClass}">${a.nivel_urgencia}</span>
          </td>
          <td>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${sugerencia}</span>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderRankingTable(ranking) {
    if (!ranking || ranking.length === 0) {
      this.tbodyRanking.innerHTML = `
        <tr><td colspan="5" style="text-align: center; padding: 2rem;">Sin datos en el período.</td></tr>
      `;
      return;
    }

    this.tbodyRanking.innerHTML = ranking.map(r => `
      <tr>
        <td><strong style="color: var(--accent-cyan); font-family: monospace;">${r.codigo}</strong></td>
        <td>
          <div class="table-prod-cell">
            <img src="${r.foto_url}" class="table-prod-img" alt="${r.nombre}" onerror="this.src='/uploads/lib-101.png'">
            <span style="font-size: 0.82rem; font-weight: 500;">${r.nombre}</span>
          </div>
        </td>
        <td><strong>${r.unidades_vendidas} uds</strong></td>
        <td>S/ ${r.total_ingresos.toFixed(2)}</td>
        <td style="color: var(--accent-emerald); font-weight: 600;">S/ ${r.total_ganancia.toFixed(2)}</td>
      </tr>
    `).join('');
  }
};
