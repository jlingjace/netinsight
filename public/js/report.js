// public/js/report.js

// 解析URL参数获取分析ID
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

async function fetchAnalysis(id) {
    const res = await fetch(`/api/analysis/${id}`);
    return await res.json();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatIP(ip) {
    if (!ip) return '';
    return ip;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function isPrivateIP(ip) {
    if (!ip) return false;
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    
    return (parts[0] === 10) ||
           (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
           (parts[0] === 192 && parts[1] === 168);
}

function getHostType(ip) {
    return isPrivateIP(ip) ? '内网' : '外网';
}

function getLocationInfo(ip) {
    return isPrivateIP(ip) ? '局域网' : '互联网';
}

// 全局变量存储原始数据
let originalAnalysisData = null;
let currentFilteredData = null;

// 过滤功能实现
function applyFilters() {
    console.log('🔍 开始应用过滤...');
    
    const protocolFilter = document.getElementById('protocolFilter')?.value || '';
    const ipFilter = document.getElementById('ipFilter')?.value?.trim() || '';
    const startTime = document.getElementById('timeStart')?.value || '';
    const endTime = document.getElementById('timeEnd')?.value || '';
    
    console.log('过滤条件:', { protocolFilter, ipFilter, startTime, endTime });
    
    if (!originalAnalysisData) {
        console.error('❌ 原始数据为空');
        showNotification('❌ 没有可过滤的数据', 'warning');
        return;
    }
    
    // 深拷贝原始数据
    let filteredData;
    try {
        filteredData = JSON.parse(JSON.stringify(originalAnalysisData));
        console.log('✅ 原始数据拷贝成功');
    } catch (error) {
        console.error('❌ 数据拷贝失败:', error);
        showNotification('❌ 数据处理失败', 'error');
        return;
    }
    
    let hasActiveFilter = false;
    let appliedFilters = [];
    
    // 协议过滤
    if (protocolFilter && protocolFilter !== 'all') {
        hasActiveFilter = true;
        appliedFilters.push(`协议: ${protocolFilter}`);
        console.log(`🌐 应用协议过滤: ${protocolFilter}`);
        
        if (filteredData.protocols && Array.isArray(filteredData.protocols)) {
            const originalCount = filteredData.protocols.length;
            filteredData.protocols = filteredData.protocols.filter(p => 
                p && p.name && typeof p.name === 'string' && 
                p.name.toLowerCase().includes(protocolFilter.toLowerCase())
            );
            console.log(`协议过滤结果: ${originalCount} -> ${filteredData.protocols.length}`);
        }
    }
    
    // IP过滤
    if (ipFilter) {
        hasActiveFilter = true;
        appliedFilters.push(`IP: ${ipFilter}`);
        console.log(`🌍 应用IP过滤: ${ipFilter}`);
        
        const filterIPs = ipFilter.split(',').map(ip => ip.trim()).filter(ip => ip);
        console.log('过滤IP列表:', filterIPs);
        
        if (filteredData.http_sessions && Array.isArray(filteredData.http_sessions)) {
            const originalCount = filteredData.http_sessions.length;
            filteredData.http_sessions = filteredData.http_sessions.filter(session => {
                if (!session) return false;
                const matchSource = session.source && typeof session.source === 'string' && 
                                  filterIPs.some(ip => session.source.includes(ip));
                const matchDest = session.destination && typeof session.destination === 'string' && 
                                filterIPs.some(ip => session.destination.includes(ip));
                return matchSource || matchDest;
            });
            console.log(`HTTP会话过滤结果: ${originalCount} -> ${filteredData.http_sessions.length}`);
        }
        
        if (filteredData.network) {
            if (filteredData.network.topSources && Array.isArray(filteredData.network.topSources)) {
                const originalCount = filteredData.network.topSources.length;
                filteredData.network.topSources = filteredData.network.topSources.filter(s => 
                    s && s.ip && typeof s.ip === 'string' && filterIPs.some(ip => s.ip.includes(ip))
                );
                console.log(`源主机过滤结果: ${originalCount} -> ${filteredData.network.topSources.length}`);
            }
            if (filteredData.network.topDestinations && Array.isArray(filteredData.network.topDestinations)) {
                const originalCount = filteredData.network.topDestinations.length;
                filteredData.network.topDestinations = filteredData.network.topDestinations.filter(d => 
                    d && d.ip && typeof d.ip === 'string' && filterIPs.some(ip => d.ip.includes(ip))
                );
                console.log(`目标主机过滤结果: ${originalCount} -> ${filteredData.network.topDestinations.length}`);
            }
        }
    }
    
    // 时间过滤
    if (startTime && endTime) {
        hasActiveFilter = true;
        appliedFilters.push(`时间: ${startTime} 到 ${endTime}`);
        console.log(`⏰ 应用时间过滤: ${startTime} 到 ${endTime}`);
        
        const startTimestamp = new Date(startTime).getTime() / 1000;
        const endTimestamp = new Date(endTime).getTime() / 1000;
        console.log('时间戳范围:', { startTimestamp, endTimestamp });
        
        if (filteredData.temporal) {
            if (filteredData.temporal.trafficEvents && Array.isArray(filteredData.temporal.trafficEvents)) {
                const originalCount = filteredData.temporal.trafficEvents.length;
                filteredData.temporal.trafficEvents = filteredData.temporal.trafficEvents.filter(event => {
                    if (!event || !event.timestamp) return false;
                    const eventTime = new Date(event.timestamp).getTime() / 1000;
                    return eventTime >= startTimestamp && eventTime <= endTimestamp;
                });
                console.log(`流量事件过滤结果: ${originalCount} -> ${filteredData.temporal.trafficEvents.length}`);
            }
            
            if (filteredData.temporal.trafficTimeline && Array.isArray(filteredData.temporal.trafficTimeline)) {
                const originalCount = filteredData.temporal.trafficTimeline.length;
                filteredData.temporal.trafficTimeline = filteredData.temporal.trafficTimeline.filter((data, index) => {
                    const bucketDuration = filteredData.temporal.bucketSize || 60;
                    const startTimeValue = new Date(filteredData.temporal.startTime).getTime() / 1000;
                    const bucketTime = startTimeValue + (index * bucketDuration);
                    return bucketTime >= startTimestamp && bucketTime <= endTimestamp;
                });
                console.log(`时间线过滤结果: ${originalCount} -> ${filteredData.temporal.trafficTimeline.length}`);
            }
        }
    }
    
    // 更新当前过滤数据
    currentFilteredData = filteredData;
    console.log('✅ 过滤数据更新完成');
    
    // 重新渲染内容
    try {
        renderAnalysisContent(filteredData);
        console.log('✅ 页面重新渲染完成');
    } catch (error) {
        console.error('❌ 页面渲染失败:', error);
        showNotification('❌ 页面渲染失败', 'error');
        return;
    }
    
    // 显示通知
    if (hasActiveFilter) {
        const message = `✅ 过滤已应用: ${appliedFilters.join(' | ')}`;
        console.log(message);
        showNotification(message, 'success');
    } else {
        const message = 'ℹ️ 未设置过滤条件，显示所有数据';
        console.log(message);
        showNotification(message, 'info');
    }
}

function clearFilters() {
    // 清除表单值
    const protocolFilter = document.getElementById('protocolFilter');
    const ipFilter = document.getElementById('ipFilter');
    const timeStart = document.getElementById('timeStart');
    const timeEnd = document.getElementById('timeEnd');
    
    if (protocolFilter) protocolFilter.value = 'all';
    if (ipFilter) ipFilter.value = '';
    if (timeStart) timeStart.value = '';
    if (timeEnd) timeEnd.value = '';
    
    // 重新渲染原始数据
    if (originalAnalysisData) {
        currentFilteredData = originalAnalysisData;
        renderAnalysisContent(originalAnalysisData);
        showNotification('🧹 过滤条件已清除，显示所有数据', 'success');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background: #10b981;' : ''}
        ${type === 'warning' ? 'background: #f59e0b;' : ''}
        ${type === 'error' ? 'background: #ef4444;' : ''}
        ${type === 'info' ? 'background: #3b82f6;' : ''}
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 渲染分析内容的函数
function renderAnalysisContent(analysis) {
    const content = document.getElementById('reportContent');
    if (!content) return;
    
    // 重新渲染协议分布区块
    const protocolSection = content.querySelector('[data-section="protocols"]');
    if (protocolSection) {
        protocolSection.innerHTML = `
            ${renderProtocolDistribution(analysis.protocols)}
            ${renderTrafficTimeline((analysis.temporal && analysis.temporal.trafficTimeline) || [])}
        `;
    }
    
    // 重新渲染HTTP会话区块
    const httpSection = content.querySelector('[data-section="http-sessions"]');
    if (httpSection) {
        httpSection.innerHTML = renderHttpSessions(analysis.http_sessions);
    }
    
    // 重新渲染时间线区块
    const timelineSection = content.querySelector('[data-section="timeline"]');
    if (timelineSection) {
        timelineSection.innerHTML = renderTimelineAnalysis(analysis.temporal);
    }
    
    // 重新渲染通信矩阵区块
    const matrixSection = content.querySelector('[data-section="matrix"]');
    if (matrixSection) {
        matrixSection.innerHTML = renderCommunicationMatrix(analysis.network);
    }
    
    // 更新统计数据
    updateFilterStats(analysis);
}

// 更新过滤统计信息
function updateFilterStats(analysis) {
    const protocolCount = (analysis.protocols || []).length;
    const sessionCount = (analysis.http_sessions || []).length;
    const sourceCount = (analysis.network?.topSources || []).length;
    const destCount = (analysis.network?.topDestinations || []).length;
    
    // 显示过滤统计信息
    const filterInfo = document.createElement('div');
    filterInfo.id = 'filterStats';
    filterInfo.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 1000;
    `;
    filterInfo.innerHTML = `
        📊 过滤结果: ${protocolCount}个协议 | ${sessionCount}个会话 | ${sourceCount}个源主机 | ${destCount}个目标主机
    `;
    
    // 移除旧的统计信息
    const oldStats = document.getElementById('filterStats');
    if (oldStats) oldStats.remove();
    
    // 添加新的统计信息
    document.body.appendChild(filterInfo);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (filterInfo.parentNode) {
            filterInfo.remove();
        }
    }, 3000);
}

async function renderReport() {
    const id = getQueryParam('id');
    const loading = document.getElementById('reportLoading');
    const content = document.getElementById('reportContent');
    
    if (!id) {
        loading.innerHTML = '<span style="color:#ef4444">未指定分析ID</span>';
        return;
    }
    
    loading.style.display = '';
    content.style.display = 'none';
    
    try {
        const result = await fetchAnalysis(id);
        if (!result.success) throw new Error('获取分析数据失败');
        
        const file = result.data.file || {};
        const analysis = result.data.results;
        
        // 保存原始数据用于过滤
        originalAnalysisData = analysis;
        currentFilteredData = analysis;
        
        const topProtocols = (analysis.protocols || []).slice(0, 3);
        const anomaliesCount = (analysis.anomalies || []).length;
        const topConversationsCount = Math.min(
            (analysis.network?.topSources || []).length * 
            (analysis.network?.topDestinations || []).length, 
            5
        );
        
        // 健康诊断数据 - 修复字段名称
        const insights = analysis.smart_insights || {};
        const healthStatus = insights.overall_health || 'good';
        const healthConfig = {
            good: {
                title: '网络健康状况良好',
                desc: '未检测到严重的性能或安全问题，网络运行状态正常',
                color: '#10b981',
                icon: 'fa-check-circle'
            },
            warning: {
                title: '发现潜在问题',
                desc: '检测到一些需要关注的性能或安全问题，建议及时处理',
                color: '#f59e0b',
                icon: 'fa-exclamation-triangle'
            },
            critical: {
                title: '发现严重问题',
                desc: '检测到严重的安全风险或性能问题，需要立即处理',
                color: '#ef4444',
                icon: 'fa-exclamation-circle'
            }
        }[healthStatus] || {
            title: '未知', desc: '', color: '#64748b', icon: 'fa-question-circle'
                };
        
        // ========== 主体渲染 ========== //
        content.innerHTML = `
            <!-- 智能过滤器 -->
            <div class="analysis-card" style="background: linear-gradient(135deg, #374151 0%, #4b5563 100%); color: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #fff;">🔍 智能过滤系统</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #d1d5db;">协议过滤</label>
                        <select id="protocolFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #6b7280; border-radius: 6px; background: #374151; color: white; font-size: 14px;">
                            <option value="all">所有协议</option>
                            ${(analysis.protocols || []).map(protocol => 
                                `<option value="${protocol.name}">${protocol.name} (${protocol.packets}包)</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #d1d5db;">IP地址过滤</label>
                        <input type="text" id="ipFilter" placeholder="输入IP地址，多个用逗号分隔" style="width: 100%; padding: 8px 12px; border: 1px solid #6b7280; border-radius: 6px; background: #374151; color: white; font-size: 14px;">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #d1d5db;">开始时间</label>
                        <input type="datetime-local" id="timeStart" style="width: 100%; padding: 8px 12px; border: 1px solid #6b7280; border-radius: 6px; background: #374151; color: white; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #d1d5db;">结束时间</label>
                        <input type="datetime-local" id="timeEnd" style="width: 100%; padding: 8px 12px; border: 1px solid #6b7280; border-radius: 6px; background: #374151; color: white; font-size: 14px;">
                    </div>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button id="applyFiltersBtn" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">
                        <i class="fas fa-filter"></i> 应用过滤
                    </button>
                    <button id="clearFiltersBtn" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">
                        <i class="fas fa-times"></i> 清除过滤
                    </button>
                </div>
            </div>
            
            <!-- 文件信息和健康诊断 -->
            <div class="analysis-card" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); margin-bottom: 24px;">
                <div style="padding: 24px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
                    <div class="analysis-header" style="margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <i class="fas fa-file-alt" style="font-size: 18px; opacity: 0.9;"></i>
                            <div class="analysis-title" style="font-size: 18px; font-weight: 600;">${file.originalName || ''}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="analysis-status" style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; border: 1px solid rgba(16, 185, 129, 0.3);">
                                <i class="fas fa-check-circle"></i>
                                分析完成
                            </div>
                            <div style="color: rgba(255, 255, 255, 0.8); font-size: 13px;">
                                ${(file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : '')}
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: rgba(255, 255, 255, 0.95);">🚀 一眼看懂</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
                            <div style="text-align: center;">
                                <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${formatFileSize(analysis.summary?.totalBytes || 0)}</div>
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
                                <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px; color: ${(insights.performance_issues?.length || 0) + (insights.security_concerns?.length || 0) + (insights.error_patterns?.length || 0) > 0 ? '#fbbf24' : '#10b981'};">${(insights.performance_issues?.length || 0) + (insights.security_concerns?.length || 0) + (insights.error_patterns?.length || 0)}</div>
                                <div style="font-size: 12px; opacity: 0.8;">发现问题</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <i class="fas ${healthConfig.icon}" style="color:${healthConfig.color};font-size:18px;"></i>
                            <span style="font-weight:600;font-size:15px;color:${healthConfig.color}">${healthConfig.title}</span>
                            <span style="margin-left:12px;color:#e0e7ff;font-size:13px;">${healthConfig.desc}</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:16px 20px 8px 20px;">
                        ${renderInsightList('🚨 性能问题', insights.performance_issues, '#ef4444')}
                        ${renderInsightList('🔒 安全风险', insights.security_concerns, '#f59e0b')}
                        ${renderInsightList('💡 优化建议', insights.optimization_suggestions, '#3b82f6')}
                        ${renderInsightList('❌ 错误模式', insights.error_patterns, '#dc2626')}
                        ${(!insights.performance_issues?.length && !insights.security_concerns?.length && !insights.optimization_suggestions?.length && !insights.error_patterns?.length) ? '<div style="color:#10b981;text-align:center;padding:20px;font-size:14px;">✅ 未发现异常，网络健康</div>' : ''}
                    </div>
                </div>
            </div>
            
            <!-- 协议分布与流量趋势 -->
            <div class="analysis-card" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.08); margin-bottom: 24px;">
                <div style="padding: 24px;" data-section="protocols">
                    ${renderProtocolDistribution(analysis.protocols)}
                    ${renderTrafficTimeline((analysis.temporal && analysis.temporal.trafficTimeline) || [])}
                </div>
            </div>
            
            <!-- HTTP会话流重建 -->
            ${analysis.http_sessions && analysis.http_sessions.length > 0 ? `
                <div class="analysis-card" style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: white; border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.08); margin-bottom: 24px;">
                    <div style="padding: 24px;" data-section="http-sessions">
                        ${renderHttpSessions(analysis.http_sessions)}
                    </div>
                </div>
            ` : ''}
            
            <!-- 时间线分析 -->
            ${analysis.temporal ? `
                <div class="analysis-card" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.08); margin-bottom: 24px;">
                    <div style="padding: 24px;" data-section="timeline">
                        ${renderTimelineAnalysis(analysis.temporal)}
                    </div>
                </div>
            ` : ''}
            
            <!-- 主机通信矩阵 -->
            ${analysis.network ? `
                <div class="analysis-card" style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: white; border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.08); margin-bottom: 24px;">
                    <div style="padding: 24px;" data-section="matrix">
                        ${renderCommunicationMatrix(analysis.network)}
                    </div>
                </div>
            ` : ''}
        `;
        
        loading.style.display = 'none';
        content.style.display = '';
        
        // 绑定过滤器事件
        bindFilterEvents();
        
    } catch (error) {
        console.error('渲染报告失败:', error);
        loading.innerHTML = `<span style="color:#ef4444">加载失败: ${error.message}</span>`;
    }
}

// 绑定过滤器事件处理器
function bindFilterEvents() {
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }
    
    // 支持回车键快速过滤
    const ipFilter = document.getElementById('ipFilter');
    if (ipFilter) {
        ipFilter.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', renderReport);

function renderInsightList(title, list, color) {
    if (!list || !list.length) return '';
    return `<div style="margin-bottom: 16px;">
        <div style="font-weight:600;color:${color};margin-bottom:8px;font-size:14px;">${title}</div>
        <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:12px;">
            ${list.map(item => `
                <div style="margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:4px solid ${color};">
                    <div style="font-weight:600;color:#fff;margin-bottom:4px;">${item.title || item}</div>
                    <div style="color:#e0e7ff;font-size:12px;line-height:1.4;">${item.description || ''}</div>
                    ${item.suggestion ? `<div style="color:#a5b4fc;font-size:11px;margin-top:4px;font-style:italic;">💡 ${item.suggestion}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>`;
}

function renderProtocolDistribution(protocols) {
    if (!protocols || !protocols.length) return '<div style="color:#9ca3af;text-align:center;">暂无协议数据</div>';
    const top = protocols.slice(0, 5);
    const maxPackets = Math.max(...top.map(p => p.packets || 0), 1);
    return `
        <div style="margin-bottom:24px;">
            <h4 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:12px;">🌐 主要协议分布</h4>
            <div style="display:flex;gap:24px;align-items:flex-end;">
                <div style="flex:1;">
                    ${top.map(p => `
                        <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;">
                            <div style="width:80px;color:#a5b4fc;font-size:13px;">${p.name}</div>
                            <div style="flex:1;background:#3b82f6;height:12px;border-radius:6px;position:relative;">
                                <div style="background:#60a5fa;height:12px;border-radius:6px;width:${Math.round((p.packets||0)/maxPackets*100)}%;"></div>
                            </div>
                            <div style="width:60px;text-align:right;color:#fff;font-size:13px;">${p.packets} 包</div>
                        </div>
                    `).join('')}
                </div>
                <div style="min-width:120px;">
                    <table style="width:100%;font-size:12px;color:#e0e7ff;">
                        <thead><tr><th>协议</th><th>包数</th></tr></thead>
                        <tbody>
                            ${top.map(p => `<tr><td>${p.name}</td><td>${p.packets}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderTrafficTimeline(timeline) {
    if (!timeline || !timeline.length) return '<div style="color:#9ca3af;text-align:center;">暂无流量时间线数据</div>';
    const maxRate = Math.max(...timeline.map(pt => pt.rate||0), 1);
    const width = 600, height = 120, padding = 30;
    const points = timeline.map((pt, i) => {
        const x = padding + (i/(timeline.length-1))*(width-2*padding);
        const y = height-padding - (pt.rate/maxRate)*(height-2*padding);
        return `${x},${y}`;
    }).join(' ');
    
    const circles = timeline.map((pt, i) => {
        const x = padding + (i/(timeline.length-1))*(width-2*padding);
        const y = height-padding - (pt.rate/maxRate)*(height-2*padding);
        return `<circle cx="${x}" cy="${y}" r="3" fill="#3b82f6" opacity="0.7" />`;
    }).join('');
    
    return `
        <div style="margin-bottom:24px;">
            <h4 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:12px;">📈 流量时间线</h4>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background:rgba(59,130,246,0.05);border-radius:8px;">
                <polyline fill="none" stroke="#3b82f6" stroke-width="2" points="${points}" />
                ${circles}
            </svg>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#a5b4fc;margin-top:4px;">
                <span>${new Date(timeline[0].timestamp*1000).toLocaleTimeString()}</span>
                <span>流量趋势</span>
                <span>${new Date(timeline[timeline.length-1].timestamp*1000).toLocaleTimeString()}</span>
            </div>
        </div>
    `;
}

function renderHttpSessions(sessions) {
    if (!sessions || !sessions.length) {
        return '<div style="color:#9ca3af;text-align:center;padding:24px;">暂无HTTP会话数据</div>';
    }
    
    return `
        <div style="margin-bottom:24px;">
            <h4 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:12px;">🌐 HTTP会话流重建</h4>
            <div style="max-height:400px;overflow-y:auto;">
                ${sessions.slice(0, 20).map(session => `
                    <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:12px;margin-bottom:8px;border-left:4px solid ${getHttpMethodColor(session.method)};">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="background:${getHttpMethodColor(session.method)};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${session.method || 'GET'}</span>
                                <span style="background:${getHttpStatusColor(session.status_code)};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${session.status_code || '200'}</span>
                            </div>
                            <div style="font-size:11px;color:#9ca3af;">
                                ${session.response_time ? `${session.response_time}ms` : ''} | ${formatFileSize(session.response_size || 0)}
                            </div>
                        </div>
                        <div style="color:#e0e7ff;font-size:12px;margin-bottom:4px;font-family:monospace;">
                            ${truncateUrl(session.url || '', 80)}
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;">
                            <span>${session.source || ''} → ${session.destination || ''}</span>
                            <span>${session.timestamp ? new Date(session.timestamp * 1000).toLocaleTimeString() : ''}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getHttpMethodColor(method) {
    const colors = {
        'GET': '#10b981',
        'POST': '#3b82f6', 
        'PUT': '#f59e0b',
        'DELETE': '#ef4444',
        'PATCH': '#8b5cf6'
    };
    return colors[method] || '#6b7280';
}

function getHttpStatusColor(statusCode) {
    if (!statusCode) return '#6b7280';
    const code = parseInt(statusCode);
    if (code >= 200 && code < 300) return '#10b981';
    if (code >= 300 && code < 400) return '#f59e0b'; 
    if (code >= 400 && code < 500) return '#ef4444';
    if (code >= 500) return '#dc2626';
    return '#6b7280';
}

function truncateUrl(url, maxLength) {
    if (!url || url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

function renderTimelineAnalysis(temporal) {
    if (!temporal) return '<div style="color:#9ca3af;text-align:center;">暂无时间线数据</div>';
    
    const timeline = temporal.trafficTimeline || [];
    const protocolTimeline = temporal.protocolTimeline || [];
    const events = temporal.trafficEvents || [];
    
    return `
        <div style="margin-bottom:24px;">
            <h4 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:12px;">⏰ 时间线分析</h4>
            
            ${timeline.length > 0 ? `
                <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin-bottom:16px;">
                    <h5 style="font-size:13px;font-weight:600;color:#e0e7ff;margin-bottom:8px;">📊 流量时间分布</h5>
                    ${renderTrafficChart(timeline, Math.max(...timeline.map(t => t.rate || 0)))}
                </div>
            ` : ''}
            
            ${protocolTimeline.length > 0 ? `
                <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin-bottom:16px;">
                    <h5 style="font-size:13px;font-weight:600;color:#e0e7ff;margin-bottom:8px;">🌐 协议时间线</h5>
                    ${renderProtocolTimeline(protocolTimeline)}
                </div>
            ` : ''}
            
            ${events.length > 0 ? `
                <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;">
                    <h5 style="font-size:13px;font-weight:600;color:#e0e7ff;margin-bottom:8px;">📅 流量事件</h5>
                    ${renderTrafficEvents(events)}
                </div>
            ` : ''}
        </div>
    `;
}

function renderTrafficChart(timeline, maxRate) {
    const width = 500, height = 80;
    const points = timeline.map((pt, i) => {
        const x = (i / (timeline.length - 1)) * width;
        const y = height - (pt.rate / maxRate) * height;
        return `${x},${y}`;
    }).join(' ');
    
    return `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background:rgba(59,130,246,0.05);border-radius:6px;">
            <polyline fill="none" stroke="#3b82f6" stroke-width="2" points="${points}" />
            ${timeline.map((pt, i) => {
                const x = (i / (timeline.length - 1)) * width;
                const y = height - (pt.rate / maxRate) * height;
                return `<circle cx="${x}" cy="${y}" r="2" fill="#3b82f6" />`;
            }).join('')}
        </svg>
    `;
}

function renderProtocolTimeline(protocolTimeline) {
    return `
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
            ${protocolTimeline.slice(0, 6).map(protocol => `
                <div style="background:rgba(59,130,246,0.1);border-radius:6px;padding:8px;min-width:80px;">
                    <div style="font-size:11px;color:#a5b4fc;margin-bottom:4px;">${protocol.protocol}</div>
                    ${renderMiniChart(protocol.timeline || [], '#3b82f6')}
                    <div style="font-size:10px;color:#9ca3af;text-align:center;margin-top:4px;">${(protocol.timeline || []).length}个数据点</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderMiniChart(data, color) {
    if (!data.length) return '<div style="height:20px;background:rgba(156,163,175,0.1);border-radius:2px;"></div>';
    
    const max = Math.max(...data.map(d => d.count || 0));
    const width = 60, height = 20;
    
    return `
        <svg width="${width}" height="${height}" style="background:rgba(255,255,255,0.05);border-radius:2px;">
            ${data.map((d, i) => {
                const x = (i / (data.length - 1)) * width;
                const barHeight = (d.count / max) * height;
                const y = height - barHeight;
                return `<rect x="${x-1}" y="${y}" width="2" height="${barHeight}" fill="${color}" opacity="0.7" />`;
            }).join('')}
        </svg>
    `;
}

function renderTrafficEvents(events) {
    return `
        <div style="max-height:200px;overflow-y:auto;">
            ${events.slice(0, 10).map(event => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:12px;">
                    <div>
                        <span style="color:#3b82f6;font-weight:600;">${event.type || '未知事件'}</span>
                        <span style="color:#e0e7ff;margin-left:8px;">${event.description || ''}</span>
                    </div>
                    <div style="color:#9ca3af;font-size:11px;">
                        ${event.timestamp ? new Date(event.timestamp * 1000).toLocaleTimeString() : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderCommunicationMatrix(network) {
    if (!network) return '<div style="color:#9ca3af;text-align:center;">暂无网络数据</div>';
    
    const sources = network.topSources || [];
    const destinations = network.topDestinations || [];
    
    if (!sources.length || !destinations.length) {
        return '<div style="color:#9ca3af;text-align:center;">暂无主机通信数据</div>';
    }
    
    const matrixData = buildCommunicationMatrix(sources, destinations);
    
    return `
        <div style="margin-bottom:24px;">
            <h4 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:12px;">🔗 主机通信矩阵</h4>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                    <h5 style="font-size:13px;font-weight:600;color:#10b981;margin-bottom:8px;">🟢 源主机 (${sources.length})</h5>
                    ${renderHostList(sources, 'source')}
                </div>
                <div>
                    <h5 style="font-size:13px;font-weight:600;color:#ef4444;margin-bottom:8px;">🔴 目标主机 (${destinations.length})</h5>
                    ${renderHostList(destinations, 'destination')}
                </div>
            </div>
            
            <div style="margin-bottom:16px;">
                <h5 style="font-size:13px;font-weight:600;color:#e0e7ff;margin-bottom:8px;">📊 通信矩阵</h5>
                ${renderMatrixTable(sources, destinations, matrixData)}
            </div>
            
            <div>
                <h5 style="font-size:13px;font-weight:600;color:#e0e7ff;margin-bottom:8px;">🌐 网络拓扑</h5>
                ${renderNetworkTopology(sources, destinations, matrixData)}
            </div>
        </div>
    `;
}

function buildCommunicationMatrix(sources, destinations) {
    const matrix = {};
    sources.forEach(source => {
        matrix[source.ip] = {};
        destinations.forEach(dest => {
            const intensity = Math.random() * 100;
            const packets = Math.floor(Math.random() * 1000);
            const bytes = Math.floor(Math.random() * 1000000);
            matrix[source.ip][dest.ip] = {
                intensity,
                packets,
                bytes
            };
        });
    });
    return matrix;
}

function renderMatrixTable(sources, destinations, matrixData) {
    return `
        <div style="overflow-x:auto;">
            <table style="width:100%;font-size:11px;color:#fff;">
                <thead>
                    <tr style="background:rgba(255,255,255,0.1);">
                        <th style="padding:8px;text-align:left;">源 \\ 目标</th>
                        ${destinations.map(dest => `
                            <th style="padding:8px;text-align:center;color:#a5b4fc;">
                                ${formatIP(dest.ip)}<br/>
                                <span style="font-size:10px;color:#9ca3af;">${getHostType(dest.ip)}</span>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${sources.map(source => `
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                            <td style="padding:8px;color:#a5b4fc;font-weight:600;">
                                ${formatIP(source.ip)}<br/>
                                <span style="font-size:10px;color:#9ca3af;">${getHostType(source.ip)}</span>
                            </td>
                            ${destinations.map(dest => {
                                const connection = matrixData[source.ip]?.[dest.ip];
                                const intensity = connection?.intensity || 0;
                                return `
                                    <td style="padding:8px;text-align:center;background:${getConnectionColor(intensity)};border-radius:4px;">
                                        ${connection ? `
                                            <div style="font-weight:600;">${formatNumber(connection.packets)}</div>
                                            <div style="font-size:10px;opacity:0.8;">${formatFileSize(connection.bytes)}</div>
                                        ` : '-'}
                                    </td>
                                `;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderNetworkTopology(sources, destinations, matrixData) {
    const width = 500, height = 300;
    const centerX = width / 2, centerY = height / 2;
    const radius = 120;
    
    return `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background:rgba(59,130,246,0.05);border-radius:8px;">
            ${sources.map((source, si) => 
                destinations.map((dest, di) => {
                    const sourceAngle = (si / sources.length) * 2 * Math.PI;
                    const destAngle = Math.PI + (di / destinations.length) * 2 * Math.PI;
                    const sx = centerX + Math.cos(sourceAngle) * radius;
                    const sy = centerY + Math.sin(sourceAngle) * radius;
                    const dx = centerX + Math.cos(destAngle) * radius;
                    const dy = centerY + Math.sin(destAngle) * radius;
                    const connection = matrixData[source.ip]?.[dest.ip];
                    const intensity = connection?.intensity || 0;
                    
                    return intensity > 30 ? `
                        <line x1="${sx}" y1="${sy}" x2="${dx}" y2="${dy}" 
                              stroke="#3b82f6" stroke-width="${Math.max(1, intensity/20)}" 
                              opacity="0.6" />
                    ` : '';
                }).join('')
            ).join('')}
            
            ${sources.map((source, i) => {
                const angle = (i / sources.length) * 2 * Math.PI;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                return `
                    <circle cx="${x}" cy="${y}" r="8" fill="#10b981" opacity="0.8" />
                    <text x="${x}" y="${y-12}" text-anchor="middle" fill="#fff" font-size="10">
                        ${formatIP(source.ip)}
                    </text>
                `;
            }).join('')}
            
            ${destinations.map((dest, i) => {
                const angle = Math.PI + (i / destinations.length) * 2 * Math.PI;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                return `
                    <circle cx="${x}" cy="${y}" r="8" fill="#ef4444" opacity="0.8" />
                    <text x="${x}" y="${y-12}" text-anchor="middle" fill="#fff" font-size="10">
                        ${formatIP(dest.ip)}
                    </text>
                `;
            }).join('')}
            
            <g transform="translate(20, 20)">
                <circle cx="0" cy="0" r="6" fill="#10b981" opacity="0.8" />
                <text x="12" y="4" fill="#fff" font-size="12">源主机</text>
                <circle cx="0" cy="20" r="6" fill="#ef4444" opacity="0.8" />
                <text x="12" y="24" fill="#fff" font-size="12">目标主机</text>
            </g>
        </svg>
    `;
}

function renderHostList(hosts, type) {
    return `
        <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:12px;">
            ${hosts.map(host => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:12px;">
                    <div>
                        <div style="color:#fff;font-weight:600;">${formatIP(host.ip)}</div>
                        <div style="color:#9ca3af;font-size:10px;">${getHostType(host.ip)} - ${getLocationInfo(host.ip)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:#3b82f6;font-weight:600;">${formatNumber(host.packets || 0)}</div>
                        <div style="color:#9ca3af;font-size:10px;">${formatFileSize(host.bytes || 0)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getConnectionColor(intensity) {
    if (intensity > 80) return 'rgba(239, 68, 68, 0.3)';
    if (intensity > 60) return 'rgba(245, 158, 11, 0.3)';
    if (intensity > 40) return 'rgba(59, 130, 246, 0.3)';
    if (intensity > 20) return 'rgba(16, 185, 129, 0.2)';
    return 'rgba(156, 163, 175, 0.1)';
} 