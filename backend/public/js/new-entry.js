const API_BASE = (function () {
    if (window.__API_BASE__) return window.__API_BASE__;
    try {
        const origin = window.location.origin;
        if (!origin || origin === 'null') return 'http://localhost:5000/api';
        return origin.replace(/\/$/, '') + '/api';
    } catch (e) {
        return 'http://localhost:5000/api';
    }
})();

// Store crusher and supplier data for price lookup
let crushersData = [];
let suppliersData = [];

async function populateSelect(id, data, placeholder) {
    const select = document.getElementById(id);
    select.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = placeholder;
    select.appendChild(defaultOpt);

    if (!data || !Array.isArray(data)) {
        console.error('Invalid data for populateSelect:', data);
        return;
    }

    data.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name;
        select.appendChild(opt);
    });
}

async function loadDropdowns() {
    try {
        const [clients, crushers, contractors, suppliers] = await Promise.all([
            authManager.makeAuthenticatedRequest(`${API_BASE}/clients`, { cache: 'no-cache' }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            }),
            authManager.makeAuthenticatedRequest(`${API_BASE}/crushers`, { cache: 'no-cache' }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            }),
            authManager.makeAuthenticatedRequest(`${API_BASE}/contractors`, { cache: 'no-cache' }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            }),
            authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers`, { cache: 'no-cache' }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
        ]);

        // Extract arrays from API responses (handle both old and new formats)
        const clientsArray = clients.clients || clients.data || clients;
        const crushersArray = crushers.crushers || crushers.data || crushers;
        const contractorsArray = contractors.contractors || contractors.data || contractors;
        const suppliersArray = suppliers.suppliers || suppliers.data || suppliers;

        // Store data for price lookup
        crushersData = crushersArray;
        suppliersData = suppliersArray;

        populateSelect('client', clientsArray, 'اختر العميل');
        populateSelect('crusher', crushersArray, 'اختر الكسارة');
        populateSelect('supplier', suppliersArray, 'اختر المورد');
        populateSelect('wheelContractor', contractorsArray, 'اختر المقاول');
    } catch (err) {
        console.error(err);
        const errorDiv = document.getElementById('formError');
        errorDiv.textContent = 'تعذر تحميل البيانات الأساسية';
        errorDiv.style.display = 'block';
    }
}

// Get crusher price by material
function getCrusherPriceByMaterial(crusherId, material) {
    const crusher = crushersData.find(c => c.id === crusherId);
    if (!crusher) return 0;

    const materialMap = {
        'رمل': 'sand_price',
        'سن 1': 'aggregate1_price',
        'سن 2': 'aggregate2_price',
        'سن 3': 'aggregate3_price',
        'سن 6 بودرة': 'aggregate6_powder_price'
    };

    return crusher[materialMap[material]] || 0;
}

// Get supplier price by material
function getSupplierPriceByMaterial(supplierId, material) {
    const supplier = suppliersData.find(s => s.id === supplierId);
    if (!supplier || !supplier.materials) return 0;

    const supplierMaterial = supplier.materials.find(m => m.name === material);
    return supplierMaterial ? supplierMaterial.price_per_unit : 0;
}

// Update supplier materials dropdown based on selected supplier
function updateSupplierMaterials() {
    const supplierId = document.getElementById('supplier').value;
    const materialSelect = document.getElementById('material');

    // Clear current options
    materialSelect.innerHTML = '<option value="">اختر النوع</option>';

    if (supplierId) {
        const supplier = suppliersData.find(s => s.id === supplierId);
        if (supplier && supplier.materials) {
            supplier.materials.forEach(material => {
                const opt = document.createElement('option');
                opt.value = material.name;
                opt.textContent = material.name;
                materialSelect.appendChild(opt);
            });
        }
    }
}

// Update crusher materials dropdown (default materials)
function updateCrusherMaterials() {
    const materialSelect = document.getElementById('material');
    materialSelect.innerHTML = `
        <option value="">اختر النوع</option>
        <option value="رمل">رمل</option>
        <option value="سن 1">سن 1</option>
        <option value="سن 2">سن 2</option>
        <option value="سن 3">سن 3</option>
        <option value="سن 6 بودرة">سن 6 بودرة</option>
    `;
}

function updateCrusherPrice() {
    const supplierType = document.querySelector('input[name="supplierType"]:checked').value;
    const crusherPriceDisplay = document.getElementById('crusherPriceDisplay');
    const crusherPriceValue = document.getElementById('crusherPriceValue');
    const material = document.getElementById('material').value;

    let price = 0;
    let priceSource = '';

    if (supplierType === 'crusher') {
        const crusherId = document.getElementById('crusher').value;
        if (crusherId && material) {
            price = getCrusherPriceByMaterial(crusherId, material);
            priceSource = 'الكسارة';
        }
    } else if (supplierType === 'supplier') {
        const supplierId = document.getElementById('supplier').value;
        if (supplierId && material) {
            price = getSupplierPriceByMaterial(supplierId, material);
            priceSource = 'المورد';
        }
    }

    if (price > 0) {
        // Store the price for use in form submission
        if (supplierType === 'crusher') {
            document.getElementById('crusher').dataset.currentPrice = price;
        } else {
            document.getElementById('supplier').dataset.currentPrice = price;
        }

        // Show the price to the user
        crusherPriceValue.textContent = `${price.toLocaleString('ar-EG')} جنيه`;
        crusherPriceValue.style.color = '#1e4d72';
        crusherPriceDisplay.style.display = 'block';
        crusherPriceDisplay.querySelector('label').textContent = `سعر ${priceSource} للمادة المختارة:`;
    } else if (material && (document.getElementById('crusher').value || document.getElementById('supplier').value)) {
        crusherPriceValue.textContent = `غير محدد - يرجى تحديث أسعار ${priceSource}`;
        crusherPriceValue.style.color = '#d32f2f';
        crusherPriceDisplay.style.display = 'block';
        crusherPriceDisplay.querySelector('label').textContent = `سعر ${priceSource} للمادة المختارة:`;
    } else {
        crusherPriceDisplay.style.display = 'none';
    }
}

function setupEventListeners() {
    // Supplier type toggle
    const supplierTypeCrusher = document.getElementById('supplierTypeCrusher');
    const supplierTypeSupplier = document.getElementById('supplierTypeSupplier');
    const crusherGroup = document.getElementById('crusherGroup');
    const supplierGroup = document.getElementById('supplierGroup');
    const crusherSelect = document.getElementById('crusher');
    const supplierSelect = document.getElementById('supplier');

    supplierTypeCrusher.addEventListener('change', () => {
        if (supplierTypeCrusher.checked) {
            // Show/hide groups
            crusherGroup.style.display = '';
            supplierGroup.style.display = 'none';

            // Update requirements
            crusherSelect.required = true;
            supplierSelect.required = false;
            supplierSelect.value = '';

            // For crusher: contractor is required
            document.getElementById('wheelContractor').required = true;
            document.querySelector('label[for="wheelContractor"]').innerHTML = '<span class="required">*</span>مقاول النقل';

            // Show car-related fields, contractor fields, and discount fields for crusher deliveries
            showCarFields(true);
            showContractorFields(true);
            showDiscountFields(true);
            updateUnitLabels(true); // Update to cubic meters

            updateCrusherMaterials();
            updateCrusherPrice();
        }
    });

    supplierTypeSupplier.addEventListener('change', () => {
        if (supplierTypeSupplier.checked) {
            // Show/hide groups
            crusherGroup.style.display = 'none';
            supplierGroup.style.display = '';

            // Update requirements
            crusherSelect.required = false;
            supplierSelect.required = true;
            crusherSelect.value = '';

            // For supplier: no contractor needed
            document.getElementById('wheelContractor').required = false;

            // Hide car-related fields, contractor fields, and discount fields for supplier deliveries
            showCarFields(false);
            showContractorFields(false);
            showDiscountFields(false);
            updateUnitLabels(false); // Update to units

            updateSupplierMaterials();
            updateCrusherPrice();
        }
    });

    // Discount fields toggle
    const discountYes = document.getElementById('discountYes');
    const discountNo = document.getElementById('discountNo');
    const deductAmountField = document.getElementById('deductAmountField');

    discountYes.addEventListener('change', () => {
        if (discountYes.checked) {
            deductAmountField.style.display = '';
            document.getElementById('deductAmount').required = true;
        }
    });

    discountNo.addEventListener('change', () => {
        if (discountNo.checked) {
            deductAmountField.style.display = 'none';
            const d = document.getElementById('deductAmount');
            d.required = false;
            d.value = "";
        }
    });

    // Add event listeners for price updates
    document.getElementById('crusher').addEventListener('change', updateCrusherPrice);
    document.getElementById('supplier').addEventListener('change', () => {
        updateSupplierMaterials();
        updateCrusherPrice();
    });
    document.getElementById('material').addEventListener('change', updateCrusherPrice);

    // Form submission
    document.getElementById('newEntryForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        let valid = true;
        let err = "";

        const supplierType = document.querySelector('input[name="supplierType"]:checked').value;

        const requiredFields = [
            { id: 'client', msg: 'يرجى اختيار العميل' },
            { id: 'material', msg: 'يرجى اختيار نوع المادة' },
            { id: 'voucher', msg: 'يرجى إدخال رقم البون' },
            { id: 'quantity', msg: 'يرجى إدخال كمية الحمولة', type: 'number' },
            { id: 'price', msg: 'يرجى إدخال السعر', type: 'number' }
        ];

        // Add car-related fields only for crusher deliveries
        if (supplierType === 'crusher') {
            requiredFields.push(
                { id: 'wheelContractor', msg: 'يرجى اختيار مقاول النقل' },
                { id: 'driver', msg: 'يرجى إدخال اسم السائق' },
                { id: 'carHead', msg: 'يرجى إدخال رقم الرأس' },
                { id: 'carTail', msg: 'يرجى إدخال رقم المقطورة' },
                { id: 'carVolume', msg: 'يرجى إدخال تكعيب السيارة', type: 'number' }
            );
        }

        // Add supplier-specific required field
        if (supplierType === 'crusher') {
            requiredFields.push({ id: 'crusher', msg: 'يرجى اختيار الكسارة' });
        } else {
            requiredFields.push({ id: 'supplier', msg: 'يرجى اختيار المورد' });
        }

        // Discount is only for crushers
        if (supplierType === 'crusher' && discountYes.checked) {
            requiredFields.push({ id: 'deductAmount', msg: 'يرجى تحديد قيمة الخصم', type: 'number' });
        }

        for (const f of requiredFields) {
            const el = document.getElementById(f.id);
            if (!el || !el.value || (el.value.trim && !el.value.trim())) {
                valid = false;
                err = f.msg;
                break;
            }
            if (f.type === 'number' && (isNaN(parseFloat(el.value)) || parseFloat(el.value) <= 0)) {
                valid = false;
                err = f.msg;
                break;
            }
        }

        // Get material price based on supplier type
        let materialPrice = 0;
        const material = document.getElementById('material').value;

        if (supplierType === 'crusher') {
            const crusherId = document.getElementById('crusher').value;
            materialPrice = getCrusherPriceByMaterial(crusherId, material);
        } else {
            const supplierId = document.getElementById('supplier').value;
            materialPrice = getSupplierPriceByMaterial(supplierId, material);
        }

        // Validate that material price is available
        if (!materialPrice || materialPrice <= 0) {
            valid = false;
            err = `سعر المادة غير محدد في ${supplierType === 'crusher' ? 'الكسارة' : 'المورد'} المختار. يرجى تحديث الأسعار أولاً.`;
        }

        const errorDiv = document.getElementById('formError');
        if (!valid) {
            errorDiv.textContent = err;
            errorDiv.style.display = "block";
            return false;
        }
        errorDiv.style.display = "none";

        const payload = {
            client_id: document.getElementById('client').value,
            crusher_id: supplierType === 'crusher' ? document.getElementById('crusher').value : null,
            supplier_id: supplierType === 'supplier' ? document.getElementById('supplier').value : null,
            contractor_id: supplierType === 'crusher' ? document.getElementById('wheelContractor').value : null, // Only for crushers
            material: material,
            voucher: document.getElementById('voucher').value,
            quantity: parseFloat(document.getElementById('quantity').value),
            discount_volume: (supplierType === 'crusher' && discountYes.checked) ? (parseFloat(document.getElementById('deductAmount').value) || 0) : 0, // Only for crushers
            price_per_meter: parseFloat(document.getElementById('price').value),
            material_price_at_time: materialPrice, // Use actual price for historical preservation
            driver_name: supplierType === 'crusher' ? document.getElementById('driver').value : null,
            car_head: supplierType === 'crusher' ? document.getElementById('carHead').value : null,
            car_tail: supplierType === 'crusher' ? document.getElementById('carTail').value : null,
            car_volume: supplierType === 'crusher' ? (parseFloat(document.getElementById('carVolume').value) || null) : parseFloat(document.getElementById('quantity').value), // Use quantity as volume for suppliers
            contractor_charge_per_meter: supplierType === 'crusher' ? (parseFloat(document.getElementById('contractorCharge').value) || 0) : 0 // Only for crushers
        };

        try {
            const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/deliveries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const msg = await resp.text();
                throw new Error(msg || 'فشل الحفظ');
            }

            await Swal.fire({
                icon: 'success',
                title: 'تم الحفظ',
                text: 'تم حفظ التسليم بنجاح',
                confirmButtonText: 'حسناً'
            });

            // Reset form but preserve dropdown selections
            const preservedValues = {
                client: document.getElementById('client').value,
                crusher: document.getElementById('crusher').value,
                supplier: document.getElementById('supplier').value,
                wheelContractor: supplierType === 'crusher' ? document.getElementById('wheelContractor').value : '', // Only preserve for crushers
                supplierType: document.querySelector('input[name="supplierType"]:checked').value
            };

            this.reset();

            // Restore preserved values
            document.getElementById('client').value = preservedValues.client;

            // Restore supplier type and show/hide fields accordingly
            if (preservedValues.supplierType === 'crusher') {
                document.getElementById('supplierTypeCrusher').checked = true;
                document.getElementById('crusher').value = preservedValues.crusher;
                document.getElementById('wheelContractor').value = preservedValues.wheelContractor;
                crusherGroup.style.display = '';
                supplierGroup.style.display = 'none';
                showCarFields(true);
                showContractorFields(true);
                showDiscountFields(true);
                updateUnitLabels(true); // Cubic meters for crushers
                updateCrusherMaterials();
            } else {
                document.getElementById('supplierTypeSupplier').checked = true;
                document.getElementById('supplier').value = preservedValues.supplier;
                crusherGroup.style.display = 'none';
                supplierGroup.style.display = '';
                showCarFields(false);
                showContractorFields(false);
                showDiscountFields(false);
                updateUnitLabels(false); // Units for suppliers
                updateSupplierMaterials();
            }

            // Hide discount field and reset price display
            deductAmountField.style.display = 'none';
            document.getElementById('deductAmount').required = false;
            updateCrusherPrice(); // Update price display after form reset

        } catch (errResp) {
            console.error(errResp);
            errorDiv.textContent = 'تعذر حفظ التسليم';
            errorDiv.style.display = "block";
        }

        return false;
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadDropdowns();
    });
}

// Show/hide car-related fields based on supplier type
function showCarFields(show) {
    const carOnlyFields = [
        'driver',
        'carHead',
        'carTail',
        'carVolume'
    ];

    const carOnlyFieldContainers = [
        document.querySelector('.flex-row'), // Contains driver, carHead, carTail
        document.querySelector('label[for="carVolume"]').parentElement
    ];

    // Show/hide car-only field containers
    carOnlyFieldContainers.forEach(container => {
        if (container) {
            container.style.display = show ? '' : 'none';
        }
    });

    // Update field requirements for car-only fields
    carOnlyFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.required = show;
            if (!show) {
                field.value = ''; // Clear values when hiding
            }
        }
    });
}

// Show/hide contractor-related fields
function showContractorFields(show) {
    const contractorGroup = document.getElementById('contractorGroup');
    const contractorChargeGroup = document.getElementById('contractorChargeGroup');
    const wheelContractor = document.getElementById('wheelContractor');
    const contractorCharge = document.getElementById('contractorCharge');

    if (contractorGroup) {
        contractorGroup.style.display = show ? '' : 'none';
    }

    if (contractorChargeGroup) {
        contractorChargeGroup.style.display = show ? '' : 'none';
    }

    if (wheelContractor) {
        wheelContractor.required = show;
        if (!show) {
            wheelContractor.value = '';
        }
    }

    if (contractorCharge) {
        if (!show) {
            contractorCharge.value = '';
        }
    }
}

// Show/hide discount fields
function showDiscountFields(show) {
    const discountGroup = document.getElementById('discountGroup');
    const deductAmountField = document.getElementById('deductAmountField');
    const discountNo = document.getElementById('discountNo');
    const deductAmount = document.getElementById('deductAmount');

    if (discountGroup) {
        discountGroup.style.display = show ? '' : 'none';
    }

    if (!show) {
        // Reset discount fields when hiding
        if (discountNo) {
            discountNo.checked = true;
        }
        if (deductAmountField) {
            deductAmountField.style.display = 'none';
        }
        if (deductAmount) {
            deductAmount.value = '';
            deductAmount.required = false;
        }
    }
}

// Update unit labels based on supplier type
function updateUnitLabels(isCrusher) {
    const quantityLabel = document.getElementById('quantityLabel');
    const priceLabel = document.getElementById('priceLabel');

    if (isCrusher) {
        // For crushers: use cubic meters (م³)
        quantityLabel.innerHTML = '<span class="required">*</span>كمية الحمولة (م³)';
        priceLabel.innerHTML = '<span class="required">*</span>السعر لكل م³ (للعميل)';
    } else {
        // For suppliers: use units (وحدة)
        quantityLabel.innerHTML = '<span class="required">*</span>كمية الحمولة (وحدة)';
        priceLabel.innerHTML = '<span class="required">*</span>السعر لكل وحدة (للعميل)';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!authManager.checkAuth()) {
        return;
    }

    setupEventListeners();
    loadDropdowns();

    // Initialize form state based on default supplier type (crusher is checked by default)
    const supplierType = document.querySelector('input[name="supplierType"]:checked').value;
    if (supplierType === 'crusher') {
        showCarFields(true);
        showContractorFields(true);
        showDiscountFields(true);
        updateUnitLabels(true); // Cubic meters for crushers
    } else {
        showCarFields(false);
        showContractorFields(false);
        showDiscountFields(false);
        updateUnitLabels(false); // Units for suppliers
    }

    // Auto refresh dropdowns every 30 seconds
    setInterval(() => {
        loadDropdowns();
    }, 30000);
});