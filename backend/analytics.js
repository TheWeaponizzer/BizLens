const db = require('./db');

const ymd = d => { const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) };
const add = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d) };
const diff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);

function range(p, from, to) {
  const t = new Date(), today = ymd(t); let s = today, e = today;
  if (p === 'this_week') s = add(today, -((t.getDay() + 6) % 7));
  else if (p === 'this_month') s = ymd(new Date(t.getFullYear(), t.getMonth(), 1));
  else if (p === 'last_month') { s = ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)); e = ymd(new Date(t.getFullYear(), t.getMonth(), 0)) }
  else if (p === 'this_year') s = t.getFullYear() + '-01-01';
  else if (p === 'custom' && from && to && from <= to) { s = from; e = to }
  const len = Math.max(1, diff(s, e) + 1);
  return { start: s, end: e, pStart: add(s, -len), pEnd: add(s, -1) };
}
const g = (c, p) => p ? +((c - p) / p * 100).toFixed(1) : null;
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;

function stats(orders, exps, s, e) {
  const cnt = {};
  orders.filter(o => o.d <= e).forEach(o => cnt[o.customer_id] = (cnt[o.customer_id] || 0) + 1);
  const inP = orders.filter(o => o.d >= s && o.d <= e);
  const rev = inP.reduce((a, o) => a + o.rev, 0), cost = inP.reduce((a, o) => a + o.cost, 0);
  const ex = exps.filter(x => x.d >= s && x.d <= e).reduce((a, x) => a + x.amount, 0);
  const gp = rev - cost, np = gp - ex, ids = [...new Set(inP.map(o => o.customer_id))];
  const isRet = id => cnt[id] >= 2, ro = inP.filter(o => isRet(o.customer_id)), no = inP.filter(o => !isRet(o.customer_id));
  const rRev = ro.reduce((a, o) => a + o.rev, 0), nRev = no.reduce((a, o) => a + o.rev, 0), retC = ids.filter(isRet).length;
  return {
    revenue: r2(rev), productCost: r2(cost), grossProfit: r2(gp), expenses: r2(ex), netProfit: r2(np),
    margin: rev ? r2(np / rev * 100) : 0, orders: inP.length, aov: inP.length ? r2(rev / inP.length) : 0,
    expenseRatio: rev ? r2(ex / rev * 100) : 0,
    customers: {
      total: ids.length, new: ids.length - retC, returning: retC, rate: ids.length ? r2(retC / ids.length * 100) : 0,
      returningRevenue: r2(rRev), newRevenue: r2(nRev), returningOrders: ro.length, newOrders: no.length,
      returningAov: ro.length ? r2(rRev / ro.length) : 0, newAov: no.length ? r2(nRev / no.length) : 0,
      revenueShare: rev ? r2(rRev / rev * 100) : 0
    }
  };
}

async function compute(bid, q = {}) {
  const { start, end, pStart, pEnd } = range(q.period || 'this_month', q.from, q.to);

  const [orders] = await db.query(`
   SELECT o.id,o.customer_id,o.order_date d,
          SUM(oi.selling_price*oi.quantity) rev,
          SUM(oi.cost_price*oi.quantity) cost
   FROM orders o JOIN order_items oi ON oi.order_id=o.id
   WHERE o.business_id=? AND o.status<>'cancelled' AND o.order_date<=?
   GROUP BY o.id`, [bid, end]);

  const [exps] = await db.query(`
   SELECT e.amount,e.expense_date d,c.name cat
   FROM expenses e JOIN expense_categories c ON c.id=e.category_id
   WHERE e.business_id=? AND e.expense_date BETWEEN ? AND ?`, [bid, pStart, end]);

  const cur = stats(orders, exps, start, end), prev = stats(orders, exps, pStart, pEnd);
  const growth = {
    revenue: g(cur.revenue, prev.revenue), netProfit: g(cur.netProfit, prev.netProfit),
    orders: g(cur.orders, prev.orders), aov: g(cur.aov, prev.aov),
    returningCustomers: g(cur.customers.returning, prev.customers.returning),
    returningRate: +(cur.customers.rate - prev.customers.rate).toFixed(1),
    expenses: g(cur.expenses, prev.expenses)
  };

  const [items] = await db.query(`
   SELECT p.id,p.name,p.category,
          SUM(oi.quantity) units,
          SUM(oi.selling_price*oi.quantity) revenue,
          SUM(oi.cost_price*oi.quantity) cost
   FROM order_items oi
   JOIN orders o ON o.id=oi.order_id
   JOIN products p ON p.id=oi.product_id
   WHERE o.business_id=? AND o.status<>'cancelled' AND o.order_date BETWEEN ? AND ?
   GROUP BY p.id,p.name,p.category`, [bid, start, end]);

  const products = items.map(i => ({
    ...i, revenue: r2(i.revenue), cost: r2(i.cost),
    profit: r2(i.revenue - i.cost),
    margin: i.revenue ? r2((i.revenue - i.cost) / i.revenue * 100) : 0
  }));

  const cats = {};
  products.forEach(p => {
    const c = cats[p.category] ??= { category: p.category, revenue: 0, cost: 0 };
    c.revenue += p.revenue; c.cost += p.cost;
  });
  const categories = Object.values(cats).map(c => ({
    ...c, revenue: r2(c.revenue), cost: r2(c.cost), profit: r2(c.revenue - c.cost),
    margin: c.revenue ? r2((c.revenue - c.cost) / c.revenue * 100) : 0
  }));

  const best = k => products.length ? products.reduce((a, b) => b[k] > a[k] ? b : a) : null;
  const top = { revenue: best('revenue'), units: best('units'), profit: best('profit'), margin: best('margin') };

  const byCat = {};
  exps.filter(x => x.d >= start && x.d <= end).forEach(x => byCat[x.cat] = (byCat[x.cat] || 0) + x.amount);
  const expenseBreakdown = Object.entries(byCat)
    .map(([name, amount]) => ({ name, amount: r2(amount), share: cur.expenses ? r2(amount / cur.expenses * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);

  // Precompute daily values so custom ranges remain complete and efficient.
  const revByDay = {}, costByDay = {}, returningByDay = {}, expByDay = {};
  const lifetime = {};
  for (const o of orders) {
    if (o.d <= end) lifetime[o.customer_id] = (lifetime[o.customer_id] || 0) + 1;
    if (o.d >= start && o.d <= end) {
      revByDay[o.d] = (revByDay[o.d] || 0) + o.rev;
      costByDay[o.d] = (costByDay[o.d] || 0) + o.cost;
    }
  }
  // Customer lifetime counts must be evaluated at each day, so process chronological orders.
  const life = {};
  const dailyCustomers = {};
  for (const o of [...orders].sort((a, b) => a.d.localeCompare(b.d))) {
    life[o.customer_id] = (life[o.customer_id] || 0) + 1;
    if (o.d >= start && o.d <= end) {
      const set = dailyCustomers[o.d] ??= new Set();
      if (life[o.customer_id] >= 2) set.add(o.customer_id);
    }
  }
  for (const x of exps) if (x.d >= start && x.d <= end) expByDay[x.d] = (expByDay[x.d] || 0) + x.amount;

  const trend = [];
  for (let i = 0, len = diff(start, end); i <= len; i++) {
    const d = add(start, i), rev = revByDay[d] || 0, cost = costByDay[d] || 0, ex = expByDay[d] || 0;
    trend.push({ date: d, revenue: r2(rev), expenses: r2(ex), profit: r2(rev - cost - ex), returning: dailyCustomers[d]?.size || 0 });
  }

  const [pl] = await db.query('SELECT name,stock,cost_price,selling_price FROM products WHERE business_id=? AND status="active"', [bid]);
  const alerts = [];
  if (cur.revenue && cur.margin < 15) alerts.push({ type: 'Low margin', level: 'warn', text: `Net profit margin is ${cur.margin}%, below the 15% threshold.` });
  if (cur.revenue && cur.expenseRatio > 40) alerts.push({ type: 'High expenses', level: 'warn', text: `Expenses are ${cur.expenseRatio}% of revenue.` });
  pl.forEach(p => {
    if (p.stock < 5) alerts.push({ type: 'Low stock', level: 'warn', text: `${p.name} has only ${p.stock} unit(s) left.` });
    if (p.selling_price < p.cost_price) alerts.push({ type: 'Pricing', level: 'bad', text: `${p.name} sells below its cost price.` });
  });
  products.forEach(p => { if (p.revenue && p.margin < 15) alerts.push({ type: 'Low margin', level: 'warn', text: `${p.name} has a ${p.margin}% margin.` }) });
  if (prev.customers.total && Math.abs(growth.returningRate) >= 10)
    alerts.push({ type: 'Customers', level: 'info', text: `Returning customer rate moved ${growth.returningRate > 0 ? 'up' : 'down'} by ${Math.abs(growth.returningRate)} points versus the previous period.` });

  const cmr = cur.revenue ? cur.grossProfit / cur.revenue : 0;
  const unitsAll = products.reduce((a, p) => a + p.units, 0);
  const breakeven = cur.revenue > 0 && cmr > 0 && cur.expenses > 0 ? {
    revenue: r2(cur.expenses / cmr),
    units: unitsAll ? Math.ceil(cur.expenses / cmr / (cur.revenue / unitsAll)) : null,
    fixedCosts: cur.expenses
  } : null;

  const insights = [], f = v => '₹' + Math.round(v).toLocaleString('en-IN');
  if (growth.revenue !== null) insights.push(`Revenue ${growth.revenue >= 0 ? 'increased' : 'decreased'} ${Math.abs(growth.revenue)}% compared with the previous period.`);
  if (growth.aov !== null && growth.aov !== 0) insights.push(`Average order value ${growth.aov > 0 ? 'increased' : 'decreased'} ${Math.abs(growth.aov)}% compared with the previous period.`);
  if (expenseBreakdown[0]) insights.push(`${expenseBreakdown[0].name} is the largest expense category at ${expenseBreakdown[0].share}% of expenses.`);
  if (top.profit) insights.push(`${top.profit.name} generated the highest total profit (${f(top.profit.profit)}).`);
  if (top.margin) insights.push(`${top.margin.name} has the highest margin at ${top.margin.margin}%.`);
  if (cur.customers.total) {
    insights.push(`Returning customers accounted for ${cur.customers.rate}% of identified customers during the selected period.`);
    if (cur.revenue) insights.push(`Returning customers generated ${f(cur.customers.returningRevenue)} (${cur.customers.revenueShare}%) of total revenue.`);
    if (cur.customers.newAov && cur.customers.returningAov) insights.push(`Returning customer AOV is ${f(cur.customers.returningAov)} versus ${f(cur.customers.newAov)} for new customers (${g(cur.customers.returningAov, cur.customers.newAov)}%).`);
  }

  return { range: { start, end, pStart, pEnd }, current: cur, previous: prev, growth, products, categories, top, expenseBreakdown, trend, alerts, breakeven, insights };
}
module.exports = { compute };
