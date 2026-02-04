import requests
import sys
from datetime import datetime
import json

class PreventiveOrderTester:
    def __init__(self, base_url="https://maint-checklist.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tech_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.machine_id = None
        self.preventive_order_id = None
        self.tech_user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def setup_test_data(self):
        """Setup admin user, technician user, and machine for testing"""
        print("\n🔧 Setting up test data...")
        
        # Login as admin
        admin_success, admin_response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@test.com", "password": "admin123"}
        )
        if not admin_success:
            print("❌ Admin login failed, cannot continue")
            return False
        
        self.admin_token = admin_response.get('token')
        
        # Create technician user
        tech_success, tech_response = self.run_test(
            "Create Technician User",
            "POST",
            "auth/register",
            200,
            data={
                "email": f"tech_{datetime.now().strftime('%H%M%S')}@test.com",
                "password": "tech123",
                "name": "Test Technician",
                "role": "tecnico"
            }
        )
        if tech_success:
            self.tech_token = tech_response.get('token')
            self.tech_user_id = tech_response.get('user', {}).get('id')
        
        # Get existing machine or create one
        machines_success, machines_response = self.run_test(
            "Get Machines",
            "GET",
            "machines",
            200,
            token=self.admin_token
        )
        if machines_success and machines_response:
            self.machine_id = machines_response[0]['id']
        
        return admin_success and tech_success and machines_success

    def test_create_preventive_order(self):
        """Test creating a preventive order with new fields"""
        print("\n📋 Testing Preventive Order Creation...")
        
        checklist_data = [
            {"id": "1", "name": "Área o máquina recogida", "is_required": True, "checked": False, "order": 0},
            {"id": "2", "name": "Orden y limpieza", "is_required": True, "checked": False, "order": 1},
            {"id": "3", "name": "Verificar niveles de aceite", "is_required": False, "checked": False, "order": 2}
        ]
        
        order_data = {
            "title": "Mantenimiento Preventivo Mensual",
            "description": "Observaciones iniciales del preventivo",  # This is "observaciones"
            "type": "preventivo",
            "priority": "media",
            "machine_id": self.machine_id,
            "assigned_to": self.tech_user_id,
            "scheduled_date": "2024-12-20",
            "recurrence": "mensual",
            "estimated_hours": 2.5,
            "checklist": checklist_data,
            "technician_signature": "Juan Pérez - Técnico Senior"
        }
        
        success, response = self.run_test(
            "Create Preventive Order with Checklist and Signature",
            "POST",
            "work-orders",
            200,
            data=order_data,
            token=self.admin_token
        )
        
        if success:
            self.preventive_order_id = response.get('id')
            # Verify the order has the correct fields
            if (response.get('type') == 'preventivo' and 
                response.get('checklist') and 
                response.get('technician_signature') and
                response.get('description') == "Observaciones iniciales del preventivo"):
                print("✅ Preventive order created with correct fields")
                return True
            else:
                print("❌ Preventive order missing required fields")
                return False
        return False

    def test_preventive_order_fields(self):
        """Test that preventive orders don't have part_number and have correct fields"""
        print("\n🔍 Testing Preventive Order Field Structure...")
        
        success, response = self.run_test(
            "Get Preventive Order Details",
            "GET",
            f"work-orders/{self.preventive_order_id}",
            200,
            token=self.admin_token
        )
        
        if success:
            # Check that part_number is empty or not present for preventive orders
            part_number = response.get('part_number', '')
            if part_number == '' or part_number is None:
                print("✅ Part number correctly empty for preventive order")
            else:
                print(f"❌ Part number should be empty for preventive order, got: {part_number}")
                return False
            
            # Check required preventive fields
            required_fields = ['checklist', 'technician_signature', 'description']
            for field in required_fields:
                if field in response and response[field]:
                    print(f"✅ {field} present and populated")
                else:
                    print(f"❌ {field} missing or empty")
                    return False
            
            # Check checklist structure
            checklist = response.get('checklist', [])
            if len(checklist) >= 2:
                default_items = [item['name'] for item in checklist[:2]]
                if "Área o máquina recogida" in default_items and "Orden y limpieza" in default_items:
                    print("✅ Default checklist items present")
                else:
                    print(f"❌ Default checklist items missing: {default_items}")
                    return False
            else:
                print("❌ Checklist should have at least 2 default items")
                return False
            
            return True
        return False

    def test_technician_permissions(self):
        """Test that technician can only edit allowed fields"""
        print("\n👤 Testing Technician Role Permissions...")
        
        # Test technician can update allowed fields (checklist, description/observations, signature)
        updated_checklist = [
            {"id": "1", "name": "Área o máquina recogida", "is_required": True, "checked": True, "order": 0},
            {"id": "2", "name": "Orden y limpieza", "is_required": True, "checked": True, "order": 1},
            {"id": "3", "name": "Verificar niveles de aceite", "is_required": False, "checked": False, "order": 2}
        ]
        
        allowed_update = {
            "checklist": updated_checklist,
            "description": "Observaciones actualizadas por técnico",
            "technician_signature": "Juan Pérez - Completado"
        }
        
        success, response = self.run_test(
            "Technician Update Allowed Fields",
            "PUT",
            f"work-orders/{self.preventive_order_id}",
            200,
            data=allowed_update,
            token=self.tech_token
        )
        
        if success:
            # Verify the changes were applied
            if (response.get('description') == "Observaciones actualizadas por técnico" and
                response.get('technician_signature') == "Juan Pérez - Completado" and
                response.get('checklist')[0].get('checked') == True):
                print("✅ Technician can update allowed fields")
            else:
                print("❌ Technician updates not applied correctly")
                return False
        else:
            return False
        
        # Test technician cannot update restricted fields (status, priority)
        restricted_update = {
            "status": "completada",
            "priority": "alta"
        }
        
        # Get current order state first
        current_success, current_response = self.run_test(
            "Get Current Order State",
            "GET",
            f"work-orders/{self.preventive_order_id}",
            200,
            token=self.tech_token
        )
        
        if not current_success:
            return False
        
        current_status = current_response.get('status')
        current_priority = current_response.get('priority')
        
        # Try to update restricted fields
        restricted_success, restricted_response = self.run_test(
            "Technician Try Update Restricted Fields",
            "PUT",
            f"work-orders/{self.preventive_order_id}",
            200,  # API returns 200 but ignores restricted fields
            data=restricted_update,
            token=self.tech_token
        )
        
        if restricted_success:
            # Verify restricted fields were NOT changed
            if (restricted_response.get('status') == current_status and
                restricted_response.get('priority') == current_priority):
                print("✅ Technician cannot change restricted fields (status, priority)")
                return True
            else:
                print("❌ Technician was able to change restricted fields")
                return False
        
        return False

    def test_closed_date_auto_completion(self):
        """Test that closed_date is set automatically when status changes to completada"""
        print("\n📅 Testing Closed Date Auto-Completion...")
        
        # Admin changes status to completada
        completion_update = {
            "status": "completada"
        }
        
        success, response = self.run_test(
            "Admin Complete Order",
            "PUT",
            f"work-orders/{self.preventive_order_id}",
            200,
            data=completion_update,
            token=self.admin_token
        )
        
        if success:
            closed_date = response.get('closed_date')
            if closed_date:
                print(f"✅ Closed date automatically set: {closed_date}")
                
                # Verify the date is recent (within last minute)
                try:
                    closed_dt = datetime.fromisoformat(closed_date.replace('Z', '+00:00'))
                    now = datetime.now(closed_dt.tzinfo)
                    diff_seconds = abs((now - closed_dt).total_seconds())
                    if diff_seconds < 60:  # Within 1 minute
                        print("✅ Closed date is current timestamp")
                        return True
                    else:
                        print(f"❌ Closed date not current: {diff_seconds} seconds difference")
                        return False
                except Exception as e:
                    print(f"❌ Error parsing closed date: {e}")
                    return False
            else:
                print("❌ Closed date not set when status changed to completada")
                return False
        
        return False

    def test_preventive_list_display(self):
        """Test that preventive orders list shows correct columns"""
        print("\n📊 Testing Preventive Orders List Display...")
        
        success, response = self.run_test(
            "Get Preventive Orders List",
            "GET",
            "work-orders?type=preventivo",
            200,
            token=self.admin_token
        )
        
        if success and response:
            order = None
            for o in response:
                if o.get('id') == self.preventive_order_id:
                    order = o
                    break
            
            if order:
                # Check that it has closed_date field
                if 'closed_date' in order:
                    print("✅ Closed date column present in list")
                else:
                    print("❌ Closed date column missing from list")
                    return False
                
                # Check that part_number is empty for preventive
                part_number = order.get('part_number', '')
                if part_number == '' or part_number is None:
                    print("✅ Part number correctly empty in list for preventive order")
                else:
                    print(f"❌ Part number should be empty in list: {part_number}")
                    return False
                
                # Check technician signature is displayed
                signature = order.get('technician_signature', '')
                if signature:
                    print(f"✅ Technician signature displayed in list: {signature}")
                else:
                    print("❌ Technician signature missing from list")
                    return False
                
                return True
            else:
                print("❌ Created preventive order not found in list")
                return False
        
        return False

def main():
    print("🧪 Starting Preventive Work Order Module Testing...")
    tester = PreventiveOrderTester()
    
    # Setup test data
    if not tester.setup_test_data():
        print("❌ Failed to setup test data")
        return 1
    
    # Run all tests
    tests = [
        tester.test_create_preventive_order,
        tester.test_preventive_order_fields,
        tester.test_technician_permissions,
        tester.test_closed_date_auto_completion,
        tester.test_preventive_list_display
    ]
    
    for test in tests:
        try:
            if not test():
                print(f"❌ Test {test.__name__} failed")
        except Exception as e:
            print(f"❌ Test {test.__name__} error: {e}")
    
    # Print results
    print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All preventive order tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())