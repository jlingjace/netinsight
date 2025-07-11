const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

let db;

async function initDatabase() {
  try {
    // 创建数据库连接
    db = await open({
      filename: path.join(__dirname, '..', 'data', 'netinsight.db'),
      driver: sqlite3.Database
    });

    console.log('数据库连接成功');

    // 创建用户表（添加角色字段）
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'viewer', 'guest')),
        full_name TEXT,
        department TEXT,
        phone TEXT,
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        email_verified BOOLEAN DEFAULT 0
      )
    `);

    // 检查是否需要添加角色字段（向后兼容）
    const columns = await db.all("PRAGMA table_info(users)");
    const hasRoleColumn = columns.some(col => col.name === 'role');
    
    if (!hasRoleColumn) {
      console.log('添加角色字段到用户表...');
      await db.exec(`
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'analyst' 
        CHECK (role IN ('admin', 'analyst', 'viewer', 'guest'))
      `);
      
      // 为现有用户设置默认角色
      await db.exec(`UPDATE users SET role = 'analyst' WHERE role IS NULL`);
    }

    // 创建文件表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        original_name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'error')),
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        error_message TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 创建分析结果表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        analysis_type TEXT NOT NULL,
        summary_data TEXT,
        detailed_data TEXT,
        chart_data TEXT,
        recommendations TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // 创建用户活动日志表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id INTEGER,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 创建用户会话表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 创建权限审计表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS permission_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        permission TEXT NOT NULL,
        resource_type TEXT,
        resource_id INTEGER,
        result TEXT CHECK (result IN ('granted', 'denied')),
        reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 创建索引以提高查询性能
    try {
      await db.exec('CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_files_status ON files (status)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_analysis_results_file_id ON analysis_results (file_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_logs (user_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON user_logs (created_at)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (session_token)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_permission_audit_user_id ON permission_audit (user_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_permission_audit_created_at ON permission_audit (created_at)');
      console.log('索引创建完成');
    } catch (indexError) {
      console.warn('索引创建警告:', indexError.message);
      // 索引创建失败不应该阻止应用启动
    }

    // 检查是否存在管理员用户
    const adminUser = await db.get('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin']);
    
    if (!adminUser) {
      console.log('创建默认管理员用户...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.run(`
        INSERT INTO users (username, email, password, role, full_name, is_active, email_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'admin',
        'admin@netinsight.com',
        hashedPassword,
        'admin',
        '系统管理员',
        1,
        1
      ]);
      
      console.log('默认管理员用户创建成功 (用户名: admin, 密码: admin123)');
    }

    // 检查是否存在测试分析师用户
    const analystUser = await db.get('SELECT * FROM users WHERE username = ? LIMIT 1', ['analyst']);
    
    if (!analystUser) {
      console.log('创建默认分析师用户...');
      const hashedPassword = await bcrypt.hash('analyst123', 10);
      
      await db.run(`
        INSERT INTO users (username, email, password, role, full_name, is_active, email_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'analyst',
        'analyst@netinsight.com',
        hashedPassword,
        'analyst',
        '网络分析师',
        1,
        1
      ]);
      
      console.log('默认分析师用户创建成功 (用户名: analyst, 密码: analyst123)');
    }

    console.log('数据库初始化完成');
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
}

async function closeDatabase() {
  if (db) {
    await db.close();
    console.log('数据库连接已关闭');
  }
}

// 数据库迁移函数
async function migrateDatabase() {
  try {
    console.log('开始数据库迁移...');
    
    // 检查用户表是否有新字段
    const userColumns = await db.all("PRAGMA table_info(users)");
    const columnNames = userColumns.map(col => col.name);
    
    const newColumns = [
      { name: 'role', sql: 'ALTER TABLE users ADD COLUMN role TEXT DEFAULT \'analyst\' CHECK (role IN (\'admin\', \'analyst\', \'viewer\', \'guest\'))' },
      { name: 'full_name', sql: 'ALTER TABLE users ADD COLUMN full_name TEXT' },
      { name: 'department', sql: 'ALTER TABLE users ADD COLUMN department TEXT' },
      { name: 'phone', sql: 'ALTER TABLE users ADD COLUMN phone TEXT' },
      { name: 'last_login_at', sql: 'ALTER TABLE users ADD COLUMN last_login_at DATETIME' },
      { name: 'is_active', sql: 'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1' },
      { name: 'email_verified', sql: 'ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0' }
    ];
    
    for (const column of newColumns) {
      if (!columnNames.includes(column.name)) {
        console.log(`添加字段: users.${column.name}`);
        await db.exec(column.sql);
      }
    }
    
    // 更新现有用户的角色（如果为空）
    await db.exec(`UPDATE users SET role = 'analyst' WHERE role IS NULL OR role = ''`);
    
    console.log('数据库迁移完成');
    
  } catch (error) {
    console.error('数据库迁移失败:', error);
    throw error;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  migrateDatabase
}; 