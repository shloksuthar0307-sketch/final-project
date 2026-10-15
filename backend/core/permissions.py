from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role == 'SUPER_ADMIN' or request.user.is_superuser
        ))

class IsOrgAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role in ['SUPER_ADMIN', 'ORG_ADMIN'] or request.user.is_superuser
        ))

class IsBranchManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role in ['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_MANAGER'] or request.user.is_superuser
        ))

class IsServiceAdvisor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role in ['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_MANAGER', 'SERVICE_ADVISOR'] or request.user.is_superuser
        ))

class IsTechnician(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role in ['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_MANAGER', 'TECHNICIAN'] or request.user.is_superuser
        ))

class IsCustomer(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'CUSTOMER')

class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role in ['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'INVENTORY_MANAGER'] 
            or request.user.is_staff or request.user.is_superuser
        ))

class IsCustomerOwnerOrStaff(permissions.BasePermission):
    """
    Allow customer owner to read/modify their own resource,
    or authorized staff to access.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role in ['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN'] or user.is_superuser:
            return True
        # Check object ownership
        if hasattr(obj, 'owner'):
            return obj.owner == user
        if hasattr(obj, 'customer'):
            return obj.customer == user
        if hasattr(obj, 'user'):
            return obj.user == user
        return False
