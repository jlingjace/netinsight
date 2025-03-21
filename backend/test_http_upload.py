#!/usr/bin/env python
import requests
import sys
import os
import json

def test_file_upload(filepath, token):
    """测试文件上传功能"""
    if not os.path.exists(filepath):
        print(f"文件 {filepath} 不存在")
        return False
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # 列出文件测试
    print("测试列出文件...")
    list_response = requests.get('http://127.0.0.1:5000/api/files', headers=headers)
    print(f"列出文件状态码: {list_response.status_code}")
    if list_response.status_code == 200:
        print("列出文件成功")
        print(json.dumps(list_response.json(), indent=2, ensure_ascii=False))
    else:
        print(f"列出文件失败: {list_response.text}")
    
    # 上传文件测试
    print("\n测试上传文件...")
    with open(filepath, 'rb') as f:
        files = {'file': (os.path.basename(filepath), f)}
        upload_response = requests.post(
            'http://127.0.0.1:5000/api/files',
            headers=headers,
            files=files
        )
    
    print(f"上传文件状态码: {upload_response.status_code}")
    if upload_response.status_code in [200, 201]:  # 接受200或201状态码
        print("上传文件成功")
        response_data = upload_response.json()
        print(json.dumps(response_data, indent=2, ensure_ascii=False))
        
        # 从响应中获取文件ID
        file_id = None
        if 'file_id' in response_data:
            file_id = response_data['file_id']
        elif 'file' in response_data and 'id' in response_data['file']:
            file_id = response_data['file']['id']
        
        # 获取文件详情测试
        if file_id:
            print("\n测试获取文件详情...")
            details_response = requests.get(f'http://127.0.0.1:5000/api/files/{file_id}', headers=headers)
            print(f"获取文件详情状态码: {details_response.status_code}")
            if details_response.status_code == 200:
                print("获取文件详情成功")
                print(json.dumps(details_response.json(), indent=2, ensure_ascii=False))
            else:
                print(f"获取文件详情失败: {details_response.text}")
        
        return True
    else:
        print(f"上传文件失败: {upload_response.text}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python test_http_upload.py <文件路径> <访问令牌>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    token = sys.argv[2]
    
    print(f"测试文件: {filepath}")
    print(f"使用的令牌: {token[:10]}...{token[-10:]}")
    
    success = test_file_upload(filepath, token)
    if success:
        print("\n测试完成: 文件上传功能正常工作")
    else:
        print("\n测试完成: 文件上传功能存在问题")
        sys.exit(1) 