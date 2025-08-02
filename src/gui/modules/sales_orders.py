"""Sales order management module."""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLabel, QLineEdit, QComboBox, QGroupBox, QFormLayout,
    QDialog, QDialogButtonBox, QSpinBox, QDoubleSpinBox, QTextEdit,
    QMessageBox, QHeaderView, QTabWidget, QDateEdit
)
from PyQt6.QtCore import Qt, pyqtSignal, QDate
from PyQt6.QtGui import QFont
from typing import Dict, Any
from decimal import Decimal


class SalesOrderWidget(QWidget):
    """Main sales order management widget."""
    
    data_changed = pyqtSignal()
    
    def __init__(self, services: Dict[str, Any]):
        super().__init__()
        self.services = services
        self.setup_ui()
        self.refresh_data()
    
    def setup_ui(self):
        """Set up the sales order UI."""
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header_layout = QHBoxLayout()
        
        title = QLabel("Sales Order Management")
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
        self.new_order_btn = QPushButton("New Order")
        self.new_order_btn.clicked.connect(self.new_order)
        header_layout.addWidget(self.new_order_btn)
        
        self.allocate_btn = QPushButton("Allocate Inventory")
        self.allocate_btn.clicked.connect(self.allocate_inventory)
        header_layout.addWidget(self.allocate_btn)
        
        self.refresh_btn = QPushButton("Refresh")
        self.refresh_btn.clicked.connect(self.refresh_data)
        header_layout.addWidget(self.refresh_btn)
        
        layout.addLayout(header_layout)
        
        # Search and filter section
        filter_group = QGroupBox("Search & Filter")
        filter_layout = QHBoxLayout(filter_group)
        
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search by order number or customer...")
        self.search_input.textChanged.connect(self.filter_orders)
        filter_layout.addWidget(QLabel("Search:"))
        filter_layout.addWidget(self.search_input)
        
        self.status_filter = QComboBox()
        self.status_filter.addItems(["All Status", "Draft", "Confirmed", "In Progress", "Shipped", "Delivered"])
        self.status_filter.currentTextChanged.connect(self.filter_orders)
        filter_layout.addWidget(QLabel("Status:"))
        filter_layout.addWidget(self.status_filter)
        
        filter_layout.addStretch()
        
        layout.addWidget(filter_group)
        
        # Orders table
        self.orders_table = QTableWidget()
        self.setup_orders_table()
        layout.addWidget(self.orders_table)
        
        # Summary section
        summary_layout = QHBoxLayout()
        
        self.summary_label = QLabel("Total Orders: 0 | Total Value: $0.00")
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
    
    def setup_orders_table(self):
        """Set up the orders table."""
        headers = [
            "Order Number", "Customer", "Order Date", "Status", 
            "Total Amount", "Lines", "Delivery Date", "Created"
        ]
        
        self.orders_table.setColumnCount(len(headers))
        self.orders_table.setHorizontalHeaderLabels(headers)
        
        # Set column widths
        header = self.orders_table.horizontalHeader()
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)  # Customer name
        
        self.orders_table.setColumnWidth(0, 150)  # Order Number
        self.orders_table.setColumnWidth(2, 100)  # Order Date
        self.orders_table.setColumnWidth(3, 100)  # Status
        self.orders_table.setColumnWidth(4, 100)  # Total Amount
        self.orders_table.setColumnWidth(5, 60)   # Lines
        self.orders_table.setColumnWidth(6, 100)  # Delivery Date
        self.orders_table.setColumnWidth(7, 120)  # Created
        
        # Enable sorting
        self.orders_table.setSortingEnabled(True)
        
        # Enable row selection
        self.orders_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        
        # Double-click to edit
        self.orders_table.itemDoubleClicked.connect(self.edit_order)
    
    def refresh_data(self):
        """Refresh sales order data."""
        try:
            self.load_orders_data()
            self.data_changed.emit()
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to refresh data:\n{str(e)}")
    
    def load_orders_data(self):
        """Load sales orders data into table."""
        # Sample data for demonstration
        sample_orders = [
            ("SO-20241201001", "ACME Corporation", "2024-12-01", "Confirmed", "$1,250.00", "3", "2024-12-05", "2024-12-01 09:30"),
            ("SO-20241201002", "Tech Solutions Inc", "2024-12-01", "Draft", "$2,100.50", "5", "2024-12-07", "2024-12-01 14:15"),
            ("SO-20241130003", "Manufacturing Co", "2024-11-30", "Shipped", "$850.75", "2", "2024-12-02", "2024-11-30 16:45"),
        ]
        
        self.orders_table.setRowCount(len(sample_orders))
        
        total_value = 0
        
        for row, order_data in enumerate(sample_orders):
            for col, value in enumerate(order_data):
                item = QTableWidgetItem(str(value))
                
                # Right-align numeric columns
                if col in [4, 5]:  # Total Amount, Lines
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                
                # Color code status
                if col == 3:  # Status column
                    if value == "Draft":
                        item.setBackground(Qt.GlobalColor.lightGray)
                    elif value == "Confirmed":
                        item.setBackground(Qt.GlobalColor.yellow)
                    elif value == "Shipped":
                        item.setBackground(Qt.GlobalColor.green)
                
                self.orders_table.setItem(row, col, item)
            
            # Extract value for summary (remove $ and commas)
            value_str = order_data[4].replace('$', '').replace(',', '')
            total_value += float(value_str)
        
        # Update summary
        self.summary_label.setText(f"Total Orders: {len(sample_orders)} | Total Value: ${total_value:,.2f}")
    
    def filter_orders(self):
        """Filter orders table based on search and filter criteria."""
        search_text = self.search_input.text().lower()
        status_filter = self.status_filter.currentText()
        
        for row in range(self.orders_table.rowCount()):
            show_row = True
            
            # Search filter
            if search_text:
                order_num = self.orders_table.item(row, 0).text().lower()
                customer = self.orders_table.item(row, 1).text().lower()
                if search_text not in order_num and search_text not in customer:
                    show_row = False
            
            # Status filter
            if status_filter != "All Status":
                status = self.orders_table.item(row, 3).text()
                if status != status_filter:
                    show_row = False
            
            self.orders_table.setRowHidden(row, not show_row)
    
    def new_order(self):
        """Create new sales order."""
        dialog = NewOrderDialog(self.services, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.refresh_data()
    
    def allocate_inventory(self):
        """Allocate inventory for selected order."""
        current_row = self.orders_table.currentRow()
        if current_row >= 0:
            order_number = self.orders_table.item(current_row, 0).text()
            QMessageBox.information(
                self, 
                "Allocate Inventory", 
                f"Inventory allocation for order {order_number} will be implemented here."
            )
        else:
            QMessageBox.warning(self, "Warning", "Please select an order first.")
    
    def edit_order(self, item):
        """Edit selected order."""
        row = item.row()
        order_number = self.orders_table.item(row, 0).text()
        QMessageBox.information(
            self, 
            "Edit Order", 
            f"Order editing for {order_number} will be implemented here."
        )


class NewOrderDialog(QDialog):
    """Dialog for creating new sales orders."""
    
    def __init__(self, services: Dict[str, Any], parent=None):
        super().__init__(parent)
        self.services = services
        self.line_items = []
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the new order dialog."""
        self.setWindowTitle("Create New Sales Order")
        self.setModal(True)
        self.resize(800, 600)
        
        layout = QVBoxLayout(self)
        
        # Order header section
        header_group = QGroupBox("Order Information")
        header_layout = QFormLayout(header_group)
        
        self.customer_id_edit = QLineEdit()
        header_layout.addRow("Customer ID:", self.customer_id_edit)
        
        self.customer_name_edit = QLineEdit()
        header_layout.addRow("Customer Name:", self.customer_name_edit)
        
        self.po_number_edit = QLineEdit()
        header_layout.addRow("Customer PO:", self.po_number_edit)
        
        self.delivery_date_edit = QDateEdit()
        self.delivery_date_edit.setDate(QDate.currentDate().addDays(7))
        header_layout.addRow("Requested Delivery:", self.delivery_date_edit)
        
        layout.addWidget(header_group)
        
        # Line items section
        lines_group = QGroupBox("Line Items")
        lines_layout = QVBoxLayout(lines_group)
        
        # Line items controls
        line_controls = QHBoxLayout()
        
        add_line_btn = QPushButton("Add Line")
        add_line_btn.clicked.connect(self.add_line_item)
        line_controls.addWidget(add_line_btn)
        
        remove_line_btn = QPushButton("Remove Line")
        remove_line_btn.clicked.connect(self.remove_line_item)
        line_controls.addWidget(remove_line_btn)
        
        line_controls.addStretch()
        
        lines_layout.addLayout(line_controls)
        
        # Line items table
        self.lines_table = QTableWidget()
        self.lines_table.setColumnCount(5)
        self.lines_table.setHorizontalHeaderLabels([
            "Product SKU", "Quantity", "Unit Price", "Extended Price", "Notes"
        ])
        self.lines_table.setMinimumHeight(200)
        lines_layout.addWidget(self.lines_table)
        
        layout.addWidget(lines_group)
        
        # Order totals
        totals_group = QGroupBox("Order Totals")
        totals_layout = QFormLayout(totals_group)
        
        self.subtotal_label = QLabel("$0.00")
        totals_layout.addRow("Subtotal:", self.subtotal_label)
        
        self.tax_edit = QDoubleSpinBox()
        self.tax_edit.setMaximum(999999.99)
        self.tax_edit.valueChanged.connect(self.calculate_totals)
        totals_layout.addRow("Tax Amount:", self.tax_edit)
        
        self.shipping_edit = QDoubleSpinBox()
        self.shipping_edit.setMaximum(999999.99)
        self.shipping_edit.valueChanged.connect(self.calculate_totals)
        totals_layout.addRow("Shipping:", self.shipping_edit)
        
        self.total_label = QLabel("$0.00")
        self.total_label.setStyleSheet("font-weight: bold; font-size: 14px;")
        totals_layout.addRow("Total:", self.total_label)
        
        layout.addWidget(totals_group)
        
        # Buttons
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept_order)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
    
    def add_line_item(self):
        """Add a new line item."""
        dialog = LineItemDialog(self.services, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            line_data = dialog.get_line_data()
            self.line_items.append(line_data)
            self.refresh_lines_table()
    
    def remove_line_item(self):
        """Remove selected line item."""
        current_row = self.lines_table.currentRow()
        if current_row >= 0:
            del self.line_items[current_row]
            self.refresh_lines_table()
    
    def refresh_lines_table(self):
        """Refresh the line items table."""
        self.lines_table.setRowCount(len(self.line_items))
        
        for row, line in enumerate(self.line_items):
            self.lines_table.setItem(row, 0, QTableWidgetItem(line['sku']))
            self.lines_table.setItem(row, 1, QTableWidgetItem(str(line['quantity'])))
            self.lines_table.setItem(row, 2, QTableWidgetItem(f"${line['unit_price']:.2f}"))
            self.lines_table.setItem(row, 3, QTableWidgetItem(f"${line['extended_price']:.2f}"))
            self.lines_table.setItem(row, 4, QTableWidgetItem(line.get('notes', '')))
        
        self.calculate_totals()
    
    def calculate_totals(self):
        """Calculate order totals."""
        subtotal = sum(line['extended_price'] for line in self.line_items)
        tax = self.tax_edit.value()
        shipping = self.shipping_edit.value()
        total = subtotal + tax + shipping
        
        self.subtotal_label.setText(f"${subtotal:.2f}")
        self.total_label.setText(f"${total:.2f}")
    
    def accept_order(self):
        """Accept and create the order."""
        try:
            if not self.customer_id_edit.text().strip():
                QMessageBox.warning(self, "Warning", "Please enter customer ID.")
                return
            
            if not self.customer_name_edit.text().strip():
                QMessageBox.warning(self, "Warning", "Please enter customer name.")
                return
            
            if not self.line_items:
                QMessageBox.warning(self, "Warning", "Please add at least one line item.")
                return
            
            QMessageBox.information(
                self,
                "Order Created",
                f"Sales order created for {self.customer_name_edit.text()}"
            )
            
            self.accept()
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to create order:\n{str(e)}")


class LineItemDialog(QDialog):
    """Dialog for adding line items."""
    
    def __init__(self, services: Dict[str, Any], parent=None):
        super().__init__(parent)
        self.services = services
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the line item dialog."""
        self.setWindowTitle("Add Line Item")
        self.setModal(True)
        self.resize(350, 200)
        
        layout = QVBoxLayout(self)
        
        form_layout = QFormLayout()
        
        self.product_combo = QComboBox()
        self.load_products()
        form_layout.addRow("Product:", self.product_combo)
        
        self.quantity_spin = QSpinBox()
        self.quantity_spin.setMinimum(1)
        self.quantity_spin.setMaximum(999999)
        self.quantity_spin.valueChanged.connect(self.calculate_extended)
        form_layout.addRow("Quantity:", self.quantity_spin)
        
        self.price_spin = QDoubleSpinBox()
        self.price_spin.setMinimum(0.01)
        self.price_spin.setMaximum(999999.99)
        self.price_spin.setDecimals(2)
        self.price_spin.valueChanged.connect(self.calculate_extended)
        form_layout.addRow("Unit Price:", self.price_spin)
        
        self.extended_label = QLabel("$0.00")
        self.extended_label.setStyleSheet("font-weight: bold;")
        form_layout.addRow("Extended Price:", self.extended_label)
        
        layout.addLayout(form_layout)
        
        # Buttons
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
    
    def load_products(self):
        """Load products into combo box."""
        products = ["RAW-001", "COMP-001", "FG-001", "PKG-001"]
        self.product_combo.addItems(products)
    
    def calculate_extended(self):
        """Calculate extended price."""
        quantity = self.quantity_spin.value()
        unit_price = self.price_spin.value()
        extended = quantity * unit_price
        self.extended_label.setText(f"${extended:.2f}")
    
    def get_line_data(self):
        """Get line item data."""
        return {
            'sku': self.product_combo.currentText(),
            'quantity': self.quantity_spin.value(),
            'unit_price': self.price_spin.value(),
            'extended_price': self.quantity_spin.value() * self.price_spin.value(),
            'notes': ''
        }