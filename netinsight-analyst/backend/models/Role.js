/**
 * 角色模型
 */
class Role {
  constructor() {
    // 预定义角色
    this.roles = {
      admin: {
        id: 'admin',
        name: '系统管理员',
        description: '拥有系统的完全访问权限',
        permissions: [
          'user.create', 'user.read', 'user.update', 'user.delete',
          'file.create', 'file.read', 'file.update', 'file.delete',
          'analysis.create', 'analysis.read', 'analysis.update', 'analysis.delete',
          'report.create', 'report.read', 'report.update', 'report.delete',
          'system.manage', 'logs.read', 'settings.manage'
        ],
        level: 100
      },
      analyst: {
        id: 'analyst',
        name: '网络分析师',
        description: '可以上传文件、进行分析和生成报告',
        permissions: [
          'file.create', 'file.read', 'file.update', 'file.delete.own',
          'analysis.create', 'analysis.read', 'analysis.update', 'analysis.delete.own',
          'report.create', 'report.read', 'report.update', 'report.delete.own'
        ],
        level: 50
      },
      viewer: {
        id: 'viewer',
        name: '查看者',
        description: '只能查看分析结果和报告',
        permissions: [
          'file.read.own',
          'analysis.read.own',
          'report.read.own'
        ],
        level: 10
      },
      guest: {
        id: 'guest', 
        name: '访客',
        description: '受限的访问权限',
        permissions: [
          'file.read.public',
          'analysis.read.public'
        ],
        level: 1
      }
    };

    // 权限分类
    this.permissionCategories = {
      user: '用户管理',
      file: '文件管理',
      analysis: '分析功能',
      report: '报告功能',
      system: '系统管理',
      logs: '日志查看',
      settings: '设置管理'
    };
  }

  /**
   * 获取所有角色
   * @returns {Object} 角色列表
   */
  getAllRoles() {
    return this.roles;
  }

  /**
   * 根据ID获取角色
   * @param {string} roleId - 角色ID
   * @returns {Object|null} 角色对象
   */
  getRoleById(roleId) {
    return this.roles[roleId] || null;
  }

  /**
   * 检查角色是否存在
   * @param {string} roleId - 角色ID
   * @returns {boolean} 是否存在
   */
  isValidRole(roleId) {
    return !!this.roles[roleId];
  }

  /**
   * 检查角色是否有指定权限
   * @param {string} roleId - 角色ID
   * @param {string} permission - 权限名称
   * @returns {boolean} 是否有权限
   */
  hasPermission(roleId, permission) {
    const role = this.getRoleById(roleId);
    if (!role) return false;

    // 检查完全匹配的权限
    if (role.permissions.includes(permission)) {
      return true;
    }

    // 检查通配符权限（如 file.* 包含 file.read）
    const wildcardPermission = permission.split('.')[0] + '.*';
    if (role.permissions.includes(wildcardPermission)) {
      return true;
    }

    // 检查所有权限（admin角色通常有 *.*）
    if (role.permissions.includes('*.*')) {
      return true;
    }

    return false;
  }

  /**
   * 检查用户是否有权限访问资源
   * @param {string} roleId - 角色ID
   * @param {string} permission - 权限名称
   * @param {number} userId - 用户ID
   * @param {number} resourceOwnerId - 资源所有者ID
   * @returns {boolean} 是否有权限
   */
  hasResourcePermission(roleId, permission, userId, resourceOwnerId = null) {
    const role = this.getRoleById(roleId);
    if (!role) return false;

    // 检查完全权限
    if (this.hasPermission(roleId, permission)) {
      return true;
    }

    // 检查所有者权限（如 file.delete.own）
    const ownPermission = permission + '.own';
    if (this.hasPermission(roleId, ownPermission) && userId === resourceOwnerId) {
      return true;
    }

    // 检查公共权限（如 file.read.public）
    const publicPermission = permission + '.public';
    if (this.hasPermission(roleId, publicPermission)) {
      return true;
    }

    return false;
  }

  /**
   * 比较角色权限级别
   * @param {string} roleId1 - 角色1 ID
   * @param {string} roleId2 - 角色2 ID
   * @returns {number} -1: role1 < role2, 0: 相等, 1: role1 > role2
   */
  compareRoleLevel(roleId1, roleId2) {
    const role1 = this.getRoleById(roleId1);
    const role2 = this.getRoleById(roleId2);
    
    if (!role1 || !role2) return 0;
    
    if (role1.level < role2.level) return -1;
    if (role1.level > role2.level) return 1;
    return 0;
  }

  /**
   * 获取角色的权限列表
   * @param {string} roleId - 角色ID
   * @returns {Array} 权限列表
   */
  getRolePermissions(roleId) {
    const role = this.getRoleById(roleId);
    return role ? role.permissions : [];
  }

  /**
   * 获取用户可以分配的角色列表
   * @param {string} currentUserRoleId - 当前用户角色ID
   * @returns {Array} 可分配的角色列表
   */
  getAssignableRoles(currentUserRoleId) {
    const currentRole = this.getRoleById(currentUserRoleId);
    if (!currentRole) return [];

    // 只能分配权限级别低于或等于自己的角色
    return Object.values(this.roles).filter(role => 
      role.level <= currentRole.level
    );
  }

  /**
   * 验证权限操作
   * @param {Object} options - 验证选项
   * @param {string} options.userRole - 用户角色
   * @param {string} options.permission - 所需权限
   * @param {number} options.userId - 用户ID
   * @param {number} options.resourceOwnerId - 资源所有者ID
   * @param {boolean} options.throwError - 是否抛出错误
   * @returns {boolean} 是否有权限
   */
  validatePermission({ userRole, permission, userId, resourceOwnerId, throwError = false }) {
    const hasPermission = this.hasResourcePermission(userRole, permission, userId, resourceOwnerId);
    
    if (!hasPermission && throwError) {
      throw new Error(`权限不足: 需要 ${permission} 权限`);
    }
    
    return hasPermission;
  }

  /**
   * 获取权限的显示名称
   * @param {string} permission - 权限名称
   * @returns {string} 显示名称
   */
  getPermissionDisplayName(permission) {
    const parts = permission.split('.');
    const category = this.permissionCategories[parts[0]] || parts[0];
    const action = this.getActionDisplayName(parts[1]);
    const scope = parts[2] ? this.getScopeDisplayName(parts[2]) : '';
    
    return `${category} - ${action}${scope}`;
  }

  /**
   * 获取操作的显示名称
   * @param {string} action - 操作名称
   * @returns {string} 显示名称
   */
  getActionDisplayName(action) {
    const actionMap = {
      create: '创建',
      read: '查看',
      update: '修改',
      delete: '删除',
      manage: '管理'
    };
    return actionMap[action] || action;
  }

  /**
   * 获取范围的显示名称
   * @param {string} scope - 范围名称
   * @returns {string} 显示名称
   */
  getScopeDisplayName(scope) {
    const scopeMap = {
      own: '(仅自己的)',
      public: '(公共的)',
      all: '(所有)'
    };
    return scopeMap[scope] || `(${scope})`;
  }
}

module.exports = new Role(); 