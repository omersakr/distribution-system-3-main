# إضافة ميزة الرصيد الافتتاحي للكسارات والموردين
# Adding Opening Balance Feature for Crushers and Suppliers

## نظرة عامة / Overview

تم إضافة ميزة الرصيد الافتتاحي (Opening Balance) للكسارات والموردين، بنفس الطريقة الموجودة في المقاولين. هذه الميزة تسمح بتسجيل رصيد افتتاحي لكل كسارة أو مورد عند بداية استخدام النظام أو عند إضافة كسارة/مورد جديد لديه رصيد سابق.

The opening balance feature has been added for Crushers and Suppliers, similar to what exists for Contractors. This feature allows recording an opening balance for each crusher or supplier when starting to use the system or when adding a new crusher/supplier with a previous balance.

## التغييرات المطبقة / Changes Applied

### 1. تحديث نماذج البيانات / Database Models Update

#### Crusher Model (`backend/models/Crusher.js`)
```javascript
opening_balance: {
    type: Number,
    default: 0,
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
}
```

#### Supplier Model (`backend/models/Supplier.js`)
```javascript
opening_balance: {
    type: Number,
    default: 0,
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
}
```

### 2. تحديث خدمة الكسارات / Crusher Service Update

#### `backend/services/crusherService.js`

**createCrusher:**
- إضافة `opening_balance` عند إنشاء كسارة جديدة
- Added `opening_balance` when creating a new crusher

**updateCrusher:**
- إضافة إمكانية تحديث `opening_balance`
- Added ability to update `opening_balance`

**computeCrusherTotals:**
- تحديث حساب الرصيد ليشمل الرصيد الافتتاحي
- Updated balance calculation to include opening balance
```javascript
const opening = crusher ? toNumber(crusher.opening_balance) : 0;
const totalNeeded = opening + totalRequired + totalAdjustments;
const net = totalNeeded - totalPaid;
```

**getAllCrushers:**
- إضافة `opening_balance` في البيانات المُرجعة
- Added `opening_balance` to returned data

**getCrusherById:**
- إضافة `opening_balance` في بيانات الكسارة
- Added `opening_balance` to crusher data

### 3. تحديث خدمة الموردين / Supplier Service Update

#### `backend/services/supplierService.js`

**getAllSuppliers:**
- تحديث حساب الرصيد ليشمل الرصيد الافتتاحي والتسويات
- Updated balance calculation to include opening balance and adjustments
```javascript
const openingBalance = toNumber(supplier.opening_balance);
const balance = openingBalance + totalDue + totalAdjustments - totalPaid;
```

**getSupplierById:**
- إضافة `opening_balance` في بيانات المورد
- تحديث حساب الرصيد ليشمل الرصيد الافتتاحي
- Added `opening_balance` to supplier data
- Updated balance calculation to include opening balance

**generateAccountStatement:**
- إضافة `openingBalance` في الملخص
- تحديث حساب الرصيد النهائي ليشمل الرصيد الافتتاحي
- Added `openingBalance` to summary
- Updated final balance calculation to include opening balance

### 4. تحديث تقرير كشف حساب المورد / Supplier Account Statement Report Update

#### `backend/controllers/supplierController.js`

تم إضافة عرض الرصيد الافتتاحي في بطاقة الملخص:
```html
<div class="summary-item">
    <div class="summary-value">${formatCurrency(data.summary.openingBalance || 0)}</div>
    <div class="summary-label">الرصيد الافتتاحي</div>
</div>
```

## كيفية عمل الرصيد الافتتاحي / How Opening Balance Works

### للكسارات / For Crushers:
```
الرصيد النهائي = الرصيد الافتتاحي + إجمالي المستحق + التسويات - المدفوعات
Final Balance = Opening Balance + Total Required + Adjustments - Payments
```

### للموردين / For Suppliers:
```
الرصيد النهائي = الرصيد الافتتاحي + إجمالي المستحق + التسويات - المدفوعات
Final Balance = Opening Balance + Total Due + Adjustments - Payments
```

## الاستخدام / Usage

### إضافة كسارة جديدة مع رصيد افتتاحي / Add New Crusher with Opening Balance
```javascript
POST /api/crushers
{
  "name": "كسارة الأمل",
  "opening_balance": 5000,  // رصيد افتتاحي موجب = نحن مدينون لهم
  "sand_price": 100,
  "aggregate1_price": 120,
  ...
}
```

### إضافة مورد جديد مع رصيد افتتاحي / Add New Supplier with Opening Balance
```javascript
POST /api/suppliers
{
  "name": "مورد الخير",
  "opening_balance": 3000,  // رصيد افتتاحي موجب = نحن مدينون لهم
  "phone_number": "0123456789",
  "materials": [...]
}
```

### تحديث الرصيد الافتتاحي / Update Opening Balance
```javascript
PUT /api/crushers/:id
{
  "opening_balance": 7500
}

PUT /api/suppliers/:id
{
  "opening_balance": 4500
}
```

## معنى القيم / Value Meanings

- **رصيد موجب (+)**: نحن مدينون للكسارة/المورد (We owe them)
- **رصيد سالب (-)**: الكسارة/المورد مدين لنا (They owe us)
- **رصيد صفر (0)**: لا يوجد رصيد افتتاحي (No opening balance)

## التأثير على التقارير / Impact on Reports

### كشف حساب المورد / Supplier Account Statement
الآن يعرض:
1. الرصيد الافتتاحي
2. إجمالي المستحق
3. المدفوعات
4. التسويات
5. الرصيد الصافي (يشمل كل ما سبق)

Now displays:
1. Opening Balance
2. Total Due
3. Payments
4. Adjustments
5. Net Balance (includes all above)

### صفحة تفاصيل الكسارة / Crusher Details Page
- الرصيد المعروض يشمل الرصيد الافتتاحي
- Displayed balance includes opening balance

### صفحة تفاصيل المورد / Supplier Details Page
- الرصيد المعروض يشمل الرصيد الافتتاحي
- Displayed balance includes opening balance

## التوافق مع الإصدارات السابقة / Backward Compatibility

✅ **متوافق تمامًا** - الكسارات والموردين الموجودين سيكون لديهم `opening_balance = 0` افتراضيًا
✅ **Fully Compatible** - Existing crushers and suppliers will have `opening_balance = 0` by default

## الملفات المعدلة / Modified Files

1. `backend/models/Crusher.js` - إضافة حقل opening_balance
2. `backend/models/Supplier.js` - إضافة حقل opening_balance
3. `backend/services/crusherService.js` - تحديث جميع الدوال لدعم opening_balance
4. `backend/services/supplierService.js` - تحديث جميع الدوال لدعم opening_balance
5. `backend/controllers/supplierController.js` - تحديث تقرير كشف الحساب

## الاختبار / Testing

للتأكد من عمل الميزة:

1. **إنشاء كسارة جديدة:**
   - أضف كسارة مع رصيد افتتاحي
   - تحقق من ظهور الرصيد في صفحة التفاصيل
   - تحقق من تأثيره على الرصيد النهائي

2. **إنشاء مورد جديد:**
   - أضف مورد مع رصيد افتتاحي
   - تحقق من ظهور الرصيد في صفحة التفاصيل
   - تحقق من تأثيره على الرصيد النهائي

3. **تحديث الرصيد الافتتاحي:**
   - عدّل الرصيد الافتتاحي لكسارة/مورد موجود
   - تحقق من تحديث الرصيد النهائي

4. **كشف الحساب:**
   - أنشئ كشف حساب لمورد
   - تحقق من ظهور الرصيد الافتتاحي في الملخص
   - تحقق من صحة الحسابات

## ملاحظات مهمة / Important Notes

1. الرصيد الافتتاحي يُحسب مرة واحدة في البداية
2. لا يتأثر بالفترات الزمنية في التقارير (يظهر دائمًا)
3. يمكن تعديله في أي وقت من صفحة التفاصيل
4. يُستخدم في حساب الرصيد النهائي لجميع العمليات

1. Opening balance is calculated once at the beginning
2. Not affected by date ranges in reports (always shown)
3. Can be edited anytime from the details page
4. Used in final balance calculation for all operations
