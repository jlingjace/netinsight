#!/usr/bin/env python
from app import db, create_app
from app.models.report import Report, ReportEvent, HttpRequest

def create_report_tables():
    """创建报告相关的数据库表"""
    app = create_app()
    with app.app_context():
        db.create_all()
        print("报告相关表已创建")

if __name__ == "__main__":
    create_report_tables() 