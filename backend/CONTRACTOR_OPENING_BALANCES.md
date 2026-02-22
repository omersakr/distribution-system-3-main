# Contractor Opening Balances Feature

## Overview
This feature allows setting multiple opening balances for contractors, each associated with a specific project. This is useful when a contractor has worked on multiple projects and has different outstanding balances for each.

## Database Schema

### New Model: ContractorOpeningBalance
```javascript
{
    contractor_id: ObjectId (ref: Contractor),
    project_id: ObjectId (ref: Project),
    amount: Number,
    description: String (optional),
    date: Date,
    is_deleted: Boolean,
    deleted_at: Date
}
```

## Features

### 1. Create Contractor with Opening Balances
When creating a new contractor, you can add multiple opening balances:

**Request:**
```json
POST /api/contractors
{
    "name": "مقاول النقل",
    "opening_balances": [
        {
            "project_id": "project_id_1",
            "amount": 5000,
            "description": "رصيد افتتاحي من مشروع الفيلا"
        },
        {
            "project_id": "project_id_2",
            "amount": 3000,
            "description": "رصيد افتتاحي من مشروع العمارة"
        }
    ]
}
```

### 2. UI Components

#### Add Contractor Modal
- Name input field
- Dynamic opening balances section
- Each opening balance row contains:
  - Project dropdown (required)
  - Amount input (required)
  - Description input (optional)
  - Remove button

#### Features:
- ✅ Add multiple opening balances
- ✅ Remove opening balance rows
- ✅ Project selection from dropdown
- ✅ Validation for required fields
- ✅ Clean modal interface

### 3. Backend Implementation

#### Controller (`contractorsController.js`)
- Validates opening balances array
- Ensures project_id and amount are provided
- Passes data to service layer

#### Service (`contractorService.js`)
- Creates contractor record
- Creates multiple ContractorOpeningBalance records
- Uses transaction-like approach (insertMany)

#### Model (`ContractorOpeningBalance.js`)
- Stores individual opening balances
- Linked to both contractor and project
- Supports soft delete
- Indexed for performance

## Usage Example

### Frontend Flow:
1. User clicks "إضافة مقاول جديد"
2. Modal opens with contractor name field
3. User clicks "إضافة رصيد افتتاحي" button
4. New row appears with:
   - Project dropdown
   - Amount input
   - Description input
   - Remove button
5. User can add multiple opening balances
6. On submit, all data is sent to backend
7. Backend creates contractor and all opening balances

### Backend Flow:
1. Receive contractor data with opening_balances array
2. Validate contractor name
3. Validate each opening balance (project_id, amount)
4. Create contractor document
5. Create all opening balance documents
6. Return success response

## Benefits

1. **Project-Specific Tracking**: Each opening balance is linked to a specific project
2. **Multiple Balances**: Support for contractors working on multiple projects
3. **Historical Data**: Descriptions help document the source of opening balances
4. **Flexible**: Can add 0, 1, or many opening balances
5. **Soft Delete**: Opening balances can be soft-deleted if needed

## Future Enhancements

1. **View Opening Balances**: Display opening balances in contractor details page
2. **Edit Opening Balances**: Allow editing existing opening balances
3. **Delete Opening Balances**: Allow removing specific opening balances
4. **Balance Calculation**: Include opening balances in total balance calculation
5. **Reports**: Show opening balances in contractor reports
6. **Audit Trail**: Track changes to opening balances

## Files Modified

### Backend:
1. `backend/models/ContractorOpeningBalance.js` - New model
2. `backend/models/index.js` - Export new model
3. `backend/controllers/contractorsController.js` - Updated createContractor
4. `backend/services/contractorService.js` - Updated createContractor

### Frontend:
1. `backend/public/contractors.html` - Added modal with opening balances UI
2. `backend/public/js/contractors.js` - Added modal handlers and form logic

## Testing Checklist

- [ ] Create contractor without opening balances
- [ ] Create contractor with one opening balance
- [ ] Create contractor with multiple opening balances
- [ ] Validate required fields (project, amount)
- [ ] Remove opening balance row
- [ ] Add multiple rows and remove some
- [ ] Submit form with valid data
- [ ] Check database for contractor and opening balance records
- [ ] Verify project association
- [ ] Test with different projects
- [ ] Test with negative amounts (debts)
- [ ] Test with zero amounts
- [ ] Test description field (optional)

## Notes

- Opening balances are stored separately from the contractor's main `opening_balance` field
- The main `opening_balance` field is kept for backward compatibility
- Opening balances can be positive (we owe contractor) or negative (contractor owes us)
- Each opening balance must be associated with a valid project
- The description field helps document the source/reason for the opening balance
