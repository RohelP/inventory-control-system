"""Pricing management module."""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLabel, QLineEdit, QComboBox, QGroupBox, QFormLayout,
    QDialog, QDialogButtonBox, QSpinBox, QDoubleSpinBox, QTextEdit,
    QMessageBox, QHeaderView, QTabWidget, QDateEdit, QCheckBox
)
from PyQt6.QtCore import Qt, pyqtSignal, QDate
from PyQt6.QtGui import QFont
from typing import Dict, Any


class PricingWidget(QWidget):
    """Main pricing management widget."""
    
    data_changed = pyqtSignal()
    
    def __init__(self, services: Dict[str, Any]):
        super().__init__()
        self.services = services
        self.setup_ui()
        self.refresh_data()
    
    def setup_ui(self):
        """Set up the pricing management UI."""
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header_layout = QHBoxLayout()
        
        title = QLabel("Pricing Management")
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
        self.new_rule_btn = QPushButton("New Pricing Rule")
        self.new_rule_btn.clicked.connect(self.new_pricing_rule)
        header_layout.addWidget(self.new_rule_btn)
        
        self.check_price_btn = QPushButton("Check Price")
        self.check_price_btn.clicked.connect(self.check_price)
        header_layout.addWidget(self.check_price_btn)
        
        self.refresh_btn = QPushButton("Refresh")
        self.refresh_btn.clicked.connect(self.refresh_data)
        header_layout.addWidget(self.refresh_btn)
        
        layout.addLayout(header_layout)
        
        # Tab widget for different pricing views
        tab_widget = QTabWidget()
        
        # Pricing Rules tab
        self.rules_widget = self.create_rules_tab()
        tab_widget.addTab(self.rules_widget, "Pricing Rules")
        
        # Customer Pricing tab
        self.customer_widget = self.create_customer_pricing_tab()
        tab_widget.addTab(self.customer_widget, "Customer Pricing")
        
        # Price Check tab
        self.check_widget = self.create_price_check_tab()
        tab_widget.addTab(self.check_widget, "Price Check")
        
        layout.addWidget(tab_widget)
    
    def create_rules_tab(self):
        """Create pricing rules tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Search and filter
        filter_layout = QHBoxLayout()
        
        self.rules_search = QLineEdit()
        self.rules_search.setPlaceholderText("Search pricing rules...")
        self.rules_search.textChanged.connect(self.filter_rules)
        filter_layout.addWidget(QLabel("Search:"))
        filter_layout.addWidget(self.rules_search)
        
        self.rule_type_filter = QComboBox()
        self.rule_type_filter.addItems([
            "All Types", "List Price", "Cost Plus", "Volume Discount", 
            "Customer Specific", "Promotional"
        ])
        self.rule_type_filter.currentTextChanged.connect(self.filter_rules)
        filter_layout.addWidget(QLabel("Type:"))
        filter_layout.addWidget(self.rule_type_filter)
        
        filter_layout.addStretch()
        layout.addLayout(filter_layout)
        
        # Rules table
        self.rules_table = QTableWidget()
        self.setup_rules_table()
        layout.addWidget(self.rules_table)
        
        return widget
    
    def create_customer_pricing_tab(self):
        """Create customer pricing tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Customer pricing controls
        controls_layout = QHBoxLayout()
        
        self.customer_search = QLineEdit()
        self.customer_search.setPlaceholderText("Search customer pricing...")
        controls_layout.addWidget(QLabel("Search:"))
        controls_layout.addWidget(self.customer_search)
        
        new_customer_price_btn = QPushButton("New Customer Price")
        new_customer_price_btn.clicked.connect(self.new_customer_pricing)
        controls_layout.addWidget(new_customer_price_btn)
        
        controls_layout.addStretch()
        layout.addLayout(controls_layout)
        
        # Customer pricing table
        self.customer_table = QTableWidget()
        self.setup_customer_table()
        layout.addWidget(self.customer_table)
        
        return widget
    
    def create_price_check_tab(self):
        """Create price check tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Price check form
        form_group = QGroupBox("Price Check")
        form_layout = QFormLayout(form_group)
        
        self.check_product_combo = QComboBox()
        self.load_products()
        form_layout.addRow("Product:", self.check_product_combo)
        
        self.check_customer_edit = QLineEdit()
        form_layout.addRow("Customer ID:", self.check_customer_edit)
        
        self.check_quantity_spin = QSpinBox()
        self.check_quantity_spin.setMinimum(1)
        self.check_quantity_spin.setMaximum(999999)
        self.check_quantity_spin.setValue(1)
        form_layout.addRow("Quantity:", self.check_quantity_spin)
        
        check_btn = QPushButton("Check Price")
        check_btn.clicked.connect(self.perform_price_check)
        form_layout.addRow("", check_btn)
        
        layout.addWidget(form_group)
        
        # Price results
        results_group = QGroupBox("Price Breakdown")
        results_layout = QVBoxLayout(results_group)
        
        self.price_results = QTextEdit()
        self.price_results.setMaximumHeight(200)
        self.price_results.setReadOnly(True)
        results_layout.addWidget(self.price_results)
        
        layout.addWidget(results_group)
        
        layout.addStretch()
        
        return widget
    
    def setup_rules_table(self):
        """Set up the pricing rules table."""
        headers = [
            "Rule Code", "Rule Name", "Type", "Product/Category", 
            "Customer", "Discount %", "Priority", "Status", "Effective Date"
        ]
        
        self.rules_table.setColumnCount(len(headers))
        self.rules_table.setHorizontalHeaderLabels(headers)
        
        # Set column widths
        header = self.rules_table.horizontalHeader()
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)  # Rule Name
        
        self.rules_table.setColumnWidth(0, 120)  # Rule Code
        self.rules_table.setColumnWidth(2, 120)  # Type
        self.rules_table.setColumnWidth(3, 150)  # Product/Category
        self.rules_table.setColumnWidth(4, 120)  # Customer
        self.rules_table.setColumnWidth(5, 80)   # Discount %
        self.rules_table.setColumnWidth(6, 70)   # Priority
        self.rules_table.setColumnWidth(7, 80)   # Status
        self.rules_table.setColumnWidth(8, 100)  # Effective Date
        
        self.rules_table.setSortingEnabled(True)
        self.rules_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.rules_table.itemDoubleClicked.connect(self.edit_pricing_rule)
    
    def setup_customer_table(self):
        """Set up the customer pricing table."""
        headers = [
            "Customer ID", "Customer Name", "Product SKU", 
            "Unit Price", "Min Quantity", "Effective Date", "Status"
        ]
        
        self.customer_table.setColumnCount(len(headers))
        self.customer_table.setHorizontalHeaderLabels(headers)
        
        # Set column widths
        header = self.customer_table.horizontalHeader()
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)  # Customer Name
        
        self.customer_table.setColumnWidth(0, 120)  # Customer ID
        self.customer_table.setColumnWidth(2, 120)  # Product SKU
        self.customer_table.setColumnWidth(3, 100)  # Unit Price
        self.customer_table.setColumnWidth(4, 100)  # Min Quantity
        self.customer_table.setColumnWidth(5, 100)  # Effective Date
        self.customer_table.setColumnWidth(6, 80)   # Status
        
        self.customer_table.setSortingEnabled(True)
        self.customer_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
    
    def load_products(self):
        """Load products for price check."""
        products = ["RAW-001", "COMP-001", "FG-001", "PKG-001"]
        self.check_product_combo.addItems(products)
    
    def refresh_data(self):
        """Refresh pricing data."""
        try:
            self.load_pricing_rules()
            self.load_customer_pricing()
            self.data_changed.emit()
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to refresh data:\n{str(e)}")
    
    def load_pricing_rules(self):
        """Load pricing rules data."""
        # Sample data
        sample_rules = [
            ("VOL-001", "Volume Discount 10%", "Volume Discount", "All Products", "All", "10.0", "50", "Active", "2024-01-01"),
            ("CUST-001", "ACME Special Pricing", "Customer Specific", "RAW-001", "ACME Corp", "15.0", "20", "Active", "2024-01-15"),
            ("PROMO-001", "Holiday Sale", "Promotional", "Category: FG", "All", "20.0", "10", "Active", "2024-12-01"),
        ]
        
        self.rules_table.setRowCount(len(sample_rules))
        
        for row, rule_data in enumerate(sample_rules):
            for col, value in enumerate(rule_data):
                item = QTableWidgetItem(str(value))
                
                # Right-align numeric columns
                if col in [5, 6]:  # Discount %, Priority
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                
                # Color code status
                if col == 7:  # Status column
                    if value == "Active":
                        item.setBackground(Qt.GlobalColor.green)
                    else:
                        item.setBackground(Qt.GlobalColor.lightGray)
                
                self.rules_table.setItem(row, col, item)
    
    def load_customer_pricing(self):
        """Load customer pricing data."""
        # Sample data
        sample_pricing = [
            ("ACME", "ACME Corporation", "RAW-001", "$12.50", "100", "2024-01-01", "Active"),
            ("TECH", "Tech Solutions Inc", "COMP-001", "$22.00", "50", "2024-02-01", "Active"),
        ]
        
        self.customer_table.setRowCount(len(sample_pricing))
        
        for row, pricing_data in enumerate(sample_pricing):
            for col, value in enumerate(pricing_data):
                item = QTableWidgetItem(str(value))
                
                # Right-align numeric columns
                if col in [3, 4]:  # Unit Price, Min Quantity
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                
                self.customer_table.setItem(row, col, item)
    
    def filter_rules(self):
        """Filter pricing rules table."""
        search_text = self.rules_search.text().lower()
        type_filter = self.rule_type_filter.currentText()
        
        for row in range(self.rules_table.rowCount()):
            show_row = True
            
            # Search filter
            if search_text:
                rule_code = self.rules_table.item(row, 0).text().lower()
                rule_name = self.rules_table.item(row, 1).text().lower()
                if search_text not in rule_code and search_text not in rule_name:
                    show_row = False
            
            # Type filter
            if type_filter != "All Types":
                rule_type = self.rules_table.item(row, 2).text()
                if rule_type != type_filter:
                    show_row = False
            
            self.rules_table.setRowHidden(row, not show_row)
    
    def new_pricing_rule(self):
        """Create new pricing rule."""
        dialog = PricingRuleDialog(self.services, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.refresh_data()
    
    def new_customer_pricing(self):
        """Create new customer pricing."""
        dialog = CustomerPricingDialog(self.services, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.refresh_data()
    
    def check_price(self):
        """Switch to price check tab."""
        # This would switch to the price check tab
        pass
    
    def perform_price_check(self):
        """Perform price check."""
        product = self.check_product_combo.currentText()
        customer = self.check_customer_edit.text()
        quantity = self.check_quantity_spin.value()
        
        # Sample price breakdown
        results = f"""
Price Check Results for {product}

Customer: {customer or 'General Pricing'}
Quantity: {quantity}

Base List Price: $15.00
Applicable Rules:
- Volume Discount (50+ units): -10% = $1.50
- Customer Specific Discount: -5% = $0.75

Final Unit Price: $12.75
Extended Price: ${12.75 * quantity:.2f}

Applied Rule: Volume Discount 10%
Rule Priority: 50
        """
        
        self.price_results.setPlainText(results.strip())
    
    def edit_pricing_rule(self, item):
        """Edit pricing rule."""
        row = item.row()
        rule_code = self.rules_table.item(row, 0).text()
        QMessageBox.information(
            self, 
            "Edit Rule", 
            f"Editing pricing rule {rule_code} will be implemented here."
        )


class PricingRuleDialog(QDialog):
    """Dialog for creating/editing pricing rules."""
    
    def __init__(self, services: Dict[str, Any], parent=None):
        super().__init__(parent)
        self.services = services
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the pricing rule dialog."""
        self.setWindowTitle("New Pricing Rule")
        self.setModal(True)
        self.resize(500, 400)
        
        layout = QVBoxLayout(self)
        
        # Basic information
        basic_group = QGroupBox("Basic Information")
        basic_layout = QFormLayout(basic_group)
        
        self.rule_code_edit = QLineEdit()
        basic_layout.addRow("Rule Code:", self.rule_code_edit)
        
        self.rule_name_edit = QLineEdit()
        basic_layout.addRow("Rule Name:", self.rule_name_edit)
        
        self.rule_type_combo = QComboBox()
        self.rule_type_combo.addItems([
            "List Price", "Cost Plus", "Volume Discount", 
            "Customer Specific", "Promotional"
        ])
        basic_layout.addRow("Rule Type:", self.rule_type_combo)
        
        self.priority_spin = QSpinBox()
        self.priority_spin.setMinimum(1)
        self.priority_spin.setMaximum(999)
        self.priority_spin.setValue(100)
        basic_layout.addRow("Priority:", self.priority_spin)
        
        layout.addWidget(basic_group)
        
        # Scope
        scope_group = QGroupBox("Rule Scope")
        scope_layout = QFormLayout(scope_group)
        
        self.product_edit = QLineEdit()
        self.product_edit.setPlaceholderText("Leave blank for all products")
        scope_layout.addRow("Product SKU:", self.product_edit)
        
        self.customer_edit = QLineEdit()
        self.customer_edit.setPlaceholderText("Leave blank for all customers")
        scope_layout.addRow("Customer ID:", self.customer_edit)
        
        self.min_quantity_spin = QSpinBox()
        self.min_quantity_spin.setMaximum(999999)
        scope_layout.addRow("Minimum Quantity:", self.min_quantity_spin)
        
        layout.addWidget(scope_group)
        
        # Pricing
        pricing_group = QGroupBox("Pricing Parameters")
        pricing_layout = QFormLayout(pricing_group)
        
        self.discount_percent_spin = QDoubleSpinBox()
        self.discount_percent_spin.setMaximum(100.0)
        self.discount_percent_spin.setDecimals(2)
        pricing_layout.addRow("Discount %:", self.discount_percent_spin)
        
        self.effective_date_edit = QDateEdit()
        self.effective_date_edit.setDate(QDate.currentDate())
        pricing_layout.addRow("Effective Date:", self.effective_date_edit)
        
        self.active_check = QCheckBox()
        self.active_check.setChecked(True)
        pricing_layout.addRow("Active:", self.active_check)
        
        layout.addWidget(pricing_group)
        
        # Buttons
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept_rule)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
    
    def accept_rule(self):
        """Accept and create the pricing rule."""
        if not self.rule_code_edit.text().strip():
            QMessageBox.warning(self, "Warning", "Please enter a rule code.")
            return
        
        if not self.rule_name_edit.text().strip():
            QMessageBox.warning(self, "Warning", "Please enter a rule name.")
            return
        
        QMessageBox.information(
            self,
            "Rule Created",
            f"Pricing rule {self.rule_code_edit.text()} created successfully."
        )
        
        self.accept()


class CustomerPricingDialog(QDialog):
    """Dialog for creating customer-specific pricing."""
    
    def __init__(self, services: Dict[str, Any], parent=None):
        super().__init__(parent)
        self.services = services
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the customer pricing dialog."""
        self.setWindowTitle("New Customer Pricing")
        self.setModal(True)
        self.resize(400, 300)
        
        layout = QVBoxLayout(self)
        
        form_layout = QFormLayout()
        
        self.customer_id_edit = QLineEdit()
        form_layout.addRow("Customer ID:", self.customer_id_edit)
        
        self.product_combo = QComboBox()
        products = ["RAW-001", "COMP-001", "FG-001", "PKG-001"]
        self.product_combo.addItems(products)
        form_layout.addRow("Product:", self.product_combo)
        
        self.unit_price_spin = QDoubleSpinBox()
        self.unit_price_spin.setMinimum(0.01)
        self.unit_price_spin.setMaximum(999999.99)
        self.unit_price_spin.setDecimals(2)
        form_layout.addRow("Unit Price:", self.unit_price_spin)
        
        self.min_qty_spin = QSpinBox()
        self.min_qty_spin.setMinimum(1)
        self.min_qty_spin.setMaximum(999999)
        form_layout.addRow("Minimum Quantity:", self.min_qty_spin)
        
        self.effective_date_edit = QDateEdit()
        self.effective_date_edit.setDate(QDate.currentDate())
        form_layout.addRow("Effective Date:", self.effective_date_edit)
        
        layout.addLayout(form_layout)
        
        # Buttons
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept_pricing)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
    
    def accept_pricing(self):
        """Accept customer pricing."""
        if not self.customer_id_edit.text().strip():
            QMessageBox.warning(self, "Warning", "Please enter customer ID.")
            return
        
        QMessageBox.information(
            self,
            "Customer Pricing Created",
            f"Customer pricing created for {self.customer_id_edit.text()}"
        )
        
        self.accept()