const { Client, Project } = require('../models');

class ClientProjectSyncService {
    // Sync all existing clients to projects
    static async syncAllClientsToProjects() {
        try {
            console.log('Starting client-project synchronization...');

            // Get all clients (including soft-deleted ones)
            const clients = await Client.find({});

            let syncedCount = 0;
            let skippedCount = 0;

            for (const client of clients) {
                // Check if project already exists for this client
                const existingProject = await Project.findOne({ client_id: client._id });

                if (!existingProject) {
                    // Create project from client data
                    const projectData = {
                        name: client.name,
                        phone: client.phone,
                        opening_balance: client.opening_balance,
                        deleted_at: client.deleted_at,
                        is_deleted: client.is_deleted,
                        client_id: client._id,
                        created_at: client.created_at,
                        updated_at: client.updated_at
                    };

                    await Project.create(projectData);
                    syncedCount++;
                    console.log(`Synced client "${client.name}" to project`);
                } else {
                    skippedCount++;
                }
            }

            console.log(`Synchronization complete: ${syncedCount} synced, ${skippedCount} skipped`);
            return { syncedCount, skippedCount, totalClients: clients.length };
        } catch (error) {
            console.error('Error during client-project sync:', error);
            throw error;
        }
    }

    // Sync a single client to project
    static async syncClientToProject(clientId) {
        try {
            const client = await Client.findById(clientId);
            if (!client) {
                throw new Error('Client not found');
            }

            // Check if project already exists
            let project = await Project.findOne({ client_id: clientId });

            if (!project) {
                // Create new project
                const projectData = {
                    name: client.name,
                    phone: client.phone,
                    opening_balance: client.opening_balance,
                    deleted_at: client.deleted_at,
                    is_deleted: client.is_deleted,
                    client_id: client._id
                };

                project = await Project.create(projectData);
                console.log(`Created project for client "${client.name}"`);
            } else {
                // Update existing project
                project.name = client.name;
                project.phone = client.phone;
                project.opening_balance = client.opening_balance;
                project.deleted_at = client.deleted_at;
                project.is_deleted = client.is_deleted;

                await project.save();
                console.log(`Updated project for client "${client.name}"`);
            }

            return project;
        } catch (error) {
            console.error('Error syncing client to project:', error);
            throw error;
        }
    }

    // Sync project back to client (if project was updated independently)
    static async syncProjectToClient(projectId) {
        try {
            const project = await Project.findById(projectId);
            if (!project || !project.client_id) {
                throw new Error('Project not found or not linked to client');
            }

            const client = await Client.findById(project.client_id);
            if (!client) {
                throw new Error('Linked client not found');
            }

            // Update client with project data
            client.name = project.name;
            client.phone = project.phone;
            client.opening_balance = project.opening_balance;
            client.deleted_at = project.deleted_at;
            client.is_deleted = project.is_deleted;

            await client.save();
            console.log(`Synced project "${project.name}" back to client`);

            return client;
        } catch (error) {
            console.error('Error syncing project to client:', error);
            throw error;
        }
    }

    // Get all projects with their linked client info
    static async getProjectsWithClientInfo() {
        try {
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
        } catch (error) {
            console.error('Error getting projects with client info:', error);
            throw error;
        }
    }

    // Create a new client and automatically create corresponding project
    static async createClientWithProject(clientData) {
        try {
            // Create client first
            const client = await Client.create(clientData);

            // Create corresponding project
            const projectData = {
                name: client.name,
                phone: client.phone,
                opening_balance: client.opening_balance,
                client_id: client._id
            };

            const project = await Project.create(projectData);

            console.log(`Created client and project: "${client.name}"`);

            return { client, project };
        } catch (error) {
            console.error('Error creating client with project:', error);
            throw error;
        }
    }

    // Update client and sync to project
    static async updateClientAndSync(clientId, updateData) {
        try {
            // Update client
            const client = await Client.findByIdAndUpdate(clientId, updateData, { new: true });
            if (!client) {
                throw new Error('Client not found');
            }

            // Sync to project
            const project = await this.syncClientToProject(clientId);

            return { client, project };
        } catch (error) {
            console.error('Error updating client and syncing:', error);
            throw error;
        }
    }

    // Delete client and corresponding project
    static async deleteClientAndProject(clientId) {
        try {
            // Soft delete client
            const client = await Client.findByIdAndUpdate(clientId, {
                is_deleted: true,
                deleted_at: new Date()
            }, { new: true });

            if (!client) {
                throw new Error('Client not found');
            }

            // Soft delete corresponding project
            const project = await Project.findOneAndUpdate(
                { client_id: clientId },
                {
                    is_deleted: true,
                    deleted_at: new Date()
                },
                { new: true }
            );

            console.log(`Deleted client and project: "${client.name}"`);

            return { client, project };
        } catch (error) {
            console.error('Error deleting client and project:', error);
            throw error;
        }
    }
}

module.exports = ClientProjectSyncService;