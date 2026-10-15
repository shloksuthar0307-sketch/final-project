from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from django.utils import timezone

from organizations.models import Organization, Branch
from core.models import (
    Vehicle, ServiceOrder, Estimate, EstimateItem, Invoice, PaymentTransaction,
    VehicleQRCode, ServiceTimelineEvent, AuditLog
)

User = get_user_model()

class RepairTraceWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Org & Branch
        self.org = Organization.objects.create(name="Apex Autocare Network")
        self.branch = Branch.objects.create(organization=self.org, name="Downtown Apex Center")

        # Users
        self.admin = User.objects.create_superuser(username="admin", password="adminpassword", email="admin@repairtrace.com", role="SUPER_ADMIN")
        self.orgadmin = User.objects.create_user(username="orgadmin", password="password123", email="orgadmin@repairtrace.com", role="ORG_ADMIN", organization=self.org)
        self.advisor = User.objects.create_user(username="advisor", password="password123", email="advisor@repairtrace.com", role="SERVICE_ADVISOR", organization=self.org, branch=self.branch)
        self.technician = User.objects.create_user(username="technician", password="password123", email="technician@repairtrace.com", role="TECHNICIAN", organization=self.org, branch=self.branch)
        self.customer = User.objects.create_user(username="shlok", password="password123", email="shlok@repairtrace.com", role="CUSTOMER")

        # Vehicle
        self.vehicle = Vehicle.objects.create(
            owner=self.customer,
            make="Porsche",
            model="911 GT3",
            year=2022,
            registration_number="MH-02-CB-9921",
            vin="WP0AB2A97NS245100"
        )
        self.qr = VehicleQRCode.objects.create(vehicle=self.vehicle, token="test-qr-token-12345")

        # Service Order & Estimate
        self.order = ServiceOrder.objects.create(
            vehicle=self.vehicle,
            branch=self.branch,
            order_number="RT-TEST-001",
            title="Brake Service",
            type="Repair",
            status="AWAITING_APPROVAL",
            advisor="Sarah Wilson",
            technician="Elena Rostova"
        )
        self.estimate = Estimate.objects.create(
            service_order=self.order,
            advisor=self.advisor,
            subtotal=Decimal("2500.00"),
            tax=Decimal("180.00"),
            total=Decimal("2680.00"),
            status="SENT"
        )
        EstimateItem.objects.create(
            estimate=self.estimate,
            type="PARTS",
            description="Brake Pads",
            quantity=1,
            unit_price=Decimal("1500.00"),
            total_price=Decimal("1500.00")
        )

    def test_jwt_authentication(self):
        """Test authentication token acquisition for customer and advisor"""
        response = self.client.post('/api/v1/auth/token/', {'username': 'shlok', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['role'], 'CUSTOMER')

        response = self.client.post('/api/v1/auth/token/', {'username': 'advisor', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], 'SERVICE_ADVISOR')

    def test_customer_isolation_and_vehicle_access(self):
        """Customers should only see their own vehicles"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/v1/customer/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['registration_number'], 'MH-02-CB-9921')

        # Another customer
        other_customer = User.objects.create_user(username="other", password="password123", role="CUSTOMER")
        self.client.force_authenticate(user=other_customer)
        response = self.client.get('/api/v1/customer/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_estimate_approval_workflow(self):
        """Customer approves estimate -> updates service order, logs audit, and creates timeline event"""
        self.client.force_authenticate(user=self.customer)
        url = f'/api/v1/customer/estimates/{self.estimate.id}/approve/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.estimate.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.estimate.status, 'APPROVED')
        self.assertEqual(self.order.status, 'APPROVED')
        
        # Verify AuditLog and ServiceTimelineEvent were created
        self.assertTrue(AuditLog.objects.filter(service_order=self.order, action='ESTIMATE_APPROVED').exists())
        self.assertTrue(ServiceTimelineEvent.objects.filter(service_order=self.order, title='Estimate Approved by Customer').exists())

    def test_public_vehicle_qr_history(self):
        """Unauthenticated public users can scan QR code token to see vehicle service timeline"""
        # Create completed timeline event
        ServiceTimelineEvent.objects.create(
            service_order=self.order,
            title="Intake Inspection",
            time=timezone.now(),
            completed=True
        )
        url = f'/api/v1/public/vehicle-history/{self.qr.token}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['vehicle']['make'], 'Porsche')
        self.assertIn('timeline', response.data)
        self.assertEqual(len(response.data['timeline']), 1)

    def test_payment_order_creation_and_verification(self):
        """Create invoice, initiate Razorpay payment order, and verify signature"""
        invoice = Invoice.objects.create(
            branch=self.branch,
            invoice_number="INV-TEST-001",
            customer=self.customer,
            vehicle=self.vehicle,
            service_order=self.order,
            amount=Decimal("1500.00"),
            paid=Decimal("0.00"),
            status="UNPAID"
        )
        self.client.force_authenticate(user=self.customer)
        
        # 1. Create Order
        res_order = self.client.post('/api/v1/payments/create-order/', {'invoice_id': str(invoice.id)})
        self.assertEqual(res_order.status_code, status.HTTP_201_CREATED)
        self.assertIn('order_id', res_order.data)
        
        # 2. Verify Payment (simulated)
        res_verify = self.client.post('/api/v1/payments/verify/', {
            'invoice_id': str(invoice.id),
            'order_id': res_order.data['order_id'],
            'payment_id': 'pay_TEST_12345',
            'signature': 'dummy_signature'
        })
        self.assertEqual(res_verify.status_code, status.HTTP_200_OK)
        self.assertEqual(res_verify.data['status'], 'PAID')
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'PAID')
        self.assertEqual(invoice.paid, Decimal("1500.00"))

    def test_admin_dashboard_kpis(self):
        """Admin dashboard KPI endpoint returns live counts and metrics"""
        self.client.force_authenticate(user=self.orgadmin)
        response = self.client.get('/api/v1/admin/dashboard/kpis/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('kpis', response.data)
        self.assertIn('pipeline', response.data)
        self.assertGreaterEqual(response.data['kpis']['total_vehicles'], 1)

    def test_technician_flow_and_qc_signoff(self):
        """Technician views assigned order, updates task progress, and completes QC sign-off"""
        self.client.force_authenticate(user=self.technician)
        
        # 1. Dashboard stats
        res_stats = self.client.get('/api/v1/technician/dashboard/')
        self.assertEqual(res_stats.status_code, status.HTTP_200_OK)
        self.assertIn('todays_jobs', res_stats.data)

        # 2. Repair tasks (auto-generated or fetched)
        res_tasks = self.client.get(f'/api/v1/technician/work-orders/{self.order.id}/repairs/')
        self.assertEqual(res_tasks.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res_tasks.data), 1)
        task_id = res_tasks.data[0]['id']

        # 3. Update task progress
        res_progress = self.client.post(f'/api/v1/technician/repairs/{task_id}/progress/', {
            'percentage': 75,
            'status': 'IN_PROGRESS',
            'note': 'Installed new components and torqued to spec'
        })
        self.assertEqual(res_progress.status_code, status.HTTP_200_OK)

        # 4. Sign off QC / complete work order
        res_complete = self.client.patch(f'/api/v1/technician/work-orders/{self.order.id}/', {
            'status': 'COMPLETED',
            'progress': 100
        })
        self.assertEqual(res_complete.status_code, status.HTTP_200_OK)
        self.assertEqual(res_complete.data['status'], 'COMPLETED')

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'COMPLETED')
        self.assertEqual(self.order.progress, 100)

    def test_advisor_invoice_and_manual_payment(self):
        """Advisor views branch invoices and records in-person cash payment"""
        invoice = Invoice.objects.create(
            branch=self.branch,
            invoice_number="INV-ADV-001",
            customer=self.customer,
            vehicle=self.vehicle,
            service_order=self.order,
            amount=Decimal("850.00"),
            paid=Decimal("0.00"),
            status="UNPAID"
        )
        self.client.force_authenticate(user=self.advisor)

        # 1. Fetch invoices
        res_invs = self.client.get('/api/v1/advisor/invoices/')
        self.assertEqual(res_invs.status_code, status.HTTP_200_OK)
        self.assertTrue(any(inv['invoice_number'] == 'INV-ADV-001' for inv in res_invs.data))

        # 2. Record payment
        res_pay = self.client.post(f'/api/v1/advisor/invoices/{invoice.id}/pay/', {
            'amount': '850.00',
            'method': 'CASH'
        })
        self.assertEqual(res_pay.status_code, status.HTTP_200_OK)
        self.assertEqual(res_pay.data['status'], 'PAID')

        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'PAID')
        self.assertEqual(invoice.paid, Decimal("850.00"))
