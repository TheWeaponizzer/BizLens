# BizLens

BizLens is a full-stack business management and analytics platform built for small and medium-sized businesses (SMBs). It helps business owners transform everyday business data into meaningful insights, enabling them to make better, data-driven decisions and improve overall business performance.

## Overview

BizLens provides a browser-based interface for managing day-to-day business data and analyzing financial and customer activity over selectable reporting periods.

The application includes:

- Business and owner account management
- JWT-based authentication
- Product and inventory management
- Customer management
- Order creation, editing, cancellation, and deletion
- Customer classification into new and returning customers
- Expense categories and expense management
- Dashboard and analytics
- Product and expense analysis
- Insights and business alerts
- Break-even calculations
- CSV/XLSX export
- Light and dark themes
- Multi-language interface support
- Password and business-profile management

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js
- Font Awesome
- Plus Jakarta Sans / Inter

### Backend

- Node.js
- Express.js
- JWT authentication
- bcryptjs password hashing
- dotenv environment configuration

### Database

- MySQL
- mysql2

### Export

- XLSX

## Project Structure

```text
BizLens/
├── backend/
│   ├── analytics.js
│   ├── db.js
│   ├── demo.js
│   ├── routes.js
│   ├── server.js
│   └── setup.js
├── database/
│   ├── demo.sql
│   └── schema.sql
├── frontend/
│   ├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Requirements

Before running BizLens locally, make sure you have:

- Node.js
- npm
- MySQL

The backend expects a MySQL database and uses environment variables for the database connection and application configuration.

## Environment Configuration

Create a `.env` file in the project root.

Example:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bizlens
JWT_SECRET=use_a_long_random_secret
```

Do not commit real database passwords or JWT secrets to source control.

The project `.gitignore` excludes `.env` and `node_modules`.

## Installation

From the BizLens project root:

```bash
npm install
```

## Database Setup

### Initialize or migrate the database

Run:

```bash
npm run db
```

The setup script:

- Creates the `bizlens` database when needed
- Loads the schema
- Checks for older BizLens database structures
- Adds missing product fields such as `stock`, `status`, and timestamps when required

### Load demo data

To generate the complete demo dataset:

```bash
npm run demo
```

The demo seed creates a demo business with products, stock, customers, orders, and expenses covering multiple months.

Demo login created by `npm run demo`:

```text
Email: demo@bizlens.local
Password: BizLens@2026
```

A ready-made SQL dump is also available at:

```text
database/demo.sql
```

The login comment in that SQL dump specifies:

```text
Email: demo@bizlens.local
Password: password
```

These are two different demo-data loading methods; use the credentials associated with the method you use.

## Running the Application

Start the application with:

```bash
npm start
```

The server listens on the configured `PORT` and defaults to port `3000`.

Open:

```text
http://localhost:3000
```

The application serves the frontend directly from the Express server.

## Health Check

BizLens provides a backend health endpoint:

```text
http://localhost:3000/api/health
```

When the database connection is available, the endpoint reports the service as healthy and the database as connected.

## Main Application Areas

### Dashboard

The dashboard provides business performance metrics and reporting-period comparisons, including:

- Revenue
- Product cost
- Gross profit
- Expenses
- Net profit
- Net profit margin
- Total orders
- Average order value
- Customer and returning-customer metrics
- Revenue and expense trends

### Products

Products include:

- Product name
- Category
- Cost price
- Selling price
- Stock quantity
- Active/inactive status

Inactive products cannot be added to new orders.

### Customers

Customer records include:

- Name
- Phone
- Email

Customers are classified based on valid order history.

### Orders

Orders support:

- Customer selection or creation
- Multiple products
- Quantities
- Order dates
- Completed/cancelled status
- Editing
- Deletion
- Cancellation with stock restoration

Order item prices store the cost and selling price at the time of sale.

### Expenses

Expenses are organized by expense categories and include:

- Amount
- Expense date
- Category
- Description

Expenses can be added, edited, and deleted.

### Insights

The Insights area analyzes business data and provides:

- Period comparisons
- Revenue and order observations
- Average order value comparisons
- Expense-category observations
- Product profit and margin observations
- Returning-customer observations
- Break-even information
- Business alerts

The Insights page is data-driven and does not rely on charts for its main presentation.

### Export

The application provides export functionality for supported business data in:

- CSV
- XLSX

## Core Business Rules

1. A valid order is an order whose status is not `cancelled`.
2. A returning customer has at least two valid orders by the end of the selected period.
3. Order items store a snapshot of cost price and selling price at the time of sale.
4. Creating an order decreases product stock.
5. Cancelling an order restores its stock and excludes the cancelled order from analytics.
6. An inactive product cannot be added to a new order.
7. Duplicate product lines in a single order are merged before stock validation.
8. Product profit is calculated using the sale-time cost and selling prices stored in the order item.
9. Product margin is calculated as:

```text
(selling price - cost price) / selling price
```

10. Net profit is calculated as:

```text
revenue - product cost - expenses
```

11. Net profit margin is calculated as:

```text
net profit / revenue
```

12. Analytics compare the selected period with the preceding period of the same length.

## Backend API

The backend exposes JSON API routes under `/api`.

### Authentication

```text
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/me
PUT    /api/auth/password
```

### Business Profile

```text
PUT    /api/business
```

### Products

```text
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Customers

```text
GET    /api/customers
```

### Orders

```text
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PUT    /api/orders/:id
DELETE /api/orders/:id
PATCH  /api/orders/:id/cancel
```

### Expense Categories

```text
GET    /api/expense-categories
POST   /api/expense-categories
DELETE /api/expense-categories/:id
```

### Expenses

```text
GET    /api/expenses
POST   /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id
```

### Analytics

```text
GET    /api/analytics/dashboard
GET    /api/analytics/products
GET    /api/analytics/expenses
GET    /api/analytics/insights
```

### Export

```text
GET    /api/export/:type
```

### Health

```text
GET    /api/health
```

## NPM Scripts

The project defines the following commands:

```bash
npm start
```

Starts the Express application.

```bash
npm run db
```

Initializes or migrates the MySQL database.

```bash
npm run demo
```

Creates the demo account and demo business dataset.

## Troubleshooting

### `Unknown column 'stock' in 'field list'`

Run:

```bash
npm run db
```

Then restart the application:

```bash
npm start
```

### Login problems

Check the following:

1. MySQL is running.
2. The `.env` database settings are correct.
3. The database has been initialized with `npm run db`.
4. Demo data has been loaded if you are using the demo account.
5. The health endpoint reports that the database is connected.

### Port already in use

If port `3000` is already being used, change the `PORT` value in `.env`:

```env
PORT=3001
```

Then open:

```text
http://localhost:3001
```

## Security and Production Considerations

For a production deployment:

- Use a strong random `JWT_SECRET`.
- Use HTTPS.
- Use a dedicated MySQL account with appropriate permissions.
- Keep `.env` and other secrets out of source control.
- Maintain regular database backups.
- Use an appropriate reverse proxy and process manager for the Node.js application.
- Do not use demo credentials for a production account.

## License

No license is specified in the current project files.
