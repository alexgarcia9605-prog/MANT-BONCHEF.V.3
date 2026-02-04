#!/usr/bin/env python3
"""
Warehouse Module API Test for Bonchef Mantenimiento
Tests spare parts management and request functionality
"""

import requests
import sys
import json
from datetime import datetime

class WarehouseAPITester:
    def __init__(self, base_url="https://linea-tracker.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tech_token = None
        self.supervisor_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_machine_id = None
        self.test_part_id = None
        self.test_request_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
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
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

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
            print(f"   Admin logged in successfully")
            return True
        return False

    def test_tech_login(self):
        """Test technician login"""
        # First create a technician user
        tech_email = f"tech_test_{datetime.now().strftime('%H%M%S')}@bonchef.com"
        success, response = self.run_test(
            "Create Technician User",
            "POST",
            "auth/register",
            200,
            data={
                "email": tech_email,
                "password": "tech123",
                "name": "Test Technician",
                "role": "tecnico"
            }
        )
        
        if success:
            # Now login as technician
            success, response = self.run_test(
                "Technician Login",
                "POST",
                "auth/login",
                200,
                data={"email": tech_email, "password": "tech123"}
            )
            if success and 'token' in response:
                self.tech_token = response['token']
                print(f"   Technician logged in successfully")
                return True
        return False

    def test_get_machines(self):
        """Get machines to use for testing"""
        success, response = self.run_test(
            "Get Machines",
            "GET",
            "machines",
            200,
            token=self.admin_token
        )
        if success and isinstance(response, list) and len(response) > 0:
            self.test_machine_id = response[0]['id']
            print(f"   Using machine: {response[0]['name']}")
            return True
        return False

    def test_admin_create_spare_part(self):
        """Test admin can create spare parts"""
        part_data = {
            "name": "Test Bearing 6205",
            "internal_reference": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "external_reference": "SKF-6205-2RS",
            "description": "Test bearing for warehouse testing",
            "location": "Shelf A3, Drawer 5",
            "machine_id": self.test_machine_id,
            "stock_current": 5,
            "stock_min": 2,
            "stock_max": 20,
            "unit": "unidad",
            "supplier": "SKF",
            "price": 25.50
        }
        
        success, response = self.run_test(
            "Admin Create Spare Part",
            "POST",
            "spare-parts",
            200,
            data=part_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.test_part_id = response['id']
            print(f"   Part ID: {self.test_part_id}")
            print(f"   Status: {response.get('status')}")
            return True
        return False

    def test_tech_cannot_create_spare_part(self):
        """Test technician cannot create spare parts"""
        part_data = {
            "name": "Unauthorized Part",
            "internal_reference": "UNAUTH-001",
            "stock_current": 1,
            "stock_min": 1,
            "stock_max": 10
        }
        
        success, response = self.run_test(
            "Technician Cannot Create Spare Part",
            "POST",
            "spare-parts",
            403,  # Expecting 403 Forbidden
            data=part_data,
            token=self.tech_token
        )
        
        if success:
            print("   ✅ Correctly rejected part creation by technician")
        
        return success

    def test_get_spare_parts_with_status(self):
        """Test GET spare parts returns list with status"""
        success, response = self.run_test(
            "Get Spare Parts with Status",
            "GET",
            "spare-parts",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} spare parts")
            
            # Check if our test part is in the list and has status
            test_part_found = False
            for part in response:
                if part.get('id') == self.test_part_id:
                    test_part_found = True
                    status = part.get('status')
                    print(f"   Test part status: {status}")
                    
                    # Verify status calculation (stock_current=5, stock_min=2, stock_max=20)
                    # Should be 'normal' since 5 > 2 and 5 < 20
                    if status == 'normal':
                        print("   ✅ Status calculation correct")
                    else:
                        print(f"   ❌ Expected 'normal' status, got '{status}'")
                    break
            
            if test_part_found:
                return True
            else:
                print("   ❌ Test part not found in list")
        
        return False

    def test_tech_create_spare_part_request(self):
        """Test technician can create spare part requests"""
        if not self.test_part_id:
            print("❌ No test part available for request")
            return False
            
        request_data = {
            "spare_part_id": self.test_part_id,
            "quantity": 2,
            "reason": "Needed for urgent machine repair",
            "urgency": "alta"
        }
        
        success, response = self.run_test(
            "Technician Create Spare Part Request",
            "POST",
            "spare-part-requests",
            200,
            data=request_data,
            token=self.tech_token
        )
        
        if success and 'id' in response:
            self.test_request_id = response['id']
            print(f"   Request ID: {self.test_request_id}")
            print(f"   Status: {response.get('status')}")
            return True
        return False

    def test_get_spare_part_requests(self):
        """Test GET spare part requests"""
        success, response = self.run_test(
            "Get Spare Part Requests",
            "GET",
            "spare-part-requests",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} requests")
            
            # Check if our test request is in the list
            test_request_found = False
            for request in response:
                if request.get('id') == self.test_request_id:
                    test_request_found = True
                    print(f"   Test request status: {request.get('status')}")
                    print(f"   Quantity: {request.get('quantity')}")
                    print(f"   Urgency: {request.get('urgency')}")
                    break
            
            return test_request_found
        
        return False

    def test_admin_approve_request(self):
        """Test admin can approve requests"""
        if not self.test_request_id:
            print("❌ No test request available for approval")
            return False
            
        success, response = self.run_test(
            "Admin Approve Request",
            "PUT",
            f"spare-part-requests/{self.test_request_id}/resolve?status=aprobada",
            200,
            token=self.admin_token
        )
        
        if success:
            print("   ✅ Request approved successfully")
            return True
        return False

    def test_admin_deliver_request_and_check_stock(self):
        """Test admin can deliver request and stock is decremented"""
        if not self.test_request_id:
            print("❌ No test request available for delivery")
            return False
        
        # First get current stock
        success, parts = self.run_test(
            "Get Current Stock Before Delivery",
            "GET",
            "spare-parts",
            200,
            token=self.admin_token
        )
        
        current_stock = None
        if success:
            for part in parts:
                if part.get('id') == self.test_part_id:
                    current_stock = part.get('stock_current')
                    print(f"   Stock before delivery: {current_stock}")
                    break
        
        if current_stock is None:
            print("❌ Could not get current stock")
            return False
            
        # Deliver the request
        success, response = self.run_test(
            "Admin Deliver Request",
            "PUT",
            f"spare-part-requests/{self.test_request_id}/resolve?status=entregada",
            200,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        # Check if stock was decremented
        success, parts = self.run_test(
            "Get Stock After Delivery",
            "GET",
            "spare-parts",
            200,
            token=self.admin_token
        )
        
        if success:
            for part in parts:
                if part.get('id') == self.test_part_id:
                    new_stock = part.get('stock_current')
                    print(f"   Stock after delivery: {new_stock}")
                    
                    # Stock should be decremented by 2 (request quantity)
                    expected_stock = current_stock - 2
                    if new_stock == expected_stock:
                        print(f"   ✅ Stock correctly decremented from {current_stock} to {new_stock}")
                        return True
                    else:
                        print(f"   ❌ Expected stock {expected_stock}, got {new_stock}")
                        return False
        
        return False

    def test_create_low_stock_part(self):
        """Test creating a part with low stock to verify status calculation"""
        part_data = {
            "name": "Low Stock Test Part",
            "internal_reference": f"LOW-{datetime.now().strftime('%H%M%S')}",
            "stock_current": 1,  # Below minimum
            "stock_min": 5,
            "stock_max": 20
        }
        
        success, response = self.run_test(
            "Create Low Stock Part",
            "POST",
            "spare-parts",
            200,
            data=part_data,
            token=self.admin_token
        )
        
        if success:
            part_id = response.get('id')
            status = response.get('status')
            print(f"   Part status: {status}")
            
            if status == 'bajo':
                print("   ✅ Low stock status correctly calculated")
                return True
            else:
                print(f"   ❌ Expected 'bajo' status, got '{status}'")
        
        return False

    def test_create_high_stock_part(self):
        """Test creating a part with high stock to verify status calculation"""
        part_data = {
            "name": "High Stock Test Part",
            "internal_reference": f"HIGH-{datetime.now().strftime('%H%M%S')}",
            "stock_current": 25,  # Above maximum
            "stock_min": 5,
            "stock_max": 20
        }
        
        success, response = self.run_test(
            "Create High Stock Part",
            "POST",
            "spare-parts",
            200,
            data=part_data,
            token=self.admin_token
        )
        
        if success:
            status = response.get('status')
            print(f"   Part status: {status}")
            
            if status == 'alto':
                print("   ✅ High stock status correctly calculated")
                return True
            else:
                print(f"   ❌ Expected 'alto' status, got '{status}'")
        
        return False

    def test_admin_reject_request(self):
        """Test admin can reject requests"""
        # Create another request to reject
        if not self.test_part_id:
            return False
            
        request_data = {
            "spare_part_id": self.test_part_id,
            "quantity": 1,
            "reason": "Test request for rejection",
            "urgency": "baja"
        }
        
        success, response = self.run_test(
            "Create Request for Rejection Test",
            "POST",
            "spare-part-requests",
            200,
            data=request_data,
            token=self.tech_token
        )
        
        if not success:
            return False
            
        reject_request_id = response.get('id')
        
        # Now reject it
        success, response = self.run_test(
            "Admin Reject Request",
            "PUT",
            f"spare-part-requests/{reject_request_id}/resolve?status=rechazada",
            200,
            token=self.admin_token
        )
        
        if success:
            print("   ✅ Request rejected successfully")
            return True
        return False

def main():
    """Run all warehouse tests"""
    print("🚀 Starting Warehouse Module API Tests")
    print("=" * 50)
    
    tester = WarehouseAPITester()
    
    # Authentication tests
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    if not tester.test_tech_login():
        print("❌ Technician login failed, stopping tests")
        return 1
    
    # Get test data
    if not tester.test_get_machines():
        print("❌ Could not get machines, stopping tests")
        return 1
    
    # Spare parts CRUD tests
    tester.test_admin_create_spare_part()
    tester.test_tech_cannot_create_spare_part()
    tester.test_get_spare_parts_with_status()
    
    # Stock status tests
    tester.test_create_low_stock_part()
    tester.test_create_high_stock_part()
    
    # Request workflow tests
    tester.test_tech_create_spare_part_request()
    tester.test_get_spare_part_requests()
    tester.test_admin_approve_request()
    tester.test_admin_deliver_request_and_check_stock()
    tester.test_admin_reject_request()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All warehouse tests passed!")
        return 0
    else:
        print("⚠️  Some warehouse tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())