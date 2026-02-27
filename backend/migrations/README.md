# Database Migrations

This folder contains migration scripts to fix existing data issues.

## Available Migrations

### 1. Fix Delivery Material Prices
**File**: `fix-delivery-material-prices.js`

**Purpose**: Fixes deliveries with missing or zero `material_price_at_time` by looking up the material price from the crusher or supplier.

**What it does**:
- Finds all deliveries with missing/zero material_price_at_time
- Looks up the material price from the crusher's materials
- If not found in crusher, looks up from supplier's materials
- Updates the delivery with the found price
- Reports any deliveries that couldn't be fixed automatically

### 2. Fix Expense Categories
**File**: `fix-expense-categories.js`

**Purpose**: Adds default category to expenses that don't have one.

**What it does**:
- Finds all expenses with missing category field
- Sets them to default category 'أخرى' (Other)
- You can then manually update them to the correct category

## How to Run

### Option 1: Run All Migrations (Recommended)
```bash
cd backend/migrations
node run-all-migrations.js
```

### Option 2: Run Individual Migrations
```bash
cd backend/migrations
node fix-delivery-material-prices.js
node fix-expense-categories.js
```

## Prerequisites

1. Make sure your `.env` file has the correct `MONGODB_URI`
2. Make sure the Node.js server is NOT running (to avoid conflicts)
3. Backup your database before running migrations (recommended)

## After Running Migrations

1. **Restart your Node.js server**
2. **Hard refresh your browser** (Ctrl+Shift+R)
3. **Check the project financial cards** - material costs should now appear
4. **Review expenses** - they will have category 'أخرى', edit them to set correct categories

## Troubleshooting

### Migration fails with "Cannot find module"
Make sure you're running the script from the `backend/migrations` folder:
```bash
cd backend/migrations
node fix-delivery-material-prices.js
```

### Migration reports "Could not find price"
Some deliveries might not have the material defined in the crusher/supplier's materials list. You'll need to:
1. Go to the crusher/supplier page
2. Add the material with its price
3. Run the migration again, OR
4. Manually edit the delivery to set the material price

### Connection errors
Check your `.env` file and make sure `MONGODB_URI` is correct.

## Manual Fixes

If a delivery couldn't be fixed automatically, you can:
1. Go to the deliveries page (or client details page)
2. Find the delivery by its ID (shown in migration output)
3. Edit it and set the material price manually
4. Save

## Safety

These migrations are designed to be:
- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Only updates missing/invalid data
- **Logged**: Shows detailed output of what was changed

Always backup your database before running migrations!
