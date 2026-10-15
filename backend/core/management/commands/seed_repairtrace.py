from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import uuid

from organizations.models import Organization, Branch
from core.models import (
    Vehicle, VehicleHealthCategory, MaintenanceItem, Warranty,
    ServiceOrder, ServiceTimelineEvent, ServiceWorkItem, ServicePart,
    VehicleInspection, InspectionItem, Issue, IssueEvidence,
    Estimate, EstimateItem, Invoice, PaymentTransaction, Appointment,
    InventoryPart, SystemNotification, Conversation, Message, VehicleQRCode,
    RepairTask, RepairProgress
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds complete, production-grade test data for all RepairTrace roles and workflows.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE("Initializing RepairTrace Production Seeder..."))

        # 1. Organization & Branch
        org, _ = Organization.objects.get_or_create(
            name="Apex Autocare Network",
            defaults={
                "contact_email": "hq@apexautocare.com",
                "contact_phone": "+1 (555) 019-2000",
                "address": "100 Innovation Way, Tech Corridor, Metropolis"
            }
        )
        
        branch, _ = Branch.objects.get_or_create(
            organization=org,
            name="Downtown Apex Service Center",
            defaults={
                "contact_email": "downtown@apexautocare.com",
                "contact_phone": "+1 (555) 019-2834",
                "address": "450 Silicon Avenue, Suite 100, Metropolis"
            }
        )
        self.stdout.write(self.style.SUCCESS(f"Organization: {org.name} | Branch: {branch.name}"))

        # 2. Users (7 Roles from specification)
        users_data = [
            ("admin", "adminpassword", "SUPER_ADMIN", "Alex", "Vance", "admin@repairtrace.com", True),
            ("orgadmin", "password123", "ORG_ADMIN", "Marcus", "Sterling", "orgadmin@repairtrace.com", False),
            ("manager", "password123", "BRANCH_MANAGER", "David", "Miller", "manager@repairtrace.com", False),
            ("advisor", "password123", "SERVICE_ADVISOR", "Sarah", "Wilson", "advisor@repairtrace.com", False),
            ("technician", "password123", "TECHNICIAN", "Elena", "Rostova", "technician@repairtrace.com", False),
            ("inventory", "password123", "INVENTORY_MANAGER", "Vikram", "Patel", "inventory@repairtrace.com", False),
            ("shlok", "password123", "CUSTOMER", "Shlok", "Kumar", "shlok@repairtrace.com", False),
        ]

        created_users = {}
        for username, pwd, role, fname, lname, email, is_super in users_data:
            user, created = User.objects.get_or_create(username=username)
            user.set_password(pwd)
            user.role = role
            user.first_name = fname
            user.last_name = lname
            user.email = email
            user.phone_number = "+91 98765 43210" if role == "CUSTOMER" else "+1 555 019 4432"
            user.is_superuser = is_super
            user.is_staff = is_super or role in ["ORG_ADMIN", "BRANCH_MANAGER"]
            user.organization = org
            if role in ["BRANCH_MANAGER", "SERVICE_ADVISOR", "TECHNICIAN", "INVENTORY_MANAGER"]:
                user.branch = branch
            user.save()
            created_users[username] = user
            self.stdout.write(f"  -> User ready: {username} ({role})")

        customer = created_users["shlok"]
        advisor = created_users["advisor"]
        technician = created_users["technician"]
        manager = created_users["manager"]

        # 3. Customer Vehicles
        v1, _ = Vehicle.objects.get_or_create(
            registration_number="MH-02-CB-9921",
            defaults={
                "owner": customer,
                "make": "Porsche",
                "model": "911 GT3",
                "year": 2022,
                "vin": "WP0AB2A97NS245100",
                "fuel_type": "Petrol",
                "transmission": "Automatic",
                "color": "GT Silver Metallic",
                "mileage": 18400,
                "health_score": 88,
                "health_status": "Good Condition",
                "image_url": "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80"
            }
        )

        v2, _ = Vehicle.objects.get_or_create(
            registration_number="MH-01-AX-4482",
            defaults={
                "owner": customer,
                "make": "BMW",
                "model": "M4 Competition",
                "year": 2023,
                "vin": "WBS33AZ05PFP12948",
                "fuel_type": "Petrol",
                "transmission": "Automatic",
                "color": "Isle of Man Green",
                "mileage": 24800,
                "health_score": 92,
                "health_status": "Optimal",
                "image_url": "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80"
            }
        )

        v3, _ = Vehicle.objects.get_or_create(
            registration_number="DL-03-CC-7711",
            defaults={
                "owner": customer,
                "make": "Audi",
                "model": "RS6 Avant",
                "year": 2021,
                "vin": "WAUZZZF27MA019283",
                "fuel_type": "Petrol",
                "transmission": "Automatic",
                "color": "Nardo Grey",
                "mileage": 42000,
                "health_score": 76,
                "health_status": "Attention Required",
                "image_url": "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800&q=80"
            }
        )

        for v in [v1, v2, v3]:
            # QR code
            VehicleQRCode.objects.get_or_create(
                vehicle=v,
                defaults={"token": f"token-{v.vin[:8]}", "is_active": True}
            )
            # Health categories
            if not v.health_categories.exists():
                VehicleHealthCategory.objects.bulk_create([
                    VehicleHealthCategory(vehicle=v, name="Engine & Drivetrain", score=94, warning=False),
                    VehicleHealthCategory(vehicle=v, name="Braking System", score=68 if v == v1 else 92, warning=(v == v1)),
                    VehicleHealthCategory(vehicle=v, name="Suspension & Steering", score=86, warning=False),
                    VehicleHealthCategory(vehicle=v, name="Battery & Electrical", score=90, warning=False),
                    VehicleHealthCategory(vehicle=v, name="Tires & Alignment", score=82, warning=False),
                    VehicleHealthCategory(vehicle=v, name="Fluids & Filters", score=75 if v == v3 else 95, warning=(v == v3)),
                ])
            # Maintenance Items
            if not v.maintenance_items.exists():
                MaintenanceItem.objects.create(
                    vehicle=v,
                    title="Brake Fluid Flush" if v == v1 else "Full Synthetic Oil & Filter Service",
                    due_text="800 km remaining" if v == v1 else "4,200 km remaining",
                    status="Due Soon" if v == v1 else "Scheduled",
                    is_urgent=(v == v1)
                )
            # Warranties
            if not v.warranties.exists():
                Warranty.objects.create(
                    vehicle=v,
                    title="Manufacturer Powertrain Warranty",
                    status="Active",
                    expires_date=timezone.now().date() + timedelta(days=450),
                    coverage="Engine, transmission, drive axles and differential assemblies."
                )

        self.stdout.write(self.style.SUCCESS("Customer vehicles seeded with health telemetry."))

        # 4. Service Order 1: Pending Customer Approval on Porsche 911
        so1, _ = ServiceOrder.objects.get_or_create(
            order_number="RT-2026-9921",
            defaults={
                "vehicle": v1,
                "branch": branch,
                "title": "Brake Pad & Rotor Replacement",
                "type": "Safety Critical Repair",
                "status": "AWAITING_APPROVAL",
                "progress": 35,
                "advisor": "Sarah Wilson",
                "technician": "Elena Rostova",
                "bay": "Bay 2 (Lift)",
                "parts_cost": Decimal("1500.00"),
                "labor_cost": Decimal("1000.00"),
                "tax": Decimal("180.00"),
                "total_cost": Decimal("2680.00"),
                "date_created": timezone.now() - timedelta(hours=3)
            }
        )

        if not so1.timeline.exists():
            ServiceTimelineEvent.objects.create(service_order=so1, title="Vehicle Check-In & Intake Inspection", time=timezone.now() - timedelta(hours=3), completed=True)
            ServiceTimelineEvent.objects.create(service_order=so1, title="Multi-Point Safety Inspection", time=timezone.now() - timedelta(hours=2), completed=True)
            ServiceTimelineEvent.objects.create(service_order=so1, title="Digital Estimate Dispatched to Customer", time=timezone.now() - timedelta(hours=1), completed=True)
            ServiceTimelineEvent.objects.create(service_order=so1, title="Customer Digital Approval", time=timezone.now() + timedelta(hours=1), completed=False)
            ServiceTimelineEvent.objects.create(service_order=so1, title="Disassembly & Component Installation", time=timezone.now() + timedelta(hours=3), completed=False)
            ServiceTimelineEvent.objects.create(service_order=so1, title="Quality Control Road Test & Delivery", time=timezone.now() + timedelta(hours=5), completed=False)

        # Inspection & Issues for SO1
        insp1, _ = VehicleInspection.objects.get_or_create(
            service_order=so1,
            defaults={
                "advisor": advisor,
                "customer_concern": "Squealing noise from front wheels under high deceleration.",
                "exterior_notes": "Clean, minor brake dust on front alloys.",
                "warning_lights": "Brake pad wear indicator active on dash.",
                "fuel_level": "75%",
                "mileage": 18400
            }
        )
        if not insp1.items.exists():
            item_brake = InspectionItem.objects.create(
                inspection=insp1, category="BRAKING SYSTEM", name="Front Brake Pads & Rotors",
                status="NEEDS_ATTENTION", notes="Brake pad thickness at 2.1mm (critical threshold is 2.0mm). Scoring on outer rotor surface."
            )
            InspectionItem.objects.create(inspection=insp1, category="BRAKING SYSTEM", name="Rear Brake Pads", status="GOOD", notes="7.2mm remaining")
            InspectionItem.objects.create(inspection=insp1, category="SUSPENSION", name="Front Dampers", status="GOOD", notes="No leaks detected")
            InspectionItem.objects.create(inspection=insp1, category="ENGINE", name="Oil Level & Viscosity", status="GOOD", notes="Nominal")
            
            issue1 = Issue.objects.create(
                service_order=so1,
                inspection_item=item_brake,
                component="Front Left & Right Ceramic Rotor Assemblies",
                issue_type="Excessive Wear & Glazing",
                severity="CRITICAL",
                description="Front brake pads below minimum factory safety spec. Rotor surfaces show excessive glazing.",
                technician=technician
            )
            IssueEvidence.objects.create(
                issue=issue1,
                technician=technician,
                file_url="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
                file_type="image",
                description="Digital micrometer measurement showing 2.1mm pad thickness."
            )


        # Estimate for SO1 (Awaiting customer approval in CustomerApprovals.tsx)
        est1, _ = Estimate.objects.get_or_create(
            service_order=so1,
            defaults={
                "advisor": advisor,
                "subtotal": Decimal("2500.00"),
                "tax": Decimal("180.00"),
                "discount": Decimal("0.00"),
                "total": Decimal("2680.00"),
                "status": "SENT",
                "sent_date": timezone.now() - timedelta(hours=1),
                "validity_days": 7
            }
        )
        if not est1.items.exists():
            EstimateItem.objects.create(
                estimate=est1, type="PARTS", description="OEM Porsche Brembo High-Performance Front Pad Kit",
                quantity=Decimal("1.00"), unit_price=Decimal("1500.00"), total_price=Decimal("1500.00")
            )
            EstimateItem.objects.create(
                estimate=est1, type="LABOR", description="Front Caliper Precision Overhaul, Rotor Resurfacing & Bedding Procedure",
                quantity=Decimal("4.00"), unit_price=Decimal("250.00"), total_price=Decimal("1000.00")
            )

        # 5. Service Order 2: In-Progress Repair on BMW M4
        so2, _ = ServiceOrder.objects.get_or_create(
            order_number="RT-2026-4482",
            defaults={
                "vehicle": v2,
                "branch": branch,
                "title": "M Performance Exhaust & Intercooler Upgrade",
                "type": "Performance Enhancement",
                "status": "REPAIRING",
                "progress": 68,
                "advisor": "Sarah Wilson",
                "technician": "Elena Rostova",
                "bay": "Bay 1 (Dyno)",
                "parts_cost": Decimal("2800.00"),
                "labor_cost": Decimal("650.00"),
                "tax": Decimal("248.50"),
                "total_cost": Decimal("3698.50"),
                "date_created": timezone.now() - timedelta(days=1)
            }
        )
        if not so2.work_performed.exists():
            ServiceWorkItem.objects.create(service_order=so2, description="Removed factory exhaust cat-back section")
            ServiceWorkItem.objects.create(service_order=so2, description="Mounted titanium dual-valve exhaust assembly")
            ServiceWorkItem.objects.create(service_order=so2, description="Calibrating electronic wastegate actuator and valve solenoids")
            ServicePart.objects.create(service_order=so2, name="BMW M Performance Titanium Exhaust")
            ServicePart.objects.create(service_order=so2, name="High-Temp Exhaust Gasket Kit")

        if not so2.repair_tasks.exists():
            t1 = RepairTask.objects.create(
                service_order=so2,
                name="Disassemble Stock Exhaust System",
                description="Unbolt downpipes, drop OEM center resonator and rear silencer.",
                status="COMPLETED",
                assigned_technician=technician,
                started_at=timezone.now() - timedelta(hours=6),
                completed_at=timezone.now() - timedelta(hours=4)
            )
            RepairProgress.objects.create(task=t1, percentage=100, note="Stock exhaust removed without issue.", technician=technician)

            t2 = RepairTask.objects.create(
                service_order=so2,
                name="Mount Titanium Valve-Controlled Exhaust",
                description="Align flanged joints, torque to 45Nm, connect vacuum actuator harnesses.",
                status="IN_PROGRESS",
                assigned_technician=technician,
                started_at=timezone.now() - timedelta(hours=3)
            )
            RepairProgress.objects.create(task=t2, percentage=65, note="Main exhaust hung, routing valve harness.", technician=technician)

            t3 = RepairTask.objects.create(
                service_order=so2,
                name="Electronic Wastegate & Exhaust Valve Adaptation",
                description="Connect diagnostic scanner, run actuator calibration and road sound check.",
                status="NOT_STARTED",
                assigned_technician=technician
            )

        # Unpaid Invoice for SO1 (Allows customer to test online payment settlement)
        inv1, _ = Invoice.objects.get_or_create(
            invoice_number="INV-2026-9921",
            defaults={
                "branch": branch,
                "customer": customer,
                "vehicle": v1,
                "service_order": so1,
                "amount": Decimal("2680.00"),
                "paid": Decimal("0.00"),
                "status": "UNPAID",
                "due_date": timezone.now().date() + timedelta(days=7)
            }
        )

        # 6. Service Order 3: Completed with Invoice and Payment on Audi RS6
        so3, _ = ServiceOrder.objects.get_or_create(
            order_number="RT-2026-7711",
            defaults={
                "vehicle": v3,
                "branch": branch,
                "title": "40,000 KM Major Scheduled Maintenance",
                "type": "Major Scheduled Service",
                "status": "COMPLETED",
                "progress": 100,
                "advisor": "Sarah Wilson",
                "technician": "Elena Rostova",
                "bay": "Bay 3",
                "parts_cost": Decimal("1100.00"),
                "labor_cost": Decimal("600.00"),
                "tax": Decimal("150.00"),
                "total_cost": Decimal("1850.00"),
                "date_created": timezone.now() - timedelta(days=5),
                "date_completed": timezone.now() - timedelta(days=4)
            }
        )

        inv3, _ = Invoice.objects.get_or_create(
            invoice_number="INV-2026-7711",
            defaults={
                "branch": branch,
                "customer": customer,
                "vehicle": v3,
                "service_order": so3,
                "amount": Decimal("1850.00"),
                "paid": Decimal("1850.00"),
                "status": "PAID"
            }
        )

        PaymentTransaction.objects.get_or_create(
            invoice=inv3,
            order_id="order_RPZ9912001",
            defaults={
                "customer": customer,
                "gateway": "RAZORPAY",
                "payment_id": "pay_TEST9912001_OK",
                "signature": "simulated_signature_xyz",
                "amount": Decimal("1850.00"),
                "currency": "INR",
                "status": "SUCCESS"
            }
        )


        # 7. Inventory Parts
        parts_list = [
            ("BRK-POR-01", "Brembo Ceramic Front Brake Pads", "Braking", 14, 2, 5, "Brembo Racing SPA", Decimal("1250.00")),
            ("OIL-MOB-01", "Mobil 1 Super Synthetic 0W-40 (5L)", "Fluids", 42, 6, 12, "ExxonMobil Lubricants", Decimal("65.00")),
            ("FLT-AIR-02", "High-Flow Cotton Intake Air Filter", "Filters", 3, 0, 8, "BMC Air Filters", Decimal("95.00")),
            ("SPK-NGK-08", "NGK Laser Iridium Spark Plugs", "Ignition", 32, 4, 16, "NGK Spark Plugs", Decimal("22.00")),
            ("SUS-ARM-04", "Front Lower Control Arm Assembly", "Suspension", 2, 1, 4, "Lemforder Components", Decimal("380.00")),
        ]
        for pnum, name, cat, stock, res, min_lvl, supp, price in parts_list:
            InventoryPart.objects.get_or_create(
                part_number=pnum,
                branch=branch,
                defaults={
                    "name": name,
                    "category": cat,
                    "current_stock": stock,
                    "reserved": res,
                    "minimum_level": min_lvl,
                    "supplier": supp,
                    "price": price
                }
            )

        # 8. Appointments
        Appointment.objects.get_or_create(
            vehicle=v2,
            customer=customer,
            service_type="Pre-Track Multi-Point Safety Check",
            defaults={
                "branch": branch,
                "advisor": advisor,
                "date_time": timezone.now() + timedelta(days=1, hours=2),
                "status": "CONFIRMED"
            }
        )
        Appointment.objects.get_or_create(
            vehicle=v1,
            customer=customer,
            service_type="Ceramic Wheel Coating & Detailing",
            defaults={
                "branch": branch,
                "advisor": advisor,
                "date_time": timezone.now() + timedelta(days=3),
                "status": "REQUESTED"
            }
        )

        # 9. System Notifications
        SystemNotification.objects.get_or_create(
            user=customer,
            title="Estimate Awaiting Your Approval",
            defaults={
                "notification_type": "ESTIMATE",
                "message": "Your 2022 Porsche 911 GT3 inspection is complete. An estimate of $2,680.00 is ready for your review.",
                "action_url": "/customer/approvals",
                "is_read": False
            }
        )
        SystemNotification.objects.get_or_create(
            user=advisor,
            title="Active Inspection Completed: Bay 2",
            defaults={
                "notification_type": "INSPECTION",
                "message": "Technician Elena Rostova completed multi-point inspection for order RT-2026-9921.",
                "action_url": "/advisor/pipeline",
                "is_read": False
            }
        )

        # 10. Live Chat Conversation
        convo, _ = Conversation.objects.get_or_create(
            customer=customer,
            advisor=advisor,
            defaults={"vehicle": v1, "service_order": so1}
        )
        if not convo.messages.exists():
            Message.objects.create(
                conversation=convo,
                sender=advisor,
                content="Hello Mr. Kumar, Elena just uploaded the micrometer photo of your front brake pads. You can see the wear in the digital estimate tab."
            )
            Message.objects.create(
                conversation=convo,
                sender=customer,
                content="Thanks Sarah! Reviewing the estimate now. Can we make sure the brake sensors are replaced as well?"
            )
            Message.objects.create(
                conversation=convo,
                sender=advisor,
                content="Absolutely, the OEM kit includes both left and right wearable wear sensors."
            )

        self.stdout.write(self.style.SUCCESS("RepairTrace production database seeded successfully!"))
