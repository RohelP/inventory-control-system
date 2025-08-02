"""Dashboard module for system overview and key metrics."""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QLabel, 
    QFrame, QPushButton, QTableWidget, QTableWidgetItem,
    QGroupBox, QProgressBar
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QFont, QPalette
from typing import Dict, Any
from datetime import datetime, timedelta


class MetricCard(QFrame):
    """Widget for displaying key performance metrics."""
    
    def __init__(self, title: str, value: str, subtitle: str = "", color: str = "#3498db"):
        super().__init__()
        self.setup_ui(title, value, subtitle, color)
    
    def setup_ui(self, title: str, value: str, subtitle: str, color: str):
        """Set up the metric card UI."""
        self.setFrameStyle(QFrame.Shape.Box)
        self.setStyleSheet(f"""
            QFrame {{
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 10px;
            }}
            QLabel#title {{
                color: #7f8c8d;
                font-size: 12px;
                font-weight: bold;
            }}
            QLabel#value {{
                color: {color};
                font-size: 24px;
                font-weight: bold;
            }}
            QLabel#subtitle {{
                color: #95a5a6;
                font-size: 11px;
            }}
        """)
        
        layout = QVBoxLayout(self)
        layout.setSpacing(5)
        
        # Title
        title_label = QLabel(title)
        title_label.setObjectName("title")
        layout.addWidget(title_label)
        
        # Value
        self.value_label = QLabel(value)
        self.value_label.setObjectName("value")
        self.value_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.value_label)
        
        # Subtitle
        if subtitle:
            subtitle_label = QLabel(subtitle)
            subtitle_label.setObjectName("subtitle")
            subtitle_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            layout.addWidget(subtitle_label)
    
    def update_value(self, value: str, subtitle: str = ""):
        """Update the metric value and subtitle."""
        self.value_label.setText(value)
        if subtitle and hasattr(self, 'subtitle_label'):
            self.subtitle_label.setText(subtitle)


class DashboardWidget(QWidget):
    """Main dashboard widget showing system overview."""
    
    data_refresh_requested = pyqtSignal()
    
    def __init__(self, services: Dict[str, Any]):
        super().__init__()
        self.services = services
        self.metric_cards = {}
        self.setup_ui()
        
        # Auto-refresh timer
        self.refresh_timer = QTimer()
        self.refresh_timer.timeout.connect(self.refresh_dashboard)
        self.refresh_timer.start(60000)  # Refresh every minute
    
    def setup_ui(self):
        """Set up the dashboard UI."""
        layout = QVBoxLayout(self)
        layout.setSpacing(20)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header = QLabel("System Dashboard")
        header.setStyleSheet("""
            QLabel {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
        """)
        layout.addWidget(header)
        
        # Key metrics row
        metrics_layout = QHBoxLayout()
        metrics_layout.setSpacing(15)
        
        # Create metric cards
        self.create_metric_cards(metrics_layout)
        layout.addLayout(metrics_layout)
        
        # Content area with recent activity and alerts
        content_layout = QHBoxLayout()
        content_layout.setSpacing(20)
        
        # Recent activity section
        activity_group = QGroupBox("Recent Activity")
        activity_layout = QVBoxLayout(activity_group)
        
        self.activity_table = QTableWidget()
        self.activity_table.setColumnCount(4)
        self.activity_table.setHorizontalHeaderLabels(["Time", "Type", "Description", "User"])
        self.activity_table.setMaximumHeight(200)
        activity_layout.addWidget(self.activity_table)
        
        content_layout.addWidget(activity_group)
        
        # Alerts and notifications section
        alerts_group = QGroupBox("Alerts & Notifications")
        alerts_layout = QVBoxLayout(alerts_group)
        
        self.alerts_table = QTableWidget()
        self.alerts_table.setColumnCount(3)
        self.alerts_table.setHorizontalHeaderLabels(["Priority", "Type", "Message"])
        self.alerts_table.setMaximumHeight(200)
        alerts_layout.addWidget(self.alerts_table)
        
        content_layout.addWidget(alerts_group)
        
        layout.addLayout(content_layout)
        
        # Action buttons
        actions_layout = QHBoxLayout()
        
        refresh_btn = QPushButton("Refresh Data")
        refresh_btn.clicked.connect(self.refresh_dashboard)
        actions_layout.addWidget(refresh_btn)
        
        actions_layout.addStretch()
        
        view_reports_btn = QPushButton("View Detailed Reports")
        view_reports_btn.clicked.connect(self.open_reports)
        actions_layout.addWidget(view_reports_btn)
        
        layout.addLayout(actions_layout)
        
        # Initial data load
        self.refresh_dashboard()
    
    def create_metric_cards(self, layout: QHBoxLayout):
        """Create key performance metric cards."""
        # Inventory Value
        self.metric_cards['inventory_value'] = MetricCard(
            "Total Inventory Value", 
            "$0.00", 
            "Across all locations",
            "#27ae60"
        )
        layout.addWidget(self.metric_cards['inventory_value'])
        
        # Items Below Reorder
        self.metric_cards['reorder_items'] = MetricCard(
            "Items Below Reorder", 
            "0", 
            "Need attention",
            "#e74c3c"
        )
        layout.addWidget(self.metric_cards['reorder_items'])
        
        # Recent Orders
        self.metric_cards['recent_orders'] = MetricCard(
            "Orders (7 days)", 
            "0", 
            "Sales activity",
            "#3498db"
        )
        layout.addWidget(self.metric_cards['recent_orders'])
        
        # Stock Movements
        self.metric_cards['movements'] = MetricCard(
            "Stock Movements", 
            "0", 
            "Last 24 hours",
            "#9b59b6"
        )
        layout.addWidget(self.metric_cards['movements'])
        
        # System Health
        self.metric_cards['system_health'] = MetricCard(
            "System Health", 
            "Good", 
            "All systems operational",
            "#27ae60"
        )
        layout.addWidget(self.metric_cards['system_health'])
    
    def refresh_dashboard(self):
        """Refresh all dashboard data."""
        try:
            # Get dashboard metrics from reporting service
            metrics = self.services['reporting'].get_dashboard_metrics()
            
            # Update metric cards
            self.update_metrics(metrics)
            
            # Update activity and alerts
            self.update_recent_activity()
            self.update_alerts()
            
        except Exception as e:
            print(f"Error refreshing dashboard: {e}")
    
    def update_metrics(self, metrics: Dict[str, Any]):
        """Update metric cards with current data."""
        # Inventory metrics
        inventory = metrics.get('inventory', {})
        
        # Inventory value
        total_value = inventory.get('total_value', 0)
        self.metric_cards['inventory_value'].update_value(f"${total_value:,.2f}")
        
        # Items below reorder
        reorder_items = inventory.get('items_below_reorder', 0)
        self.metric_cards['reorder_items'].update_value(str(reorder_items))
        
        # Sales metrics
        sales = metrics.get('sales', {})
        recent_orders = sales.get('recent_orders_7d', 0)
        self.metric_cards['recent_orders'].update_value(str(recent_orders))
        
        # Activity metrics
        activity = metrics.get('activity', {})
        movements = activity.get('movements_7d', 0)
        self.metric_cards['movements'].update_value(str(movements))
        
        # System health (simplified)
        stockouts = inventory.get('stockout_items', 0)
        if stockouts == 0:
            health_status = "Excellent"
            health_color = "#27ae60"
        elif stockouts < 5:
            health_status = "Good"
            health_color = "#f39c12"
        else:
            health_status = "Attention"
            health_color = "#e74c3c"
        
        self.metric_cards['system_health'].update_value(health_status)
    
    def update_recent_activity(self):
        """Update recent activity table."""
        # This would typically show recent stock movements, orders, etc.
        self.activity_table.setRowCount(5)
        
        # Sample data for demonstration
        sample_activities = [
            ("10:30", "Stock Receipt", "Received 100 units of RAW-001", "System"),
            ("10:15", "Sales Order", "Order SO-123 created for ACME Corp", "User"),
            ("09:45", "Stock Issue", "Issued 50 units for Order SO-122", "System"),
            ("09:30", "Price Update", "Updated pricing rule for Category A", "Admin"),
            ("09:00", "Reorder Alert", "RAW-002 below reorder point", "System")
        ]
        
        for row, (time, type_val, desc, user) in enumerate(sample_activities):
            self.activity_table.setItem(row, 0, QTableWidgetItem(time))
            self.activity_table.setItem(row, 1, QTableWidgetItem(type_val))
            self.activity_table.setItem(row, 2, QTableWidgetItem(desc))
            self.activity_table.setItem(row, 3, QTableWidgetItem(user))
        
        self.activity_table.resizeColumnsToContents()
    
    def update_alerts(self):
        """Update alerts and notifications table."""
        try:
            # Get reorder recommendations for alerts
            reorder_items = self.services['reorder'].get_reorder_recommendations()
            
            self.alerts_table.setRowCount(min(len(reorder_items), 10))
            
            for row, item in enumerate(reorder_items[:10]):
                priority = "High" if item['urgency_score'] > 75 else "Medium"
                alert_type = "Reorder Required"
                message = f"{item['product_sku']}: {item['current_stock']} units remaining"
                
                self.alerts_table.setItem(row, 0, QTableWidgetItem(priority))
                self.alerts_table.setItem(row, 1, QTableWidgetItem(alert_type))
                self.alerts_table.setItem(row, 2, QTableWidgetItem(message))
            
            self.alerts_table.resizeColumnsToContents()
            
        except Exception as e:
            print(f"Error updating alerts: {e}")
    
    def open_reports(self):
        """Signal to open reports module."""
        # This would be connected to the main window to switch modules
        pass