"""Main desktop application entry point."""

import sys
from PyQt6.QtWidgets import QApplication, QMessageBox
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPalette, QColor

from .main_window import MainWindow
from ..database import init_database


def setup_application_style(app: QApplication):
    """Set up application-wide styling."""
    # Set application style
    app.setStyle('Fusion')
    
    # Custom color palette for professional look
    palette = QPalette()
    
    # Window colors
    palette.setColor(QPalette.ColorRole.Window, QColor(240, 240, 240))
    palette.setColor(QPalette.ColorRole.WindowText, QColor(0, 0, 0))
    
    # Base colors (input fields)
    palette.setColor(QPalette.ColorRole.Base, QColor(255, 255, 255))
    palette.setColor(QPalette.ColorRole.AlternateBase, QColor(245, 245, 245))
    
    # Selection colors
    palette.setColor(QPalette.ColorRole.Highlight, QColor(42, 130, 218))
    palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))
    
    # Button colors
    palette.setColor(QPalette.ColorRole.Button, QColor(225, 225, 225))
    palette.setColor(QPalette.ColorRole.ButtonText, QColor(0, 0, 0))
    
    # Tool tip colors
    palette.setColor(QPalette.ColorRole.ToolTipBase, QColor(255, 255, 220))
    palette.setColor(QPalette.ColorRole.ToolTipText, QColor(0, 0, 0))
    
    app.setPalette(palette)


def run_desktop_app():
    """Run the inventory control desktop application."""
    # Create QApplication
    app = QApplication(sys.argv)
    app.setApplicationName("Inventory Control System")
    app.setOrganizationName("Your Company")
    app.setApplicationVersion("1.0")
    
    # Set up styling
    setup_application_style(app)
    
    # Initialize database if needed
    try:
        # Check if database exists and is accessible
        from ..database import DatabaseManager
        import os
        
        db_exists = os.path.exists("inventory_control.db")
        
        if not db_exists:
            # Only initialize with sample data if database doesn't exist
            init_database(with_sample_data=True)
        else:
            # Just ensure tables exist, don't add sample data
            init_database(with_sample_data=False)
            
    except Exception as e:
        QMessageBox.critical(
            None,
            "Database Error", 
            f"Failed to initialize database:\n{str(e)}\n\nThe application will now exit."
        )
        sys.exit(1)
    
    # Create and show main window
    try:
        main_window = MainWindow()
        main_window.show()
        
        # Center window on screen
        screen = app.primaryScreen().geometry()
        window_geometry = main_window.geometry()
        x = (screen.width() - window_geometry.width()) // 2
        y = (screen.height() - window_geometry.height()) // 2
        main_window.move(x, y)
        
    except Exception as e:
        QMessageBox.critical(
            None,
            "Application Error",
            f"Failed to start application:\n{str(e)}"
        )
        sys.exit(1)
    
    # Run application event loop
    try:
        sys.exit(app.exec())
    except KeyboardInterrupt:
        # Handle Ctrl+C gracefully
        main_window.close()
        sys.exit(0)


if __name__ == "__main__":
    run_desktop_app()