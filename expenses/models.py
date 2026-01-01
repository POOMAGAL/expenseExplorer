from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.conf import settings
from decimal import Decimal

# ========================================
# 1. USER MODEL (MUST BE FIRST)
# ========================================
class User(AbstractUser):
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email


# ========================================
# 2. ACCOUNT MODEL (AFTER USER)
# ========================================
class Account(models.Model):
    ACCOUNT_TYPES = [
        ('CHECKING', 'Checking'),
        ('SAVINGS', 'Savings'),
        ('CREDIT', 'Credit Card'),
        ('INVESTMENT', 'Investment'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='accounts')
    name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=50)
    bank_name = models.CharField(max_length=255, blank=True)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='CHECKING')
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'account_number']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.account_number}"


# ========================================
# 3. CATEGORY MODEL
# ========================================
class Category(models.Model):
    CATEGORY_CHOICES = [
        ('FOOD', 'Food & Dining'),
        ('HEALTHCARE', 'Healthcare'),
        ('ENTERTAINMENT', 'Entertainment'),
        ('TRANSPORT', 'Transportation'),
        ('SHOPPING', 'Shopping'),
        ('UTILITIES', 'Utilities'),
        ('TRAVEL', 'Travel'),
        ('LUXURY', 'Luxury'),
        ('EDUCATION', 'Education'),
        ('GROCERIES', 'Groceries'),
        ('INCOME', 'Income'),
        ('OTHER', 'Other'),
        ('UNCATEGORIZED', 'Uncategorized'),
    ]
    
    name = models.CharField(max_length=50, choices=CATEGORY_CHOICES, unique=True)
    description = models.TextField(blank=True)
    keywords = models.JSONField(default=list, help_text="List of keywords for auto-categorization")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.get_name_display()


# ========================================
# 4. STATEMENT MODEL
# ========================================
class Statement(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='statements')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='statements', null=True)
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500, default='')
    file_type = models.CharField(max_length=10, choices=[('CSV', 'CSV'), ('PDF', 'PDF')])
    currency = models.CharField(max_length=3, default='USD')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.file_name}"


# ========================================
# 5. TRANSACTION MODEL
# ========================================
class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions', null=True)
    statement = models.ForeignKey(Statement, on_delete=models.CASCADE, related_name='transactions')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='transactions')
    date = models.DateField()
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.date} - {self.description}: {self.amount}"
    
    @property
    def day_of_week(self):
        """Returns the day of week (0=Monday, 6=Sunday)"""
        return self.date.weekday()


# ========================================
# 6. PASSWORD RESET TOKEN MODEL
# ========================================
class PasswordResetToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    def is_valid(self):
        from django.utils import timezone
        return not self.used and timezone.now() < self.expires_at
