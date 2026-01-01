import pandas as pd
import pdfplumber
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

class StatementParser:
    """Base class for statement parsers"""
    
   
    @staticmethod
    def parse_date(date_str):
        """Parse date from various formats"""
        # 🔥 PRIORITIZE DD/MM/YYYY formats (most common in international CSVs)
        date_formats = [
            '%d/%m/%Y',      # 30/10/2025 (DD/MM/YYYY) - YOUR FORMAT
            '%d-%m-%Y',      # 30-10-2025
            '%d/%m/%y',      # 30/10/25
            '%d-%m-%y',      # 30-10-25
            '%Y-%m-%d',      # 2025-10-30 (ISO format)
            '%m/%d/%Y',      # 10/30/2025 (MM/DD/YYYY - US format)
            '%m-%d-%Y',      # 10-30-2025
            '%Y/%m/%d',      # 2025/10/30
            '%b %d, %Y',     # Oct 30, 2025
            '%B %d, %Y',     # October 30, 2025
            '%m/%d/%y',      # 10/30/25
            '%Y%m%d'         # 20251030
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(str(date_str).strip(), fmt).date()
            except (ValueError, AttributeError):
                continue
        
        raise ValueError(f"Unable to parse date: {date_str}")


    @staticmethod
    def parse_amount(amount_str):
        """Parse amount from string, handling various formats"""
        if pd.isna(amount_str):
            return None
        
        amount_str = str(amount_str).strip()
        
        # Remove currency symbols and commas
        amount_str = re.sub(r'[€£¥₹$,\s]', '', amount_str)
        
        # Handle parentheses (negative numbers)
        if '(' in amount_str and ')' in amount_str:
            amount_str = '-' + amount_str.replace('(', '').replace(')', '')
        
        # Remove any remaining non-numeric characters except decimal point and minus
        amount_str = re.sub(r'[^\d.-]', '', amount_str)
        
        try:
            amount = Decimal(amount_str)
            return abs(amount)
        except (InvalidOperation, ValueError):
            return None


class CSVParser(StatementParser):
    """Parser for CSV credit card statements"""
    
    def parse(self, file_path):
        """
        Parse CSV file and return list of transactions
        Returns: list of dicts with keys: date, description, amount
        """
        try:
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise ValueError("Unable to read CSV file with any supported encoding")
            
            date_col = self._detect_column(df, ['date', 'transaction date', 'trans date', 'posting date'])
            desc_col = self._detect_column(df, ['description', 'merchant', 'transaction', 'payee', 'details'])
            amount_col = self._detect_column(df, ['amount', 'debit', 'charge', 'transaction amount', 'value'])
            
            if not all([date_col, desc_col, amount_col]):
                raise ValueError("Unable to detect required columns in CSV")
            
            transactions = []
            for _, row in df.iterrows():
                try:
                    date = self.parse_date(row[date_col])
                    description = str(row[desc_col]).strip()
                    amount = self.parse_amount(row[amount_col])
                    
                    if date and description and amount and amount > 0:
                        transactions.append({
                            'date': date,
                            'description': description,
                            'amount': amount
                        })
                except (ValueError, KeyError):
                    continue
            
            return transactions
            
        except Exception as e:
            raise ValueError(f"Error parsing CSV: {str(e)}")

    def _detect_column(self, df, possible_names):
        """Detect column name from possible variations"""
        columns_lower = {col.lower(): col for col in df.columns}
        
        for name in possible_names:
            if name.lower() in columns_lower:
                return columns_lower[name.lower()]
        
        for name in possible_names:
            for col_lower, col_original in columns_lower.items():
                if name.lower() in col_lower or col_lower in name.lower():
                    return col_original
        
        return None


class PDFParser(StatementParser):
    """Parser for PDF credit card statements"""
    
    def parse(self, file_path):
        """
        Parse PDF file and return list of transactions
        Returns: list of dicts with keys: date, description, amount
        """
        transactions = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        page_transactions = self._extract_transactions_from_text(text)
                        transactions.extend(page_transactions)
                    
                    tables = page.extract_tables()
                    for table in tables:
                        table_transactions = self._extract_transactions_from_table(table)
                        transactions.extend(table_transactions)
            
            seen = set()
            unique_transactions = []
            for t in transactions:
                key = (t['date'], t['description'], t['amount'])
                if key not in seen:
                    seen.add(key)
                    unique_transactions.append(t)
            
            return unique_transactions
            
        except Exception as e:
            raise ValueError(f"Error parsing PDF: {str(e)}")

    def _extract_transactions_from_text(self, text):
        """Extract transactions from plain text using regex patterns"""
        transactions = []
        
        patterns = [
            r'(\d{1,2}/\d{1,2}/\d{2,4})\s+(.+?)\s+\$?([\d,]+\.\d{2})',
            r'(\d{1,2}-\d{1,2}-\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})',
            r'(\d{4}-\d{1,2}-\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                try:
                    date = self.parse_date(match.group(1))
                    description = match.group(2).strip()
                    amount = self.parse_amount(match.group(3))
                    
                    if date and description and amount and amount > 0:
                        transactions.append({
                            'date': date,
                            'description': description,
                            'amount': amount
                        })
                except (ValueError, IndexError):
                    continue
        
        return transactions

    def _extract_transactions_from_table(self, table):
        """Extract transactions from table structure"""
        if not table or len(table) < 2:
            return []
        
        transactions = []
        
        for row in table[1:]:
            if not row or len(row) < 3:
                continue
            
            for i in range(len(row) - 2):
                try:
                    date = self.parse_date(row[i])
                    description = str(row[i + 1]).strip() if row[i + 1] else ''
                    amount = self.parse_amount(row[i + 2])
                    
                    if date and description and amount and amount > 0:
                        transactions.append({
                            'date': date,
                            'description': description,
                            'amount': amount
                        })
                        break
                except (ValueError, IndexError):
                    continue
        
        return transactions