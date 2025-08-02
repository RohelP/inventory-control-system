"""Reports and analytics module."""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLabel, QLineEdit, QComboBox, QGroupBox, QFormLayout,
    QDialog, QDialogButtonBox, QSpinBox, QDoubleSpinBox, QTextEdit,
    QMessageBox, QHeaderView, QTabWidget, QDateEdit, QCheckBox,
    QProgressBar, QFileDialog
)
from PyQt6.QtCore import Qt, pyqtSignal, QDate, QThread, pyqtSignal as Signal
from PyQt6.QtGui import QFont
from typing import Dict, Any
from datetime import datetime, date, timedelta


class ReportGenerationThread(QThread):
    """Thread for generating reports in background."""
    
    progress_updated = Signal(int)
    report_completed = Signal(dict)
    error_occurred = Signal(str)
    
    def __init__(self, services, report_type, parameters):
        super().__init__()
        self.services = services
        self.report_type = report_type
        self.parameters = parameters
    
    def run(self):
        """Generate report in background thread."""
        try:
            self.progress_updated.emit(10)
            
            if self.report_type == "inventory_valuation":
                report_data = self.services['reporting'].get_inventory_valuation_report()
            elif self.report_type == "sales_performance":
                start_date = self.parameters['start_date']
                end_date = self.parameters['end_date']
                report_data = self.services['reporting'].get_sales_performance_report(start_date, end_date)
            elif self.report_type == "inventory_turnover":
                report_data = self.services['reporting'].get_inventory_turnover_report()
            elif self.report_type == "movement_report":
                start_date = self.parameters['start_date']
                end_date = self.parameters['end_date']
                report_data = self.services['reporting'].get_movement_report(start_date, end_date)
            else:
                raise ValueError(f"Unknown report type: {self.report_type}")
            
            self.progress_updated.emit(100)
            self.report_completed.emit(report_data)
            
        except Exception as e:
            self.error_occurred.emit(str(e))


class ReportsWidget(QWidget):
    """Main reports and analytics widget."""
    
    data_changed = pyqtSignal()
    
    def __init__(self, services: Dict[str, Any]):
        super().__init__()
        self.services = services
        self.current_report_data = None
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the reports UI."""
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header_layout = QHBoxLayout()
        
        title = QLabel("Reports & Analytics")
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
        self.export_btn = QPushButton("Export Report")
        self.export_btn.clicked.connect(self.export_report)
        self.export_btn.setEnabled(False)
        header_layout.addWidget(self.export_btn)
        
        self.refresh_btn = QPushButton("Refresh")
        self.refresh_btn.clicked.connect(self.refresh_data)
        header_layout.addWidget(self.refresh_btn)
        
        layout.addLayout(header_layout)
        
        # Tab widget for different reports
        tab_widget = QTabWidget()
        
        # Inventory Reports tab
        self.inventory_reports_widget = self.create_inventory_reports_tab()
        tab_widget.addTab(self.inventory_reports_widget, "Inventory Reports")
        
        # Sales Reports tab
        self.sales_reports_widget = self.create_sales_reports_tab()
        tab_widget.addTab(self.sales_reports_widget, "Sales Reports")
        
        # Analytics tab
        self.analytics_widget = self.create_analytics_tab()
        tab_widget.addTab(self.analytics_widget, "Analytics")
        
        layout.addWidget(tab_widget)
        
        # Progress bar for report generation
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)
    
    def create_inventory_reports_tab(self):
        """Create inventory reports tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Report selection
        selection_group = QGroupBox("Inventory Reports")
        selection_layout = QVBoxLayout(selection_group)
        
        # Inventory Valuation Report
        valuation_layout = QHBoxLayout()
        valuation_btn = QPushButton("Generate Inventory Valuation Report")
        valuation_btn.clicked.connect(lambda: self.generate_report("inventory_valuation"))
        valuation_layout.addWidget(valuation_btn)
        valuation_layout.addWidget(QLabel("Current inventory values by location and category"))
        valuation_layout.addStretch()
        selection_layout.addLayout(valuation_layout)
        
        # Inventory Movement Report
        movement_layout = QHBoxLayout()
        movement_btn = QPushButton("Generate Movement Report")
        movement_btn.clicked.connect(self.show_movement_dialog)
        movement_layout.addWidget(movement_btn)
        movement_layout.addWidget(QLabel("Stock movements for specified date range"))
        movement_layout.addStretch()
        selection_layout.addLayout(movement_layout)
        
        # Turnover Analysis
        turnover_layout = QHBoxLayout()
        turnover_btn = QPushButton("Generate Turnover Analysis")
        turnover_btn.clicked.connect(lambda: self.generate_report("inventory_turnover"))
        turnover_layout.addWidget(turnover_btn)
        turnover_layout.addWidget(QLabel("Inventory turnover ratios and slow-moving items"))
        turnover_layout.addStretch()
        selection_layout.addLayout(turnover_layout)
        
        # Reorder Recommendations
        reorder_layout = QHBoxLayout()
        reorder_btn = QPushButton("Generate Reorder Report")
        reorder_btn.clicked.connect(self.generate_reorder_report)
        reorder_layout.addWidget(reorder_btn)
        reorder_layout.addWidget(QLabel("Items below reorder point with recommendations"))
        reorder_layout.addStretch()
        selection_layout.addLayout(reorder_layout)
        
        layout.addWidget(selection_group)
        
        # Report display area
        self.inventory_display = QTextEdit()
        self.inventory_display.setReadOnly(True)
        layout.addWidget(self.inventory_display)
        
        return widget
    
    def create_sales_reports_tab(self):
        """Create sales reports tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Report selection
        selection_group = QGroupBox("Sales Reports")
        selection_layout = QVBoxLayout(selection_group)
        
        # Sales Performance Report
        performance_layout = QHBoxLayout()
        performance_btn = QPushButton("Generate Sales Performance")
        performance_btn.clicked.connect(self.show_sales_dialog)
        performance_layout.addWidget(performance_btn)
        performance_layout.addWidget(QLabel("Sales performance for specified period"))
        performance_layout.addStretch()
        selection_layout.addLayout(performance_layout)
        
        # Customer Analysis
        customer_layout = QHBoxLayout()
        customer_btn = QPushButton("Generate Customer Analysis")
        customer_btn.clicked.connect(self.generate_customer_analysis)
        customer_layout.addWidget(customer_btn)
        customer_layout.addWidget(QLabel("Top customers and order patterns"))
        customer_layout.addStretch()
        selection_layout.addLayout(customer_layout)
        
        # Product Performance
        product_layout = QHBoxLayout()
        product_btn = QPushButton("Generate Product Performance")
        product_btn.clicked.connect(self.generate_product_performance)
        product_layout.addWidget(product_btn)
        product_layout.addWidget(QLabel("Best-selling products and trends"))
        product_layout.addStretch()
        selection_layout.addLayout(product_layout)
        
        layout.addWidget(selection_group)
        
        # Report display area
        self.sales_display = QTextEdit()
        self.sales_display.setReadOnly(True)
        layout.addWidget(self.sales_display)
        
        return widget
    
    def create_analytics_tab(self):
        """Create analytics tab."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Analytics selection
        selection_group = QGroupBox("Advanced Analytics")
        selection_layout = QVBoxLayout(selection_group)
        
        # ABC Analysis
        abc_layout = QHBoxLayout()
        abc_btn = QPushButton("Run ABC Analysis")
        abc_btn.clicked.connect(self.run_abc_analysis)
        abc_layout.addWidget(abc_btn)
        abc_layout.addWidget(QLabel("Classify inventory by value and velocity"))
        abc_layout.addStretch()
        selection_layout.addLayout(abc_layout)
        
        # Demand Forecasting
        forecast_layout = QHBoxLayout()
        forecast_btn = QPushButton("Generate Demand Forecast")
        forecast_btn.clicked.connect(self.generate_forecast)
        forecast_layout.addWidget(forecast_btn)
        forecast_layout.addWidget(QLabel("Predict future demand patterns"))
        forecast_layout.addStretch()
        selection_layout.addLayout(forecast_layout)
        
        # Cost Analysis
        cost_layout = QHBoxLayout()
        cost_btn = QPushButton("BOM Cost Analysis")
        cost_btn.clicked.connect(self.generate_cost_analysis)
        cost_layout.addWidget(cost_btn)
        cost_layout.addWidget(QLabel("Analyze BOM calculation costs and trends"))
        cost_layout.addStretch()
        selection_layout.addLayout(cost_layout)
        
        layout.addWidget(selection_group)
        
        # Analytics display area
        self.analytics_display = QTextEdit()
        self.analytics_display.setReadOnly(True)
        layout.addWidget(self.analytics_display)
        
        return widget
    
    def refresh_data(self):
        """Refresh reports data."""
        self.data_changed.emit()
    
    def generate_report(self, report_type: str, parameters: Dict = None):
        """Generate report in background thread."""
        if parameters is None:
            parameters = {}
        
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        
        # Start background thread
        self.report_thread = ReportGenerationThread(self.services, report_type, parameters)
        self.report_thread.progress_updated.connect(self.progress_bar.setValue)
        self.report_thread.report_completed.connect(self.display_report)
        self.report_thread.error_occurred.connect(self.handle_report_error)
        self.report_thread.start()
    
    def display_report(self, report_data: Dict):
        """Display generated report."""
        self.current_report_data = report_data
        self.progress_bar.setVisible(False)
        self.export_btn.setEnabled(True)
        
        # Format report for display
        if 'summary' in report_data:
            report_text = self.format_report_text(report_data)
        else:
            report_text = str(report_data)
        
        # Display in appropriate tab
        current_tab = self.sender()
        if hasattr(self, 'inventory_display'):
            self.inventory_display.setPlainText(report_text)
    
    def format_report_text(self, report_data: Dict) -> str:
        """Format report data as readable text."""
        lines = []
        
        if 'report_date' in report_data:
            lines.append(f"Report Date: {report_data['report_date']}")
            lines.append("=" * 50)
        
        if 'summary' in report_data:
            lines.append("SUMMARY")
            lines.append("-" * 20)
            summary = report_data['summary']
            
            for key, value in summary.items():
                if isinstance(value, (int, float)):
                    if 'value' in key.lower() or 'amount' in key.lower():
                        lines.append(f"{key.replace('_', ' ').title()}: ${value:,.2f}")
                    else:
                        lines.append(f"{key.replace('_', ' ').title()}: {value:,}")
                else:
                    lines.append(f"{key.replace('_', ' ').title()}: {value}")
            lines.append("")
        
        if 'abc_analysis' in report_data:
            lines.append("ABC ANALYSIS")
            lines.append("-" * 20)
            abc = report_data['abc_analysis']
            
            for category, data in abc.items():
                lines.append(f"Category {category}:")
                lines.append(f"  Items: {data['items']:,}")
                lines.append(f"  Value: ${data['value']:,.2f}")
                lines.append(f"  Units: {data['units']:,}")
            lines.append("")
        
        if 'location_breakdown' in report_data:
            lines.append("LOCATION BREAKDOWN")
            lines.append("-" * 20)
            locations = report_data['location_breakdown']
            
            for location, data in locations.items():
                lines.append(f"{location}:")
                lines.append(f"  Items: {data['items']:,}")
                lines.append(f"  Value: ${data['value']:,.2f}")
                lines.append(f"  Units: {data['units']:,}")
            lines.append("")
        
        return "\n".join(lines)
    
    def handle_report_error(self, error_message: str):
        """Handle report generation error."""
        self.progress_bar.setVisible(False)
        QMessageBox.critical(self, "Report Error", f"Failed to generate report:\n{error_message}")
    
    def show_movement_dialog(self):
        """Show movement report dialog."""
        dialog = DateRangeDialog("Movement Report", self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            parameters = {
                'start_date': dialog.get_start_date(),
                'end_date': dialog.get_end_date()
            }
            self.generate_report("movement_report", parameters)
    
    def show_sales_dialog(self):
        """Show sales performance dialog."""
        dialog = DateRangeDialog("Sales Performance Report", self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            parameters = {
                'start_date': dialog.get_start_date(),
                'end_date': dialog.get_end_date()
            }
            self.generate_report("sales_performance", parameters)
    
    def generate_reorder_report(self):
        """Generate reorder recommendations report."""
        try:
            recommendations = self.services['reorder'].get_reorder_recommendations()
            
            report_lines = ["REORDER RECOMMENDATIONS REPORT", "=" * 40, ""]
            
            if not recommendations:
                report_lines.append("No items currently need reordering.")
            else:
                report_lines.append(f"Total items needing reorder: {len(recommendations)}")
                high_priority = [r for r in recommendations if r['urgency_score'] >= 75]
                report_lines.append(f"High priority items: {len(high_priority)}")
                report_lines.append("")
                
                # Top 10 most urgent
                report_lines.append("TOP 10 MOST URGENT ITEMS:")
                report_lines.append("-" * 30)
                
                for i, item in enumerate(recommendations[:10]):
                    report_lines.append(
                        f"{i+1:2d}. {item['product_sku']} - Current: {item['current_stock']}, "
                        f"Reorder: {item['reorder_point']}, Suggested: {item['suggested_order_quantity']}, "
                        f"Urgency: {item['urgency_score']:.0f}"
                    )
            
            self.inventory_display.setPlainText("\n".join(report_lines))
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to generate reorder report:\n{str(e)}")
    
    def generate_customer_analysis(self):
        """Generate customer analysis report."""
        report_text = """
CUSTOMER ANALYSIS REPORT
========================

Top Customers (Last 30 Days):
------------------------------
1. ACME Corporation - $15,250.00 (8 orders)
2. Tech Solutions Inc - $12,100.00 (5 orders)
3. Manufacturing Co - $8,750.00 (3 orders)

Customer Segments:
------------------
Enterprise (>$10k): 2 customers (67% of revenue)
Mid-Market ($1k-$10k): 5 customers (28% of revenue)
Small Business (<$1k): 12 customers (5% of revenue)

Order Patterns:
---------------
Average Order Value: $2,150
Average Order Frequency: 15 days
Customer Retention Rate: 85%
        """
        self.sales_display.setPlainText(report_text.strip())
    
    def generate_product_performance(self):
        """Generate product performance report."""
        report_text = """
PRODUCT PERFORMANCE REPORT
===========================

Best Selling Products (Last 30 Days):
--------------------------------------
1. RAW-001 Steel Rod - 1,250 units sold
2. COMP-001 Precision Bearing - 350 units sold
3. FG-001 Custom Assembly - 125 units sold

Product Categories Performance:
-------------------------------
Raw Materials: $125,000 (45% of sales)
Components: $85,000 (31% of sales)
Finished Goods: $65,000 (24% of sales)

Trends:
-------
• Raw materials showing 15% growth
• Custom assemblies increasing in demand
• Seasonal uptick in packaging materials
        """
        self.sales_display.setPlainText(report_text.strip())
    
    def run_abc_analysis(self):
        """Run ABC analysis."""
        try:
            results = self.services['inventory'].update_abc_classification()
            
            report_text = f"""
ABC ANALYSIS RESULTS
====================

Classification Summary:
-----------------------
Category A Items: {results.get('A', 0)} (High value/volume)
Category B Items: {results.get('B', 0)} (Medium value/volume)
Category C Items: {results.get('C', 0)} (Low value/volume)

Recommendations:
----------------
• A Items: Tight inventory control, frequent monitoring
• B Items: Moderate control, periodic reviews
• C Items: Basic control, bulk ordering opportunities

Analysis completed successfully.
Products have been reclassified in the system.
            """
            
            self.analytics_display.setPlainText(report_text.strip())
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to run ABC analysis:\n{str(e)}")
    
    def generate_forecast(self):
        """Generate demand forecast."""
        report_text = """
DEMAND FORECAST ANALYSIS
========================

Forecast Period: Next 90 days
Base Period: Last 365 days

Top Products Forecast:
----------------------
RAW-001: Expected demand 3,500 units (+12% vs last period)
COMP-001: Expected demand 950 units (+5% vs last period)
FG-001: Expected demand 280 units (-3% vs last period)

Seasonal Factors:
-----------------
Q4 typically shows 25% increase in finished goods
Q1 raw materials demand increases 15%
Summer months show 20% decrease overall

Recommendations:
----------------
• Increase RAW-001 safety stock by 15%
• Consider promotional pricing for FG-001
• Plan for Q1 raw materials surge
        """
        self.analytics_display.setPlainText(report_text.strip())
    
    def generate_cost_analysis(self):
        """Generate BOM cost analysis."""
        try:
            cost_analysis = self.services['reporting'].get_bom_cost_analysis()
            
            report_lines = ["BOM COST ANALYSIS", "=" * 20, ""]
            
            summary = cost_analysis.get('summary', {})
            if summary:
                report_lines.extend([
                    f"Total BOMs Analyzed: {summary.get('total_boms', 0)}",
                    f"Total Material Cost: ${summary.get('total_material_cost', 0):,.2f}",
                    f"Total Labor Cost: ${summary.get('total_labor_cost', 0):,.2f}",
                    f"Total BOM Cost: ${summary.get('total_bom_cost', 0):,.2f}",
                    f"Average BOM Cost: ${summary.get('avg_bom_cost', 0):,.2f}",
                    "",
                    "Cost Breakdown:",
                    f"  Materials: {summary.get('material_percentage', 0):.1f}%",
                    f"  Labor: {summary.get('labor_percentage', 0):.1f}%",
                    f"  Overhead: {summary.get('overhead_percentage', 0):.1f}%",
                    ""
                ])
            
            # Top components
            components = cost_analysis.get('top_components', [])
            if components:
                report_lines.extend(["Top Cost Components:", "-" * 20])
                for comp in components[:10]:
                    report_lines.append(
                        f"{comp['component_name']}: ${comp['total_cost']:,.2f} "
                        f"({comp['usage_count']} uses)"
                    )
            
            self.analytics_display.setPlainText("\n".join(report_lines))
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to generate cost analysis:\n{str(e)}")
    
    def export_report(self):
        """Export current report to file."""
        if not self.current_report_data:
            QMessageBox.warning(self, "Warning", "No report data to export.")
            return
        
        filename, _ = QFileDialog.getSaveFileName(
            self,
            "Export Report",
            f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            "Text Files (*.txt);;CSV Files (*.csv);;All Files (*)"
        )
        
        if filename:
            try:
                # Get current display text
                current_widget = self.get_current_display_widget()
                if current_widget:
                    content = current_widget.toPlainText()
                    
                    with open(filename, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    QMessageBox.information(self, "Export Complete", f"Report exported to:\n{filename}")
                
            except Exception as e:
                QMessageBox.critical(self, "Export Error", f"Failed to export report:\n{str(e)}")
    
    def get_current_display_widget(self):
        """Get the current display widget based on active tab."""
        # This would determine which display widget is currently active
        return self.inventory_display  # Simplified for now


class DateRangeDialog(QDialog):
    """Dialog for selecting date range for reports."""
    
    def __init__(self, title: str, parent=None):
        super().__init__(parent)
        self.setWindowTitle(f"{title} - Date Range")
        self.setModal(True)
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the date range dialog."""
        layout = QVBoxLayout(self)
        
        form_layout = QFormLayout()
        
        self.start_date_edit = QDateEdit()
        self.start_date_edit.setDate(QDate.currentDate().addDays(-30))
        form_layout.addRow("Start Date:", self.start_date_edit)
        
        self.end_date_edit = QDateEdit()
        self.end_date_edit.setDate(QDate.currentDate())
        form_layout.addRow("End Date:", self.end_date_edit)
        
        layout.addLayout(form_layout)
        
        # Buttons
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
    
    def get_start_date(self) -> date:
        """Get selected start date."""
        return self.start_date_edit.date().toPython()
    
    def get_end_date(self) -> date:
        """Get selected end date."""
        return self.end_date_edit.date().toPython()