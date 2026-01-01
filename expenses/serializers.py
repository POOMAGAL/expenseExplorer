from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Statement, Transaction, Category, PasswordResetToken
from rest_framework import serializers
from .models import User, Account, Statement, Transaction, Category

User = get_user_model()

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'name', 'account_number', 'bank_name', 'account_type', 'balance', 'currency', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password2', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'email_verified', 'created_at')
        read_only_fields = ('id', 'email_verified', 'created_at')

class CategorySerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='get_name_display', read_only=True)
    
    class Meta:
        model = Category
        fields = ('id', 'name', 'display_name', 'description')

class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.get_name_display', read_only=True)
    category_id = serializers.IntegerField(source='category.id', read_only=True)
    
    class Meta:
        model = Transaction
        fields = ('id', 'date', 'description', 'amount', 'currency', 'category_id', 
                 'category_name', 'created_at')
        read_only_fields = ('id', 'created_at')

class StatementSerializer(serializers.ModelSerializer):
    transaction_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Statement
        fields = ('id', 'file_name', 'file_type', 'currency', 'uploaded_at', 
                 'processed', 'transaction_count')
        read_only_fields = ('id', 'uploaded_at', 'processed')

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs