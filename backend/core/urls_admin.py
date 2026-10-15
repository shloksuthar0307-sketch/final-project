from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_admin import (
    admin_dashboard_kpis,
    admin_analytics_data,
    AdminBookingViewSet,
    AdminVehicleViewSet,
    AdminCustomerViewSet,
    AdminStaffViewSet,
    AdminInspectionViewSet,
    AdminEvidenceViewSet,
    AdminAuditLogViewSet,
    AdminInvoiceViewSet,
    AdminServiceOrderViewSet
)

router = DefaultRouter()
router.register(r'bookings', AdminBookingViewSet, basename='admin-bookings')
router.register(r'vehicles', AdminVehicleViewSet, basename='admin-vehicles')
router.register(r'customers', AdminCustomerViewSet, basename='admin-customers')
router.register(r'staff', AdminStaffViewSet, basename='admin-staff')
router.register(r'inspections', AdminInspectionViewSet, basename='admin-inspections')
router.register(r'evidence', AdminEvidenceViewSet, basename='admin-evidence')
router.register(r'audit-logs', AdminAuditLogViewSet, basename='admin-audit-logs')
router.register(r'invoices', AdminInvoiceViewSet, basename='admin-invoices')
router.register(r'service-orders', AdminServiceOrderViewSet, basename='admin-service-orders')

urlpatterns = [
    path('dashboard/kpis/', admin_dashboard_kpis, name='admin-dashboard-kpis'),
    path('analytics/', admin_analytics_data, name='admin-analytics-data'),
    path('', include(router.urls)),
]
