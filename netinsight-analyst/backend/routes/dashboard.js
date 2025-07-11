const express = require('express');
const { getDatabase } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取仪表板概览数据
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    
    // 用户文件统计
    const fileStats = await db.get(
      `SELECT 
         COUNT(*) as total_files,
         SUM(file_size) as total_size,
         COUNT(CASE WHEN status = 'uploaded' THEN 1 END) as uploaded_files,
         COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_files,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_files,
         COUNT(CASE WHEN status = 'error' THEN 1 END) as error_files
       FROM files 
       WHERE user_id = ?`,
      [req.user.userId]
    );

    // 最近7天的活动统计
    const recentActivity = await db.all(
      `SELECT 
         DATE(uploaded_at) as date,
         COUNT(*) as count
       FROM files 
       WHERE user_id = ? AND uploaded_at >= datetime('now', '-7 days')
       GROUP BY DATE(uploaded_at)
       ORDER BY date DESC`,
      [req.user.userId]
    );

    // 文件类型分布
    const fileTypeDistribution = await db.all(
      `SELECT 
         file_type,
         COUNT(*) as count,
         SUM(file_size) as total_size
       FROM files 
       WHERE user_id = ?
       GROUP BY file_type`,
      [req.user.userId]
    );

    // 最近分析结果
    const recentAnalysis = await db.all(
      `SELECT 
         ar.analysis_type,
         ar.created_at,
         f.original_name,
         f.file_type
       FROM analysis_results ar
       JOIN files f ON ar.file_id = f.id
       WHERE f.user_id = ?
       ORDER BY ar.created_at DESC
       LIMIT 10`,
      [req.user.userId]
    );

    res.json({
      fileStats: {
        totalFiles: fileStats.total_files || 0,
        totalSize: fileStats.total_size || 0,
        uploadedFiles: fileStats.uploaded_files || 0,
        processingFiles: fileStats.processing_files || 0,
        completedFiles: fileStats.completed_files || 0,
        errorFiles: fileStats.error_files || 0
      },
      recentActivity: recentActivity,
      fileTypeDistribution: fileTypeDistribution,
      recentAnalysis: recentAnalysis
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard data'
    });
  }
});

// 获取系统状态（管理员功能）
router.get('/system-status', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    
    // 系统总体统计
    const systemStats = await db.get(
      `SELECT 
         COUNT(DISTINCT u.id) as total_users,
         COUNT(f.id) as total_files,
         SUM(f.file_size) as total_storage,
         COUNT(ar.id) as total_analysis
       FROM users u
       LEFT JOIN files f ON u.id = f.user_id
       LEFT JOIN analysis_results ar ON f.id = ar.file_id`
    );

    // 今日活动统计
    const todayStats = await db.get(
      `SELECT 
         COUNT(DISTINCT f.user_id) as active_users,
         COUNT(f.id) as files_uploaded,
         COUNT(ar.id) as analysis_completed
       FROM files f
       LEFT JOIN analysis_results ar ON f.id = ar.file_id
       WHERE DATE(f.uploaded_at) = DATE('now')`
    );

    // 最近7天趋势
    const weeklyTrend = await db.all(
      `SELECT 
         DATE(uploaded_at) as date,
         COUNT(*) as files_count,
         COUNT(DISTINCT user_id) as users_count
       FROM files 
       WHERE uploaded_at >= datetime('now', '-7 days')
       GROUP BY DATE(uploaded_at)
       ORDER BY date ASC`
    );

    res.json({
      systemStats: {
        totalUsers: systemStats.total_users || 0,
        totalFiles: systemStats.total_files || 0,
        totalStorage: systemStats.total_storage || 0,
        totalAnalysis: systemStats.total_analysis || 0
      },
      todayStats: {
        activeUsers: todayStats.active_users || 0,
        filesUploaded: todayStats.files_uploaded || 0,
        analysisCompleted: todayStats.analysis_completed || 0
      },
      weeklyTrend: weeklyTrend
    });

  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({
      error: 'Failed to get system status'
    });
  }
});

// 获取性能指标
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    
    // 分析性能统计
    const performanceStats = await db.all(
      `SELECT 
         analysis_type,
         COUNT(*) as count,
         AVG(julianday(ar.created_at) - julianday(f.uploaded_at)) * 24 * 60 as avg_processing_time_minutes
       FROM analysis_results ar
       JOIN files f ON ar.file_id = f.id
       WHERE f.user_id = ? AND ar.created_at >= datetime('now', '-30 days')
       GROUP BY analysis_type`,
      [req.user.userId]
    );

    // 错误率统计
    const errorStats = await db.get(
      `SELECT 
         COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
         COUNT(*) as total_count,
         ROUND(COUNT(CASE WHEN status = 'error' THEN 1 END) * 100.0 / COUNT(*), 2) as error_rate
       FROM files 
       WHERE user_id = ? AND uploaded_at >= datetime('now', '-30 days')`,
      [req.user.userId]
    );

    // 文件大小分布
    const sizeDistribution = await db.all(
      `SELECT 
         CASE 
           WHEN file_size < 1048576 THEN 'Small (<1MB)'
           WHEN file_size < 10485760 THEN 'Medium (1-10MB)'
           WHEN file_size < 104857600 THEN 'Large (10-100MB)'
           ELSE 'Very Large (>100MB)'
         END as size_category,
         COUNT(*) as count
       FROM files 
       WHERE user_id = ?
       GROUP BY size_category`,
      [req.user.userId]
    );

    res.json({
      performanceStats: performanceStats,
      errorStats: {
        errorCount: errorStats.error_count || 0,
        totalCount: errorStats.total_count || 0,
        errorRate: errorStats.error_rate || 0
      },
      sizeDistribution: sizeDistribution
    });

  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      error: 'Failed to get metrics'
    });
  }
});

module.exports = router; 