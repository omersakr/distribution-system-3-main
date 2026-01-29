class ApiFeatures {
    constructor(queryBuilder, queryParams = {}) {
        this._qb = queryBuilder;
        this.query = queryParams;
        this.pagination = null;
    }

    search(fields = []) {
        const q = this.query.q || this.query.search;
        if (q && fields && fields.length) {
            this._qb.where(function () {
                fields.forEach((field, idx) => {
                    if (idx === 0) this.where(field, 'like', `%${q}%`);
                    else this.orWhere(field, 'like', `%${q}%`);
                });
            });
        }
        return this;
    }

    // allowedFields: array of column names that are safe to filter on
    filter(allowedFields = []) {
        const qp = this.query;
        allowedFields.forEach((f) => {
            if (qp[f] !== undefined && qp[f] !== '') {
                this._qb.where(f, qp[f]);
            }
            const minKey = `min_${f}`;
            const maxKey = `max_${f}`;
            if (qp[minKey] !== undefined && qp[minKey] !== '') this._qb.where(f, '>=', qp[minKey]);
            if (qp[maxKey] !== undefined && qp[maxKey] !== '') this._qb.where(f, '<=', qp[maxKey]);
        });
        return this;
    }

    sort(defaultSort) {
        const sort = this.query.sort || defaultSort;
        if (sort) {
            const fields = sort.split(',');
            fields.forEach((s) => {
                let dir = 'asc';
                let field = s;
                if (s.startsWith('-')) {
                    dir = 'desc';
                    field = s.slice(1);
                }
                this._qb.orderBy(field, dir);
            });
        }
        return this;
    }

    async paginate(defaultLimit = 25) {
        const page = Math.max(1, parseInt(this.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(this.query.limit, 10) || defaultLimit);
        const offset = (page - 1) * limit;

        // Build count query from current qb state (without limit/offset/order/select)
        const countQb = this._qb.clone().clearOrder().clearSelect().count({ count: '*' });
        const countRes = await countQb;
        let total = 0;
        if (Array.isArray(countRes) && countRes.length) {
            const c = countRes[0].count || countRes[0]['count(*)'] || countRes[0]['count'];
            total = typeof c === 'string' ? parseInt(c, 10) : (c || 0);
        }

        this._qb.limit(limit).offset(offset);
        this.pagination = {
            total,
            page,
            limit,
            pages: Math.max(1, Math.ceil((total || 0) / limit))
        };
        return this;
    }

    async get() {
        const data = await this._qb;
        return { data, pagination: this.pagination };
    }
}

module.exports = ApiFeatures;