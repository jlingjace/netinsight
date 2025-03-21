import sqlite3

# 连接到数据库
conn = sqlite3.connect('netinsight.db')
cursor = conn.cursor()

# 检查users表是否存在role_id列
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
column_names = [column[1] for column in columns]

# 如果不存在，添加role_id列
if 'role_id' not in column_names:
    print("添加 role_id 列到 users 表")
    cursor.execute("ALTER TABLE users ADD COLUMN role_id INTEGER")
    
    # 创建外键关系（如果roles表已存在）
    try:
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            is_system BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 添加默认角色
        cursor.execute("INSERT OR IGNORE INTO roles (name, is_system) VALUES ('admin', 1)")
        cursor.execute("INSERT OR IGNORE INTO roles (name, is_system) VALUES ('analyst', 1)")
        cursor.execute("INSERT OR IGNORE INTO roles (name, is_system) VALUES ('user', 1)")
        
        # 根据现有角色更新role_id
        cursor.execute("UPDATE users SET role_id = (SELECT id FROM roles WHERE name = users.role)")
        
    except sqlite3.Error as e:
        print(f"创建roles表失败: {e}")

# 创建权限表
try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        code TEXT UNIQUE NOT NULL,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 创建角色权限关联表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER,
        permission_id INTEGER,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles (id),
        FOREIGN KEY (permission_id) REFERENCES permissions (id)
    )
    """)
    
except sqlite3.Error as e:
    print(f"创建权限相关表失败: {e}")

# 提交更改并关闭连接
conn.commit()
conn.close()

print("数据库结构更新完成！") 