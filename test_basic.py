"""Basic system test."""

from src.database import init_database, get_db_session
from src.services import InventoryService

# Test basic functionality
if __name__ == "__main__":
    print("Testing basic inventory control system...")
    
    # Initialize fresh database
    init_database(with_sample_data=True)
    
    # Test services
    db = get_db_session()
    try:
        inventory_service = InventoryService(db)
        
        # Test inventory valuation
        valuation = inventory_service.get_inventory_valuation()
        print(f"✅ Total inventory value: ${valuation['total_value']}")
        print(f"✅ Total units: {valuation['total_units']}")
        
        # Test getting inventory items
        from src.models import InventoryItem
        items = db.query(InventoryItem).limit(3).all()
        print(f"✅ Found {len(items)} inventory items")
        
        for item in items:
            print(f"  - {item.product.sku}: {item.quantity_on_hand} units @ ${item.average_cost}")
        
        print("\n✅ Basic system test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()