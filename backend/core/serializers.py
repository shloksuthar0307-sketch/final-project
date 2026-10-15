from rest_framework import serializers
from .models import (
    Vehicle, VehicleHealthCategory, ServiceOrder, ServiceTimelineEvent, 
    ServiceWorkItem, ServicePart, MaintenanceItem, Warranty, VehicleDocument
)

class VehicleHealthCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleHealthCategory
        fields = ['id', 'name', 'score', 'warning']

class MaintenanceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceItem
        fields = ['id', 'title', 'due_text', 'status', 'is_urgent']

class WarrantySerializer(serializers.ModelSerializer):
    class Meta:
        model = Warranty
        fields = ['id', 'title', 'status', 'expires_date', 'coverage']

class VehicleDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleDocument
        fields = ['id', 'title', 'subtitle', 'date_added']

class VehicleSerializer(serializers.ModelSerializer):
    health_categories = VehicleHealthCategorySerializer(many=True, read_only=True)
    maintenance_items = MaintenanceItemSerializer(many=True, read_only=True)
    warranties = WarrantySerializer(many=True, read_only=True)
    documents = VehicleDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'make', 'model', 'year', 'registration_number', 'vin', 
            'fuel_type', 'transmission', 'color', 'mileage', 'health_score', 
            'health_status', 'image_url', 'health_categories', 'maintenance_items',
            'warranties', 'documents'
        ]
        read_only_fields = ['id', 'health_score', 'health_status']

class ServiceTimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceTimelineEvent
        fields = ['id', 'title', 'time', 'completed']

class ServiceWorkItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceWorkItem
        fields = ['id', 'description']

class ServicePartSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePart
        fields = ['id', 'name']

class ServiceOrderSerializer(serializers.ModelSerializer):
    timeline = ServiceTimelineEventSerializer(many=True, read_only=True)
    work_performed = ServiceWorkItemSerializer(many=True, read_only=True)
    parts_used = ServicePartSerializer(many=True, read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, default='')
    vehicle_info = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOrder
        fields = [
            'id', 'vehicle', 'order_number', 'title', 'type', 'status', 'progress',
            'technician', 'advisor', 'branch', 'branch_name', 'bay', 'parts_cost', 'labor_cost', 'tax', 
            'total_cost', 'date_created', 'date_completed', 'timeline', 'work_performed', 'parts_used', 'vehicle_info'
        ]

    def get_vehicle_info(self, obj):
        if obj.vehicle:
            return {
                'id': str(obj.vehicle.id),
                'make': obj.vehicle.make,
                'model': obj.vehicle.model,
                'year': obj.vehicle.year,
                'registration_number': obj.vehicle.registration_number,
                'vin': obj.vehicle.vin,
                'color': obj.vehicle.color,
                'image_url': obj.vehicle.image_url,
                'owner_name': obj.vehicle.owner.get_full_name() or obj.vehicle.owner.username if obj.vehicle.owner else 'Unknown'
            }
        return None

# --- PREMIUM CUSTOMER DASHBOARD SERIALIZERS ---
from .models import (
    CustomerProfile, SupportTicket, SupportMessage, Invoice,
    SubscriptionPlan, CustomerSubscription, NotificationPreference, PaymentMethod, PaymentTransaction
)

class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = '__all__'

class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = '__all__'

class SupportMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportMessage
        fields = '__all__'

class PaymentTransactionSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source='customer.username', read_only=True, default='')
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True, default='')

    class Meta:
        model = PaymentTransaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    vehicle_details = serializers.SerializerMethodField()
    service_title = serializers.CharField(source='service_order.title', read_only=True, default='')
    branch_name = serializers.CharField(source='branch.name', read_only=True, default='')
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payments = PaymentTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'branch', 'branch_name', 'invoice_number', 'customer', 'customer_name',
            'vehicle', 'vehicle_details', 'service_order', 'service_title',
            'amount', 'paid', 'balance', 'status', 'due_date', 'created_at', 'payments'
        ]

    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.get_full_name() or obj.customer.username
        return ''

    def get_vehicle_details(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.year} {obj.vehicle.make} {obj.vehicle.model} ({obj.vehicle.registration_number})"
        return ''

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class CustomerSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerSubscription
        fields = '__all__'

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = '__all__'

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'
