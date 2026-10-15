from django.urls import path
from .views_payment import (
    create_payment_order,
    verify_payment,
    razorpay_webhook,
    payment_transactions_list
)

urlpatterns = [
    path('create-order/', create_payment_order, name='create-payment-order'),
    path('verify/', verify_payment, name='verify-payment'),
    path('webhook/', razorpay_webhook, name='razorpay-webhook'),
    path('history/', payment_transactions_list, name='payment-history'),
]
