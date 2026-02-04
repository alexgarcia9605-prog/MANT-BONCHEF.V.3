#!/usr/bin/env python3
"""
Backend API Test for Admin User Creation Functionality
Tests the admin-only user creation endpoint and related functionality
"""

import requests
import sys
import json
from datetime import datetime

class AdminUserCreationTester:
    def __init__(self, base_url="https://linea-tracker.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.non_admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_user_id = None
        self.created_user_email = None
        self.created_user_password = None

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

    def test_non_admin_login(self):
        """Get a non-admin token for testing restrictions"""
        # First, get users to find a non-admin
        success, users = self.run_test(
            "Get Users to Find Non-Admin",
            "GET",
            "users",
            200
        )
        
        if not success:
            return False
            
        non_admin_user = None
        for user in users:
            if user['role'] != 'admin':
                non_admin_user = user
                break
        
        if not non_admin_user:
            print("   ⚠️  No non-admin user found, skipping non-admin tests")
            return True
            
        # Try to login with a non-admin (we'll create one if needed)
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@bonchef.com"
        
        # Create a test user first
        success, response = self.run_test(
            "Create Test Non-Admin User",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "test123",
                "name": "Test Non-Admin",
                "role": "tecnico"
            }
        )
        
        if success:
            # Now login with this user
            success, response = self.run_test(
                "Non-Admin Login",
                "POST",
                "auth/login",
                200,
                data={"email": test_email, "password": "test123"}
            )
            if success and 'token' in response:
                self.non_admin_token = response['token']
                print(f"   Non-admin logged in successfully")
                return True
        
        return False

    def test_admin_create_user_success(self):
        """Test that admin can create users via register-admin endpoint"""
        timestamp = datetime.now().strftime('%H%M%S')
        self.created_user_email = f"test_created_{timestamp}@bonchef.com"
        self.created_user_password = "newuser123"
        
        user_data = {
            "name": "Test Created User",
            "email": self.created_user_email,
            "password": self.created_user_password,
            "role": "tecnico"
        }
        
        success, response = self.run_test(
            "Admin Create User via register-admin",
            "POST",
            "auth/register-admin",
            200,
            data=user_data
        )
        
        if success and 'user' in response:
            self.created_user_id = response['user']['id']
            print(f"   Created User ID: {self.created_user_id}")
            print(f"   Created User Email: {response['user']['email']}")
            print(f"   Created User Role: {response['user']['role']}")
            return True
        
        return False

    def test_admin_create_user_all_roles(self):
        """Test admin can create users with different roles"""
        roles = ["admin", "supervisor", "tecnico", "encargado_linea"]
        
        for role in roles:
            timestamp = datetime.now().strftime('%H%M%S')
            user_data = {
                "name": f"Test {role.title()} User",
                "email": f"test_{role}_{timestamp}@bonchef.com",
                "password": "test123",
                "role": role
            }
            
            success, response = self.run_test(
                f"Admin Create {role.title()} User",
                "POST",
                "auth/register-admin",
                200,
                data=user_data
            )
            
            if not success:
                return False
                
        return True

    def test_admin_create_user_duplicate_email(self):
        """Test that admin cannot create user with duplicate email"""
        user_data = {
            "name": "Duplicate Email Test",
            "email": "admin@bonchef.com",  # This should already exist
            "password": "test123",
            "role": "tecnico"
        }
        
        success, response = self.run_test(
            "Admin Create User with Duplicate Email",
            "POST",
            "auth/register-admin",
            400,  # Should fail with 400
            data=user_data
        )
        
        return success

    def test_admin_create_user_invalid_role(self):
        """Test that admin cannot create user with invalid role"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "name": "Invalid Role Test",
            "email": f"invalid_role_{timestamp}@bonchef.com",
            "password": "test123",
            "role": "invalid_role"
        }
        
        success, response = self.run_test(
            "Admin Create User with Invalid Role",
            "POST",
            "auth/register-admin",
            400,  # Should fail with 400
            data=user_data
        )
        
        return success

    def test_non_admin_cannot_create_user(self):
        """Test that non-admin users cannot use register-admin endpoint"""
        if not self.non_admin_token:
            print("   ⚠️  No non-admin token available, skipping test")
            return True
            
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "name": "Unauthorized Creation Test",
            "email": f"unauthorized_{timestamp}@bonchef.com",
            "password": "test123",
            "role": "tecnico"
        }
        
        success, response = self.run_test(
            "Non-Admin Cannot Create User",
            "POST",
            "auth/register-admin",
            403,  # Should fail with 403 Forbidden
            data=user_data,
            token=self.non_admin_token
        )
        
        return success

    def test_created_user_can_login(self):
        """Test that the created user can login with their credentials"""
        if not self.created_user_email or not self.created_user_password:
            print("   ⚠️  No created user credentials available, skipping test")
            return True
            
        success, response = self.run_test(
            "Created User Can Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.created_user_email,
                "password": self.created_user_password
            }
        )
        
        if success and 'token' in response:
            print(f"   Created user logged in successfully")
            print(f"   User ID: {response['user']['id']}")
            print(f"   User Role: {response['user']['role']}")
            return True
        
        return False

    def test_get_users_includes_created_user(self):
        """Test that the created user appears in the users list"""
        success, response = self.run_test(
            "Get Users List",
            "GET",
            "users",
            200
        )
        
        if success and isinstance(response, list):
            created_user_found = False
            for user in response:
                if user.get('id') == self.created_user_id:
                    created_user_found = True
                    print(f"   Found created user: {user['name']} ({user['email']})")
                    break
            
            if created_user_found:
                print("   ✅ Created user appears in users list")
                return True
            else:
                print("   ❌ Created user not found in users list")
                return False
        
        return False

    def test_admin_can_delete_created_user(self):
        """Test that admin can delete the created user"""
        if not self.created_user_id:
            print("   ⚠️  No created user ID available, skipping test")
            return True
            
        success, response = self.run_test(
            "Admin Delete Created User",
            "DELETE",
            f"users/{self.created_user_id}",
            200
        )
        
        if success:
            print("   ✅ User deleted successfully")
        
        return success

def main():
    """Run all tests"""
    print("🚀 Starting Admin User Creation API Tests")
    print("=" * 50)
    
    tester = AdminUserCreationTester()
    
    # Run admin authentication test
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Get non-admin token for restriction tests
    tester.test_non_admin_login()
    
    # Test admin user creation functionality
    test_results = []
    
    test_results.append(tester.test_admin_create_user_success())
    test_results.append(tester.test_admin_create_user_all_roles())
    test_results.append(tester.test_admin_create_user_duplicate_email())
    test_results.append(tester.test_admin_create_user_invalid_role())
    test_results.append(tester.test_non_admin_cannot_create_user())
    test_results.append(tester.test_created_user_can_login())
    test_results.append(tester.test_get_users_includes_created_user())
    test_results.append(tester.test_admin_can_delete_created_user())
    
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