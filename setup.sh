# !/bin/bash
set -e

echo "🔧 Running setup..."

# Virtual environment
if [ ! -d "venv" ]; then
    python -m venv venv
    echo "✓ Virtual environment created"
fi

# source venv/bin/activate
source venv/Scripts/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ Python packages installed"

# Database
if command -v createdb &> /dev/null; then
    createdb expense_explorer 2>/dev/null && echo "✓ Database created" || echo "⚠ Database exists"
fi

# Migrations
python manage.py makemigrations
python manage.py migrate
python manage.py init_categories
echo "✓ Database setup complete"

# Frontend
cd frontend
npm install
echo "✓ Frontend packages installed"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next: python manage.py createsuperuser"
echo "Then: python manage.py runserver"
echo "And:  cd frontend && npm run dev"
