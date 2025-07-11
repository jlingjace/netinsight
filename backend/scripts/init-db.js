const { initDatabase, getDatabase } = require('../config/database');

async function initializeDatabase() {
  console.log('🔄 正在初始化数据库...');
  
  try {
    // 先初始化数据库
    await initDatabase();
    
    // 然后获取数据库实例
    const db = getDatabase();
    
    console.log('✅ 数据库初始化完成!');
    
    // 创建默认管理员用户（如果不存在）
    const bcrypt = require('bcryptjs');
    
    const adminExists = await db.get(
      'SELECT id FROM users WHERE email = ?',
      ['admin@netinsight.com']
    );
    
    if (!adminExists) {
      const adminPassword = 'admin123456';
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      
      await db.run(
        `INSERT INTO users (username, email, password, role, full_name, is_active, email_verified) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['admin', 'admin@netinsight.com', passwordHash, 'admin', 'System Administrator', 1, 1]
      );
      
      console.log('✅ 默认管理员用户已创建:');
      console.log('   邮箱: admin@netinsight.com');
      console.log('   密码: admin123456');
      console.log('   ⚠️  请在生产环境中立即修改密码!');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

initializeDatabase(); 