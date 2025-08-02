#!/usr/bin/env python3
"""
Inventory Control System - Desktop Application

A professional desktop application for inventory management with:
- Multi-location inventory tracking
- Sales order processing  
- Dynamic pricing engine
- Excel BOM integration
- Advanced analytics and reporting

Usage:
    python desktop_app.py
"""

if __name__ == "__main__":
    from src.gui.app import run_desktop_app
    run_desktop_app()