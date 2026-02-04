#!/usr/bin/env python3
"""
Backend API Test for Bonchef Mantenimiento - Encargado Línea Role
Tests the 'encargado_linea' role functionality and restrictions
"""

import requests
import sys
import json
from datetime import datetime

class EncargadoLineaAPITester:
    def __init__(self, base_url="https://linea-tracker.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.encargado_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user_id = None
        self.encargado_user_id = None
        self.test_machine_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

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
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@bonchef.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_get_work_orders(self):
        """Get work orders to test with"""
        success, response = self.run_test(
            "Get Work Orders",
            "GET",
            "work-orders",
            200
        )
        if success and isinstance(response, list) and len(response) >= 2:
            # Find preventive and corrective orders
            for order in response:
                if order['type'] == 'preventivo' and not self.preventive_order_id:
                    self.preventive_order_id = order['id']
                    print(f"   Found preventive order: {order['title']}")
                elif order['type'] == 'correctivo' and not self.corrective_order_id:
                    self.corrective_order_id = order['id']
                    print(f"   Found corrective order: {order['title']}")
            return True
        return False

    def test_preventive_realizar_realizada(self):
        """Test 'Realizar' -> 'Realizada' for preventive order"""
        if not self.preventive_order_id:
            print("❌ No preventive order available for testing")
            return False
            
        # Update preventive order with "Realizar" data and mark as "Realizada"
        realizar_data = {
            "description": "Mantenimiento preventivo completado correctamente",
            "technician_signature": "Admin User",
            "checklist": [
                {"id": "1", "name": "Verificar temperatura", "is_required": True, "checked": True},
                {"id": "2", "name": "Limpiar filtros", "is_required": True, "checked": True}
            ],
            "status": "completada"
        }
        
        success, response = self.run_test(
            "Preventive Realizar -> Realizada",
            "PUT",
            f"work-orders/{self.preventive_order_id}",
            200,
            data=realizar_data
        )
        
        if success:
            print(f"   Order status: {response.get('status', 'unknown')}")
            print(f"   Signature: {response.get('technician_signature', 'none')}")
            print(f"   Checklist items: {len(response.get('checklist', []))}")
        
        return success

    def test_corrective_realizar_cierre_parcial(self):
        """Test 'Realizar' -> 'Cierre Parcial' for corrective order"""
        if not self.corrective_order_id:
            print("❌ No corrective order available for testing")
            return False
            
        # Update corrective order with "Realizar" data and mark as "Cierre Parcial"
        realizar_data = {
            "notes": "Sensor de temperatura reemplazado. Funcionamiento verificado.",
            "failure_cause": "desgaste",
            "spare_part_used": "Sensor temperatura digital",
            "spare_part_reference": "TEMP-001-V2",
            "status": "cerrada_parcial"
        }
        
        success, response = self.run_test(
            "Corrective Realizar -> Cierre Parcial",
            "PUT",
            f"work-orders/{self.corrective_order_id}",
            200,
            data=realizar_data
        )
        
        if success:
            print(f"   Order status: {response.get('status', 'unknown')}")
            print(f"   Notes: {response.get('notes', 'none')}")
            print(f"   Failure cause: {response.get('failure_cause', 'none')}")
            print(f"   Spare part: {response.get('spare_part_used', 'none')}")
        
        return success

    def test_get_updated_orders(self):
        """Verify orders were updated correctly"""
        success = True
        
        # Check preventive order
        if self.preventive_order_id:
            test_success, response = self.run_test(
                "Verify Preventive Order Update",
                "GET",
                f"work-orders/{self.preventive_order_id}",
                200
            )
            if test_success:
                if response.get('status') == 'completada':
                    print("   ✅ Preventive order marked as completed")
                else:
                    print(f"   ❌ Preventive order status: {response.get('status')}")
                    success = False
            else:
                success = False
        
        # Check corrective order
        if self.corrective_order_id:
            test_success, response = self.run_test(
                "Verify Corrective Order Update",
                "GET",
                f"work-orders/{self.corrective_order_id}",
                200
            )
            if test_success:
                if response.get('status') == 'cerrada_parcial':
                    print("   ✅ Corrective order marked as partial close")
                else:
                    print(f"   ❌ Corrective order status: {response.get('status')}")
                    success = False
            else:
                success = False
        
        return success

def main():
    """Run all tests"""
    print("🚀 Starting Realizar Functionality API Tests")
    print("=" * 50)
    
    tester = RealizarAPITester()
    
    # Run authentication test
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1
    
    # Get work orders to test with
    if not tester.test_get_work_orders():
        print("❌ Could not get work orders, stopping tests")
        return 1
    
    # Test preventive order "Realizar" functionality
    tester.test_preventive_realizar_realizada()
    
    # Test corrective order "Realizar" functionality  
    tester.test_corrective_realizar_cierre_parcial()
    
    # Verify updates
    tester.test_get_updated_orders()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())