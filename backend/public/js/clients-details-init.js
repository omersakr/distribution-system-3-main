async function fetchClientDetails() {
    const clientId = getClientIdFromURL();
    if (!clientId) {
        document.body.innerHTML = '<p style="color: red; margin: 20px;">خطأ: لم يتم تحديد العميل</p>';
        return;
    }

    try {
        const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/clients/${clientId}`);
        if (!resp.ok) throw new Error('فشل تحميل بيانات العميل');

        const result = await resp.json();

        // Update page title
        document.getElementById('clientName').textContent = result.client.name;

        // Render financial summary
        const summaryDiv = document.querySelector('.summary-card') || document.createElement('div');
        renderFinancialSummary(summaryDiv, result.totals);

        // Render deliveries
        const deliveriesDiv = document.getElementById('deliveriesTableDiv');
        if (deliveriesDiv) renderDeliveriesTable(deliveriesDiv, result.deliveries);

        // Render payments
        const paymentsDiv = document.getElementById('paymentsTableDiv');
        if (paymentsDiv) renderPaymentsTable(paymentsDiv, result.payments);

        // Render adjustments
        const adjustmentsDiv = document.getElementById('adjustmentsTableDiv');
        if (adjustmentsDiv) {
            if (result.adjustments && result.adjustments.length > 0) {
                renderAdjustmentsTable(adjustmentsDiv, result.adjustments);
            } else {
                adjustmentsDiv.innerHTML = '<p style="text-align: center; color: #999;">لا توجد تسويات</p>';
            }
        }

        // Render material cards - create section for them
        const materialSection = document.createElement('div');
        materialSection.className = 'section';
        materialSection.id = 'materialSection';
        const materialTitle = document.createElement('h3');
        materialTitle.textContent = 'ملخص المواد';
        materialSection.appendChild(materialTitle);

        const materialCardsDiv = document.createElement('div');
        materialCardsDiv.id = 'materialCardsDiv';
        materialSection.appendChild(materialCardsDiv);

        renderMaterialCards(materialCardsDiv, result.materialTotals);

        // Insert material cards after deliveries section
        const deliveriesSection = document.querySelector('.section');
        if (deliveriesSection && deliveriesSection.parentNode) {
            deliveriesSection.parentNode.insertBefore(materialSection, deliveriesSection.nextSibling);
        }
    } catch (err) {
        console.error(err);
        document.body.innerHTML = `<p style="color: red; margin: 20px;">خطأ: ${err.message}</p>`;
    }
}

function renderAdjustmentsTable(container, adjustments) {
    const table = document.createElement('table');
    table.className = 'client-detail-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const fields = [
        { label: 'التاريخ', key: 'created_at' },
        { label: 'القيمة', key: 'amount' },
        { label: 'السبب', key: 'reason' }
    ];
    fields.forEach(f => {
        const th = document.createElement('th');
        th.textContent = f.label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    adjustments.forEach(adj => {
        const tr = document.createElement('tr');
        fields.forEach(f => {
            const td = document.createElement('td');
            if (f.key === 'amount') {
                td.textContent = formatCurrency(adj[f.key]);
                td.style.color = adj[f.key] > 0 ? '#388e3c' : '#c0392b';
                td.style.fontWeight = 'bold';
            } else if (f.key === 'created_at') {
                td.textContent = formatDate(adj[f.key]);
            } else {
                td.textContent = adj[f.key] || '';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}

document.addEventListener('DOMContentLoaded', fetchClientDetails);
