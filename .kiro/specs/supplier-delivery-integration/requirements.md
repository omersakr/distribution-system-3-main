# Requirements Document

## Introduction

The supplier delivery integration feature extends the existing delivery management system to fully support supplier deliveries alongside crusher deliveries. This feature enables the system to handle material deliveries from external suppliers with their own pricing structures, while maintaining unified financial tracking and business rule validation.

## Glossary

- **System**: The delivery management application
- **Supplier**: External material provider with custom pricing per material type
- **Crusher**: Internal material production facility with standardized pricing
- **Delivery**: A material transport transaction from supplier/crusher to client
- **Material_Price_At_Time**: Historical price snapshot preserved with each delivery
- **Net_Quantity**: Car volume minus discount volume (actual billable quantity)
- **Balance**: Financial amount owed to or by a supplier/crusher
- **Contractor**: Transportation service provider (optional for suppliers, required for crushers)

## Requirements

### Requirement 1: Supplier Selection and Material Integration

**User Story:** As a delivery operator, I want to select suppliers and their available materials, so that I can create deliveries with accurate pricing from external sources.

#### Acceptance Criteria

1. WHEN the supplier type is selected, THE System SHALL display only suppliers in the supplier dropdown
2. WHEN a supplier is selected, THE System SHALL populate the material dropdown with only that supplier's available materials
3. WHEN a supplier material is selected, THE System SHALL display the supplier's price for that material
4. WHEN switching between crusher and supplier types, THE System SHALL clear previous selections and update available options
5. WHEN no supplier is selected, THE System SHALL disable material selection for supplier deliveries

### Requirement 2: Delivery Creation with Supplier Integration

**User Story:** As a delivery operator, I want to create supplier deliveries with automatic price lookup, so that deliveries are recorded with correct historical pricing.

#### Acceptance Criteria

1. WHEN creating a supplier delivery, THE System SHALL require supplier selection instead of crusher selection
2. WHEN a supplier delivery is submitted, THE System SHALL capture the supplier's material price as material_price_at_time
3. WHEN a supplier delivery is created, THE System SHALL calculate supplier_total_cost using net quantity and material_price_at_time
4. WHEN a supplier delivery is created, THE System SHALL set crusher_total_cost to zero
5. WHEN contractor information is provided for supplier deliveries, THE System SHALL calculate contractor charges normally

### Requirement 3: Financial Balance Calculation

**User Story:** As a financial manager, I want accurate supplier balance calculations, so that I can track what the company owes to each supplier.

#### Acceptance Criteria

1. WHEN calculating supplier balance, THE System SHALL sum all supplier delivery costs as total_due
2. WHEN calculating supplier balance, THE System SHALL subtract all supplier payments as total_paid
3. WHEN supplier balance is positive, THE System SHALL mark it as "payable" status
4. WHEN supplier balance is negative, THE System SHALL mark it as "overpaid" status
5. WHEN supplier balance is zero, THE System SHALL mark it as "balanced" status

### Requirement 4: Data Validation and Business Rules

**User Story:** As a system administrator, I want proper validation of supplier deliveries, so that data integrity is maintained across the system.

#### Acceptance Criteria

1. WHEN creating a delivery, THE System SHALL require either crusher_id OR supplier_id but not both
2. WHEN supplier_id is provided, THE System SHALL validate that the supplier exists and is active
3. WHEN material is selected for supplier delivery, THE System SHALL validate that the supplier offers that material
4. WHEN material_price_at_time is zero or missing for supplier deliveries, THE System SHALL reject the delivery
5. WHEN voucher number is provided, THE System SHALL ensure uniqueness across all deliveries

### Requirement 5: Contractor Integration for Supplier Deliveries

**User Story:** As a delivery operator, I want to optionally assign contractors to supplier deliveries, so that transportation costs can be tracked separately from material costs.

#### Acceptance Criteria

1. WHEN creating supplier deliveries, THE System SHALL allow contractor selection as optional
2. WHEN contractor is selected for supplier delivery, THE System SHALL calculate contractor_total_charge normally
3. WHEN no contractor is selected for supplier delivery, THE System SHALL set contractor_total_charge to zero
4. WHEN contractor charge per meter is provided, THE System SHALL multiply by net_quantity for total charge
5. WHEN contractor information is incomplete, THE System SHALL still allow supplier delivery creation

### Requirement 6: Historical Price Preservation

**User Story:** As a financial auditor, I want historical material prices preserved with each delivery, so that financial records remain accurate over time even when supplier prices change.

#### Acceptance Criteria

1. WHEN a supplier delivery is created, THE System SHALL capture the current supplier material price as material_price_at_time
2. WHEN supplier material prices are updated, THE System SHALL not affect existing delivery records
3. WHEN calculating financial totals, THE System SHALL use material_price_at_time from each delivery record
4. WHEN displaying delivery history, THE System SHALL show the price that was active at delivery time
5. WHEN generating financial reports, THE System SHALL use preserved historical prices for accuracy

### Requirement 7: User Interface Consistency

**User Story:** As a delivery operator, I want consistent UI behavior between crusher and supplier deliveries, so that I can efficiently process both types without confusion.

#### Acceptance Criteria

1. WHEN switching supplier types, THE System SHALL maintain the same form layout and field positions
2. WHEN supplier type is selected, THE System SHALL show supplier-specific fields and hide crusher-specific fields
3. WHEN price information is displayed, THE System SHALL use consistent formatting for both crusher and supplier prices
4. WHEN validation errors occur, THE System SHALL display clear messages indicating the specific issue
5. WHEN form is submitted successfully, THE System SHALL provide confirmation with delivery details

### Requirement 8: Integration with Existing Systems

**User Story:** As a system architect, I want supplier deliveries to integrate seamlessly with existing delivery, payment, and reporting systems, so that all functionality works consistently.

#### Acceptance Criteria

1. WHEN supplier deliveries are created, THE System SHALL store them in the same delivery collection as crusher deliveries
2. WHEN retrieving delivery lists, THE System SHALL include both crusher and supplier deliveries with appropriate source identification
3. WHEN processing supplier payments, THE System SHALL use the same payment system as crusher payments
4. WHEN generating reports, THE System SHALL include supplier delivery data alongside crusher delivery data
5. WHEN calculating client balances, THE System SHALL include revenue from both crusher and supplier deliveries