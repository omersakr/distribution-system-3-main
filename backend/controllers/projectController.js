const projectService = require('../services/projectService');

class ProjectController {
    static async getAllProjects(req, res) {
        try {
            const projects = await projectService.getAllProjects();
            res.json({ projects });
        } catch (error) {
            console.error('Error getting projects:', error);
            res.status(500).json({ error: 'خطأ في جلب المشاريع' });
        }
    }

    static async getProjectById(req, res) {
        try {
            const project = await projectService.getProjectById(req.params.id);
            if (!project) {
                return res.status(404).json({ error: 'المشروع غير موجود' });
            }
            res.json({ project });
        } catch (error) {
            console.error('Error getting project:', error);
            res.status(500).json({ error: 'خطأ في جلب المشروع' });
        }
    }

    static async createProject(req, res) {
        try {
            const project = await projectService.createProject(req.body);
            res.status(201).json({ project });
        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ error: 'خطأ في إنشاء المشروع' });
        }
    }

    static async updateProject(req, res) {
        try {
            const project = await projectService.updateProject(req.params.id, req.body);
            if (!project) {
                return res.status(404).json({ error: 'المشروع غير موجود' });
            }
            res.json({ project });
        } catch (error) {
            console.error('Error updating project:', error);
            res.status(500).json({ error: 'خطأ في تحديث المشروع' });
        }
    }

    static async deleteProject(req, res) {
        try {
            const project = await projectService.deleteProject(req.params.id);
            if (!project) {
                return res.status(404).json({ error: 'المشروع غير موجود' });
            }
            res.json({ message: 'تم حذف المشروع بنجاح' });
        } catch (error) {
            console.error('Error deleting project:', error);
            if (error.message.includes('لا يمكن حذف المشروع')) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'خطأ في حذف المشروع' });
            }
        }
    }

    static async getProjectsForDropdown(req, res) {
        try {
            const projects = await projectService.getProjectsForDropdown();
            res.json({ projects });
        } catch (error) {
            console.error('Error getting projects for dropdown:', error);
            res.status(500).json({ error: 'خطأ في جلب المشاريع' });
        }
    }

    // Sync all clients to projects
    static async syncAllClientsToProjects(req, res) {
        try {
            const result = await projectService.syncAllClientsToProjects();
            res.json({
                message: 'تم مزامنة العملاء مع المشاريع بنجاح',
                ...result
            });
        } catch (error) {
            console.error('Error syncing clients to projects:', error);
            res.status(500).json({ error: 'خطأ في مزامنة العملاء مع المشاريع' });
        }
    }

    // Get projects with sync info
    static async getProjectsWithSyncInfo(req, res) {
        try {
            const projects = await projectService.getProjectsWithSyncInfo();
            res.json({ projects });
        } catch (error) {
            console.error('Error getting projects with sync info:', error);
            res.status(500).json({ error: 'خطأ في جلب معلومات المزامنة' });
        }
    }
}

module.exports = ProjectController;