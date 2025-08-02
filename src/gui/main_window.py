"""Main application window for inventory control system."""

import sys
from typing import Optional
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QStackedWidget, QPushButton, QLabel, QStatusBar, QMenuBar,
    QToolBar, QMessageBox, QSplitter
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QAction, QIcon, QFont

from ..database import get_db_session, DatabaseManager
from ..services import (
    InventoryService, SalesOrderService, PricingService,
    ReorderService, ReportingService
)
from .modules.dashboard import DashboardWidget
from .modules.inventory import InventoryWidget
from .modules.sales_orders import SalesOrderWidget
from .modules.pricing import PricingWidget
from .modules.reports import ReportsWidget


class MainWindow(QMainWindow):
    """Main application window with navigation and module management."""
    
    def __init__(self):
        super().__init__()
        self.db_session = None
        self.services = {}
        
        self.init_database()
        self.init_services()
        self.init_ui()
        self.setup_connections()
        
        # Auto-refresh timer for real-time updates
        self.refresh_timer = QTimer()
        self.refresh_timer.timeout.connect(self.refresh_data)
        self.refresh_timer.start(30000)  # Refresh every 30 seconds
    
    def init_database(self):
        """Initialize database connection."""
        try:
            self.db_session = get_db_session()
        except Exception as e:
            QMessageBox.critical(
                self, 
                "Database Error", 
                f"Failed to connect to database:\n{str(e)}"
            )
            sys.exit(1)
    
    def init_services(self):
        """Initialize business service layer."""
        self.services = {
            'inventory': InventoryService(self.db_session),
            'sales_orders': SalesOrderService(self.db_session),
            'pricing': PricingService(self.db_session),
            'reorder': ReorderService(self.db_session),
            'reporting': ReportingService(self.db_session)
        }
    
    def init_ui(self):
        """Initialize user interface."""
        self.setWindowTitle("Inventory Control System")
        self.setGeometry(100, 100, 1400, 900)
        self.setMinimumSize(1200, 700)
        
        # Create central widget with splitter
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        
        # Create splitter for navigation and content
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)
        
        # Navigation panel
        self.nav_widget = self.create_navigation_panel()
        splitter.addWidget(self.nav_widget)
        
        # Content area with stacked widget
        self.content_stack = QStackedWidget()
        splitter.addWidget(self.content_stack)
        
        # Set splitter proportions (navigation:content = 1:4)
        splitter.setSizes([280, 1120])
        
        # Create module widgets
        self.create_modules()
        
        # Create menu bar and toolbar
        self.create_menu_bar()
        self.create_toolbar()
        self.create_status_bar()
        
        # Show dashboard by default
        self.show_dashboard()
    
    def create_navigation_panel(self) -> QWidget:
        """Create the navigation panel with module buttons."""
        nav_widget = QWidget()
        nav_widget.setFixedWidth(280)
        nav_widget.setStyleSheet("""
            QWidget {
                background-color: #2c3e50;
                color: white;
            }
            QPushButton {
                background-color: #34495e;
                border: none;
                color: white;
                padding: 15px;
                text-align: left;
                font-size: 14px;
                font-weight: bold;
                margin: 2px;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #3498db;
            }
            QPushButton:pressed {
                background-color: #2980b9;
            }
            QPushButton:checked {
                background-color: #e74c3c;
            }
        """)
        
        layout = QVBoxLayout(nav_widget)
        layout.setSpacing(5)
        layout.setContentsMargins(10, 20, 10, 20)
        
        # Application title
        title_label = QLabel("Inventory Control")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_label.setStyleSheet("""
            QLabel {
                font-size: 18px;
                font-weight: bold;
                color: #ecf0f1;
                padding: 10px;
                margin-bottom: 20px;
            }
        """)
        layout.addWidget(title_label)
        
        # Navigation buttons
        self.nav_buttons = {}
        nav_items = [
            ("dashboard", "📊 Dashboard", "System overview and key metrics"),
            ("inventory", "📦 Inventory", "Stock management and movements"),
            ("orders", "📋 Sales Orders", "Order processing and fulfillment"),
            ("pricing", "💰 Pricing", "Price rules and customer pricing"),
            ("reports", "📈 Reports", "Analytics and reporting")
        ]
        
        for key, title, tooltip in nav_items:
            btn = QPushButton(title)
            btn.setToolTip(tooltip)
            btn.setCheckable(True)
            btn.clicked.connect(lambda checked, k=key: self.show_module(k))
            self.nav_buttons[key] = btn
            layout.addWidget(btn)
        
        # Add stretch to push buttons to top
        layout.addStretch()
        
        # System status at bottom
        self.status_label = QLabel("System Ready")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_label.setStyleSheet("""
            QLabel {
                background-color: #27ae60;
                color: white;
                padding: 8px;
                border-radius: 3px;
                font-size: 12px;
            }
        """)
        layout.addWidget(self.status_label)
        
        return nav_widget
    
    def create_modules(self):
        """Create all module widgets."""
        # Dashboard
        self.dashboard_widget = DashboardWidget(self.services)
        self.content_stack.addWidget(self.dashboard_widget)
        
        # Inventory Management
        self.inventory_widget = InventoryWidget(self.services)
        self.content_stack.addWidget(self.inventory_widget)
        
        # Sales Orders
        self.orders_widget = SalesOrderWidget(self.services)
        self.content_stack.addWidget(self.orders_widget)
        
        # Pricing
        self.pricing_widget = PricingWidget(self.services)
        self.content_stack.addWidget(self.pricing_widget)
        
        # Reports
        self.reports_widget = ReportsWidget(self.services)
        self.content_stack.addWidget(self.reports_widget)
    
    def create_menu_bar(self):
        """Create application menu bar."""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("&File")
        
        # Database actions
        db_action = QAction("&Database Settings", self)
        db_action.triggered.connect(self.show_database_settings)
        file_menu.addAction(db_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("E&xit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Tools menu
        tools_menu = menubar.addMenu("&Tools")
        
        refresh_action = QAction("&Refresh Data", self)
        refresh_action.setShortcut("F5")
        refresh_action.triggered.connect(self.refresh_data)
        tools_menu.addAction(refresh_action)
        
        # Help menu
        help_menu = menubar.addMenu("&Help")
        
        about_action = QAction("&About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def create_toolbar(self):
        """Create application toolbar."""
        toolbar = QToolBar()
        self.addToolBar(toolbar)
        
        # Quick actions
        toolbar.addAction("New Order", self.new_sales_order)
        toolbar.addAction("Receive Inventory", self.receive_inventory)
        toolbar.addAction("Stock Adjustment", self.stock_adjustment)
        toolbar.addSeparator()
        toolbar.addAction("Refresh", self.refresh_data)
    
    def create_status_bar(self):
        """Create application status bar."""
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        
        # Default status
        self.status_bar.showMessage("Ready")
        
        # Add permanent widgets for system info
        self.db_status = QLabel("Database: Connected")
        self.status_bar.addPermanentWidget(self.db_status)
    
    def setup_connections(self):
        """Set up signal/slot connections between modules."""
        # Connect module refresh signals
        if hasattr(self.inventory_widget, 'data_changed'):
            self.inventory_widget.data_changed.connect(self.dashboard_widget.refresh_dashboard)
        
        if hasattr(self.orders_widget, 'data_changed'):
            self.orders_widget.data_changed.connect(self.dashboard_widget.refresh_dashboard)
    
    def show_module(self, module_key: str):
        """Show the specified module."""
        # Update navigation buttons
        for key, btn in self.nav_buttons.items():
            btn.setChecked(key == module_key)
        
        # Show appropriate widget
        if module_key == "dashboard":
            self.content_stack.setCurrentWidget(self.dashboard_widget)
            self.dashboard_widget.refresh_dashboard()
        elif module_key == "inventory":
            self.content_stack.setCurrentWidget(self.inventory_widget)
            self.inventory_widget.refresh_data()
        elif module_key == "orders":
            self.content_stack.setCurrentWidget(self.orders_widget)
            self.orders_widget.refresh_data()
        elif module_key == "pricing":
            self.content_stack.setCurrentWidget(self.pricing_widget)
            self.pricing_widget.refresh_data()
        elif module_key == "reports":
            self.content_stack.setCurrentWidget(self.reports_widget)
            self.reports_widget.refresh_data()
        
        self.status_bar.showMessage(f"Showing {module_key.title()} module")
    
    def show_dashboard(self):
        """Show dashboard module."""
        self.show_module("dashboard")
    
    def refresh_data(self):
        """Refresh all data across modules."""
        try:
            current_widget = self.content_stack.currentWidget()
            if hasattr(current_widget, 'refresh_data'):
                current_widget.refresh_data()
            
            self.status_bar.showMessage("Data refreshed", 2000)
            self.status_label.setText("System Ready")
            
        except Exception as e:
            QMessageBox.warning(self, "Refresh Error", f"Failed to refresh data:\n{str(e)}")
    
    def new_sales_order(self):
        """Quick action: Create new sales order."""
        self.show_module("orders")
        if hasattr(self.orders_widget, 'new_order'):
            self.orders_widget.new_order()
    
    def receive_inventory(self):
        """Quick action: Receive inventory."""
        self.show_module("inventory")
        if hasattr(self.inventory_widget, 'receive_inventory'):
            self.inventory_widget.receive_inventory()
    
    def stock_adjustment(self):
        """Quick action: Stock adjustment."""
        self.show_module("inventory")
        if hasattr(self.inventory_widget, 'stock_adjustment'):
            self.inventory_widget.stock_adjustment()
    
    def show_database_settings(self):
        """Show database configuration dialog."""
        QMessageBox.information(
            self, 
            "Database Settings", 
            "Database configuration dialog will be implemented here."
        )
    
    def show_about(self):
        """Show about dialog."""
        QMessageBox.about(
            self,
            "About Inventory Control System",
            """
            <h3>Inventory Control System</h3>
            <p>Professional inventory management with:</p>
            <ul>
            <li>Multi-location inventory tracking</li>
            <li>Sales order processing</li>
            <li>Dynamic pricing engine</li>
            <li>Excel BOM integration</li>
            <li>Advanced analytics</li>
            </ul>
            <p><b>Version:</b> 1.0</p>
            """
        )
    
    def closeEvent(self, event):
        """Handle application close event."""
        if self.db_session:
            self.db_session.close()
        
        self.refresh_timer.stop()
        event.accept()


def run_desktop_app():
    """Run the desktop application."""
    app = QApplication(sys.argv)
    app.setApplicationName("Inventory Control System")
    app.setOrganizationName("Your Company")
    
    # Set application style
    app.setStyle('Fusion')
    
    # Create and show main window
    window = MainWindow()
    window.show()
    
    # Run application
    sys.exit(app.exec())


if __name__ == "__main__":
    run_desktop_app()