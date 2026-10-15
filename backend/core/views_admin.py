from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import (
    Vehicle, ServiceOrder, Appointment, Invoice, 
    VehicleInspection, InspectionItem, Issue, IssueEvidence,
    Estimate, EstimateItem, RepairTask, AuditLog,
    TechnicianPhoto
)
from organizations.models import Organization, Branch
from .permissions import IsOrgAdmin, IsSuperAdmin
from .serializers import (
    VehicleSerializer, ServiceOrderSerializer, InvoiceSerializer
)
from .serializers_advisor import (
    AdvisorAppointmentSerializer, EstimateSerializer, VehicleInspectionSerializer
)

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsOrgAdmin])
def admin_dashboard_kpis(request):
    """
    Returns real database metrics for the Super Admin / Org Admin dashboard.
    """
    user = request.user
    today = timezone.now().date()
    start_of_month = today.replace(day=1)

    # Org scope
    org_filter = Q()
    branch_filter = Q()
    if user.role == 'ORG_ADMIN' and user.organization:
        org_filter = Q(branch__organization=user.organization)
        branch_filter = Q(organization=user.organization)

    # 1. Primary KPIs
    total_vehicles = Vehicle.objects.count()
    active_orders_qs = ServiceOrder.objects.exclude(status__in=['COMPLETED', 'CANCELLED']).filter(org_filter)
    active_services = active_orders_qs.count()
    pending_approvals = Estimate.objects.filter(status='SENT').filter(service_order__in=active_orders_qs).count()
    todays_bookings = Appointment.objects.filter(date_time__date=today).filter(org_filter).count()

    # 2. Secondary KPIs
    active_inspections = active_orders_qs.filter(status='INSPECTION').count()
    open_repair_issues = Issue.objects.filter(service_order__in=active_orders_qs).count()
    
    pending_inv = Invoice.objects.filter(status='UNPAID').filter(org_filter).aggregate(total=Sum('amount'))['total'] or 0
    monthly_rev = Invoice.objects.filter(status='PAID', created_at__date__gte=start_of_month).filter(org_filter).aggregate(total=Sum('amount'))['total'] or 0

    # 3. Real Repair Pipeline
    stages = [
        {
            'stage': 'Inspection',
            'color': 'bg-indigo-500',
            'orders': active_orders_qs.filter(status__in=['CHECKED_IN', 'INSPECTION'])[:5]
        },
        {
            'stage': 'Estimate Pending',
            'color': 'bg-amber-500',
            'orders': active_orders_qs.filter(status__in=['DIAGNOSIS', 'AWAITING_APPROVAL'])[:5]
        },
        {
            'stage': 'Repairing',
            'color': 'bg-[#35D07F]',
            'orders': active_orders_qs.filter(status__in=['APPROVED', 'IN_WORKSHOP', 'REPAIRING', 'AWAITING_PARTS'])[:5]
        },
        {
            'stage': 'Quality Check',
            'color': 'bg-blue-500',
            'orders': active_orders_qs.filter(status__in=['QUALITY_CHECK', 'READY_FOR_PICKUP'])[:5]
        }
    ]

    pipeline_data = []
    for s in stages:
        jobs = []
        for o in s['orders']:
            owner_name = o.vehicle.owner.get_full_name() or o.vehicle.owner.username if o.vehicle.owner else 'Customer'
            jobs.append({
                'id': o.order_number,
                'vehicle': f"{o.vehicle.make} {o.vehicle.model}",
                'customer': owner_name,
                'priority': 'Normal',
                'progress': o.progress
            })
        pipeline_data.append({
            'stage': s['stage'],
            'count': s['orders'].count(),
            'color': s['color'],
            'jobs': jobs
        })

    return Response({
        'kpis': {
            'total_vehicles': total_vehicles,
            'active_services': active_services,
            'pending_approvals': pending_approvals,
            'todays_bookings': todays_bookings,
            'active_inspections': active_inspections,
            'open_repair_issues': open_repair_issues,
            'pending_invoices': float(pending_inv),
            'monthly_revenue': float(monthly_rev)
        },
        'pipeline': pipeline_data
    })


@api_view(['GET'])
@permission_classes([IsOrgAdmin])
def admin_analytics_data(request):
    """
    Returns data analytics charts for revenue, vehicle health, and branch performance.
    """
    user = request.user
    today = timezone.now().date()
    
    # Last 6 months revenue
    revenue_trend = []
    for i in range(5, -1, -1):
        m_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1)
        month_label = m_start.strftime('%b')
        rev = Invoice.objects.filter(status='PAID', created_at__date__gte=m_start, created_at__date__lt=m_end).aggregate(s=Sum('amount'))['s'] or 0
        revenue_trend.append({'month': month_label, 'revenue': float(rev)})

    # Service types breakdown
    service_types = ServiceOrder.objects.values('type').annotate(count=Count('id')).order_by('-count')

    # Vehicle health distribution
    healthy_count = Vehicle.objects.filter(health_score__gte=80).count()
    warning_count = Vehicle.objects.filter(health_score__gte=50, health_score__lt=80).count()
    critical_count = Vehicle.objects.filter(health_score__lt=50).count()

    # Branches overview
    branches = Branch.objects.annotate(
        active_jobs=Count('service_orders', filter=~Q(service_orders__status__in=['COMPLETED', 'CANCELLED'])),
        total_revenue=Sum('invoices__amount', filter=Q(invoices__status='PAID'))
    ).values('id', 'name', 'active_jobs', 'total_revenue')

    return Response({
        'revenue_trend': revenue_trend,
        'service_types': list(service_types),
        'health_distribution': [
            {'status': 'Good', 'count': healthy_count},
            {'status': 'Needs Attention', 'count': warning_count},
            {'status': 'Critical', 'count': critical_count}
        ],
        'branches': list(branches)
    })


class AdminBookingViewSet(viewsets.ModelViewSet):
    serializer_class = AdvisorAppointmentSerializer
    permission_classes = [IsOrgAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related('customer', 'vehicle', 'branch', 'advisor').order_by('-date_time')
        if user.role == 'ORG_ADMIN' and user.organization:
            qs = qs.filter(branch__organization=user.organization)
        return qs


class AdminVehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsOrgAdmin]

    def get_queryset(self):
        return Vehicle.objects.select_related('owner').prefetch_related('service_orders').order_by('-created_at')


class AdminCustomerViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOrgAdmin]

    def get_queryset(self):
        return User.objects.filter(role='CUSTOMER').prefetch_related('vehicles').order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        customers = self.get_queryset()
        data = []
        for c in customers:
            v_count = c.vehicles.count()
            data.append({
                'id': str(c.id),
                'username': c.username,
                'name': c.get_full_name() or c.username,
                'email': c.email,
                'phone': c.phone_number or '',
                'vehicles_count': v_count,
                'date_joined': c.date_joined.strftime('%Y-%m-%d')
            })
        return Response(data)


class AdminStaffViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOrgAdmin]

    def get_queryset(self):
        role = self.request.query_params.get('role', 'TECHNICIAN')
        return User.objects.filter(role=role).select_related('branch').order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        staff = self.get_queryset()
        data = []
        for s in staff:
            data.append({
                'id': str(s.id),
                'username': s.username,
                'name': s.get_full_name() or s.username,
                'email': s.email,
                'role': s.role,
                'branch_name': s.branch.name if s.branch else 'Unassigned',
                'phone': s.phone_number or '',
                'is_active': s.is_active
            })
        return Response(data)


class AdminInspectionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = VehicleInspectionSerializer
    permission_classes = [IsOrgAdmin]

    def get_queryset(self):
        return VehicleInspection.objects.select_related('service_order', 'advisor', 'service_order__vehicle').prefetch_related('items', 'items__issues').order_by('-created_at')


class AdminEvidenceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOrgAdmin]

    def list(self, request, *args, **kwargs):
        # Return all photos & issue evidence
        ev_items = IssueEvidence.objects.select_related('issue', 'technician', 'issue__service_order', 'issue__service_order__vehicle').order_by('-timestamp')[:50]
        tech_photos = TechnicianPhoto.objects.select_related('technician', 'vehicle', 'service_order').order_by('-created_at')[:50]
        
        results = []
        for e in ev_items:
            results.append({
                'id': str(e.id),
                'url': e.file_url,
                'type': e.file_type,
                'description': e.description or e.issue.component,
                'technician': e.technician.get_full_name() if e.technician else 'Technician',
                'vehicle': f"{e.issue.service_order.vehicle.make} {e.issue.service_order.vehicle.model}",
                'order_number': e.issue.service_order.order_number,
                'timestamp': e.timestamp.isoformat()
            })
        for tp in tech_photos:
            results.append({
                'id': str(tp.id),
                'url': tp.image.url if tp.image else '',
                'type': 'image',
                'description': tp.vehicle_area or 'Inspection Photo',
                'technician': tp.technician.get_full_name() if tp.technician else 'Technician',
                'vehicle': f"{tp.vehicle.make} {tp.vehicle.model}",
                'order_number': tp.service_order.order_number if tp.service_order else '',
                'timestamp': tp.created_at.isoformat()
            })
        return Response(results)


class AdminAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOrgAdmin]

    def list(self, request, *args, **kwargs):
        logs = AuditLog.objects.select_related('actor', 'service_order').order_by('-timestamp')[:100]
        data = []
        for l in logs:
            data.append({
                'id': str(l.id),
                'actor': l.actor.username if l.actor else 'System',
                'action': l.action,
                'order_number': l.service_order.order_number if l.service_order else '',
                'old_value': l.old_value,
                'new_value': l.new_value,
                'timestamp': l.timestamp.strftime('%Y-%m-%d %H:%M:%S')
            })
        return Response(data)


class AdminInvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsOrgAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related('customer', 'vehicle', 'service_order', 'branch').prefetch_related('payments').order_by('-created_at')
        if user.role == 'ORG_ADMIN' and user.organization:
            qs = qs.filter(branch__organization=user.organization)
        return qs


class AdminServiceOrderViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceOrderSerializer
    permission_classes = [IsOrgAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = ServiceOrder.objects.select_related('vehicle', 'branch').prefetch_related('timeline', 'work_performed', 'parts_used').order_by('-date_created')
        if user.role == 'ORG_ADMIN' and user.organization:
            qs = qs.filter(branch__organization=user.organization)
        return qs

