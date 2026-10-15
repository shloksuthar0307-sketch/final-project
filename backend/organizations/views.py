from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Organization, Branch
from .serializers import OrganizationSerializer, BranchSerializer
from core.permissions import IsSuperAdmin, IsOrgAdmin, IsBranchManager

class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Organization.objects.none()
        if user.role == 'SUPER_ADMIN' or user.is_superuser:
            return Organization.objects.all().prefetch_related('branches')
        if user.organization:
            return Organization.objects.filter(id=user.organization.id).prefetch_related('branches')
        return Organization.objects.none()

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsSuperAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsOrgAdmin()]
        return [permissions.IsAuthenticated()]

class BranchViewSet(viewsets.ModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Branch.objects.none()
        # For customer service booking, allow seeing all active branches to book with
        if user.role == 'CUSTOMER':
            return Branch.objects.all().select_related('organization')
        if user.role == 'SUPER_ADMIN' or user.is_superuser:
            return Branch.objects.all().select_related('organization')
        if user.role == 'ORG_ADMIN' and user.organization:
            return Branch.objects.filter(organization=user.organization).select_related('organization')
        if user.branch:
            return Branch.objects.filter(id=user.branch.id).select_related('organization')
        return Branch.objects.none()

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsOrgAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsBranchManager()]
        return [permissions.IsAuthenticated()]
