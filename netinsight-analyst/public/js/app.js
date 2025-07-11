// =========== NetInsight 前端应用 ===========

class NetInsightApp {
    constructor() {
        // API 基础 URL
        this.API_BASE = '';
        
        // 当前文件列表
        this.files = [];
        
        // 上传队列
        this.uploadQueue = [];
        
        // 定时器
        this.updateInterval = null;
        
        // DOM 元素
        this.elements = {
            // 导航
            navLinks: document.querySelectorAll('.nav-link'),
            sections: document.querySelectorAll('.section'),
            
            // 文件上传
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            selectFileBtn: document.getElementById('selectFileBtn'),
            uploadProgress: document.getElementById('uploadProgress'),
            progressText: document.getElementById('progressText'),
            progressPercent: document.getElementById('progressPercent'),
            progressFill: document.getElementById('progressFill'),
            
            // 队列状态
            queueInfo: document.getElementById('queueInfo'),
            
            // 分析结果
            analysisContent: document.getElementById('analysisContent'),
            
            // 历史记录
            historyContent: document.getElementById('historyContent'),
            historyLoading: document.getElementById('historyLoading'),
            
            // 模态框
            modal: document.getElementById('analysisModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalBody: document.getElementById('modalBody'),
            modalClose: document.getElementById('modalClose'),
            modalCloseBtn: document.getElementById('modalCloseBtn'),
            exportBtn: document.getElementById('exportBtn'),
            
            // 通知系统
            notifications: document.getElementById('notifications')
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.startPeriodicUpdates();
    }

    bindEvents() {
        // 导航切换
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // 文件上传事件
        this.elements.selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            this.elements.fileInput.click();
        });

        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
            // 清空input的值，这样同一个文件可以重复选择
            e.target.value = '';
        });

        // 拖拽上传
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        });

        this.elements.uploadArea.addEventListener('click', (e) => {
            // 只有点击上传区域本身时才触发，不是按钮时才触发
            if (e.target === this.elements.uploadArea || e.target.closest('.upload-text')) {
                this.elements.fileInput.click();
            }
        });

        // 模态框事件
        this.elements.modalClose.addEventListener('click', () => {
            this.closeModal();
        });

        this.elements.modalCloseBtn.addEventListener('click', () => {
            this.closeModal();
        });

        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });

        // 导出按钮
        this.elements.exportBtn.addEventListener('click', () => {
            this.exportReport();
        });

        // 历史记录操作按钮事件委托
        this.elements.historyContent.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const fileId = button.dataset.fileId;

            if (!fileId) return;

            switch (action) {
                case 'view':
                    this.viewAnalysis(fileId);
                    break;
                case 'restart':
                    this.restartAnalysis(fileId);
                    break;
                case 'delete':
                    this.deleteFile(fileId);
                    break;
            }
        });

        // 分析结果页面操作按钮事件委托
        this.elements.analysisContent.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const fileId = button.dataset.fileId;

            if (!fileId) return;

            if (action === 'view') {
                this.viewAnalysis(fileId);
            }
        });

        console.log('事件绑定完成');
    }

    // =========== 导航管理 ===========
    handleNavigation(e) {
        e.preventDefault();
        
        const targetSection = e.currentTarget.dataset.section;
        
        // 更新导航状态
        this.elements.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // 切换内容区域
        this.elements.sections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetElement = document.getElementById(`${targetSection}-section`);
        if (targetElement) {
            targetElement.classList.add('active');
            
            // 根据切换的页面加载对应数据
            switch (targetSection) {
                case 'analysis':
                    this.loadAnalysisResults();
                    break;
                case 'history':
                    this.loadHistory();
                    break;
                case 'upload':
                    this.updateQueueStatus();
                    break;
            }
        }
    }

    // =========== 文件上传 ===========
    handleFileSelect(files) {
        if (!files || files.length === 0) return;

        // 验证文件
        const validFiles = Array.from(files).filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showNotification('请选择有效的网络分析文件', 'error');
            return;
        }

        // 上传文件
        validFiles.forEach(file => this.uploadFile(file));
    }

    validateFile(file) {
        // 检查文件类型
        const validTypes = ['.pcap', '.cap', '.pcapng', '.har'];
        
        // 修复空值问题
        if (!file || !file.name || typeof file.name !== 'string') {
            this.showNotification('无效的文件对象', 'error');
            return false;
        }
        
        const fileName = file.name.toLowerCase();
        const isValidType = validTypes.some(type => fileName.endsWith(type));
        
        if (!isValidType) {
            this.showNotification(`文件 ${file.name} 格式不支持`, 'error');
            return false;
        }

        // 暂时移除文件大小限制，等订阅功能完成后再添加
        // TODO: 根据用户订阅计划设置不同的文件大小限制

        return true;
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showUploadProgress(true);
            this.updateUploadProgress(0, `正在上传 ${file.name}...`);

            const response = await fetch(`${this.API_BASE}/api/files/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`上传失败: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.updateUploadProgress(100, '上传成功!');
                this.showNotification(`文件 ${file.name} 上传成功，开始分析`, 'success');
                
                // 延迟隐藏进度条
                setTimeout(() => {
                    this.showUploadProgress(false);
                    this.updateUploadProgress(0, '');
                }, 2000);

                // 刷新数据
                this.loadHistory();
                this.updateQueueStatus();
                
                // 如果当前在分析页面，也刷新分析结果
                if (document.getElementById('analysis-section').classList.contains('active')) {
                    this.loadAnalysisResults();
                }
            } else {
                throw new Error(result.message || '上传失败');
            }

        } catch (error) {
            console.error('上传错误:', error);
            this.showNotification(`上传失败: ${error.message}`, 'error');
            this.showUploadProgress(false);
        }
    }

    showUploadProgress(show) {
        this.elements.uploadProgress.style.display = show ? 'block' : 'none';
    }

    updateUploadProgress(percent, text) {
        this.elements.progressPercent.textContent = `${percent}%`;
        this.elements.progressText.textContent = text;
        this.elements.progressFill.style.width = `${percent}%`;
    }

    // =========== API 调用 ===========
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API 调用失败: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 调用错误:', error);
            throw error;
        }
    }

    // =========== 队列状态更新 ===========
    async updateQueueStatus() {
        try {
            const result = await this.apiCall('/api/analysis/queue/status');
            
            if (result.success) {
                const { waiting, running } = result.data;
                this.elements.queueInfo.textContent = `等待中: ${waiting} | 分析中: ${running}`;
            }
        } catch (error) {
            console.error('获取队列状态失败:', error);
        }
    }

    // =========== 历史记录 ===========
    async loadHistory() {
        try {
            this.elements.historyLoading.style.display = 'flex';
            
            const result = await this.apiCall('/api/files');
            
            if (result.success) {
                this.files = result.data.files;
                this.renderHistory();
            }
        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.showNotification('加载历史记录失败', 'error');
        } finally {
            this.elements.historyLoading.style.display = 'none';
        }
    }

    renderHistory() {
        if (this.files.length === 0) {
            this.elements.historyContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock empty-icon"></i>
                    <h3>暂无历史记录</h3>
                    <p>请先上传文件进行分析</p>
                </div>
            `;
            document.getElementById('analysisSummary').innerHTML = '';
            return;
        }

        const tableHTML = `
            <div class="history-table">
                <table class="table">
                    <thead>
                        <tr>
                            <th>文件名</th>
                            <th>文件类型</th>
                            <th>文件大小</th>
                            <th>上传时间</th>
                            <th>分析状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.files.map(file => this.renderFileRow(file)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.elements.historyContent.innerHTML = tableHTML;

        // 新增：为每一行添加点击事件
        const rows = this.elements.historyContent.querySelectorAll('tbody tr');
        rows.forEach((row, idx) => {
            const file = this.files[idx];
            row.addEventListener('click', (e) => {
                // 避免点击删除/重分析按钮时触发摘要加载
                if (e.target.closest('button')) return;
                this.showAnalysisSummary(file._id);
            });
        });

        // 新增：为删除按钮绑定事件
        const deleteBtns = this.elements.historyContent.querySelectorAll('button[data-action="delete"]');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.getAttribute('data-file-id');
                this.deleteFile(fileId);
            });
        });

        // 新增：为"查看完整分析报告"按钮绑定事件
        const viewBtns = this.elements.historyContent.querySelectorAll('button[data-action="view-report"]');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.getAttribute('data-file-id');
                window.open(`/report.html?id=${fileId}`, '_blank');
            });
        });
    }

    renderFileRow(file) {
        const statusClass = this.getStatusClass(file.analysisStatus);
        const statusText = this.getStatusText(file.analysisStatus);
        const fileSize = this.formatFileSize(file.fileSize);
        const uploadTime = file.uploadedAt ? new Date(file.uploadedAt).toLocaleString('zh-CN') : '未记录';

        return `
            <tr>
                <td>
                    <div style="font-weight: 500;">${file.originalName}</div>
                </td>
                <td>
                    <span class="file-type">${file.fileType.toUpperCase()}</span>
                </td>
                <td>${fileSize}</td>
                <td>${uploadTime}</td>
                <td>
                    <span class="analysis-status ${statusClass}">
                        <i class="fas ${this.getStatusIcon(file.analysisStatus)}"></i>
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        ${file.analysisStatus === 'completed' ? `
                            <button class="btn btn-primary btn-sm" data-action="view-report" data-file-id="${file._id}">
                                <i class="fas fa-file-alt"></i> 查看完整分析报告
                            </button>
                        ` : ''}
                        ${file.analysisStatus === 'pending' || file.analysisStatus === 'failed' ? `
                            <button class="btn btn-warning btn-sm" data-action="restart" data-file-id="${file._id}">
                                <i class="fas fa-redo"></i> 重新分析
                            </button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" data-action="delete" data-file-id="${file._id}">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'status-processing',
            'processing': 'status-processing',
            'running': 'status-processing',
            'completed': 'status-completed',
            'failed': 'status-failed'
        };
        return classes[status] || 'status-processing';
    }

    getStatusText(status) {
        const texts = {
            'pending': '等待分析',
            'processing': '分析中',
            'running': '分析中',
            'completed': '分析完成',
            'failed': '分析失败'
        };
        return texts[status] || '未知状态';
    }

    getStatusIcon(status) {
        const icons = {
            'pending': 'fa-clock',
            'processing': 'fa-spinner fa-spin',
            'running': 'fa-spinner fa-spin',
            'completed': 'fa-check-circle',
            'failed': 'fa-exclamation-circle'
        };
        return icons[status] || 'fa-question-circle';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // =========== 分析结果 ===========
    async loadAnalysisResults() {
        try {
            // 获取最近的已完成分析
            const completedFiles = this.files.filter(file => file.analysisStatus === 'completed');
            
            if (completedFiles.length === 0) {
                this.elements.analysisContent.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-line empty-icon"></i>
                        <h3>暂无分析结果</h3>
                        <p>请先上传文件进行分析</p>
                    </div>
                `;
                return;
            }

            // 显示最新的分析结果
            const latestFile = completedFiles[0];
            await this.displayAnalysisCard(latestFile);

        } catch (error) {
            console.error('加载分析结果失败:', error);
            this.showNotification('加载分析结果失败', 'error');
        }
    }

    async displayAnalysisCard(file) {
        try {
            const analysisResult = await this.apiCall(`/api/analysis/${file._id}`);
            
            if (!analysisResult.success) {
                throw new Error('获取分析结果失败');
            }

            const analysis = analysisResult.data.results;
            const topProtocols = (analysis.protocols || []).slice(0, 3);
            const anomaliesCount = (analysis.anomalies || []).length;
            const topConversationsCount = Math.min(
                (analysis.network?.topSources || []).length * 
                (analysis.network?.topDestinations || []).length, 
                5
            );
            
            const cardHTML = `
                <div class="analysis-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                    <div style="padding: 24px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
                        <div class="analysis-header" style="margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <i class="fas fa-file-alt" style="font-size: 18px; opacity: 0.9;"></i>
                                <div class="analysis-title" style="font-size: 18px; font-weight: 600;">${file.originalName}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div class="analysis-status" style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; border: 1px solid rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-check-circle"></i>
                                    分析完成
                                </div>
                                <div style="color: rgba(255, 255, 255, 0.8); font-size: 13px;">
                                    ${new Date(file.uploadedAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        
                        <!-- 快速洞察 -->
                        <div style="background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: rgba(255, 255, 255, 0.95);">🚀 一眼看懂</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${this.formatFileSize(analysis.summary?.totalBytes || 0)}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">总流量</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${topProtocols.length}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">主要协议</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${topConversationsCount}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">通信对话</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px; color: ${anomaliesCount > 0 ? '#fbbf24' : '#10b981'};">${anomaliesCount}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">发现问题</div>
                                </div>
                            </div>
                        </div>

                        <!-- 主要协议 -->
                        ${topProtocols.length > 0 ? `
                            <div style="margin-bottom: 20px;">
                                <h5 style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">主要协议类型:</h5>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                    ${topProtocols.map(protocol => `
                                        <span style="background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                                            ${protocol.name} (${protocol.percentage?.toFixed(1)}%)
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- 健康状态指示 -->
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <i class="fas fa-heartbeat" style="font-size: 14px;"></i>
                                <span style="font-size: 14px; font-weight: 500;">网络健康状态</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                ${anomaliesCount === 0 ? `
                                    <div style="display: flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.2); padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 12px;"></i>
                                        <span style="color: #10b981; font-size: 12px; font-weight: 500;">运行正常</span>
                                    </div>
                                ` : `
                                    <div style="display: flex; align-items: center; gap: 6px; background: rgba(245, 158, 11, 0.2); padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(245, 158, 11, 0.3);">
                                        <i class="fas fa-exclamation-triangle" style="color: #f59e0b; font-size: 12px;"></i>
                                        <span style="color: #f59e0b; font-size: 12px; font-weight: 500;">发现 ${anomaliesCount} 个问题</span>
                                    </div>
                                `}
                                <div style="font-size: 12px; opacity: 0.7;">
                                    网络活动: ${(analysis.summary?.packetsPerSecond || 0).toFixed(1)} 包/秒
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div style="padding: 20px 24px; background: rgba(0, 0, 0, 0.1);">
                        <button class="btn btn-primary" data-action="view" data-file-id="${file._id}" style="width: 100%; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: white; padding: 12px; border-radius: 8px; font-weight: 500; backdrop-filter: blur(10px); transition: all 0.3s ease;">
                            <i class="fas fa-chart-line"></i>
                            查看完整分析报告
                        </button>
                    </div>
                </div>
            `;

            this.elements.analysisContent.innerHTML = cardHTML;

        } catch (error) {
            console.error('显示分析卡片失败:', error);
            // 显示错误状态的卡片
            this.elements.analysisContent.innerHTML = `
                <div class="analysis-card" style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; color: #dc2626; margin-bottom: 12px;"></i>
                    <div style="color: #dc2626; font-weight: 500; margin-bottom: 8px;">分析结果加载失败</div>
                    <div style="color: #6b7280; font-size: 14px;">${error.message}</div>
                </div>
            `;
        }
    }

    // =========== 分析详情模态框 ===========
    async viewAnalysis(fileId) {
        try {
            const analysisResult = await this.apiCall(`/api/analysis/${fileId}`);
            
            if (!analysisResult.success) {
                throw new Error('获取分析结果失败');
            }

            const file = this.files.find(f => f._id === fileId);
            const analysis = analysisResult.data.results;

            // 保存当前分析数据供过滤器使用
            this.currentAnalysisData = analysisResult.data;

            this.elements.modalTitle.textContent = `分析结果 - ${file?.originalName || '未知文件'}`;
            this.elements.modalBody.innerHTML = this.renderAnalysisDetails(analysis);
            this.showModal();
            
            // 绑定事件监听器
            this.bindModalEventListeners();

        } catch (error) {
            console.error('查看分析失败:', error);
            this.showNotification('获取分析详情失败', 'error');
        }
    }

    renderAnalysisDetails(analysis) {
        return `
            <div class="analysis-details">
                <!-- 分析过滤器 -->
                <div class="analysis-filters" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
                    <h4 style="margin: 0 0 12px 0; color: #374151;">🔍 快速过滤</h4>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <select id="protocolFilter" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white;">
                            <option value="all">所有协议</option>
                            ${(analysis.protocols || []).filter(protocol => protocol && protocol.name && typeof protocol.name === 'string').map(protocol => 
                                `<option value="${protocol.name}">${protocol.name} (${protocol.packets}包)</option>`
                            ).join('')}
                            ${analysis.transport && analysis.transport.topPorts ? 
                                analysis.transport.topPorts.filter(port => port && port.service && port.service !== 'Unknown' && typeof port.service === 'string').map(port => 
                                    `<option value="${port.service}">${port.service} (${port.packets}包)</option>`
                                ).join('') : ''
                            }
                        </select>
                        <input type="text" id="ipFilter" placeholder="过滤IP地址..." style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; flex: 1; min-width: 200px;">
                        <button id="applyFiltersBtn" data-action="apply" style="padding: 6px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">应用过滤</button>
                        <button id="clearFiltersBtn" data-action="clear" style="padding: 6px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">清除</button>
                    </div>
                </div>

                <!-- Top N 对话 - 杀手级功能 -->
                <div style="margin-bottom: 24px;">
                    <h4 style="color: #1f2937; margin-bottom: 16px;">💬 主要网络连接 (Top Connections)</h4>
                    <div class="top-conversations">
                        ${this.renderTopConnections(analysis.results || analysis)}
                    </div>
                </div>

                <!-- 协议分布可视化 -->
                <div style="margin-bottom: 24px;">
                    <h4 style="color: #1f2937; margin-bottom: 16px;">🌐 协议分布</h4>
                    <div class="protocol-visualization">
                        ${this.renderProtocolDistribution((analysis.results?.protocols) || analysis.protocols || [])}
                    </div>
                </div>

                <!-- 主机通信矩阵 - 第二阶段核心功能 -->
                ${analysis.network ? this.renderCommunicationMatrix(analysis.network) : ''}

                <!-- 基础统计 -->
                <div style="margin-bottom: 24px;">
                    <h4 style="color: #1f2937; margin-bottom: 16px;">📊 流量概览</h4>
                    <div class="analysis-summary">
                        <div class="summary-item">
                            <span class="summary-value">${analysis.summary?.totalPackets || 0}</span>
                            <span class="summary-label">数据包总数</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-value">${this.formatFileSize(analysis.summary?.totalBytes || 0)}</span>
                            <span class="summary-label">数据总量</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-value">${(analysis.summary?.duration || 0).toFixed(1)}s</span>
                            <span class="summary-label">持续时间</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-value">${(analysis.summary?.packetsPerSecond || 0).toFixed(1)}</span>
                            <span class="summary-label">包/秒</span>
                        </div>
                    </div>
                </div>

                <!-- 时间线分析 - 第二阶段核心功能 -->
                ${analysis.temporal ? this.renderTimelineAnalysis(analysis.temporal) : ''}

                <!-- HTTP会话流重建 - 杀手级功能 -->
                ${analysis.http_sessions && analysis.http_sessions.total_sessions > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <h4 style="color: #1f2937; margin-bottom: 16px;">🌐 HTTP会话流重建 (Network Activity)</h4>
                        <div style="background: rgba(59, 130, 246, 0.05); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-exchange-alt" style="color: #3b82f6;"></i>
                                    <span style="color: #374151; font-weight: 500;">总会话数: ${analysis.http_sessions.total_sessions}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-server" style="color: #10b981;"></i>
                                    <span style="color: #374151; font-weight: 500;">域名数: ${analysis.http_sessions.summary?.unique_hosts || 0}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-code" style="color: #f59e0b;"></i>
                                    <span style="color: #374151; font-weight: 500;">HTTP方法: ${(analysis.http_sessions.summary?.methods || []).join(', ')}</span>
                                </div>
                            </div>
                        </div>
                        ${this.renderHttpSessions(analysis.http_sessions.sessions || [])}
                    </div>
                ` : ''}

                <!-- 网络活动热点 -->
                <div style="margin-bottom: 24px;">
                    <h4 style="color: #1f2937; margin-bottom: 16px;">🔥 网络活动热点</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <h5 style="color: #6b7280; margin-bottom: 8px;">🔄 最活跃源IP</h5>
                            ${this.renderTopIPs(analysis.network?.topSources || [], 'source')}
                        </div>
                        <div>
                            <h5 style="color: #6b7280; margin-bottom: 8px;">🎯 最活跃目标IP</h5>
                            ${this.renderTopIPs(analysis.network?.topDestinations || [], 'destination')}
                        </div>
                    </div>
                </div>

                <!-- 智能诊断引擎 - 升级版 -->
                ${analysis.smart_insights ? this.renderSmartInsights(analysis.smart_insights) : ''}

                ${analysis.anomalies && analysis.anomalies.length > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <h4 style="color: #dc2626; margin-bottom: 16px;">⚠️ 网络异常检测</h4>
                        <div class="anomalies-list">
                            ${analysis.anomalies.map(anomaly => `
                                <div class="anomaly-item" style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; margin-bottom: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                        <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                                        <span style="font-weight: 600; color: #dc2626;">${this.getAnomalyTitle(anomaly.type)}</span>
                                        <span style="background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${anomaly.severity || 'medium'}</span>
                                    </div>
                                    <div style="color: #374151; margin-bottom: 8px;">${anomaly.description}</div>
                                    ${anomaly.details ? `<div style="font-size: 13px; color: #6b7280;">${this.formatAnomalyDetails(anomaly.details)}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // =========== 新增的渲染方法 ===========
    renderTopConnections(analysis) {
        // 支持两种数据结构：原始数据和过滤后的数据
        const connections = analysis.connections?.topConnections || [];
        
        // 减少调试信息输出
        if (connections.length === 0) {
    
        }
        
        if (connections.length === 0) {
            return '<div style="text-align: center; color: #6b7280; padding: 20px;">暂无网络连接数据</div>';
        }
        
        return connections.slice(0, 10).map((conn, index) => {
            // 解析连接字符串 "IP:port->IP:port"
            if (!conn || !conn.connection || typeof conn.connection !== 'string') {
                return '<div style="color: #ef4444; padding: 8px;">连接数据格式错误</div>';
            }
            
            const connectionParts = conn.connection.split('->');
            if (connectionParts.length !== 2) {
                return '<div style="color: #ef4444; padding: 8px;">连接格式错误: ' + conn.connection + '</div>';
            }
            
            const [source, destination] = connectionParts;
            const sourceParts = source.split(':');
            const destParts = destination.split(':');
            
            if (sourceParts.length !== 2 || destParts.length !== 2) {
                return '<div style="color: #ef4444; padding: 8px;">IP:Port格式错误</div>';
            }
            
            const [sourceIP, sourcePort] = sourceParts;
            const [destIP, destPort] = destParts;
            
            const description = this.getConversationDescription(sourceIP, destIP);
            
            return `
                <div class="conversation-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; background: white;">
                    <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                            <span style="background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${index + 1}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">
                                    <span style="color: #059669;">${sourceIP}:${sourcePort}</span> 
                                    <i class="fas fa-arrow-right" style="color: #6b7280; margin: 0 8px;"></i>
                                    <span style="color: #dc2626;">${destIP}:${destPort}</span>
                                </div>
                                <div style="font-size: 13px; color: #6b7280;">${description}</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600; color: #374151;">${conn.packets} 包</div>
                            <div style="font-size: 12px; color: #6b7280;">端口 ${sourcePort}→${destPort}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="analyze-conversation-btn" data-source="${sourceIP}" data-dest="${destIP}" style="padding: 4px 12px; font-size: 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; color: #374151;">
                            <i class="fas fa-search"></i> 详细分析
                        </button>
                        <button class="filter-conversation-btn" data-source="${sourceIP}" data-dest="${destIP}" style="padding: 4px 12px; font-size: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; cursor: pointer; color: #1d4ed8;">
                            <i class="fas fa-filter"></i> 过滤此连接
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderProtocolDistribution(protocols) {
        // 减少调试信息输出
        
        if (!protocols || protocols.length === 0) {
            return '<div style="text-align: center; color: #6b7280; padding: 20px;">暂无协议数据</div>';
        }

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
        
        return `
            <div style="display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start;">
                <div class="protocol-bars">
                    ${protocols.slice(0, 7).map((protocol, index) => `
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: 500; color: #374151;">${protocol.name}</span>
                                <span style="font-size: 14px; color: #6b7280;">${protocol.packets} 包 (${protocol.percentage?.toFixed(1)}%)</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${protocol.percentage}%; height: 100%; background: ${colors[index % colors.length]}; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="protocol-pie" style="text-align: center;">
                    <div style="position: relative; width: 200px; height: 200px; margin: 0 auto;">
                        ${this.renderSimplePieChart(protocols.slice(0, 5), colors)}
                    </div>
                    <div style="margin-top: 16px; font-size: 13px; color: #6b7280;">
                        协议分布图
                    </div>
                </div>
            </div>
        `;
    }

    renderSimplePieChart(protocols, colors) {
        const total = protocols.reduce((sum, p) => sum + p.packets, 0);
        if (total === 0) {
            return `
                <div style="width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px;">
                    暂无数据
                </div>
            `;
        }

        let currentAngle = 0;
        const radius = 90;
        const centerX = 100;
        const centerY = 100;
        
        const slices = protocols.map((protocol, index) => {
            const percentage = (protocol.packets / total) * 100;
            const angle = (percentage / 100) * 360;
            
            // 计算弧的路径
            const startAngle = currentAngle * Math.PI / 180;
            const endAngle = (currentAngle + angle) * Math.PI / 180;
            
            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
            ].join(' ');
            
            currentAngle += angle;
            
            return `
                <path d="${pathData}" 
                      fill="${colors[index % colors.length]}" 
                      stroke="white" 
                      stroke-width="2">
                    <title>${protocol.name}: ${protocol.packets} 包 (${percentage.toFixed(1)}%)</title>
                </path>
            `;
        }).join('');
        
        return `
            <svg width="200" height="200" viewBox="0 0 200 200" style="transform: rotate(-90deg);">
                ${slices}
            </svg>
            <div style="
                position: absolute;
                width: 80px;
                height: 80px;
                top: 60px;
                left: 60px;
                background: white;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                color: #374151;
                border: 2px solid #f3f4f6;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <span style="font-size: 16px;">${protocols.length}</span>
                <span style="font-size: 11px; font-weight: normal; color: #6b7280;">协议</span>
            </div>
        `;
    }

    renderTopIPs(ips, type) {
        if (!ips || ips.length === 0) {
            return '<div style="text-align: center; color: #6b7280; padding: 12px; font-size: 14px;">暂无数据</div>';
        }

        return ips.slice(0, 5).map((ip, index) => `
            <div style="display: flex; align-items: center; justify-content: between; padding: 8px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <span style="background: ${type === 'source' ? '#10b981' : '#f59e0b'}; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">${index + 1}</span>
                    <span style="font-family: monospace; font-size: 13px; color: #374151;">${ip.ip}</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; font-weight: 500; color: #374151;">${this.formatFileSize(ip.bytes)}</div>
                    <div style="font-size: 11px; color: #6b7280;">${ip.packets} 包</div>
                </div>
            </div>
        `).join('');
    }

    getAnomalyTitle(type) {
        const titles = {
            'high_icmp_traffic': 'ICMP流量异常',
            'port_scan_detected': '端口扫描攻击',
            'ddos_attack': 'DDoS攻击迹象',
            'high_retransmission': 'TCP重传过多',
            'unusual_protocol': '异常协议使用',
            'large_packets': '异常大数据包',
            'high_traffic_volume': '流量峰值异常'
        };
        return titles[type] || type;
    }

    formatAnomalyDetails(details) {
        if (typeof details === 'string') return details;
        if (typeof details === 'object') {
            return Object.entries(details)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' | ');
        }
        return '';
    }

    getConversationDescription(sourceIP, destIP) {
        // 简单的IP类型判断
        if (this.isPrivateIP(sourceIP) && !this.isPrivateIP(destIP)) {
            return '内网到外网通信';
        } else if (!this.isPrivateIP(sourceIP) && this.isPrivateIP(destIP)) {
            return '外网到内网通信';
        } else if (this.isPrivateIP(sourceIP) && this.isPrivateIP(destIP)) {
            return '内网通信';
        } else {
            return '外网通信';
        }
    }

    isPrivateIP(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        
        const first = parseInt(parts[0]);
        const second = parseInt(parts[1]);
        
        // 私有IP地址范围
        return (
            first === 10 || 
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168)
        );
    }

    // =========== 🛠️ 修复过滤功能 - 智能过滤系统 ===========
    applyFilters() {
        const protocolFilter = document.getElementById('protocolFilter')?.value || '';
        const ipFilter = document.getElementById('ipFilter')?.value?.trim() || '';
        

        
        // 获取当前分析数据
        const currentAnalysis = this.currentAnalysisData;
        if (!currentAnalysis) {
            this.showNotification('❌ 没有可过滤的数据', 'warning');
            return;
        }
        
        // 深拷贝原始数据
        // 创建过滤后的数据副本 - 使用浅拷贝避免CSP问题
        let filteredData = {
            ...currentAnalysis,
            results: currentAnalysis.results ? {
                ...currentAnalysis.results,
                protocols: currentAnalysis.results.protocols ? [...currentAnalysis.results.protocols] : [],
                connections: currentAnalysis.results.connections ? {
                    ...currentAnalysis.results.connections,
                    topConnections: currentAnalysis.results.connections.topConnections ? 
                        [...currentAnalysis.results.connections.topConnections] : []
                } : {},
                transport: currentAnalysis.results.transport ? {
                    ...currentAnalysis.results.transport,
                    topPorts: currentAnalysis.results.transport.topPorts ? 
                        [...currentAnalysis.results.transport.topPorts] : []
                } : {},
                network: currentAnalysis.results.network ? {
                    ...currentAnalysis.results.network,
                    topSources: currentAnalysis.results.network.topSources ? 
                        [...currentAnalysis.results.network.topSources] : [],
                    topDestinations: currentAnalysis.results.network.topDestinations ? 
                        [...currentAnalysis.results.network.topDestinations] : []
                } : {}
            } : {}
        };
        let hasActiveFilter = false;
        let appliedFilters = [];
        
        // ✅ 协议过滤 - 修复逻辑
        if (protocolFilter && typeof protocolFilter === 'string' && protocolFilter !== 'all' && protocolFilter.trim() !== '') {
            hasActiveFilter = true;
            appliedFilters.push(`协议: ${protocolFilter}`);
            
            // 过滤协议分布数据
            if (filteredData.results && filteredData.results.protocols && Array.isArray(filteredData.results.protocols)) {
                const originalCount = filteredData.results.protocols.length;
                const filterLower = protocolFilter.toLowerCase();
                filteredData.results.protocols = filteredData.results.protocols.filter(p => {
                    if (!p || !p.name || typeof p.name !== 'string') return false;
                    try {
                        const protocolName = p.name.toLowerCase();
                        // 更宽松的匹配：包含匹配或精确匹配
                        return protocolName.includes(filterLower) || protocolName === filterLower || filterLower.includes(protocolName);
                    } catch (error) {
                        console.warn('协议名称处理错误:', p.name, error);
                        return false;
                    }
                });
    
            }
            
            // 根据协议过滤传输层数据
            if (filteredData.results && filteredData.results.transport && filteredData.results.transport.topPorts && Array.isArray(filteredData.results.transport.topPorts)) {
                const originalCount = filteredData.results.transport.topPorts.length;
                try {
                    const filterLower = protocolFilter.toLowerCase();
                    // 根据不同协议过滤端口
                    if (filterLower === 'https') {
                        filteredData.results.transport.topPorts = filteredData.results.transport.topPorts.filter(port => 
                            port && (port.port === 443 || (port.service && typeof port.service === 'string' && port.service.toLowerCase().includes('https')))
                        );
                    } else if (filterLower === 'http') {
                        filteredData.results.transport.topPorts = filteredData.results.transport.topPorts.filter(port => 
                            port && (port.port === 80 || (port.service && typeof port.service === 'string' && port.service.toLowerCase().includes('http')))
                        );
                    }
    
                } catch (error) {
                    console.warn('传输层数据过滤错误:', error);
                }
            }
        }
        
        // ✅ IP过滤 - 修复逻辑
        if (ipFilter && ipFilter.trim() !== '') {
            hasActiveFilter = true;
            appliedFilters.push(`IP: ${ipFilter}`);
            const filterIPs = ipFilter.split(',').map(ip => ip.trim()).filter(ip => ip);
            
            if (filterIPs.length > 0) {
                let totalFiltered = 0;
                
                // 过滤连接数据
                if (filteredData.results.connections && filteredData.results.connections.topConnections) {
                    const originalCount = filteredData.results.connections.topConnections.length;
                    filteredData.results.connections.topConnections = filteredData.results.connections.topConnections.filter(conn => {
                        if (!conn || !conn.connection || typeof conn.connection !== 'string') return false;
                        const connectionString = conn.connection;
                        return filterIPs.some(filterIP => connectionString.includes(filterIP));
                    });
                    totalFiltered += (originalCount - filteredData.results.connections.topConnections.length);
                }
                
                // 过滤网络数据
                if (filteredData.results.network) {
                    if (filteredData.results.network.topSources) {
                        const originalCount = filteredData.results.network.topSources.length;
                        filteredData.results.network.topSources = filteredData.results.network.topSources.filter(s => 
                            s && s.ip && typeof s.ip === 'string' && filterIPs.some(ip => s.ip.includes(ip))
                        );
                        totalFiltered += (originalCount - filteredData.results.network.topSources.length);
                    }
                    if (filteredData.results.network.topDestinations) {
                        const originalCount = filteredData.results.network.topDestinations.length;
                        filteredData.results.network.topDestinations = filteredData.results.network.topDestinations.filter(d => 
                            d && d.ip && typeof d.ip === 'string' && filterIPs.some(ip => d.ip.includes(ip))
                        );
                        totalFiltered += (originalCount - filteredData.results.network.topDestinations.length);
                    }
                }
                
        
            }
        }
        
        // ✅ 重新渲染分析结果
        this.renderFilteredAnalysis(filteredData);
        
        // ✅ 改进通知消息
        if (hasActiveFilter) {
            this.showNotification(`✅ 过滤已应用: ${appliedFilters.join(' | ')}`, 'success');
        } else {
            this.showNotification('ℹ️ 未设置过滤条件，显示所有数据', 'info');
        }
    }

    // ✅ 修复清除功能
    clearFilters() {

        
        // 清除表单值
        const protocolFilter = document.getElementById('protocolFilter');
        const ipFilter = document.getElementById('ipFilter');
        
        if (protocolFilter) {
            protocolFilter.value = 'all';
        }
        if (ipFilter) {
            ipFilter.value = '';
        }
        
        // 重新渲染原始数据
        if (this.currentAnalysisData) {
            // 确保使用完整的原始数据
    
            this.renderFilteredAnalysis(this.currentAnalysisData);
        } else {
            console.error('❌ 无法恢复原始数据：currentAnalysisData 为空');
        }
        
        this.showNotification('🧹 过滤条件已清除，显示所有数据', 'success');
    }

    // 渲染过滤后的分析结果
    renderFilteredAnalysis(analysisData) {
        const modalBody = document.getElementById('modalBody');
        if (!modalBody) return;
        
        // 重新渲染分析详情
        modalBody.innerHTML = this.renderAnalysisDetails(analysisData);
        
        // 重新绑定事件监听器
        this.bindModalEventListeners();
    }

    // 绑定模态框内的事件监听器
    bindModalEventListeners() {
        // 移除已有的事件监听器，避免重复绑定
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            // 使用事件委托，避免重复绑定
            modalBody.removeEventListener('click', this.modalEventHandler);
            modalBody.addEventListener('click', this.modalEventHandler.bind(this));
        }
    }

    // 模态框内的事件处理器
    modalEventHandler(e) {
        const target = e.target;
        const button = target.closest('button');
        const element = target.closest('[data-flow-key], [data-issue-type], .connection-cell, .http-session-row, .insight-item');
        
        // 处理按钮点击
        if (button) {
            e.stopPropagation(); // 防止事件冒泡
            
            const action = button.id || button.dataset.action;
            
            switch (action) {
                case 'applyFiltersBtn':
                    this.applyFilters();
                    break;
                case 'clearFiltersBtn':
                    this.clearFilters();
                    break;
                case 'applyTimeFilterBtn':
                    this.applyTimeFilter();
                    break;
                case 'clearTimeFilterBtn':
                    this.clearTimeFilter();
                    break;
                default:
                    if (button.classList.contains('analyze-conversation-btn')) {
                        const sourceIP = button.dataset.source;
                        const destIP = button.dataset.dest;
                        this.analyzeConversation(sourceIP, destIP);
                    } else if (button.classList.contains('filter-conversation-btn')) {
                        const sourceIP = button.dataset.source;
                        const destIP = button.dataset.dest;
                        this.filterByConversation(sourceIP, destIP);
                    } else if (button.classList.contains('session-details-btn')) {
                        const flowKey = button.dataset.flowKey;
                        const sessionIndex = button.dataset.sessionIndex;
                        this.viewHttpSessionDetails(flowKey, sessionIndex);
                    }
                    break;
            }
            return;
        }
        
        // 处理其他元素点击
        if (element) {
            if (element.classList.contains('http-session-row')) {
                const flowKey = element.dataset.flowKey;
                const sessionIndex = element.dataset.sessionIndex;
                this.viewHttpSessionDetails(flowKey, sessionIndex);
            } else if (element.classList.contains('insight-item')) {
                const issueType = element.dataset.issueType;
                const issueTitle = element.dataset.issueTitle;
                const issueDescription = element.dataset.issueDescription;
                const issueSeverity = element.dataset.issueSeverity;
                
                // 重构issue对象，避免JSON.parse
                const issueData = {
                    type: issueType,
                    title: issueTitle,
                    description: issueDescription,
                    severity: issueSeverity
                };
                this.showInsightDetails(issueType, issueData);
            } else if (element.classList.contains('connection-cell')) {
                const sourceIP = element.dataset.sourceIp;
                const destIP = element.dataset.destIp;
                const connectionBytes = parseInt(element.dataset.connectionBytes) || 0;
                const connectionPackets = parseInt(element.dataset.connectionPackets) || 0;
                const connectionType = element.dataset.connectionType;
                
                // 重构connection对象，避免JSON.parse
                const connection = {
                    bytes: connectionBytes,
                    packets: connectionPackets,
                    connectionType: connectionType
                };
                this.showConnectionDetails(sourceIP, destIP, connection);
            }
        }
    }
    
    // 实现时间过滤功能
    applyTimeFilter() {
        const startTime = document.getElementById('timeStart')?.value;
        const endTime = document.getElementById('timeEnd')?.value;
        
        if (!startTime || !endTime) {
            this.showNotification('请选择完整的时间范围', 'warning');
            return;
        }
        
        const currentAnalysis = this.currentAnalysisData;
        if (!currentAnalysis) {
            this.showNotification('没有可过滤的数据', 'warning');
            return;
        }
        
        const startTimestamp = new Date(startTime).getTime() / 1000;
        const endTimestamp = new Date(endTime).getTime() / 1000;
        

        
        // 应用时间过滤器
        let filteredData = { ...currentAnalysis };
        
        // 过滤流量事件
        if (filteredData.results.temporal && filteredData.results.temporal.trafficEvents) {
            filteredData.results.temporal.trafficEvents = filteredData.results.temporal.trafficEvents.filter(event => {
                const eventTime = new Date(event.timestamp).getTime() / 1000;
                return eventTime >= startTimestamp && eventTime <= endTimestamp;
            });
        }
        
        // 过滤时间线数据
        if (filteredData.results.temporal && filteredData.results.temporal.trafficTimeline) {
            filteredData.results.temporal.trafficTimeline = filteredData.results.temporal.trafficTimeline.filter((data, index) => {
                // 根据时间线索引计算时间戳
                const temporal = filteredData.results.temporal;
                const bucketDuration = temporal.bucketSize || 60; // 默认60秒
                const startTimeValue = new Date(temporal.startTime).getTime() / 1000;
                const bucketTime = startTimeValue + (index * bucketDuration);
                return bucketTime >= startTimestamp && bucketTime <= endTimestamp;
            });
        }
        
        // 重新渲染分析结果
        this.renderFilteredAnalysis(filteredData);
        
        this.showNotification(`时间过滤已应用: ${startTime} 到 ${endTime}`, 'success');
    }

    clearTimeFilter() {
        if (document.getElementById('timeStart')) {
            document.getElementById('timeStart').value = '';
        }
        if (document.getElementById('timeEnd')) {
            document.getElementById('timeEnd').value = '';
        }
        
        // 重新渲染原始数据
        if (this.currentAnalysisData) {
            this.renderFilteredAnalysis(this.currentAnalysisData);
        }
        
        this.showNotification('时间过滤已清除', 'info');
    }

    analyzeConversation(sourceIP, destIP) {
        this.showNotification(`正在分析 ${sourceIP} ↔ ${destIP} 的详细通信...`, 'info');
        // TODO: 实现会话流重建功能
    }

    filterByConversation(sourceIP, destIP) {
        if (document.getElementById('ipFilter')) {
            document.getElementById('ipFilter').value = `${sourceIP},${destIP}`;
        }
        this.applyFilters();
    }

    showModal() {
        this.elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.elements.modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    // =========== 文件操作 ===========
    async restartAnalysis(fileId) {
        try {
            const result = await this.apiCall(`/api/analysis/${fileId}/restart`, {
                method: 'POST'
            });

            if (result.success) {
                this.showNotification('重新分析已启动', 'success');
                this.loadHistory();
                this.updateQueueStatus();
            }
        } catch (error) {
            console.error('重新分析失败:', error);
            this.showNotification('重新分析失败', 'error');
        }
    }

    async deleteFile(fileId) {
        if (!confirm('确定要删除这个文件吗？此操作不可恢复。')) {
            return;
        }

        try {
            const result = await this.apiCall(`/api/files/${fileId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                this.showNotification('文件删除成功', 'success');
                this.loadHistory();
                this.updateQueueStatus();
            }
        } catch (error) {
            console.error('删除文件失败:', error);
            this.showNotification('删除文件失败', 'error');
        }
    }

    exportReport() {
        this.showNotification('报告导出功能开发中...', 'info');
    }

    // =========== 通知系统 ===========
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        }[type];

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
        `;

        this.elements.notifications.appendChild(notification);

        // 自动移除通知
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    // =========== 初始化数据 ===========
    async loadInitialData() {
        await this.loadHistory();
        await this.updateQueueStatus();
    }

    // =========== 定期更新 ===========
    startPeriodicUpdates() {
        // 每5秒更新一次队列状态
        this.updateInterval = setInterval(() => {
            this.updateQueueStatus();
            
            // 如果有处理中的文件，刷新历史记录
            const processingFiles = this.files.filter(file => 
                file.analysisStatus === 'processing' || file.analysisStatus === 'pending'
            );
            
            if (processingFiles.length > 0) {
                this.loadHistory();
            }
        }, 5000);
    }

    // =========== 清理资源 ===========
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    // =========== HTTP会话流重建方法 ===========
    renderHttpSessions(sessions) {
        if (!sessions || sessions.length === 0) {
            return `
                <div style="text-align: center; color: #6b7280; padding: 24px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <i class="fas fa-globe" style="font-size: 24px; margin-bottom: 8px; color: #9ca3af;"></i>
                    <div style="font-weight: 500; margin-bottom: 4px;">暂无HTTP会话数据</div>
                    <div style="font-size: 13px;">未检测到HTTP流量或数据包未包含HTTP负载</div>
                </div>
            `;
        }

        return `
            <div style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
                <!-- 表头 -->
                <div style="display: grid; grid-template-columns: 60px 80px 1fr 120px 80px 100px 80px; gap: 12px; padding: 12px 16px; background: #f9fafb; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    <div>#</div>
                    <div>方法</div>
                    <div>URL</div>
                    <div>主机</div>
                    <div>状态</div>
                    <div>响应时间</div>
                    <div>操作</div>
                </div>
                
                <!-- HTTP会话列表 -->
                <div style="max-height: 400px; overflow-y: auto;">
                    ${sessions.map((session, index) => this.renderHttpSessionRow(session, index)).join('')}
                </div>
            </div>
        `;
    }

    renderHttpSessionRow(session, index) {
        const statusColor = this.getHttpStatusColor(session.status_code);
        const methodColor = this.getHttpMethodColor(session.method);
        const responseTime = session.response_time ? `${session.response_time.toFixed(0)}ms` : 'N/A';
        
        return `
            <div class="http-session-row" 
                 data-flow-key="${session.flow_key || ''}"
                 data-session-index="${index}"
                 style="display: grid; grid-template-columns: 60px 80px 1fr 120px 80px 100px 80px; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background-color 0.2s;"

                
                <!-- 序号 -->
                <div style="font-size: 13px; color: #6b7280; font-weight: 500;">${index + 1}</div>
                
                <!-- HTTP方法 -->
                <div>
                    <span style="background: ${methodColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                        ${session.method || 'N/A'}
                    </span>
                </div>
                
                <!-- URL -->
                <div style="font-size: 13px; color: #374151; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${session.url || ''}">
                    ${this.truncateUrl(session.url || '', 60)}
                </div>
                
                <!-- 主机 -->
                <div style="font-size: 13px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${session.host || ''}">
                    ${session.host || 'N/A'}
                </div>
                
                <!-- 状态码 -->
                <div>
                    ${session.status_code ? `
                        <span style="background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                            ${session.status_code}
                        </span>
                    ` : '<span style="color: #9ca3af; font-size: 12px;">pending</span>'}
                </div>
                
                <!-- 响应时间 -->
                <div style="font-size: 13px; color: ${session.response_time > 1000 ? '#ef4444' : session.response_time > 500 ? '#f59e0b' : '#10b981'}; font-weight: 500;">
                    ${responseTime}
                </div>
                
                <!-- 操作 -->
                <div>
                    <button class="session-details-btn"
                            data-flow-key="${session.flow_key || ''}"
                            data-session-index="${index}" 
                            style="padding: 4px 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; cursor: pointer; color: #1d4ed8; font-size: 11px;">
                        <i class="fas fa-eye"></i> 详情
                    </button>
                </div>
            </div>
        `;
    }

    getHttpMethodColor(method) {
        const colors = {
            'GET': '#10b981',      // 绿色
            'POST': '#3b82f6',     // 蓝色  
            'PUT': '#f59e0b',      // 橙色
            'DELETE': '#ef4444',   // 红色
            'PATCH': '#8b5cf6',    // 紫色
            'HEAD': '#6b7280',     // 灰色
            'OPTIONS': '#06b6d4'   // 青色
        };
        return colors[method] || '#6b7280';
    }

    getHttpStatusColor(statusCode) {
        if (!statusCode) return '#9ca3af';
        
        if (statusCode >= 200 && statusCode < 300) return '#10b981';  // 2xx 成功 - 绿色
        if (statusCode >= 300 && statusCode < 400) return '#f59e0b';  // 3xx 重定向 - 橙色  
        if (statusCode >= 400 && statusCode < 500) return '#ef4444';  // 4xx 客户端错误 - 红色
        if (statusCode >= 500) return '#dc2626';                      // 5xx 服务器错误 - 深红色
        
        return '#6b7280';  // 默认灰色
    }

    truncateUrl(url, maxLength) {
        if (!url || url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }

    viewHttpSessionDetails(flowKey, sessionIndex) {
        this.showNotification(`查看HTTP会话详情: 流 ${flowKey}`, 'info');
        
        // TODO: 实现HTTP会话详情模态框
        // 这里可以显示完整的请求/响应头部、body等详细信息

    }

    // =========== 智能诊断引擎界面方法 ===========
    renderSmartInsights(insights) {
        if (!insights) {
            return '';
        }

        const healthStatus = insights.overall_health || 'good';
        const healthConfig = this.getHealthConfig(healthStatus);

        return `
            <div style="margin-bottom: 24px;">
                <h4 style="color: #1f2937; margin-bottom: 16px;">🧠 智能诊断引擎 (AI Insights)</h4>
                
                <!-- 整体健康状态 -->
                <div style="background: ${healthConfig.bgColor}; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${healthConfig.borderColor};">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="${healthConfig.icon}" style="color: ${healthConfig.iconColor}; font-size: 18px;"></i>
                        <span style="font-weight: 700; color: ${healthConfig.textColor}; font-size: 16px;">${healthConfig.title}</span>
                    </div>
                    <div style="color: #374151; font-size: 14px;">${healthConfig.description}</div>
                </div>

                <!-- 诊断分类 -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                    ${this.renderInsightCategory('🚀 性能问题', insights.performance_issues, '#ef4444')}
                    ${this.renderInsightCategory('🔒 安全风险', insights.security_concerns, '#f59e0b')}
                    ${this.renderInsightCategory('🛠️ 错误模式', insights.error_patterns, '#dc2626')}
                    ${this.renderInsightCategory('💡 优化建议', insights.optimization_suggestions, '#3b82f6')}
                </div>
            </div>
        `;
    }

    getHealthConfig(status) {
        const configs = {
            'good': {
                title: '网络健康状况良好',
                description: '未检测到严重的性能或安全问题，网络运行状态正常',
                bgColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: '#10b981',
                iconColor: '#059669',
                textColor: '#059669',
                icon: 'fas fa-check-circle'
            },
            'warning': {
                title: '发现潜在问题',
                description: '检测到一些需要关注的性能或安全问题，建议及时处理',
                bgColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: '#f59e0b',
                iconColor: '#d97706',
                textColor: '#d97706',
                icon: 'fas fa-exclamation-triangle'
            },
            'critical': {
                title: '发现严重问题',
                description: '检测到严重的安全风险或性能问题，需要立即处理',
                bgColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: '#ef4444',
                iconColor: '#dc2626',
                textColor: '#dc2626',
                icon: 'fas fa-exclamation-circle'
            }
        };
        return configs[status] || configs['good'];
    }

    renderInsightCategory(title, issues, accentColor) {
        if (!issues || issues.length === 0) {
            return `
                <div style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 16px;">
                    <h5 style="color: #374151; margin-bottom: 12px; font-size: 14px; font-weight: 600;">${title}</h5>
                    <div style="text-align: center; color: #9ca3af; padding: 20px 0;">
                        <i class="fas fa-check" style="font-size: 16px; margin-bottom: 8px; color: #10b981;"></i>
                        <div style="font-size: 13px;">未发现问题</div>
                    </div>
                </div>
            `;
        }

        return `
            <div style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 16px;">
                <h5 style="color: #374151; margin-bottom: 12px; font-size: 14px; font-weight: 600;">
                    ${title}
                    <span style="background: ${accentColor}; color: white; padding: 2px 6px; border-radius: 8px; font-size: 11px; margin-left: 8px;">
                        ${issues.length}
                    </span>
                </h5>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${issues.map(issue => this.renderInsightItem(issue, accentColor)).join('')}
                </div>
            </div>
        `;
    }

    renderInsightItem(issue, accentColor) {
        const severityConfig = this.getSeverityConfig(issue.severity);
        
        return `
            <div class="insight-item"
                 data-issue-type="${issue.type}"
                 data-issue-title="${issue.title || ''}"
                 data-issue-description="${issue.description || ''}"
                 data-issue-severity="${issue.severity || 'medium'}"
                 style="padding: 12px; border: 1px solid #f3f4f6; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;"

                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-weight: 500; color: #111827; font-size: 13px;">${issue.title}</span>
                    <span style="background: ${severityConfig.bgColor}; color: ${severityConfig.textColor}; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 500;">
                        ${severityConfig.label}
                    </span>
                </div>
                
                <div style="color: #6b7280; font-size: 12px; line-height: 1.4; margin-bottom: 8px;">
                    ${issue.description}
                </div>
                
                <div style="color: #059669; font-size: 11px; font-style: italic;">
                    💡 ${issue.suggestion}
                </div>
                
                ${issue.details ? `
                    <div style="margin-top: 8px; padding: 6px; background: #f9fafb; border-radius: 4px; font-size: 11px; color: #6b7280;">
                        ${this.formatInsightDetails(issue.details)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    getSeverityConfig(severity) {
        const configs = {
            'critical': { label: '严重', bgColor: '#fef2f2', textColor: '#dc2626' },
            'high': { label: '高', bgColor: '#fef3e2', textColor: '#ea580c' },
            'medium': { label: '中', bgColor: '#fefce8', textColor: '#ca8a04' },
            'low': { label: '低', bgColor: '#f0fdf4', textColor: '#16a34a' }
        };
        return configs[severity] || configs['medium'];
    }

    formatInsightDetails(details) {
        if (typeof details === 'string') return details;
        
        const items = [];
        Object.entries(details).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                items.push(`${key}: ${value.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}`);
            } else {
                items.push(`${key}: ${value}`);
            }
        });
        
        return items.join(' | ');
    }

    showInsightDetails(type, issue) {
        // TODO: 实现详细信息模态框
        this.showNotification(`查看${issue.title}的详细信息`, 'info');

    }

    // =========== 时间线分析 - 第二阶段核心功能 ===========
    renderTimelineAnalysis(temporal) {
        if (!temporal || !temporal.trafficTimeline || temporal.trafficTimeline.length === 0) {
            return '';
        }

        const timeline = temporal.trafficTimeline;
        const events = temporal.trafficEvents || [];
        
        // 计算最大流量，用于图表缩放
        const maxRate = Math.max(...timeline.map(point => point.rate));
        const maxPackets = Math.max(...timeline.map(point => point.packets));
        
        return `
            <div style="margin-bottom: 24px;">
                <h4 style="color: #1f2937; margin-bottom: 16px;">📈 时间线分析 (Timeline Analysis)</h4>
                
                <!-- 时间线摘要 -->
                <div style="background: rgba(59, 130, 246, 0.05); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; align-items: center;">
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                                ${temporal.duration ? (temporal.duration / 60).toFixed(1) : 0}分
                            </div>
                            <div style="font-size: 12px; color: #6b7280;">分析时长</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                                ${new Date(temporal.startTime).toLocaleTimeString()}
                            </div>
                            <div style="font-size: 12px; color: #6b7280;">开始时间</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                                ${this.formatFileSize(temporal.peakTrafficRate || 0)}/s
                            </div>
                            <div style="font-size: 12px; color: #6b7280;">峰值流量</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                                ${events.length}
                            </div>
                            <div style="font-size: 12px; color: #6b7280;">流量事件</div>
                        </div>
                    </div>
                </div>

                <!-- 流量时间线图表 -->
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                    <h5 style="color: #374151; margin-bottom: 12px; font-size: 14px; font-weight: 600;">📊 流量变化趋势</h5>
                    <div class="timeline-chart" style="position: relative; height: 200px; margin-bottom: 16px;">
                        ${this.renderTrafficChart(timeline, maxRate)}
                    </div>
                    
                    <!-- 时间轴 -->
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; margin-top: 8px;">
                        <span>${new Date(temporal.startTime).toLocaleTimeString()}</span>
                        <span>流量趋势</span>
                        <span>${new Date(temporal.endTime).toLocaleTimeString()}</span>
                    </div>
                </div>

                <!-- 协议时间线 -->
                ${temporal.protocolTimeline ? this.renderProtocolTimeline(temporal.protocolTimeline) : ''}

                <!-- 流量事件 -->
                ${events.length > 0 ? this.renderTrafficEvents(events) : ''}

                <!-- 时间范围过滤器 -->
                <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span style="font-size: 13px; color: #374151; font-weight: 500;">⏰ 时间过滤:</span>
                        <input type="datetime-local" id="timeStart" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                        <span style="color: #6b7280;">到</span>
                        <input type="datetime-local" id="timeEnd" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                        <button id="applyTimeFilterBtn" data-action="applyTime" style="padding: 4px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-filter"></i> 应用
                        </button>
                        <button id="clearTimeFilterBtn" data-action="clearTime" style="padding: 4px 12px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            清除
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTrafficChart(timeline, maxRate) {
        if (!timeline || timeline.length === 0) return '';
        
        const chartWidth = 100; // 百分比宽度  
        const chartHeight = 180; // 图表高度
        
        // 生成SVG路径点
        const points = timeline.map((point, index) => {
            const x = (index / (timeline.length - 1)) * chartWidth;
            const y = chartHeight - (point.rate / maxRate) * chartHeight;
            return `${x},${y}`;
        }).join(' ');
        
        // 生成面积填充路径
        const areaPath = `M0,${chartHeight} L${points} L${chartWidth},${chartHeight} Z`;
        
        return `
            <svg width="100%" height="${chartHeight}" style="position: absolute; top: 0; left: 0;">
                <!-- 网格线 -->
                <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" stroke-width="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                <!-- 面积图 -->
                <path d="${areaPath}" fill="rgba(59, 130, 246, 0.1)" stroke="none"/>
                
                <!-- 线条 -->
                <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                
                <!-- 数据点 -->
                ${timeline.map((point, index) => {
                    const x = (index / (timeline.length - 1)) * chartWidth;
                    const y = chartHeight - (point.rate / maxRate) * chartHeight;
                    return `<circle cx="${x}%" cy="${y}" r="3" fill="#3b82f6" opacity="0.8">
                        <title>${this.formatFileSize(point.rate)}/s 在 ${new Date(point.timestamp * 1000).toLocaleTimeString()}</title>
                    </circle>`;
                }).join('')}
            </svg>
        `;
    }

    renderProtocolTimeline(protocolTimeline) {
        const protocols = Object.keys(protocolTimeline).filter(protocol => 
            protocolTimeline[protocol] && protocolTimeline[protocol].length > 0
        );
        
        if (protocols.length === 0) return '';
        
        const colors = {
            'TCP': '#3b82f6',
            'UDP': '#10b981', 
            'ICMP': '#f59e0b',
            'ARP': '#8b5cf6'
        };

        return `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <h5 style="color: #374151; margin-bottom: 12px; font-size: 14px; font-weight: 600;">🔄 协议时间分布</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    ${protocols.map(protocol => `
                        <div style="padding: 12px; background: #f9fafb; border-radius: 6px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <div style="width: 12px; height: 12px; background: ${colors[protocol] || '#6b7280'}; border-radius: 50%;"></div>
                                <span style="font-weight: 500; color: #374151; font-size: 13px;">${protocol}</span>
                            </div>
                            <div style="height: 40px; position: relative;">
                                ${this.renderMiniChart(protocolTimeline[protocol], colors[protocol] || '#6b7280')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderMiniChart(data, color) {
        if (!data || data.length === 0) return '';
        
        const maxPackets = Math.max(...data.map(point => point.packets));
        if (maxPackets === 0) return '';
        
        const points = data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 40 - (point.packets / maxPackets) * 35;
            return `${x},${y}`;
        }).join(' ');
        
        return `
            <svg width="100%" height="40" style="position: absolute; top: 0; left: 0;">
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
            </svg>
        `;
    }

    renderTrafficEvents(events) {
        const eventsByType = {
            'traffic_spike': events.filter(e => e.type === 'traffic_spike'),
            'quiet_period': events.filter(e => e.type === 'quiet_period')
        };

        return `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <h5 style="color: #374151; margin-bottom: 12px; font-size: 14px; font-weight: 600;">⚡ 流量事件检测</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px;">
                    ${eventsByType.traffic_spike.length > 0 ? `
                        <div>
                            <h6 style="color: #ef4444; margin-bottom: 8px; font-size: 13px; font-weight: 600;">
                                🔺 流量突增 (${eventsByType.traffic_spike.length})
                            </h6>
                            ${eventsByType.traffic_spike.slice(0, 3).map(event => `
                                <div style="padding: 8px; background: rgba(239, 68, 68, 0.05); border-left: 3px solid #ef4444; border-radius: 4px; margin-bottom: 6px;">
                                    <div style="font-size: 12px; color: #374151; font-weight: 500; margin-bottom: 2px;">
                                        ${new Date(event.timestamp * 1000).toLocaleTimeString()}
                                    </div>
                                    <div style="font-size: 11px; color: #6b7280;">
                                        ${event.description}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${eventsByType.quiet_period.length > 0 ? `
                        <div>
                            <h6 style="color: #6b7280; margin-bottom: 8px; font-size: 13px; font-weight: 600;">
                                🔻 安静期 (${eventsByType.quiet_period.length})
                            </h6>
                            ${eventsByType.quiet_period.slice(0, 3).map(event => `
                                <div style="padding: 8px; background: rgba(107, 114, 128, 0.05); border-left: 3px solid #6b7280; border-radius: 4px; margin-bottom: 6px;">
                                    <div style="font-size: 12px; color: #374151; font-weight: 500; margin-bottom: 2px;">
                                        ${new Date(event.timestamp * 1000).toLocaleTimeString()}
                                    </div>
                                    <div style="font-size: 11px; color: #6b7280;">
                                        ${event.description}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // 修复IP地址显示 - 显示完整IP地址
    formatIP(ip) {
        // 始终显示完整的IP地址
        return ip;
    }

    // 格式化数字显示
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // =========== 主机通信矩阵 - 第二阶段核心功能 ===========
    renderCommunicationMatrix(network) {
        if (!network || !network.topSources || !network.topDestinations) {
            return '';
        }

        const sources = network.topSources.slice(0, 5);
        const destinations = network.topDestinations.slice(0, 5);
        
        // 创建通信强度矩阵
        const matrix = this.buildCommunicationMatrix(sources, destinations);
        
        return `
            <div style="margin-bottom: 24px;">
                <h4 style="color: #1f2937; margin-bottom: 16px;">🔗 主机通信矩阵 (Communication Matrix)</h4>
                
                <!-- 矩阵摘要 -->
                <div style="background: rgba(16, 185, 129, 0.05); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; align-items: center;">
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                                ${network.uniqueSourceIPs || 0}
                            </div>
                            <div style="font-size: 12px; color: #6b7280;">源主机</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                                ${network.uniqueDestinationIPs || 0}
                            </div>
                            <div style="font-size: 12px; color: #6b7280;">目标主机</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                                ${matrix.totalConnections}
                            </div>
                            <div style="font-size: 12px; color: #6b7280;">活跃连接</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                                ${this.formatFileSize(matrix.totalBytes)}
                            </div>
                            <div style="font-size: 12px; color: #6b7280;">总流量</div>
                        </div>
                    </div>
                </div>

                <!-- 交互式通信矩阵 -->
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                    <h5 style="color: #374151; margin-bottom: 12px; font-size: 14px; font-weight: 600;">📊 通信强度热力图</h5>
                    <div class="communication-matrix" style="overflow-x: auto;">
                        ${this.renderMatrixTable(sources, destinations, matrix.data)}
                    </div>
                </div>

                <!-- 网络拓扑视图 -->
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                    <h5 style="color: #374151; margin-bottom: 12px; font-size: 14px; font-weight: 600;">🌐 网络拓扑图</h5>
                    <div class="network-topology" style="height: 300px; position: relative; background: #f9fafb; border-radius: 6px;">
                        ${this.renderNetworkTopology(sources, destinations, matrix.data)}
                    </div>
                </div>

                <!-- 连接详情 -->
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                    <h5 style="color: #374151; margin-bottom: 12px; font-size: 14px; font-weight: 600;">📋 连接详情</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <h6 style="color: #6b7280; margin-bottom: 8px; font-size: 13px; font-weight: 600;">🔄 主要源主机</h6>
                            ${this.renderHostList(sources, 'source')}
                        </div>
                        <div>
                            <h6 style="color: #6b7280; margin-bottom: 8px; font-size: 13px; font-weight: 600;">🎯 主要目标主机</h6>
                            ${this.renderHostList(destinations, 'destination')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    buildCommunicationMatrix(sources, destinations) {
        const matrixData = {};
        let totalConnections = 0;
        let totalBytes = 0;

        // 创建通信强度数据 (模拟数据，实际应基于真实连接信息)
        sources.forEach(source => {
            matrixData[source.ip] = {};
            destinations.forEach(dest => {
                if (source.ip !== dest.ip) {
                    // 基于流量大小计算通信强度
                    const strength = Math.min(source.bytes, dest.bytes) / Math.max(source.bytes, dest.bytes);
                    const connectionBytes = Math.floor(Math.min(source.bytes, dest.bytes) * strength);
                    
                    matrixData[source.ip][dest.ip] = {
                        strength: strength,
                        bytes: connectionBytes,
                        packets: Math.floor(Math.min(source.packets, dest.packets) * strength),
                        connectionType: this.getConnectionType(source.ip, dest.ip)
                    };
                    
                    totalConnections++;
                    totalBytes += connectionBytes;
                }
            });
        });

        return {
            data: matrixData,
            totalConnections,
            totalBytes
        };
    }

    renderMatrixTable(sources, destinations, matrixData) {
        if (!sources.length || !destinations.length) {
            return '<div style="text-align: center; color: #6b7280; padding: 20px;">暂无通信数据</div>';
        }

        const maxStrength = Math.max(...sources.flatMap(source => 
            destinations.map(dest => matrixData[source.ip]?.[dest.ip]?.strength || 0)
        ));

        return `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr>
                        <th style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; text-align: left; width: 140px;">
                            源主机 \\ 目标主机
                        </th>
                        ${destinations.map(dest => `
                            <th style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; text-align: center; min-width: 80px;">
                                <div style="writing-mode: vertical-rl; text-orientation: mixed;">
                                    ${this.formatIP(dest.ip)}
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${sources.map(source => `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 500;">
                                ${this.formatIP(source.ip)}
                            </td>
                            ${destinations.map(dest => {
                                const connection = matrixData[source.ip]?.[dest.ip];
                                if (!connection || source.ip === dest.ip) {
                                    return `<td style="padding: 8px; border: 1px solid #e5e7eb; background: #f8f9fa; text-align: center;">-</td>`;
                                }
                                
                                const intensity = connection.strength / maxStrength;
                                const color = this.getConnectionColor(intensity);
                                
                                return `
                                    <td class="connection-cell"
                                        data-source-ip="${source.ip}"
                                        data-dest-ip="${dest.ip}"
                                        data-connection-bytes="${connection.bytes || 0}"
                                        data-connection-packets="${connection.packets || 0}"
                                        data-connection-type="${connection.connectionType || 'unknown'}"
                                        style="padding: 4px; border: 1px solid #e5e7eb; text-align: center; background: ${color}; cursor: pointer;"
                                        title="流量: ${this.formatFileSize(connection.bytes)} | 包数: ${connection.packets} | 类型: ${connection.connectionType}">
                                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 2px;">
                                            ${this.formatFileSize(connection.bytes)}
                                        </div>
                                        <div style="font-size: 10px; color: #6b7280;">
                                            ${connection.packets}包
                                        </div>
                                    </td>
                                `;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <!-- 颜色图例 -->
            <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px; font-size: 11px;">
                <span style="color: #6b7280;">通信强度:</span>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 12px; height: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid #e5e7eb;"></div>
                    <span>低</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 12px; height: 12px; background: rgba(59, 130, 246, 0.5); border: 1px solid #e5e7eb;"></div>
                    <span>中</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 12px; height: 12px; background: rgba(59, 130, 246, 0.8); border: 1px solid #e5e7eb;"></div>
                    <span>高</span>
                </div>
            </div>
        `;
    }

    renderNetworkTopology(sources, destinations, matrixData) {
        // 简化的网络拓扑图 - 使用SVG绘制
        const centerX = 50;
        const centerY = 50;
        const radius = 35;
        
        // 计算节点位置
        const sourceNodes = sources.map((source, index) => ({
            ...source,
            x: centerX + radius * Math.cos((index / sources.length) * 2 * Math.PI),
            y: centerY + radius * Math.sin((index / sources.length) * 2 * Math.PI),
            type: 'source'
        }));
        
        const destNodes = destinations.map((dest, index) => ({
            ...dest,
            x: centerX + (radius * 0.6) * Math.cos(((index + 0.5) / destinations.length) * 2 * Math.PI + Math.PI),
            y: centerY + (radius * 0.6) * Math.sin(((index + 0.5) / destinations.length) * 2 * Math.PI + Math.PI),
            type: 'destination'
        }));
        
        const allNodes = [...sourceNodes, ...destNodes];
        
        return `
            <svg width="100%" height="100%" viewBox="0 0 100 100">
                <!-- 连接线 -->
                ${sourceNodes.flatMap(source => 
                    destNodes.map(dest => {
                        const connection = matrixData[source.ip]?.[dest.ip];
                        if (!connection) return '';
                        
                        const opacity = Math.min(connection.strength * 2, 1);
                        const strokeWidth = Math.max(connection.strength * 3, 0.2);
                        
                        return `
                            <line x1="${source.x}%" y1="${source.y}%" 
                                  x2="${dest.x}%" y2="${dest.y}%" 
                                  stroke="#3b82f6" stroke-width="${strokeWidth}" 
                                  opacity="${opacity}"
                                  stroke-dasharray="${connection.connectionType === 'external' ? '2,2' : ''}">
                                <title>${this.formatIP(source.ip)} → ${this.formatIP(dest.ip)}: ${this.formatFileSize(connection.bytes)}</title>
                            </line>
                        `;
                    })
                ).join('')}
                
                <!-- 节点 -->
                ${allNodes.map(node => `
                    <circle cx="${node.x}%" cy="${node.y}%" r="${Math.max(node.bytes / 1000000, 0.5)}%" 
                            fill="${node.type === 'source' ? '#10b981' : '#ef4444'}" 
                            stroke="white" stroke-width="0.3" opacity="0.8">
                        <title>${this.formatIP(node.ip)}: ${this.formatFileSize(node.bytes)}</title>
                    </circle>
                    <text x="${node.x}%" y="${node.y + 4}%" 
                          text-anchor="middle" font-size="2" fill="#1f2937" font-weight="500">
                        ${this.formatIP(node.ip)}
                    </text>
                `).join('')}
            </svg>
            
            <!-- 图例 -->
            <div style="position: absolute; top: 8px; right: 8px; background: rgba(255, 255, 255, 0.9); padding: 8px; border-radius: 4px; font-size: 11px; border: 1px solid #e5e7eb;">
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                    <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
                    <span>源主机</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                    <div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></div>
                    <span>目标主机</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 12px; height: 1px; background: #3b82f6; border-style: dashed;"></div>
                    <span>外部连接</span>
                </div>
            </div>
        `;
    }

    renderHostList(hosts, type) {
        return hosts.map((host, index) => `
            <div style="padding: 8px; background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; border-radius: 4px; margin-bottom: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 500; color: #374151; font-size: 13px; margin-bottom: 2px;">
                            ${this.formatIP(host.ip)}
                        </div>
                        <div style="font-size: 11px; color: #6b7280;">
                            ${this.getHostType(host.ip)} | ${this.getLocationInfo(host.ip)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: #1f2937; font-size: 12px;">
                            ${this.formatFileSize(host.bytes)}
                        </div>
                        <div style="font-size: 10px; color: #6b7280;">
                            ${host.packets} 包
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 辅助方法
    getConnectionColor(intensity) {
        if (intensity < 0.3) return 'rgba(59, 130, 246, 0.1)';
        if (intensity < 0.6) return 'rgba(59, 130, 246, 0.3)';
        if (intensity < 0.8) return 'rgba(59, 130, 246, 0.5)';
        return 'rgba(59, 130, 246, 0.8)';
    }

    getConnectionType(sourceIP, destIP) {
        const isSourcePrivate = this.isPrivateIP(sourceIP);
        const isDestPrivate = this.isPrivateIP(destIP);
        
        if (isSourcePrivate && isDestPrivate) return 'internal';
        if (!isSourcePrivate && !isDestPrivate) return 'external';
        return 'mixed';
    }



    getHostType(ip) {
        return this.isPrivateIP(ip) ? '内网' : '外网';
    }

    getLocationInfo(ip) {
        // 简化的位置信息，实际应该使用GeoIP数据库
        if (this.isPrivateIP(ip)) {
            return '本地网络';
        }
        return '远程主机';
    }

    showConnectionDetails(sourceIP, destIP, connection) {
        this.showNotification(`查看连接详情: ${sourceIP} → ${destIP}`, 'info');
        // TODO: 实现连接详情模态框

    }

    // 新增：展示分析摘要卡片
    async showAnalysisSummary(fileId) {
        const summaryDiv = document.getElementById('analysisSummary');
        summaryDiv.innerHTML = '<div style="text-align:center;padding:32px;"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
        try {
            const result = await this.apiCall(`/api/analysis/${fileId}`);
            if (!result.success) throw new Error('获取分析结果失败');
            const file = this.files.find(f => f._id === fileId);
            const analysis = result.data.results;
            const topProtocols = (analysis.protocols || []).slice(0, 3);
            const anomaliesCount = (analysis.anomalies || []).length;
            const topConversationsCount = Math.min(
                (analysis.network?.topSources || []).length * 
                (analysis.network?.topDestinations || []).length, 
                5
            );
            summaryDiv.innerHTML = `
                <div class="analysis-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                    <div style="padding: 24px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
                        <div class="analysis-header" style="margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <i class="fas fa-file-alt" style="font-size: 18px; opacity: 0.9;"></i>
                                <div class="analysis-title" style="font-size: 18px; font-weight: 600;">${file.originalName}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div class="analysis-status" style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; border: 1px solid rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-check-circle"></i>
                                    分析完成
                                </div>
                                <div style="color: rgba(255, 255, 255, 0.8); font-size: 13px;">
                                    ${new Date(file.uploadedAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div style="background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: rgba(255, 255, 255, 0.95);">🚀 一眼看懂</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${this.formatFileSize(analysis.summary?.totalBytes || 0)}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">总流量</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${topProtocols.length}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">主要协议</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${topConversationsCount}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">通信对话</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #facc15;">${anomaliesCount}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">发现问题</div>
                                </div>
                            </div>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <span style="font-size: 13px; color: #facc15; font-weight: 600;">${anomaliesCount > 0 ? `⚠️ 发现 ${anomaliesCount} 个问题` : '网络健康'}</span>
                            <span style="margin-left: 16px; color: #a5b4fc; font-size: 13px;">网络活动: ${(analysis.summary?.pps || 0).toFixed(1)} 包/秒</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            summaryDiv.innerHTML = `<div style="color:#ef4444; text-align:center; padding:32px;">加载摘要失败: ${error.message}</div>`;
        }
    }
}

// 应用初始化
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NetInsightApp();
    // 添加到全局作用域供HTML调用
    window.app = app;
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
}); 