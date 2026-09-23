/**
 * Nidal Junior — Pilotage éditorial
 * Moteur de graphiques SVG légers et accessibles (barres, donut, courbe)
 */

const NidalCharts = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function _svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function _prep(id) {
    const c = document.getElementById(id);
    if (c) c.innerHTML = '';
    return c;
  }

  /* ── 1. Graphique en barres (Répartition par type) ── */
  function barChart(containerId, data) {
    const container = _prep(containerId);
    if (!container || !data.length) return;

    const width = 500, height = 260;
    const margin = { top: 20, right: 20, bottom: 50, left: 40 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barW = Math.min(36, (chartW / data.length) * 0.7);
    const gap = (chartW - barW * data.length) / (data.length + 1);

    const svg = _svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'chart',
      role: 'img',
      'aria-label': 'Graphique de répartition par type de contenu'
    });
    const g = _svgEl('g', { transform: `translate(${margin.left},${margin.top})` });

    // Lignes horizontales de repère
    for (let i = 0; i <= 4; i++) {
      const y = chartH - (chartH / 4) * i;
      g.appendChild(_svgEl('line', { x1: 0, y1: y, x2: chartW, y2: y, class: 'chart__grid' }));
      const label = _svgEl('text', { x: -6, y: y + 4, 'text-anchor': 'end', class: 'chart__axis-label' });
      label.textContent = Math.round((maxVal / 4) * i);
      g.appendChild(label);
    }

    data.forEach((d, i) => {
      const x = gap + i * (barW + gap);
      const barH = (d.value / maxVal) * chartH;
      const y = chartH - barH;

      const rect = _svgEl('rect', {
        x, y, width: barW, height: barH,
        fill: d.color || '#0ea5e9', rx: 4
      });
      const tip = _svgEl('title');
      tip.textContent = `${d.label}: ${d.value}`;
      rect.appendChild(tip);
      g.appendChild(rect);

      const valText = _svgEl('text', {
        x: x + barW / 2, y: y - 5,
        'text-anchor': 'middle', class: 'chart__value'
      });
      valText.textContent = d.value;
      g.appendChild(valText);

      const lbl = _svgEl('text', {
        x: x + barW / 2, y: chartH + 18,
        'text-anchor': 'middle', class: 'chart__axis-label'
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

    const size = 240, cx = 120, cy = 120, r = 90, innerR = 55;
    const total = data.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);margin-top:2rem;">Aucun contenu enregistré</p>';
      return;
    }

    const svg = _svgEl('svg', {
      viewBox: `0 0 ${size} ${size}`,
      class: 'chart',
      role: 'img',
      'aria-label': 'Graphique en anneau de répartition par statut'
    });

    let currentAngle = -Math.PI / 2;

    data.forEach(d => {
      if (d.value === 0) return;
      const angle = (d.value / total) * 2 * Math.PI;
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

    const cVal = _svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', class: 'chart__center-value' });
    cVal.textContent = total;
    svg.appendChild(cVal);

    const cLbl = _svgEl('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', class: 'chart__center-label' });
    cLbl.textContent = 'Total';
    svg.appendChild(cLbl);

    container.appendChild(svg);

    // Légende accessible
    const legend = document.createElement('div');
    legend.className = 'chart__legend';
    data.forEach(d => {
      if (d.value === 0) return;
      const pct = Math.round((d.value / total) * 100);
      legend.innerHTML += `
        <div class="chart__legend-item">
          <span class="chart__legend-color" style="background:${d.color}"></span>
          <span>${escapeHtml(d.label)} (${pct}%)</span>
        </div>`;
    });
    container.appendChild(legend);
  }

  /* ── 3. Graphique en courbe (Évolution mensuelle) ── */
  function lineChart(containerId, data) {
    const container = _prep(containerId);
    if (!container || !data.length) return;

    const width = 600, height = 240;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const stepX = chartW / Math.max(data.length - 1, 1);

    const svg = _svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'chart',
      role: 'img',
      'aria-label': 'Graphique de l’évolution des publications'
    });
    const g = _svgEl('g', { transform: `translate(${margin.left},${margin.top})` });

    for (let i = 0; i <= 3; i++) {
      const y = chartH - (chartH / 3) * i;
      g.appendChild(_svgEl('line', { x1: 0, y1: y, x2: chartW, y2: y, class: 'chart__grid' }));
      const label = _svgEl('text', { x: -6, y: y + 4, 'text-anchor': 'end', class: 'chart__axis-label' });
      label.textContent = Math.round((maxVal / 3) * i);
      g.appendChild(label);
    }

    const points = data.map((d, i) => ({
      x: i * stepX,
      y: chartH - (d.value / maxVal) * chartH
    }));

    // Tracé de la ligne
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    g.appendChild(_svgEl('path', {
      d: pathD, fill: 'none', stroke: '#0ea5e9', 'stroke-width': 3, 'stroke-linecap': 'round'
    }));

    // Points et labels
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
