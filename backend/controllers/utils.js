const toNumber = (v) => Number(v || 0);

function formatCurrency(n) {
    if (n == null) return null;
    return n.toLocaleString('ar-EG') + ' ج.م';
}

module.exports = { toNumber, formatCurrency };
