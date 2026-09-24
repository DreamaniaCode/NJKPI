/**
 * Nidal Junior — Pilotage éditorial
 * Moteur de graphiques SVG et barres horizontales lisibles et accessibles
 */

const NidalCharts = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const FORMAT_ICONS = {
    article: '📝',
    interview: '🎙️',
    dossier: '📂',
    breve: '⚡',
    chronique: '✍️',
    infographie: '📊',
    quiz: '❓',
    post: '🖼️',
    carrousel: '📑',
    video: '🎬',
    story: '📱'
  };

  function _svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v !== null && v !== undefined) el.setAttribute(k, v);
    });
    return el;
  }

  function _prep(id) {
    const c = document.getElementById(id);
    if (c) c.innerHTML = '';
    return c;
  }

  function _computeIntegerTicks(maxVal, maxSteps = 4) {
    const safeMax = Math.max(1, Math.ceil(Number(maxVal) || 1));
    const ticks = [];
    if (safeMax <= maxSteps) {
      for (let i = 0; i <= safeMax; i++) ticks.push(i);
    } else {
      const step = Math.ceil(safeMax / maxSteps);
      for (let v = 0; v <= safeMax; v += step) ticks.push(v);
      if (ticks[ticks.length - 1] < safeMax) {
        ticks.push(ticks[ticks.length - 1] + step);
      }
    }
    return ticks;
  }

  /* ── 1. Graphique de Mix de Contenus & Barres (Ultra-lisible) ── */
  function barChart(containerId, data, options = {}) {
    const container = _prep(containerId);
    if (!container || !data || !data.length) return;

    if (options.layout === 'vertical') {
      _renderVerticalBarChart(container, data, options);
      return;
    }

    _renderHorizontalMix(container, containerId, data, options);
  }

  function _renderHorizontalMix(container, containerId, data, _options = {}) {
    const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const maxVal = Math.max(...data.map(d => Number(d.value) || 0), 1);

    if (total === 0) {
      container.innerHTML = `
        <div class="chart-empty-state">
          <div style="font-size:24px;margin-bottom:6px;">📊</div>
          <strong>Aucun contenu planifié</strong>
          <p style="color:var(--muted);font-size:12px;margin:4px 0 0;">Les formats s'afficheront dès qu'une publication sera enregistrée.</p>
        </div>`;
      return;
    }

    const activeItems = data
      .filter(d => (Number(d.value) || 0) > 0)
      .sort((a, b) => b.value - a.value);
    const zeroItems = data.filter(d => (Number(d.value) || 0) === 0);

    const renderRow = (d, isMuted = false) => {
      const val = Number(d.value) || 0;
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      const barPct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
      const icon = d.icon || FORMAT_ICONS[d.id] || '📄';
      const color = d.color || '#1746d1';
      return `
        <div class="mix-row ${isMuted ? 'mix-row--muted' : ''}">
          <div class="mix-row__label" title="${escapeHtml(d.label)}">
            <span class="mix-row__dot" style="background:${color}"></span>
            <span class="mix-row__icon" aria-hidden="true">${icon}</span>
            <strong class="mix-row__name">${escapeHtml(d.label)}</strong>
          </div>
          <div class="mix-row__track" title="${escapeHtml(d.label)} : ${val} contenu${val > 1 ? 's' : ''} (${pct}%)">
            <div class="mix-row__bar" style="width:${barPct}%;background:${color};"></div>
          </div>
          <div class="mix-row__meta">
            <strong class="mix-row__val">${val}</strong>
            <span class="mix-row__pct">${pct}%</span>
          </div>
        </div>`;
    };

    const segmentsHtml = activeItems.map(d => {
      const val = Number(d.value) || 0;
      const pct = Math.round((val / total) * 100);
      const widthPct = (val / total) * 100;
      return `<div class="mix-distribution-segment" style="width:${widthPct}%;background:${d.color || '#1746d1'};" title="${escapeHtml(d.label)} : ${val} (${pct}%)"></div>`;
    }).join('');

    const toggleBtnId = `${containerId}-toggle-zeros`;
    const drawerId = `${containerId}-zeros-drawer`;

    container.innerHTML = `
      <div class="mix-container" role="region" aria-label="Répartition par format de contenu">
        <div class="mix-summary-header">
          <span class="mix-summary-caption">Répartition sur <strong>${total}</strong> publication${total > 1 ? 's' : ''} (${activeItems.length} format${activeItems.length > 1 ? 's' : ''} actif${activeItems.length > 1 ? 's' : ''})</span>
        </div>
        <div class="mix-distribution-bar" aria-hidden="true">
          ${segmentsHtml}
        </div>
        <div class="mix-items-list">
          ${activeItems.map(d => renderRow(d, false)).join('')}
        </div>
        ${zeroItems.length > 0 ? `
          <div class="mix-zero-section">
            <div class="mix-zero-summary">
              <span class="mix-zero-badge">${zeroItems.length} format${zeroItems.length > 1 ? 's' : ''} à 0</span>
              <span class="mix-zero-text" title="${escapeHtml(zeroItems.map(z => z.label).join(', '))}">Disponibles : ${zeroItems.map(z => escapeHtml(z.label)).join(', ')}</span>
              <button type="button" class="mix-toggle-btn" id="${toggleBtnId}">Afficher tous (${data.length})</button>
            </div>
            <div class="mix-zero-details" id="${drawerId}" style="display:none;">
              ${zeroItems.map(d => renderRow(d, true)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    const toggleBtn = document.getElementById(toggleBtnId);
    const drawer = document.getElementById(drawerId);
    if (toggleBtn && drawer) {
      toggleBtn.onclick = () => {
        const isHidden = drawer.style.display === 'none';
        drawer.style.display = isHidden ? 'flex' : 'none';
        toggleBtn.textContent = isHidden ? 'Masquer les formats à 0' : `Afficher tous (${data.length})`;
      };
    }
  }

  function _renderVerticalBarChart(container, data, options = {}) {
    const activeOnly = options.includeZeros ? data : data.filter(d => d.value > 0);
    const displayData = activeOnly.length ? activeOnly : data;

    const width = 500, height = 260;
    const rotateLabels = displayData.length > 5 || displayData.some(d => (d.label || '').length > 9);
    const margin = { top: 24, right: 20, bottom: rotateLabels ? 68 : 44, left: 42 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const maxVal = Math.max(...displayData.map(d => d.value), 1);

    const ticks = _computeIntegerTicks(maxVal, 4);
    const maxTick = ticks[ticks.length - 1] || maxVal;

    const count = displayData.length;
    const barW = Math.min(44, Math.max(18, (chartW / count) * 0.62));
    const gap = (chartW - barW * count) / (count + 1);

    const svg = _svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'chart',
      role: 'img',
      'aria-label': 'Graphique de répartition par type de contenu'
    });
    const g = _svgEl('g', { transform: `translate(${margin.left},${margin.top})` });

    // Lignes horizontales avec graduations entières sans doublons
    ticks.forEach(tick => {
      const y = chartH - (tick / maxTick) * chartH;
      g.appendChild(_svgEl('line', { x1: 0, y1: y, x2: chartW, y2: y, class: 'chart__grid' }));
      const label = _svgEl('text', { x: -8, y: y + 4, 'text-anchor': 'end', class: 'chart__axis-label' });
      label.textContent = tick;
      g.appendChild(label);
    });

    displayData.forEach((d, i) => {
      const x = gap + i * (barW + gap);
      const barH = (d.value / maxTick) * chartH;
      const y = chartH - barH;

      const rect = _svgEl('rect', {
        x, y, width: barW, height: Math.max(barH, 2),
        fill: d.color || '#0ea5e9', rx: 4
      });
      const tip = _svgEl('title');
      tip.textContent = `${d.label}: ${d.value}`;
      rect.appendChild(tip);
      g.appendChild(rect);

      const valText = _svgEl('text', {
        x: x + barW / 2, y: y - 6,
        'text-anchor': 'middle', class: 'chart__value'
      });
      valText.textContent = d.value;
      g.appendChild(valText);

      const cx = x + barW / 2;
      const cy = chartH + (rotateLabels ? 14 : 20);
      const lbl = _svgEl('text', {
        x: cx,
        y: cy,
        'text-anchor': rotateLabels ? 'end' : 'middle',
        class: 'chart__axis-label',
        transform: rotateLabels ? `rotate(-32, ${cx}, ${cy})` : null
      });
      lbl.textContent = d.label;
      g.appendChild(lbl);
    });

    svg.appendChild(g);
    container.appendChild(svg);
  }

  /* ── 2. Graphique en anneau (Répartition par statut) ── */
  function donutChart(containerId, data) {
    const container = _prep(containerId);
    if (!container || !data.length) return;

    const size = 230, cx = 115, cy = 115, r = 86, innerR = 54;
    const total = data.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
      container.innerHTML = '<div class="chart-empty-state"><p style="color:var(--muted);margin-top:1rem;">Aucun contenu enregistré</p></div>';
      return;
    }

    const svg = _svgEl('svg', {
      viewBox: `0 0 ${size} ${size}`,
      class: 'chart',
      role: 'img',
      'aria-label': 'Graphique en anneau de répartition par statut'
    });

    const activeData = data.filter(d => d.value > 0);
    let currentAngle = -Math.PI / 2;

    activeData.forEach(d => {
      let angle = (d.value / total) * 2 * Math.PI;
      // Évite la disparition de l'arc SVG à 360° quand un seul statut représente 100%
      if (angle >= 2 * Math.PI) angle = 2 * Math.PI - 0.001;

      const x1 = cx + r * Math.cos(currentAngle);
      const y1 = cy + r * Math.sin(currentAngle);
      const x2 = cx + r * Math.cos(currentAngle + angle);
      const y2 = cy + r * Math.sin(currentAngle + angle);

      const ix1 = cx + innerR * Math.cos(currentAngle);
      const iy1 = cy + innerR * Math.sin(currentAngle);
      const ix2 = cx + innerR * Math.cos(currentAngle + angle);
      const iy2 = cy + innerR * Math.sin(currentAngle + angle);

      const largeArc = angle > Math.PI ? 1 : 0;
      const dPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

      const path = _svgEl('path', { d: dPath, fill: d.color });
      const tip = _svgEl('title');
      tip.textContent = `${d.label}: ${d.value} (${Math.round((d.value / total) * 100)}%)`;
      path.appendChild(tip);
      svg.appendChild(path);

      currentAngle += angle;
    });

    const cVal = _svgEl('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', class: 'chart__center-value' });
    cVal.textContent = total;
    svg.appendChild(cVal);

    const cLbl = _svgEl('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', class: 'chart__center-label' });
    cLbl.textContent = total > 1 ? 'Contenus' : 'Contenu';
    svg.appendChild(cLbl);

    container.appendChild(svg);

    // Légende claire avec nombres et pourcentages
    const legend = document.createElement('div');
    legend.className = 'chart__legend';
    activeData.forEach(d => {
      const pct = Math.round((d.value / total) * 100);
      legend.innerHTML += `
        <div class="chart__legend-item">
          <span class="chart__legend-color" style="background:${d.color}"></span>
          <span><strong style="color:var(--ink);">${escapeHtml(d.label)}</strong> : ${d.value} (${pct}%)</span>
        </div>`;
    });
    container.appendChild(legend);
  }

  /* ── 3. Graphique en courbe (Évolution mensuelle) ── */
  function lineChart(containerId, data) {
    const container = _prep(containerId);
    if (!container || !data.length) return;

    const width = 600, height = 240;
    const margin = { top: 20, right: 30, bottom: 40, left: 42 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const ticks = _computeIntegerTicks(maxVal, 3);
    const maxTick = ticks[ticks.length - 1] || maxVal;
    const stepX = chartW / Math.max(data.length - 1, 1);

    const svg = _svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'chart',
      role: 'img',
      'aria-label': 'Graphique de l’évolution des publications'
    });
    const g = _svgEl('g', { transform: `translate(${margin.left},${margin.top})` });

    ticks.forEach(tick => {
      const y = chartH - (tick / maxTick) * chartH;
      g.appendChild(_svgEl('line', { x1: 0, y1: y, x2: chartW, y2: y, class: 'chart__grid' }));
      const label = _svgEl('text', { x: -8, y: y + 4, 'text-anchor': 'end', class: 'chart__axis-label' });
      label.textContent = tick;
      g.appendChild(label);
    });

    const points = data.map((d, i) => ({
      x: i * stepX,
      y: chartH - (d.value / maxTick) * chartH
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    g.appendChild(_svgEl('path', {
      d: pathD, fill: 'none', stroke: '#0ea5e9', 'stroke-width': 3, 'stroke-linecap': 'round'
    }));

    points.forEach((p, i) => {
      const circle = _svgEl('circle', {
        cx: p.x, cy: p.y, r: 4, fill: '#fff', stroke: '#0ea5e9', 'stroke-width': 2
      });
      const tip = _svgEl('title');
      tip.textContent = `${data[i].label}: ${data[i].value}`;
      circle.appendChild(tip);
      g.appendChild(circle);

      const lbl = _svgEl('text', {
        x: p.x, y: chartH + 20, 'text-anchor': 'middle', class: 'chart__axis-label'
      });
      lbl.textContent = data[i].label;
      g.appendChild(lbl);
    });

    svg.appendChild(g);
    container.appendChild(svg);
  }

  return { barChart, donutChart, lineChart };
})();

