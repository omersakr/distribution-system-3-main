/**
 * Loader Usage Examples
 * أمثلة على استخدام اللودرز في التطبيق
 */

// ============================================
// مثال 1: استخدام اللودر الشامل عند تحميل الصفحة
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    showLoader('جاري تحميل البيانات...');
    
    try {
        // تحميل البيانات
        const data = await fetchData();
        renderData(data);
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorMessage('فشل في تحميل البيانات');
    } finally {
        hideLoader();
    }
});

// ============================================
// مثال 2: استخدام اللودر الداخلي للجداول
// ============================================
async function loadClientsTable() {
    const container = document.getElementById('clientsTableContainer');
    
    // إظهار لودر داخلي
    showInlineLoader('clientsTableContainer', 'جاري تحميل العملاء...');
    
    try {
        const clients = await apiGet('/clients');
        
        // عرض الجدول (سيستبدل اللودر)
        container.innerHTML = renderClientsTable(clients);
    } catch (error) {
        container.innerHTML = '<div class="error">فشل في تحميل العملاء</div>';
    }
}

// ============================================
// مثال 3: استخدام حالة التحميل للأزرار
// ============================================
async function saveClient() {
    const saveBtn = document.getElementById('saveClientBtn');
    
    // تفعيل حالة التحميل
    setButtonLoading(saveBtn, true);
    
    try {
        const formData = getFormData();
        await apiPost('/clients', formData);
        
        showSuccessMessage('تم حفظ العميل بنجاح');
        closeModal();
        reloadTable();
    } catch (error) {
        showErrorMessage('فشل في حفظ العميل');
    } finally {
        // إلغاء حالة التحميل
        setButtonLoading(saveBtn, false);
    }
}

// ============================================
// مثال 4: استخدام حالة التحميل للجداول
// ============================================
async function refreshTable() {
    const tableId = 'dataTable';
    
    // تفعيل حالة التحميل
    setTableLoading(tableId, true);
    
    try {
        const data = await apiGet('/data');
        updateTableData(data);
    } catch (error) {
        showErrorMessage('فشل في تحديث الجدول');
    } finally {
        // إلغاء حالة التحميل
        setTableLoading(tableId, false);
    }
}

// ============================================
// مثال 5: استخدام Skeleton Loaders
// ============================================
function showSkeletonLoading() {
    const container = document.getElementById('contentContainer');
    
    // إنشاء skeleton loaders
    container.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        ${createSkeletonLoader('text', 5)}
        <div class="skeleton skeleton-card"></div>
    `;
    
    // تحميل البيانات الفعلية
    loadActualData().then(data => {
        container.innerHTML = renderContent(data);
    });
}

// ============================================
// مثال 6: استخدام Loading Dots
// ============================================
function showLoadingDots() {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `جاري المعالجة ${createLoadingDots()}`;
}

// ============================================
// مثال 7: لودر مخصص مع رسالة ديناميكية
// ============================================
async function processMultipleItems(items) {
    showLoader('جاري المعالجة...');
    
    for (let i = 0; i < items.length; i++) {
        // تحديث رسالة اللودر
        const loaderText = document.querySelector('#globalLoader .loader-text');
        if (loaderText) {
            loaderText.textContent = `جاري معالجة العنصر ${i + 1} من ${items.length}`;
        }
        
        await processItem(items[i]);
    }
    
    hideLoader();
    showSuccessMessage('تمت المعالجة بنجاح');
}

// ============================================
// مثال 8: لودر للعمليات الطويلة مع Progress
// ============================================
async function longRunningOperation() {
    const progressContainer = document.getElementById('progressContainer');
    
    progressContainer.innerHTML = `
        <div class="inline-loader">
            <div class="loader"></div>
            <div class="loader-text">جاري التنفيذ... <span id="progress">0%</span></div>
        </div>
    `;
    
    for (let i = 0; i <= 100; i += 10) {
        await delay(500);
        document.getElementById('progress').textContent = `${i}%`;
    }
    
    progressContainer.innerHTML = '<div class="success">تم الإنجاز بنجاح!</div>';
}

// ============================================
// مثال 9: لودر مع Timeout
// ============================================
async function loadWithTimeout(url, timeout = 10000) {
    showLoader('جاري التحميل...');
    
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('انتهت مهلة الطلب')), timeout)
        );
        
        const dataPromise = apiGet(url);
        
        const data = await Promise.race([dataPromise, timeoutPromise]);
        return data;
    } catch (error) {
        if (error.message === 'انتهت مهلة الطلب') {
            showErrorMessage('انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.');
        } else {
            showErrorMessage('فشل في تحميل البيانات');
        }
    } finally {
        hideLoader();
    }
}

// ============================================
// مثال 10: لودر متعدد (Multiple Loaders)
// ============================================
async function loadMultipleSections() {
    // إظهار لودرز لعدة أقسام في نفس الوقت
    showInlineLoader('section1', 'جاري تحميل القسم الأول...');
    showInlineLoader('section2', 'جاري تحميل القسم الثاني...');
    showInlineLoader('section3', 'جاري تحميل القسم الثالث...');
    
    // تحميل البيانات بشكل متوازي
    const [data1, data2, data3] = await Promise.all([
        apiGet('/section1'),
        apiGet('/section2'),
        apiGet('/section3')
    ]);
    
    // عرض البيانات (سيستبدل اللودرز)
    document.getElementById('section1').innerHTML = renderSection1(data1);
    document.getElementById('section2').innerHTML = renderSection2(data2);
    document.getElementById('section3').innerHTML = renderSection3(data3);
}

// ============================================
// Helper Functions
// ============================================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getFormData() {
    // استخراج بيانات النموذج
    return {};
}

function renderClientsTable(clients) {
    // عرض جدول العملاء
    return '<table>...</table>';
}

function updateTableData(data) {
    // تحديث بيانات الجدول
}

function renderContent(data) {
    // عرض المحتوى
    return '<div>...</div>';
}

function processItem(item) {
    // معالجة عنصر
    return Promise.resolve();
}

function renderSection1(data) {
    return '<div>Section 1</div>';
}

function renderSection2(data) {
    return '<div>Section 2</div>';
}

function renderSection3(data) {
    return '<div>Section 3</div>';
}

// ============================================
// تصدير الأمثلة للاستخدام
// ============================================
window.loaderExamples = {
    loadClientsTable,
    saveClient,
    refreshTable,
    showSkeletonLoading,
    showLoadingDots,
    processMultipleItems,
    longRunningOperation,
    loadWithTimeout,
    loadMultipleSections
};
