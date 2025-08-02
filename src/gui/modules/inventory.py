"""Inventory management module."""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLabel, QLineEdit, QComboBox, QGroupBox, QFormLayout,
    QDialog, QDialogButtonBox, QSpinBox, QDoubleSpinBox, QTextEdit,
    QMessageBox, QHeaderView, QTabWidget
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont
from typing import Dict, Any, List
from decimal import Decimal


class InventoryWidget(QWidget):
    """Main inventory management widget."""
    
    data_changed = pyqtSignal()
    
    def __init__(self, services: Dict[str, Any]):
        super().__init__()
        self.services = services
        self.setup_ui()
        self.refresh_data()
    
    def setup_ui(self):
        """Set up the inventory management UI."""
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header_layout = QHBoxLayout()
        
        title = QLabel("Inventory Management")
        title.setStyleSheet("""
            QLabel {
                font-size: 20px;
                font-weight: bold;
                color: #2c3e50;
            }
        """)
        header_layout.addWidget(title)
        
        header_layout.addStretch()
        
        # Action buttons
        self.receive_btn = QPushButton("Receive Inventory")
        self.receive_btn.clicked.connect(self.receive_inventory)
        header_layout.addWidget(self.receive_btn)
        
        self.adjust_btn = QPushButton("Stock Adjustment")
        self.adjust_btn.clicked.connect(self.stock_adjustment)
        header_layout.addWidget(self.adjust_btn)
        
        self.refresh_btn = QPushButton("Refresh")
        self.refresh_btn.clicked.connect(self.refresh_data)
        header_layout.addWidget(self.refresh_btn)
        
        layout.addLayout(header_layout)
        
        # Search and filter section
        filter_group = QGroupBox("Search & Filter")
        filter_layout = QHBoxLayout(filter_group)
        
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search by SKU or name...")
        self.search_input.textChanged.connect(self.filter_inventory)
        filter_layout.addWidget(QLabel("Search:"))
        filter_layout.addWidget(self.search_input)
        
        self.location_filter = QComboBox()
        self.location_filter.currentTextChanged.connect(self.filter_inventory)
        filter_layout.addWidget(QLabel("Location:"))
        filter_layout.addWidget(self.location_filter)
        
        self.category_filter = QComboBox()
        self.category_filter.currentTextChanged.connect(self.filter_inventory)
        filter_layout.addWidget(QLabel("Category:"))
        filter_layout.addWidget(self.category_filter)
        
        filter_layout.addStretch()
        
        layout.addWidget(filter_group)
        
        # Inventory table
        self.inventory_table = QTableWidget()
        self.setup_inventory_table()
        layout.addWidget(self.inventory_table)
        
        # Summary section
        summary_layout = QHBoxLayout()
        
        self.summary_label = QLabel("Total Items: 0 | Total Value: $0.00")
        self.summary_label.setStyleSheet("""
            QLabel {
                font-weight: bold;
                font-size: 12px;
                color: #34495e;
            }
        """)
        summary_layout.addWidget(self.summary_label)
        
        summary_layout.addStretch()
        
        layout.addLayout(summary_layout)
    
    def setup_inventory_table(self):
        """Set up the inventory table."""
        headers = [
            "Product SKU", "Product Name", "Location", "On Hand", 
            "Available", "Reserved", "Reorder Point", "Unit Cost", 
            "Total Value", "ABC Category", "Last Updated"
        ]
        
        self.inventory_table.setColumnCount(len(headers))
        self.inventory_table.setHorizontalHeaderLabels(headers)
        
        # Set column widths
        header = self.inventory_table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.Fixed)
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(2, QHeaderView.ResizeMode.Fixed)
        
        self.inventory_table.setColumnWidth(0, 120)  # SKU
        self.inventory_table.setColumnWidth(2, 100)  # Location
        self.inventory_table.setColumnWidth(3, 80)   # On Hand
        self.inventory_table.setColumnWidth(4, 80)   # Available
        self.inventory_table.setColumnWidth(5, 80)   # Reserved
        self.inventory_table.setColumnWidth(6, 100)  # Reorder Point
        self.inventory_table.setColumnWidth(7, 90)   # Unit Cost
        self.inventory_table.setColumnWidth(8, 100)  # Total Value
        self.inventory_table.setColumnWidth(9, 80)   # ABC Category
        self.inventory_table.setColumnWidth(10, 120) # Last Updated
        
        # Enable sorting
        self.inventory_table.setSortingEnabled(True)
        
        # Enable row selection
        self.inventory_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        
        # Double-click to edit
        self.inventory_table.itemDoubleClicked.connect(self.edit_inventory_item)
    
    def refresh_data(self):
        """Refresh inventory data."""
        try:
            # Load locations for filter
            self.load_filters()
            
            # Load inventory data
            self.load_inventory_data()
            
            self.data_changed.emit()
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to refresh data:\n{str(e)}")
    
    def load_filters(self):
        """Load filter options."""
        # Location filter
        self.location_filter.clear()
        self.location_filter.addItem("All Locations")
        
        # In a real implementation, you'd load from database
        locations = ["WH001", "WH002"]  # Sample data
        self.location_filter.addItems(locations)
        
        # Category filter
        self.category_filter.clear()
        self.category_filter.addItem("All Categories")
        categories = ["Raw Materials", "Components", "Finished Goods"]  # Sample data
        self.category_filter.addItems(categories)
    
    def load_inventory_data(self):
        """Load inventory data into table."""
        from ...models import InventoryItem, Product, Location
        
        # Get inventory items with product and location data
        db = self.services['inventory'].db
        items = db.query(InventoryItem).join(Product).join(Location).all()
        
        self.inventory_table.setRowCount(len(items))
        
        total_value = 0
        
        for row, item in enumerate(items):
            # Product SKU
            self.inventory_table.setItem(row, 0, QTableWidgetItem(item.product.sku))
            
            # Product Name
            self.inventory_table.setItem(row, 1, QTableWidgetItem(item.product.name))
            
            # Location
            self.inventory_table.setItem(row, 2, QTableWidgetItem(item.location.code))
            
            # On Hand
            on_hand_item = QTableWidgetItem(str(item.quantity_on_hand))
            on_hand_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.inventory_table.setItem(row, 3, on_hand_item)
            
            # Available
            available = item.quantity_available
            available_item = QTableWidgetItem(str(available))
            available_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            
            # Color code based on availability
            if available <= 0:
                available_item.setBackground(Qt.GlobalColor.red)
            elif available <= item.reorder_point:
                available_item.setBackground(Qt.GlobalColor.yellow)
            
            self.inventory_table.setItem(row, 4, available_item)
            
            # Reserved
            reserved_item = QTableWidgetItem(str(item.quantity_reserved))
            reserved_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.inventory_table.setItem(row, 5, reserved_item)
            
            # Reorder Point
            reorder_item = QTableWidgetItem(str(item.reorder_point))
            reorder_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.inventory_table.setItem(row, 6, reorder_item)
            
            # Unit Cost
            cost_item = QTableWidgetItem(f"${item.average_cost:.2f}")
            cost_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.inventory_table.setItem(row, 7, cost_item)
            
            # Total Value
            value_item = QTableWidgetItem(f"${item.total_cost_value:.2f}")
            value_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.inventory_table.setItem(row, 8, value_item)
            
            total_value += item.total_cost_value
            
            # ABC Category
            abc_item = QTableWidgetItem(item.product.abc_category.value)
            abc_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.inventory_table.setItem(row, 9, abc_item)
            
            # Last Updated
            updated_item = QTableWidgetItem(item.updated_at.strftime("%Y-%m-%d %H:%M"))
            self.inventory_table.setItem(row, 10, updated_item)
        
        # Update summary
        self.summary_label.setText(f"Total Items: {len(items)} | Total Value: ${total_value:,.2f}")
    
    def filter_inventory(self):
        """Filter inventory table based on search and filter criteria."""
        search_text = self.search_input.text().lower()
        location_filter = self.location_filter.currentText()
        category_filter = self.category_filter.currentText()
        
        for row in range(self.inventory_table.rowCount()):
            show_row = True
            
            # Search filter
            if search_text:
                sku = self.inventory_table.item(row, 0).text().lower()
                name = self.inventory_table.item(row, 1).text().lower()
                if search_text not in sku and search_text not in name:
                    show_row = False
            
            # Location filter
            if location_filter != "All Locations":
                location = self.inventory_table.item(row, 2).text()
                if location != location_filter:
                    show_row = False
            
            self.inventory_table.setRowHidden(row, not show_row)
    
    def receive_inventory(self):
        """Open receive inventory dialog."""
        dialog = ReceiveInventoryDialog(self.services, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.refresh_data()
    
    def stock_adjustment(self):
        """Open stock adjustment dialog."""
        dialog = StockAdjustmentDialog(self.services, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.refresh_data()
    
    def edit_inventory_item(self, item):
        """Edit inventory item details."""
        row = item.row()
        sku = self.inventory_table.item(row, 0).text()
        QMessageBox.information(self, "Edit Item", f"Edit functionality for {sku} will be implemented here.")


class ReceiveInventoryDialog(QDialog):
    """Dialog for receiving inventory."""
    
    def __init__(self, services: Dict[str, Any], parent=None):
        super().__init__(parent)
        self.services = services
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the receive inventory dialog."""
        self.setWindowTitle("Receive Inventory")
        self.setModal(True)
        self.resize(400, 300)
        
        layout = QVBoxLayout(self)
        
        # Form layout
        form_group = QGroupBox("Inventory Receipt")
        form_layout = QFormLayout(form_group)
        
        self.product_combo = QComboBox()
        self.load_products()
        form_layout.addRow("Product:", self.product_combo)
        
        self.location_combo = QComboBox()
        self.load_locations()
        form_layout.addRow("Location:", self.location_combo)
        
        self.quantity_spin = QSpinBox()
        self.quantity_spin.setMinimum(1)
        self.quantity_spin.setMaximum(999999)
        form_layout.addRow("Quantity:", self.quantity_spin)
        
        self.cost_spin = QDoubleSpinBox()
        self.cost_spin.setMinimum(0.01)
        self.cost_spin.setMaximum(999999.99)
        self.cost_spin.setDecimals(4)
        form_layout.addRow("Unit Cost:", self.cost_spin)
        
        self.reference_edit = QLineEdit()
        self.reference_edit.setPlaceholderText("PO number, receipt reference, etc.")
        form_layout.addRow("Reference:", self.reference_edit)
        
        self.notes_edit = QTextEdit()
        self.notes_edit.setMaximumHeight(60)
        form_layout.addRow("Notes:", self.notes_edit)
        
        layout.addWidget(form_group)
        
        # Buttons
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept_receipt)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
    
    def load_products(self):
        """Load products into combo box."""
        # Sample data - in real implementation, load from database
        products = ["RAW-001", "COMP-001", "FG-001", "PKG-001"]
        self.product_combo.addItems(products)
    
    def load_locations(self):
        """Load locations into combo box."""
        # Sample data - in real implementation, load from database
        locations = ["WH001", "WH002"]
        self.location_combo.addItems(locations)
    
    def accept_receipt(self):
        """Process inventory receipt."""
        try:
            # Get form data
            product_sku = self.product_combo.currentText()
            location_code = self.location_combo.currentText()
            quantity = self.quantity_spin.value()
            unit_cost = Decimal(str(self.cost_spin.value()))
            reference = self.reference_edit.text()
            notes = self.notes_edit.toPlainText()
            
            # In real implementation, you'd process the receipt here
            QMessageBox.information(
                self, 
                "Receipt Processed", 
                f"Successfully received {quantity} units of {product_sku} at {location_code}"
            )
            
            self.accept()
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to process receipt:\n{str(e)}")


class StockAdjustmentDialog(QDialog):
    """Dialog for stock adjustments."""
    
    def __init__(self, services: Dict[str, Any], parent=None):
        super().__init__(parent)
        self.services = services
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the stock adjustment dialog."""
        self.setWindowTitle("Stock Adjustment")
        self.setModal(True)
        self.resize(400, 250)
        
        layout = QVBoxLayout(self)
        
        # Form layout
        form_group = QGroupBox("Inventory Adjustment")
        form_layout = QFormLayout(form_group)
        
        self.product_combo = QComboBox()
        self.load_products()
        form_layout.addRow("Product:", self.product_combo)
        
        self.location_combo = QComboBox()
        self.load_locations()
        form_layout.addRow("Location:", self.location_combo)
        
        self.new_quantity_spin = QSpinBox()
        self.new_quantity_spin.setMinimum(0)
        self.new_quantity_spin.setMaximum(999999)
        form_layout.addRow("New Quantity:", self.new_quantity_spin)
        
        self.reason_edit = QLineEdit()
        self.reason_edit.setPlaceholderText("Reason for adjustment...")
        form_layout.addRow("Reason:", self.reason_edit)
        
        layout.addWidget(form_group)
        
        # Buttons
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept_adjustment)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
    
    def load_products(self):
        """Load products into combo box."""
        products = ["RAW-001", "COMP-001", "FG-001", "PKG-001"]
        self.product_combo.addItems(products)
    
    def load_locations(self):
        """Load locations into combo box."""
        locations = ["WH001", "WH002"]
        self.location_combo.addItems(locations)
    
    def accept_adjustment(self):
        """Process stock adjustment."""
        try:
            product_sku = self.product_combo.currentText()
            location_code = self.location_combo.currentText()
            new_quantity = self.new_quantity_spin.value()
            reason = self.reason_edit.text()
            
            if not reason.strip():
                QMessageBox.warning(self, "Warning", "Please provide a reason for the adjustment.")
                return
            
            QMessageBox.information(
                self,
                "Adjustment Processed", 
                f"Stock adjusted for {product_sku} at {location_code} to {new_quantity} units"
            )
            
            self.accept()
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to process adjustment:\n{str(e)}")