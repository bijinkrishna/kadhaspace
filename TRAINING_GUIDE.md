# Kadha Cafe Inventory System — Training Guide

Welcome aboard! This guide will help new team members understand how to work efficiently inside the Kadha Cafe Inventory application. It is organised by role so you can jump straight to the workflows that matter to you.

---

## 1. Getting Started (All Users)

### 1.1 Access & Login
1. Open the application URL provided by IT.
2. Log in using your assigned username and password.
3. First-time users should immediately change their password via the IT helpdesk.

### 1.2 Layout Basics
- **Left Sidebar**: Navigation menu. Items appear based on your role.
- **Top Header**: Shows the current module title and your username. The logout button is on the right.
- **Main Content**: Displays dashboards, forms and tables for the selected module.
- **Mobile View**: Tap the menu icon (☰) to open/close the sidebar.

### 1.3 Common Controls
- **Date Selectors**: Standard calendar picker wherever a date is needed.
- **Tables**: Sortable columns and action buttons (e.g., “View”, “Edit”, “Mark Done”).
- **Cards**: Display key metrics or shortcuts.

---

## 2. Staff Role — Daily Operations Hub
The staff workspace focuses on day-to-day execution tasks.

### 2.1 Staff Hub
- Navigate via the sidebar “Staff Hub” link (or go to `/staff`).
- You’ll see key stats: ingredient counts, low-stock alerts, open purchase orders and pending intends.
- Use the **Quick Actions** buttons to:
  - Create a new intend
  - Receive stock (open PO list)
  - View stock levels (read-only)
  - Review ingredient movements (read-only)
  - Access recipes and ingredients (read-only for reference)

### 2.2 Creating an Intend
1. Click **Create Intend** → fill in required items and quantities.
2. Submit for review. Managers will approve/convert into purchase orders.

### 2.3 Receiving Stock
1. Click **Receive Stock** → select the relevant purchase order.
2. Review incoming items and record actual received quantities.
3. Confirm to automatically create a GRN (Goods Receipt Note).

### 2.4 Monitoring Stock & Movements
- **Stock**: Read-only list of all inventory with quantities, min levels and alerts.
- **Ingredient Movement**: Shows latest in/out adjustments (read-only).

---

## 3. Manager Role — Operations Control Centre
Managers can monitor attendance, housekeeping tasks and operations status.

### 3.1 Manager Ops Dashboard (`/manager/ops`)
- Two tabs: **Attendance** and **Housekeeping**.

#### Attendance
- Select a date to view staff roster and current attendance.
- Use the **Present / Late / Absent** buttons to mark attendance (within the same day).

#### Housekeeping Tasks
- Daily checklist with time windows (11 AM, 3 PM, 7 PM, 11 PM).
- Each card shows start time, due time, status and window indicators.
- During an active window:
  - Click **Mark done** if staff completed the task.
  - Click **Mark not done** if the task was missed or failed.
- Summary cards display completed, upcoming and missed counts so you can escalate quickly.

### 3.2 Stock & Vendor Oversight
- **Stock**: Adjustments, low-stock monitoring, and alert triggers.
- **Vendors**: Create or update vendor profiles for purchasing.
- **Purchase Orders**: Review pending/confirmed POs, generate GRNs, record payments.

---

## 4. Accounts Role — Financial Command Centre
Accounts teams track financial health and outstanding liabilities.

### 4.1 Accounts Hub (`/accounts`)
- Key metrics: MTD revenue, gross profit/margin, outstanding payables.
- Cash flow cards show inflow/outflow and net balance.
- Payables watchlist highlights overdue or due-soon POs.
- Expense insights list top categories and recent entries.
- Recent activity streams for payments, expenses and sales.

### 4.2 Core Actions
- **Record Payment**: Navigate to payments module, log vendor settlements, attach references.
- **Other Expenses**: Record non-PO costs, track payment status.
- **Cash Ledger**: Combined credit (sales) and debit (payments/expenses) ledger.

---

## 5. Administrator Role — System Oversight
Administrators manage user access, data seeding and configuration.

### 5.1 User Administration (`/admin/users`)
- Create, edit or disable users.
- Assign appropriate roles: `admin`, `accounts`, `manager`, `staff`.

### 5.2 Data Maintenance
- **Test data seeding endpoints** (under `/api/admin/…`) allow resets in staging environments.
- Monitor dashboards to ensure scheduled tasks and integrations are functioning.

### 5.3 Security Notes
- Enforce password policies and periodic reviews.
- Monitor role assignments to avoid excessive privileges.
- Logout unused sessions via the admin console.

---

## 6. Module Overview & Navigation
| Module | Description | Role Access |
| --- | --- | --- |
| Dashboard (`/`) | Executive overview (redirects staff to their hub) | Admin, Manager, Accounts |
| Staff Hub (`/staff`) | Staff task launcher and read-only references | Staff (read-only to others) |
| Ingredients (`/ingredients`) | Master list of ingredients | All roles (read-only for staff) |
| Recipes (`/recipes`) | Recipe definitions & costs | Admin, Accounts, Staff (read-only) |
| Intends (`/intends`) | Manage requisitions | Admin, Accounts, Manager, Staff |
| Purchase Orders (`/purchase-orders`) | PO lifecycle & GRNs | Admin, Accounts, Manager |
| Stock (`/stock`) | Current stock, adjustments | All roles |
| Payments (`/payments`) | Vendor payments & receipts | Admin, Accounts |
| Other Expenses (`/expenses`) | Non-PO spend tracking | Admin, Accounts |
| Cash Ledger (`/cash-ledger`) | Combined cash flow view | Admin, Accounts |
| Manager Ops (`/manager/ops`) | Attendance & housekeeping | Manager |
| Accounts Hub (`/accounts`) | Financial dashboard | Accounts, Admin |
| Admin (`/admin`) | System configuration | Admin |

---

## 7. Best Practices & Tips
- **Real-time data**: Most dashboards use `cache: 'no-store'`. Refresh if you suspect stale data.
- **Task windows**: Housekeeping actions are time-bound—do not wait past the due time.
- **Read-only vs Editable**: Staff dashboards provide references only; edits should happen via dedicated modules.
- **Error handling**: If an API fails, note the error message and report to the tech team.
- **Seeding / Testing**: In non-production environments, use `/api/manager/hk/seed` or admin seed routes to populate sample data.

---

## 8. Support & Troubleshooting
- **Password / Access issues**: Contact IT helpdesk.
- **Data discrepancies**: Verify with the Accounts or Admin team before taking action.
- **System errors**: Capture the screen, note the time and error message, and escalate to the development team.
- **Feature requests**: Record in the product backlog via the internal ticketing system.

---

### Quick Reference Contacts
| Topic | Contact |
| --- | --- |
| Access / Password | IT Helpdesk |
| Inventory Process | Operations Manager |
| Vendor & Payments | Accounts Lead |
| Application Issues | Product/Dev Team |

Keep this guide handy and update it as workflows evolve. Welcome to the team, and happy managing! 🚀
