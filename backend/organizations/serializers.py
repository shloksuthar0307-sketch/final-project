from rest_framework import serializers
from .models import Organization, Branch

class BranchSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True, default='')

    class Meta:
        model = Branch
        fields = [
            'id', 'organization', 'organization_name', 'name', 
            'address', 'contact_email', 'contact_phone', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class OrganizationSerializer(serializers.ModelSerializer):
    branches = BranchSerializer(many=True, read_only=True)
    branch_count = serializers.IntegerField(source='branches.count', read_only=True, default=0)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'tax_id', 'contact_email', 'contact_phone',
            'address', 'created_at', 'updated_at', 'branches', 'branch_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
