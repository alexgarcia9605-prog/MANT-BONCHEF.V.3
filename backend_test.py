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

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Use specific token if provided, otherwise use admin token
        auth_token = token or self.admin_token
        if auth_token:
            test_headers['Authorization'] = f'Bearer {auth_token}'
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

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@bonchef.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            self.admin_user_id = response['user']['id']
            print(f"   Admin User ID: {self.admin_user_id}")
            return True
        return False

    def test_create_encargado_user(self):
        """Create a test user with encargado_linea role"""
        test_email = f"encargado_test_{datetime.now().strftime('%H%M%S')}@bonchef.com"
        success, response = self.run_test(
            "Create Encargado Línea User",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "test123",
                "name": "Test Encargado",
                "role": "encargado_linea"
            }
        )
        if success and 'user' in response:
            self.encargado_user_id = response['user']['id']
            print(f"   Encargado User ID: {self.encargado_user_id}")
            print(f"   Email: {test_email}")
            return True
        return False

    def test_encargado_login(self):
        """Test encargado login"""
        # First get the user email
        success, users = self.run_test(
            "Get Users to Find Encargado Email",
            "GET",
            "users",
            200
        )
        
        if not success:
            return False
            
        encargado_email = None
        for user in users:
            if user['id'] == self.encargado_user_id:
                encargado_email = user['email']
                break
        
        if not encargado_email:
            print("❌ Could not find encargado email")
            return False
            
        success, response = self.run_test(
            "Encargado Login",
            "POST",
            "auth/login",
            200,
            data={"email": encargado_email, "password": "test123"}
        )
        if success and 'token' in response:
            self.encargado_token = response['token']
            print(f"   Encargado logged in successfully")
            return True
        return False

    def test_get_machines(self):
        """Get machines to use for testing"""
        success, response = self.run_test(
            "Get Machines",
            "GET",
            "machines",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            self.test_machine_id = response[0]['id']
            print(f"   Using machine: {response[0]['name']}")
            return True
        return False

    def test_encargado_create_corrective_order(self):
        """Test that encargado can create corrective orders"""
        if not self.test_machine_id:
            print("❌ No machine available for testing")
            return False
            
        order_data = {
            "title": "Test Corrective Order by Encargado",
            "description": "Test corrective order created by encargado_linea role",
            "type": "correctivo",
            "priority": "media",
            "machine_id": self.test_machine_id,
            "failure_cause": "Test failure",
            "spare_part_used": "Test part"
        }
        
        success, response = self.run_test(
            "Encargado Create Corrective Order",
            "POST",
            "work-orders",
            200,
            data=order_data,
            token=self.encargado_token
        )
        
        if success:
            print(f"   Order ID: {response.get('id')}")
            print(f"   Order Type: {response.get('type')}")
        
        return success

    def test_encargado_cannot_create_preventive_order(self):
        """Test that encargado CANNOT create preventive orders"""
        if not self.test_machine_id:
            print("❌ No machine available for testing")
            return False
            
        order_data = {
            "title": "Test Preventive Order by Encargado (Should Fail)",
            "description": "This should be rejected",
            "type": "preventivo",
            "priority": "media",
            "machine_id": self.test_machine_id,
            "scheduled_date": "2024-12-31T10:00:00Z"
        }
        
        # This should return 403 Forbidden
        success, response = self.run_test(
            "Encargado Cannot Create Preventive Order",
            "POST",
            "work-orders",
            403,  # Expecting 403 Forbidden
            data=order_data,
            token=self.encargado_token
        )
        
        if success:
            print("   ✅ Correctly rejected preventive order creation")
        
        return success

    def test_role_exists_in_users_endpoint(self):
        """Test that encargado_linea role exists in users list"""
        success, response = self.run_test(
            "Check Encargado Role in Users",
            "GET",
            "users",
            200
        )
        
        if success:
            encargado_found = False
            for user in response:
                if user['role'] == 'encargado_linea':
                    encargado_found = True
                    print(f"   Found encargado_linea user: {user['name']}")
                    break
            
            if encargado_found:
                print("   ✅ encargado_linea role exists in system")
                return True
            else:
                print("   ❌ No encargado_linea users found")
                return False
        
        return False

    def test_update_user_role_to_encargado(self):
        """Test updating a user's role to encargado_linea"""
        if not self.encargado_user_id:
            return False
            
        success, response = self.run_test(
            "Update User Role to Encargado",
            "PUT",
            f"users/{self.encargado_user_id}/role?role=encargado_linea",
            200
        )
        
        if success:
            print("   ✅ Role update successful")
        
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