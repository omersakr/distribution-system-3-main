const Client = require('../models/Client');
const Crusher = require('../models/Crusher');
const Contractor = require('../models/Contractor');
const Employee = require('../models/Employee');
const Delivery = require('../models/Delivery');
const Administration = require('../models/Administration');
const Supplier = require('../models/Supplier');
const authService = require('../services/authService');

class RecycleBinController {
  constructor() {
    this.models = {
      'clients': Client,
      'crushers': Crusher,
      'contractors': Contractor,
      'employees': Employee,
      'deliveries': Delivery,
      'administration': Administration,
      'suppliers': Supplier
    };
  }

  async getDeletedItems(req, res) {
    try {
      console.log('RecycleBin: getDeletedItems called');
      console.log('RecycleBin: this.models =', this.models);
      
      const {
        entity_type,
        date_from,
        date_to
      } = req.query;

      const deletedItems = [];

      // Get entity types to search
      const entityTypes = entity_type ? [entity_type] : Object.keys(this.models);
      console.log('RecycleBin: entityTypes =', entityTypes);

      for (const entityType of entityTypes) {
        const Model = this.models[entityType];
        console.log(`RecycleBin: Processing ${entityType}, Model =`, !!Model);
        
        if (!Model) continue;

        // Build filter for soft-deleted items
        const filter = { is_deleted: true };
        
        if (date_from || date_to) {
          filter.deleted_at = {};
          if (date_from) filter.deleted_at.$gte = new Date(date_from);
          if (date_to) filter.deleted_at.$lte = new Date(date_to + 'T23:59:59.999Z');
        }

        // Get deleted items
        const items = await Model.find(filter).sort({ deleted_at: -1 });
        console.log(`RecycleBin: Found ${items.length} deleted items for ${entityType}`);
        
        // Add entity type and format for frontend
        items.forEach(item => {
          deletedItems.push({
            id: item._id,
            entity_type: entityType,
            name: item.name || item.title || item.username,
            description: this.getItemDescription(item, entityType),
            deleted_at: item.deleted_at,
            original_data: item
          });
        });
      }

      // Sort by deletion date (newest first)
      deletedItems.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

      res.json({
        success: true,
        items: deletedItems,
        total: deletedItems.length
      });
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العناصر المحذوفة',
        error: error.message
      });
    }
  }

  async restoreItem(req, res) {
    try {
      const { entityType, id } = req.params;
      const Model = this.models[entityType];

      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'نوع الكيان غير صحيح'
        });
      }

      // Find the deleted item
      const item = await Model.findOne({ _id: id, is_deleted: true });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'العنصر غير موجود أو غير محذوف'
        });
      }

      // Capture old state for audit
      const oldValues = item.toJSON();

      // Restore the item
      item.is_deleted = false;
      item.deleted_at = null;
      await item.save();

      // Log the restoration
      await authService.logAuditEvent(
        req.user.id,
        'restore',
        this.getEntityName(entityType),
        id,
        oldValues,
        { restored: true },
        req
      );

      res.json({
        success: true,
        message: 'تم استعادة العنصر بنجاح',
        item: item
      });
    } catch (error) {
      console.error('Error restoring item:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في استعادة العنصر',
        error: error.message
      });
    }
  }

  async permanentDelete(req, res) {
    try {
      const { entityType, id } = req.params;
      const Model = this.models[entityType];

      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'نوع الكيان غير صحيح'
        });
      }

      // Find the deleted item
      const item = await Model.findOne({ _id: id, is_deleted: true });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'العنصر غير موجود أو غير محذوف'
        });
      }

      // Capture data for audit before deletion
      const itemData = item.toJSON();

      // Permanently delete the item
      await Model.findByIdAndDelete(id);

      // Log the permanent deletion
      await authService.logAuditEvent(
        req.user.id,
        'permanent_delete',
        this.getEntityName(entityType),
        id,
        itemData,
        null,
        req
      );

      res.json({
        success: true,
        message: 'تم الحذف النهائي بنجاح'
      });
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في الحذف النهائي',
        error: error.message
      });
    }
  }

  async bulkRestore(req, res) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: 'قائمة العناصر مطلوبة'
        });
      }

      const results = [];
      const errors = [];

      for (const { entityType, id } of items) {
        try {
          const Model = this.models[entityType];
          if (!Model) {
            errors.push({ entityType, id, error: 'نوع كيان غير صحيح' });
            continue;
          }

          const item = await Model.findOne({ _id: id, is_deleted: true });
          if (!item) {
            errors.push({ entityType, id, error: 'العنصر غير موجود' });
            continue;
          }

          // Restore the item
          const oldValues = item.toJSON();
          item.is_deleted = false;
          item.deleted_at = null;
          await item.save();

          // Log the restoration
          await authService.logAuditEvent(
            req.user.id,
            'restore',
            this.getEntityName(entityType),
            id,
            oldValues,
            { restored: true },
            req
          );

          results.push({ entityType, id, status: 'restored' });
        } catch (error) {
          errors.push({ entityType, id, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `تم استعادة ${results.length} عنصر بنجاح`,
        results: results,
        errors: errors
      });
    } catch (error) {
      console.error('Error bulk restoring items:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في الاستعادة المجمعة',
        error: error.message
      });
    }
  }

  async bulkDelete(req, res) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: 'قائمة العناصر مطلوبة'
        });
      }

      const results = [];
      const errors = [];

      for (const { entityType, id } of items) {
        try {
          const Model = this.models[entityType];
          if (!Model) {
            errors.push({ entityType, id, error: 'نوع كيان غير صحيح' });
            continue;
          }

          const item = await Model.findOne({ _id: id, is_deleted: true });
          if (!item) {
            errors.push({ entityType, id, error: 'العنصر غير موجود' });
            continue;
          }

          // Capture data for audit before deletion
          const itemData = item.toJSON();

          // Permanently delete the item
          await Model.findByIdAndDelete(id);

          // Log the permanent deletion
          await authService.logAuditEvent(
            req.user.id,
            'permanent_delete',
            this.getEntityName(entityType),
            id,
            itemData,
            null,
            req
          );

          results.push({ entityType, id, status: 'deleted' });
        } catch (error) {
          errors.push({ entityType, id, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `تم الحذف النهائي لـ ${results.length} عنصر بنجاح`,
        results: results,
        errors: errors
      });
    } catch (error) {
      console.error('Error bulk deleting items:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في الحذف النهائي المجمع',
        error: error.message
      });
    }
  }

  getItemDescription(item, entityType) {
    switch (entityType) {
      case 'clients':
        return `هاتف: ${item.phone || 'غير محدد'} | الرصيد: ${item.opening_balance || 0}`;
      case 'crushers':
        return `المواد: ${item.materials?.length || 0} نوع`;
      case 'contractors':
        return `هاتف: ${item.phone || 'غير محدد'} | الرصيد: ${item.opening_balance || 0}`;
      case 'employees':
        return `الراتب: ${item.salary || 0} | الحالة: ${item.active ? 'نشط' : 'غير نشط'}`;
      case 'deliveries':
        return `العميل: ${item.client_name || 'غير محدد'} | القيمة: ${item.total_value || 0}`;
      case 'administration':
        return `النوع: ${item.type || 'غير محدد'} | المبلغ: ${item.amount || 0}`;
      case 'suppliers':
        return `هاتف: ${item.phone || 'غير محدد'} | المواد: ${item.materials?.length || 0}`;
      default:
        return 'لا توجد تفاصيل إضافية';
    }
  }

  getEntityName(entityType) {
    const names = {
      'clients': 'Client',
      'crushers': 'Crusher',
      'contractors': 'Contractor',
      'employees': 'Employee',
      'deliveries': 'Delivery',
      'administration': 'Administration',
      'suppliers': 'Supplier'
    };
    return names[entityType] || entityType;
  }
}

module.exports = RecycleBinController;