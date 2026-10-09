const $ = s => document.querySelector(s), money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }), pc = n => Number(n || 0).toFixed(1) + '%';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = {
    token: localStorage.getItem('bl_token'),
    user: null,
    period: localStorage.getItem('bl_period') || 'this_month',
    from: localStorage.getItem('bl_period_from') || '',
    to: localStorage.getItem('bl_period_to') || '',
    min:
        localStorage.getItem('bl_sidebar_min') !== null
            ? localStorage.getItem('bl_sidebar_min') === '1'
            : innerWidth < 760,
    charts: [],
    authTab: 'login'
}; document.documentElement.dataset.theme = localStorage.getItem('bl_theme') || 'light';
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) };
const formatDate = value => {
    if (!value) return '—';

    const parts = String(value)
        .slice(0, 10)
        .split('-');

    if (parts.length !== 3) return value;

    const [y, m, d] = parts;

    return `${d}/${m}/${y}`;
};
async function api(p, o = {}) {
    const r = await fetch('/api' + p, { method: o.method || 'GET', headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
    const d = await r.json().catch(() => ({})); if (r.status === 401 && S.token && !p.startsWith('/auth')) { logout(); throw new Error(d.error) } if (!r.ok) throw new Error(d.error || 'Request failed'); return d
}
function toast(m, e) { const t = document.createElement('div'); t.textContent = m; if (e) t.className = 'e'; $('#toast').append(t); setTimeout(() => t.remove(), 3800) }
const logout = () => { localStorage.removeItem('bl_token'); S.token = null; location.hash = '#/' };
const qs = () => `?period=${S.period}&from=${S.from}&to=${S.to}`;
const delta = (g, pts) => {
    const previous = appText('vs previous');

    if (g === null || g === undefined) {
        return `<span class="d na">— ${previous}</span>`;
    }

    return `<span class="d ${g >= 0 ? 'up' : 'dn'}">${g >= 0 ? '▲' : '▼'} ${Math.abs(g)}${pts ? ' pts' : '%'} ${previous}</span>`;
};
const netProfitDelta = (value, g) => {
    const previous = appText('vs previous');

    if (g === null || g === undefined) {
        return `<span class="d na">— ${previous}</span>`;
    }

    if (Number(value) < 0) {
        return `<span class="d dn">▼ ${Math.abs(g)}% ${previous}</span>`;
    }

    return `<span class="d up">▲ ${Math.abs(g)}% ${previous}</span>`;
};
const empty = (t, s) => `<div class="empty"><b>${t}</b>${s}</div>`;
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="mbox">${html}</div>`; m.hidden = false; m.onclick = e => { if (e.target === m) closeModal() } }
const closeModal = () => { $('#modal').hidden = true };
function kill() { S.charts.forEach(c => c.destroy()); S.charts = [] }
function chart(id, cfg) {
    const el = document.getElementById(id); if (!el) return; const dark = document.documentElement.dataset.theme === 'dark'; Chart.defaults.color = dark ? '#93a1c6' : '#6b7794';
    cfg.options = { responsive: true, maintainAspectRatio: false, ...cfg.options }; S.charts.push(new Chart(el, cfg))
}
const PAL = ['#1d6bff', '#22d3ee', '#8b5cf6', '#f59e0b', '#12a36b', '#ec4899', '#64748b'];
// ---------- routing ----------
const PAGES = {
    dashboard: ['page.dashboard', 'page.dashboardSub', pDash],
    products: ['page.products', 'page.productsSub', pProducts],
    orders: ['page.orders', 'page.ordersSub', pOrders],
    expenses: ['page.expenses', 'page.expensesSub', pExpenses],
    insights: ['page.insights', 'page.insightsSub', pInsights],
    settings: ['page.settings', 'page.settingsSub', pSettings]
};

const NAV = [
    ['dashboard', '▣', 'Dashboard'],
    ['products', '▥', 'Products'],
    ['orders', '🛒', 'Orders'],
    ['expenses', '↗', 'Expenses'],
    ['insights', '✦', 'Business Insights']
];
async function route() {
    kill(); closeModal(); const h = (location.hash || '#/').slice(2);
    if (!h) return S.token ? (location.hash = '#/dashboard') : landing();
    if (h === 'auth') {
    if (S.token && !S.addingAccount) {
        location.hash = '#/dashboard';
        return;
    }

    auth();
    return;
}
    if (!S.token) return (location.hash = '#/auth');
    if (!PAGES[h]) return (location.hash = '#/dashboard');
    if (!S.user) { try { S.user = await api('/me') } catch (e) { return } }
    shell(h)
}
addEventListener('hashchange', route);
async function shell(h) {

    const [titleKey, subKey, fn] = PAGES[h];

    const t = appText(titleKey);
    const sub = appText(subKey);

    $('#app').innerHTML = `
        <div class="shell">

            <aside class="side ${S.min ? 'min' : ''}">
                <button class="burger" data-act="burger" aria-label="Toggle menu">☰</button>

                <div class="grp">
    ${appText('Workspace')}
</div>

                ${NAV.map(n => `
                    <a href="#/${n[0]}" class="${n[0] === h ? 'on' : ''}">
                        <span>${n[1]}</span>
                        <span>
    ${appText(n[2])}
</span>
                    </a>
                `).join('')}

                <div class="grp">
    ${appText('Account')}
</div>

                <a href="#/settings" class="${h === 'settings' ? 'on' : ''}">
                    <span>⚙</span>
                    <span>
    ${appText('Settings')}
</span>
                </a>
            </aside>

            <div class="main">

                <header class="top">

    <div>
        <h1>${t}</h1>
        <small>${sub}</small>
    </div>

    <div class="top-profile">
    <div class="language-box app-language-box">
    <i class="fa-solid fa-globe"></i>
    <select id="appLanguageSelect">
        <option value="en">English</option>
        <option value="bn">বাংলা</option>
        <option value="hi">हिन्दी</option>
    </select>
</div>
    <button
    class="theme-toggle-top"
    data-act="toggle-theme"
    type="button"
    aria-label="Toggle theme">

    <i
        id="topThemeIcon"
        class="fa-solid fa-moon">
    </i>

</button>


        <button
            class="profile-trigger"
            data-act="profile-menu"
            type="button">

            <img
                src="${esc(
        S.user?.profile_image ||
        'assets/logo-landing.png'
    )}"
                alt="Profile">

            <span class="profile-trigger-name">
                ${esc(
        S.user?.name ||
        'User'
    )}
            </span>
            <i class="fa-solid fa-chevron-down profile-chevron"></i>
        </button>

        <div
            class="profile-dropdown"
            id="profileDropdown"
            hidden>

            <div class="profile-dropdown-head">

                <img
                    src="${esc(
        S.user?.profile_image ||
        'assets/logo-landing.png'
    )}"
                    alt="Profile">

                <div>

                    <strong>
                        ${esc(
        S.user?.name ||
        'User'
    )}
                    </strong>

                    <span>
                        ${esc(
        S.user?.email ||
        ''
    )}
                    </span>

                </div>

            </div>

            <div class="profile-divider"></div>

            <button
    type="button"
    data-act="add-account">

    <span>＋</span>
    <span>
    ${appText('Add Account')}
</span>

</button>

            <button
                type="button"
                data-act="settings">

                <span>⚙</span>
                <span>
    ${appText('Settings')}
</span>

            </button>

            <div class="profile-divider"></div>

            <button
                type="button"
                class="profile-logout"
                data-act="logout">

                <span>↪</span>
                <span>
    ${appText('Log Out')}
</span>

            </button>

        </div>

    </div>

</header>

                <main class="page" id="page">
                    <div class="spin">Loading…</div>
                </main>

            </div>
        </div>
    `;

    const appLanguageSelect = document.querySelector('#appLanguageSelect');

    let appSettings = {};
    try {
        appSettings = JSON.parse(
            localStorage.getItem('bizlensSettings') || '{}'
        );
    } catch (e) {
        appSettings = {};
    }

    const currentLanguage =
        ['en', 'bn', 'hi'].includes(appSettings.language)
            ? appSettings.language
            : 'en';

    if (appLanguageSelect) {
        appLanguageSelect.value = currentLanguage;

        appLanguageSelect.onchange = () => {
            const language = appLanguageSelect.value;

            try {
                appSettings.language = language;
                localStorage.setItem(
                    'bizlensSettings',
                    JSON.stringify(appSettings)
                );
            } catch (e) { }

            document.documentElement.lang = language;

            location.reload();
        };
    }

    try {
        await fn($('#page'));
    } catch (e) {
        $('#page').innerHTML = empty(
            'Could not load this page',
            esc(e.message)
        );
    }
}
document.addEventListener('click', e => {

    const b = e.target.closest('[data-act]');

    if (!b) return;

    const a = b.dataset.act;


if (a === 'burger') {

    const isMobile = window.innerWidth <= 760;

    if (isMobile) {

        /*
         * Mobile:
         * min = true  → sidebar closed
         * min = false → sidebar open
         */
        S.min = !S.min;

        document
            .querySelectorAll('.side')
            .forEach(s => {
                s.classList.toggle('min', S.min);
            });

    } else {

        /*
         * Desktop:
         * keep the existing collapse behaviour
         */
        S.min = !S.min;

        localStorage.setItem(
            'bl_sidebar_min',
            S.min ? '1' : '0'
        );

        document
            .querySelectorAll('.side')
            .forEach(s => {
                s.classList.toggle('min', S.min);
            });

    }

}


    if (a === 'close') {
        closeModal();
    }


    if (a === 'change-profile-photo') {

        const input =
            document.querySelector('#profileImageInput');

        if (input) {
            input.click();
        }

    }
    if (a === 'toggle-theme') {

        const current =
            document.documentElement.dataset.theme || 'light';

        const next =
            current === 'dark'
                ? 'light'
                : 'dark';

        document.documentElement.dataset.theme = next;

        localStorage.setItem('bl_theme', next);

        const icon =
            document.querySelector('#topThemeIcon');

        if (icon) {

            icon.className =
                next === 'dark'
                    ? 'fa-solid fa-sun'
                    : 'fa-solid fa-moon';

        }

    }
    if (a === 'profile-menu') {

        const menu =
            document.querySelector('#profileDropdown');

        if (menu) {
            menu.hidden = !menu.hidden;
        }

    }


if (a === 'add-account') {

    const menu =
        document.querySelector('#profileDropdown');

    if (menu) {
        menu.hidden = true;
    }

    // Keep the currently logged-in account
    S.addingAccount = true;
    S.previousToken = S.token;
    S.previousUser = S.user;

    // Open Sign Up without logging out current account
    S.authTab = 'signup';

    location.hash = '#/auth';

}

    if (a === 'settings') {

        const menu =
            document.querySelector('#profileDropdown');

        if (menu) {
            menu.hidden = true;
        }

        location.hash = '#/settings';

    }


    if (a === 'logout') {

        logout();

    }

});
document.addEventListener('click', e => {

    const menu =
        document.querySelector('#profileDropdown');

    if (!menu) return;

    if (
        !e.target.closest('.top-profile')
    ) {
        menu.hidden = true;
    }

});

// ---------- landing / auth ----------
function landing() {
    const landingTranslations = { "en": { "nav.home": "Home", "nav.features": "Features", "nav.howItWorks": "How It Works", "nav.about": "About", "nav.contact": "Contact", "nav.login": "Login", "nav.getStarted": "Get Started", "hero.badge": "Smart Analytics for Small to Medium Businesses", "hero.title1": "See Your Business", "hero.title2": "Through a Smarter Lens", "hero.description": "BizLens helps you understand your sales, expenses, products and profits in one simple dashboard. Turn your business data into meaningful insights.", "hero.startFree": "Start for Free", "hero.explore": "Explore Features", "hero.noCreditCard": "No credit card required", "hero.easySetup": "Easy setup", "dashboard.title": "BizLens Dashboard", "dashboard.overview": "Business Overview", "dashboard.month": "September 2026", "dashboard.thisMonth": "This Month", "dashboard.totalRevenue": "Total Revenue", "dashboard.grossProfit": "Gross Profit", "dashboard.revenueVsExpenses": "Revenue vs Expenses", "dashboard.orders": "Orders", "dashboard.avgOrder": "Avg. Order", "dashboard.margin": "Profit Margin", "dashboard.months.jan": "Jan", "dashboard.months.feb": "Feb", "dashboard.months.mar": "Mar", "dashboard.months.apr": "Apr", "dashboard.months.may": "May", "dashboard.months.jun": "Jun", "dashboard.months.jul": "Jul", "dashboard.months.aug": "Aug", "dashboard.months.sep": "Sep", "features.label": "POWERFUL FEATURES", "features.title": "Everything You Need to Understand Your Business", "features.description": "Manage your products, track orders, monitor expenses and discover useful business insights from one place.", "features.analytics.title": "Business Analytics", "features.analytics.text": "Get a clear overview of your revenue, expenses, profits and business performance.", "features.products.title": "Product Management", "features.products.text": "Keep your product information, prices, stock and costs organized.", "features.orders.title": "Order Tracking", "features.orders.text": "Record and monitor orders while keeping track of your total sales.", "features.expenses.title": "Expense Management", "features.expenses.text": "Track business expenses and understand exactly where your money is going.", "features.insights.title": "Smart Insights", "features.insights.text": "Discover product trends, profitability, expenses and other useful insights.", "features.responsive.title": "Anywhere, Anytime", "features.responsive.text": "Access your business information from desktop, tablet or mobile devices.", "common.learnMore": "Learn More", "common.getStarted": "Get Started", "how.label": "HOW IT WORKS", "how.title": "Start Managing Your Business in 3 Simple Steps", "how.description": "BizLens is designed to keep business management simple and easy.", "how.step1.title": "Create Your Account", "how.step1.text": "Sign up for your BizLens account in just a few moments.", "how.step2.title": "Add Your Business Data", "how.step2.text": "Add products, orders and business expenses to your account.", "how.step3.title": "Understand Your Business", "how.step3.text": "View your dashboard and discover useful business insights.", "about.label": "ABOUT BIZLENS", "about.analytics": "Business Analytics", "about.monthlyProfit": "Monthly Profit", "about.title": "Make Better Business Decisions with Better Data", "about.text1": "Running a small/medium business means managing hundreds of numbers every day. BizLens brings those numbers together and turns them into a simple visual overview.", "about.text2": "From product sales to expenses and profits, BizLens gives you the information you need to understand how your business is performing.", "about.point1": "Simple and easy to use", "about.point2": "Automatic business calculations", "about.point3": "Clear visual analytics", "about.point4": "Designed for Small to Medium Businesses (SMB)", "cta.title": "Ready to See Your Business Through a Smarter Lens?", "cta.text": "Start using BizLens today and bring your business data together in one place.", "cta.button": "Get Started for Free", "footer.description": "Simple business analytics for SMBs. Understand your numbers. Grow your business.", "footer.product": "Product", "footer.manage": "Management", "footer.company": "Company", "footer.privacy": "Privacy Policy", "footer.terms": "Terms & Conditions", "footer.rights": "All rights reserved.", "footer.made": "Built for smarter business decisions.", "nav.dashboard": "Dashboard", "nav.products": "Products", "nav.orders": "Orders", "nav.expenses": "Expenses", "nav.insights": "Insights", "nav.settings": "Settings" }, "bn": { "nav.home": "হোম", "nav.features": "ফিচার", "nav.howItWorks": "কীভাবে কাজ করে", "nav.about": "সম্পর্কে", "nav.contact": "যোগাযোগ", "nav.login": "লগইন", "nav.getStarted": "শুরু করুন", "hero.badge": "ছোট ব্যবসার জন্য স্মার্ট অ্যানালিটিক্স", "hero.title1": "আপনার ব্যবসাকে দেখুন", "hero.title2": "আরও স্মার্টভাবে", "hero.description": "BizLens আপনার বিক্রি, খরচ, পণ্য ও লাভকে একটি সহজ ড্যাশবোর্ডে বুঝতে সাহায্য করে। ব্যবসার ডেটাকে অর্থপূর্ণ ইনসাইটে রূপান্তর করুন।", "hero.startFree": "ফ্রি শুরু করুন", "hero.explore": "ফিচার দেখুন", "hero.noCreditCard": "ক্রেডিট কার্ড লাগবে না", "hero.easySetup": "সহজ সেটআপ", "dashboard.title": "BizLens ড্যাশবোর্ড", "dashboard.overview": "ব্যবসার সারাংশ", "dashboard.month": "সেপ্টেম্বর ২০২৬", "dashboard.thisMonth": "এই মাস", "dashboard.totalRevenue": "মোট আয়", "dashboard.grossProfit": "মোট লাভ", "dashboard.revenueVsExpenses": "আয় বনাম খরচ", "dashboard.orders": "অর্ডার", "dashboard.avgOrder": "গড় অর্ডার", "dashboard.margin": "লাভের মার্জিন", "features.label": "শক্তিশালী ফিচার", "features.title": "ব্যবসা বুঝতে আপনার যা দরকার সব এক জায়গায়", "features.description": "পণ্য ম্যানেজ করুন, অর্ডার ট্র্যাক করুন, খরচ দেখুন এবং এক জায়গা থেকে ব্যবসার গুরুত্বপূর্ণ ইনসাইট পান।", "features.analytics.title": "বিজনেস অ্যানালিটিক্স", "features.analytics.text": "আয়, খরচ, লাভ এবং ব্যবসার পারফরম্যান্সের পরিষ্কার ধারণা পান।", "features.products.title": "পণ্য ব্যবস্থাপনা", "features.products.text": "পণ্যের তথ্য, দাম, স্টক ও খরচ গুছিয়ে রাখুন।", "features.orders.title": "অর্ডার ট্র্যাকিং", "features.orders.text": "অর্ডার রেকর্ড করুন এবং মোট বিক্রির হিসাব রাখুন।", "features.expenses.title": "খরচ ব্যবস্থাপনা", "features.expenses.text": "ব্যবসার খরচ ট্র্যাক করুন এবং টাকা কোথায় যাচ্ছে বুঝুন।", "features.insights.title": "স্মার্ট ইনসাইট", "features.insights.text": "পণ্যের ট্রেন্ড, লাভজনকতা, খরচ এবং অন্যান্য দরকারি ইনসাইট আবিষ্কার করুন।", "features.responsive.title": "যেকোনো সময়, যেকোনো জায়গায়", "features.responsive.text": "ডেস্কটপ, ট্যাবলেট বা মোবাইল থেকে ব্যবসার তথ্য দেখুন।", "common.learnMore": "আরও জানুন", "common.getStarted": "শুরু করুন", "how.label": "কীভাবে কাজ করে", "how.title": "৩টি সহজ ধাপে ব্যবসা ম্যানেজ করুন", "how.description": "BizLens ব্যবসা পরিচালনাকে সহজ ও সুবিধাজনক রাখার জন্য তৈরি।", "how.step1.title": "অ্যাকাউন্ট তৈরি করুন", "how.step1.text": "কয়েক মুহূর্তেই BizLens অ্যাকাউন্ট খুলুন।", "how.step2.title": "ব্যবসার ডেটা যোগ করুন", "how.step2.text": "পণ্য, অর্ডার এবং ব্যবসার খরচ যোগ করুন।", "how.step3.title": "ব্যবসা বুঝুন", "how.step3.text": "ড্যাশবোর্ড দেখুন এবং দরকারি ইনসাইট আবিষ্কার করুন।", "about.label": "BIZLENS সম্পর্কে", "about.analytics": "বিজনেস অ্যানালিটিক্স", "about.monthlyProfit": "মাসিক লাভ", "about.title": "ভালো ডেটা দিয়ে আরও ভালো ব্যবসায়িক সিদ্ধান্ত নিন", "about.text1": "ছোট ব্যবসা চালাতে প্রতিদিন অনেক সংখ্যার হিসাব রাখতে হয়। BizLens সেই ডেটাগুলো একত্র করে সহজ ভিজ্যুয়াল ওভারভিউ তৈরি করে।", "about.text2": "পণ্যের বিক্রি থেকে খরচ ও লাভ পর্যন্ত, BizLens আপনার ব্যবসা কেমন চলছে তা বোঝার জন্য দরকারি তথ্য দেয়।", "about.point1": "সহজ ও ব্যবহারবান্ধব", "about.point2": "স্বয়ংক্রিয় ব্যবসায়িক হিসাব", "about.point3": "পরিষ্কার ভিজ্যুয়াল অ্যানালিটিক্স", "about.point4": "ছোট ব্যবসার জন্য তৈরি", "cta.title": "আরও স্মার্টভাবে আপনার ব্যবসাকে দেখতে প্রস্তুত?", "cta.text": "আজই BizLens ব্যবহার শুরু করুন এবং ব্যবসার সব ডেটা এক জায়গায় আনুন।", "cta.button": "ফ্রিতে শুরু করুন", "footer.description": "ছোট ব্যবসার জন্য সহজ বিজনেস অ্যানালিটিক্স। আপনার সংখ্যা বুঝুন। ব্যবসা বাড়ান।", "footer.product": "প্রোডাক্ট", "footer.manage": "ম্যানেজমেন্ট", "footer.company": "কোম্পানি", "footer.privacy": "প্রাইভেসি পলিসি", "footer.terms": "শর্তাবলি", "footer.rights": "সর্বস্বত্ব সংরক্ষিত।", "footer.made": "আরও স্মার্ট ব্যবসায়িক সিদ্ধান্তের জন্য তৈরি।", "nav.dashboard": "ড্যাশবোর্ড", "nav.products": "পণ্য", "nav.orders": "অর্ডার", "nav.expenses": "খরচ", "nav.insights": "ইনসাইট", "nav.settings": "সেটিংস" }, "hi": { "nav.home": "होम", "nav.features": "फीचर्स", "nav.howItWorks": "यह कैसे काम करता है", "nav.about": "हमारे बारे में", "nav.contact": "संपर्क", "nav.login": "लॉगिन", "nav.getStarted": "शुरू करें", "hero.badge": "छोटे व्यवसायों के लिए स्मार्ट एनालिटिक्स", "hero.title1": "अपने व्यवसाय को देखें", "hero.title2": "एक स्मार्ट नज़रिए से", "hero.description": "BizLens आपकी बिक्री, खर्च, उत्पाद और मुनाफे को एक आसान डैशबोर्ड में समझने में मदद करता है। अपने बिज़नेस डेटा को उपयोगी इनसाइट्स में बदलें।", "hero.startFree": "मुफ्त शुरू करें", "hero.explore": "फीचर्स देखें", "hero.noCreditCard": "क्रेडिट कार्ड की जरूरत नहीं", "hero.easySetup": "आसान सेटअप", "dashboard.title": "BizLens डैशबोर्ड", "dashboard.overview": "बिज़नेस ओवरव्यू", "dashboard.month": "सितंबर 2026", "dashboard.thisMonth": "इस महीने", "dashboard.totalRevenue": "कुल राजस्व", "dashboard.grossProfit": "सकल लाभ", "dashboard.revenueVsExpenses": "राजस्व बनाम खर्च", "dashboard.orders": "ऑर्डर", "dashboard.avgOrder": "औसत ऑर्डर", "dashboard.margin": "प्रॉफिट मार्जिन", "features.label": "शक्तिशाली फीचर्स", "features.title": "अपने व्यवसाय को समझने के लिए सब कुछ एक जगह", "features.description": "उत्पाद मैनेज करें, ऑर्डर ट्रैक करें, खर्च देखें और एक ही जगह से उपयोगी बिज़नेस इनसाइट्स पाएं।", "features.analytics.title": "बिज़नेस एनालिटिक्स", "features.analytics.text": "राजस्व, खर्च, मुनाफे और बिज़नेस परफॉर्मेंस का स्पष्ट ओवरव्यू पाएं।", "features.products.title": "प्रोडक्ट मैनेजमेंट", "features.products.text": "उत्पाद की जानकारी, कीमत, स्टॉक और लागत व्यवस्थित रखें।", "features.orders.title": "ऑर्डर ट्रैकिंग", "features.orders.text": "ऑर्डर रिकॉर्ड करें और कुल बिक्री पर नज़र रखें।", "features.expenses.title": "खर्च प्रबंधन", "features.expenses.text": "व्यवसाय के खर्च ट्रैक करें और समझें कि पैसा कहां जा रहा है।", "features.insights.title": "स्मार्ट इनसाइट्स", "features.insights.text": "प्रोडक्ट ट्रेंड, लाभ, खर्च और अन्य उपयोगी इनसाइट्स खोजें।", "features.responsive.title": "कहीं भी, कभी भी", "features.responsive.text": "डेस्कटॉप, टैबलेट या मोबाइल से अपने बिज़नेस की जानकारी देखें।", "common.learnMore": "और जानें", "common.getStarted": "शुरू करें", "how.label": "यह कैसे काम करता है", "how.title": "3 आसान चरणों में अपना व्यवसाय मैनेज करें", "how.description": "BizLens बिज़नेस मैनेजमेंट को सरल और आसान रखने के लिए बनाया गया है।", "how.step1.title": "अकाउंट बनाएं", "how.step1.text": "कुछ ही क्षणों में अपना BizLens अकाउंट बनाएं।", "how.step2.title": "बिज़नेस डेटा जोड़ें", "how.step2.text": "उत्पाद, ऑर्डर और बिज़नेस खर्च जोड़ें।", "how.step3.title": "अपना व्यवसाय समझें", "how.step3.text": "डैशबोर्ड देखें और उपयोगी बिज़नेस इनसाइट्स पाएं।", "about.label": "BIZLENS के बारे में", "about.analytics": "बिज़नेस एनालिटिक्स", "about.monthlyProfit": "मासिक लाभ", "about.title": "बेहतर डेटा के साथ बेहतर बिज़नेस निर्णय लें", "about.text1": "छोटा व्यवसाय चलाने के लिए हर दिन कई आंकड़ों को संभालना पड़ता है। BizLens इन आंकड़ों को एक साथ लाकर आसान विज़ुअल ओवरव्यू देता है।", "about.text2": "प्रोडक्ट बिक्री से लेकर खर्च और मुनाफे तक, BizLens आपको अपने व्यवसाय के प्रदर्शन को समझने के लिए जरूरी जानकारी देता है।", "about.point1": "सरल और आसान", "about.point2": "ऑटोमैटिक बिज़नेस कैलकुलेशन", "about.point3": "स्पष्ट विज़ुअल एनालिटिक्स", "about.point4": "छोटे व्यवसायों के लिए बनाया गया", "cta.title": "क्या आप अपने व्यवसाय को एक स्मार्ट नज़रिए से देखने के लिए तैयार हैं?", "cta.text": "आज ही BizLens शुरू करें और अपने बिज़नेस डेटा को एक जगह लाएं।", "cta.button": "मुफ्त में शुरू करें", "footer.description": "छोटे व्यवसायों के लिए आसान बिज़नेस एनालिटिक्स। अपने आंकड़े समझें। अपना व्यवसाय बढ़ाएं।", "footer.product": "प्रोडक्ट", "footer.manage": "मैनेजमेंट", "footer.company": "कंपनी", "footer.privacy": "प्राइवेसी पॉलिसी", "footer.terms": "नियम और शर्तें", "footer.rights": "सर्वाधिकार सुरक्षित।", "footer.made": "स्मार्ट बिज़नेस निर्णयों के लिए बनाया गया।", "nav.dashboard": "डैशबोर्ड", "nav.products": "प्रोडक्ट्स", "nav.orders": "ऑर्डर्स", "nav.expenses": "खर्च", "nav.insights": "इनसाइट्स", "nav.settings": "सेटिंग्स" } }; window.bizlensTranslations = landingTranslations;
    $('#app').innerHTML = `<div class="landing-page">

<!-- ================= NAVBAR ================= -->

<header class="navbar">
    

    <div class="nav-container">

       <div class="logo-area">

            <img src="assets/logo-landing.png"
                 alt="BizLens Logo">

        </div>

        <nav class="nav-menu">

            <a href="#home" data-i18n="nav.home">Home</a>

            <a href="#features" data-i18n="nav.features">
                Features
            </a>

            <a href="#how-it-works" data-i18n="nav.howItWorks">
                How It Works
            </a>

            <a href="#about" data-i18n="nav.about">
                About
            </a>

            <a href="#contact" data-i18n="nav.contact">
                Contact
            </a>

        </nav>


        <div class="nav-right">

            <!-- Language -->
            <div class="language-box">

                <i class="fa-solid fa-globe"></i>

                <select
                    id="languageSelect"
                    data-language-switcher>

                    <option value="en">English</option>
                    <option value="bn">বাংলা</option>
                    <option value="hi">हिन्दी</option>

                </select>

            </div>


            <a href="#/auth" class="login-btn">
                <i class="fa-solid fa-right-to-bracket"></i>
                <span data-i18n="nav.login">Login</span>
            </a>

            <a href="#/auth" class="signup-btn">
                <span data-i18n="nav.getStarted">Get Started</span>
            </a>

        </div>


        <!-- Mobile Menu Button -->

        <button class="mobile-menu-btn" id="mobileMenuBtn">

            <i class="fa-solid fa-bars"></i>

        </button>

    </div>

</header>


<!-- ================= MOBILE MENU ================= -->

<div class="mobile-menu" id="mobileMenu">

    <a href="#home" data-i18n="nav.home">Home</a>

    <a href="#features" data-i18n="nav.features">
        Features
    </a>

    <a href="#how-it-works" data-i18n="nav.howItWorks">
        How It Works
    </a>

    <a href="#about" data-i18n="nav.about">
        About
    </a>

    <a href="#contact" data-i18n="nav.contact">
        Contact
    </a>

    <hr>

    <a href="#/auth">
        <i class="fa-solid fa-right-to-bracket"></i>
        <span data-i18n="nav.login">Login</span>
    </a>

    <a href="#/auth" class="mobile-signup">
        <span data-i18n="nav.getStarted">Get Started</span>
    </a>

</div>


<!-- ================= HERO SECTION ================= -->

<section class="landing-hero" id="home">

    <div class="landing-hero-background"></div>

    <div class="landing-hero-container">

        <!-- LEFT -->

        <div class="landing-hero-content">

            <div class="landing-hero-badge">

                <span class="badge-dot"></span>

                <span data-i18n="hero.badge">
                    Smart Analytics for Small to Medium Businesses
                </span>

            </div>


            <h1>

                <span data-i18n="hero.title1">
                    See Your Business
                </span>

                <br>

                <span class="gradient-text"
                      data-i18n="hero.title2">
                    Through a Smarter Lens
                </span>

            </h1>


            <p data-i18n="hero.description">

                BizLens helps you understand your sales, expenses,
                products and profits in one simple dashboard.
                Turn your business data into meaningful insights.

            </p>


            <div class="landing-hero-buttons">

                <a href="#/auth" class="primary-btn">

                    <span data-i18n="hero.startFree">
                        Start for Free
                    </span>

                    <i class="fa-solid fa-arrow-right"></i>

                </a>


                <a href="#features" class="secondary-btn">

                    <i class="fa-solid fa-play"></i>

                    <span data-i18n="hero.explore">
                        Explore Features
                    </span>

                </a>

            </div>


            <div class="landing-hero-trust">

                <div class="trust-item">

                    <i class="fa-solid fa-circle-check"></i>

                    <span data-i18n="hero.noCreditCard">
                        No credit card required
                    </span>

                </div>


                <div class="trust-item">

                    <i class="fa-solid fa-circle-check"></i>

                    <span data-i18n="hero.easySetup">
                        Easy setup
                    </span>

                </div>

            </div>

        </div>


        <!-- RIGHT DASHBOARD PREVIEW -->

        <div class="landing-hero-dashboard">

            <div class="dashboard-glow"></div>

            <div class="dashboard-window">

                <!-- Window Header -->

                <div class="window-header">

                    <div class="window-dots">

                        <span></span>
                        <span></span>
                        <span></span>

                    </div>

                    <span class="window-title" data-i18n="dashboard.title">
                        BizLens Dashboard
                    </span>

                    <i class="fa-solid fa-ellipsis"></i>

                </div>


                <!-- Dashboard Content -->

                <div class="preview-content">

                    <div class="preview-top">

                        <div>

                            <small data-i18n="dashboard.overview">
                                Business Overview
                            </small>

                            <h3 data-i18n="dashboard.month">September 2026</h3>

                        </div>

                        <div class="preview-date">
                            <i class="fa-regular fa-calendar"></i>
                            <span data-i18n="dashboard.thisMonth">This Month</span>
                        </div>

                    </div>


                    <!-- Stats -->

                    <div class="preview-stats">

                        <div class="preview-card">

                            <div class="preview-icon revenue">
                                <i class="fa-solid fa-arrow-trend-up"></i>
                            </div>

                            <div>

                                <small data-i18n="dashboard.totalRevenue">
                                    Total Revenue
                                </small>

                                <strong>₹1,28,450</strong>

                                <span class="positive">
                                    +12.5%
                                </span>

                            </div>

                        </div>


                        <div class="preview-card">

                            <div class="preview-icon profit">
                                <i class="fa-solid fa-chart-pie"></i>
                            </div>

                            <div>

                                <small data-i18n="dashboard.grossProfit">
                                    Gross Profit
                                </small>

                                <strong>₹54,280</strong>

                                <span class="positive">
                                    +8.3%
                                </span>

                            </div>

                        </div>

                    </div>


                    <!-- Chart -->

                    <div class="preview-chart">

                        <div class="chart-heading">

                            <span data-i18n="dashboard.revenueVsExpenses">
                                Revenue vs Expenses
                            </span>

                            <span class="chart-month">
                                2026
                            </span>

                        </div>


                        <div class="fake-chart">

                            <div class="chart-y">
                                <span>150K</span>
                                <span>100K</span>
                                <span>50K</span>
                                <span>0</span>
                            </div>


                            <div class="chart-area">

                                <div class="grid-line"></div>
                                <div class="grid-line"></div>
                                <div class="grid-line"></div>
                                <div class="grid-line"></div>


                                <svg
                                    viewBox="0 0 500 170"
                                    preserveAspectRatio="none">

                                    <defs>

                                        <linearGradient
                                            id="areaGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1">

                                            <stop
                                                offset="0%"
                                                stop-color="#0879e8"
                                                stop-opacity=".35"/>

                                            <stop
                                                offset="100%"
                                                stop-color="#0879e8"
                                                stop-opacity="0"/>

                                        </linearGradient>

                                    </defs>


                                    <path
                                        d="M0 135
                                           C40 125 50 100 90 110
                                           S140 80 175 95
                                           S220 55 260 75
                                           S300 50 335 65
                                           S390 30 425 45
                                           S470 20 500 28
                                           L500 170
                                           L0 170 Z"
                                        fill="url(#areaGradient)"
                                    />


                                    <path
                                        d="M0 135
                                           C40 125 50 100 90 110
                                           S140 80 175 95
                                           S220 55 260 75
                                           S300 50 335 65
                                           S390 30 425 45
                                           S470 20 500 28"
                                        fill="none"
                                        stroke="#0879e8"
                                        stroke-width="4"
                                        stroke-linecap="round"
                                    />

                                </svg>

                            </div>

                        </div>


                        <div class="chart-months">

                            <span data-i18n="dashboard.months.jan">Jan</span>
                            <span data-i18n="dashboard.months.feb">Feb</span>
                            <span data-i18n="dashboard.months.mar">Mar</span>
                            <span data-i18n="dashboard.months.apr">Apr</span>
                            <span data-i18n="dashboard.months.may">May</span>
                            <span data-i18n="dashboard.months.jun">Jun</span>
                            <span data-i18n="dashboard.months.jul">Jul</span>
                            <span data-i18n="dashboard.months.aug">Aug</span>
                            <span data-i18n="dashboard.months.sep">Sep</span>

                        </div>

                    </div>


                    <!-- Bottom Cards -->

                    <div class="preview-bottom">

                        <div>

                            <span data-i18n="dashboard.orders">
                                Orders
                            </span>

                            <strong>248</strong>

                        </div>


                        <div>

                            <span data-i18n="dashboard.avgOrder">
                                Avg. Order
                            </span>

                            <strong>₹518</strong>

                        </div>


                        <div>

                            <span data-i18n="dashboard.margin">
                                Profit Margin
                            </span>

                            <strong>42.2%</strong>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    </div>

</section>


<!-- ================= FEATURES ================= -->

<section class="features-section" id="features">

    <div class="section-container">

        <div class="section-heading">

            <span class="section-label"
                  data-i18n="features.label">
                POWERFUL FEATURES
            </span>

            <h2 data-i18n="features.title">
                Everything You Need to Understand Your Business
            </h2>

            <p data-i18n="features.description">

                Manage your products, track orders, monitor expenses
                and discover useful business insights from one place.

            </p>

        </div>


        <div class="features-grid">

            <!-- Feature 1 -->

            <div class="feature-card">

                <div class="feature-icon blue">

                    <i class="fa-solid fa-chart-column"></i>

                </div>

                <h3 data-i18n="features.analytics.title">
                    Business Analytics
                </h3>

                <p data-i18n="features.analytics.text">

                    Get a clear overview of your revenue, expenses,
                    profits and business performance.

                </p>

                <a href="#/dashboard">

                    <span data-i18n="common.learnMore">
                        Learn More
                    </span>

                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>


            <!-- Feature 2 -->

            <div class="feature-card">

                <div class="feature-icon green">

                    <i class="fa-solid fa-box"></i>

                </div>

                <h3 data-i18n="features.products.title">
                    Product Management
                </h3>

                <p data-i18n="features.products.text">

                    Keep your product information, prices,
                    stock and costs organized.

                </p>

                <a href="#/products">

                    <span data-i18n="common.learnMore">
                        Learn More
                    </span>

                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>


            <!-- Feature 3 -->

            <div class="feature-card">

                <div class="feature-icon purple">

                    <i class="fa-solid fa-cart-shopping"></i>

                </div>

                <h3 data-i18n="features.orders.title">
                    Order Tracking
                </h3>

                <p data-i18n="features.orders.text">

                    Record and monitor orders while keeping
                    track of your total sales.

                </p>

                <a href="#/orders">

                    <span data-i18n="common.learnMore">
                        Learn More
                    </span>

                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>


            <!-- Feature 4 -->

            <div class="feature-card">

                <div class="feature-icon orange">

                    <i class="fa-solid fa-wallet"></i>

                </div>

                <h3 data-i18n="features.expenses.title">
                    Expense Management
                </h3>

                <p data-i18n="features.expenses.text">

                    Track business expenses and understand
                    exactly where your money is going.

                </p>

                <a href="#/expenses">

                    <span data-i18n="common.learnMore">
                        Learn More
                    </span>

                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>


            <!-- Feature 5 -->

            <div class="feature-card">

                <div class="feature-icon red">

                    <i class="fa-solid fa-lightbulb"></i>

                </div>

                <h3 data-i18n="features.insights.title">
                    Smart Insights
                </h3>

                <p data-i18n="features.insights.text">

                    Discover product trends, profitability,
                    expenses and other useful insights.

                </p>

                <a href="#/insights">

                    <span data-i18n="common.learnMore">
                        Learn More
                    </span>

                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>


            <!-- Feature 6 -->

            <div class="feature-card">

                <div class="feature-icon cyan">

                    <i class="fa-solid fa-mobile-screen"></i>

                </div>

                <h3 data-i18n="features.responsive.title">
                    Anywhere, Anytime
                </h3>

                <p data-i18n="features.responsive.text">

                    Access your business information from
                    desktop, tablet or mobile devices.

                </p>

                <a href="#/auth">

                    <span data-i18n="common.getStarted">
                        Get Started
                    </span>

                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>

        </div>

    </div>

</section>


<!-- ================= HOW IT WORKS ================= -->

<section class="how-section" id="how-it-works">

    <div class="section-container">

        <div class="section-heading">

            <span class="section-label"
                  data-i18n="how.label">
                HOW IT WORKS
            </span>

            <h2 data-i18n="how.title">
                Start Managing Your Business in 3 Simple Steps
            </h2>

            <p data-i18n="how.description">

                BizLens is designed to keep business management
                simple and easy.

            </p>

        </div>


        <div class="steps">

            <!-- Step 1 -->

            <div class="step">

                <div class="step-number">
                    01
                </div>

                <div class="step-icon">

                    <i class="fa-solid fa-user-plus"></i>

                </div>

                <h3 data-i18n="how.step1.title">
                    Create Your Account
                </h3>

                <p data-i18n="how.step1.text">

                    Sign up for your BizLens account
                    in just a few moments.

                </p>

            </div>


            <div class="step-line"></div>


            <!-- Step 2 -->

            <div class="step">

                <div class="step-number">
                    02
                </div>

                <div class="step-icon">

                    <i class="fa-solid fa-database"></i>

                </div>

                <h3 data-i18n="how.step2.title">
                    Add Your Business Data
                </h3>

                <p data-i18n="how.step2.text">

                    Add products, orders and business
                    expenses to your account.

                </p>

            </div>


            <div class="step-line"></div>


            <!-- Step 3 -->

            <div class="step">

                <div class="step-number">
                    03
                </div>

                <div class="step-icon">

                    <i class="fa-solid fa-chart-line"></i>

                </div>

                <h3 data-i18n="how.step3.title">
                    Understand Your Business
                </h3>

                <p data-i18n="how.step3.text">

                    View your dashboard and discover
                    useful business insights.

                </p>

            </div>

        </div>

    </div>

</section>


<!-- ================= ABOUT ================= -->

<section class="about-section" id="about">

    <div class="section-container about-container">

        <div class="about-visual">

            <div class="about-card">

                <div class="about-card-header">

                    <div class="mini-logo">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>

                    <div>

                        <strong>BizLens</strong>

                        <span data-i18n="about.analytics">
                            Business Analytics
                        </span>

                    </div>

                </div>


                <div class="about-big-number">

                    <span data-i18n="about.monthlyProfit">
                        Monthly Profit
                    </span>

                    <strong>₹54,280</strong>

                    <small>
                        <i class="fa-solid fa-arrow-up"></i>
                        8.3%
                    </small>

                </div>


                <div class="about-bars">

                    <span style="height:45%"></span>
                    <span style="height:60%"></span>
                    <span style="height:40%"></span>
                    <span style="height:75%"></span>
                    <span style="height:55%"></span>
                    <span style="height:90%"></span>
                    <span style="height:70%"></span>

                </div>

            </div>

        </div>


        <div class="about-content">

            <span class="section-label"
                  data-i18n="about.label">
                ABOUT BIZLENS
            </span>

            <h2 data-i18n="about.title">
                Make Better Business Decisions with Better Data
            </h2>

            <p data-i18n="about.text1">

                Running a small/medium business means managing hundreds
                of numbers every day. BizLens brings those numbers
                together and turns them into a simple visual overview.

            </p>

            <p data-i18n="about.text2">

                From product sales to expenses and profits,
                BizLens gives you the information you need
                to understand how your business is performing.

            </p>


            <div class="about-points">

                <div>

                    <i class="fa-solid fa-circle-check"></i>

                    <span data-i18n="about.point1">
                        Simple and easy to use
                    </span>

                </div>


                <div>

                    <i class="fa-solid fa-circle-check"></i>

                    <span data-i18n="about.point2">
                        Automatic business calculations
                    </span>

                </div>


                <div>

                    <i class="fa-solid fa-circle-check"></i>

                    <span data-i18n="about.point3">
                        Clear visual analytics
                    </span>

                </div>


                <div>

                    <i class="fa-solid fa-circle-check"></i>

                    <span data-i18n="about.point4">
                        Designed for small to medium businesses
                    </span>

                </div>

            </div>

        </div>

    </div>

</section>


<!-- ================= CTA ================= -->

<section class="cta-section">

    <div class="cta-container">

        <div class="cta-content">

            <div class="cta-icon">

                <i class="fa-solid fa-chart-simple"></i>

            </div>

            <h2 data-i18n="cta.title">
                Ready to See Your Business Through a Smarter Lens?
            </h2>

            <p data-i18n="cta.text">

                Start using BizLens today and bring your
                business data together in one place.

            </p>


            <a href="#/auth" class="cta-button">

                <span data-i18n="cta.button">
                    Get Started for Free
                </span>

                <i class="fa-solid fa-arrow-right"></i>

            </a>

        </div>

    </div>

</section>


<!-- ================= FOOTER ================= -->

<footer class="footer" id="contact">

    <div class="footer-container">

        <div class="footer-brand">

            <div class="logo-area">

            <img src="assets/logo.png"
                 alt="BizLens Logo">

        </div>


            <p data-i18n="footer.description">

                Simple business analytics for small to medium businesses.
                Understand your numbers. Grow your business.

            </p>


            <div class="social-links">

                <a href="#" aria-label="Facebook">
                    <i class="fa-brands fa-facebook-f"></i>
                </a>

                <a href="#" aria-label="Instagram">
                    <i class="fa-brands fa-instagram"></i>
                </a>

                <a href="#" aria-label="LinkedIn">
                    <i class="fa-brands fa-linkedin-in"></i>
                </a>

                <a href="#" aria-label="Twitter">
                    <i class="fa-brands fa-x-twitter"></i>
                </a>

            </div>

        </div>


        <div class="footer-column">

            <h4 data-i18n="footer.product">
                Product
            </h4>

            <a href="#features"
               data-i18n="nav.features">
                Features
            </a>

            <a href="#/dashboard"
               data-i18n="nav.dashboard">
                Dashboard
            </a>

            <a href="#/products"
               data-i18n="nav.products">
                Products
            </a>

            <a href="#/orders"
               data-i18n="nav.orders">
                Orders
            </a>

        </div>


        <div class="footer-column">

            <h4 data-i18n="footer.manage">
                Management
            </h4>

            <a href="#/expenses"
               data-i18n="nav.expenses">
                Expenses
            </a>

            <a href="#/insights"
               data-i18n="nav.insights">
                Insights
            </a>

            <a href="#/settings"
               data-i18n="nav.settings">
                Settings
            </a>

        </div>


        <div class="footer-column">

            <h4 data-i18n="footer.company">
                Company
            </h4>

            <a href="#about"
               data-i18n="nav.about">
                About
            </a>

            <a href="#contact"
               data-i18n="nav.contact">
                Contact
            </a>

            <a href="#/"
               data-i18n="footer.privacy">
                Privacy Policy
            </a>

            <a href="#"
               data-i18n="footer.terms">
                Terms & Conditions
            </a>

        </div>

    </div>


    <div class="footer-bottom">

        <p>
            © <span id="currentYear"></span> BizLens.
            <span data-i18n="footer.rights">
                All rights reserved.
            </span>
        </p>

        <p data-i18n="footer.made">
            Built for smarter business decisions.
        </p>

    </div>

</footer>


<!-- ================= JAVASCRIPT ================= -->

</div>`;
    const root = document.querySelector('.landing-page');
    const year = root && root.querySelector('#currentYear');
    if (year) year.textContent = new Date().getFullYear();
    const languageSelect = root && root.querySelector('#languageSelect');
    const supported = ['en', 'bn', 'hi'];
    const applyLanguage = (lang) => {
        const active = supported.includes(lang) ? lang : 'en';
        root.querySelectorAll('[data-i18n]').forEach(el => {
            const value = landingTranslations[active][el.dataset.i18n] ?? landingTranslations.en[el.dataset.i18n];
            if (value != null) el.textContent = value;
        });
        document.documentElement.lang = active;
        if (languageSelect) languageSelect.value = active;
    };
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('bizlensSettings') || '{}') } catch (e) { saved = {} }
    applyLanguage(saved.language || 'en');
    if (languageSelect) languageSelect.onchange = () => {
        const language = languageSelect.value; applyLanguage(language);
        try { saved.language = language; localStorage.setItem('bizlensSettings', JSON.stringify(saved)) } catch (e) { }
    };
    const mobileBtn = root && root.querySelector('#mobileMenuBtn');
    const mobileMenu = root && root.querySelector('#mobileMenu');
    if (mobileBtn && mobileMenu) {
        mobileBtn.onclick = () => {
            mobileMenu.classList.toggle('active');
            const icon = mobileBtn.querySelector('i');
            if (icon) { icon.classList.toggle('fa-bars'); icon.classList.toggle('fa-xmark') }
        };
        mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            const icon = mobileBtn.querySelector('i');
            if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-xmark') }
        }));
    }
    const navbar = root && root.querySelector('.navbar');
    const onScroll = () => { if (navbar) navbar.style.boxShadow = scrollY > 30 ? '0 8px 30px rgba(16,36,62,.07)' : 'none' };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    root.querySelectorAll('a[href^="#"]:not([href^="#/"])').forEach(link => link.addEventListener('click', e => {
        const id = link.getAttribute('href');
        if (!id || id === '#') return;
        const target = root.querySelector(id);
        if (target) { e.preventDefault(); scrollTo({ top: target.getBoundingClientRect().top + scrollY - 75, behavior: 'smooth' }) }
    }));
}
function auth() {
    const su = S.authTab === 'signup';

    let saved = {};

    try {
        saved = JSON.parse(
            localStorage.getItem('bizlensSettings') || '{}'
        );
    } catch (e) {
        saved = {};
    }

    const lang =
        ['en', 'bn', 'hi'].includes(saved.language)
            ? saved.language
            : 'en';

    const T = {
en: {
    back: 'Back to home',
    loginTitle: 'Welcome back',
    signupTitle: 'Create your BizLens account',
    loginIntro: 'Turn your business data into meaningful insights.',
    signupIntro: 'Start managing your business with smarter insights.',
    login: 'Log in',
    signup: 'Sign up',
    name: 'Your name',
    business: 'Business name',
    email: 'Email',
    password: 'Password',
    create: 'Create account',
    loginFooter: 'Manage your business. Understand your numbers.',
    signupFooter: 'Simple business analytics for smarter decisions.',
    show: 'Show password',
    hide: 'Hide password',

    forgot: 'Forgot password?',
    forgotTitle: 'Reset your password',
    forgotIntro: 'Enter your email and create a new password.',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    passwordMismatch: 'Passwords do not match.',
    backToLogin: 'Back to login',
    resetPassword: 'Reset password',
    passwordReset: 'Password reset successfully'
},
        bn: {
            back: 'হোমে ফিরে যান',
            loginTitle: 'আবার স্বাগতম',
            signupTitle: 'আপনার BizLens অ্যাকাউন্ট তৈরি করুন',
            loginIntro: 'আপনার ব্যবসার ডেটাকে অর্থবহ ইনসাইটে পরিণত করুন।',
            signupIntro: 'স্মার্ট ইনসাইটের মাধ্যমে আপনার ব্যবসা পরিচালনা শুরু করুন।',
            login: 'লগ ইন',
            signup: 'সাইন আপ',
            name: 'আপনার নাম',
            business: 'ব্যবসার নাম',
            email: 'ইমেইল',
            password: 'পাসওয়ার্ড',
            create: 'অ্যাকাউন্ট তৈরি করুন',
            loginFooter: 'আপনার ব্যবসা পরিচালনা করুন। আপনার সংখ্যাগুলো বুঝুন।',
            signupFooter: 'স্মার্ট সিদ্ধান্তের জন্য সহজ ব্যবসায়িক অ্যানালিটিক্স।',
            show: 'পাসওয়ার্ড দেখান',
            hide: 'পাসওয়ার্ড লুকান'
        },

hi: {
    back: 'होम पर वापस जाएँ',
    loginTitle: 'वापसी पर स्वागत है',
    signupTitle: 'अपना BizLens अकाउंट बनाएँ',
    loginIntro: 'अपने बिज़नेस डेटा को उपयोगी इनसाइट्स में बदलें।',
    signupIntro: 'स्मार्ट इनसाइट्स के साथ अपना बिज़नेस मैनेज करना शुरू करें।',
    login: 'लॉग इन',
    signup: 'साइन अप',
    name: 'आपका नाम',
    business: 'बिज़नेस का नाम',
    email: 'ईमेल',
    password: 'पासवर्ड',
    create: 'अकाउंट बनाएँ',
    loginFooter: 'अपना बिज़नेस मैनेज करें। अपने आँकड़ों को समझें।',
    signupFooter: 'स्मार्ट फैसलों के लिए आसान बिज़नेस एनालिटिक्स।',
    show: 'पासवर्ड दिखाएँ',
    hide: 'पासवर्ड छिपाएँ',

    forgot: 'पासवर्ड भूल गए?',
    forgotTitle: 'पासवर्ड रीसेट करें',
    forgotIntro: 'अपना ईमेल दर्ज करें और नया पासवर्ड बनाएँ।',
    newPassword: 'नया पासवर्ड',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
    passwordMismatch: 'दोनों पासवर्ड मेल नहीं खाते।',
    backToLogin: 'लॉगिन पर वापस जाएँ',
    resetPassword: 'पासवर्ड रीसेट करें',
    passwordReset: 'पासवर्ड सफलतापूर्वक रीसेट हो गया'
}
    };

    const t = T[lang];

    $('#app').innerHTML = `
        <div class="auth">
            <form class="authbox" id="af">

                <a href="#/" class="auth-back">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>${t.back}</span>
                </a>

                <div class="auth-brand">
                    <img
                        src="assets/logo-landing.png"
                        alt="BizLens">
                </div>

                <div class="auth-intro">
                    <h1>
                        ${su ? t.signupTitle : t.loginTitle}
                    </h1>

                    <p>
                        ${su
            ? t.signupIntro
            : t.loginIntro
        }
                    </p>
                </div>

                <div class="tabs">

                    <button
                        type="button"
                        class="${su ? '' : 'on'}"
                        data-t="login">
                        ${t.login}
                    </button>

                    <button
                        type="button"
                        class="${su ? 'on' : ''}"
                        data-t="signup">
                        ${t.signup}
                    </button>

                </div>

                <div id="ae"></div>

                ${su
            ? `
                            <div class="fg">
                                <label>${t.name}</label>

                                <input
                                    name="name"
                                    autocomplete="name"
                                    required>
                            </div>

                            <div class="fg">
                                <label>${t.business}</label>

                                <input
                                    name="business_name"
                                    autocomplete="organization"
                                    required>
                            </div>
                        `
            : ''
        }

                <div class="fg">
                    <label>${t.email}</label>

                    <input
                        name="email"
                        type="email"
                        autocomplete="email"
                        required>
                </div>

                <div class="fg">
                    <label>${t.password}</label>

                    <div class="auth-password">

                        <input
                            id="authPassword"
                            name="password"
                            type="password"
                            minlength="6"
                            autocomplete="${su ? 'new-password' : 'current-password'}"
                            required>

                        <button
                            type="button"
                            id="toggleAuthPassword"
                            aria-label="${t.show}">
                            <i class="fa-solid fa-eye"></i>
                        </button>

                    </div>
                </div>

                <button
                    type="submit"
                    class="btn pri lg auth-submit">

                    ${su ? t.create : t.login}

                </button>

                ${!su
            ? `
            <button
    type="button"
    id="forgotPasswordBtn"
    class="forgot-password-btn">
    ${t.forgot}
</button>
        `
            : ''
        }

                <p class="auth-footer-text">
                    ${su
            ? t.signupFooter
            : t.loginFooter
        }
                </p>

            </form>
        </div>
    `;

    document
        .querySelectorAll('.tabs button')
        .forEach(b => {

            b.onclick = () => {
                S.authTab = b.dataset.t;
                auth();
            };

        });

    const passwordInput =
        $('#authPassword');

    const togglePassword =
        $('#toggleAuthPassword');

    if (passwordInput && togglePassword) {

        togglePassword.onclick = () => {

            const isPassword =
                passwordInput.type === 'password';

            passwordInput.type =
                isPassword
                    ? 'text'
                    : 'password';

            togglePassword.innerHTML =
                isPassword
                    ? '<i class="fa-solid fa-eye-slash"></i>'
                    : '<i class="fa-solid fa-eye"></i>';

            togglePassword.setAttribute(
                'aria-label',
                isPassword
                    ? t.hide
                    : t.show
            );

        };

    }

    const forgotPasswordBtn =
    $('#forgotPasswordBtn');

if (forgotPasswordBtn) {

    forgotPasswordBtn.onclick = () => {

        modal(`
            <h2>${t.forgotTitle}</h2>

            <p style="
                margin-top:8px;
                margin-bottom:20px;
                color:var(--muted);
            ">
                ${t.forgotIntro}
            </p>

            <form id="forgotPasswordForm">

                <div class="fg">

                    <label>${t.email}</label>

                    <input
                        type="email"
                        id="forgotEmail"
                        name="email"
                        autocomplete="email"
                        required>

                </div>

                <div class="fg">

                    <label>${t.newPassword}</label>

                    <input
                        type="password"
                        id="forgotNewPassword"
                        name="password"
                        minlength="6"
                        required>

                </div>

                <div class="fg">

                    <label>${t.confirmPassword}</label>

                    <input
                        type="password"
                        id="forgotConfirmPassword"
                        name="confirm_password"
                        minlength="6"
                        required>

                </div>

                <div id="forgotError"></div>

                <div style="
                    display:flex;
                    gap:10px;
                    justify-content:flex-end;
                    margin-top:20px;
                ">

                    <button
                        type="button"
                        class="btn"
                        id="forgotBackBtn">
                        ${t.backToLogin}
                    </button>

                    <button
                        type="submit"
                        class="btn pri">
                        ${t.resetPassword}
                    </button>

                </div>

            </form>
        `);

        $('#forgotBackBtn').onclick = () => {
            closeModal();
        };

        $('#forgotPasswordForm').onsubmit = async e => {

            e.preventDefault();

            const email =
                $('#forgotEmail').value.trim();

            const password =
                $('#forgotNewPassword').value;

            const confirmPassword =
                $('#forgotConfirmPassword').value;

            const error =
                $('#forgotError');

            if (password !== confirmPassword) {

                error.innerHTML = `
                    <div class="err">
                        ${t.passwordMismatch}
                    </div>
                `;

                return;
            }

            /*
             * Academic-project demo reset.
             *
             * The current project has no public
             * /auth/forgot-password backend endpoint.
             * So this stores the demo reset locally.
             */

            try {

                const demoResets =
                    JSON.parse(
                        localStorage.getItem(
                            'bizlensDemoPasswordResets'
                        ) || '{}'
                    );

                demoResets[email] = password;

                localStorage.setItem(
                    'bizlensDemoPasswordResets',
                    JSON.stringify(demoResets)
                );

                modal(`
                    <h2>${t.passwordReset}</h2>

                    <p style="
                        margin:10px 0 20px;
                        color:var(--muted);
                    ">
                        ${t.email}: ${esc(email)}
                    </p>

                    <button
                        type="button"
                        class="btn pri"
                        id="resetDoneBtn">
                        ${t.backToLogin}
                    </button>
                `);

                $('#resetDoneBtn').onclick = () => {
                    closeModal();
                };

            } catch (x) {

                error.innerHTML = `
                    <div class="err">
                        ${esc(x.message)}
                    </div>
                `;

            }

        };

    };

}

    $('#af').onsubmit = async e => {

        e.preventDefault();

        const body =
            Object.fromEntries(
                new FormData(e.target)
            );

        try {

            const d = await api(
                '/auth/' +
                (su ? 'signup' : 'login'),
                {
                    method: 'POST',
                    body
                }
            );

if (S.addingAccount) {

    // New account has been created,
    // but keep the currently logged-in account active.

    S.token = S.previousToken;
    S.user = S.previousUser;

    S.addingAccount = false;
    S.previousToken = null;
    S.previousUser = null;

    localStorage.setItem(
        'bl_token',
        S.token
    );

    location.hash = '#/dashboard';

    return;
}

S.token = d.token;
S.user = d.user;

localStorage.setItem(
    'bl_token',
    d.token
);

location.hash =
    '#/dashboard';

        } catch (x) {

            $('#ae').innerHTML = `
                <div class="err">
                    ${esc(x.message)}
                </div>
            `;

        }

    };
}
// ---------- period bar ----------
function periodBar(reload) {

    const periods = [
        ['today', 'Today'],
        ['this_week', 'This week'],
        ['this_month', 'This month'],
        ['last_month', 'Last month'],
        ['this_year', 'This year'],
        ['custom', 'Custom range']
    ];

    return `
        <div class="period-controls">

            ${S.period === 'custom'
            ? `
                        <input
                            type="date"
                            id="pf"
                            value="${S.from}"
                        >

                        <input
                            type="date"
                            id="pt"
                            value="${S.to}"
                        >
                    `
            : ''
        }

            <select id="pp">

                ${periods
            .map(
                p => `
                                <option
                                    value="${p[0]}"
                                    ${S.period === p[0] ? 'selected' : ''}
                                >
                                    ${appText(p[1])}
                                </option>
                            `
            )
            .join('')
        }

            </select>

        </div>
    `;
} function bindPeriod(reload) {

    $('#pp').onchange = e => {

        S.period = e.target.value;

        if (
            S.period === 'custom' &&
            !(S.from && S.to)
        ) {
            S.from = S.to = today();
        }

        localStorage.setItem(
            'bl_period',
            S.period
        );

        localStorage.setItem(
            'bl_period_from',
            S.from || ''
        );

        localStorage.setItem(
            'bl_period_to',
            S.to || ''
        );

        reload();
    };


    if ($('#pf')) {

        $('#pf').onchange = e => {

            S.from = e.target.value;

            localStorage.setItem(
                'bl_period_from',
                S.from
            );

            reload();
        };


        $('#pt').onchange = e => {

            S.to = e.target.value;

            localStorage.setItem(
                'bl_period_to',
                S.to
            );

            reload();
        };
    }
}
const APP_TRANSLATIONS = {

    en: {

        // ---------- Shell ----------
        Workspace: 'WORKSPACE',
        Account: 'ACCOUNT',

        Dashboard: 'Dashboard',
        Products: 'Products',
        Orders: 'Orders',
        Expenses: 'Expenses',
        'Business Insights': 'Business Insights',
        Settings: 'Settings',

        'Add Account': 'Add Account',
        'Log Out': 'Log Out',


        // ---------- Page titles ----------
        'page.dashboard': 'Dashboard',
        'page.dashboardSub':
            'Business performance at a glance',

        'page.products': 'Products',
        'page.productsSub':
            'Manage what you sell',

        'page.orders': 'Orders',
        'page.ordersSub':
            'Orders and customers',

        'page.expenses': 'Expenses',
        'page.expensesSub':
            'Track where money goes',

        'page.insights': 'Business Insights',
        'page.insightsSub':
            'Data-backed observations',

        'page.settings': 'Settings',
        'page.settingsSub':
            'Account and preferences',


        // ---------- Period ----------
        Today: 'Today',
        'This week': 'This week',
        'This month': 'This month',
        'Last month': 'Last month',
        'This year': 'This year',
        'Custom range': 'Custom range',
        'All history': 'All history',


        // ---------- Dashboard ----------
        Revenue: 'Revenue',
        'Product cost': 'Product cost',
        'Gross profit': 'Gross profit',
        Expenses: 'Expenses',
        'Net profit': 'Net profit',
        'Net profit margin': 'Net profit margin',
        'Total orders': 'Total orders',
        'Average order value': 'Average order value',
        'Returning customers': 'Returning customers',
        Customers: 'customers',
        'of customers': 'of customers',
        'of revenue': 'of revenue',
        'vs previous': 'vs previous',
        'Profit': 'Profit',
        'pts': 'pts',

        'Revenue vs expenses': 'Revenue vs expenses',
        'Customer retention': 'Customer retention',
        'Total customers': 'Total customers',
        'New customers': 'New customers',
        'Returning rate': 'Returning rate',
        'Profit trend': 'Profit trend',
        'Expense breakdown': 'Expense breakdown',
        'Product performance': 'Product performance',

        Alerts: 'Alerts',
        Pricing: 'Pricing',
        'Break-even': 'Break-even',

        'Fixed costs (expenses)':
            'Fixed costs (expenses)',

        'Break-even revenue':
            'Break-even revenue',

        'Break-even units':
            'Break-even units',

        'No alerts. Everything looks healthy.':
            'No alerts. Everything looks healthy.',
        'Low margin': 'Low margin',
        'High expenses': 'High expenses',
        'Low stock': 'Low stock',
        'sells below its cost price.': 'sells below its cost price.',


        'Net profit margin is':
            'Net profit margin is',

        'below the 15% threshold.':
            'below the 15% threshold.',

        'Expenses are':
            'Expenses are',

        'of revenue.':
            'of revenue.',

        'has only':
            'has only',

        'unit(s) left.':
            'unit(s) left.',

        'Not enough data to calculate break-even.':
            'Not enough data to calculate break-even.',

        'No activity in this period':
            'No activity in this period',

        'Add products, record orders and log expenses to see your KPIs, or change the period.':
            'Add products, record orders and log expenses to see your KPIs, or change the period.'


    },


    bn: {

        // ---------- Shell ----------
        Workspace: 'ওয়ার্কস্পেস',
        Account: 'অ্যাকাউন্ট',

        Dashboard: 'ড্যাশবোর্ড',
        Products: 'পণ্য',
        Orders: 'অর্ডার',
        Expenses: 'খরচ',
        'Business Insights': 'ব্যবসায়িক ইনসাইট',
        Settings: 'সেটিংস',

        'Add Account': 'অ্যাকাউন্ট যোগ করুন',
        'Log Out': 'লগ আউট',


        // ---------- Page titles ----------
        'page.dashboard': 'ড্যাশবোর্ড',
        'page.dashboardSub':
            'এক নজরে ব্যবসার পারফরম্যান্স',

        'page.products': 'পণ্য',
        'page.productsSub':
            'আপনি যা বিক্রি করেন তা পরিচালনা করুন',

        'page.orders': 'অর্ডার',
        'page.ordersSub':
            'অর্ডার ও গ্রাহক',

        'page.expenses': 'খরচ',
        'page.expensesSub':
            'কোথায় টাকা খরচ হচ্ছে দেখুন',

        'page.insights': 'ব্যবসায়িক ইনসাইট',
        'page.insightsSub':
            'ডেটাভিত্তিক পর্যবেক্ষণ',

        'page.settings': 'সেটিংস',
        'page.settingsSub':
            'অ্যাকাউন্ট ও পছন্দসমূহ',


        // ---------- Period ----------
        Today: 'আজ',
        'This week': 'এই সপ্তাহ',
        'This month': 'এই মাস',
        'Last month': 'গত মাস',
        'This year': 'এই বছর',
        'Custom range': 'নিজস্ব সময়কাল',
        'All history': 'সমস্ত ইতিহাস',


        // ---------- Dashboard ----------
        Revenue: 'রাজস্ব',
        'Product cost': 'পণ্যের খরচ',
        'Gross profit': 'মোট লাভ',
        Expenses: 'খরচ',
        'Net profit': 'নিট লাভ',
        'Net profit margin': 'নিট লাভের মার্জিন',
        'Total orders': 'মোট অর্ডার',
        'Average order value': 'গড় অর্ডার মূল্য',
        'Returning customers': 'ফিরে আসা গ্রাহক',
        Customers: 'গ্রাহক',
        'of customers': 'গ্রাহকের',
        'of revenue': 'রাজস্বের',
        'vs previous': 'আগের সময়ের তুলনায়',
        'Profit': 'লাভ',
        'pts': 'পয়েন্ট',

        'Revenue vs expenses':
            'রাজস্ব বনাম খরচ',

        'Customer retention':
            'গ্রাহক ধরে রাখা',

        'Total customers':
            'মোট গ্রাহক',

        'New customers':
            'নতুন গ্রাহক',

        'Returning rate':
            'ফিরে আসার হার',

        'Profit trend':
            'লাভের প্রবণতা',

        'Expense breakdown':
            'খরচের বিভাজন',

        'Product performance':
            'পণ্যের পারফরম্যান্স',

        Alerts: 'সতর্কতা',
        Pricing: 'মূল্য নির্ধারণ',
        'Break-even': 'ব্রেক-ইভেন',

        'Fixed costs (expenses)':
            'স্থায়ী খরচ (ব্যয়)',

        'Break-even revenue':
            'ব্রেক-ইভেন রাজস্ব',

        'Break-even units':
            'ব্রেক-ইভেন ইউনিট',

        'No alerts. Everything looks healthy.':
            'কোনো সতর্কতা নেই। সবকিছু ঠিকঠাক আছে।',
        'Low margin': 'কম লাভের মার্জিন',
        'High expenses': 'বেশি খরচ',
        'Low stock': 'স্টক কম',
        'sells below its cost price.': 'এর ক্রয়মূল্যের চেয়ে কম দামে বিক্রি হচ্ছে।',

        'Net profit margin is':
            'নিট লাভের মার্জিন হলো',

        'below the 15% threshold.':
            '১৫% সীমার নিচে।',

        'Expenses are':
            'খরচ হলো',

        'of revenue.':
            'রাজস্বের।',

        'has only':
            'মাত্র',

        'unit(s) left.':
            'টি ইউনিট বাকি আছে।',

        'Not enough data to calculate break-even.':
            'ব্রেক-ইভেন হিসাব করার জন্য পর্যাপ্ত ডেটা নেই।',

        'No activity in this period':
            'এই সময়ে কোনো কার্যক্রম নেই',

        'Add products, record orders and log expenses to see your KPIs, or change the period.':
            'KPI দেখতে পণ্য যোগ করুন, অর্ডার রেকর্ড করুন এবং খরচ লিখুন, অথবা সময়কাল পরিবর্তন করুন।'
    },


    hi: {

        // ---------- Shell ----------
        Workspace: 'वर्कस्पेस',
        Account: 'अकाउंट',

        Dashboard: 'डैशबोर्ड',
        Products: 'प्रोडक्ट्स',
        Orders: 'ऑर्डर्स',
        Expenses: 'खर्च',
        'Business Insights': 'बिज़नेस इनसाइट्स',
        Settings: 'सेटिंग्स',

        'Add Account': 'अकाउंट जोड़ें',
        'Log Out': 'लॉग आउट',


        // ---------- Page titles ----------
        'page.dashboard': 'डैशबोर्ड',
        'page.dashboardSub':
            'एक नज़र में बिज़नेस परफॉर्मेंस',

        'page.products': 'प्रोडक्ट्स',
        'page.productsSub':
            'आप जो बेचते हैं उसे मैनेज करें',

        'page.orders': 'ऑर्डर्स',
        'page.ordersSub':
            'ऑर्डर्स और ग्राहक',

        'page.expenses': 'खर्च',
        'page.expensesSub':
            'पैसा कहां खर्च हो रहा है देखें',

        'page.insights': 'बिज़नेस इनसाइट्स',
        'page.insightsSub':
            'डेटा पर आधारित जानकारी',

        'page.settings': 'सेटिंग्स',
        'page.settingsSub':
            'अकाउंट और प्राथमिकताएं',


        // ---------- Period ----------
        Today: 'आज',
        'This week': 'इस सप्ताह',
        'This month': 'इस महीने',
        'Last month': 'पिछले महीने',
        'This year': 'इस वर्ष',
        'Custom range': 'कस्टम रेंज',
        'All history': 'संपूर्ण इतिहास',


        // ---------- Dashboard ----------
        Revenue: 'राजस्व',
        'Product cost': 'उत्पाद लागत',
        'Gross profit': 'सकल लाभ',
        Expenses: 'खर्च',
        'Net profit': 'शुद्ध लाभ',
        'Net profit margin': 'शुद्ध लाभ मार्जिन',
        'Total orders': 'कुल ऑर्डर',
        'Average order value': 'औसत ऑर्डर मूल्य',
        'Returning customers': 'वापस आने वाले ग्राहक',
        Customers: 'ग्राहक',
        'of customers': 'ग्राहकों में से',
        'of revenue': 'राजस्व का',
        'vs previous': 'पिछली अवधि की तुलना में',
        'Profit': 'लाभ',
        'pts': 'पॉइंट',

        'Revenue vs expenses':
            'राजस्व बनाम खर्च',

        'Customer retention':
            'ग्राहक प्रतिधारण',

        'Total customers':
            'कुल ग्राहक',

        'New customers':
            'नए ग्राहक',

        'Returning rate':
            'वापसी दर',

        'Profit trend':
            'लाभ की प्रवृत्ति',

        'Expense breakdown':
            'खर्च का विवरण',

        'Product performance':
            'उत्पाद प्रदर्शन',

        Alerts: 'अलर्ट',
        Pricing: 'मूल्य निर्धारण',
        'Break-even': 'ब्रेक-ईवन',

        'Fixed costs (expenses)':
            'स्थायी लागत (खर्च)',

        'Break-even revenue':
            'ब्रेक-ईवन राजस्व',

        'Break-even units':
            'ब्रेक-ईवन यूनिट',

        'No alerts. Everything looks healthy.':
            'कोई अलर्ट नहीं है। सब कुछ ठीक है।',
        'Low margin': 'कम लाभ मार्जिन',
        'High expenses': 'ज़्यादा खर्च',
        'Low stock': 'स्टॉक कम',
        'sells below its cost price.': 'इसकी लागत कीमत से कम में बिक रहा है।',

        'Net profit margin is':
            'शुद्ध लाभ मार्जिन है',

        'below the 15% threshold.':
            '15% की सीमा से कम है।',

        'Expenses are':
            'खर्च',

        'of revenue.':
            'राजस्व का है।',

        'has only':
            'केवल',

        'unit(s) left.':
            'यूनिट बाकी हैं।',

        'Not enough data to calculate break-even.':
            'ब्रेक-ईवन की गणना के लिए पर्याप्त डेटा नहीं है।',

        'No activity in this period':
            'इस अवधि में कोई गतिविधि नहीं है',

        'Add products, record orders and log expenses to see your KPIs, or change the period.':
            'अपने KPI देखने के लिए उत्पाद जोड़ें, ऑर्डर रिकॉर्ड करें और खर्च दर्ज करें, या अवधि बदलें।'
    }
};


function getAppLanguage() {

    let settings = {};

    try {
        settings = JSON.parse(
            localStorage.getItem('bizlensSettings') || '{}'
        );
    } catch (e) {
        settings = {};
    }

    return ['en', 'bn', 'hi'].includes(settings.language)
        ? settings.language
        : 'en';
}


function appText(key) {

    const language =
        document.querySelector('#appLanguageSelect')?.value ||
        getAppLanguage();

    return (
        APP_TRANSLATIONS[language]?.[key] ??
        APP_TRANSLATIONS.en?.[key] ??
        key
    );
}
function appText(key, fallbackBn = '', fallbackHi = '') {
    const lang =
        document.querySelector('#appLanguageSelect')?.value ||
        getAppLanguage();

    if (APP_TRANSLATIONS[lang]?.[key]) {
        return APP_TRANSLATIONS[lang][key];
    }

    if (lang === 'bn' && fallbackBn) {
        return fallbackBn;
    }

    if (lang === 'hi' && fallbackHi) {
        return fallbackHi;
    }

    return APP_TRANSLATIONS.en?.[key] || key;
}
// ---------- dashboard ----------
async function pDash(el) {

    const load = async () => {

        const d = await api('/analytics/dashboard' + qs());
        const c = d.current;
        const cu = c.customers;
        const gr = d.growth;

        const has = c.orders || c.expenses;

        el.innerHTML = `
            <div class="bar insights-bar">

                <div class="dashboard-date-range">
                    <span>
                        ${formatDate(d.range.start)}
                    </span>

                    <b>→</b>

                    <span>
                        ${formatDate(d.range.end)}
                    </span>
                </div>

                ${periodBar()}

            </div>


            <div class="kpis">

                <!-- Revenue -->
                <div class="card kpi t1">
                    <small>
                        ${appText(
            'Revenue',
            'রাজস্ব',
            'राजस्व'
        )}
                    </small>

                    <b>
                        ${money(c.revenue)}
                    </b>

                    ${delta(gr.revenue)}
                </div>


                <!-- Product Cost -->
                <div class="card kpi t4">
                    <small>
                        ${appText(
            'Product cost',
            'পণ্যের খরচ',
            'उत्पाद लागत'
        )}
                    </small>

                    <b>
                        ${money(c.productCost)}
                    </b>

                    <span class="d na">
                        ${appText(
            'Gross profit',
            'মোট লাভ',
            'सकल लाभ'
        )}
                        ${money(c.grossProfit)}
                    </span>
                </div>


                <!-- Expenses -->
                <div class="card kpi t3">
                    <small>
                        ${appText(
            'Expenses',
            'খরচ',
            'खर्च'
        )}
                    </small>

                    <b>
                        ${money(c.expenses)}
                    </b>

                    ${delta(gr.expenses)}
                </div>


                <!-- Net Profit -->
                <div class="card kpi t2">
                    <small>
                        ${appText(
            'Net profit',
            'নিট লাভ',
            'शुद्ध लाभ'
        )}
                    </small>

                    <b>
                        ${money(c.netProfit)}
                    </b>

                    ${netProfitDelta(c.netProfit, gr.netProfit)}
                </div>


                <!-- Net Profit Margin -->
                <div class="card kpi">
                    <small>
                        ${appText(
            'Net profit margin',
            'নিট লাভের মার্জিন',
            'शुद्ध लाभ मार्जिन'
        )}
                    </small>

                    <b>
                        ${pc(c.margin)}
                    </b>

                    <span class="d na">
                        ${appText(
            'Expenses',
            'খরচ',
            'खर्च'
        )}

                        ${pc(c.expenseRatio)}

                        ${appText(
            'of revenue',
            'রাজস্বের',
            'राजस्व का'
        )}
                    </span>
                </div>


                <!-- Total Orders -->
                <div class="card kpi">
                    <small>
                        ${appText(
            'Total orders',
            'মোট অর্ডার',
            'कुल ऑर्डर'
        )}
                    </small>

                    <b>
                        ${c.orders}
                    </b>

                    ${delta(gr.orders)}
                </div>


                <!-- Average Order Value -->
                <div class="card kpi">
                    <small>
                        ${appText(
            'Average order value',
            'গড় অর্ডার মূল্য',
            'औसत ऑर्डर मूल्य'
        )}
                    </small>

                    <b>
                        ${money(c.aov)}
                    </b>

                    ${delta(gr.aov)}
                </div>


                <!-- Returning Customers -->
                <div class="card kpi t3">
                    <small>
                        ↻
                        ${appText(
            'Returning customers',
            'ফিরে আসা গ্রাহক',
            'वापस आने वाले ग्राहक'
        )}
                    </small>

                    <b>
                        ${cu.returning}
                    </b>

                    <span class="d na">
                        ${pc(cu.rate)}

                        ${appText(
            'of customers',
            'গ্রাহকের',
            'ग्राहकों में से'
        )}
                    </span>
                    <br>
                    ${delta(gr.returningCustomers)}
                </div>

            </div>


            ${has

                ? `

                    <!-- Revenue vs Expenses + Customer Retention -->
                    <div class="g2">

                        <div class="card">

                            <h3>
                                ${appText(
                    'Revenue vs expenses',
                    'রাজস্ব বনাম খরচ',
                    'राजस्व बनाम खर्च'
                )}
                            </h3>

                            <div class="ch">
                                <canvas id="c1"></canvas>
                            </div>

                        </div>


                        <div class="card">

                            <h3>
                                ${appText(
                    'Customer retention',
                    'গ্রাহক ধরে রাখা',
                    'ग्राहक प्रतिधारण'
                )}
                            </h3>

                            <div class="line">
                                <span>
                                    ${appText(
                    'Total customers',
                    'মোট গ্রাহক',
                    'कुल ग्राहक'
                )}
                                </span>

                                <b>
                                    ${cu.total}
                                </b>
                            </div>


                            <div class="line">
                                <span>
                                    ${appText(
                    'New customers',
                    'নতুন গ্রাহক',
                    'नए ग्राहक'
                )}
                                </span>

                                <b>
                                    ${cu.new}
                                </b>
                            </div>


                            <div class="line">
                                <span>
                                    ${appText(
                    'Returning customers',
                    'ফিরে আসা গ্রাহক',
                    'वापस आने वाले ग्राहक'
                )}
                                </span>

                                <b>
                                    ${cu.returning}
                                </b>
                            </div>


                            <div class="line">
                                <span>
                                    ${appText(
                    'Returning rate',
                    'ফিরে আসার হার',
                    'वापसी दर'
                )}
                                </span>

                                <b>
                                    ${pc(cu.rate)}
                                </b>
                            </div>


                            <div class="prog">
                                <i style="width:${cu.rate}%"></i>
                            </div>


                            <p
                                style="
                                    color:var(--mut);
                                    font-size:12px;
                                    margin-top:8px
                                "
                            >
                                ${delta(gr.returningRate, 1)}
                            </p>

                        </div>

                    </div>


                    <!-- Charts -->
                    <div class="g3">

                        <div class="card">

                            <h3>
                                ${appText(
                    'Profit trend',
                    'লাভের প্রবণতা',
                    'लाभ की प्रवृत्ति'
                )}
                            </h3>

                            <div class="ch">
                                <canvas id="c2"></canvas>
                            </div>

                        </div>


                        <div class="card">

                            <h3>
                                ${appText(
                    'Expense breakdown',
                    'খরচের বিভাজন',
                    'खर्च का विवरण'
                )}
                            </h3>

                            <div class="ch">
                                <canvas id="c3"></canvas>
                            </div>

                        </div>


                        <div class="card">

                            <h3>
                                ${appText(
                    'Product performance',
                    'পণ্যের পারফরম্যান্স',
                    'उत्पाद प्रदर्शन'
                )}
                            </h3>

                            <div class="ch">
                                <canvas id="c4"></canvas>
                            </div>

                        </div>

                    </div>


                    <!-- Alerts + Break-even -->
                    <div class="g2e">

                        <div class="card">

                            <h3>
                                ${appText(
                    'Alerts',
                    'সতর্কতা',
                    'अलर्ट'
                )}
                            </h3>

                            ${d.alerts.length

                    ? d.alerts
                        .slice(0, 8)
                        .map(a => {

                            let message = esc(a.text || '');

                            // ------------------------------------------
                            // LOW MARGIN
                            // ------------------------------------------

                            if (a.type === 'Low margin') {

                                const match = message.match(
                                    /Net profit margin is (.+?) below the 15% threshold\./
                                );

                                if (match) {

                                    message =
                                        `${appText('Net profit margin is')} ` +
                                        `${match[1]} ` +
                                        `${appText('below the 15% threshold.')}`;
                                }
                            }


                            // ------------------------------------------
                            // HIGH EXPENSES
                            // ------------------------------------------

                            else if (a.type === 'High expenses') {

                                const match = message.match(
                                    /Expenses are (.+?) of revenue\./
                                );

                                if (match) {

                                    message =
                                        `${appText('Expenses are')} ` +
                                        `${match[1]} ` +
                                        `${appText('of revenue.')}`;
                                }
                            }


                            // ------------------------------------------
                            // LOW STOCK
                            // ------------------------------------------

                            else if (a.type === 'Low stock') {

                                const match = message.match(
                                    /^(.+?) has only (.+?) unit\(s\) left\.$/
                                );

                                if (match) {

                                    message =
                                        `${match[1]} ` +
                                        `${appText('has only')} ` +
                                        `${match[2]} ` +
                                        `${appText('unit(s) left.')}`;
                                }
                            }
                            else if (a.type === 'Pricing') {

                                const match = message.match(
                                    /^(.+?) sells below its cost price\.$/
                                );

                                if (match) {

                                    message =
                                        `${match[1]} ` +
                                        `${appText('sells below its cost price.')}`;
                                }
                            }


                            return `
                    <div
                        class="
                            al
                            ${a.level === 'bad'
                                    ? 'bad'
                                    : a.level === 'info'
                                        ? 'info'
                                        : ''
                                }
                        "
                    >

                        <b>
                            ${appText(a.type)}:
                        </b>

                        ${message}

                    </div>
                `;

                        })
                        .join('')

                    : `
            <p style="color:var(--mut)">
                ${appText(
                        'No alerts. Everything looks healthy.'
                    )}
            </p>
        `
                }
                        </div>


                        <div class="card">

                            <h3>
                                ${appText(
                    'Break-even',
                    'ব্রেক-ইভেন',
                    'ब्रेक-ईवन'
                )}
                            </h3>


                            ${d.breakeven

                    ? `

                                    <div class="line">
                                        <span>
                                            ${appText(
                        'Fixed costs (expenses)',
                        'স্থায়ী খরচ (ব্যয়)',
                        'स्थायी लागत (खर्च)'
                    )}
                                        </span>

                                        <b>
                                            ${money(
                        d.breakeven.fixedCosts
                    )}
                                        </b>
                                    </div>


                                    <div class="line">
                                        <span>
                                            ${appText(
                        'Break-even revenue',
                        'ব্রেক-ইভেন রাজস্ব',
                        'ब्रेक-ईवन राजस्व'
                    )}
                                        </span>

                                        <b>
                                            ${money(
                        d.breakeven.revenue
                    )}
                                        </b>
                                    </div>


                                    <div class="line">
                                        <span>
                                            ${appText(
                        'Break-even units',
                        'ব্রেক-ইভেন ইউনিট',
                        'ब्रेक-ईवन यूनिट'
                    )}
                                        </span>

                                        <b>
                                            ${d.breakeven.units ?? '—'
                    }
                                        </b>
                                    </div>

                                `

                    : `
                                    <p style="color:var(--mut)">
                                        ${appText(
                        'Not enough data to calculate break-even.',
                        'ব্রেক-ইভেন হিসাব করার জন্য পর্যাপ্ত ডেটা নেই।',
                        'ब्रेक-ईवन की गणना के लिए पर्याप्त डेटा नहीं है।'
                    )}
                                    </p>
                                `
                }

                        </div>

                    </div>

                `

                : `

                    <div class="card">

                        ${empty(
                    appText(
                        'No activity in this period',
                        'এই সময়ে কোনো কার্যক্রম নেই',
                        'इस अवधि में कोई गतिविधि नहीं है'
                    ),

                    appText(
                        'Add products, record orders and log expenses to see your KPIs, or change the period.',
                        'KPI দেখতে পণ্য যোগ করুন, অর্ডার রেকর্ড করুন এবং খরচ লিখুন, অথবা সময়কাল পরিবর্তন করুন।',
                        'अपने KPI देखने के लिए उत्पाद जोड़ें, ऑर्डर रिकॉर्ड करें और खर्च दर्ज करें, या अवधि बदलें।'
                    )
                )}

                    </div>

                `
            }
        `;


        bindPeriod(load);

        kill();


        if (!has) {
            return;
        }


        const L = d.trend.map(
            t => t.date.slice(5)
        );


        // Revenue vs Expenses chart
        chart('c1', {
            type: 'bar',

            data: {
                labels: L,

                datasets: [
                    {
                        label: appText('Revenue'),
                        data: d.trend.map(
                            t => t.revenue
                        ),
                        backgroundColor: '#1d6bff',
                        borderRadius: 5
                    },

                    {
                        label: appText('Expenses'),
                        data: d.trend.map(
                            t => t.expenses
                        ),
                        backgroundColor: '#f59e0b',
                        borderRadius: 5
                    }
                ]
            }
        });


        // Profit trend chart
        chart('c2', {
            type: 'line',

            data: {
                labels: L,

                datasets: [
                    {
                        label: appText('Profit'),
                        data: d.trend.map(
                            t => t.profit
                        ),
                        borderColor: '#12a36b',
                        backgroundColor:
                            'rgba(18,163,107,.12)',
                        fill: true,
                        tension: .35,
                        pointRadius: 0
                    }
                ]
            },

            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });


        // Expense breakdown chart
        chart('c3', {
            type: 'doughnut',

            data: {
                labels: d.expenseBreakdown.map(
                    x => x.name
                ),

                datasets: [
                    {
                        data: d.expenseBreakdown.map(
                            x => x.amount
                        ),
                        backgroundColor: PAL,
                        borderWidth: 0
                    }
                ]
            },

            options: {
                cutout: '65%',

                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });


        // Product performance chart
        chart('c4', {
            type: 'bar',

            data: {
                labels: d.products.map(
                    p => p.name
                ),

                datasets: [
                    {
                        label: 'Profit',
                        data: d.products.map(
                            p => p.profit
                        ),
                        backgroundColor: '#8b5cf6',
                        borderRadius: 6
                    }
                ]
            },

            options: {
                indexAxis: 'y',

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

    };


    await load();

}
// ---------- products ----------
async function pProducts(el) {
    let q = ''; const load = async () => {
        const all = await api('/products'); const rows = all.filter(p => (p.name + p.category).toLowerCase().includes(q));
el.innerHTML = `
    <div class="bar">

        <input
            id="sq"
            placeholder="${appText(
                'Search products',
                'পণ্য খুঁজুন',
                'प्रोडक्ट खोजें'
            )}"
            value="${esc(q)}"
        >

        <button
            class="btn pri"
            id="add"
        >
            + ${appText(
                'Add product',
                'পণ্য যোগ করুন',
                'प्रोडक्ट जोड़ें'
            )}
        </button>

    </div>


    <div class="card tw">

        ${
            rows.length

                ? `

                    <table>

                        <tr>

                            <th>
                                ${appText(
                                    'Product',
                                    'পণ্য',
                                    'प्रोडक्ट'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Category',
                                    'ক্যাটাগরি',
                                    'श्रेणी'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Cost',
                                    'ক্রয়মূল্য',
                                    'लागत'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Price',
                                    'বিক্রয়মূল্য',
                                    'कीमत'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Margin',
                                    'মার্জিন',
                                    'मार्जिन'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Stock',
                                    'স্টক',
                                    'स्टॉक'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Status',
                                    'স্ট্যাটাস',
                                    'स्थिति'
                                )}
                            </th>

                            <th></th>

                        </tr>


                        ${
                            rows
                                .map(p => {

                                    const m =
                                        p.selling_price
                                            ? (
                                                (p.selling_price - p.cost_price)
                                                / p.selling_price
                                            ) * 100
                                            : 0;

                                    const status =
                                        String(p.status)
                                            .trim()
                                            .toLowerCase();

                                    return `

                                        <tr>

                                            <td>
                                                <b>
                                                    ${esc(p.name)}
                                                </b>
                                            </td>

                                            <td>
                                                ${esc(p.category)}
                                            </td>

                                            <td>
                                                ${money(p.cost_price)}
                                            </td>

                                            <td>
                                                ${money(p.selling_price)}
                                            </td>

                                            <td>

                                                <span
                                                    class="pill ${
                                                        m < 0
                                                            ? 'r'
                                                            : m < 15
                                                                ? 'y'
                                                                : 'g'
                                                    }"
                                                >
                                                    ${pc(m)}
                                                </span>

                                            </td>

                                            <td>

                                                <span
                                                    class="pill ${
                                                        p.stock < 5
                                                            ? 'y'
                                                            : ''
                                                    }"
                                                >
                                                    ${p.stock}
                                                </span>

                                            </td>

                                            <td>

                                                ${
                                                    status === 'active'
                                                        ? appText(
                                                            'Active',
                                                            'সক্রিয়',
                                                            'सक्रिय'
                                                        )
                                                        : appText(
                                                            'Inactive',
                                                            'নিষ্ক্রিয়',
                                                            'निष्क्रिय'
                                                        )
                                                }

                                            </td>

                                            <td>

                                                <button
                                                    class="btn sm"
                                                    data-e="${p.id}"
                                                >
                                                    ${appText(
                                                        'Edit',
                                                        'সম্পাদনা',
                                                        'संपादित करें'
                                                    )}
                                                </button>

                                                <button
                                                    class="btn sm bad"
                                                    data-d="${p.id}"
                                                >
                                                    ${appText(
                                                        'Delete',
                                                        'মুছে ফেলুন',
                                                        'डिलीट करें'
                                                    )}
                                                </button>

                                            </td>

                                        </tr>

                                    `;

                                })
                                .join('')
                        }

                    </table>

                `

                : empty(

                    appText(
                        'No products yet',
                        'এখনও কোনো পণ্য নেই',
                        'अभी तक कोई प्रोडक्ट नहीं है'
                    ),

                    appText(
                        'Add your first product to start recording orders.',
                        'অর্ডার রেকর্ড করা শুরু করতে আপনার প্রথম পণ্য যোগ করুন।',
                        'ऑर्डर रिकॉर्ड करना शुरू करने के लिए अपना पहला प्रोडक्ट जोड़ें।'
                    )

                )

        }

    </div>
`;        $('#sq').oninput = e => { q = e.target.value.toLowerCase(); load().then(() => { const i = $('#sq'); i.focus(); i.setSelectionRange(q.length, q.length) }) }; $('#add').onclick = () => form();
        el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => form(all.find(p => p.id == b.dataset.e)));
        el.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (!confirm('Delete this product?')) return; try { await api('/products/' + b.dataset.d, { method: 'DELETE' }); toast('Product deleted'); load() } catch (e) { toast(e.message, 1) } })
    };
    function form(p = {}) {

    const title = p.id
        ? appText(
            'Edit product',
            'পণ্য সম্পাদনা করুন',
            'प्रोडक्ट संपादित करें'
        )
        : appText(
            'Add product',
            'পণ্য যোগ করুন',
            'प्रोडक्ट जोड़ें'
        );

    const nameLabel = appText(
        'Name',
        'নাম',
        'नाम'
    );

    const categoryLabel = appText(
        'Category',
        'ক্যাটাগরি',
        'श्रेणी'
    );

    const stockLabel = appText(
        'Stock quantity',
        'স্টকের পরিমাণ',
        'स्टॉक मात्रा'
    );

    const costPriceLabel = appText(
        'Cost price (₹)',
        'ক্রয়মূল্য (₹)',
        'लागत मूल्य (₹)'
    );

    const sellingPriceLabel = appText(
        'Selling price (₹)',
        'বিক্রয়মূল্য (₹)',
        'विक्रय मूल्य (₹)'
    );

    const statusLabel = appText(
        'Status',
        'স্ট্যাটাস',
        'स्थिति'
    );

    const activeLabel = appText(
        'Active',
        'সক্রিয়',
        'सक्रिय'
    );

    const inactiveLabel = appText(
        'Inactive',
        'নিষ্ক্রিয়',
        'निष्क्रिय'
    );

    const cancelLabel = appText(
        'Cancel',
        'বাতিল',
        'रद्द करें'
    );

    const saveLabel = appText(
        'Save product',
        'পণ্য সংরক্ষণ করুন',
        'प्रोडक्ट सेव करें'
    );

    modal(`
        <h2>${title}</h2>

        <form id="pf">

            <div class="fg">
                <label>${nameLabel}</label>
                <input
                    name="name"
                    required
                    value="${esc(p.name)}"
                >
            </div>

            <div class="row">

                <div class="fg">
                    <label>${categoryLabel}</label>
                    <input
                        name="category"
                        value="${esc(p.category || 'General')}"
                    >
                </div>

                <div class="fg">
                    <label>${stockLabel}</label>
                    <input
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        required
                        value="${p.stock ?? ''}"
                    >
                </div>

            </div>

            <div class="row">

                <div class="fg">
                    <label>${costPriceLabel}</label>
                    <input
                        name="cost_price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value="${p.cost_price ?? ''}"
                    >
                </div>

                <div class="fg">
                    <label>${sellingPriceLabel}</label>
                    <input
                        name="selling_price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value="${p.selling_price ?? ''}"
                    >
                </div>

            </div>

            <div class="fg">

                <label>${statusLabel}</label>

                <select name="status">

                    <option value="active">
                        ${activeLabel}
                    </option>

                    <option
                        value="inactive"
                        ${p.status === 'inactive' ? 'selected' : ''}
                    >
                        ${inactiveLabel}
                    </option>

                </select>

            </div>

            <div id="w"></div>

            <div class="mact">

                <button
                    type="button"
                    class="btn"
                    data-act="close"
                >
                    ${cancelLabel}
                </button>

                <button
                    class="btn pri"
                >
                    ${saveLabel}
                </button>

            </div>

        </form>
    `);

    const chk = () => {

        const f = $('#pf');

        $('#w').innerHTML =
            +f.selling_price.value < +f.cost_price.value &&
            f.selling_price.value !== ''
                ? `
                    <div class="al bad">
                        ${appText(
                            'Selling price is below cost price. You can still save.',
                            'বিক্রয়মূল্য ক্রয়মূল্যের চেয়ে কম। আপনি চাইলে তবুও সংরক্ষণ করতে পারেন।',
                            'विक्रय मूल्य लागत मूल्य से कम है। फिर भी आप इसे सेव कर सकते हैं।'
                        )}
                    </div>
                `
                : '';
    };

    $('#pf').oninput = chk;

    chk();

    $('#pf').onsubmit = async e => {

        e.preventDefault();

        try {

            const r = await api(
                '/products' + (p.id ? '/' + p.id : ''),
                {
                    method: p.id ? 'PUT' : 'POST',
                    body: Object.fromEntries(
                        new FormData(e.target)
                    )
                }
            );

            closeModal();

            toast(
                r.warning ||
                appText(
                    'Product saved',
                    'পণ্য সংরক্ষণ করা হয়েছে',
                    'प्रोडक्ट सेव हो गया'
                )
            );

            load();

        } catch (x) {

            toast(x.message, 1);

        }
    };
}

await load()
}
// ---------- orders ----------
async function pOrders(el) {
    if (el?.id === 'app') el = document.querySelector('#page');

    let tab = 'All';

    let orderPeriod =
        ['today', 'this_week', 'this_month', 'last_month', 'this_year', 'custom', 'all_time']
            .includes(S.period)
            ? S.period
            : 'this_month';

    let orderFrom = S.from || '';
    let orderTo = S.to || '';

    const dateKey = value =>
        String(value || '').slice(0, 10);

    const keyFromDate = d => {

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${y}-${m}-${day}`;
    };

    const getRange = () => {

        if (orderPeriod === 'all_time') {
            return null;
        }

        if (orderPeriod === 'custom') {

            return {
                from: orderFrom || today(),
                to: orderTo || today()
            };

        }

        const now = new Date();

        if (orderPeriod === 'today') {

            const t = keyFromDate(now);

            return {
                from: t,
                to: t
            };

        }

        if (orderPeriod === 'this_week') {

            const d = new Date(now);
            const day = d.getDay();

            const diff =
                day === 0
                    ? -6
                    : 1 - day;

            const start = new Date(d);
            start.setDate(d.getDate() + diff);

            return {
                from: keyFromDate(start),
                to: keyFromDate(now)
            };

        }

        if (orderPeriod === 'this_month') {

            const start =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1
                );

            return {
                from: keyFromDate(start),
                to: keyFromDate(now)
            };

        }

        if (orderPeriod === 'last_month') {

            const start =
                new Date(
                    now.getFullYear(),
                    now.getMonth() - 1,
                    1
                );

            const end =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    0
                );

            return {
                from: keyFromDate(start),
                to: keyFromDate(end)
            };

        }

        if (orderPeriod === 'this_year') {

            const start =
                new Date(
                    now.getFullYear(),
                    0,
                    1
                );

            return {
                from: keyFromDate(start),
                to: keyFromDate(now)
            };

        }

        return null;
    };

    const periodOptions = [
        ['today', 'Today'],
        ['this_week', 'This week'],
        ['this_month', 'This month'],
        ['last_month', 'Last month'],
        ['this_year', 'This year'],
        ['custom', 'Custom range'],
        ['all_time', 'All history']
    ];

    const load = async () => {

        const all = await api('/orders');

        const range = getRange();

        let rows = all;

        if (range) {

            rows = rows.filter(o => {

                const d = dateKey(o.order_date);

                return d >= range.from &&
                    d <= range.to;

            });

        }

        rows =
            rows.filter(
                o =>
                    tab === 'All' ||
                    o.customer_type === tab
            );

        const periodControls = `
            <div class="period-controls">

                ${orderPeriod === 'custom'
                ? `
                            <input
                                type="date"
                                id="ordersFrom"
                                value="${orderFrom}"
                            >

                            <input
                                type="date"
                                id="ordersTo"
                                value="${orderTo}"
                            >
                        `
                : ''
            }

                <select id="ordersPeriod">

                    ${periodOptions
                .map(p => `
                                <option
                                    value="${p[0]}"
                                    ${orderPeriod === p[0] ? 'selected' : ''}
                                >
                                    ${appText(p[1])}
                                </option>
                            `)
                .join('')
            }

                </select>

            </div>
        `;

        el.innerHTML = `

    <div class="bar">

        <div
            class="tabs"
            style="margin:0"
        >

            ${['All', 'New', 'Returning']
                .map(t => `
                    <button
                        class="${t === tab ? 'on' : ''}"
                        data-t="${t}"
                    >
                        ${
                            t === 'All'
                                ? appText(
                                    'All orders',
                                    'সব অর্ডার',
                                    'सभी ऑर्डर'
                                )
                                : t === 'New'
                                    ? appText(
                                        'New customers',
                                        'নতুন গ্রাহক',
                                        'नए ग्राहक'
                                    )
                                    : appText(
                                        'Returning customers',
                                        'ফিরতি গ্রাহক',
                                        'वापसी ग्राहक'
                                    )
                        }
                    </button>
                `)
                .join('')
            }

        </div>

        <div
            style="
                display:flex;
                align-items:center;
                gap:10px;
            "
        >

            ${periodControls}

            <button
                class="btn pri"
                id="add"
            >
                + ${appText(
                    'New order',
                    'নতুন অর্ডার',
                    'नया ऑर्डर'
                )}
            </button>

        </div>

    </div>


    <div class="card tw">

        ${
            rows.length
                ? `
                    <table>

                        <tr>

                            <th>
                                ${appText(
                                    'Order',
                                    'অর্ডার',
                                    'ऑर्डर'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Product',
                                    'পণ্য',
                                    'प्रोडक्ट'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Date',
                                    'তারিখ',
                                    'तारीख'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Customer',
                                    'গ্রাহক',
                                    'ग्राहक'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Type',
                                    'ধরন',
                                    'प्रकार'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Units',
                                    'ইউনিট',
                                    'यूनिट'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Total',
                                    'মোট',
                                    'कुल'
                                )}
                            </th>

                            <th>
                                ${appText(
                                    'Status',
                                    'স্ট্যাটাস',
                                    'स्थिति'
                                )}
                            </th>

                            <th></th>

                        </tr>


                        ${rows
                            .map(o => `

                                <tr>

                                    <td>
                                        #${o.id}
                                    </td>

                                    <td>
                                        ${esc(o.product || '-')}
                                    </td>

                                    <td>
                                        ${formatDate(o.order_date)}
                                    </td>

                                    <td>
                                        ${esc(o.customer)}
                                    </td>

                                    <td>

                                        <span
                                            class="pill ${
                                                o.customer_type === 'Returning'
                                                    ? 'g'
                                                    : ''
                                            }"
                                        >

                                            ${
                                                o.customer_type === 'Returning'
                                                    ? appText(
                                                        'Returning',
                                                        'ফিরতি',
                                                        'वापसी'
                                                    )
                                                    : appText(
                                                        'New',
                                                        'নতুন',
                                                        'नया'
                                                    )
                                            }

                                        </span>

                                    </td>

                                    <td>
                                        ${o.units}
                                    </td>

                                    <td>
                                        ${money(o.total)}
                                    </td>

                                    <td>

                                        <span
<span
    class="pill ${
        String(o.status).trim().toLowerCase() === 'cancelled'
            ? 'r'
            : String(o.status).trim().toLowerCase() === 'pending'
                ? 'y'
                : 'g'
    }"
>
    ${
        String(o.status).trim().toLowerCase() === 'completed'
            ? appText(
                'Completed',
                'সম্পন্ন',
                'पूरा'
            )
            : String(o.status).trim().toLowerCase() === 'cancelled'
                ? appText(
                    'Cancelled',
                    'বাতিল',
                    'रद्द'
                )
                : appText(
                    'Pending',
                    'অপেক্ষমাণ',
                    'लंबित'
                )
    }
</span>

                                    </td>

                                    <td>

                                        <button
                                            type="button"
                                            class="btn sm"
                                            data-e="${o.id}"
                                        >
                                            ${appText(
                                                'Edit',
                                                'সম্পাদনা',
                                                'संपादित करें'
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            class="btn sm bad"
                                            data-d="${o.id}"
                                        >
                                            ${appText(
                                                'Delete',
                                                'মুছে ফেলুন',
                                                'डिलीट करें'
                                            )}
                                        </button>

                                        ${
                                            o.status === 'completed'
                                                ? `
                                                    <button
                                                        type="button"
                                                        class="btn sm bad"
                                                        data-c="${o.id}"
                                                    >
                                                        ${appText(
                                                            'Cancel',
                                                            'বাতিল',
                                                            'रद्द करें'
                                                        )}
                                                    </button>
                                                `
                                                : ''
                                        }

                                    </td>

                                </tr>

                            `)
                            .join('')
                        }

                    </table>
                `
                : empty(
                    appText(
                        'No orders here',
                        'এখানে কোনো অর্ডার নেই',
                        'यहाँ कोई ऑर्डर नहीं है'
                    ),

                    appText(
                        'No orders were found for this period.',
                        'এই সময়কালের জন্য কোনো অর্ডার পাওয়া যায়নি।',
                        'इस अवधि के लिए कोई ऑर्डर नहीं मिला।'
                    )
                )
        }

    </div>
`;

        el
            .querySelectorAll('[data-t]')
            .forEach(b => {

                b.onclick = () => {

                    tab = b.dataset.t;

                    load();

                };

            });

        $('#ordersPeriod').onchange = e => {

            orderPeriod = e.target.value;

            if (
                orderPeriod === 'custom' &&
                !(orderFrom && orderTo)
            ) {

                orderFrom =
                    orderTo =
                    today();

            }

            load();

        };

        if ($('#ordersFrom')) {

            $('#ordersFrom').onchange = e => {

                orderFrom = e.target.value;

                load();

            };

        }

        if ($('#ordersTo')) {

            $('#ordersTo').onchange = e => {

                orderTo = e.target.value;

                load();

            };

        }

        $('#add').onclick = form;

        el
            .querySelectorAll('[data-d]')
            .forEach(b => {

                b.onclick = async () => {

                    if (
                        !confirm(
                            'Delete this order?'
                        )
                    ) {
                        return;
                    }

                    try {

                        await api(
                            `/orders/${b.dataset.d}`,
                            {
                                method: 'DELETE'
                            }
                        );

                        toast(
                            'Order deleted'
                        );

                        load();

                    } catch (e) {

                        toast(
                            e.message,
                            1
                        );

                    }

                };

            });

        el
            .querySelectorAll('[data-c]')
            .forEach(b => {

                b.onclick = async () => {

                    if (
                        !confirm(
                            'Cancel this order? Stock will be restored and it will be excluded from analytics.'
                        )
                    ) {
                        return;
                    }

                    try {

                        await api(
                            `/orders/${b.dataset.c}/cancel`,
                            {
                                method: 'PATCH'
                            }
                        );

                        toast(
                            'Order cancelled'
                        );

                        load();

                    } catch (e) {

                        toast(
                            e.message,
                            1
                        );

                    }

                };

            });

    };

    el.addEventListener(
        'click',
        e => {

            const btn =
                e.target.closest(
                    'button[data-e]'
                );

            if (!btn) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            editOrder(
                btn.dataset.e
            );

        }
    );

    await load();
}
async function editOrder(id) {
    try {
        const [o, cs, ps] = await Promise.all([
            api(`/orders/${id}`),
            api('/customers'),
            api('/products')
        ]);

        if (o.status === 'cancelled') {
            return toast('Cancelled orders cannot be edited', 1);
        }

        const items = o.items || [];

        const customerOptions = cs.map(c => `
            <option value="${c.id}" ${String(c.id) === String(o.customer_id) ? 'selected' : ''}>
                ${esc(c.name)}
            </option>
        `).join('');

        const productOptions = ps
            .filter(p => String(p.status).toLowerCase() === 'active')
            .map(p => `
                <option value="${p.id}">
                    ${esc(p.name)} (${p.stock} in stock · ${money(p.selling_price)})
                </option>
            `).join('');

        const itemRows = items.map((item, i) => `
            <div class="order-edit-item" data-row="${i}">
                <div class="fg">
                    <label>Product</label>
                    <select name="product_id" required>
                        <option value="">Choose product</option>
                        ${ps.map(p => `
                            <option
                                value="${p.id}"
                                ${String(p.id) === String(item.product_id) ? 'selected' : ''}>
                                ${esc(p.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="fg">
                    <label>Quantity</label>
                    <input
                        type="number"
                        name="quantity"
                        min="1"
                        step="1"
                        value="${item.quantity}"
                        required>
                </div>

                <button
                    type="button"
                    class="btn sm bad"
                    data-remove-item>
                    Remove
                </button>
            </div>
        `).join('');

modal(`

    <h2>
        ${
            appText(
                'Edit order',
                'অর্ডার সম্পাদনা',
                'ऑर्डर संपादित करें'
            )
        }
        #${o.id}
    </h2>


    <form id="editOrderForm">


        <!-- Customer -->

        <div class="fg">

            <label>
                ${appText(
                    'Customer',
                    'গ্রাহক',
                    'ग्राहक'
                )}
            </label>


            <div
                style="
                    display:flex;
                    gap:8px;
                    align-items:center;
                "
            >

                <select
                    name="customer_id"
                    required
                    style="flex:1"
                >
                    ${customerOptions}
                </select>


                <button
                    type="button"
                    class="btn sm"
                    id="editCustomerNameBtn"
                >
                    ${appText(
                        'Edit name',
                        'নাম সম্পাদনা',
                        'नाम संपादित करें'
                    )}
                </button>

            </div>


            <div
                id="editCustomerNameWrap"
                style="
                    display:none;
                    margin-top:10px
                "
            >

                <label>
                    ${appText(
                        'Customer name',
                        'গ্রাহকের নাম',
                        'ग्राहक का नाम'
                    )}
                </label>


                <input
                    type="text"
                    id="editCustomerName"
                    name="customer_name"
                    value="${esc(o.customer || '')}"
                >

            </div>

        </div>


        <!-- Order Date -->

        <div class="fg">

            <label>
                ${appText(
                    'Order date',
                    'অর্ডারের তারিখ',
                    'ऑर्डर की तारीख'
                )}
            </label>


            <input
                type="date"
                name="order_date"
                value="${o.order_date}"
                required
            >

        </div>


        <!-- Order Status -->

        <div class="fg">

            <label>
                ${appText(
                    'Order status',
                    'অর্ডারের স্ট্যাটাস',
                    'ऑर्डर की स्थिति'
                )}
            </label>


            <div
                style="
                    display:flex;
                    gap:10px;
                    align-items:center;
                "
            >

                <select
                    name="status"
                    required
                    style="flex:1"
                >

                    <option
                        value="completed"
                        ${
                            String(o.status)
                                .trim()
                                .toLowerCase() === 'completed'
                                ? 'selected'
                                : ''
                        }
                    >
                        ${appText(
                            'Completed',
                            'সম্পন্ন',
                            'पूरा'
                        )}
                    </option>


                    <option
                        value="pending"
                        ${
                            String(o.status)
                                .trim()
                                .toLowerCase() === 'pending'
                                ? 'selected'
                                : ''
                        }
                    >
                        ${appText(
                            'Pending',
                            'অপেক্ষমাণ',
                            'लंबित'
                        )}
                    </option>

                </select>


                ${
                    String(o.status)
                        .trim()
                        .toLowerCase() !== 'cancelled'
                        ? `

                            <button
                                type="button"
                                class="btn sm bad"
                                id="cancelEditOrder"
                            >
                                ${appText(
                                    'Cancel order',
                                    'অর্ডার বাতিল করুন',
                                    'ऑर्डर रद्द करें'
                                )}
                            </button>

                        `
                        : ''
                }

            </div>

        </div>


        <!-- Products -->

        <div
            style="margin-top:14px"
        >

            <label>
                ${appText(
                    'Products',
                    'পণ্যসমূহ',
                    'प्रोडक्ट्स'
                )}
            </label>

        </div>


        <div id="editOrderItems">

            ${itemRows}

        </div>


        <button
            type="button"
            class="btn"
            id="addEditItem"
        >
            + ${appText(
                'Add product',
                'পণ্য যোগ করুন',
                'प्रोडक्ट जोड़ें'
            )}
        </button>


        <!-- Bottom actions -->

        <div class="mact">

            <button
                type="button"
                class="btn"
                data-act="close"
            >
                ${appText(
                    'Cancel',
                    'বাতিল',
                    'रद्द करें'
                )}
            </button>


            <button
                type="submit"
                class="btn pri"
            >
                ${appText(
                    'Save changes',
                    'পরিবর্তন সংরক্ষণ করুন',
                    'बदलाव सेव करें'
                )}
            </button>

        </div>


    </form>

`);
        const cancelEditOrder = $('#cancelEditOrder');

if (cancelEditOrder) {
    cancelEditOrder.onclick = async () => {

        if (
            !confirm(
                'Cancel this order? Stock will be restored and this order will be excluded from analytics.'
            )
        ) {
            return;
        }

        try {

            await api(
                `/orders/${id}/cancel`,
                {
                    method: 'PATCH'
                }
            );

            closeModal();

            toast('Order cancelled');

            await pOrders(
                document.querySelector('#app')
            );

        } catch (err) {

            toast(
                err.message,
                1
            );

        }
    };
}

        const editCustomerNameBtn = $('#editCustomerNameBtn');
        const editCustomerNameWrap = $('#editCustomerNameWrap');

        editCustomerNameBtn.onclick = () => {
            const open = editCustomerNameWrap.style.display !== 'none';

            editCustomerNameWrap.style.display = open ? 'none' : 'block';
            editCustomerNameBtn.textContent = open ? 'Edit name' : 'Hide name';
        };

        const container = $('#editOrderItems');

        $('#addEditItem').onclick = () => {
            const div = document.createElement('div');

            div.className = 'order-edit-item';

            div.innerHTML = `
                <div class="fg">
                    <label>Product</label>

                    <select name="product_id" required>
                        <option value="">Choose product</option>
                        ${productOptions}
                    </select>
                </div>

                <div class="fg">
                    <label>Quantity</label>

                    <input
                        type="number"
                        name="quantity"
                        min="1"
                        step="1"
                        value="1"
                        required>
                </div>

                <button
                    type="button"
                    class="btn sm bad"
                    data-remove-item>
                    Remove
                </button>
            `;

            container.appendChild(div);
        };

        container.onclick = e => {
            const btn = e.target.closest('[data-remove-item]');
            if (!btn) return;

            const rows = container.querySelectorAll('.order-edit-item');

            if (rows.length <= 1) {
                return toast('At least one product is required', 1);
            }

            btn.closest('.order-edit-item').remove();
        };

        $('#editOrderForm').onsubmit = async e => {
            e.preventDefault();

            try {
                const rows = [
                    ...container.querySelectorAll('.order-edit-item')
                ];

                const orderItems = rows.map(row => ({
                    product_id: +row.querySelector('[name="product_id"]').value,
                    quantity: +row.querySelector('[name="quantity"]').value
                }));

                if (orderItems.some(x => !x.product_id || x.quantity < 1)) {
                    return toast(
                        'Please select products and valid quantities',
                        1
                    );
                }

                await api(`/orders/${id}`, {
                    method: 'PUT',
                    body: {
                        customer_id: +e.target.customer_id.value,
                        customer_name: e.target.customer_name.value.trim(),
                        order_date: e.target.order_date.value,
                        status: e.target.status.value,
                        items: orderItems
                    }
                });

                closeModal();

                toast('Order updated');

                await pOrders(document.querySelector('#app'));

            } catch (err) {
                toast(err.message, 1);
            }
        }
    } catch (err) {
        toast(err.message, 1);
    }
}

async function form() {
    const [cs, ps] = await Promise.all([api('/customers'), api('/products')]); const act = ps.filter(p => String(p.status).toLowerCase() === 'active'); if (!act.length) return toast('Add an active product first', 1);
    const opt = `<option value="">Choose product</option>` + act.map(p => `<option value="${p.id}">${esc(p.name)} (${p.stock} in stock · ${money(p.selling_price)})</option>`).join('');
    modal(`<h2>New order</h2><form id="of"><div class="row"><div class="fg"><label>Customer</label><select id="cs"><option value="">+ New customer</option>${cs.map(c => `<option value="${c.id}">${esc(c.name)} (${c.valid_orders} orders)</option>`).join('')}</select></div><div class="fg"><label>Order date</label><input type="date" name="d" value="${today()}" required></div></div>
  <div id="nc"><div class="fg"><label>Customer name</label><input name="cn"></div><div class="row"><div class="fg"><label>Phone (optional)</label><input name="cp"></div><div class="fg"><label>Email (optional)</label><input name="ce" type="email"></div></div></div>
  <label>Items</label><div id="its"><div class="item"><select>${opt}</select><input type="number" min="1" step="1" value="1"><span></span></div></div><button type="button" class="btn sm" id="ai" style="margin-bottom:14px">+ Add item</button><div class="line"><span>Order total</span><b id="tot">₹0</b></div>
  <div class="mact"><button type="button" class="btn" data-act="close">Cancel</button><button class="btn pri">Create order</button></div></form>`);
    const tot = () => { let t = 0; document.querySelectorAll('#its .item').forEach(r => { const p = act.find(x => x.id == r.children[0].value); if (p) t += p.selling_price * (+r.children[1].value || 0) }); $('#tot').textContent = money(t) };
    $('#cs').onchange = e => $('#nc').hidden = !!e.target.value; $('#its').oninput = tot;
    $('#ai').onclick = () => { const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<select>${opt}</select><input type="number" min="1" step="1" value="1"><button type="button" class="btn sm bad">×</button>`; d.lastChild.onclick = () => { d.remove(); tot() }; $('#its').append(d) };
    $('#of').onsubmit = async e => {
        e.preventDefault(); const f = e.target, items = [...document.querySelectorAll('#its .item')].map(r => ({ product_id: r.children[0].value, quantity: +r.children[1].value })).filter(i => i.product_id);
try { await api('/orders', { method: 'POST', body: { order_date: f.d.value, customer_id: $('#cs').value || undefined, customer: { name: f.cn.value, phone: f.cp.value, email: f.ce.value }, items } }); closeModal(); toast('Order created'); await pOrders(document.querySelector('#page')); } catch (x) { toast(x.message, 1) }    }
    
}
// ---------- expenses ----------
async function pExpenses(el) {

    const load = async () => {

        const [ex, cats] = await Promise.all([
            api('/expenses'),
            api('/expense-categories')
        ]);

        const tot = ex.reduce(
            (a, e) => a + e.amount,
            0
        );

        el.innerHTML = `
            <div class="bar">

                <b>
                    ${appText(
                        'Total recorded',
                        'মোট রেকর্ডকৃত',
                        'कुल दर्ज'
                    )}: ${money(tot)}
                </b>

                <button
                    class="btn pri"
                    id="add"
                >
                    ${appText(
                        '+ Add expense',
                        '+ খরচ যোগ করুন',
                        '+ खर्च जोड़ें'
                    )}
                </button>

            </div>

            <div class="card tw">

                ${
                    ex.length
                        ? `
                            <table>

                                <tr>

                                    <th>
                                        ${appText(
                                            'Date',
                                            'তারিখ',
                                            'तारीख'
                                        )}
                                    </th>

                                    <th>
                                        ${appText(
                                            'Category',
                                            'ক্যাটাগরি',
                                            'श्रेणी'
                                        )}
                                    </th>

                                    <th>
                                        ${appText(
                                            'Description',
                                            'বিবরণ',
                                            'विवरण'
                                        )}
                                    </th>

                                    <th>
                                        ${appText(
                                            'Amount',
                                            'পরিমাণ',
                                            'राशि'
                                        )}
                                    </th>

                                    <th></th>

                                </tr>

                                ${ex.map(e => `
                                    <tr>

                                        <td>
                                            ${formatDate(e.expense_date)}
                                        </td>

                                        <td>
                                            <span class="pill">
                                                ${esc(e.category)}
                                            </span>
                                        </td>

                                        <td>
                                            ${esc(e.description)}
                                        </td>

                                        <td>
                                            ${money(e.amount)}
                                        </td>

                                        <td>

                                            <button
                                                class="btn sm"
                                                data-e="${e.id}"
                                            >
                                                ${appText(
                                                    'Edit',
                                                    'সম্পাদনা',
                                                    'संपादित करें'
                                                )}
                                            </button>

                                            <button
                                                class="btn sm bad"
                                                data-d="${e.id}"
                                            >
                                                ${appText(
                                                    'Delete',
                                                    'মুছে ফেলুন',
                                                    'हटाएं'
                                                )}
                                            </button>

                                        </td>

                                    </tr>
                                `).join('')}

                            </table>
                        `
                        : empty(
                            appText(
                                'No expenses yet',
                                'এখনও কোনো খরচ নেই',
                                'अभी तक कोई खर्च नहीं है'
                            ),

                            appText(
                                'Record rent, salaries and other costs to see your net profit.',
                                'নিট লাভ দেখতে ভাড়া, বেতন এবং অন্যান্য খরচ রেকর্ড করুন।',
                                'अपना नेट प्रॉफिट देखने के लिए किराया, वेतन और अन्य खर्च दर्ज करें।'
                            )
                        )
                }

            </div>
        `;


        $('#add').onclick = () => form();


        el.querySelectorAll('[data-e]')
            .forEach(b => {

                b.onclick = () => {

                    form(
                        ex.find(
                            x => x.id == b.dataset.e
                        )
                    );

                };

            });


        el.querySelectorAll('[data-d]')
            .forEach(b => {

                b.onclick = async () => {

                    if (
                        !confirm(
                            appText(
                                'Delete this expense?',
                                'এই খরচটি কি মুছে ফেলবেন?',
                                'क्या आप यह खर्च हटाना चाहते हैं?'
                            )
                        )
                    ) {
                        return;
                    }

                    try {

                        await api(
                            '/expenses/' + b.dataset.d,
                            {
                                method: 'DELETE'
                            }
                        );

                        toast(
                            appText(
                                'Expense deleted',
                                'খরচ মুছে ফেলা হয়েছে',
                                'खर्च हटा दिया गया'
                            )
                        );

                        load();

                    } catch (e) {

                        toast(
                            e.message,
                            1
                        );

                    }

                };

            });


        function form(e = {}) {

            const isEdit = !!e.id;

            modal(`

                <h2>
                    ${
                        isEdit
                            ? appText(
                                'Edit expense',
                                'খরচ সম্পাদনা করুন',
                                'खर्च संपादित करें'
                            )
                            : appText(
                                'Add expense',
                                'খরচ যোগ করুন',
                                'खर्च जोड़ें'
                            )
                    }
                </h2>


                <form id="ef">


                    <div class="row">

                        <div class="fg">

                            <label>
                                ${appText(
                                    'Category',
                                    'ক্যাটাগরি',
                                    'श्रेणी'
                                )}
                            </label>

                            <select
                                name="category_id"
                            >

                                ${cats.map(c => `

                                    <option
                                        value="${c.id}"
                                        ${
                                            c.id === e.category_id
                                                ? 'selected'
                                                : ''
                                        }
                                    >
                                        ${esc(c.name)}
                                    </option>

                                `).join('')}

                            </select>

                        </div>


                        <div class="fg">

                            <label>
                                ${appText(
                                    'Date',
                                    'তারিখ',
                                    'तारीख'
                                )}
                            </label>

                            <input
                                type="date"
                                name="expense_date"
                                required
                                value="${
                                    e.expense_date || today()
                                }"
                            >

                        </div>

                    </div>


                    <div class="fg">

                        <label>
                            ${appText(
                                'Amount (₹)',
                                'পরিমাণ (₹)',
                                'राशि (₹)'
                            )}
                        </label>

                        <input
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value="${e.amount ?? ''}"
                        >

                    </div>


                    <div class="fg">

                        <label>
                            ${appText(
                                'Description',
                                'বিবরণ',
                                'विवरण'
                            )}
                        </label>

                        <input
                            name="description"
                            value="${esc(
                                e.description || ''
                            )}"
                        >

                    </div>


                    <div class="mact">

                        <button
                            type="button"
                            class="btn"
                            data-act="close"
                        >
                            ${appText(
                                'Cancel',
                                'বাতিল',
                                'रद्द करें'
                            )}
                        </button>


                        <button
                            class="btn pri"
                        >
                            ${
                                isEdit
                                    ? appText(
                                        'Save expense',
                                        'খরচ সংরক্ষণ করুন',
                                        'खर्च सेव करें'
                                    )
                                    : appText(
                                        'Save expense',
                                        'খরচ সংরক্ষণ করুন',
                                        'खर्च सेव करें'
                                    )
                            }
                        </button>

                    </div>

                </form>

            `);


            $('#ef').onsubmit = async ev => {

                ev.preventDefault();

                try {

                    await api(
                        '/expenses' +
                        (
                            e.id
                                ? '/' + e.id
                                : ''
                        ),
                        {
                            method: e.id
                                ? 'PUT'
                                : 'POST',

                            body: Object.fromEntries(
                                new FormData(
                                    ev.target
                                )
                            )
                        }
                    );


                    closeModal();


                    toast(
                        appText(
                            'Expense saved',
                            'খরচ সংরক্ষণ করা হয়েছে',
                            'खर्च सेव कर दिया गया'
                        )
                    );


                    load();

                } catch (x) {

                    toast(
                        x.message,
                        1
                    );

                }

            };

        }

    };


    await load();

}
// ---------- insights ----------
async function pInsights(el) {

    const load = async () => {

        const d = await api('/analytics/insights' + qs());
        const c = d.current;
        const cu = c.customers;
        const top = d.top || {};

        const lang =
            document.querySelector('#appLanguageSelect')?.value ||
            getAppLanguage();


        // ------------------------------------------
        // DYNAMIC INSIGHT TRANSLATOR
        // ------------------------------------------

        const translateInsight = (text) => {

            const t = String(text || '');

            let m;


            // Revenue increased/decreased
            m = t.match(
                /^Revenue (increased|decreased) (.+?) compared with the previous period\.$/
            );

            if (m) {

                const word =
                    m[1] === 'increased'
                        ? {
                            en: 'increased',
                            bn: 'বেড়েছে',
                            hi: 'बढ़ा है'
                        }
                        : {
                            en: 'decreased',
                            bn: 'কমেছে',
                            hi: 'घटा है'
                        };

                if (lang === 'bn') {
                    return `রাজস্ব ${word.bn} ${m[2]} আগের সময়ের তুলনায়।`;
                }

                if (lang === 'hi') {
                    return `राजस्व ${m[2]} पिछली अवधि की तुलना में ${word.hi}।`;
                }

                return `Revenue ${word.en} ${m[2]} compared with the previous period.`;
            }


            // Average order value increased/decreased
            m = t.match(
                /^Average order value (increased|decreased) (.+?) compared with the previous period\.$/
            );

            if (m) {

                const word =
                    m[1] === 'increased'
                        ? {
                            en: 'increased',
                            bn: 'বেড়েছে',
                            hi: 'बढ़ा है'
                        }
                        : {
                            en: 'decreased',
                            bn: 'কমেছে',
                            hi: 'घटा है'
                        };

                if (lang === 'bn') {
                    return `গড় অর্ডার মূল্য ${word.bn} ${m[2]} আগের সময়ের তুলনায়।`;
                }

                if (lang === 'hi') {
                    return `औसत ऑर्डर मूल्य ${m[2]} पिछली अवधि की तुलना में ${word.hi}।`;
                }

                return `Average order value ${word.en} ${m[2]} compared with the previous period.`;
            }


            // Largest expense category
            m = t.match(
                /^(.+?) is the largest expense category at (.+?) of expenses\.$/
            );

            if (m) {

                if (lang === 'bn') {
                    return `${m[1]} সবচেয়ে বড় খরচের বিভাগ, যা মোট খরচের ${m[2]}।`;
                }

                if (lang === 'hi') {
                    return `${m[1]} सबसे बड़ा खर्च वर्ग है, जो कुल खर्च का ${m[2]} है।`;
                }

                return t;
            }


            // Highest total profit
            m = t.match(
                /^(.+?) generated the highest total profit \((.+?)\)\.$/
            );

            if (m) {

                if (lang === 'bn') {
                    return `${m[1]} সর্বোচ্চ মোট লাভ করেছে (${m[2]})।`;
                }

                if (lang === 'hi') {
                    return `${m[1]} ने सबसे अधिक कुल लाभ अर्जित किया (${m[2]})।`;
                }

                return t;
            }


            // Highest margin
            m = t.match(
                /^(.+?) has the highest margin at (.+?)\.$/
            );

            if (m) {

                if (lang === 'bn') {
                    return `${m[1]}-এর মার্জিন সর্বোচ্চ, যা ${m[2]}।`;
                }

                if (lang === 'hi') {
                    return `${m[1]} का मार्जिन सबसे अधिक है, जो ${m[2]} है।`;
                }

                return t;
            }


            // Returning customers percentage of identified customers
            m = t.match(
                /^Returning customers accounted for (.+?) of identified customers during the selected period\.$/
            );

            if (m) {

                if (lang === 'bn') {
                    return `নির্বাচিত সময়ে শনাক্ত করা গ্রাহকদের মধ্যে ফিরে আসা গ্রাহকের হার ছিল ${m[1]}।`;
                }

                if (lang === 'hi') {
                    return `चयनित अवधि में पहचाने गए ग्राहकों में वापस आने वाले ग्राहकों की हिस्सेदारी ${m[1]} थी।`;
                }

                return t;
            }


            // Returning customers revenue
            m = t.match(
                /^Returning customers generated (.+?) \((.+?)\) of total revenue\.$/
            );

            if (m) {

                if (lang === 'bn') {
                    return `ফিরে আসা গ্রাহকরা মোট রাজস্বের ${m[2]} (${m[1]}) তৈরি করেছেন।`;
                }

                if (lang === 'hi') {
                    return `वापस आने वाले ग्राहकों ने कुल राजस्व का ${m[2]} (${m[1]}) अर्जित किया।`;
                }

                return t;
            }


            // If no known pattern matches,
            // keep original backend text.
            return t;
        };


        // ------------------------------------------
        // DYNAMIC ALERT TRANSLATOR
        // ------------------------------------------

        const translateAlert = (a) => {

            const type = String(a.type || '');
            const text = String(a.text || '');

            let m;


            // LOW MARGIN
            if (type === 'Low margin') {

                m = text.match(
                    /^Net profit margin is (.+?) below the 15% threshold\.$/
                );

                if (m) {

                    if (lang === 'bn') {
                        return `নিট লাভের মার্জিন হলো ${m[1]} — ১৫% সীমার নিচে।`;
                    }

                    if (lang === 'hi') {
                        return `शुद्ध लाभ मार्जिन ${m[1]} है — 15% की सीमा से कम।`;
                    }

                    return text;
                }


                m = text.match(
                    /^(.+?) has a (.+?) margin\.$/
                );

                if (m) {

                    if (lang === 'bn') {
                        return `${m[1]}-এর মার্জিন ${m[2]}।`;
                    }

                    if (lang === 'hi') {
                        return `${m[1]} का मार्जिन ${m[2]} है।`;
                    }

                    return text;
                }
            }


            // HIGH EXPENSES
            if (type === 'High expenses') {

                m = text.match(
                    /^Expenses are (.+?) of revenue\.$/
                );

                if (m) {

                    if (lang === 'bn') {
                        return `খরচ রাজস্বের ${m[1]}।`;
                    }

                    if (lang === 'hi') {
                        return `खर्च राजस्व का ${m[1]} है।`;
                    }

                    return text;
                }
            }


            // LOW STOCK
            if (type === 'Low stock') {

                m = text.match(
                    /^(.+?) has only (.+?) unit\(s\) left\.$/
                );

                if (m) {

                    if (lang === 'bn') {
                        return `${m[1]}-এর মাত্র ${m[2]}টি ইউনিট বাকি আছে।`;
                    }

                    if (lang === 'hi') {
                        return `${m[1]} के केवल ${m[2]} यूनिट बाकी हैं।`;
                    }

                    return text;
                }
            }


            // PRICING
            if (type === 'Pricing') {

                m = text.match(
                    /^(.+?) sells below its cost price\.$/
                );

                if (m) {

                    if (lang === 'bn') {
                        return `${m[1]} এর ক্রয়মূল্যের চেয়ে কম দামে বিক্রি হচ্ছে।`;
                    }

                    if (lang === 'hi') {
                        return `${m[1]} अपनी लागत कीमत से कम में बिक रहा है।`;
                    }

                    return text;
                }
            }


            return text;
        };


        // ------------------------------------------
        // CUSTOMER COMPARISON
        // ------------------------------------------

        const cmp = (x, y) => {

            if (
                x === null ||
                x === undefined ||
                y === null ||
                y === undefined ||
                y === 0
            ) {
                return '—';
            }

            const percent =
                `${((x - y) / y * 100).toFixed(0)}%`;

            if (lang === 'bn') {
                return `${percent} নতুন গ্রাহকদের তুলনায়`;
            }

            if (lang === 'hi') {
                return `${percent} नए ग्राहकों की तुलना में`;
            }

            return `${percent} vs new customers`;
        };


        // ------------------------------------------
        // CUSTOMER ROWS
        // ------------------------------------------

        const customerRows = [

            [
                appText(
                    'Total identified customers',
                    'শনাক্ত করা মোট গ্রাহক',
                    'पहचाने गए कुल ग्राहक'
                ),
                cu.total
            ],

            [
                appText(
                    'New customers',
                    'নতুন গ্রাহক',
                    'नए ग्राहक'
                ),
                cu.new
            ],

            [
                appText(
                    'Returning customers',
                    'ফিরে আসা গ্রাহক',
                    'वापस आने वाले ग्राहक'
                ),
                cu.returning
            ],

            [
                appText(
                    'Returning customer rate',
                    'ফিরে আসা গ্রাহকের হার',
                    'वापस आने वाले ग्राहकों की दर'
                ),
                pc(cu.rate)
            ],

            [
                appText(
                    'Returning customer revenue',
                    'ফিরে আসা গ্রাহকের রাজস্ব',
                    'वापस आने वाले ग्राहकों का राजस्व'
                ),
                money(cu.returningRevenue)
            ],

            [
                appText(
                    'Returning customer AOV',
                    'ফিরে আসা গ্রাহকের গড় অর্ডার মূল্য',
                    'वापस आने वाले ग्राहक का औसत ऑर्डर मूल्य'
                ),
                money(cu.returningAov)
            ],

            [
                appText(
                    'New customer AOV',
                    'নতুন গ্রাহকের গড় অর্ডার মূল্য',
                    'नए ग्राहक का औसत ऑर्डर मूल्य'
                ),
                money(cu.newAov)
            ],

            [
                appText(
                    'Returning revenue share',
                    'ফিরে আসা গ্রাহকের রাজস্বের অংশ',
                    'वापस आने वाले ग्राहकों के राजस्व का हिस्सा'
                ),
                pc(cu.revenueShare)
            ]

        ];


        // ------------------------------------------
        // PAGE
        // ------------------------------------------

        el.innerHTML = `

            <div class="bar">

                <div class="dashboard-date-range">

                    <span>
                       ${formatDate(d.range.start)}
                    </span>

                    <b>→</b>

                    <span>
                        ${formatDate(d.range.end)}
                    </span>

                </div>

                ${periodBar()}

            </div>


            <!-- KEY OBSERVATIONS -->

            <div class="card" style="margin-bottom:16px">

                <h3>
                    ${appText(
                    'Key observations',
                    'মূল পর্যবেক্ষণ',
                    'मुख्य अवलोकन'
                )}
                </h3>

                ${d.insights.length

                ? d.insights
                    .map(i => `
                                <div class="ins">
                                    ${esc(
                        translateInsight(i)
                    )}
                                </div>
                            `)
                    .join('')

                : empty(
                    appText(
                        'Not enough data',
                        'পর্যাপ্ত ডেটা নেই',
                        'पर्याप्त डेटा नहीं है'
                    ),

                    appText(
                        'Record orders and expenses to generate business observations.',
                        'ব্যবসার মূল্যায়ন তৈরি করতে অর্ডার ও খরচ রেকর্ড করুন।',
                        'व्यवसाय का विश्लेषण बनाने के लिए ऑर्डर और खर्च दर्ज करें।'
                    )
                )
            }

            </div>


            <!-- CUSTOMER + BUSINESS HEALTH -->

            <div class="g2e">

                <div class="card">

                    <h3>
                        ${appText(
                'Customer performance',
                'গ্রাহক পারফরম্যান্স',
                'ग्राहक प्रदर्शन'
            )}
                    </h3>

                    ${customerRows
                .map(x => `
                                <div class="line">

                                    <span>
                                        ${esc(x[0])}
                                    </span>

                                    <b>
                                        ${esc(x[1])}
                                    </b>

                                </div>
                            `)
                .join('')
            }


                    <div
                        class="al info"
                        style="margin-top:12px"
                    >

                        ${lang === 'bn'

                ? `ফিরে আসা গ্রাহকের গড় অর্ডার মূল্য ${money(cu.returningAov)}, নতুন গ্রাহকের ${money(cu.newAov)}-এর তুলনায় (${cmp(cu.returningAov, cu.newAov)})।`

                : lang === 'hi'

                    ? `वापस आने वाले ग्राहक का औसत ऑर्डर मूल्य ${money(cu.returningAov)} है, जबकि नए ग्राहकों का ${money(cu.newAov)} है (${cmp(cu.returningAov, cu.newAov)})।`

                    : `Returning customer AOV is ${money(cu.returningAov)} vs ${money(cu.newAov)} for new customers (${cmp(cu.returningAov, cu.newAov)}).`
            }

                    </div>

                </div>


                <div class="card">

                    <h3>
                        ${appText(
                'Business health',
                'বিজনেসের স্থিতি',
                'बिज़नेस की स्थिति'
            )}
                    </h3>


                    <div class="line">
                        <span>
                            ${appText(
                'Revenue',
                'রাজস্ব',
                'राजस्व'
            )}
                        </span>

                        <b>${money(c.revenue)}</b>
                    </div>


                    <div class="line">
                        <span>
                            ${appText(
                'Gross profit',
                'মোট লাভ',
                'सकल लाभ'
            )}
                        </span>

                        <b>${money(c.grossProfit)}</b>
                    </div>


                    <div class="line">
                        <span>
                            ${appText(
                'Net profit',
                'নিট লাভ',
                'शुद्ध लाभ'
            )}
                        </span>

                        <b>${money(c.netProfit)}</b>
                    </div>


                    <div class="line">
                        <span>
                            ${appText(
                'Net profit margin',
                'নিট লাভের মার্জিন',
                'शुद्ध लाभ मार्जिन'
            )}
                        </span>

                        <b>${pc(c.margin)}</b>
                    </div>


                    <div class="line">
                        <span>
                            ${appText(
                'Expense ratio',
                'খরচের অনুপাত',
                'खर्च अनुपात'
            )}
                        </span>

                        <b>${pc(c.expenseRatio)}</b>
                    </div>


                    <div class="line">
                        <span>
                            ${appText(
                'Average order value',
                'গড় অর্ডার মূল্য',
                'औसत ऑर्डर मूल्य'
            )}
                        </span>

                        <b>${money(c.aov)}</b>
                    </div>

                </div>

            </div>


            <!-- PRODUCT ANALYSIS -->

            <div
                class="card tw"
                style="margin-bottom:16px"
            >

                <h3>
                    ${appText(
                'Product analysis',
                'পণ্য বিশ্লেষণ',
                'उत्पाद विश्लेषण'
            )}
                </h3>


                ${d.products.length

                ? `

                            <table>

                                <thead>

                                    <tr>

                                        <th>
                                            ${appText(
                    'Product',
                    'পণ্য',
                    'उत्पाद'
                )}
                                        </th>

                                        <th>
                                            ${appText(
                    'Units',
                    'ইউনিট',
                    'यूनिट'
                )}
                                        </th>

                                        <th>
                                            ${appText(
                    'Revenue',
                    'রাজস্ব',
                    'राजस्व'
                )}
                                        </th>

                                        <th>
                                            ${appText(
                    'Cost',
                    'খরচ',
                    'लागत'
                )}
                                        </th>

                                        <th>
                                            ${appText(
                    'Profit',
                    'লাভ',
                    'लाभ'
                )}
                                        </th>

                                        <th>
                                            ${appText(
                    'Margin',
                    'মার্জিন',
                    'मार्जिन'
                )}
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    ${d.products
                    .map(p => `

                                                <tr>

                                                    <td>
                                                        <b>
                                                            ${esc(p.name)}
                                                        </b>
                                                    </td>

                                                    <td>
                                                        ${p.units}
                                                    </td>

                                                    <td>
                                                        ${money(p.revenue)}
                                                    </td>

                                                    <td>
                                                        ${money(p.cost)}
                                                    </td>

                                                    <td>
                                                        ${money(p.profit)}
                                                    </td>

                                                    <td>
                                                        <span
                                                            class="pill ${p.margin < 15 ? 'y' : 'g'}"
                                                        >
                                                            ${pc(p.margin)}
                                                        </span>
                                                    </td>

                                                </tr>

                                            `)
                    .join('')
                }

                                </tbody>

                            </table>


                            <p
                                style="
                                    color:var(--mut);
                                    margin-top:12px
                                "
                            >

                                ${appText(
                    'Top revenue:',
                    'সর্বোচ্চ রাজস্ব:',
                    'सबसे अधिक राजस्व:'
                )}

                                <b>
                                    ${esc(top.revenue?.name || '—')}
                                </b>

                                ·

                                ${appText(
                    'Most units:',
                    'সর্বাধিক ইউনিট:',
                    'सबसे अधिक यूनिट:'
                )}

                                <b>
                                    ${esc(top.units?.name || '—')}
                                </b>

                                ·

                                ${appText(
                    'Highest profit:',
                    'সর্বোচ্চ লাভ:',
                    'सबसे अधिक लाभ:'
                )}

                                <b>
                                    ${esc(top.profit?.name || '—')}
                                </b>

                                ·

                                ${appText(
                    'Highest margin:',
                    'সর্বোচ্চ মার্জিন:',
                    'सबसे अधिक मार्जिन:'
                )}

                                <b>
                                    ${esc(top.margin?.name || '—')}
                                </b>

                            </p>

                        `

                : empty(
                    appText(
                        'No product sales',
                        'কোনো পণ্য বিক্রি নেই',
                        'कोई उत्पाद बिक्री नहीं'
                    ),

                    appText(
                        'Sales in this period will appear here.',
                        'এই সময়ের বিক্রি এখানে দেখা যাবে।',
                        'इस अवधि की बिक्री यहां दिखाई देगी।'
                    )
                )
            }

            </div>


            <!-- CATEGORY + EXPENSE -->

            <div class="g2e">

                <div class="card tw">

                    <h3>
                        ${appText(
                'Category contribution',
                'ক্যাটাগরির অবদান',
                'श्रेणी योगदान'
            )}
                    </h3>


                    ${d.categories.length

                ? `

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                ${appText(
                    'Category',
                    'ক্যাটাগরি',
                    'श्रेणी'
                )}
                                            </th>

                                            <th>
                                                ${appText(
                    'Revenue',
                    'রাজস্ব',
                    'राजस्व'
                )}
                                            </th>

                                            <th>
                                                ${appText(
                    'Profit',
                    'লাভ',
                    'लाभ'
                )}
                                            </th>

                                            <th>
                                                ${appText(
                    'Gross margin',
                    'মোট লাভের মার্জিন',
                    'सकल लाभ मार्जिन'
                )}
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        ${d.categories
                    .map(x => `

                                                    <tr>

                                                        <td>
                                                            ${esc(x.category)}
                                                        </td>

                                                        <td>
                                                            ${money(x.revenue)}
                                                        </td>

                                                        <td>
                                                            ${money(x.profit)}
                                                        </td>

                                                        <td>
                                                            ${pc(x.margin)}
                                                        </td>

                                                    </tr>

                                                `)
                    .join('')
                }

                                    </tbody>

                                </table>

                            `

                : empty(
                    appText(
                        'No category data',
                        'কোনো ক্যাটাগরি ডেটা নেই',
                        'श्रेणी का कोई डेटा नहीं है'
                    ),
                    ''
                )
            }

                </div>


                <div class="card">

                    <h3>
                        ${appText(
                'Expense analysis',
                'খরচ বিশ্লেষণ',
                'खर्च विश्लेषण'
            )}
                    </h3>


                    ${d.expenseBreakdown.length

                ? d.expenseBreakdown
                    .map(x => `

                                    <div class="line">

                                        <span>
                                            ${esc(x.name)}
                                        </span>

                                        <span>

                                            <b>
                                                ${money(x.amount)}
                                            </b>

                                            <small
                                                style="color:var(--mut)"
                                            >
                                                (${pc(x.share)})
                                            </small>

                                        </span>

                                    </div>

                                `)
                    .join('')

                : empty(
                    appText(
                        'No expenses',
                        'কোনো খরচ নেই',
                        'कोई खर्च नहीं'
                    ),

                    appText(
                        'Record expenses to analyse cost distribution.',
                        'খরচের বণ্টন বিশ্লেষণ করতে খরচ রেকর্ড করুন।',
                        'खर्च का विश्लेषण करने के लिए खर्च दर्ज करें।'
                    )
                )
            }

                </div>

            </div>


            <!-- ALERTS + BREAK EVEN -->

            <div class="g2e">

                <div class="card">

                    <h3>
                        ${appText(
                'Alerts',
                'সতর্কতা',
                'अलर्ट'
            )}
                    </h3>


                    ${d.alerts.length

                ? d.alerts
                    .map(a => `

                                    <div
                                        class="
                                            al
                                            ${a.level === 'bad'
                            ? 'bad'
                            : a.level === 'info'
                                ? 'info'
                                : ''
                        }
                                        "
                                    >

                                        <b>
                                            ${appText(
                            a.type,
                            a.type === 'Low margin'
                                ? 'কম লাভের মার্জিন'
                                : a.type === 'High expenses'
                                    ? 'বেশি খরচ'
                                    : a.type === 'Low stock'
                                        ? 'স্টক কম'
                                        : a.type === 'Pricing'
                                            ? 'মূল্য নির্ধারণ'
                                            : a.type,
                            a.type === 'Low margin'
                                ? 'कम लाभ मार्जिन'
                                : a.type === 'High expenses'
                                    ? 'ज़्यादा खर्च'
                                    : a.type === 'Low stock'
                                        ? 'स्टॉक कम'
                                        : a.type === 'Pricing'
                                            ? 'मूल्य निर्धारण'
                                            : a.type
                        )}:
                                        </b>

                                        ${esc(
                            translateAlert(a)
                        )}

                                    </div>

                                `)
                    .join('')

                : `

                                <p style="color:var(--mut)">

                                    ${appText(
                    'No alerts. Everything looks healthy.',
                    'কোনো সতর্কতা নেই। সবকিছু ঠিকঠাক আছে।',
                    'कोई अलर्ट नहीं है। सब कुछ ठीक है।'
                )}

                                </p>

                            `
            }

                </div>


                <div class="card">

                    <h3>
                        ${appText(
                'Break-even',
                'ব্রেক-ইভেন',
                'ब्रेक-ईवन'
            )}
                    </h3>


                    ${d.breakeven

                ? `

                                <div class="line">

                                    <span>
                                        ${appText(
                    'Recorded expenses',
                    'রেকর্ড করা খরচ',
                    'दर्ज किए गए खर्च'
                )}
                                    </span>

                                    <b>
                                        ${money(
                    d.breakeven.fixedCosts
                )}
                                    </b>

                                </div>


                                <div class="line">

                                    <span>
                                        ${appText(
                    'Estimated break-even revenue',
                    'আনুমানিক ব্রেক-ইভেন রাজস্ব',
                    'अनुमानित ब्रेक-ईवन राजस्व'
                )}
                                    </span>

                                    <b>
                                        ${money(
                    d.breakeven.revenue
                )}
                                    </b>

                                </div>


                                <div class="line">

                                    <span>
                                        ${appText(
                    'Estimated break-even units',
                    'আনুমানিক ব্রেক-ইভেন ইউনিট',
                    'अनुमानित ब्रेक-ईवन यूनिट'
                )}
                                    </span>

                                    <b>
                                        ${d.breakeven.units ?? '—'}
                                    </b>

                                </div>


                                <p
                                    style="
                                        color:var(--mut);
                                        font-size:12px;
                                        margin-top:10px
                                    "
                                >

                                    ${appText(
                    "Estimate based on the selected period's gross margin and average revenue per unit.",
                    'এই অনুমানটি নির্বাচিত সময়ের মোট লাভের মার্জিন এবং প্রতি ইউনিটের গড় রাজস্বের উপর ভিত্তি করে।',
                    'यह अनुमान चयनित अवधि के सकल लाभ मार्जिन और प्रति यूनिट औसत राजस्व पर आधारित है।'
                )}

                                </p>

                            `

                : empty(
                    appText(
                        'Not enough data to calculate break-even.',
                        'ব্রেক-ইভেন হিসাব করার জন্য পর্যাপ্ত ডেটা নেই।',
                        'ब्रेक-ईवन की गणना के लिए पर्याप्त डेटा नहीं है।'
                    ),

                    appText(
                        'Break-even needs revenue, gross margin and expenses in the selected period.',
                        'ব্রেক-ইভেন হিসাবের জন্য নির্বাচিত সময়ের রাজস্ব, মোট লাভের মার্জিন এবং খরচ প্রয়োজন।',
                        'ब्रेक-ईवन के लिए चयनित अवधि का राजस्व, सकल लाभ मार्जिन और खर्च आवश्यक हैं।'
                    )
                )
            }

                </div>

            </div>
        `;


        bindPeriod(load);

    };


    await load();

}
// ---------- settings ----------
async function pSettings(el) {
    const cats = await api('/expense-categories');

    el.innerHTML = `
        <div class="settings-page">

            <div class="settings-head">
                <h1>Settings</h1>
                <p>Manage your BizLens account and business preferences</p>
            </div>

            <div class="settings-layout">

                <aside class="settings-nav">

                    <div class="settings-nav-group">
                        <div class="settings-nav-title">GENERAL</div>

                        <button class="settings-nav-item active"
                                data-settings="business">
                            Business Profile
                        </button>

                        <button class="settings-nav-item"
                                data-settings="appearance">
                            Appearance
                        </button>
                    </div>

                    <div class="settings-nav-group">
                        <div class="settings-nav-title">DATA & MANAGEMENT</div>

                        <button class="settings-nav-item"
                                data-settings="categories">
                            Expense Categories
                        </button>

                        <button class="settings-nav-item"
                                data-settings="export">
                            Data Export
                        </button>
                    </div>

                    <div class="settings-nav-group">
                        <div class="settings-nav-title">SECURITY</div>

                        <button class="settings-nav-item"
                                data-settings="security">
                            Password & Security
                        </button>
                    </div>

                    <div class="settings-nav-group">
                        <div class="settings-nav-title">ACCOUNT</div>

                        <button class="settings-nav-item"
                                data-settings="account">
                            Account
                        </button>
                    </div>

                </aside>


                <main class="settings-content">

                    <!-- BUSINESS PROFILE -->
                    <section class="settings-section active"
                             data-section="business">

                        <div class="card">

                            <h3>Business Profile</h3>

                            <p class="settings-description">
                                Manage your business information and profile.
                            </p>

                            <div class="profile-upload">

                                <div class="profile-preview">
                                <img id="profilePreview"src="${esc(S.user.profile_image || 'assets/logo-landing.png')}"
                                alt="Business Logo">
                                </div>

                                <div>
                                    <h4>Business Logo</h4>

                                    <button type="button"
                                            class="btn"
                                            data-act="change-profile-photo">
                                        Change / Update Profile Picture
                                    </button>
                                    <input
                                    type="file"
                                    id="profileImageInput"
                                    accept="image/png,image/jpeg,image/webp"
                                    style="display:none">
                                </div>

                            </div>


                            <form id="bf">

                                <div class="fg">
                                    <label>Business Name</label>

                                    <input
                                        name="business_name"
                                        value="${esc(S.user.business_name)}"
                                        required>
                                </div>


                                <div class="fg">
                                    <label>Owner Name</label>

                                    <input
                                        name="owner_name"
                                        value="${esc(S.user.name)}"
                                        required>
                                </div>


                                <div class="fg">
                                    <label>Owner Email</label>

                                    <input
                                        name="owner_email"
                                        type="email"
                                        value="${esc(S.user.email)}"
                                        required>
                                </div>


                                <div class="settings-actions">

                                    <button
                                        class="btn pri"
                                        type="submit">
                                        Save Changes
                                    </button>

                                    <button
                                        class="btn bad"
                                        type="button"
                                        data-act="logout">
                                        Log Out
                                    </button>

                                </div>

                            </form>

                        </div>

                    </section>


                    <!-- APPEARANCE -->
                    <section class="settings-section"
                             data-section="appearance">

                        <div class="card">

                            <h3>Appearance</h3>

                            <p class="settings-description">
                                Customize how BizLens looks for you.
                            </p>

                            <div class="fg">

                                <label>Theme</label>

                                <select id="th">
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </select>

                            </div>

                        </div>

                    </section>


                    <!-- EXPENSE CATEGORIES -->
                    <section class="settings-section"
                             data-section="categories">

                        <div class="card">

                            <h3>Expense Categories</h3>

                            <p class="settings-description">
                                Manage the categories used when recording
                                business expenses.
                            </p>

                            <div class="settings-list">

                                ${cats.map(c => `
                                    <div class="line">

                                        <span>
                                            ${esc(c.name)}
                                        </span>

                                        <button
                                            class="btn sm bad"
                                            data-x="${c.id}">
                                            Remove
                                        </button>

                                    </div>
                                `).join('')}

                            </div>


                            <form
                                id="cf"
                                style="display:flex;gap:8px;margin-top:18px">

                                <input
                                    name="name"
                                    placeholder="New category"
                                    required>

                                <button class="btn pri">
                                    Add Category
                                </button>

                            </form>

                        </div>

                    </section>


                    <!-- DATA EXPORT -->
                    <section class="settings-section"
                             data-section="export">

                        <div class="card">

                            <h3>Data Export</h3>

                            <p class="settings-description">
                                Download your BizLens business data.
                            </p>

                            <div class="row">

                                <div class="fg">

                                    <label>Data</label>

                                    <select id="et">
                                        <option value="products">
                                            Products
                                        </option>

                                        <option value="orders">
                                            Orders
                                        </option>

                                        <option value="expenses">
                                            Expenses
                                        </option>
                                    </select>

                                </div>


                                <div class="fg">

                                    <label>Format</label>

                                    <select id="ef2">
                                        <option value="csv">
                                            CSV
                                        </option>

                                        <option value="xlsx">
                                            XLSX
                                        </option>
                                    </select>

                                </div>

                            </div>

                            <button
                                class="btn pri"
                                id="ex">
                                Download
                            </button>

                        </div>

                    </section>


                    <!-- SECURITY -->
                    <section class="settings-section"
                             data-section="security">

                        <div class="card">

                            <h3>Password & Security</h3>

                            <p class="settings-description">
                                Keep your BizLens account secure.
                            </p>

                            <form id="pw">

<!-- Current Password -->
<div class="fg">
    <label>Current Password</label>

    <div class="password-field">
        <input
            type="password"
            id="pwCurrent"
            name="current"
            required>

        <button
            type="button"
            class="password-toggle"
            data-target="pwCurrent"
            aria-label="Show password">
            <i class="fa-solid fa-eye"></i>
        </button>
    </div>
</div>


<!-- New Password -->
<div class="fg">
    <label>New Password</label>

    <div class="password-field">
        <input
            type="password"
            id="pwNew"
            name="next"
            minlength="6"
            required>

        <button
            type="button"
            class="password-toggle"
            data-target="pwNew"
            aria-label="Show password">
            <i class="fa-solid fa-eye"></i>
        </button>
    </div>
</div>


<!-- Confirm Password -->
<div class="fg">
    <label>Confirm Password</label>

    <div class="password-field">
        <input
            type="password"
            id="pwConfirm"
            name="confirm"
            minlength="6"
            required>

        <button
            type="button"
            class="password-toggle"
            data-target="pwConfirm"
            aria-label="Show password">
            <i class="fa-solid fa-eye"></i>
        </button>
    </div>
</div>


<button class="btn pri">
    Change Password
</button>

</form>


                        </div>

                    </section>


                    <!-- ACCOUNT -->
                    <section class="settings-section"
                             data-section="account">

                        <div class="card">

                            <h3>Account</h3>

                            <p class="settings-description">
                                Manage your BizLens account.
                            </p>

                            <div class="account-info">

                                <div>
                                    <span>Signed in as</span>

                                    <strong>
                                        ${esc(S.user.email)}
                                    </strong>
                                </div>

                            </div>


                            <div class="settings-actions">

                                <button
                                    class="btn bad"
                                    data-act="logout">
                                    Log Out
                                </button>

                            </div>

                        </div>

                    </section>

                </main>

            </div>

        </div>
    `;

        /* Settings translations */
    const settingsLang = getAppLanguage();

    const settingsT = {
        en: {
            'GENERAL': 'GENERAL',
            'Business Profile': 'Business Profile',
            'Appearance': 'Appearance',
            'DATA & MANAGEMENT': 'DATA & MANAGEMENT',
            'Expense Categories': 'Expense Categories',
            'Data Export': 'Data Export',
            'SECURITY': 'SECURITY',
            'Password & Security': 'Password & Security',
            'ACCOUNT': 'ACCOUNT',
            'Account': 'Account',
            'Manage your BizLens account and business preferences':
                'Manage your BizLens account and business preferences',
            'Manage your business information and profile.':
                'Manage your business information and profile.',
            'Business Logo': 'Business Logo',
            'Change / Update Profile Picture':
                'Change / Update Profile Picture',
            'Business Name': 'Business Name',
            'Owner Name': 'Owner Name',
            'Owner Email': 'Owner Email',
            'Save Changes': 'Save Changes',
            'Log Out': 'Log Out',
            'Customize how BizLens looks for you.':
                'Customize how BizLens looks for you.',
            'Theme': 'Theme',
            'Light': 'Light',
            'Dark': 'Dark',
            'Manage the categories used when recording business expenses.':
                'Manage the categories used when recording business expenses.',
            'Remove': 'Remove',
            'New category': 'New category',
            'Add Category': 'Add Category',
            'Download your BizLens business data.':
                'Download your BizLens business data.',
            'Data': 'Data',
            'Products': 'Products',
            'Orders': 'Orders',
            'Expenses': 'Expenses',
            'Format': 'Format',
            'CSV': 'CSV',
            'XLSX': 'XLSX',
            'Download': 'Download',
            'Keep your BizLens account secure.':
                'Keep your BizLens account secure.',
            'Current Password': 'Current Password',
            'New Password': 'New Password',
            'Change Password': 'Change Password',
            'Manage your BizLens account.':
                'Manage your BizLens account.',
            'Signed in as': 'Signed in as'
        },

        bn: {
            'GENERAL': 'সাধারণ',
            'Business Profile': 'ব্যবসায়িক প্রোফাইল',
            'Appearance': 'থিম',
            'DATA & MANAGEMENT': 'ডেটা ও ব্যবস্থাপনা',
            'Expense Categories': 'খরচের ক্যাটাগরি',
            'Data Export': 'ডেটা এক্সপোর্ট',
            'SECURITY': 'নিরাপত্তা',
            'Password & Security': 'পাসওয়ার্ড ও নিরাপত্তা',
            'ACCOUNT': 'অ্যাকাউন্ট',
            'Account': 'অ্যাকাউন্ট',
            'Manage your BizLens account and business preferences':
                'আপনার BizLens অ্যাকাউন্ট ও ব্যবসায়িক পছন্দসমূহ পরিচালনা করুন',
            'Manage your business information and profile.':
                'আপনার ব্যবসার তথ্য ও প্রোফাইল পরিচালনা করুন।',
            'Business Logo': 'ব্যবসার লোগো',
            'Change / Update Profile Picture':
                'প্রোফাইল ছবি পরিবর্তন / আপডেট করুন',
            'Business Name': 'ব্যবসার নাম',
            'Owner Name': 'মালিকের নাম',
            'Owner Email': 'মালিকের ইমেইল',
            'Save Changes': 'পরিবর্তন সংরক্ষণ করুন',
            'Log Out': 'লগ আউট',
            'Customize how BizLens looks for you.':
                'BizLens আপনার জন্য কেমন দেখাবে তা কাস্টমাইজ করুন।',
            'Theme': 'থিম',
            'Light': 'লাইট',
            'Dark': 'ডার্ক',
            'Manage the categories used when recording business expenses.':
                'ব্যবসায়িক খরচ রেকর্ড করার সময় ব্যবহৃত ক্যাটাগরিগুলো পরিচালনা করুন।',
            'Remove': 'সরিয়ে দিন',
            'New category': 'নতুন ক্যাটাগরি',
            'Add Category': 'ক্যাটাগরি যোগ করুন',
            'Download your BizLens business data.':
                'আপনার BizLens ব্যবসায়িক ডেটা ডাউনলোড করুন।',
            'Data': 'ডেটা',
            'Products': 'পণ্য',
            'Orders': 'অর্ডার',
            'Expenses': 'খরচ',
            'Format': 'ফরম্যাট',
            'CSV': 'CSV',
            'XLSX': 'XLSX',
            'Download': 'ডাউনলোড',
            'Keep your BizLens account secure.':
                'আপনার BizLens অ্যাকাউন্ট নিরাপদ রাখুন।',
            'Current Password': 'বর্তমান পাসওয়ার্ড',
            'New Password': 'নতুন পাসওয়ার্ড',
            'Change Password': 'পাসওয়ার্ড পরিবর্তন করুন',
            'Manage your BizLens account.':
                'আপনার BizLens অ্যাকাউন্ট পরিচালনা করুন।',
            'Signed in as': 'সাইন ইন করা হয়েছে'
        },

        hi: {
            'GENERAL': 'सामान्य',
            'Business Profile': 'बिज़नेस प्रोफ़ाइल',
            'Appearance': 'दिखावट',
            'DATA & MANAGEMENT': 'डेटा और प्रबंधन',
            'Expense Categories': 'खर्च की श्रेणियां',
            'Data Export': 'डेटा एक्सपोर्ट',
            'SECURITY': 'सुरक्षा',
            'Password & Security': 'पासवर्ड और सुरक्षा',
            'ACCOUNT': 'अकाउंट',
            'Account': 'अकाउंट',
            'Manage your BizLens account and business preferences':
                'अपने BizLens अकाउंट और बिज़नेस प्राथमिकताओं को मैनेज करें',
            'Manage your business information and profile.':
                'अपने बिज़नेस की जानकारी और प्रोफ़ाइल मैनेज करें।',
            'Business Logo': 'बिज़नेस लोगो',
            'Change / Update Profile Picture':
                'प्रोफ़ाइल फोटो बदलें / अपडेट करें',
            'Business Name': 'बिज़नेस का नाम',
            'Owner Name': 'मालिक का नाम',
            'Owner Email': 'मालिक का ईमेल',
            'Save Changes': 'परिवर्तन सेव करें',
            'Log Out': 'लॉग आउट',
            'Customize how BizLens looks for you.':
                'BizLens आपके लिए कैसा दिखे इसे कस्टमाइज़ करें।',
            'Theme': 'थीम',
            'Light': 'लाइट',
            'Dark': 'डार्क',
            'Manage the categories used when recording business expenses.':
                'बिज़नेस खर्च रिकॉर्ड करते समय उपयोग की जाने वाली श्रेणियों को मैनेज करें।',
            'Remove': 'हटाएं',
            'New category': 'नई श्रेणी',
            'Add Category': 'श्रेणी जोड़ें',
            'Download your BizLens business data.':
                'अपना BizLens बिज़नेस डेटा डाउनलोड करें।',
            'Data': 'डेटा',
            'Products': 'प्रोडक्ट्स',
            'Orders': 'ऑर्डर्स',
            'Expenses': 'खर्च',
            'Format': 'फॉर्मेट',
            'CSV': 'CSV',
            'XLSX': 'XLSX',
            'Download': 'डाउनलोड',
            'Keep your BizLens account secure.':
                'अपने BizLens अकाउंट को सुरक्षित रखें।',
            'Current Password': 'वर्तमान पासवर्ड',
            'New Password': 'नया पासवर्ड',
            'Change Password': 'पासवर्ड बदलें',
            'Manage your BizLens account.':
                'अपने BizLens अकाउंट को मैनेज करें।',
            'Signed in as': 'इस रूप में साइन इन हैं'
        }
    };

    const activeSettingsT = settingsT[settingsLang] || settingsT.en;

    el.querySelectorAll('*').forEach(node => {
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                const original = child.nodeValue.trim();
                const translated = activeSettingsT[original];

                if (translated) {
                    child.nodeValue =
                        child.nodeValue.replace(original, translated);
                }
            }
        });
    });

    el.querySelectorAll('input[placeholder], img[alt]').forEach(node => {
        const attr = node.hasAttribute('placeholder')
            ? 'placeholder'
            : 'alt';

        const original = node.getAttribute(attr);
        const translated = activeSettingsT[original];

        if (translated) {
            node.setAttribute(attr, translated);
        }
    });

    /* Theme */
    $('#th').value = document.documentElement.dataset.theme;

    $('#th').onchange = e => {
        document.documentElement.dataset.theme = e.target.value;
        localStorage.setItem('bl_theme', e.target.value);
    };


    /* Settings navigation */
    el.querySelectorAll('[data-settings]').forEach(btn => {

        btn.onclick = () => {

            const target = btn.dataset.settings;

            el.querySelectorAll('.settings-nav-item')
                .forEach(x => x.classList.remove('active'));

            el.querySelectorAll('.settings-section')
                .forEach(x => x.classList.remove('active'));

            btn.classList.add('active');

            el.querySelector(
                `[data-section="${target}"]`
            ).classList.add('active');

        };

    });
    /* Profile image upload */

    const profileInput =
        document.querySelector('#profileImageInput');

    if (profileInput) {

        profileInput.onchange = () => {

            const file =
                profileInput.files[0];

            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {

                toast(
                    'Profile image must be smaller than 2 MB',
                    1
                );

                profileInput.value = '';
                return;
            }

            const allowed = [
                'image/png',
                'image/jpeg',
                'image/webp'
            ];

            if (!allowed.includes(file.type)) {

                toast(
                    'Please select a PNG, JPG or WEBP image',
                    1
                );

                profileInput.value = '';
                return;
            }

            const reader =
                new FileReader();

            reader.onload = () => {

                window.selectedProfileImage =
                    reader.result;

                const preview =
                    document.querySelector(
                        '#profilePreview'
                    );

                if (preview) {

                    preview.src =
                        reader.result;

                }

            };

            reader.readAsDataURL(file);

        };

    }

    /* Business profile */
    $('#bf').onsubmit = async e => {

        e.preventDefault();

        try {

            const formData = Object.fromEntries(
                new FormData(e.target)
            );

            formData.business_name =
                formData.business_name ||
                S.user.business_name ||
                '';

            formData.owner_name =
                formData.owner_name ||
                S.user.name ||
                '';

            formData.owner_email =
                formData.owner_email ||
                S.user.email ||
                '';

            formData.profile_image =
                window.selectedProfileImage ||
                S.user.profile_image ||
                null;

            await api('/business', {
                method: 'PUT',
                body: formData
            });

            S.user = await api('/me');

            window.selectedProfileImage =
                S.user.profile_image || null;

            const preview =
                document.querySelector('#profilePreview');

            if (preview) {
                preview.src =
                    S.user.profile_image ||
                    'assets/logo-landing.png';
            }

            toast('Profile saved');

        } catch (x) {

            toast(x.message, 1);

        }

    };


/* Password */

/* Show / Hide Password */
document
    .querySelectorAll('.password-toggle')
    .forEach(button => {

        button.onclick = () => {

            const input =
                document.getElementById(
                    button.dataset.target
                );

            if (!input) return;

            const isPassword =
                input.type === 'password';

            input.type =
                isPassword ? 'text' : 'password';

            button.innerHTML =
                isPassword
                    ? '<i class="fa-solid fa-eye-slash"></i>'
                    : '<i class="fa-solid fa-eye"></i>';

            button.setAttribute(
                'aria-label',
                isPassword
                    ? 'Hide password'
                    : 'Show password'
            );

        };

    });


/* Change Password */
$('#pw').onsubmit = async e => {

    e.preventDefault();

    const form = e.target;

    const currentPassword =
        form.elements.current.value;

    const newPassword =
        form.elements.next.value;

    const confirmPassword =
        form.elements.confirm.value;


    /* Check new + confirm password */
    if (newPassword !== confirmPassword) {

        toast(
            'New password and confirm password do not match',
            1
        );

        return;
    }


    /* Minimum password length */
    if (newPassword.length < 6) {

        toast(
            'New password must be at least 6 characters',
            1
        );

        return;
    }


    try {

        await api('/auth/password', {

            method: 'PUT',

            body: {
                current: currentPassword,
                next: newPassword
            }

        });

        form.reset();

        toast('Password changed');


    } catch (x) {

        toast(x.message, 1);

    }

};

    /* Export */
    $('#ex').onclick = async () => {

        const t = $('#et').value;
        const f = $('#ef2').value;

        try {

            const r = await fetch(
                `/api/export/${t}?format=${f}`,
                {
                    headers: {
                        Authorization:
                            'Bearer ' + S.token
                    }
                }
            );

            if (!r.ok)
                throw new Error('Export failed');

            const a = document.createElement('a');

            a.href = URL.createObjectURL(
                await r.blob()
            );

            a.download = `${t}.${f}`;

            a.click();

        } catch (x) {

            toast(x.message, 1);

        }

    };

}
route();
