from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VehicleViewSet,
    InvoiceViewSet,
    ServiceOrderViewSet,
    CustomerProfileViewSet,
    SupportTicketViewSet,
    PaymentMethodViewSet,
    CustomerAppointmentViewSet,
    customer_dashboard
)
from .views_advisor import ConversationViewSet, MessageViewSet, EstimateViewSet, SystemNotificationViewSet

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='customer-vehicles')
router.register(r'appointments', CustomerAppointmentViewSet, basename='customer-appointments')
router.register(r'estimates', EstimateViewSet, basename='customer-estimates')
router.register(r'notifications', SystemNotificationViewSet, basename='customer-notifications')
router.register(r'invoices', InvoiceViewSet, basename='customer-invoices')
router.register(r'service-records', ServiceOrderViewSet, basename='customer-service-records')
router.register(r'service-orders', ServiceOrderViewSet, basename='customer-service-orders')
router.register(r'conversations', ConversationViewSet, basename='customer-conversations')
router.register(r'messages', MessageViewSet, basename='customer-messages')

# Also register other endpoints if needed for customer dashboard
router.register(r'profile', CustomerProfileViewSet, basename='customer-profile')
router.register(r'support-tickets', SupportTicketViewSet, basename='customer-support-tickets')
router.register(r'payment-methods', PaymentMethodViewSet, basename='customer-payment-methods')

urlpatterns = [
    path('dashboard/', customer_dashboard, name='customer-dashboard'),
    path('', include(router.urls)),
]

