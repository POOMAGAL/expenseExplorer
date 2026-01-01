# 💰 Expense Explorer

Full-stack expense analysis application with AI insights.

## 🚀 Quick Start

### 1. Install Backend Dependencies
```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Setup Database
```bash
# Install PostgreSQL if needed, then:
createdb expense_explorer

# Run migrations
python manage.py migrate
python manage.py init_categories

# Create admin user
python manage.py createsuperuser
```

### 3. Start Backend
```bash
python manage.py runserver
```

### 4. Install & Start Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

## 📱 Access Points
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api/
- **Admin**: http://localhost:8000/admin/

## 📋 Missing Files

You still need to copy these files from the artifacts:
- `expense_explorer/settings.py`
- `expense_explorer/urls.py`
- `expenses/models.py`
- `expenses/views.py`
- `expenses/serializers.py`
- `expenses/urls.py`
- `expenses/admin.py`
- `expenses/parsers.py`
- `expenses/categorizer.py`
- `expenses/management/commands/init_categories.py`
- `frontend/src/App.jsx` (Dashboard component)
- `frontend/src/services/api.js`

Check the artifacts I created earlier for these files.

## ✨ Features
- 🔐 Secure JWT authentication
- 📄 CSV/PDF upload & parsing
- 🤖 AI-powered categorization
- 📊 Interactive visualizations
- 💡 Smart spending insights

## 📚 Documentation
See previous artifacts for:
- Complete API documentation
- Deployment guides
- Security best practices
