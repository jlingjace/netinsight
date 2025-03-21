#!/usr/bin/env python
import os
import uuid
from datetime import datetime

# 测试文件上传路径和权限
def test_file_upload():
    # 获取当前目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    instance_dir = os.path.join(current_dir, 'instance')
    uploads_dir = os.path.join(instance_dir, 'uploads')
    
    # 打印目录信息
    print(f"当前目录: {current_dir}")
    print(f"实例目录: {instance_dir}")
    print(f"上传目录: {uploads_dir}")
    
    # 检查目录是否存在
    print(f"实例目录存在: {os.path.exists(instance_dir)}")
    print(f"上传目录存在: {os.path.exists(uploads_dir)}")
    
    # 如果目录不存在，尝试创建
    if not os.path.exists(uploads_dir):
        try:
            os.makedirs(uploads_dir, exist_ok=True)
            print(f"创建上传目录: {uploads_dir}")
        except Exception as e:
            print(f"创建目录失败: {str(e)}")
            return
    
    # 尝试在目录中创建一个测试文件
    test_filename = f"test_{uuid.uuid4()}.txt"
    test_filepath = os.path.join(uploads_dir, test_filename)
    
    try:
        with open(test_filepath, 'w') as f:
            f.write(f"测试文件 - 创建于 {datetime.now().isoformat()}")
        print(f"测试文件已创建: {test_filepath}")
        
        # 读取文件内容验证
        with open(test_filepath, 'r') as f:
            content = f.read()
        print(f"文件内容: {content}")
        
        # 删除测试文件
        os.remove(test_filepath)
        print(f"测试文件已删除")
        
    except Exception as e:
        print(f"文件操作失败: {str(e)}")

if __name__ == "__main__":
    test_file_upload() 