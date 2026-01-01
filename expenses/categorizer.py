import re
from .models import Category

class ExpenseCategorizer:
    """
    Sophisticated rule-based categorization engine with keyword matching
    """
    
    CATEGORY_KEYWORDS = {
        'FOOD': [
            'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger', 'pizza',
            'subway', 'dunkin', 'chipotle', 'panera', 'domino', 'taco', 'kfc', 'wendy',
            'chick-fil-a', 'dining', 'food', 'eatery', 'bistro', 'diner', 'grill',
            'kitchen', 'bar', 'pub', 'bakery', 'deli', 'seafood', 'sushi', 'thai',
            'chinese', 'italian', 'mexican', 'indian', 'buffet', 'takeout', 'delivery',
            'doordash', 'ubereats', 'grubhub', 'postmates', 'seamless'
        ],
        'GROCERIES': [
            'grocery', 'supermarket', 'walmart', 'target', 'costco', 'kroger', 'safeway',
            'whole foods', 'trader joe', 'aldi', 'publix', 'wegmans', 'heb', 'sprouts',
            'fresh market', 'food lion', 'giant', 'albertsons', 'market', 'mart'
        ],
        'HEALTHCARE': [
            'pharmacy', 'cvs', 'walgreens', 'rite aid', 'hospital', 'clinic', 'medical',
            'doctor', 'dentist', 'dental', 'health', 'medicare', 'insurance', 'prescription',
            'medicine', 'drug', 'care', 'therapy', 'wellness', 'lab', 'radiology'
        ],
        'ENTERTAINMENT': [
            'netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'hbo', 'apple music',
            'youtube', 'cinema', 'movie', 'theater', 'theatre', 'amc', 'regal',
            'game', 'gaming', 'xbox', 'playstation', 'nintendo', 'steam', 'twitch',
            'concert', 'ticket', 'event', 'ticketmaster', 'stubhub', 'show', 'museum',
            'zoo', 'park', 'entertainment', 'bowling', 'arcade', 'golf'
        ],
        'TRANSPORT': [
            'uber', 'lyft', 'taxi', 'cab', 'gas', 'fuel', 'shell', 'exxon', 'chevron',
            'bp', 'mobil', 'citgo', 'sunoco', 'parking', 'toll', 'transit', 'metro',
            'subway', 'train', 'bus', 'airline', 'flight', 'delta', 'united', 'american',
            'southwest', 'jetblue', 'car rental', 'hertz', 'enterprise', 'avis', 'budget',
            'zipcar', 'turo'
        ],
        'SHOPPING': [
            'amazon', 'ebay', 'shop', 'store', 'mall', 'retail', 'boutique', 'outlet',
            'nordstrom', 'macy', 'kohls', 'jcpenney', 'sears', 'bestbuy', 'apple store',
            'gap', 'old navy', 'zara', 'h&m', 'forever 21', 'nike', 'adidas',
            'clothing', 'shoes', 'fashion', 'accessories', 'jewelry', 'electronics',
            'home depot', 'lowes', 'ikea', 'bed bath', 'pottery barn'
        ],
        'UTILITIES': [
            'electric', 'electricity', 'power', 'water', 'gas utility', 'internet',
            'cable', 'phone', 'wireless', 'verizon', 'att', 't-mobile', 'sprint',
            'comcast', 'xfinity', 'spectrum', 'utility', 'bill', 'payment', 'service'
        ],
        'TRAVEL': [
            'hotel', 'motel', 'resort', 'inn', 'lodge', 'airbnb', 'vrbo', 'booking',
            'expedia', 'hotels.com', 'marriott', 'hilton', 'hyatt', 'holiday inn',
            'travel', 'tourism', 'trip', 'vacation', 'cruise', 'rental car'
        ],
        'LUXURY': [
            'jewelry', 'rolex', 'tiffany', 'cartier', 'louis vuitton', 'gucci', 'prada',
            'chanel', 'hermes', 'dior', 'versace', 'spa', 'salon', 'massage', 'luxury',
            'premium', 'country club', 'golf club', 'yacht', 'boat'
        ],
        'EDUCATION': [
            'school', 'university', 'college', 'tuition', 'education', 'course',
            'class', 'training', 'workshop', 'seminar', 'book', 'amazon books',
            'barnes', 'textbook', 'udemy', 'coursera', 'skillshare', 'masterclass'
        ],
        'INCOME': [
            'salary', 'payroll', 'deposit', 'payment received', 'transfer in',
            'refund', 'reimbursement', 'credit', 'return', 'cashback'
        ]
    }

    def __init__(self):
        self.categories = {}
        self._load_categories()

    def _load_categories(self):
        """Load categories from database"""
        for cat in Category.objects.all():
            keywords = cat.keywords if cat.keywords else self.CATEGORY_KEYWORDS.get(cat.name, [])
            self.categories[cat.name] = {
                'instance': cat,
                'keywords': keywords
            }

    def categorize(self, description):
        """
        Categorize a transaction based on its description
        Returns: Category instance
        """
        if not description:
            return self._get_uncategorized()

        description_lower = description.lower()
        
        category_scores = {}
        for cat_name, cat_data in self.categories.items():
            if cat_name == 'UNCATEGORIZED':
                continue
            
            score = 0
            keywords = cat_data['keywords']
            
            for keyword in keywords:
                keyword_lower = keyword.lower()
                if keyword_lower == description_lower:
                    score += 100
                elif re.search(rf'\b{re.escape(keyword_lower)}\b', description_lower):
                    score += 10
                elif keyword_lower in description_lower:
                    score += 5
            
            if score > 0:
                category_scores[cat_name] = score
        
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            return self.categories[best_category]['instance']
        
        return self._get_uncategorized()

    def _get_uncategorized(self):
        """Return uncategorized category"""
        if 'UNCATEGORIZED' in self.categories:
            return self.categories['UNCATEGORIZED']['instance']
        return Category.objects.get_or_create(name='UNCATEGORIZED')[0]

    def categorize_bulk(self, transactions):
        """
        Categorize multiple transactions efficiently
        transactions: list of dicts with 'description' key
        Returns: list of Category instances
        """
        return [self.categorize(t.get('description', '')) for t in transactions]