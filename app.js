/* Finance Lab for SELANA
   One connected model: unit economics, container cash curve, twelve-month forecast,
   three statements, budget vs actual, journal entries. Plain JavaScript, no dependencies. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- constants */
  const VAT = 0.21;
  const PUB = { alphaGross: 1900, novaPromo: 899, novaList: 1100, connectYear: 120 };
  const F = {
    inbound: 12,          // inland transport and warehouse receiving, per unit
    delivery: 35,         // last mile for a 28 kg parcel in NL, per webshop unit
    feeRate: 0.012,       // payment processing on gross webshop price
    warrantyRate: 0.02,   // provision as share of net revenue, 24-month warranty
    claimsShare: 0.5,     // share of the provision paid out in cash each month
    dealerDisc: 0.20,     // dealers buy 20% below the net price
    upcAlpha: 280,        // Alphas per 40 ft container
    upcNova: 420,         // Novas per 40 ft container, folded and lighter
    fobNovaRatio: 0.52,   // Nova factory price relative to Alpha
    rent: 8000, software: 3000, compliance: 4000, other: 3000, rnd: 10000,
    tooling: 120000, toolingYears: 5,
    buffer: 100000,
    openAlphaUnits: 150,
    leadMonths: 3
  };
  const MONTHS = ['Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27', 'Jul 27', 'Aug 27', 'Sep 27', 'Oct 27'];
  const VAT_MONTHS = new Set([2, 5, 8, 11]);

  /* ---------------------------------------------------------------- state */
  const S = {
    fob: 640, freight: 4200, duty: 6, dealer: 25,
    deposit: 30, prod: 60, transit: 47, velocity: 120, terms: 30,
    units: 120, growth: 5, nova: 60, deposits: 300000, opencash: 400000, team: 55000, mkt: 7
  };
  const fmtOut = {
    fob: v => eur(v), freight: v => eur(v), duty: v => v + '%', dealer: v => v + '%',
    deposit: v => v + '%', prod: v => v + ' days', transit: v => v + ' days', velocity: v => v + ' / month', terms: v => v === 0 ? 'on delivery' : v + ' days',
    units: v => v + ' units', growth: v => v + '% a month', nova: v => v + ' units', deposits: v => eur(v), opencash: v => eur(v), team: v => eur(v), mkt: v => v + '% of revenue'
  };

  /* ---------------------------------------------------------------- helpers */
  const $ = id => document.getElementById(id);
  function eur(n, d) {
    d = d || 0;
    const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (n < 0 ? '-' : '') + '€' + s;
  }
  function k(n) {
    const v = Math.round(n / 1000);
    if (v === 0) return '0';
    return (v < 0 ? '-' : '') + Math.abs(v).toLocaleString('en-US');
  }
  function int(n) { return Math.round(n).toLocaleString('en-US'); }
  function pct(n, d) { return (n * 100).toFixed(d === undefined ? 1 : d) + '%'; }
  function cls(n) { return n < -0.5 ? ' class="neg"' : ''; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function fobNova() { return Math.round(S.fob * F.fobNovaRatio); }
  function taxOn(x) { return x <= 0 ? 0 : (x <= 200000 ? 0.19 * x : 0.19 * 200000 + 0.258 * (x - 200000)); }

  /* ---------------------------------------------------------------- unit economics */
  function unitEcon(product, novaPrice) {
    const gross = product === 'alpha' ? PUB.alphaGross : (novaPrice || PUB.novaPromo);
    const net = gross / (1 + VAT);
    const fob = product === 'alpha' ? S.fob : fobNova();
    const upc = product === 'alpha' ? F.upcAlpha : F.upcNova;
    const freight = S.freight / upc;
    const duty = (fob + freight) * S.duty / 100;
    const landed = fob + freight + duty + F.inbound;
    const ds = S.dealer / 100;
    const dealerNet = net * (1 - F.dealerDisc);
    const blended = net * (1 - ds) + dealerNet * ds;
    const dealerDisc = net - blended;
    const delivery = F.delivery * (1 - ds);
    const fees = gross * F.feeRate * (1 - ds);
    const warranty = blended * F.warrantyRate;
    const contribution = blended - landed - delivery - fees - warranty;
    return { gross, net, vat: gross - net, fob, upc, freight, duty, inbound: F.inbound, landed, ds, dealerNet, blended, dealerDisc, delivery, fees, warranty, contribution, margin: contribution / blended };
  }

  function renderUnit() {
    const u = unitEcon('alpha');
    const segs = [
      { n: 'VAT to the tax office', v: u.vat, c: '#5c5955', t: 'VAT' },
      { n: 'Dealer discount, blended', v: u.dealerDisc, c: '#7c7c7a', t: 'Dealers' },
      { n: 'Factory price', v: u.fob, c: '#ae8a38', t: 'Factory' },
      { n: 'Sea freight and inbound', v: u.freight + u.inbound, c: '#8c7332', t: 'Freight' },
      { n: 'Import duty', v: u.duty, c: '#d1b15a', t: 'Duty' },
      { n: 'Delivery and payment fees', v: u.delivery + u.fees, c: '#6f86e6', t: 'Selling' },
      { n: 'Warranty provision', v: u.warranty, c: '#4a5fc4', t: 'Warranty' },
      { n: 'Contribution per Alpha', v: u.contribution, c: '#2e9e7b', t: 'Contribution' }
    ];
    const bar = $('unit-bar'), leg = $('unit-legend');
    bar.innerHTML = segs.map(s => {
      const share = Math.max(s.v, 0) / u.gross * 100;
      return '<div class="seg' + (share > 9 ? ' wide' : '') + '" style="flex-basis:' + share.toFixed(3) + '%;background:' + s.c + '" title="' + esc(s.n) + ': ' + eur(s.v) + '"><span class="lbl">' + esc(s.t) + ' ' + eur(s.v) + '</span></div>';
    }).join('');
    leg.innerHTML = segs.map(s => '<li><span class="sw" style="background:' + s.c + '"></span><span>' + esc(s.n) + '</span><span class="v">' + eur(s.v) + '<span class="pct">' + pct(s.v / u.gross, 0) + '</span></span></li>').join('');
    $('r-blended').textContent = eur(u.blended);
    $('r-landed').textContent = eur(u.landed);
    $('r-contrib').textContent = eur(u.contribution);
    $('r-contrib').className = 'v ' + (u.contribution > 0 ? 'good' : 'bad');
    $('r-margin').textContent = pct(u.margin, 1);
  }

  /* ---------------------------------------------------------------- container cash curve */
  function containerCurve(over) {
    const o = Object.assign({}, S, over || {});
    const u = unitEcon('alpha');
    const upc = F.upcAlpha;
    const depositAmt = o.deposit / 100 * o.fob * upc;
    const balanceAmt = (1 - o.deposit / 100) * o.fob * upc;
    const arrivalCost = o.freight + (u.duty + u.inbound) * upc;
    const dShip = o.prod, dArr = o.prod + o.transit, dSell = dArr + 1;
    const perDay = o.velocity / 30.4;
    const sellDays = Math.ceil(upc / perDay);
    const ds = o.dealer / 100;
    const webCash = u.net - F.delivery - u.gross * F.feeRate - u.warranty;
    const dealerCash = u.dealerNet - u.warranty;
    const T = dSell + sellDays + Math.max(o.terms, 2) + 5;
    const flow = new Float64Array(T + 1);
    flow[0] -= depositAmt;
    flow[dShip] -= balanceAmt;
    flow[dArr] -= arrivalCost;
    let left = upc;
    for (let d = dSell; left > 0; d++) {
      const q = Math.min(perDay, left); left -= q;
      flow[Math.min(d + 2, T)] += q * (1 - ds) * webCash;
      flow[Math.min(d + o.terms, T)] += q * ds * dealerCash;
    }
    const cum = []; let c = 0, minV = 0, minD = 0;
    for (let d = 0; d <= T; d++) { c += flow[d]; cum.push(c); if (c < minV) { minV = c; minD = d; } }
    let back = null;
    for (let d = minD; d <= T; d++) { if (cum[d] >= 0) { back = d; break; } }
    let lastIn = T; for (let d = T; d >= 0; d--) { if (flow[d] > 0) { lastIn = d; break; } }
    return { cum, T, minV, minD, back, lastIn, dShip, dArr, dSell, sellDays, soldOut: dSell + sellDays - 1, end: cum[T], depositAmt, balanceAmt, arrivalCost };
  }

  function renderContainer() {
    const r = containerCurve();
    $('r-peak').textContent = eur(r.minV);
    $('r-back').textContent = r.back === null ? 'never' : 'day ' + r.back;
    $('r-cycle').textContent = r.lastIn + ' days';
    $('r-end').textContent = eur(r.end);
    $('r-end').className = 'v ' + (r.end > 0 ? 'good' : 'bad');

    const alt = containerCurve({ velocity: Math.round(S.velocity * 1.5) });
    const alt2 = containerCurve({ deposit: Math.max(0, S.deposit - 20) });
    let txt = 'Selling 50% faster (' + Math.round(S.velocity * 1.5) + ' a month) brings the cash back on day ' + (alt.back === null ? 'never' : alt.back) + ' instead of day ' + (r.back === null ? 'never' : r.back) + ' and does not change the deepest point.';
    if (S.deposit >= 20) txt += ' Cutting the deposit by 20 points ' + (Math.abs(alt2.minV - r.minV) < 1 ? 'does not move the deepest point at all' : 'moves the deepest point by only ' + eur(alt2.minV - r.minV)) + ', because the balance falls due at shipment anyway. The levers that shrink the peak are freight and duty, or a smaller first container.';
    $('container-insight').textContent = txt;

    const W = chartWidth($('chart-container')), narrow = W < 600, H = narrow ? 260 : 320, mL = 50, mR = 14, mT = 42, mB = 34;
    const x = d => mL + d / r.T * (W - mL - mR);
    const yMax = Math.max(r.end, 0) * 1.08, yMin = r.minV * 1.08;
    const y = v => mT + (yMax - v) / (yMax - yMin) * (H - mT - mB);
    const ticks = niceTicks(yMin, yMax, 5);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Cumulative cash of one container over ' + r.T + ' days, lowest point ' + eur(r.minV) + ' on day ' + r.minD + ', back to zero on day ' + (r.back === null ? 'never' : r.back) + '">';
    s += '<g class="grid">' + ticks.map(t => '<line x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>').join('') + '</g>';
    s += '<g class="axis">' + ticks.map(t => '<text x="' + (mL - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + kShort(t) + '</text>').join('');
    const xt = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360].filter(d => d <= r.T && (!narrow || d % 60 === 0));
    s += xt.map(d => '<text x="' + x(d) + '" y="' + (H - 10) + '" text-anchor="middle">' + (d === 0 ? 'day 0' : d) + '</text>').join('') + '</g>';
    s += '<line class="zero" x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    let path = '', area = 'M' + x(0) + ' ' + y(0);
    for (let d = 0; d <= r.T; d++) { const p = x(d).toFixed(1) + ' ' + y(r.cum[d]).toFixed(1); path += (d === 0 ? 'M' : 'L') + p; area += 'L' + p; }
    area += 'L' + x(r.T) + ' ' + y(0) + 'Z';
    s += '<path class="series-area" d="' + area + '"/>';
    s += '<path class="series-line" d="' + path + '"/>';
    const ev = [
      { d: 0, t: 'Deposit', m: true }, { d: r.dShip, t: 'Balance at shipment', m: true }, { d: r.dArr, t: 'Lands in NL', m: true },
      { d: r.back, t: 'Cash back', m: true }, { d: r.soldOut, t: 'Sold out', m: false }
    ].filter(e => e.d !== null && e.d !== undefined);
    ev.forEach((e, i) => {
      const yy = mT - 8 - (i % 2) * 12;
      s += '<line class="event-line" x1="' + x(e.d) + '" x2="' + x(e.d) + '" y1="' + (yy + 4) + '" y2="' + (H - mB) + '"/>';
      s += '<text class="event-text' + (e.m ? '' : ' muted') + '" x="' + (x(e.d) + 4) + '" y="' + yy + '">' + esc(e.t) + '</text>';
      s += '<circle class="marker" r="4" cx="' + x(e.d) + '" cy="' + y(r.cum[e.d]) + '"/>';
    });
    s += '<line class="crosshair" id="ch-container" x1="0" x2="0" y1="' + mT + '" y2="' + (H - mB) + '" style="display:none"/>';
    s += '<rect class="hit" x="' + mL + '" y="' + mT + '" width="' + (W - mL - mR) + '" height="' + (H - mT - mB) + '"/>';
    s += '</svg>';
    const wrap = $('chart-container');
    const tt = $('tt-container');
    wrap.innerHTML = s; wrap.appendChild(tt);
    hover(wrap, 'ch-container', tt, W, H, mL, mR, (fx) => {
      const d = Math.max(0, Math.min(r.T, Math.round((fx - mL) / (W - mL - mR) * r.T)));
      return { x: x(d), html: '<div class="t">Day ' + d + '</div><div class="r"><span>Cumulative cash</span><span>' + eur(r.cum[d]) + '</span></div>' };
    });
  }

  function chartWidth(wrap) {
    const w = wrap.clientWidth || (wrap.parentElement && wrap.parentElement.clientWidth) || 800;
    return Math.max(380, Math.min(800, Math.round(w)));
  }
  function kShort(v) {
    if (v === 0) return '0';
    const a = Math.abs(v);
    const s = a >= 1e6 ? (a / 1e6).toFixed(1) + 'M' : Math.round(a / 1000) + 'k';
    return (v < 0 ? '-' : '') + s;
  }
  function niceTicks(min, max, n) {
    const span = max - min; const raw = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag; const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const out = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v));
    return out;
  }
  function hover(wrap, chId, tt, W, H, mL, mR, fn) {
    const svg = wrap.querySelector('svg');
    const ch = svg.querySelector('#' + chId);
    function move(e) {
      const b = svg.getBoundingClientRect();
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - b.left;
      const fx = px / b.width * W;
      if (fx < mL || fx > W - mR) { leave(); return; }
      const res = fn(fx);
      ch.style.display = ''; ch.setAttribute('x1', res.x); ch.setAttribute('x2', res.x);
      tt.innerHTML = res.html; tt.classList.add('show');
      tt.style.left = (res.x / W * b.width) + 'px';
      tt.style.top = (res.y !== undefined ? res.y / H * b.height : 48) + 'px';
    }
    function leave() { ch.style.display = 'none'; tt.classList.remove('show'); }
    svg.addEventListener('mousemove', move); svg.addEventListener('mouseleave', leave);
    svg.addEventListener('touchstart', move, { passive: true }); svg.addEventListener('touchmove', move, { passive: true });
  }

  /* ---------------------------------------------------------------- twelve-month forecast */
  function forecast() {
    const M = MONTHS.length;
    const ua = unitEcon('alpha');
    const novaPriceAt = m => m <= 4 ? PUB.novaPromo : PUB.novaList;
    const g = S.growth / 100;
    const demandA = m => Math.round(S.units * Math.pow(1 + g, m));
    const demandN = m => m === 0 ? 0 : Math.round(S.nova * Math.pow(1 + g, m - 1));
    const demand = (p, m) => p === 'alpha' ? demandA(m) : demandN(m);
    const upc = p => p === 'alpha' ? F.upcAlpha : F.upcNova;
    const fobOf = p => p === 'alpha' ? S.fob : fobNova();
    const ds = S.dealer / 100;

    // ordering plan: arrivals (prepaid ones first), then reorder when projected stock falls under one month of demand
    const arrivals = [{ m: 0, p: 'alpha', prepaid: true }, { m: 1, p: 'nova', prepaid: true }];
    const payments = [];
    const ordered = { alpha: 0, nova: 0 };
    const openUnits = { alpha: F.openAlphaUnits, nova: 0 };
    function projected(p, upto) {
      let s = openUnits[p];
      for (let m = 0; m <= upto; m++) { s += arrivals.filter(a => a.p === p && a.m === m).length * upc(p); s -= Math.max(0, Math.min(demand(p, m), s)); }
      return s;
    }
    ['alpha', 'nova'].forEach(p => {
      for (let m = 0; m < M; m++) {
        let guard = 0;
        while (projected(p, m + F.leadMonths) < demand(p, m + F.leadMonths + 1) && guard < 3) {
          arrivals.push({ m: m + F.leadMonths, p, prepaid: false });
          payments.push({ m, p, amt: S.deposit / 100 * fobOf(p) * upc(p), kind: 'deposit' });
          payments.push({ m: m + 2, p, amt: (1 - S.deposit / 100) * fobOf(p) * upc(p), kind: 'balance' });
          ordered[p]++; guard++;
        }
      }
    });

    // opening balance sheet
    let cash = S.opencash;
    const inv = { alpha: { u: F.openAlphaUnits, v: F.openAlphaUnits * ua.landed }, nova: { u: 0, v: 0 } };
    let prepay = S.fob * F.upcAlpha + fobNova() * F.upcNova;
    let fixed = F.tooling; const dep = F.tooling / F.toolingYears / 12;
    let recv = 0, ap = 0, vatPay = 0, depositsL = S.deposits / (1 + VAT), prov = 0, taxPay = 0;
    const open = { cash, recv, inv: inv.alpha.v, prepay, fixed, ap, vatPay, depositsL, prov, taxPay };
    const equityOpen = cash + inv.alpha.v + prepay + fixed - depositsL;
    open.equity = equityOpen;

    const rows = []; let cumEBT = 0, cumNI = 0, unmet = 0, worstDiff = 0;
    const tot = { revA: 0, revN: 0, revDep: 0, cogs: 0, delivery: 0, fees: 0, warranty: 0, team: 0, rent: 0, mkt: 0, software: 0, compliance: 0, rnd: 0, other: 0, dep: 0, tax: 0, ni: 0, supplier: 0, vatPaid: 0 };

    for (let m = 0; m < M; m++) {
      const cash0 = cash;
      const un = unitEcon('nova', novaPriceAt(m));
      // containers landing
      let landed = 0, supplierCash = 0;
      arrivals.filter(a => a.m === m).forEach(a => {
        const uu = unitEcon(a.p, novaPriceAt(m));
        const units = upc(a.p), fobTot = fobOf(a.p) * units;
        const arrivalCost = S.freight + (uu.duty + uu.inbound) * units;
        prepay -= fobTot; cash -= arrivalCost; supplierCash += arrivalCost;
        inv[a.p].u += units; inv[a.p].v += fobTot + arrivalCost; landed++;
      });
      payments.filter(p => p.m === m).forEach(p => { cash -= p.amt; prepay += p.amt; supplierCash += p.amt; });
      // sales, capped by stock
      const dA = demandA(m), dN = demandN(m);
      const soldA = Math.min(dA, inv.alpha.u), soldN = Math.min(dN, inv.nova.u);
      unmet += (dA - soldA) + (dN - soldN);
      const depUnits = Math.min(soldN, Math.floor(depositsL / un.net));
      const cashN = soldN - depUnits;
      const dealerA = Math.round(soldA * ds), webA = soldA - dealerA;
      const dealerN = Math.round(cashN * ds), webN = cashN - dealerN;
      const revWeb = webA * ua.net + webN * un.net;
      const revDealer = dealerA * ua.dealerNet + dealerN * un.dealerNet;
      const revDep = depUnits * un.net;
      const revenue = revWeb + revDealer + revDep;
      depositsL -= revDep;
      const feeA = webA * ua.gross * F.feeRate, feeN = webN * un.gross * F.feeRate;
      cash += webA * ua.gross + webN * un.gross - feeA - feeN;
      const delivery = (webA + webN) * F.delivery; cash -= delivery;
      const outVat = (webA * ua.vat + webN * un.vat) + (revDealer * VAT);
      cash += recv; recv = revDealer * (1 + VAT);
      // cost of goods at weighted average cost
      const costA = inv.alpha.u ? inv.alpha.v / inv.alpha.u : 0, costN = inv.nova.u ? inv.nova.v / inv.nova.u : 0;
      const cogs = soldA * costA + soldN * costN;
      inv.alpha.u -= soldA; inv.alpha.v -= soldA * costA; inv.nova.u -= soldN; inv.nova.v -= soldN * costN;
      // warranty
      const warranty = revenue * F.warrantyRate; prov += warranty;
      const claims = warranty * F.claimsShare; prov -= claims; cash -= claims;
      // operating costs
      const mkt = revenue * S.mkt / 100;
      const apItems = mkt + F.software + F.compliance + F.other + F.rnd;
      cash -= S.team + F.rent * (1 + VAT);
      cash -= ap; ap = apItems * (1 + VAT);
      const inVat = (F.rent + apItems) * VAT;
      vatPay += outVat - inVat;
      let vatPaid = 0;
      if (VAT_MONTHS.has(m)) { vatPaid = vatPay; cash -= vatPay; vatPay = 0; }
      // depreciation, tax, result
      fixed -= dep;
      const opex = S.team + F.rent + apItems;
      const ebitda = revenue - cogs - delivery - feeA - feeN - warranty - opex;
      const ebit = ebitda - dep;
      cumEBT += ebit;
      const taxTot = taxOn(cumEBT); const taxExp = taxTot - taxPay; taxPay = taxTot;
      const ni = ebit - taxExp; cumNI += ni;
      // balance check
      const assets = cash + recv + inv.alpha.v + inv.nova.v + prepay + fixed;
      const liab = ap + vatPay + depositsL + prov + taxPay;
      const diff = assets - liab - (equityOpen + cumNI);
      worstDiff = Math.max(worstDiff, Math.abs(diff));
      rows.push({ m, label: MONTHS[m], soldA, soldN, depUnits, revenue, revA: soldA ? webA * ua.net + dealerA * ua.dealerNet : 0, revN: revenue - (webA * ua.net + dealerA * ua.dealerNet), cogs, gross: revenue - cogs, sell: delivery + feeA + feeN, warranty, opex, ebitda, dep, ni, landed, supplierCash, vatPaid, netCF: cash - cash0, cash, inv: inv.alpha.v + inv.nova.v, prepay, depositsL, vatPay, recv, ap, prov, taxPay, fixed });
      tot.revA += webA * ua.net + dealerA * ua.dealerNet; tot.revN += webN * un.net + dealerN * un.dealerNet; tot.revDep += revDep;
      tot.cogs += cogs; tot.delivery += delivery; tot.fees += feeA + feeN; tot.warranty += warranty;
      tot.team += S.team; tot.rent += F.rent; tot.mkt += mkt; tot.software += F.software; tot.compliance += F.compliance; tot.rnd += F.rnd; tot.other += F.other;
      tot.dep += dep; tot.tax += taxExp; tot.ni += ni; tot.supplier += supplierCash; tot.vatPaid += vatPaid;
    }
    const last = rows[rows.length - 1];
    const close = { cash: last.cash, recv: last.recv, inv: last.inv, prepay: last.prepay, fixed: last.fixed, ap: last.ap, vatPay: last.vatPay, depositsL: last.depositsL, prov: last.prov, taxPay: last.taxPay, equity: equityOpen + cumNI };
    return { rows, tot, open, close, equityOpen, cumNI, ordered, unmet, worstDiff, arrivals };
  }

  function renderForecast() {
    const f = forecast();
    const rows = f.rows, tot = f.tot;
    const minRow = rows.reduce((a, b) => (b.cash < a.cash ? b : a), rows[0]);
    const revenue = tot.revA + tot.revN + tot.revDep;
    const ebitda = rows.reduce((a, r) => a + r.ebitda, 0);
    $('r-endcash').textContent = eur(f.close.cash);
    $('r-endcash').className = 'v ' + (f.close.cash < 0 ? 'bad' : f.close.cash < F.buffer ? 'warn' : '');
    $('r-mincash').textContent = eur(minRow.cash);
    $('r-mincash').className = 'v ' + (minRow.cash < 0 ? 'bad' : minRow.cash < F.buffer ? 'warn' : 'good');
    const below = rows.filter(r => r.cash < F.buffer).length;
    $('r-mincash-sub').textContent = 'In ' + minRow.label.replace(' ', ' 20') + (below ? ', ' + below + ' month' + (below > 1 ? 's' : '') + ' under the €100k buffer' : ', never under the €100k buffer');
    $('r-rev').textContent = eur(revenue);
    $('r-rev-sub').textContent = int(rows.reduce((a, r) => a + r.soldA, 0)) + ' Alphas and ' + int(rows.reduce((a, r) => a + r.soldN, 0)) + ' Novas, ' + eur(tot.revDep) + ' from pre-order deposits';
    $('r-ebitda').textContent = eur(ebitda);
    $('r-ebitda').className = 'v ' + (ebitda < 0 ? 'bad' : 'good');
    $('r-ebitda-sub').textContent = pct(ebitda / revenue, 1) + ' of revenue';
    const landedIn = f.arrivals.filter(a => a.m < rows.length);
    const later = f.arrivals.length - landedIn.length;
    $('r-containers').textContent = landedIn.length + ' landed';
    $('r-containers-sub').textContent = landedIn.filter(a => a.p === 'alpha').length + ' Alpha and ' + landedIn.filter(a => a.p === 'nova').length + ' Nova, 2 of them paid before November' + (later ? '. ' + later + ' more on order for after October 2027' : '') + (f.unmet ? '. ' + int(f.unmet) + ' units of demand missed while waiting for stock' : '');

    // chart
    const W = chartWidth($('chart-forecast')), narrow = W < 600, H = narrow ? 240 : 300, mL = 50, mR = 14, mT = 20, mB = 34;
    const n = rows.length, bw = (W - mL - mR) / n;
    const xs = i => mL + i * bw;
    const vals = rows.map(r => r.cash).concat(rows.map(r => r.netCF), [0, F.buffer]);
    const yMax = Math.max.apply(null, vals) * 1.08, yMin = Math.min.apply(null, vals) * 1.08;
    const y = v => mT + (yMax - v) / (yMax - yMin) * (H - mT - mB);
    const ticks = niceTicks(yMin, yMax, 5);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Monthly net cash flow as bars and month-end cash as a line, November 2026 to October 2027">';
    s += '<g class="grid">' + ticks.map(t => '<line x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>').join('') + '</g>';
    s += '<g class="axis">' + ticks.map(t => '<text x="' + (mL - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + kShort(t) + '</text>').join('');
    s += rows.map((r, i) => '<text x="' + (xs(i) + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + (narrow ? r.label.slice(0, 1) : r.label) + '</text>').join('') + '</g>';
    s += '<line class="zero" x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    s += '<line class="buffer" x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(F.buffer) + '" y2="' + y(F.buffer) + '"/>';
    rows.forEach((r, i) => {
      const x0 = xs(i) + bw * 0.3, w = bw * 0.4;
      const top = Math.min(y(0), y(r.netCF)), h = Math.abs(y(0) - y(r.netCF));
      s += '<rect class="bar' + (r.netCF < 0 ? ' neg' : '') + '" x="' + x0 + '" y="' + top + '" width="' + w + '" height="' + Math.max(h, 1) + '" rx="2"/>';
    });
    let path = '';
    rows.forEach((r, i) => { path += (i ? 'L' : 'M') + (xs(i) + bw / 2).toFixed(1) + ' ' + y(r.cash).toFixed(1); });
    s += '<path class="series-line" d="' + path + '"/>';
    rows.forEach((r, i) => { s += '<circle class="marker" r="4" cx="' + (xs(i) + bw / 2) + '" cy="' + y(r.cash) + '"/>'; });
    const mi = rows.indexOf(minRow);
    s += '<text class="event-text" x="' + (xs(mi) + bw / 2) + '" y="' + (y(minRow.cash) + 18) + '" text-anchor="middle">low ' + kShort(minRow.cash) + '</text>';
    s += '<text class="event-text" x="' + (xs(n - 1) + bw / 2) + '" y="' + (y(rows[n - 1].cash) - 10) + '" text-anchor="middle">' + kShort(rows[n - 1].cash) + '</text>';
    s += '<line class="crosshair" id="ch-forecast" x1="0" x2="0" y1="' + mT + '" y2="' + (H - mB) + '" style="display:none"/>';
    s += '<rect class="hit" x="' + mL + '" y="' + mT + '" width="' + (W - mL - mR) + '" height="' + (H - mT - mB) + '"/>';
    s += '</svg>';
    const wrap = $('chart-forecast'), tt = $('tt-forecast');
    wrap.innerHTML = s; wrap.appendChild(tt);
    hover(wrap, 'ch-forecast', tt, W, H, mL, mR, (fx) => {
      const i = Math.max(0, Math.min(n - 1, Math.floor((fx - mL) / bw)));
      const r = rows[i];
      return { x: xs(i) + bw / 2, html: '<div class="t">' + r.label.replace(' ', ' 20') + '</div><div class="r"><span>Net cash flow</span><span>' + eur(r.netCF) + '</span></div><div class="r"><span>Cash at month end</span><span>' + eur(r.cash) + '</span></div><div class="r"><span>Sold</span><span>' + r.soldA + ' A, ' + r.soldN + ' N</span></div><div class="r"><span>Containers landed</span><span>' + r.landed + '</span></div>' };
    });

    // monthly table
    const line = (name, fn, opts) => {
      opts = opts || {};
      return '<tr class="' + (opts.cls || '') + '"><td>' + name + '</td>' + rows.map(r => { const v = fn(r); return '<td' + (opts.units ? '' : cls(v)) + '>' + (opts.units ? int(v) : k(v)) + '</td>'; }).join('') + '</tr>';
    };
    let t = '<table><thead><tr><th>€ thousands</th>' + rows.map(r => '<th>' + r.label + '</th>').join('') + '</tr></thead><tbody>';
    t += '<tr class="group"><td colspan="13">Units</td></tr>';
    t += line('Alphas sold', r => r.soldA, { units: true });
    t += line('Novas sold', r => r.soldN, { units: true });
    t += line('of which pre-orders delivered', r => r.depUnits, { units: true, cls: 'indent muted' });
    t += line('Containers landed', r => r.landed, { units: true });
    t += '<tr class="group"><td colspan="13">Result</td></tr>';
    t += line('Revenue', r => r.revenue);
    t += line('Cost of goods sold', r => -r.cogs);
    t += line('Gross profit', r => r.gross, { cls: 'sum' });
    t += line('Delivery, fees and warranty', r => -(r.sell + r.warranty));
    t += line('Operating costs', r => -r.opex);
    t += line('EBITDA', r => r.ebitda, { cls: 'sum' });
    t += '<tr class="group"><td colspan="13">Cash</td></tr>';
    t += line('Paid to the factory and forwarder', r => -r.supplierCash);
    t += line('VAT settled', r => -r.vatPaid);
    t += line('Net cash flow', r => r.netCF, { cls: 'sum' });
    t += line('Cash at month end', r => r.cash, { cls: 'total' });
    t += '<tr class="group"><td colspan="13">Balance sheet positions</td></tr>';
    t += line('Inventory at landed cost', r => r.inv);
    t += line('Prepayments to suppliers', r => r.prepay);
    t += line('Customer deposits still open', r => r.depositsL);
    t += line('VAT payable', r => r.vatPay);
    t += '</tbody></table>';
    $('tbl-forecast').innerHTML = t;

    renderStatements(f);
    renderJournal(f);
  }

  /* ---------------------------------------------------------------- three statements */
  function renderStatements(f) {
    const tot = f.tot, o = f.open, c = f.close;
    const revenue = tot.revA + tot.revN + tot.revDep;
    const gross = revenue - tot.cogs;
    const opex = tot.team + tot.rent + tot.mkt + tot.software + tot.compliance + tot.rnd + tot.other;
    const ebitda = gross - tot.delivery - tot.fees - tot.warranty - opex;
    const ebit = ebitda - tot.dep;
    const row = (n, v, cl, ind) => '<tr class="' + (cl || '') + (ind ? ' indent' : '') + '"><td>' + n + '</td><td' + cls(v) + '>' + k(v) + '</td></tr>';
    const row2 = (n, a, b, cl, ind) => '<tr class="' + (cl || '') + (ind ? ' indent' : '') + '"><td>' + n + '</td><td' + cls(a) + '>' + k(a) + '</td><td' + cls(b) + '>' + k(b) + '</td></tr>';

    let p = '<table><thead><tr><th>Line</th><th>12 months</th></tr></thead><tbody>';
    p += row('Revenue', revenue, 'sum');
    p += row('Alpha', tot.revA, 'muted', true);
    p += row('Nova, paid at delivery', tot.revN, 'muted', true);
    p += row('Nova, from pre-order deposits', tot.revDep, 'muted', true);
    p += row('Cost of goods sold', -tot.cogs);
    p += row('Gross profit (' + pct(gross / revenue, 0) + ')', gross, 'sum');
    p += row('Delivery and payment fees', -tot.delivery - tot.fees);
    p += row('Warranty provision', -tot.warranty);
    p += row('Team', -tot.team);
    p += row('Rent and flagship', -tot.rent);
    p += row('Marketing', -tot.mkt);
    p += row('Software and tools', -tot.software);
    p += row('Compliance and testing', -tot.compliance);
    p += row('R&amp;D', -tot.rnd);
    p += row('Other', -tot.other);
    p += row('EBITDA', ebitda, 'sum');
    p += row('Depreciation of tooling', -tot.dep);
    p += row('EBIT', ebit, 'sum');
    p += row('Corporate tax, 19% to €200k then 25.8%', -tot.tax);
    p += row('Net income', tot.ni, 'total');
    p += '</tbody></table>';
    $('tbl-pl').innerHTML = p;

    const assetsO = o.cash + o.recv + o.inv + o.prepay + o.fixed, assetsC = c.cash + c.recv + c.inv + c.prepay + c.fixed;
    const liabO = o.ap + o.vatPay + o.depositsL + o.prov + o.taxPay, liabC = c.ap + c.vatPay + c.depositsL + c.prov + c.taxPay;
    let b = '<table><thead><tr><th>Line</th><th>Opening</th><th>Closing</th></tr></thead><tbody>';
    b += '<tr class="group"><td colspan="3">Assets</td></tr>';
    b += row2('Cash', o.cash, c.cash);
    b += row2('Receivables from dealers', o.recv, c.recv);
    b += row2('Inventory at landed cost', o.inv, c.inv);
    b += row2('Prepayments to suppliers', o.prepay, c.prepay);
    b += row2('Tooling, net', o.fixed, c.fixed);
    b += row2('Total assets', assetsO, assetsC, 'total');
    b += '<tr class="group"><td colspan="3">Liabilities</td></tr>';
    b += row2('Payables', o.ap, c.ap);
    b += row2('VAT payable', o.vatPay, c.vatPay);
    b += row2('Customer deposits, Nova', o.depositsL, c.depositsL);
    b += row2('Warranty provision', o.prov, c.prov);
    b += row2('Corporate tax payable', o.taxPay, c.taxPay);
    b += row2('Total liabilities', liabO, liabC, 'sum');
    b += '<tr class="group"><td colspan="3">Equity</td></tr>';
    b += row2('Opening equity', f.equityOpen, f.equityOpen);
    b += row2('Result for the period', 0, f.cumNI);
    b += row2('Total equity', f.equityOpen, c.equity, 'sum');
    b += row2('Liabilities and equity', liabO + f.equityOpen, liabC + c.equity, 'total');
    b += '</tbody></table>';
    $('tbl-bs').innerHTML = b;
    const diff = assetsC - liabC - c.equity;
    setCheck('chk-bs', Math.abs(diff) < 1 && f.worstDiff < 1, 'Assets equal liabilities plus equity in all twelve months', 'Out of balance by ' + eur(diff));

    const dRecv = c.recv - o.recv, dInv = c.inv - o.inv, dPre = c.prepay - o.prepay, dAp = c.ap - o.ap, dVat = c.vatPay - o.vatPay, dDep = c.depositsL - o.depositsL, dProv = c.prov - o.prov, dTax = c.taxPay - o.taxPay;
    const opCF = tot.ni + tot.dep - dRecv - dInv - dPre + dAp + dVat + dDep + dProv + dTax;
    let cf = '<table><thead><tr><th>Line</th><th>12 months</th></tr></thead><tbody>';
    cf += row('Net income', tot.ni);
    cf += row('Depreciation added back', tot.dep);
    cf += row('Receivables ' + (dRecv > 0 ? 'increase' : 'decrease'), -dRecv);
    cf += row('Inventory ' + (dInv > 0 ? 'increase' : 'decrease'), -dInv);
    cf += row('Prepayments to suppliers ' + (dPre > 0 ? 'increase' : 'decrease'), -dPre);
    cf += row('Payables ' + (dAp >= 0 ? 'increase' : 'decrease'), dAp);
    cf += row('VAT payable ' + (dVat >= 0 ? 'increase' : 'decrease'), dVat);
    cf += row('Customer deposits ' + (dDep >= 0 ? 'increase' : 'used up'), dDep);
    cf += row('Warranty provision ' + (dProv >= 0 ? 'increase' : 'decrease'), dProv);
    cf += row('Tax payable ' + (dTax >= 0 ? 'increase' : 'decrease'), dTax);
    cf += row('Cash from operations', opCF, 'sum');
    cf += row('Cash from investing', 0);
    cf += row('Cash from financing', 0);
    cf += row('Net change in cash', opCF, 'sum');
    cf += row('Opening cash', o.cash);
    cf += row('Closing cash', o.cash + opCF, 'total');
    cf += '</tbody></table>';
    $('tbl-cf').innerHTML = cf;
    const cfDiff = (o.cash + opCF) - c.cash;
    setCheck('chk-cf', Math.abs(cfDiff) < 1, 'Closing cash matches the month-by-month cash balance', 'Differs from the cash roll by ' + eur(cfDiff));
  }
  function setCheck(id, ok, okText, failText) {
    const el = $(id);
    el.className = 'check' + (ok ? '' : ' fail');
    el.innerHTML = '<span class="ic">' + (ok ? '&#10003;' : '!') + '</span>' + (ok ? okText : failText);
  }

  /* ---------------------------------------------------------------- budget vs actual */
  function renderBudget() {
    const lines = [
      { n: 'Alphas shipped', b: 130, a: 118, units: true, cost: false, note: 'Container due on the 14th cleared customs on the 29th' },
      { n: 'Revenue', b: 194000, a: 176000, cost: false, note: 'Timing, follows the units. Reverses in November' },
      { n: 'Cost of goods sold', b: 91800, a: 83300, cost: true, note: 'Volume, follows revenue. Margin per unit on budget' },
      { n: 'Gross profit', b: 102200, a: 92700, cost: false, sum: true },
      { n: 'Delivery and payment fees', b: 5700, a: 5200, cost: true, note: '' },
      { n: 'Marketing', b: 13600, a: 19100, cost: true, note: 'Demo-drive tour: 41 test rides, 9 orders. Keep' },
      { n: 'Team', b: 55000, a: 55000, cost: true, note: '' },
      { n: 'Rent and flagship', b: 8000, a: 8000, cost: true, note: '' },
      { n: 'Software and tools', b: 3000, a: 3400, cost: true, note: 'Two new Shopify apps. Rebudget at €3.4k' },
      { n: 'Compliance and testing', b: 4000, a: 6200, cost: true, note: 'Nova RDW conformity tests. Move to the Nova budget' },
      { n: 'R&amp;D, Nova', b: 10000, a: 10000, cost: true, note: '' },
      { n: 'Other', b: 3000, a: 3300, cost: true, note: '' },
      { n: 'EBITDA', b: -100, a: -17500, cost: false, total: true, note: '€8.9k of the gap reverses in November' }
    ];
    let t = '<table><thead><tr><th>October 2026, sample</th><th>Budget</th><th>Actual</th><th>Variance</th><th>%</th><th>Flag</th><th style="text-align:left">One sentence</th></tr></thead><tbody>';
    lines.forEach(l => {
      const v = l.a - l.b;
      const p = l.b !== 0 ? v / Math.abs(l.b) : 0;
      const material = Math.abs(p) > 0.05 && Math.abs(v) > 1000;
      const fav = l.cost ? v < 0 : v > 0;
      const flag = material ? (fav ? '<td class="pos">Favourable</td>' : '<td class="flag">Unfavourable</td>') : '<td class="muted">' + (v === 0 ? 'On budget' : 'Not material') + '</td>';
      const fmt = l.units ? int : (x => eur(x));
      t += '<tr class="' + (l.sum ? 'sum' : l.total ? 'total' : '') + '"><td>' + l.n + '</td><td>' + fmt(l.b) + '</td><td>' + fmt(l.a) + '</td><td' + (material ? (fav ? ' class="pos"' : ' class="neg"') : '') + '>' + (v === 0 ? '0' : (v > 0 ? '+' : '') + fmt(v)) + '</td><td>' + (l.b ? (p > 0 ? '+' : '') + pct(p, 1) : '') + '</td>' + flag + '<td style="text-align:left;white-space:normal;min-width:240px;color:var(--muted)">' + (material || l.total ? (l.note || '') : '') + '</td></tr>';
    });
    t += '</tbody></table>';
    $('tbl-budget').innerHTML = t;
  }

  /* ---------------------------------------------------------------- journal entries */
  let txSelected = 0;
  function journalEntries(f) {
    const ua = unitEcon('alpha'), un = unitEcon('nova', PUB.novaPromo);
    const upc = F.upcAlpha;
    const depositAmt = S.deposit / 100 * S.fob * upc, balanceAmt = (1 - S.deposit / 100) * S.fob * upc, fobTot = S.fob * upc;
    const freightDutyInbound = S.freight + (ua.duty + ua.inbound) * upc;
    const customsValue = fobTot + S.freight;
    const importVat = (customsValue + ua.duty * upc) * VAT;
    const novaNet = PUB.novaPromo / (1 + VAT), novaVat = PUB.novaPromo - novaNet;
    const dealerGross = 10 * ua.dealerNet * (1 + VAT);
    const monthRev = f.rows[0].revenue;
    const vatQ = f.rows[2].vatPaid;
    const connectNet = PUB.connectYear / (1 + VAT);
    const BS = 'bs', PL = 'pl', CF = 'cf';
    return [
      {
        t: 'A customer pre-orders a Nova and pays €899', amt: PUB.novaPromo,
        why: 'No revenue yet: the Nova ships in Q4 2026 and the customer can cancel until then. The cash is a liability called customer deposits. Dutch VAT is due when a prepayment is received, so the VAT part is booked now and paid in the next quarterly return.',
        e: [['Bank', PUB.novaPromo, 0], ['Customer deposits', 0, novaNet], ['VAT payable', 0, novaVat]],
        fx: [[BS, 'Cash up'], [BS, 'Customer deposits up'], [BS, 'VAT payable up'], [PL, 'No effect'], [CF, 'Operating cash in']]
      },
      {
        t: 'Deposit on a purchase order for 280 Alphas', amt: depositAmt,
        why: S.deposit + '% of the factory price is paid when the order is placed, months before anything exists. It is not inventory yet and not an expense: it is a prepayment, an asset that will become inventory when the goods ship.',
        e: [['Prepayments to suppliers', depositAmt, 0], ['Bank', 0, depositAmt]],
        fx: [[BS, 'Cash down'], [BS, 'Prepayments up'], [PL, 'No effect'], [CF, 'Operating cash out']]
      },
      {
        t: 'The container ships: balance paid, stock goes in transit', amt: balanceAmt,
        why: 'Under FOB terms the goods become SELANA\'s at the port of loading, so they are inventory in transit from the day of the bill of lading, valued at the factory price. The earlier deposit is reclassified into the same inventory line.',
        e: [['Inventory in transit', fobTot, 0], ['Prepayments to suppliers', 0, depositAmt], ['Bank', 0, balanceAmt]],
        fx: [[BS, 'Cash down'], [BS, 'Prepayments down'], [BS, 'Inventory up'], [PL, 'No effect'], [CF, 'Operating cash out']]
      },
      {
        t: 'The container lands: freight, duty and import VAT', amt: freightDutyInbound,
        why: 'Freight, duty and inbound handling are part of the landed cost, so they are capitalised into inventory rather than expensed. Import VAT of ' + eur(importVat) + ' is reverse-charged under Article 23: declared and deducted in the same return, so it never leaves the bank account.',
        e: [['Inventory, landed cost', freightDutyInbound, 0], ['Bank or forwarder payable', 0, freightDutyInbound], ['VAT receivable, import', importVat, 0], ['VAT payable, import', 0, importVat]],
        fx: [[BS, 'Inventory up'], [BS, 'Cash down'], [BS, 'VAT nets to zero'], [PL, 'No effect'], [CF, 'Operating cash out']]
      },
      {
        t: 'One Alpha sold in the webshop for €1,900', amt: PUB.alphaGross,
        why: 'Revenue is the price without VAT. The payment provider keeps its fee before the payout. The second half of the entry moves the Alpha out of stock at its landed cost of ' + eur(ua.landed) + ', which is what gross margin is made of.',
        e: [['Bank, payout', PUB.alphaGross - PUB.alphaGross * F.feeRate, 0], ['Payment fees', PUB.alphaGross * F.feeRate, 0], ['Revenue', 0, ua.net], ['VAT payable', 0, ua.vat], ['Cost of goods sold', ua.landed, 0], ['Inventory', 0, ua.landed]],
        fx: [[BS, 'Cash up'], [BS, 'Inventory down'], [BS, 'VAT payable up'], [PL, 'Revenue and COGS'], [CF, 'Operating cash in']]
      },
      {
        t: 'Ten Alphas invoiced to a dealer on 30-day terms', amt: dealerGross,
        why: 'Revenue is recognised on delivery, not on payment, so a receivable is booked at the discounted price plus VAT. The VAT is owed to the tax office at the next return whether or not the dealer has paid, which is why dealer terms need watching.',
        e: [['Accounts receivable', dealerGross, 0], ['Revenue', 0, 10 * ua.dealerNet], ['VAT payable', 0, 10 * ua.dealerNet * VAT], ['Cost of goods sold', 10 * ua.landed, 0], ['Inventory', 0, 10 * ua.landed]],
        fx: [[BS, 'Receivables up'], [BS, 'Inventory down'], [PL, 'Revenue and COGS'], [CF, 'No cash yet']]
      },
      {
        t: 'A pre-ordered Nova is delivered', amt: novaNet,
        why: 'The customer paid months ago. Delivery turns the deposit into revenue and sends the Nova out of stock at ' + eur(un.landed) + ' landed cost. Profit goes up, cash goes down: the only cash in this transaction left the building when the container was paid.',
        e: [['Customer deposits', novaNet, 0], ['Revenue', 0, novaNet], ['Cost of goods sold', un.landed, 0], ['Inventory', 0, un.landed]],
        fx: [[BS, 'Deposits down'], [BS, 'Inventory down'], [PL, 'Revenue and COGS'], [CF, 'No cash']]
      },
      {
        t: 'A year of SELANA Connect sold for €120', amt: PUB.connectYear,
        why: 'A subscription is earned over twelve months, so the cash is booked as deferred revenue and released at ' + eur(connectNet / 12, 2) + ' a month. Small per unit, but across thousands of riders it changes the monthly revenue picture.',
        e: [['Bank', PUB.connectYear, 0], ['Deferred revenue', 0, connectNet], ['VAT payable', 0, PUB.connectYear - connectNet], ['Deferred revenue, each month', connectNet / 12, 0], ['Subscription revenue, each month', 0, connectNet / 12]],
        fx: [[BS, 'Cash up'], [BS, 'Deferred revenue up, then down'], [PL, 'Revenue spread over 12 months'], [CF, 'Operating cash in']]
      },
      {
        t: 'Month-end warranty provision on ' + eur(monthRev) + ' of revenue', amt: monthRev * F.warrantyRate,
        why: 'The Alpha carries a 24-month warranty, so part of every sale is a future cost. Booking 2% each month matches the cost to the revenue that caused it. Actual claims are charged against the provision, not against the month they happen to arrive in.',
        e: [['Warranty expense', monthRev * F.warrantyRate, 0], ['Warranty provision', 0, monthRev * F.warrantyRate], ['Warranty provision, when a claim is repaired', monthRev * F.warrantyRate * F.claimsShare, 0], ['Inventory, parts, or bank', 0, monthRev * F.warrantyRate * F.claimsShare]],
        fx: [[BS, 'Provision up'], [PL, 'Expense now, not later'], [CF, 'Cash only when claims are paid']]
      },
      {
        t: 'Quarterly VAT return in January', amt: vatQ,
        why: 'Output VAT on sales and deposits, less input VAT on costs, for October to December, paid by the end of January. Import VAT is in and out of the same return. In a growth phase this balance looks like cash for ten weeks and then it is not.',
        e: [['VAT payable', vatQ, 0], ['Bank', 0, vatQ]],
        fx: [[BS, 'Cash down'], [BS, 'VAT payable to zero'], [PL, 'No effect'], [CF, 'Operating cash out']]
      }
    ];
  }
  function renderJournal(f) {
    const list = journalEntries(f);
    const ul = $('tx-list');
    ul.innerHTML = list.map((tx, i) => '<li><button role="tab" aria-selected="' + (i === txSelected) + '" data-i="' + i + '"><span>' + esc(tx.t) + '</span><span class="amt">' + eur(tx.amt) + '</span></button></li>').join('');
    ul.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { txSelected = +b.dataset.i; renderJournal(f); }));
    const tx = list[txSelected];
    const dr = tx.e.reduce((a, r) => a + r[1], 0), cr = tx.e.reduce((a, r) => a + r[2], 0);
    let h = '<h3>' + esc(tx.t) + '</h3><p class="why">' + esc(tx.why) + '</p>';
    h += '<table><thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>';
    h += tx.e.map(r => '<tr><td' + (r[2] ? ' class="cr"' : '') + '>' + esc(r[0]) + '</td><td>' + (r[1] ? eur(r[1], 2) : '') + '</td><td>' + (r[2] ? eur(r[2], 2) : '') + '</td></tr>').join('');
    h += '<tr class="sum"><td>Debits equal credits</td><td>' + eur(dr, 2) + '</td><td>' + eur(cr, 2) + '</td></tr></tbody></table>';
    h += '<ul class="effects">' + tx.fx.map(x => '<li class="' + x[0] + '">' + (x[0] === 'bs' ? 'Balance sheet: ' : x[0] === 'pl' ? 'Income statement: ' : 'Cash flow: ') + esc(x[1]) + '</li>').join('') + '</ul>';
    $('tx-detail').innerHTML = h;
  }

  /* ---------------------------------------------------------------- wiring */
  function bind(id, key, after) {
    const el = $('c-' + id), out = $('o-' + id);
    const show = () => { out.textContent = fmtOut[key](S[key]); };
    el.value = S[key]; show();
    el.addEventListener('input', () => { S[key] = +el.value; show(); after(); });
  }
  function all() { renderUnit(); renderContainer(); renderForecast(); }
  function fromContainer() { renderContainer(); renderForecast(); }
  bind('fob', 'fob', all); bind('freight', 'freight', all); bind('duty', 'duty', all); bind('dealer', 'dealer', all);
  bind('deposit', 'deposit', fromContainer); bind('prod', 'prod', fromContainer); bind('transit', 'transit', fromContainer); bind('velocity', 'velocity', renderContainer); bind('terms', 'terms', fromContainer);
  bind('units', 'units', renderForecast); bind('growth', 'growth', renderForecast); bind('nova', 'nova', renderForecast); bind('deposits', 'deposits', renderForecast); bind('opencash', 'opencash', renderForecast); bind('team', 'team', renderForecast); bind('mkt', 'mkt', renderForecast);

  renderBudget();
  all();
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { renderContainer(); renderForecast(); }, 150); });
  window.FinanceLab = { S, F, PUB, unitEcon, containerCurve, forecast, rerender: all };
})();
