from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth, ExtractWeekDay
from django.utils import timezone
from datetime import timedelta
import os
import tempfile
import secrets
from decimal import Decimal
from django.db.models import Sum, Count, Avg, Min, Max, Q
from django.db.models.functions import TruncMonth, TruncDate
from .models import Statement, Transaction, Category, PasswordResetToken
from .serializers import (
    UserRegistrationSerializer, UserSerializer, StatementSerializer,
    TransactionSerializer, CategorySerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)
from .parsers import CSVParser, PDFParser
from .categorizer import ExpenseCategorizer
from rest_framework import viewsets
from .models import Account
from .serializers import AccountSerializer
from .models import User, Account, Statement, Transaction, Category, PasswordResetToken

User = get_user_model()


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Account.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'user': UserSerializer(user).data,
            'message': 'User registered successfully.'
        }, status=status.HTTP_201_CREATED)
    
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

class UserLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check password
        if user.check_password(password):
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    email = serializer.validated_data['email']
    try:
        user = User.objects.get(email=email)
        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(user=user, token=token)
        return Response({'message': 'Password reset link sent.'})
    except User.DoesNotExist:
        return Response({'message': 'If the email exists, a reset link will be sent.'})

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    token = serializer.validated_data['token']
    password = serializer.validated_data['password']
    
    try:
        reset_token = PasswordResetToken.objects.get(token=token)
        if not reset_token.is_valid():
            return Response({'error': 'Token invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = reset_token.user
        user.set_password(password)
        user.save()
        reset_token.used = True
        reset_token.save()
        
        return Response({'message': 'Password reset successfully.'})
    except PasswordResetToken.DoesNotExist:
        return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

class StatementViewSet(viewsets.ModelViewSet):
    serializer_class = StatementSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Statement.objects.filter(user=self.request.user).annotate(
            transaction_count=Count('transactions')
        )

    @action(detail=False, methods=['post'])
    def upload(self, request):
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        currency = request.data.get('currency', 'USD')
        
        file_extension = os.path.splitext(file.name)[1].lower()
        if file_extension not in ['.csv', '.pdf']:
            return Response({'error': 'Invalid file type.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if file.size > 10 * 1024 * 1024:
            return Response({'error': 'File too large.'}, status=status.HTTP_400_BAD_REQUEST)
        
        statement = Statement.objects.create(
            user=request.user,
            file_name=file.name,
            file_type='CSV' if file_extension == '.csv' else 'PDF',
            currency=currency
        )
        
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                for chunk in file.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name
            
            parser = CSVParser() if file_extension == '.csv' else PDFParser()
            transactions_data = parser.parse(temp_path)
            os.unlink(temp_path)
            
            if not transactions_data:
                statement.delete()
                return Response({'error': 'No valid transactions found.'}, status=status.HTTP_400_BAD_REQUEST)
            
            categorizer = ExpenseCategorizer()
            transactions = []
            
            for trans_data in transactions_data:
                category = categorizer.categorize(trans_data['description'])
                transaction = Transaction(
                    user=request.user,
                    statement=statement,
                    category=category,
                    date=trans_data['date'],
                    description=trans_data['description'],
                    amount=trans_data['amount'],
                    currency=currency
                )
                transactions.append(transaction)
            
            Transaction.objects.bulk_create(transactions)
            statement.processed = True
            statement.save()
            
            return Response({
                'message': f'Successfully processed {len(transactions)} transactions.',
                'statement_id': statement.id,
                'transaction_count': len(transactions)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            statement.delete()
            return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user).select_related('category')
        
        statement_id = self.request.query_params.get('statement_id')
        if statement_id:
            queryset = queryset.filter(statement_id=statement_id)

        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    user = request.user
    transactions = Transaction.objects.filter(user=user)
    
    statement_id = request.query_params.get('statement_id')
    if statement_id:
        transactions = transactions.filter(statement_id=statement_id)

    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    if start_date:
        transactions = transactions.filter(date__gte=start_date)
    if end_date:
        transactions = transactions.filter(date__lte=end_date)
    
    total_spending = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    category_count = transactions.exclude(category__name__in=['INCOME', 'UNCATEGORIZED']).values('category').distinct().count()
    transaction_count = transactions.count()
    
    # 🔥 GET CURRENCY FROM STATEMENT OR FIRST TRANSACTION
    # currency = 'USD'  # default
    if statement_id:
        try:
            statement = Statement.objects.get(id=statement_id, user=user)
            currency = statement.currency
        except Statement.DoesNotExist:
            pass
    elif transactions.exists():
        currency = transactions.first().currency
    
    return Response({
        'total_spending': float(total_spending),
        'category_count': category_count,
        'transaction_count': transaction_count,
        'currency': currency  # 🔥 DYNAMIC CURRENCY
    })
    # return Response({
    #     'total_spending': float(total_spending),
    #     'category_count': category_count,
    #     'transaction_count': transaction_count,
    #     'currency': 'USD'
    # })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def category_breakdown(request):
    user = request.user
    transactions = Transaction.objects.filter(user=user)
    
    statement_id = request.query_params.get('statement_id')
    if statement_id:
        transactions = transactions.filter(statement_id=statement_id)

    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    if start_date:
        transactions = transactions.filter(date__gte=start_date)
    if end_date:
        transactions = transactions.filter(date__lte=end_date)
    
    category_data = transactions.values('category__name', 'category__id').annotate(
        total=Sum('amount'), count=Count('id')
    ).order_by('-total')
    
    categories = []
    for item in category_data:
        if item['category__name']:
            category = Category.objects.get(id=item['category__id'])
            categories.append({
                'id': item['category__id'],
                'name': item['category__name'],
                'display_name': category.get_name_display(),
                'total': float(item['total']),
                'count': item['count']
            })
    
    return Response(categories)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_categories(request):
    user = request.user
    transactions = Transaction.objects.filter(user=user)

    statement_id = request.query_params.get('statement_id')
    if statement_id:
        transactions = transactions.filter(statement_id=statement_id)

    
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    if start_date:
        transactions = transactions.filter(date__gte=start_date)
    if end_date:
        transactions = transactions.filter(date__lte=end_date)
    
    category_data = transactions.values('category__name', 'category__id').annotate(
        total=Sum('amount')
    ).order_by('-total')
    
    formatted = []
    for item in category_data:
        if item['category__name']:
            category = Category.objects.get(id=item['category__id'])
            formatted.append({
                'name': category.get_name_display(),
                'total': float(item['total'])
            })
    
    return Response({'top_5': formatted[:5], 'lowest_5': formatted[-5:] if len(formatted) > 5 else []})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spending_trend(request):
    user = request.user
    transactions = Transaction.objects.filter(user=user)
    
    # Filter by statement
    statement_id = request.query_params.get('statement_id')
    if statement_id:
        transactions = transactions.filter(statement_id=statement_id)
    
    # 🔥 Check if there are any transactions
    if not transactions.exists():
        return Response([])
    
    # 🔥 Get actual date range from transactions
    date_range = transactions.aggregate(
        min_date=Min('date'),
        max_date=Max('date')
    )
    
    # Group by month
    monthly_data = transactions.annotate(
        month=TruncMonth('date')
    ).values('month').annotate(
        total=Sum('amount')
    ).order_by('month')
    
    # 🔥 Only return actual months with transactions
    result = []
    for item in monthly_data:
        result.append({
            'month': item['month'].strftime('%b %Y'),
            'total': float(item['total'])
        })
    
    return Response(result)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spending_by_weekday(request):
    user = request.user
    transactions = Transaction.objects.filter(user=user)

    statement_id = request.query_params.get('statement_id')
    if statement_id:
        transactions = transactions.filter(statement_id=statement_id)

    
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    if start_date:
        transactions = transactions.filter(date__gte=start_date)
    if end_date:
        transactions = transactions.filter(date__lte=end_date)
    
    weekday_data = transactions.annotate(weekday=ExtractWeekDay('date')).values('weekday').annotate(
        total=Sum('amount')
    ).order_by('weekday')
    
    day_names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    weekday_map = {i + 1: day_names[i] for i in range(7)}
    result = {day: 0.0 for day in day_names}
    
    for item in weekday_data:
        day_name = weekday_map.get(item['weekday'])
        if day_name:
            result[day_name] = float(item['total'])
    
    return Response([{'day': day, 'total': result[day]} for day in day_names])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_recommendations(request):
    user = request.user
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=90)
    
    transactions = Transaction.objects.filter(user=user, date__gte=start_date, date__lte=end_date)

    statement_id = request.query_params.get('statement_id')
    if statement_id:
        transactions = transactions.filter(statement_id=statement_id)

    total_spending = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    if not transactions.exists():
        return Response({
            'potential_savings': 0,
            'budget_optimization': [],
            'spending_pattern': 'No data available yet.'
        })
    
    # Category breakdown
    category_spending = transactions.values('category__name').annotate(
        total=Sum('amount'),
        count=Count('id'),
        avg=Avg('amount')
    ).exclude(category__name='INCOME')
    
    total_spending = sum(item['total'] for item in category_spending)
    
    # Calculate insights
    budget_optimization = []
    high_spend_categories = []
    
    for cat in category_spending:
        cat_name = Category.objects.get(name=cat['category__name']).get_name_display()
        percentage = (cat['total'] / total_spending * 100) if total_spending > 0 else 0
        
        # High spending categories (>20% of total)
        if percentage > 20:
            high_spend_categories.append(cat_name)
            budget_optimization.append({
                'category': cat_name,
                'suggestion': f'Accounts for {percentage:.1f}% of spending. Consider setting a budget limit.'
            })
        
        # Frequent small transactions
        if cat['count'] > 10 and cat['avg'] < 50:
            budget_optimization.append({
                'category': cat_name,
                'suggestion': f'{cat["count"]} small transactions averaging ${cat["avg"]:.2f}. Consider consolidating purchases.'
            })
        
        # High average transaction
        if cat['avg'] > 200:
            budget_optimization.append({
                'category': cat_name,
                'suggestion': f'Average transaction is ${cat["avg"]:.2f}. Look for bulk discounts or alternatives.'
            })
    
    # Potential savings calculation
    potential_savings = 0
    for cat in category_spending:
        percentage = (cat['total'] / total_spending * 100) if total_spending > 0 else 0
        if percentage > 15:
            potential_savings += cat['total'] * Decimal('0.10')  # 10% reduction potential
    
    # Spending pattern analysis
    transaction_count = transactions.count()
    date_range = transactions.aggregate(
        earliest=Min('date'),
        latest=Max('date')
    )
    
    if date_range['earliest'] and date_range['latest']:
        days_span = (date_range['latest'] - date_range['earliest']).days + 1
        avg_daily_spending = total_spending / days_span if days_span > 0 else 0
        avg_transaction_size = total_spending / transaction_count if transaction_count > 0 else 0
        
        # Weekday vs Weekend spending
        weekday_total = Decimal('0.00')
        weekend_total = Decimal('0.00')
        
        for trans in transactions:
            if trans.date.weekday() < 5:  # Monday-Friday
                weekday_total += trans.amount
            else:
                weekend_total += trans.amount
        
        weekend_percentage = (weekend_total / total_spending * 100) if total_spending > 0 else 0
        
        spending_pattern = f"You made {transaction_count} transactions over {days_span} days, averaging ${avg_daily_spending:.2f}/day. "
        spending_pattern += f"Your average transaction is ${avg_transaction_size:.2f}. "
        
        if weekend_percentage > 40:
            spending_pattern += f"Weekend spending is {weekend_percentage:.1f}% of total - consider meal planning and entertainment budgets. "
        
        if high_spend_categories:
            spending_pattern += f"Top focus areas: {', '.join(high_spend_categories[:2])}."
    else:
        spending_pattern = "Insufficient data for pattern analysis."
    
    # Additional smart tips
    if not budget_optimization:
        budget_optimization.append({
            'category': 'Overall',
            'suggestion': 'Your spending is well-distributed across categories. Keep tracking!'
        })
    
    # Limit to top 5 recommendations
    budget_optimization = budget_optimization[:5]
    
    return Response({
        'potential_savings': float(potential_savings),
        'budget_optimization': budget_optimization,
        'spending_pattern': spending_pattern,
        'total_transactions': transaction_count,
        'average_transaction': float(total_spending / transaction_count) if transaction_count > 0 else 0
    })
    # if total_spending == 0:
    #     return Response({
    #         'potential_savings': None,
    #         'budget_optimization': [],
    #         'spending_pattern': 'No transactions found.'
    #     })
    
    # category_data = transactions.values('category__name').annotate(
    #     total=Sum('amount'), count=Count('id')
    # ).order_by('-total')
    
    # recommendations = []
    # potential_savings = 0
    
    # for item in category_data[:5]:
    #     if item['category__name'] in ['FOOD', 'ENTERTAINMENT', 'SHOPPING']:
    #         category = Category.objects.get(name=item['category__name'])
    #         category_total = float(item['total'])
    #         savings = category_total * 0.20
    #         potential_savings += savings
    #         recommendations.append({
    #             'category': category.get_name_display(),
    #             'suggestion': f"Consider reducing by 20% (${savings:.2f}/month)"
    #         })
    
    # top_5_total = sum(float(item['total']) for item in category_data[:5])
    # concentration = (top_5_total / float(total_spending)) * 100 if total_spending > 0 else 0
    
    # return Response({
    #     'potential_savings': float(potential_savings),
    #     'budget_optimization': recommendations,
    #     'spending_pattern': f"Top 5 categories account for {concentration:.0f}% of expenses."
    # })

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]