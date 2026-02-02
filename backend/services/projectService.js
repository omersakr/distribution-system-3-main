const { Project } = require('../models');
const ClientProjectSyncService = require('./clientProjectSyncService');

class ProjectService {
    static async getAllProjects() {
        const projects = await Project.find({ is_deleted: { $ne: true } })
            .populate('client_id', 'name phone opening_balance')
            .sort({ name: 1 });

        return projects.map(project => ({
            id: project._id,
            name: project.name,
            phone: project.phone,
            opening_balance: project.opening_balance,
            client_id: project.client_id?._id,
            client_name: project.client_id?.name,
            is_synced: !!project.client_id,
            created_at: project.created_at
        }));
    }

    static async getProjectById(id) {
        const project = await Project.findOne({
            _id: id,
            is_deleted: { $ne: true }
        }).populate('client_id', 'name phone opening_balance');

        if (!project) return null;

        return {
            id: project._id,
            name: project.name,
            phone: project.phone,
            opening_balance: project.opening_balance,
            client_id: project.client_id?._id,
            client_name: project.client_id?.name,
            is_synced: !!project.client_id,
            created_at: project.created_at
        };
    }

    static async createProject(data) {
        const project = new Project(data);
        await project.save();

        return {
            id: project._id,
            name: project.name,
            phone: project.phone,
            opening_balance: project.opening_balance,
            client_id: project.client_id,
            created_at: project.created_at
        };
    }

    static async updateProject(id, data) {
        const project = await Project.findOneAndUpdate(
            { _id: id, is_deleted: { $ne: true } },
            data,
            { new: true }
        );

        if (!project) return null;

        // If this project is linked to a client, sync the changes back
        if (project.client_id) {
            try {
                await ClientProjectSyncService.syncProjectToClient(project._id);
            } catch (error) {
                console.warn('Failed to sync project changes back to client:', error.message);
            }
        }

        return {
            id: project._id,
            name: project.name,
            phone: project.phone,
            opening_balance: project.opening_balance,
            client_id: project.client_id,
            created_at: project.created_at
        };
    }

    static async deleteProject(id) {
        // Check if project has related records (capital injections, withdrawals)
        const { CapitalInjection, Withdrawal } = require('../models');

        const capitalInjectionsCount = await CapitalInjection.countDocuments({
            project_id: id,
            is_deleted: { $ne: true }
        });
        const withdrawalsCount = await Withdrawal.countDocuments({
            project_id: id,
            is_deleted: { $ne: true }
        });

        if (capitalInjectionsCount > 0 || withdrawalsCount > 0) {
            throw new Error('لا يمكن حذف المشروع لوجود سجلات مرتبطة به');
        }

        // Soft delete the project
        const project = await Project.findOneAndUpdate(
            { _id: id, is_deleted: { $ne: true } },
            {
                is_deleted: true,
                deleted_at: new Date()
            },
            { new: true }
        );

        if (!project) {
            throw new Error('المشروع غير موجود');
        }

        // If linked to a client, also soft delete the client
        if (project.client_id) {
            try {
                await ClientProjectSyncService.deleteClientAndProject(project.client_id);
            } catch (error) {
                console.warn('Failed to sync project deletion to client:', error.message);
            }
        }

        return project;
    }

    static async getProjectsForDropdown() {
        const projects = await Project.find({
            is_deleted: { $ne: true }
        })
            .select('name client_id')
            .sort({ name: 1 });

        return projects.map(project => ({
            id: project._id,
            name: project.name
        }));
    }

    // Sync all clients to projects
    static async syncAllClientsToProjects() {
        return await ClientProjectSyncService.syncAllClientsToProjects();
    }

    // Get projects with client synchronization info
    static async getProjectsWithSyncInfo() {
        return await ClientProjectSyncService.getProjectsWithClientInfo();
    }
}

module.exports = ProjectService;