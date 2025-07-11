const express = require('express');
const { getDatabase } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

const router = express.Router();

// 获取用户项目列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    
    const projects = await db.all(
      `SELECT 
         p.*,
         COUNT(pf.file_id) as file_count,
         COUNT(pm.user_id) as member_count
       FROM projects p
       LEFT JOIN project_files pf ON p.id = pf.project_id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.owner_id = ? OR pm.user_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user.userId, req.user.userId]
    );

    res.json({
      projects: projects
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to get projects'
    });
  }
});

// 创建新项目
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, startDate, endDate } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Project name is required'
      });
    }

    const db = getDatabase();
    
    const result = await db.run(
      `INSERT INTO projects (name, description, owner_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), description || '', req.user.userId, startDate || null, endDate || null]
    );

    // 将创建者添加为项目成员
    await db.run(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, ?)`,
      [result.id, req.user.userId, 'owner']
    );

    // 记录日志
    await logAction(req.user.userId, 'project_create', 'project', result.id, {
      name: name.trim(),
      description: description
    }, req.ip, req.get('User-Agent'));

    res.status(201).json({
      message: 'Project created successfully',
      project: {
        id: result.id,
        name: name.trim(),
        description: description || '',
        status: 'active',
        progress: 0
      }
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project'
    });
  }
});

// 获取项目详情
router.get('/:projectId', authMiddleware, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({
        error: 'Invalid project ID'
      });
    }

    const db = getDatabase();
    
    // 检查用户是否有权限访问该项目
    const project = await db.get(
      `SELECT p.* FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`,
      [projectId, req.user.userId, req.user.userId]
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // 获取项目成员
    const members = await db.all(
      `SELECT pm.role, u.id, u.name, u.email, u.avatar_url
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?`,
      [projectId]
    );

    // 获取项目文件
    const files = await db.all(
      `SELECT f.id, f.original_name, f.file_type, f.file_size, f.status, pf.added_at
       FROM project_files pf
       JOIN files f ON pf.file_id = f.id
       WHERE pf.project_id = ?
       ORDER BY pf.added_at DESC`,
      [projectId]
    );

    res.json({
      project: {
        ...project,
        members: members,
        files: files
      }
    });

  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({
      error: 'Failed to get project details'
    });
  }
});

// 更新项目
router.put('/:projectId', authMiddleware, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({
        error: 'Invalid project ID'
      });
    }

    const { name, description, status, progress, startDate, endDate } = req.body;
    const db = getDatabase();
    
    // 检查用户是否是项目所有者
    const project = await db.get(
      'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
      [projectId, req.user.userId]
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found or access denied'
      });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (progress !== undefined) {
      updates.push('progress = ?');
      params.push(Math.max(0, Math.min(100, progress)));
    }
    if (startDate !== undefined) {
      updates.push('start_date = ?');
      params.push(startDate);
    }
    if (endDate !== undefined) {
      updates.push('end_date = ?');
      params.push(endDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(projectId);

    await db.run(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 记录日志
    await logAction(req.user.userId, 'project_update', 'project', projectId, {
      updates: { name, description, status, progress, startDate, endDate }
    }, req.ip, req.get('User-Agent'));

    res.json({
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Failed to update project'
    });
  }
});

// 删除项目
router.delete('/:projectId', authMiddleware, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({
        error: 'Invalid project ID'
      });
    }

    const db = getDatabase();
    
    // 检查用户是否是项目所有者
    const project = await db.get(
      'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
      [projectId, req.user.userId]
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found or access denied'
      });
    }

    // 删除项目（会级联删除相关记录）
    await db.run('DELETE FROM projects WHERE id = ?', [projectId]);

    // 记录日志
    await logAction(req.user.userId, 'project_delete', 'project', projectId, {
      name: project.name
    }, req.ip, req.get('User-Agent'));

    res.json({
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project'
    });
  }
});

// 添加文件到项目
router.post('/:projectId/files', authMiddleware, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { fileIds } = req.body;

    if (isNaN(projectId) || !Array.isArray(fileIds)) {
      return res.status(400).json({
        error: 'Invalid project ID or file IDs'
      });
    }

    const db = getDatabase();
    
    // 检查用户是否有权限访问该项目
    const project = await db.get(
      `SELECT p.* FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`,
      [projectId, req.user.userId, req.user.userId]
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const addedFiles = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        // 检查文件是否属于用户
        const file = await db.get(
          'SELECT * FROM files WHERE id = ? AND user_id = ?',
          [fileId, req.user.userId]
        );

        if (!file) {
          errors.push({ fileId, error: 'File not found' });
          continue;
        }

        // 检查文件是否已在项目中
        const existing = await db.get(
          'SELECT id FROM project_files WHERE project_id = ? AND file_id = ?',
          [projectId, fileId]
        );

        if (existing) {
          errors.push({ fileId, error: 'File already in project' });
          continue;
        }

        // 添加文件到项目
        await db.run(
          'INSERT INTO project_files (project_id, file_id) VALUES (?, ?)',
          [projectId, fileId]
        );

        addedFiles.push({
          id: fileId,
          originalName: file.original_name
        });

      } catch (error) {
        errors.push({ fileId, error: error.message });
      }
    }

    res.json({
      message: `Added ${addedFiles.length} files to project`,
      addedFiles: addedFiles,
      errors: errors
    });

  } catch (error) {
    console.error('Add files to project error:', error);
    res.status(500).json({
      error: 'Failed to add files to project'
    });
  }
});

module.exports = router; 