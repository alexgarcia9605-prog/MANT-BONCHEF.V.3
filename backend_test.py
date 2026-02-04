#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Bonchef Mantenimiento CMMS
Tests all endpoints: auth, departments, machines, work orders, file attachments, dashboard
"""

import requests
import sys
import json
import base64
from datetime import datetime, timezone
from io import BytesIO

class BonchefAPITester:
    def __init__(self, base_url="https://maint-checklist.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'departments': [],
            'machines': [],
            'work_orders': [],
            'users': []
        }

    def log(self, message, success=None):
        """Log test results with emoji indicators"""
        if success is True:
            print(f"✅ {message}")
            self.tests_passed += 1
        elif success is False:
            print(f"❌ {message}")
        else:
            print(f"🔍 {message}")
        self.tests_run += 1

    def make_request(self, method, endpoint, data=None, files=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            # Remove Content-Type for file uploads
            headers.pop('Content-Type', None)

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"Request failed - Expected {expected_status}, got {response.status_code}: {response.text}", False)
                return False, {}
                
        except Exception as e:
            self.log(f"Request error: {str(e)}", False)
            return False, {}

    # ============== HEALTH CHECK ==============
    def test_health_check(self):
        """Test API health endpoint"""
        self.log("Testing API health check...")
        success, data = self.make_request('GET', 'health')
        if success and 'status' in data:
            self.log(f"API is healthy - Status: {data['status']}", True)
            return True
        else:
            self.log("Health check failed", False)
            return False

    # ============== AUTHENTICATION TESTS ==============
    def test_user_registration(self):
        """Test user registration with different roles"""
        self.log("Testing user registration...")
        
        # Test admin user registration
        admin_data = {
            "email": f"admin_{datetime.now().strftime('%H%M%S')}@bonchef.com",
            "password": "AdminPass123!",
            "name": "Admin Test User",
            "role": "admin"
        }
        
        success, response = self.make_request('POST', 'auth/register', admin_data, expected_status=200)
        if success and 'token' in response:
            self.log("Admin user registration successful", True)
            self.token = response['token']
            self.user_data = response['user']
            self.created_resources['users'].append(response['user']['id'])
            return True
        else:
            self.log("Admin user registration failed", False)
            return False

    def test_user_login(self):
        """Test user login"""
        if not self.user_data:
            self.log("No user data available for login test", False)
            return False
            
        self.log("Testing user login...")
        login_data = {
            "email": self.user_data['email'],
            "password": "AdminPass123!"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        if success and 'token' in response:
            self.log("User login successful", True)
            self.token = response['token']
            return True
        else:
            self.log("User login failed", False)
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        self.log("Testing get current user...")
        success, data = self.make_request('GET', 'auth/me')
        if success and 'id' in data:
            self.log(f"Current user retrieved - Role: {data.get('role')}", True)
            return True
        else:
            self.log("Get current user failed", False)
            return False

    # ============== DEPARTMENTS TESTS ==============
    def test_create_department(self):
        """Test department creation"""
        self.log("Testing department creation...")
        dept_data = {
            "name": f"Test Department {datetime.now().strftime('%H%M%S')}",
            "description": "Test department for CMMS testing",
            "location": "Building A, Floor 1"
        }
        
        success, response = self.make_request('POST', 'departments', dept_data, expected_status=200)
        if success and 'id' in response:
            self.log(f"Department created - ID: {response['id']}", True)
            self.created_resources['departments'].append(response['id'])
            return response['id']
        else:
            self.log("Department creation failed", False)
            return None

    def test_get_departments(self):
        """Test getting all departments"""
        self.log("Testing get departments...")
        success, data = self.make_request('GET', 'departments')
        if success and isinstance(data, list):
            self.log(f"Retrieved {len(data)} departments", True)
            return True
        else:
            self.log("Get departments failed", False)
            return False

    def test_get_department_by_id(self, dept_id):
        """Test getting specific department"""
        if not dept_id:
            return False
            
        self.log(f"Testing get department by ID: {dept_id}")
        success, data = self.make_request('GET', f'departments/{dept_id}')
        if success and data.get('id') == dept_id:
            self.log("Department retrieved by ID", True)
            return True
        else:
            self.log("Get department by ID failed", False)
            return False

    # ============== MACHINES TESTS ==============
    def test_create_machine(self, dept_id):
        """Test machine creation"""
        if not dept_id:
            self.log("No department ID available for machine creation", False)
            return None
            
        self.log("Testing machine creation...")
        machine_data = {
            "name": f"Test Machine {datetime.now().strftime('%H%M%S')}",
            "code": f"TM-{datetime.now().strftime('%H%M%S')}",
            "department_id": dept_id,
            "description": "Test machine for CMMS testing",
            "brand": "Test Brand",
            "model": "Test Model v1.0",
            "serial_number": f"SN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "status": "operativa"
        }
        
        success, response = self.make_request('POST', 'machines', machine_data, expected_status=200)
        if success and 'id' in response:
            self.log(f"Machine created - ID: {response['id']}", True)
            self.created_resources['machines'].append(response['id'])
            return response['id']
        else:
            self.log("Machine creation failed", False)
            return None

    def test_get_machines(self):
        """Test getting all machines"""
        self.log("Testing get machines...")
        success, data = self.make_request('GET', 'machines')
        if success and isinstance(data, list):
            self.log(f"Retrieved {len(data)} machines", True)
            return True
        else:
            self.log("Get machines failed", False)
            return False

    def test_get_machines_by_department(self, dept_id):
        """Test filtering machines by department"""
        if not dept_id:
            return False
            
        self.log(f"Testing get machines by department: {dept_id}")
        success, data = self.make_request('GET', f'machines?department_id={dept_id}')
        if success and isinstance(data, list):
            self.log(f"Retrieved {len(data)} machines for department", True)
            return True
        else:
            self.log("Get machines by department failed", False)
            return False

    # ============== WORK ORDERS TESTS ==============
    def test_create_preventive_work_order(self, machine_id):
        """Test creating preventive work order"""
        if not machine_id:
            self.log("No machine ID available for work order creation", False)
            return None
            
        self.log("Testing preventive work order creation...")
        order_data = {
            "title": f"Preventive Maintenance {datetime.now().strftime('%H%M%S')}",
            "description": "Regular preventive maintenance check",
            "type": "preventivo",
            "priority": "media",
            "machine_id": machine_id,
            "scheduled_date": datetime.now(timezone.utc).isoformat(),
            "recurrence": "mensual",
            "estimated_hours": 2.5
        }
        
        success, response = self.make_request('POST', 'work-orders', order_data, expected_status=200)
        if success and 'id' in response:
            self.log(f"Preventive work order created - ID: {response['id']}", True)
            self.created_resources['work_orders'].append(response['id'])
            return response['id']
        else:
            self.log("Preventive work order creation failed", False)
            return None

    def test_create_corrective_work_order(self, machine_id):
        """Test creating corrective work order"""
        if not machine_id:
            self.log("No machine ID available for corrective work order creation", False)
            return None
            
        self.log("Testing corrective work order creation...")
        order_data = {
            "title": f"Corrective Repair {datetime.now().strftime('%H%M%S')}",
            "description": "Emergency repair needed",
            "type": "correctivo",
            "priority": "alta",
            "machine_id": machine_id,
            "scheduled_date": datetime.now(timezone.utc).isoformat(),
            "estimated_hours": 4.0
        }
        
        success, response = self.make_request('POST', 'work-orders', order_data, expected_status=200)
        if success and 'id' in response:
            self.log(f"Corrective work order created - ID: {response['id']}", True)
            self.created_resources['work_orders'].append(response['id'])
            return response['id']
        else:
            self.log("Corrective work order creation failed", False)
            return None

    def test_get_work_orders(self):
        """Test getting all work orders"""
        self.log("Testing get work orders...")
        success, data = self.make_request('GET', 'work-orders')
        if success and isinstance(data, list):
            self.log(f"Retrieved {len(data)} work orders", True)
            return True
        else:
            self.log("Get work orders failed", False)
            return False

    def test_update_work_order_status(self, order_id):
        """Test updating work order status"""
        if not order_id:
            return False
            
        self.log(f"Testing work order status update: {order_id}")
        update_data = {
            "status": "en_progreso",
            "notes": "Work started by technician"
        }
        
        success, response = self.make_request('PUT', f'work-orders/{order_id}', update_data, expected_status=200)
        if success and response.get('status') == 'en_progreso':
            self.log("Work order status updated successfully", True)
            return True
        else:
            self.log("Work order status update failed", False)
            return False

    def test_file_attachment_upload(self, order_id):
        """Test uploading file attachment to work order"""
        if not order_id:
            return False
            
        self.log(f"Testing file attachment upload for order: {order_id}")
        
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )
        
        files = {
            'file': ('test_image.png', BytesIO(test_image_data), 'image/png')
        }
        
        success, response = self.make_request('POST', f'work-orders/{order_id}/attachments', files=files, expected_status=200)
        if success and 'id' in response:
            self.log(f"File attachment uploaded - ID: {response['id']}", True)
            return response['id']
        else:
            self.log("File attachment upload failed", False)
            return None

    # ============== NEW FEATURES TESTS ==============
    def test_postpone_work_order(self, order_id):
        """Test postponing a work order"""
        if not order_id:
            return False
            
        self.log(f"Testing work order postpone: {order_id}")
        
        # First get the order to check current status
        success, order_data = self.make_request('GET', f'work-orders/{order_id}')
        if not success:
            self.log("Failed to get order for postpone test", False)
            return False
        
        # Only test postpone if order is not completed or cancelled
        if order_data.get('status') in ['completada', 'cancelada']:
            self.log("Order already completed/cancelled, skipping postpone test", True)
            return True
            
        postpone_data = {
            "status": "pospuesta",
            "postponed_date": "2024-12-31",
            "postpone_reason": "Falta de repuestos necesarios",
            "scheduled_date": "2024-12-31"
        }
        
        success, response = self.make_request('PUT', f'work-orders/{order_id}', postpone_data, expected_status=200)
        if success and response.get('status') == 'pospuesta':
            # Verify postpone fields are set
            if (response.get('postponed_date') and 
                response.get('postpone_reason') == postpone_data['postpone_reason']):
                self.log("Work order postponed successfully", True)
                return True
            else:
                self.log("Work order postpone fields not set correctly", False)
                return False
        else:
            self.log("Work order postpone failed", False)
            return False

    def test_partial_close_work_order(self, order_id):
        """Test partial close of a work order"""
        if not order_id:
            return False
            
        self.log(f"Testing work order partial close: {order_id}")
        
        # First get the order to check current status
        success, order_data = self.make_request('GET', f'work-orders/{order_id}')
        if not success:
            self.log("Failed to get order for partial close test", False)
            return False
        
        # Only test partial close if order is not completed or cancelled
        if order_data.get('status') in ['completada', 'cancelada']:
            self.log("Order already completed/cancelled, skipping partial close test", True)
            return True
            
        partial_close_data = {
            "status": "cerrada_parcial",
            "partial_close_notes": "Se completó la limpieza y lubricación. Pendiente cambio de filtros por falta de stock."
        }
        
        success, response = self.make_request('PUT', f'work-orders/{order_id}', partial_close_data, expected_status=200)
        if success and response.get('status') == 'cerrada_parcial':
            # Verify partial close notes are set
            if response.get('partial_close_notes') == partial_close_data['partial_close_notes']:
                self.log("Work order partial close successful", True)
                return True
            else:
                self.log("Work order partial close notes not set correctly", False)
                return False
        else:
            self.log("Work order partial close failed", False)
            return False

    def test_machine_file_attachments(self, machine_id):
        """Test machine file attachment functionality (upload, list, download, delete)"""
        if not machine_id:
            return False
            
        self.log(f"Testing machine file attachments for machine: {machine_id}")
        
        # Test 1: Upload file to machine
        test_image_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )
        
        files = {
            'file': ('machine_manual.png', BytesIO(test_image_data), 'image/png')
        }
        
        success, upload_response = self.make_request('POST', f'machines/{machine_id}/attachments', files=files, expected_status=200)
        if not success or 'id' not in upload_response:
            self.log("Machine file upload failed", False)
            return False
        
        file_id = upload_response['id']
        self.log(f"Machine file uploaded - ID: {file_id}", True)
        
        # Test 2: List machine attachments
        success, list_response = self.make_request('GET', f'machines/{machine_id}/attachments')
        if not success or not isinstance(list_response, list):
            self.log("Machine file list failed", False)
            return False
        
        # Check if our uploaded file is in the list
        uploaded_file = next((f for f in list_response if f['id'] == file_id), None)
        if not uploaded_file:
            self.log("Uploaded file not found in machine attachments list", False)
            return False
        
        self.log(f"Machine attachments listed - Found {len(list_response)} files", True)
        
        # Test 3: Download specific attachment
        success, download_response = self.make_request('GET', f'machines/{machine_id}/attachments/{file_id}')
        if not success or 'data' not in download_response:
            self.log("Machine file download failed", False)
            return False
        
        self.log("Machine file download successful", True)
        
        # Test 4: Delete attachment
        success, delete_response = self.make_request('DELETE', f'machines/{machine_id}/attachments/{file_id}', expected_status=200)
        if not success:
            self.log("Machine file delete failed", False)
            return False
        
        self.log("Machine file deleted successfully", True)
        
        # Test 5: Verify file is deleted (list should be empty or not contain our file)
        success, final_list = self.make_request('GET', f'machines/{machine_id}/attachments')
        if success:
            remaining_file = next((f for f in final_list if f['id'] == file_id), None)
            if remaining_file:
                self.log("File still exists after deletion", False)
                return False
            else:
                self.log("File successfully removed from machine attachments", True)
        
        return True

    def test_machine_attachments_all_users(self, machine_id, tech_token):
        """Test that all users (including technicians) can access machine attachments"""
        if not machine_id or not tech_token:
            return False
            
        self.log("Testing machine attachments access for all users...")
        
        # Upload file as admin
        test_image_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )
        
        files = {
            'file': ('tech_manual.png', BytesIO(test_image_data), 'image/png')
        }
        
        success, upload_response = self.make_request('POST', f'machines/{machine_id}/attachments', files=files, expected_status=200)
        if not success:
            self.log("Admin file upload failed", False)
            return False
        
        file_id = upload_response['id']
        
        # Switch to technician token
        original_token = self.token
        self.token = tech_token
        
        # Test technician can list files
        success, list_response = self.make_request('GET', f'machines/{machine_id}/attachments')
        if not success:
            self.log("Technician cannot list machine attachments", False)
            self.token = original_token
            return False
        
        # Test technician can upload files
        files2 = {
            'file': ('tech_upload.png', BytesIO(test_image_data), 'image/png')
        }
        
        success, tech_upload = self.make_request('POST', f'machines/{machine_id}/attachments', files=files2, expected_status=200)
        if not success:
            self.log("Technician cannot upload machine attachments", False)
            self.token = original_token
            return False
        
        tech_file_id = tech_upload['id']
        
        # Test technician can download files
        success, download_response = self.make_request('GET', f'machines/{machine_id}/attachments/{file_id}')
        if not success:
            self.log("Technician cannot download machine attachments", False)
            self.token = original_token
            return False
        
        # Test technician can delete files (their own)
        success, delete_response = self.make_request('DELETE', f'machines/{machine_id}/attachments/{tech_file_id}', expected_status=200)
        if not success:
            self.log("Technician cannot delete machine attachments", False)
            self.token = original_token
            return False
        
        # Restore admin token
        self.token = original_token
        
        # Clean up admin file
        self.make_request('DELETE', f'machines/{machine_id}/attachments/{file_id}', expected_status=200)
        
        self.log("All users can access machine attachments successfully", True)
        return True

    def test_new_order_statuses(self):
        """Test that new order statuses (pospuesta, cerrada_parcial) are handled correctly"""
        self.log("Testing new order statuses in work orders list...")
        
        success, orders = self.make_request('GET', 'work-orders')
        if not success:
            self.log("Failed to get work orders for status test", False)
            return False
        
        # Check if any orders have the new statuses
        postponed_orders = [o for o in orders if o.get('status') == 'pospuesta']
        partial_closed_orders = [o for o in orders if o.get('status') == 'cerrada_parcial']
        
        if postponed_orders:
            self.log(f"Found {len(postponed_orders)} postponed orders", True)
        
        if partial_closed_orders:
            self.log(f"Found {len(partial_closed_orders)} partial closed orders", True)
        
        # Test that orders with new statuses have the required fields
        for order in postponed_orders:
            if not order.get('postponed_date') or not order.get('postpone_reason'):
                self.log("Postponed order missing required fields", False)
                return False
        
        for order in partial_closed_orders:
            if not order.get('partial_close_notes'):
                self.log("Partial closed order missing required notes", False)
                return False
        
        self.log("New order statuses working correctly", True)
        return True

    # ============== DASHBOARD TESTS ==============
    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        self.log("Testing dashboard stats...")
        success, data = self.make_request('GET', 'dashboard/stats')
        if success and 'machines' in data and 'orders' in data:
            self.log(f"Dashboard stats retrieved - Machines: {data['machines']['total']}, Orders: {data['orders']['total']}", True)
            return True
        else:
            self.log("Dashboard stats failed", False)
            return False

    def test_recent_orders(self):
        """Test recent orders endpoint"""
        self.log("Testing recent orders...")
        success, data = self.make_request('GET', 'dashboard/recent-orders')
        if success and isinstance(data, list):
            self.log(f"Retrieved {len(data)} recent orders", True)
            return True
        else:
            self.log("Recent orders failed", False)
            return False

    def test_calendar_events(self):
        """Test calendar events endpoint"""
        self.log("Testing calendar events...")
        success, data = self.make_request('GET', 'dashboard/calendar')
        if success and isinstance(data, list):
            self.log(f"Retrieved {len(data)} calendar events", True)
            return True
        else:
            self.log("Calendar events failed", False)
            return False

    # ============== MY ORDERS TESTS ==============
    def test_create_technician_user(self):
        """Create a technician user for my-orders testing"""
        self.log("Creating technician user for my-orders testing...")
        
        tech_data = {
            "email": f"tecnico_{datetime.now().strftime('%H%M%S')}@bonchef.com",
            "password": "TechPass123!",
            "name": "Técnico Test User",
            "role": "tecnico"
        }
        
        success, response = self.make_request('POST', 'auth/register', tech_data, expected_status=200)
        if success and 'token' in response:
            self.log("Technician user created successfully", True)
            return response['user']['id'], response['token'], tech_data
        else:
            self.log("Technician user creation failed", False)
            return None, None, None

    def test_assign_orders_to_technician(self, machine_id, tech_id):
        """Create and assign orders to technician"""
        if not machine_id or not tech_id:
            return [], []
            
        self.log("Creating orders assigned to technician...")
        
        # Create preventive order with recurrence
        preventive_data = {
            "title": "Mantenimiento Preventivo Mensual",
            "description": "Revisión mensual de la máquina",
            "type": "preventivo",
            "priority": "media",
            "machine_id": machine_id,
            "assigned_to": tech_id,
            "scheduled_date": datetime.now(timezone.utc).isoformat(),
            "recurrence": "mensual",
            "estimated_hours": 2.0
        }
        
        success, prev_response = self.make_request('POST', 'work-orders', preventive_data, expected_status=200)
        preventive_id = prev_response.get('id') if success else None
        
        # Create corrective order
        corrective_data = {
            "title": "Reparación Urgente",
            "description": "Fallo en el sistema eléctrico",
            "type": "correctivo",
            "priority": "alta",
            "machine_id": machine_id,
            "assigned_to": tech_id,
            "scheduled_date": datetime.now(timezone.utc).isoformat(),
            "estimated_hours": 3.0
        }
        
        success, corr_response = self.make_request('POST', 'work-orders', corrective_data, expected_status=200)
        corrective_id = corr_response.get('id') if success else None
        
        if preventive_id and corrective_id:
            self.log(f"Orders assigned to technician - Preventive: {preventive_id}, Corrective: {corrective_id}", True)
            return [preventive_id, corrective_id], [prev_response, corr_response]
        else:
            self.log("Failed to create orders for technician", False)
            return [], []

    def test_my_orders_endpoint(self, tech_token):
        """Test /api/my-orders endpoint with technician token"""
        if not tech_token:
            return False
            
        self.log("Testing /api/my-orders endpoint...")
        
        # Temporarily switch to technician token
        original_token = self.token
        self.token = tech_token
        
        success, data = self.make_request('GET', 'my-orders')
        
        # Restore original token
        self.token = original_token
        
        if success and isinstance(data, dict):
            # Check structure
            required_keys = ['preventivo', 'correctivo', 'summary']
            if all(key in data for key in required_keys):
                # Check preventivo structure
                prev_data = data['preventivo']
                if all(status in prev_data for status in ['pendientes', 'en_progreso', 'completadas']):
                    # Check correctivo structure
                    corr_data = data['correctivo']
                    if all(status in corr_data for status in ['pendientes', 'en_progreso', 'completadas']):
                        # Check summary
                        summary = data['summary']
                        expected_summary_keys = ['total', 'preventivo_pendientes', 'preventivo_completadas', 
                                               'correctivo_pendientes', 'correctivo_completadas']
                        if all(key in summary for key in expected_summary_keys):
                            self.log(f"My-orders endpoint working - Total: {summary['total']} orders", True)
                            return True
        
        self.log("My-orders endpoint structure validation failed", False)
        return False

    def test_recurrence_functionality(self, preventive_order_id, tech_token):
        """Test that completing preventive order with recurrence creates next order with same technician"""
        if not preventive_order_id or not tech_token:
            return False
            
        self.log("Testing recurrence functionality...")
        
        # Get initial order count
        original_token = self.token
        self.token = tech_token
        success, initial_data = self.make_request('GET', 'my-orders')
        initial_count = initial_data.get('summary', {}).get('total', 0) if success else 0
        
        # Restore admin token to complete the order
        self.token = original_token
        
        # Complete the preventive order
        complete_data = {
            "status": "completada",
            "completed_date": datetime.now(timezone.utc).isoformat(),
            "notes": "Mantenimiento completado exitosamente"
        }
        
        success, response = self.make_request('PUT', f'work-orders/{preventive_order_id}', complete_data, expected_status=200)
        
        if success:
            # Wait a moment for the next order to be created
            import time
            time.sleep(1)
            
            # Check if new order was created for the same technician
            self.token = tech_token
            success, final_data = self.make_request('GET', 'my-orders')
            final_count = final_data.get('summary', {}).get('total', 0) if success else 0
            
            # Restore admin token
            self.token = original_token
            
            if final_count > initial_count:
                self.log("Recurrence functionality working - New order created for same technician", True)
                return True
            else:
                self.log("Recurrence functionality failed - No new order created", False)
                return False
        else:
            self.log("Failed to complete preventive order for recurrence test", False)
            return False

    # ============== MACHINE STOPS TESTS ==============
    def test_create_machine_stop(self, machine_id):
        """Test creating a machine stop"""
        if not machine_id:
            self.log("No machine ID available for machine stop creation", False)
            return None
            
        self.log("Testing machine stop creation...")
        stop_data = {
            "machine_id": machine_id,
            "stop_type": "averia",
            "reason": "Fallo en el motor principal - requiere revisión urgente",
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": None
        }
        
        success, response = self.make_request('POST', 'machine-stops', stop_data, expected_status=200)
        if success and 'id' in response:
            self.log(f"Machine stop created - ID: {response['id']}", True)
            return response['id']
        else:
            self.log("Machine stop creation failed", False)
            return None

    def test_get_machine_stops(self):
        """Test getting all machine stops"""
        self.log("Testing get machine stops...")
        success, data = self.make_request('GET', 'machine-stops')
        if success and isinstance(data, list):
            self.log(f"Retrieved {len(data)} machine stops", True)
            return True
        else:
            self.log("Get machine stops failed", False)
            return False

    def test_update_machine_stop(self, stop_id):
        """Test updating a machine stop (adding end time)"""
        if not stop_id:
            return False
            
        self.log(f"Testing machine stop update: {stop_id}")
        update_data = {
            "machine_id": "dummy",  # Will be ignored in update
            "stop_type": "averia",
            "reason": "Fallo en el motor principal - reparado",
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.make_request('PUT', f'machine-stops/{stop_id}', update_data, expected_status=200)
        if success and response.get('end_time'):
            self.log("Machine stop updated with end time", True)
            return True
        else:
            self.log("Machine stop update failed", False)
            return False

    def test_machine_stop_types(self, machine_id):
        """Test creating machine stops with different types"""
        if not machine_id:
            return False
            
        self.log("Testing different machine stop types...")
        
        stop_types = [
            {"type": "produccion", "reason": "Cambio de formato de producción"},
            {"type": "calidad", "reason": "Control de calidad - producto defectuoso"}
        ]
        
        created_stops = []
        for stop_type in stop_types:
            stop_data = {
                "machine_id": machine_id,
                "stop_type": stop_type["type"],
                "reason": stop_type["reason"],
                "start_time": datetime.now(timezone.utc).isoformat(),
                "end_time": None
            }
            
            success, response = self.make_request('POST', 'machine-stops', stop_data, expected_status=200)
            if success and 'id' in response:
                created_stops.append(response['id'])
        
        if len(created_stops) == len(stop_types):
            self.log(f"Created {len(created_stops)} different stop types", True)
            return created_stops
        else:
            self.log("Failed to create all stop types", False)
            return []

    # ============== MACHINE STARTS TESTS ==============
    def test_create_machine_start(self, machine_id, dept_id):
        """Test creating a machine start"""
        if not machine_id or not dept_id:
            self.log("No machine ID or department ID available for machine start creation", False)
            return None
            
        self.log("Testing machine start creation...")
        start_data = {
            "machine_id": machine_id,
            "department_id": dept_id,
            "target_time": "06:00",
            "actual_time": "06:15",
            "delay_reason": "Retraso en el suministro de materias primas",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success, response = self.make_request('POST', 'machine-starts', start_data, expected_status=200)
        if success and 'id' in response:
            self.log(f"Machine start created - ID: {response['id']}, On time: {response.get('on_time', 'N/A')}", True)
            return response['id']
        else:
            self.log("Machine start creation failed", False)
            return None

    def test_get_machine_starts(self):
        """Test getting all machine starts"""
        self.log("Testing get machine starts...")
        success, data = self.make_request('GET', 'machine-starts')
        if success and isinstance(data, list):
            self.log(f"Retrieved {len(data)} machine starts", True)
            return True
        else:
            self.log("Get machine starts failed", False)
            return False

    def test_update_machine_start(self, start_id):
        """Test updating a machine start"""
        if not start_id:
            return False
            
        self.log(f"Testing machine start update: {start_id}")
        update_data = {
            "machine_id": "dummy",  # Will be ignored in update
            "department_id": "dummy",  # Will be ignored in update
            "target_time": "06:00",
            "actual_time": "05:55",  # Earlier than target - should be on time
            "delay_reason": "",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success, response = self.make_request('PUT', f'machine-starts/{start_id}', update_data, expected_status=200)
        if success and response.get('on_time') == True:
            self.log("Machine start updated - now on time", True)
            return True
        else:
            self.log("Machine start update failed", False)
            return False

    def test_machine_starts_compliance_stats(self):
        """Test machine starts compliance statistics"""
        self.log("Testing machine starts compliance stats...")
        success, data = self.make_request('GET', 'machine-starts/compliance-stats')
        if success and isinstance(data, dict):
            # Check required structure
            required_keys = ['summary', 'by_department', 'by_machine', 'daily_chart']
            if all(key in data for key in required_keys):
                summary = data['summary']
                summary_keys = ['total', 'on_time', 'delayed', 'pending', 'compliance_rate']
                if all(key in summary for key in summary_keys):
                    self.log(f"Compliance stats working - Total: {summary['total']}, Compliance: {summary['compliance_rate']}%", True)
                    return True
                else:
                    self.log("Compliance stats - Invalid summary structure", False)
                    return False
            else:
                self.log("Compliance stats - Missing required keys", False)
                return False
        else:
            self.log("Machine starts compliance stats failed", False)
            return False

    def test_machine_starts_on_time_vs_delayed(self, machine_id, dept_id):
        """Test creating both on-time and delayed machine starts"""
        if not machine_id or not dept_id:
            return False
            
        self.log("Testing on-time vs delayed machine starts...")
        
        # Create on-time start
        on_time_data = {
            "machine_id": machine_id,
            "department_id": dept_id,
            "target_time": "08:00",
            "actual_time": "07:55",  # 5 minutes early
            "delay_reason": "",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success1, response1 = self.make_request('POST', 'machine-starts', on_time_data, expected_status=200)
        
        # Create delayed start
        delayed_data = {
            "machine_id": machine_id,
            "department_id": dept_id,
            "target_time": "09:00",
            "actual_time": "09:30",  # 30 minutes late
            "delay_reason": "Problema con el sistema de arranque automático",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success2, response2 = self.make_request('POST', 'machine-starts', delayed_data, expected_status=200)
        
        if success1 and success2:
            on_time = response1.get('on_time', False)
            delayed = not response2.get('on_time', True)
            delay_minutes = response2.get('delay_minutes', 0)
            
            if on_time and delayed and delay_minutes > 0:
                self.log(f"On-time vs delayed starts working - Delay: {delay_minutes} minutes", True)
                return True
            else:
                self.log("On-time vs delayed calculation failed", False)
                return False
        else:
            self.log("Failed to create on-time vs delayed starts", False)
            return False

    # ============== ANALYTICS TESTS ==============
    def test_analytics_recurring_correctives(self):
        """Test recurring correctives analytics endpoint"""
        self.log("Testing analytics/recurring-correctives endpoint...")
        success, data = self.make_request('GET', 'analytics/recurring-correctives')
        
        if success and isinstance(data, dict):
            # Check required structure
            required_keys = ['machines_with_recurring', 'top_recurring_issues', 'summary']
            if all(key in data for key in required_keys):
                # Check summary structure
                summary = data['summary']
                summary_keys = ['total_machines_analyzed', 'machines_with_recurring_issues', 'total_recurring_issues']
                if all(key in summary for key in summary_keys):
                    self.log(f"Recurring correctives analytics working - Analyzed: {summary['total_machines_analyzed']} machines, Recurring: {summary['machines_with_recurring_issues']}", True)
                    return True
                else:
                    self.log("Recurring correctives analytics - Invalid summary structure", False)
                    return False
            else:
                self.log("Recurring correctives analytics - Missing required keys", False)
                return False
        else:
            self.log("Recurring correctives analytics failed", False)
            return False

    def test_analytics_preventive_vs_corrective(self):
        """Test preventive vs corrective analytics endpoint"""
        self.log("Testing analytics/preventive-vs-corrective endpoint...")
        success, data = self.make_request('GET', 'analytics/preventive-vs-corrective')
        
        if success and isinstance(data, list):
            self.log(f"Preventive vs corrective analytics working - {len(data)} data points", True)
            return True
        else:
            self.log("Preventive vs corrective analytics failed", False)
            return False

    def test_analytics_failure_causes(self):
        """Test failure causes analytics endpoint"""
        self.log("Testing analytics/failure-causes endpoint...")
        success, data = self.make_request('GET', 'analytics/failure-causes')
        
        if success and isinstance(data, list):
            self.log(f"Failure causes analytics working - {len(data)} causes found", True)
            return True
        else:
            self.log("Failure causes analytics failed", False)
            return False

    def test_analytics_preventive_compliance(self):
        """Test preventive compliance analytics endpoint"""
        self.log("Testing analytics/preventive-compliance endpoint...")
        success, data = self.make_request('GET', 'analytics/preventive-compliance')
        
        if success and isinstance(data, dict):
            required_keys = ['summary', 'pie_data', 'monthly']
            if all(key in data for key in required_keys):
                self.log(f"Preventive compliance analytics working - Compliance rate: {data['summary'].get('compliance_rate', 0)}%", True)
                return True
            else:
                self.log("Preventive compliance analytics - Invalid structure", False)
                return False
        else:
            self.log("Preventive compliance analytics failed", False)
            return False

    def create_test_corrective_orders_for_analytics(self, machine_id):
        """Create multiple corrective orders with similar descriptions for analytics testing"""
        if not machine_id:
            return False
            
        self.log("Creating test corrective orders for analytics...")
        
        # Create multiple corrective orders with similar descriptions to simulate recurring issues
        test_orders = [
            {
                "title": "Fallo Motor Principal",
                "description": "Motor principal no arranca correctamente",
                "type": "correctivo",
                "priority": "alta",
                "machine_id": machine_id,
                "failure_cause": "desgaste",
                "estimated_hours": 3.0
            },
            {
                "title": "Fallo Motor Principal",
                "description": "Motor principal no arranca correctamente",
                "type": "correctivo", 
                "priority": "alta",
                "machine_id": machine_id,
                "failure_cause": "desgaste",
                "estimated_hours": 2.5
            },
            {
                "title": "Problema Eléctrico",
                "description": "Cortocircuito en panel de control",
                "type": "correctivo",
                "priority": "critica",
                "machine_id": machine_id,
                "failure_cause": "mala_utilizacion",
                "estimated_hours": 4.0
            }
        ]
        
        created_count = 0
        for order_data in test_orders:
            success, response = self.make_request('POST', 'work-orders', order_data, expected_status=200)
            if success and 'id' in response:
                created_count += 1
                self.created_resources['work_orders'].append(response['id'])
        
        if created_count > 0:
            self.log(f"Created {created_count} test corrective orders for analytics", True)
            return True
        else:
            self.log("Failed to create test corrective orders", False)
            return False

    # ============== MAIN TEST RUNNER ==============
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Bonchef Mantenimiento CMMS API Tests")
        print("=" * 60)
        
        # Health check
        if not self.test_health_check():
            print("❌ API is not healthy, stopping tests")
            return False
        
        # Authentication flow
        if not self.test_user_registration():
            print("❌ User registration failed, stopping tests")
            return False
            
        if not self.test_user_login():
            print("❌ User login failed, stopping tests")
            return False
            
        if not self.test_get_current_user():
            print("❌ Get current user failed, stopping tests")
            return False
        
        # Departments
        dept_id = self.test_create_department()
        if not dept_id:
            print("❌ Department creation failed, stopping tests")
            return False
            
        self.test_get_departments()
        self.test_get_department_by_id(dept_id)
        
        # Machines
        machine_id = self.test_create_machine(dept_id)
        if not machine_id:
            print("❌ Machine creation failed, stopping tests")
            return False
            
        self.test_get_machines()
        self.test_get_machines_by_department(dept_id)
        
        # Work Orders
        preventive_order_id = self.test_create_preventive_work_order(machine_id)
        corrective_order_id = self.test_create_corrective_work_order(machine_id)
        
        self.test_get_work_orders()
        
        if preventive_order_id:
            self.test_update_work_order_status(preventive_order_id)
            self.test_file_attachment_upload(preventive_order_id)
        
        # ============== MACHINE STOPS AND STARTS TESTING ==============
        print("\n🛑 Testing Machine Stops...")
        
        # Test machine stops
        stop_id = self.test_create_machine_stop(machine_id)
        self.test_get_machine_stops()
        if stop_id:
            self.test_update_machine_stop(stop_id)
        
        # Test different stop types
        self.test_machine_stop_types(machine_id)
        
        print("\n▶️ Testing Machine Starts...")
        
        # Test machine starts
        start_id = self.test_create_machine_start(machine_id, dept_id)
        self.test_get_machine_starts()
        if start_id:
            self.test_update_machine_start(start_id)
        
        # Test compliance stats
        self.test_machine_starts_compliance_stats()
        
        # Test on-time vs delayed scenarios
        self.test_machine_starts_on_time_vs_delayed(machine_id, dept_id)
        
        # Dashboard
        self.test_dashboard_stats()
        self.test_recent_orders()
        self.test_calendar_events()
        
        # My Orders functionality testing
        tech_id, tech_token, tech_data = self.test_create_technician_user()
        if tech_id and tech_token:
            order_ids, order_responses = self.test_assign_orders_to_technician(machine_id, tech_id)
            if order_ids:
                self.test_my_orders_endpoint(tech_token)
                # Test recurrence with the preventive order
                preventive_order = next((resp for resp in order_responses if resp.get('type') == 'preventivo'), None)
                if preventive_order:
                    self.test_recurrence_functionality(preventive_order['id'], tech_token)
        
        # Create test data for analytics
        if machine_id:
            self.create_test_corrective_orders_for_analytics(machine_id)
        
        # Analytics endpoints testing
        self.test_analytics_recurring_correctives()
        self.test_analytics_preventive_vs_corrective()
        self.test_analytics_failure_causes()
        self.test_analytics_preventive_compliance()
        
        # ============== NEW FEATURES TESTING ==============
        print("\n🆕 Testing New Features...")
        
        # Test postpone and partial close functionality
        if corrective_order_id:
            self.test_postpone_work_order(corrective_order_id)
        
        # Create another order for partial close test
        test_order_id = self.test_create_corrective_work_order(machine_id)
        if test_order_id:
            self.test_partial_close_work_order(test_order_id)
        
        # Test machine file attachments
        if machine_id:
            self.test_machine_file_attachments(machine_id)
            
            # Test machine attachments access for all users
            if tech_token:
                self.test_machine_attachments_all_users(machine_id, tech_token)
        
        # Test new order statuses
        self.test_new_order_statuses()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = BonchefAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())