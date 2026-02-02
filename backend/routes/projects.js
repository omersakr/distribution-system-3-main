const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// Get all projects
router.get('/', projectController.getAllProjects);

// Get projects for dropdown
router.get('/dropdown', projectController.getProjectsForDropdown);

// Get projects with sync info
router.get('/sync-info', projectController.getProjectsWithSyncInfo);

// Sync all clients to projects
router.post('/sync-clients', projectController.syncAllClientsToProjects);

// Get project by ID
router.get('/:id', projectController.getProjectById);

// Create new project
router.post('/', projectController.createProject);

// Update project
router.put('/:id', projectController.updateProject);

// Delete project
router.delete('/:id', projectController.deleteProject);

module.exports = router;