from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Account, Statement, Transaction, Category, PasswordResetToken

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'email_verified', 'is_staff', 'created_at')
    list_filter = ('is_staff', 'is_superuser', 'email_verified')
    search_fields = ('email', 'username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'account_number', 'user', 'account_type', 'balance', 'currency', 'created_at')
    list_filter = ('account_type', 'currency', 'created_at')
    search_fields = ('name', 'account_number', 'bank_name', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_name_display', 'description', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at',)
    ordering = ('name',)

@admin.register(Statement)
class StatementAdmin(admin.ModelAdmin):
    list_display = ('user', 'account', 'file_name', 'file_type', 'currency', 'processed', 'uploaded_at')
    list_filter = ('file_type', 'processed', 'uploaded_at', 'account')
    search_fields = ('user__email', 'file_name', 'account__name')
    readonly_fields = ('uploaded_at',)
    ordering = ('-uploaded_at',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'account', 'date', 'description', 'amount', 'category', 'created_at')
    list_filter = ('category', 'account', 'date', 'created_at')
    search_fields = ('user__email', 'description', 'account__name')
    readonly_fields = ('created_at',)  # ← FIXED: Removed 'updated_at'
    date_hierarchy = 'date'
    ordering = ('-date',)

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'created_at', 'expires_at', 'used')
    list_filter = ('used', 'created_at', 'expires_at')
    search_fields = ('user__email', 'token')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
