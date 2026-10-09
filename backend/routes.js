const r = require('express').Router(), db = require('./db'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), XLSX = require('xlsx');
const { compute } = require('./analytics');
const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const wrap = f => (req, res, next) => f(req, res, next).catch(next);
const bad = (m, s = 400) => { const e = new Error(m); e.status = s; return e };

const num = v => Number(v);

const isDate = s => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const DEFAULT_CATS = [
    'Rent',
    'Salaries',
    'Marketing',
    'Utilities',
    'Transport',
    'Other'
];


// ===============================
// AUTH - SIGNUP
// ===============================

r.post('/auth/signup', wrap(async (req, res) => {

    const {
        name,
        email,
        password,
        business_name
    } = req.body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    const cleanBusiness = String(business_name || '').trim();

    if (
        !cleanName ||
        !cleanEmail ||
        !cleanBusiness ||
        !password ||
        password.length < 6
    ) {
        throw bad(
            'Enter your name, email, business name and a password of at least 6 characters'
        );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw bad('Enter a valid email address');
    }

    const [ex] = await db.query(
        'SELECT id FROM users WHERE email=?',
        [cleanEmail]
    );

    if (ex.length) {
        throw bad(
            'An account with this email already exists',
            409
        );
    }

    const u = await db.query(
        'INSERT INTO users(name,email,password_hash) VALUES(?,?,?)',
        [
            cleanName,
            cleanEmail,
            await bcrypt.hash(password, 10)
        ]
    );

    const b = await db.query(
        'INSERT INTO businesses(user_id,business_name) VALUES(?,?)',
        [
            u[0].insertId,
            cleanBusiness
        ]
    );

    for (const c of DEFAULT_CATS) {
        await db.query(
            'INSERT INTO expense_categories(business_id,name) VALUES(?,?)',
            [
                b[0].insertId,
                c
            ]
        );
    }

    res.json({
        token: jwt.sign(
            {
                uid: u[0].insertId,
                bid: b[0].insertId
            },
            SECRET,
            { expiresIn: '7d' }
        ),

        user: {
            name: cleanName,
            email: cleanEmail,
            business_name: cleanBusiness,
            profile_image: null
        }
    });

}));


// ===============================
// AUTH - LOGIN
// ===============================

r.post('/auth/login', wrap(async (req, res) => {

    const {
        email,
        password
    } = req.body;

    const loginEmail = String(email || '').trim().toLowerCase();

    const [u] = await db.query(
        `SELECT
            u.*,
            b.id bid,
            b.business_name,
            b.profile_image
         FROM users u
         JOIN businesses b
           ON b.user_id=u.id
         WHERE u.email=?`,
        [loginEmail]
    );

    if (
        !u.length ||
        !(await bcrypt.compare(
            password || '',
            u[0].password_hash
        ))
    ) {
        throw bad(
            'Email or password is incorrect',
            401
        );
    }

    res.json({

        token: jwt.sign(
            {
                uid: u[0].id,
                bid: u[0].bid
            },
            SECRET,
            { expiresIn: '7d' }
        ),

        user: {
            name: u[0].name,
            email: u[0].email,
            business_name: u[0].business_name,
            profile_image: u[0].profile_image || null
        }

    });

}));

// ===============================
// AUTHENTICATION MIDDLEWARE
// ===============================

r.use((req, res, next) => {

    try {

        const header =
            req.headers.authorization || '';

        const token =
            header.startsWith('Bearer ')
                ? header.slice(7)
                : null;

        if (!token) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        const payload =
            jwt.verify(token, SECRET);

        req.uid = payload.uid;
        req.bid = payload.bid;

        next();

    } catch (e) {

        return res.status(401).json({
            error: 'Invalid or expired token'
        });

    }

});
// ===============================
// CURRENT USER / PROFILE
// ===============================

r.get('/me', wrap(async (req, res) => {

    const [u] = await db.query(

        `SELECT
            u.name,
            u.email,
            b.business_name,
            b.profile_image
         FROM users u
         JOIN businesses b
           ON b.user_id=u.id
         WHERE u.id=?`,

        [req.uid]
    );

    res.json(u[0] || {});

}));


// ===============================
// BUSINESS PROFILE UPDATE
// ===============================

r.put('/business', wrap(async (req, res) => {

    const {
        business_name,
        owner_name,
        owner_email,
        profile_image
    } = req.body;

    if (
        !business_name ||
        !business_name.trim()
    ) {
        throw bad(
            'Business name is required'
        );
    }

    const cleanBusinessName =
        business_name.trim();

    const cleanOwnerName =
        owner_name !== undefined
            ? String(owner_name).trim()
            : undefined;

    const cleanOwnerEmail =
        owner_email !== undefined
            ? String(owner_email).trim().toLowerCase()
            : undefined;


    // Validate email if supplied
    if (
        cleanOwnerEmail !== undefined &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanOwnerEmail)
    ) {
        throw bad(
            'Enter a valid owner email address'
        );
    }


    // Check if another account already uses this email
    if (
        cleanOwnerEmail !== undefined &&
        cleanOwnerEmail
    ) {

        const [existing] = await db.query(
            'SELECT id FROM users WHERE email=? AND id<>?',
            [
                cleanOwnerEmail,
                req.uid
            ]
        );

        if (existing.length) {
            throw bad(
                'This email address is already in use',
                409
            );
        }
    }


    // Update business information
    await db.query(

        `UPDATE businesses
         SET
            business_name=?,
            profile_image=?
         WHERE id=?`,

        [
            cleanBusinessName,
            profile_image || null,
            req.bid
        ]
    );


    // Update owner information
    if (
        cleanOwnerName !== undefined ||
        cleanOwnerEmail !== undefined
    ) {

        const [userRows] = await db.query(
            'SELECT name,email FROM users WHERE id=?',
            [req.uid]
        );

        const currentUser =
            userRows[0] || {};

        await db.query(

            `UPDATE users
             SET
                name=?,
                email=?
             WHERE id=?`,

            [
                cleanOwnerName !== undefined
                    ? cleanOwnerName
                    : currentUser.name,

                cleanOwnerEmail !== undefined
                    ? cleanOwnerEmail
                    : currentUser.email,

                req.uid
            ]
        );

    }

    res.json({
        ok: true
    });

}));


// ===============================
// PASSWORD
// ===============================

r.put('/auth/password', wrap(async (req, res) => {

    const {
        current,
        next: n
    } = req.body;

    const [u] = await db.query(
        'SELECT password_hash FROM users WHERE id=?',
        [req.uid]
    );

    if (!n || n.length < 6) {
        throw bad(
            'New password must be at least 6 characters'
        );
    }

    if (
        !(await bcrypt.compare(
            current || '',
            u[0].password_hash
        ))
    ) {
        throw bad(
            'Current password is incorrect'
        );
    }

    await db.query(
        'UPDATE users SET password_hash=? WHERE id=?',
        [
            await bcrypt.hash(n, 10),
            req.uid
        ]
    );

    res.json({
        ok: true
    });

}));


// ===============================
// PRODUCTS
// ===============================

function checkProduct(b) {

    if (!b.name || !b.name.trim()) {
        throw bad(
            'Product name is required'
        );
    }

    const c = num(b.cost_price);
    const s = num(b.selling_price);
    const k = num(b.stock);

    if (
        !(c >= 0) ||
        !(s >= 0) ||
        !Number.isInteger(k) ||
        k < 0
    ) {
        throw bad(
            'Enter valid prices and a whole-number stock quantity'
        );
    }

    return [
        b.name.trim(),
        b.category || 'General',
        c,
        s,
        k,
        b.status === 'inactive'
            ? 'inactive'
            : 'active'
    ];

}


r.get('/products', wrap(async (req, res) => {

    const [x] = await db.query(
        'SELECT * FROM products WHERE business_id=? ORDER BY name',
        [req.bid]
    );

    res.json(x);

}));


r.post('/products', wrap(async (req, res) => {

    const v = checkProduct(req.body);

    await db.query(
        `INSERT INTO products
        (business_id,name,category,cost_price,selling_price,stock,status)
        VALUES(?,?,?,?,?,?,?)`,
        [
            req.bid,
            ...v
        ]
    );

    res.json({
        ok: true,
        warning:
            v[3] < v[2]
                ? 'Selling price is below cost price. Saved anyway.'
                : null
    });

}));


r.put('/products/:id', wrap(async (req, res) => {

    const v = checkProduct(req.body);

    await db.query(
        `UPDATE products
         SET
            name=?,
            category=?,
            cost_price=?,
            selling_price=?,
            stock=?,
            status=?
         WHERE id=? AND business_id=?`,
        [
            ...v,
            req.params.id,
            req.bid
        ]
    );

    res.json({
        ok: true,
        warning:
            v[3] < v[2]
                ? 'Selling price is below cost price. Saved anyway.'
                : null
    });

}));


r.delete('/products/:id', wrap(async (req, res) => {

    try {

        await db.query(
            'DELETE FROM products WHERE id=? AND business_id=?',
            [
                req.params.id,
                req.bid
            ]
        );

    } catch (e) {

        throw bad(
            'This product appears in past orders. Mark it inactive instead.',
            409
        );

    }

    res.json({
        ok: true
    });

}));


// ===============================
// CUSTOMERS & ORDERS
// ===============================

r.get('/customers', wrap(async (req, res) => {

    const [x] = await db.query(

        `SELECT
            c.*,
            (
                SELECT COUNT(*)
                FROM orders o
                WHERE o.customer_id=c.id
                  AND o.status<>'cancelled'
            ) valid_orders

         FROM customers c
         WHERE business_id=?
         ORDER BY name`,

        [req.bid]
    );

    res.json(x);

}));


r.get('/orders', wrap(async (req, res) => {

    const [x] = await db.query(

        `SELECT
            o.id,
            o.order_date,
            o.status,
            c.name customer,
            o.customer_id,

            GROUP_CONCAT(
                DISTINCT p.name
                ORDER BY p.name
                SEPARATOR ', '
            ) product,

            COALESCE(
                SUM(oi.selling_price*oi.quantity),
                0
            ) total,

            COALESCE(
                SUM(oi.quantity),
                0
            ) units,

            (
                SELECT COUNT(*)
                FROM orders o2
                WHERE o2.customer_id=o.customer_id
                  AND o2.status<>'cancelled'
            ) valid_orders

         FROM orders o

         JOIN customers c
           ON c.id=o.customer_id

         LEFT JOIN order_items oi
           ON oi.order_id=o.id

         LEFT JOIN products p
           ON p.id=oi.product_id

         WHERE o.business_id=?

         GROUP BY o.id

         ORDER BY
            o.order_date DESC,
            o.id DESC`,

        [req.bid]
    );

    res.json(
        x.map(o => ({
            ...o,
            customer_type:
                o.status === 'cancelled'
                    ? '-'
                    : o.valid_orders >= 2
                        ? 'Returning'
                        : 'New'
        }))
    );

}));


r.get('/orders/:id', wrap(async (req, res) => {

    const [o] = await db.query(
        `SELECT
            o.*,
            c.name customer
         FROM orders o
         JOIN customers c
           ON c.id=o.customer_id
         WHERE o.id=?
           AND o.business_id=?`,
        [
            req.params.id,
            req.bid
        ]
    );

    if (!o.length) {
        throw bad(
            'Order not found',
            404
        );
    }

    const [i] = await db.query(
        `SELECT
            oi.*,
            p.name
         FROM order_items oi
         JOIN products p
           ON p.id=oi.product_id
         WHERE order_id=?`,
        [req.params.id]
    );

    res.json({
        ...o[0],
        items: i
    });

}));

r.put('/orders/:id', wrap(async (req, res) => {

    const {
        customer_id,
        customer_name,
        order_date,
        status,
        items
    } = req.body;

    if (!isDate(order_date)) {
        throw bad('Choose a valid order date');
    }

    if (
        !Array.isArray(items) ||
        !items.length
    ) {
        throw bad('Add at least one product');
    }

    const cx = await db.getConnection();

    try {

        await cx.beginTransaction();

        // Check order
        const [orders] = await cx.query(
            `SELECT id,status,customer_id
             FROM orders
             WHERE id=?
               AND business_id=?
             FOR UPDATE`,
            [
                req.params.id,
                req.bid
            ]
        );

        if (!orders.length) {
            throw bad('Order not found', 404);
        }

        if (orders[0].status === 'cancelled') {
            throw bad('Cancelled orders cannot be edited');
        }

        // Check customer
        const [customers] = await cx.query(
            `SELECT id
             FROM customers
             WHERE id=?
               AND business_id=?`,
            [
                customer_id,
                req.bid
            ]
        );

        if (!customers.length) {
            throw bad('Customer not found', 404);
        }

        // Normalize products
        const normalized = new Map();

        for (const it of items) {

            const productId = Number(it.product_id);
            const q = num(it.quantity);

            if (
                !Number.isInteger(productId) ||
                productId < 1
            ) {
                throw bad('Choose a valid product');
            }

            if (
                !Number.isInteger(q) ||
                q < 1
            ) {
                throw bad(
                    'Quantity must be a whole number of at least 1'
                );
            }

            normalized.set(
                productId,
                (normalized.get(productId) || 0) + q
            );
        }

        // Get old order items
        const [oldItems] = await cx.query(
            `SELECT product_id,quantity
             FROM order_items
             WHERE order_id=?`,
            [
                req.params.id
            ]
        );

        // Restore stock from old order
        for (const item of oldItems) {

            await cx.query(
                `UPDATE products
                 SET stock=stock+?
                 WHERE id=?
                   AND business_id=?`,
                [
                    item.quantity,
                    item.product_id,
                    req.bid
                ]
            );
        }

        // Lock and validate new products
        const productData = [];

        for (const [productId, q] of normalized) {

            const [products] = await cx.query(
                `SELECT id,
                        cost_price,
                        selling_price,
                        stock,
                        status
                 FROM products
                 WHERE id=?
                   AND business_id=?
                 FOR UPDATE`,
                [
                    productId,
                    req.bid
                ]
            );

            if (!products.length) {
                throw bad('Product not found', 404);
            }

            const product = products[0];

            if (
                String(product.status).toLowerCase() !== 'active' &&
                !oldItems.some(
                    x => Number(x.product_id) === productId
                )
            ) {
                throw bad(
                    `Inactive product ID ${productId} cannot be added`
                );
            }
            if (product.stock < q) {
                throw bad(
                    `Not enough stock for product ID ${productId}`
                );
            }

            productData.push({
                product,
                quantity: q
            });
        }

        // Remove old order items
        await cx.query(
            `DELETE FROM order_items
             WHERE order_id=?`,
            [
                req.params.id
            ]
        );

        // Update order information
        await cx.query(
            `UPDATE orders
     SET
         customer_id=?,
         order_date=?,
         status=?
     WHERE id=?
       AND business_id=?`,
            [
                customer_id,
                order_date,
                status,
                req.params.id,
                req.bid
            ]
        );
        if (customer_name && customer_name.trim()) {

            await cx.query(
                `UPDATE customers
         SET name=?
         WHERE id=?
           AND business_id=?`,
                [
                    customer_name.trim(),
                    customer_id,
                    req.bid
                ]
            );

        }

        // Insert new order items and reduce stock
        for (const item of productData) {

            await cx.query(
                `INSERT INTO order_items
                (
                    order_id,
                    product_id,
                    quantity,
                    cost_price,
                    selling_price
                )
                VALUES(?,?,?,?,?)`,
                [
                    req.params.id,
                    item.product.id,
                    item.quantity,
                    item.product.cost_price,
                    item.product.selling_price
                ]
            );

            await cx.query(
                `UPDATE products
                 SET stock=stock-?
                 WHERE id=?
                   AND business_id=?`,
                [
                    item.quantity,
                    item.product.id,
                    req.bid
                ]
            );
        }

        await cx.commit();

        res.json({
            ok: true
        });

    } catch (e) {

        await cx.rollback();

        throw e;

    } finally {

        cx.release();

    }

}));

r.delete('/orders/:id', wrap(async (req, res) => {

    const cx = await db.getConnection();

    try {

        await cx.beginTransaction();

        const [orders] = await cx.query(
            `SELECT status
             FROM orders
             WHERE id=?
               AND business_id=?
             FOR UPDATE`,
            [
                req.params.id,
                req.bid
            ]
        );

        if (!orders.length) {
            throw bad(
                'Order not found',
                404
            );
        }

        // Restore stock only if the order was not already cancelled
        if (orders[0].status !== 'cancelled') {

            await cx.query(
                `UPDATE products p
                 JOIN order_items oi
                   ON oi.product_id=p.id
                 SET p.stock=p.stock+oi.quantity
                 WHERE oi.order_id=?
                   AND p.business_id=?`,
                [
                    req.params.id,
                    req.bid
                ]
            );

        }

        // Delete order items first
        await cx.query(
            `DELETE FROM order_items
             WHERE order_id=?`,
            [
                req.params.id
            ]
        );

        // Delete order
        await cx.query(
            `DELETE FROM orders
             WHERE id=?
               AND business_id=?`,
            [
                req.params.id,
                req.bid
            ]
        );

        await cx.commit();

        res.json({
            ok: true
        });

    } catch (e) {

        await cx.rollback();
        throw e;

    } finally {

        cx.release();

    }

}));

r.post('/orders', wrap(async (req, res) => {

    const {
        customer_id,
        customer,
        order_date,
        items
    } = req.body;


    if (!isDate(order_date)) {
        throw bad(
            'Choose a valid order date'
        );
    }

    if (
        !Array.isArray(items) ||
        !items.length
    ) {
        throw bad(
            'Add at least one product'
        );
    }

    const cx = await db.getConnection();

    try {

        await cx.beginTransaction();

        let cid = customer_id;

        if (cid) {

            const [c] = await cx.query(
                'SELECT id FROM customers WHERE id=? AND business_id=?',
                [
                    cid,
                    req.bid
                ]
            );

            if (!c.length) {
                throw bad(
                    'Customer not found',
                    404
                );
            }

        } else {

            if (
                !customer ||
                !customer.name
            ) {
                throw bad(
                    'Select a customer or enter a new customer name'
                );
            }

            cid = (
                await cx.query(
                    `INSERT INTO customers
                    (business_id,name,phone,email)
                    VALUES(?,?,?,?)`,
                    [
                        req.bid,
                        customer.name.trim(),
                        customer.phone || null,
                        customer.email || null
                    ]
                )
            )[0].insertId;

        }

        const normalized = new Map();

        for (const it of items) {

            const productId =
                Number(it.product_id);

            const q = num(it.quantity);

            if (
                !Number.isInteger(productId) ||
                productId < 1
            ) {
                throw bad(
                    'Choose a valid product'
                );
            }

            if (
                !Number.isInteger(q) ||
                q < 1
            ) {
                throw bad(
                    'Quantity must be a whole number of at least 1'
                );
            }

            normalized.set(
                productId,
                (normalized.get(productId) || 0) + q
            );

        }

        const oid = (
            await cx.query(
                `INSERT INTO orders
                (business_id,customer_id,order_date)
                VALUES(?,?,?)`,
                [
                    req.bid,
                    cid,
                    order_date
                ]
            )
        )[0].insertId;

        for (const [productId, q] of normalized) {

            const [p] = await cx.query(
                `SELECT *
                 FROM products
                 WHERE id=?
                   AND business_id=?
                   AND status="active"
                 FOR UPDATE`,
                [
                    productId,
                    req.bid
                ]
            );

            if (!p.length) {
                throw bad(
                    'Product not found or inactive',
                    404
                );
            }

            if (p[0].stock < q) {
                throw bad(
                    `Only ${p[0].stock} unit(s) of ${p[0].name} in stock`
                );
            }

            await cx.query(
                `INSERT INTO order_items
                (order_id,product_id,quantity,cost_price,selling_price)
                VALUES(?,?,?,?,?)`,
                [
                    oid,
                    p[0].id,
                    q,
                    p[0].cost_price,
                    p[0].selling_price
                ]
            );

            await cx.query(
                `UPDATE products
                 SET stock=stock-?
                 WHERE id=?
                   AND business_id=?`,
                [
                    q,
                    p[0].id,
                    req.bid
                ]
            );

        }

        await cx.commit();

        res.json({
            ok: true,
            id: oid
        });

    } catch (e) {

        await cx.rollback();
        throw e;

    } finally {

        cx.release();

    }

}));



r.patch('/orders/:id/cancel', wrap(async (req, res) => {

    const cx = await db.getConnection();

    try {

        await cx.beginTransaction();

        const [o] = await cx.query(
            `SELECT status
             FROM orders
             WHERE id=?
               AND business_id=?
             FOR UPDATE`,
            [
                req.params.id,
                req.bid
            ]
        );

        if (!o.length) {
            throw bad(
                'Order not found',
                404
            );
        }

        if (o[0].status === 'cancelled') {
            throw bad(
                'Order is already cancelled'
            );
        }

        await cx.query(
            `UPDATE products p
             JOIN order_items oi
               ON oi.product_id=p.id
             SET p.stock=p.stock+oi.quantity
             WHERE oi.order_id=?`,
            [req.params.id]
        );

        await cx.query(
            `UPDATE orders
             SET status='cancelled'
             WHERE id=?`,
            [req.params.id]
        );

        await cx.commit();

        res.json({
            ok: true
        });

    } catch (e) {

        await cx.rollback();
        throw e;

    } finally {

        cx.release();

    }

}));


// ===============================
// EXPENSES
// ===============================

r.get('/expense-categories', wrap(async (req, res) => {

    const [x] = await db.query(
        'SELECT * FROM expense_categories WHERE business_id=? ORDER BY name',
        [req.bid]
    );

    res.json(x);

}));


r.post('/expense-categories', wrap(async (req, res) => {

    if (!req.body.name) {
        throw bad(
            'Category name is required'
        );
    }

    await db.query(
        `INSERT INTO expense_categories
        (business_id,name)
        VALUES(?,?)`,
        [
            req.bid,
            req.body.name.trim()
        ]
    );

    res.json({
        ok: true
    });

}));


r.delete('/expense-categories/:id', wrap(async (req, res) => {

    try {

        await db.query(
            'DELETE FROM expense_categories WHERE id=? AND business_id=?',
            [
                req.params.id,
                req.bid
            ]
        );

    } catch (e) {

        throw bad(
            'This category has expenses recorded against it',
            409
        );

    }

    res.json({
        ok: true
    });

}));


async function checkExp(req) {

    const b = req.body;
    const a = num(b.amount);

    if (!(a > 0)) {
        throw bad(
            'Enter an amount greater than zero'
        );
    }

    if (!isDate(b.expense_date)) {
        throw bad(
            'Choose a valid date'
        );
    }

    const [c] = await db.query(
        'SELECT id FROM expense_categories WHERE id=? AND business_id=?',
        [
            b.category_id,
            req.bid
        ]
    );

    if (!c.length) {
        throw bad(
            'Choose an expense category'
        );
    }

    return [
        b.category_id,
        a,
        b.expense_date,
        b.description || ''
    ];

}


r.get('/expenses', wrap(async (req, res) => {

    const [x] = await db.query(
        `SELECT
            e.*,
            c.name category
         FROM expenses e
         JOIN expense_categories c
           ON c.id=e.category_id
         WHERE e.business_id=?
         ORDER BY expense_date DESC,id DESC`,
        [req.bid]
    );

    res.json(x);

}));


r.post('/expenses', wrap(async (req, res) => {

    const v = await checkExp(req);

    await db.query(
        `INSERT INTO expenses
        (business_id,category_id,amount,expense_date,description)
        VALUES(?,?,?,?,?)`,
        [
            req.bid,
            ...v
        ]
    );

    res.json({
        ok: true
    });

}));


r.put('/expenses/:id', wrap(async (req, res) => {

    const v = await checkExp(req);

    await db.query(
        `UPDATE expenses
         SET
            category_id=?,
            amount=?,
            expense_date=?,
            description=?
         WHERE id=?
           AND business_id=?`,
        [
            ...v,
            req.params.id,
            req.bid
        ]
    );

    res.json({
        ok: true
    });

}));


r.delete('/expenses/:id', wrap(async (req, res) => {

    await db.query(
        'DELETE FROM expenses WHERE id=? AND business_id=?',
        [
            req.params.id,
            req.bid
        ]
    );

    res.json({
        ok: true
    });

}));


// ===============================
// ANALYTICS
// ===============================

r.get(
    '/analytics/dashboard',
    wrap(async (req, res) =>
        res.json(
            await compute(
                req.bid,
                req.query
            )
        )
    )
);


r.get(
    '/analytics/products',
    wrap(async (req, res) => {
        const d = await compute(
            req.bid,
            req.query
        );

        res.json({
            products: d.products,
            categories: d.categories,
            top: d.top
        });
    })
);


r.get(
    '/analytics/expenses',
    wrap(async (req, res) => {
        const d = await compute(
            req.bid,
            req.query
        );

        res.json({
            total: d.current.expenses,
            breakdown: d.expenseBreakdown,
            ratio: d.current.expenseRatio
        });
    })
);


r.get(
    '/analytics/insights',
    wrap(async (req, res) =>
        res.json(
            await compute(
                req.bid,
                req.query
            )
        )
    )
);


// ===============================
// EXPORT
// ===============================

r.get('/export/:type', wrap(async (req, res) => {

    const q = {

        products:
            `SELECT
                name,
                category,
                cost_price,
                selling_price,
                stock,
                status
             FROM products
             WHERE business_id=?`,

        orders:
            `SELECT
                o.id order_id,
                o.order_date,
                c.name customer,
                o.status,
                p.name product,
                oi.quantity,
                oi.cost_price,
                oi.selling_price
             FROM orders o
             JOIN customers c
               ON c.id=o.customer_id
             JOIN order_items oi
               ON oi.order_id=o.id
             JOIN products p
               ON p.id=oi.product_id
             WHERE o.business_id=?
             ORDER BY o.id`,

        expenses:
            `SELECT
                e.expense_date,
                c.name category,
                e.amount,
                e.description
             FROM expenses e
             JOIN expense_categories c
               ON c.id=e.category_id
             WHERE e.business_id=?
             ORDER BY e.expense_date`

    }[req.params.type];

    if (!q) {
        throw bad(
            'Unknown export type'
        );
    }

    const [rows] = await db.query(
        q,
        [req.bid]
    );

    const ws = XLSX.utils.json_to_sheet(rows);

    if (req.query.format === 'xlsx') {

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            req.params.type
        );

        res.set({
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

            'Content-Disposition':
                `attachment; filename=${req.params.type}.xlsx`
        });

        return res.send(
            XLSX.write(
                wb,
                {
                    type: 'buffer',
                    bookType: 'xlsx'
                }
            )
        );

    }

    res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition':
            `attachment; filename=${req.params.type}.csv`
    });

    res.send(
        XLSX.utils.sheet_to_csv(ws)
    );

}));


module.exports = r;