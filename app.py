from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import matplotlib
matplotlib.use('Agg')  # Must come before pyplot import
import matplotlib.pyplot as plt
import numpy as np
from io import BytesIO
import io
import matplotlib.dates as mdates
from matplotlib.figure import Figure
from flask import send_file
import base64
import pandas as pd
import secrets
from datetime import datetime
from functools import wraps
import seaborn as sns

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///financial_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    transactions = db.relationship('Transaction', backref='user', lazy=True)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100))
    description = db.Column(db.String(200))
    recipient = db.Column(db.String(100))
    is_anomaly = db.Column(db.Boolean, default=False)
    anomaly_reason = db.Column(db.String(200))
class MenuItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # e.g., 'Main Course', 'Drinks', etc.
    price = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Float, nullable=False)  # For profit calculations
    is_active = db.Column(db.Boolean, default=True)

class Sale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50))  # 'Cash', 'Card', 'Transfer'
    customer_count = db.Column(db.Integer)
    time_of_day = db.Column(db.String(20))  # 'Breakfast', 'Lunch', 'Dinner'

class SaleItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=False)
    menu_item_id = db.Column(db.Integer, db.ForeignKey('menu_item.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_at_sale = db.Column(db.Float, nullable=False)  # In case prices change later
    discount = db.Column(db.Float, default=0.0)

# Helper Functions
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def detect_anomalies(transactions):
    # Simple anomaly detection based on amount and frequency
    amounts = [t.amount for t in transactions]
    mean = np.mean(amounts)
    std = np.std(amounts)
    
    for t in transactions:
        if t.amount > mean + 2*std:
            t.is_anomaly = True
            t.anomaly_reason = "Amount significantly higher than average"
        elif t.amount < mean - 2*std:
            t.is_anomaly = True
            t.anomaly_reason = "Amount significantly lower than average"
    
    # Check for frequent transactions to same recipient
    recipient_counts = {}
    for t in transactions:
        recipient_counts[t.recipient] = recipient_counts.get(t.recipient, 0) + 1
    
    for t in transactions:
        if recipient_counts.get(t.recipient, 0) > 5:  # More than 5 transactions to same recipient
            t.is_anomaly = True
            t.anomaly_reason = "Frequent transactions to same recipient"
    
    return transactions

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if password != confirm_password:
            return render_template('register.html', error="Passwords do not match")
        
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return render_template('register.html', error="Email already registered")
        
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(name=name, email=email, password=hashed_password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Redirect to login page with success message instead of auto-login
        return redirect(url_for('login', success='Account created successfully! Please login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Clear any existing session data
        session.clear()
        
        email = request.form['email']
        password = request.form['password']
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not check_password_hash(user.password, password):
            return render_template('login.html', error="Invalid email or password")
        
        # Start fresh session
        session['user_id'] = user.id
        session['user_name'] = user.name
        session['user_email'] = user.email
        session['data_loaded'] = False  # Flag to track if data has been loaded
        
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Clear any existing transaction data if this is the first load
    if 'data_loaded' not in session:
        Transaction.query.filter_by(user_id=session['user_id']).delete()
        db.session.commit()
        session['data_loaded'] = True
    
    transactions = Transaction.query.filter_by(user_id=session['user_id']).all()
    categories = list(set(t.category for t in transactions if t.category))
    
    # Generate default visualization
    plt.switch_backend('Agg')
    fig, ax = plt.subplots(figsize=(10, 6))
    
    if transactions:
        dates = [t.date for t in transactions]
        amounts = [t.amount for t in transactions]
        ax.plot(dates, amounts, 'b-')
        ax.set_title('Your Transactions')
    else:
        ax.text(0.5, 0.5, 'No transactions found\nUpload data to visualize', 
                ha='center', va='center')
        ax.set_title('No Data Available')
    
    ax.set_xlabel('Date')
    ax.set_ylabel('Amount')
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Save plot to buffer
    buf = BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    plot_data = base64.b64encode(buf.read()).decode('utf-8')
    
    return render_template('dashboard.html',
                         user_name=session['user_name'],
                         transactions=transactions,
                         plot_data=plot_data,
                         categories=categories)
    
@app.route('/upload', methods=['POST'])
@login_required
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        df = pd.read_csv(file)
        
        # Process and save transactions
        for _, row in df.iterrows():
            new_transaction = Transaction(
                user_id=session['user_id'],
                date=datetime.strptime(row['date'], '%Y-%m-%d'),
                amount=row['amount'],
                category=row.get('category', 'Other'),
                description=row.get('description', ''),
                recipient=row.get('recipient', 'Unknown')
            )
            db.session.add(new_transaction)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Data uploaded successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/visualize', methods=['POST'])
@login_required
def visualize():
    try:
        data = request.get_json()
        chart_id = data.get('chart_id', '')
        chart_type = data.get('chart_type', 'line')
        
        plt.switch_backend('Agg')  # Important for headless environments
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Get user's transactions
        transactions = Transaction.query.filter_by(user_id=session['user_id']).all()
        
        if not transactions:
            raise ValueError("No transaction data available")
            
        if chart_id == 'revenue':
            # Group transactions by date and sum amounts
            df = pd.DataFrame([{
                'date': t.date,
                'amount': t.amount
            } for t in transactions])
            
            df['date'] = pd.to_datetime(df['date'])
            df = df.groupby(pd.Grouper(key='date', freq='D')).sum().reset_index()
            
            ax.plot(df['date'], df['amount'], 'b-')
            ax.set_title('Revenue Trend')
            ax.set_ylabel('Amount')
            
        elif chart_id == 'top-items':
            # Group by category and sum amounts
            categories = {}
            for t in transactions:
                categories[t.category] = categories.get(t.category, 0) + t.amount
            
            if categories:
                categories = dict(sorted(categories.items(), key=lambda item: item[1], reverse=True)[:5])
                ax.bar(categories.keys(), categories.values())
                ax.set_title('Top Categories by Spending')
            
        elif chart_id == 'heatmap':
            # Create heatmap of transactions by day of week and hour
            df = pd.DataFrame([{
                'date': t.date,
                'amount': t.amount
            } for t in transactions])
            
            df['date'] = pd.to_datetime(df['date'])
            df['day'] = df['date'].dt.day_name()
            df['hour'] = df['date'].dt.hour
            
            heatmap_data = df.pivot_table(index='hour', columns='day', 
                                        values='amount', aggfunc='sum', fill_value=0)
            
            # Reorder days
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            heatmap_data = heatmap_data.reindex(columns=days)
            
            sns.heatmap(heatmap_data, ax=ax, cmap='YlGnBu')
            ax.set_title('Transaction Heatmap (Hour vs Day)')
            
        elif chart_id == 'payment-methods':
            # Group by recipient (as proxy for payment method)
            recipients = {}
            for t in transactions:
                recipients[t.recipient] = recipients.get(t.recipient, 0) + t.amount
            
            if recipients:
                ax.pie(recipients.values(), labels=recipients.keys(), autopct='%1.1f%%')
                ax.set_title('Payment Distribution by Recipient')
        
        ax.set_xlabel('')
        ax.set_ylabel('')
        plt.tight_layout()
        
        # Save to buffer
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        
        image_data = base64.b64encode(buf.read()).decode('utf-8')
        if not image_data:
            raise ValueError("Generated empty image data")
            
        return jsonify({
            'plot_data': image_data,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500
        
@app.route('/api/menu-items')
@login_required
def get_menu_items():
    items = MenuItem.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': item.id,
        'name': item.name,
        'category': item.category,
        'price': item.price,
        'cost': item.cost
    } for item in items])

@app.route('/api/sales-data')
@login_required
def get_sales_data():
    sales = Sale.query.filter_by(user_id=session['user_id']).all()
    return jsonify([{
        'id': sale.id,
        'date': sale.date.isoformat(),
        'total_amount': sale.total_amount,
        'items': [{
            'menu_item_id': item.menu_item_id,
            'quantity': item.quantity,
            'price_at_sale': item.price_at_sale
        } for item in sale.sale_items]
    } for sale in sales])
    
# In app.py, add this new route
@app.route('/dashboard-data')
@login_required
def dashboard_data():
    transactions = Transaction.query.filter_by(user_id=session['user_id']).all()
    anomalies = [t for t in transactions if t.is_anomaly]
    
    # Generate the default visualization
    plt.switch_backend('Agg')
    fig, ax = plt.subplots(figsize=(10, 6))
    
    if transactions:
        dates = [t.date for t in transactions]
        amounts = [t.amount for t in transactions]
        ax.plot(dates, amounts, 'b-')
        ax.set_title('Your Transactions')
    else:
        ax.text(0.5, 0.5, 'No transactions found\nUpload data to visualize', 
                ha='center', va='center')
        ax.set_title('No Data Available')
    
    ax.set_xlabel('Date')
    ax.set_ylabel('Amount')
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Save plot to buffer
    buf = BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    plot_data = base64.b64encode(buf.read()).decode('utf-8')
    
    return jsonify({
        'transaction_count': len(transactions),
        'total_amount': sum(t.amount for t in transactions),
        'anomaly_count': len(anomalies),
        'plot_data': plot_data
    })
    
# Add this route for downloading all charts
@app.route('/download-report', methods=['POST'])
@login_required
def download_report():
    try:
        # Get all chart data
        charts = {
            'revenue': generate_chart_data('revenue'),
            'top_items': generate_chart_data('top-items'),
            'heatmap': generate_chart_data('heatmap'),
            'payment_methods': generate_chart_data('payment-methods')
        }
        
        return jsonify({
            'success': True,
            'charts': charts
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_chart_data(chart_id):
    buf = BytesIO()
    plt.switch_backend('Agg')
    
    try:
        if chart_id == 'revenue':
            # Revenue Trend (Line Chart)
            sales = Sale.query.filter_by(user_id=session['user_id']).order_by(Sale.date).all()
            if sales:
                dates = [sale.date for sale in sales]
                amounts = [sale.total_amount for sale in sales]
                
                fig, ax = plt.subplots(figsize=(10, 6))
                ax.plot(dates, amounts, 'b-', linewidth=2)
                ax.set_title('Revenue Trend', pad=20)
                ax.set_ylabel('Amount (₦)', labelpad=10)
                ax.set_xlabel('Date', labelpad=10)
                ax.grid(True, linestyle='--', alpha=0.6)
                plt.xticks(rotation=45)
                plt.tight_layout()
                plt.savefig(buf, format='png')
                plt.close()

        elif chart_id == 'top-items':
            # Top Menu Items (Bar Chart)
            top_items = db.session.query(
                MenuItem.name,
                db.func.sum(SaleItem.quantity).label('total_quantity')
            ).join(SaleItem, MenuItem.id == SaleItem.menu_item_id
            ).join(Sale, SaleItem.sale_id == Sale.id
            ).filter(Sale.user_id == session['user_id']
            ).group_by(MenuItem.name
            ).order_by(db.desc('total_quantity')).limit(5).all()

            if top_items:
                items = [item[0] for item in top_items]
                quantities = [item[1] for item in top_items]
                
                fig, ax = plt.subplots(figsize=(10, 6))
                bars = ax.barh(items, quantities, color='#3498db')
                ax.set_title('Top Selling Menu Items', pad=20)
                ax.set_xlabel('Quantity Sold', labelpad=10)
                ax.grid(True, axis='x', linestyle='--', alpha=0.6)
                
                # Add value labels
                for bar in bars:
                    width = bar.get_width()
                    ax.text(width + 0.3, bar.get_y() + bar.get_height()/2,
                            f'{int(width)}',
                            ha='left', va='center')
                
                plt.tight_layout()
                plt.savefig(buf, format='png')
                plt.close()

        elif chart_id == 'heatmap':
            # Sales Heatmap
            sales = Sale.query.filter_by(user_id=session['user_id']).all()
            if sales:
                # Create DataFrame with hour and day data
                data = []
                for sale in sales:
                    data.append({
                        'hour': sale.date.hour,
                        'day': sale.date.strftime('%A'),
                        'amount': sale.total_amount
                    })
                
                df = pd.DataFrame(data)
                
                if not df.empty:
                    # Pivot for heatmap
                    days_order = ['Monday', 'Tuesday', 'Wednesday', 
                                 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    heatmap_data = df.pivot_table(index='hour', columns='day',
                                                values='amount', aggfunc='sum',
                                                fill_value=0)
                    
                    # Reindex to maintain day order
                    heatmap_data = heatmap_data.reindex(columns=days_order)
                    
                    fig, ax = plt.subplots(figsize=(12, 8))
                    sns.heatmap(heatmap_data, cmap='YlGnBu', ax=ax,
                               annot=True, fmt='.0f', linewidths=.5)
                    ax.set_title('Sales Heatmap (Hour vs Day)', pad=20)
                    ax.set_xlabel('Day of Week', labelpad=10)
                    ax.set_ylabel('Hour of Day', labelpad=10)
                    plt.tight_layout()
                    plt.savefig(buf, format='png')
                    plt.close()

        elif chart_id == 'payment-methods':
            # Payment Methods (Pie Chart)
            payments = db.session.query(
                Sale.payment_method,
                db.func.sum(Sale.total_amount).label('total')
            ).filter(Sale.user_id == session['user_id']
            ).group_by(Sale.payment_method).all()

            if payments:
                methods = [p[0] for p in payments]
                amounts = [p[1] for p in payments]
                
                fig, ax = plt.subplots(figsize=(8, 8))
                wedges, texts, autotexts = ax.pie(
                    amounts, labels=methods, autopct='%1.1f%%',
                    startangle=90, wedgeprops={'width': 0.4},
                    textprops={'fontsize': 10}, pctdistance=0.85,
                    colors=['#3498db', '#2ecc71', '#e74c3c', '#f39c12']
                )
                
                # Equal aspect ratio ensures pie is drawn as circle
                ax.axis('equal')  
                ax.set_title('Payment Method Distribution', pad=20)
                
                # Make percentage text white and bold
                for autotext in autotexts:
                    autotext.set_color('white')
                    autotext.set_weight('bold')
                
                plt.tight_layout()
                plt.savefig(buf, format='png')
                plt.close()

        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')

    except Exception as e:
        print(f"Error generating {chart_id} chart:", str(e))
        # Return empty image on error
        buf.seek(0)
        plt.close()
        return ""
    
        
@app.route('/report', methods=['POST'])
@login_required
def generate_report():
    report_type = request.form.get('report_type', 'summary')
    
    transactions = Transaction.query.filter_by(user_id=session['user_id']).all()
    anomalies = [t for t in transactions if t.is_anomaly]
    
    if report_type == 'summary':
        total_amount = sum(t.amount for t in transactions)
        avg_amount = total_amount / len(transactions) if transactions else 0
        categories = {}
        for t in transactions:
            categories[t.category] = categories.get(t.category, 0) + t.amount
        
        report_data = {
            'type': 'Summary Report',
            'total_transactions': len(transactions),
            'total_amount': total_amount,
            'average_amount': avg_amount,
            'categories': categories,
            'anomalies_count': len(anomalies)
        }
    elif report_type == 'anomalies':
        report_data = {
            'type': 'Anomaly Report',
            'anomalies': [{
                'date': a.date.strftime('%Y-%m-%d'),
                'amount': a.amount,
                'recipient': a.recipient,
                'reason': a.anomaly_reason
            } for a in anomalies]
        }
    else:
        report_data = {'type': 'Custom Report', 'message': 'Custom report generated'}
    
    return jsonify(report_data)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)