# Requirements Document

## Introduction

This specification defines the comprehensive integration of supplier functionality into the delivery system. The Delivery model has been updated to include supplier_id and supplier_total_cost fields, but the entire system needs to be updated to support supplier-based deliveries alongside the existing crusher-based deliveries. This integration will enable users to create deliveries from suppliers, automatically calculate supplier costs, and include supplier expenses in financial calculations across projects and dashboards.

## Glossary

- **Delivery_System**: The core system that manages material deliveries to clients
- **Supplier**: A third-party entity that provides materials with defined pricing per material type
- **Crusher**: An existing entity type that provides materials (existing functionality)
- **Supplier_Delivery**: A delivery where materials are sourced from a supplier rather than a crusher
- **Material_Price_At_Time**: Historical pricing preserved when a delivery is created
- **Financial_Calculator**: The system component that calculates project totals and balances
- **Delivery_Form**: The user interface for creating and editing deliveries
- **Dashboard**: The main interface showing financial summaries and totals

## Requirements

### Requirement 1: Supplier Selection in Delivery Forms

**User Story:** As a user, I want to select suppliers when creating deliveries, so that I can record deliveries from both crushers and suppliers.

#### Acceptance Criteria

1. WHEN a user accesses the delivery creation form, THE Delivery_System SHALL display supplier type selection options (crusher or supplier)
2. WHEN a user selects "supplier" as the supplier type, THE Delivery_System SHALL show a supplier dropdown populated with active suppliers
3. WHEN a user selects "crusher" as the supplier type, THE Delivery_System SHALL show a crusher dropdown populated with active crushers
4. WHEN a user selects a supplier, THE Delivery_System SHALL update the material dropdown to show only materials available from that supplier
5. WHEN a user selects a crusher, THE Delivery_System SHALL show the standard material options (رمل, سن 1, سن 2, سن 3, سن 6 بودرة)

### Requirement 2: Automatic Supplier Cost Calculation

**User Story:** As a user, I want supplier costs to be calculated automatically, so that delivery costs are accurate and consistent.

#### Acceptance Criteria

1. WHEN a user selects a supplier and material, THE Delivery_System SHALL display the current material price from the supplier
2. WHEN a delivery is created with a supplier, THE Delivery_System SHALL calculate supplier_total_cost as net_quantity multiplied by material_price_at_time
3. WHEN a delivery is created with a supplier, THE Delivery_System SHALL set crusher_total_cost to zero
4. WHEN a delivery is created with a crusher, THE Delivery_System SHALL calculate crusher_total_cost and set supplier_total_cost to zero
5. WHEN a delivery is saved, THE Delivery_System SHALL preserve the material_price_at_time for historical accuracy

### Requirement 3: Delivery Service Integration

**User Story:** As a system administrator, I want the delivery service to handle supplier deliveries, so that all delivery operations work consistently.

#### Acceptance Criteria

1. WHEN creating a delivery, THE Delivery_System SHALL accept supplier_id as an optional parameter
2. WHEN retrieving deliveries, THE Delivery_System SHALL populate supplier information alongside existing crusher and contractor information
3. WHEN updating deliveries, THE Delivery_System SHALL preserve historical material pricing regardless of current supplier prices
4. WHEN filtering deliveries, THE Delivery_System SHALL support filtering by supplier_id
5. WHEN displaying delivery lists, THE Delivery_System SHALL show supplier names for supplier-based deliveries

### Requirement 4: Financial Calculation Updates

**User Story:** As a project manager, I want supplier costs included in project financial calculations, so that project profitability is accurately tracked.

#### Acceptance Criteria

1. WHEN calculating project totals, THE Financial_Calculator SHALL include supplier costs as project expenses
2. WHEN calculating project expenses, THE Financial_Calculator SHALL sum both crusher_total_cost and supplier_total_cost from all deliveries
3. WHEN displaying project financial summaries, THE Financial_Calculator SHALL show supplier costs as a separate line item
4. WHEN calculating net project balance, THE Financial_Calculator SHALL subtract supplier costs from total sales
5. WHEN a project has both crusher and supplier deliveries, THE Financial_Calculator SHALL calculate combined material costs accurately

### Requirement 5: Supplier Balance Calculations

**User Story:** As an accountant, I want accurate supplier balance calculations, so that I can track what we owe to suppliers.

#### Acceptance Criteria

1. WHEN calculating supplier balances, THE Delivery_System SHALL sum supplier_total_cost from all deliveries for that supplier
2. WHEN displaying supplier details, THE Delivery_System SHALL show total amount due based on deliveries
3. WHEN payments are made to suppliers, THE Delivery_System SHALL update balance calculations accordingly
4. WHEN displaying supplier lists, THE Delivery_System SHALL show current balance status for each supplier
5. WHEN a supplier has both deliveries and payments, THE Delivery_System SHALL calculate net balance correctly

### Requirement 6: Dashboard Integration

**User Story:** As a business owner, I want the dashboard to reflect supplier costs, so that I have accurate financial visibility.

#### Acceptance Criteria

1. WHEN displaying dashboard totals, THE Dashboard SHALL include supplier costs in total expenses
2. WHEN calculating overall profitability, THE Dashboard SHALL account for both crusher and supplier costs
3. WHEN showing recent activity, THE Dashboard SHALL display supplier deliveries alongside crusher deliveries
4. WHEN displaying financial summaries, THE Dashboard SHALL show supplier-related expenses as identifiable line items
5. WHEN calculating cash flow, THE Dashboard SHALL include supplier payables in the calculations

### Requirement 7: Supplier Details Page Enhancement

**User Story:** As a user, I want to see delivery information on supplier detail pages, so that I can track supplier activity and costs.

#### Acceptance Criteria

1. WHEN viewing a supplier details page, THE Delivery_System SHALL display all deliveries from that supplier
2. WHEN displaying supplier deliveries, THE Delivery_System SHALL show delivery date, client, material, quantity, and cost
3. WHEN calculating supplier totals, THE Delivery_System SHALL show total deliveries value and current balance
4. WHEN displaying delivery history, THE Delivery_System SHALL sort deliveries by date with most recent first
5. WHEN a supplier has no deliveries, THE Delivery_System SHALL display an appropriate message

### Requirement 8: Form Validation and Error Handling

**User Story:** As a user, I want proper validation when creating supplier deliveries, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN creating a supplier delivery, THE Delivery_System SHALL validate that the selected material is available from the chosen supplier
2. WHEN a supplier has no materials defined, THE Delivery_System SHALL prevent delivery creation and show an appropriate error message
3. WHEN material pricing is missing, THE Delivery_System SHALL prevent delivery creation and prompt for price updates
4. WHEN switching between supplier types, THE Delivery_System SHALL clear previous selections and update available options
5. WHEN form validation fails, THE Delivery_System SHALL display specific error messages to guide user correction

### Requirement 9: Data Migration and Compatibility

**User Story:** As a system administrator, I want existing crusher deliveries to remain functional, so that historical data is preserved.

#### Acceptance Criteria

1. WHEN displaying existing deliveries, THE Delivery_System SHALL continue to show crusher-based deliveries correctly
2. WHEN calculating historical project totals, THE Financial_Calculator SHALL use existing crusher_total_cost values
3. WHEN editing existing deliveries, THE Delivery_System SHALL preserve the original supplier type (crusher or supplier)
4. WHEN migrating data, THE Delivery_System SHALL ensure all existing deliveries have proper supplier type identification
5. WHEN displaying mixed delivery lists, THE Delivery_System SHALL clearly distinguish between crusher and supplier deliveries

### Requirement 10: API Endpoint Updates

**User Story:** As a developer, I want API endpoints to support supplier deliveries, so that all system integrations work correctly.

#### Acceptance Criteria

1. WHEN creating deliveries via API, THE Delivery_System SHALL accept supplier_id parameter and validate it against active suppliers
2. WHEN retrieving deliveries via API, THE Delivery_System SHALL include supplier information in the response
3. WHEN filtering deliveries via API, THE Delivery_System SHALL support supplier_id as a filter parameter
4. WHEN updating deliveries via API, THE Delivery_System SHALL handle supplier changes while preserving historical pricing
5. WHEN API responses include deliveries, THE Delivery_System SHALL populate supplier names and details consistently