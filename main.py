#all imports
import sqlite3, os, uuid, base64
from flask import Flask, render_template, request, session, redirect, url_for, g, make_response, jsonify, send_from_directory, render_template_string
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, verify_jwt_in_request, create_access_token
from functools import wraps
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from flask_caching import Cache
from celery import Celery
from celery.schedules import crontab
from flask_mail import Mail, Message
import pdfkit
import pytz
import csv


app = Flask(__name__)
app.secret_key = 'your_secret_key_here'

# JWT configuration
app.config['JWT_SECRET_KEY'] = 'your_jwt_secret_key_here'
jwt = JWTManager(app)

# config for image file uploading
app.config['UPLOAD_FOLDER'] = 'static/images'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}


app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = '21f2000931@ds.study.iitm.ac.in'
app.config['MAIL_PASSWORD'] = 'maxa rlgk sfkh lxrr'
app.config['CELERY_BROKER_URL'] = "redis://localhost:6379/1"
app.config['result_backend'] = "redis://localhost:6379/2"
app.config['timezone'] = "Asia/Kolkata"

mail = Mail(app)
celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)


# Configuration for Redis caching
app.config['CACHE_TYPE'] = 'simple'
app.config['CACHE_KEY_PREFIX'] = 'myapp:'
app.config['CACHE_REDIS_HOST'] = 'localhost'  # Update with your Redis host
app.config['CACHE_REDIS_PORT'] = 6379  # Update with your Redis port

cache = Cache(app)

# making database connection
def get_db():
  db = getattr(g, '_database', None)
  if db is None:
    db = g._database = sqlite3.connect('grocery_store.db')
  return db


@app.teardown_appcontext
def close_db(error):
  db = getattr(g, '_database', None)
  if db is not None:
    db.close()


# initializing database and admin detail inserting
def initialize_database():
  with app.app_context():
    db = get_db()
    cursor = db.cursor()

    # creating the users table
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT NOT NULL UNIQUE CHECK (email LIKE '%@%.%'),
                        password TEXT NOT NULL,
                        user_type TEXT NOT NULL DEFAULT 'user',
                        is_approved INTEGER DEFAULT 0
                        )''')
    # creating the Sections table for categories
    cursor.execute('''CREATE TABLE IF NOT EXISTS sections (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        image TEXT
                        )''')
    # Create the category_requests table
    cursor.execute('''CREATE TABLE IF NOT EXISTS category_requests (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category_name TEXT NOT NULL,
                        request_type TEXT NOT NULL,
                        requester_id INTEGER NOT NULL,
                        category_id INTEGER,
                        image TEXT,
                        FOREIGN KEY (requester_id) REFERENCES users (id),
                        FOREIGN KEY (category_id) REFERENCES sections (id)
                        )''')
    # creating the products table for products in specific categories
    cursor.execute('''CREATE TABLE IF NOT EXISTS products (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        manufacture_date DATE NULL,
                        expiry_date DATE NULL,
                        price REAL NOT NULL,
                        unit TEXT NOT NULL,
                        available_quantity INTEGER NOT NULL,
                        section_id INTEGER,
                        image TEXT,
                        FOREIGN KEY (section_id) REFERENCES sections (id)
                        )''')
    # creating the user_cart table for products in users cart
    cursor.execute('''CREATE TABLE IF NOT EXISTS user_cart (
                        user_id INTEGER,
                        product_id INTEGER,
                        quantity INTEGER,
                        FOREIGN KEY (user_id) REFERENCES users (id),
                        FOREIGN KEY (product_id) REFERENCES products (id),
                        PRIMARY KEY (user_id, product_id)
                        )''')
    # creating the shopping_history table for users shopping history
    cursor.execute('''CREATE TABLE IF NOT EXISTS shopping_history (
                        order_id TEXT,
                        user_id INTEGER,
                        product_id INTEGER,
                        quantity INTEGER,
                        purchase_date TEXT,
                        product_name TEXT,
                        price REAL NOT NULL,
                        unit TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                        )''')
    # Added admin details
    cursor.execute(
      '''INSERT OR IGNORE INTO users (email, password, user_type) VALUES (?, ?, ?)''',
      ('21f2000931@ds.study.iitm.ac.in', 'password', 'admin'))

    db.commit()



@app.before_request
def before_request():
  initialize_database()


# Authorization
# User required decorator
def user_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        cursor = get_db().cursor()
        cursor.execute(
            '''SELECT * FROM users WHERE id=? AND user_type=?''',
            (user_id, 'user'))
        user = cursor.fetchone()
        if user:
            return fn(*args, **kwargs)
        else:
            return jsonify(message='User access required'), 403
    return wrapper

# Admin required decorator
def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()

        cursor = get_db().cursor()
        cursor.execute(
            '''SELECT * FROM users WHERE id=? AND user_type=?''',
            (user_id, 'admin'))
        admin = cursor.fetchone()
        if admin:
            return fn(*args, **kwargs)
        else:
            return jsonify(message='Admin access required'), 403
    return wrapper

# Store Manager required decorator
def store_manager_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        cursor = get_db().cursor()
        cursor.execute(
            '''SELECT * FROM users WHERE id=? AND user_type=? AND is_approved=?''',
            (user_id, 'store_manager', 1))
        store_manager = cursor.fetchone()
        if store_manager:
            return fn(*args, **kwargs)
        else:
            return jsonify(message='Store Manager access required'), 403
    return wrapper


# Aunthentication
# Generate JWT token
def generate_token(user_id):
    cursor = get_db().cursor()
    cursor.execute(
        '''SELECT user_type FROM users WHERE id=?''',
        (user_id,))
    user = cursor.fetchone()

    if user:
        user_type = user[0]
        payload = {
            'user_id': user_id,
            'user_type': user_type
        }
        # Use create_access_token to generate a JWT token
        token = create_access_token(identity=user_id)
        return token
    else:
        return None




@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify(message='Invalid token')


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_data):
    return jsonify(message='Token has expired'), 401



@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify(message='Unauthorized, please log in'), 401





def allowed_file(filename):
  return '.' in filename and filename.rsplit(
    '.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']



@celery.task(name='task.send_daily_reminders')
def send_daily_reminders():
    with app.app_context():
        cursor = get_db().cursor()
        cursor.execute("SELECT id, email FROM users WHERE user_type='user'")
        users = cursor.fetchall()

        for user in users:
            user_id, email = user
            # Check if the user has not visited or bought anything (add your logic here)
            if not has_bought(user_id):
                send_email_reminder(email)

# Function to check if the user has visited or bought anything
def has_bought(user_id):
    cursor = get_db().cursor()
    cursor.execute("SELECT user_id, purchase_date FROM shopping_history WHERE user_id=?", (user_id,))
    history = cursor.fetchall()

    timezone = pytz.timezone('Asia/Kolkata')

    # check if the user made a purchase in the last 1 day
    one_day_ago = timezone.localize(datetime.utcnow()) - timedelta(days=1)

    # Iterate through the results and check if there's a recent purchase
    for purchase in history:
        if purchase[0] == user_id and timezone.localize(datetime.strptime(purchase[1], "%d-%m-%Y %H:%M")) >= one_day_ago:
            return True

    return False

# Function to send an email reminder
def send_email_reminder(email):
    msg = Message('Daily Reminder - The Grocery Store', sender='21f2000931@ds.study.iitm.ac.in', recipients=[email])
    msg.body = 'Remember to visit or make a purchase on our site!'
    mail.send(msg)

# Function to generate monthly activity report
def generate_monthly_report(user_id):
    cursor = get_db().cursor()

    # Set the timezone to 'Asia/Kolkata'
    timezone = pytz.timezone('Asia/Kolkata')

    # Get the first day of the current month
    current_month_first_day = datetime.now(timezone).replace(day=1, hour=0, minute=0, second=0)

    history_query = '''
        SELECT shopping_history.order_id,
               shopping_history.purchase_date,
               shopping_history.product_name,
               shopping_history.quantity,
               shopping_history.price, shopping_history.unit
        FROM shopping_history
        WHERE shopping_history.user_id = ?
    '''

    user_history = cursor.execute(history_query, (user_id, current_month_first_day)).fetchall()
    # Organize user_history by order_id
    order_history = {}
    for row in user_history:
        order_id = row[0]
        if order_id not in order_history:
            order_history[order_id] = []
        order_history[order_id].append(row)

    # Calculate order_total for each order
    for order_id, items in order_history.items():
        order_total = sum(item[3] * item[4] for item in items)
        order_history[order_id] = (order_history[order_id], order_total)

    cursor.execute("SELECT id, email FROM users WHERE user_type='user' AND id=?", (user_id,))
    user = cursor.fetchall()


    # Render HTML template for purchase history
    purchase_history_html = render_template_string(
        """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
            rel="stylesheet"
            integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
            crossorigin="anonymous">
            <title>Your Recent Purchase Details - The Grocery Store</title>
        </head>
        <body>
            <div class="container mt-5">
                <h2>Your Recent Purchase Details - The Grocery Store</h2>
                <p>Hello {{ user[0][1] }},</p>
                <p>Here are your recent Purchases for the month of {{ month_name }}:</p>
                <table class="table table-bordered table-striped">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Product with Price/Unit</th>
                            <th>Quantity</th>
                            <th>Total Bill</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for order_id, (items, order_total) in order_history.items() %}
                            {% for item in items %}
                                <tr>
                                    {% if loop.first %}
                                        <td rowspan="{{ items|length }}">{{ order_id }}</td>
                                        <td rowspan="{{ items|length }}">{{ item[1] }}</td>
                                    {% endif %}
                                    <td>{{ item[2] }} - {{ item[4] }} {{ item[5] }}</td>
                                    <td>{{ item[3] }}</td>
                                    {% if loop.first %}
                                        <td rowspan="{{ items|length }}">{{ order_total }}</td>
                                    {% endif %}
                                </tr>
                            {% endfor %}
                        {% endfor %}
                    </tbody>
                </table>
                <p>Total Expenditure for the month: {{ total_expenditure }}</p>
            </div>
        </body>
        </html>
        """,
        user=user,
        order_history=order_history,
        month_name=datetime.now().strftime('%B'),
        total_expenditure=sum(order_total for _, (_, order_total) in order_history.items()),
    )

    return purchase_history_html

# Celery task to send monthly activity report
@celery.task(name='task.send_monthly_report')
def send_monthly_report():
    with app.app_context():
        # Assuming your database connection and cursor are already defined

        # Execute the query to get user_id and email
        cursor = get_db().cursor()
        cursor.execute("SELECT id, email FROM users WHERE user_type='user'")
        users = cursor.fetchall()

        for user in users:
            user_id, email = user

            report_html = generate_monthly_report(user_id)

            # Attach HTML report
            msg = Message('Your Recent Purchase Details', sender='21f2000931@ds.study.iitm.ac.in', recipients=[email])
            msg.body = 'Hello! Here are your recent purchases.'
            msg.html = report_html

            # Save HTML content to a temporary file
            with open('temp_report.html', 'w', encoding='utf-8') as html_file:
                html_file.write(report_html)

            # Convert HTML to PDF
            pdf_path = 'temp_report.pdf'
            pdfkit.from_file('temp_report.html', pdf_path)

            # Attach PDF report
            with app.open_resource(pdf_path) as pdf_file:
                msg.attach(pdf_path, 'application/pdf', pdf_file.read())

            # Send the email
            mail.send(msg)

            # Clean up temporary files
            os.remove('temp_report.html')
            os.remove(pdf_path)

# Schedule the task
beat_schedule = {
    'send_daily_reminders': {
        'task': 'task.send_daily_reminders',
        'schedule': crontab(hour=12, minute=23),
    },
    'send_monthly_report': {
        'task': 'task.send_monthly_report',
        'schedule': crontab(day_of_month=1, hour=0, minute=0),
    },
}

# Configure Celery beat
celery.conf.beat_schedule = beat_schedule
celery.conf.timezone = 'Asia/Kolkata'


@celery.task(name='task.export_csv')
def export_csv(user_id):
    with app.app_context():
        cursor = get_db().cursor()

        # Fetch user's email
        cursor.execute("SELECT email FROM users WHERE id=?", (user_id,))
        email = cursor.fetchone()[0]

        # Calculate units sold for each product
        most_sold_query = '''
            SELECT p.id, p.name, p.manufacture_date, p.expiry_date, p.price, p.unit, p.available_quantity, COALESCE(SUM(sh.quantity), 0) AS total_sold
            FROM products p
            LEFT JOIN shopping_history sh ON p.id = sh.product_id
            GROUP BY p.id, p.name, p.manufacture_date, p.expiry_date, p.price, p.unit, p.available_quantity
        '''

        cursor.execute(most_sold_query)
        units_sold_data = cursor.fetchall()

        if not units_sold_data:
            return "No products to export"

        # Generate CSV content
        csv_data = []
        csv_data.append(['Product Id', 'Product Name', 'Manufacture Date', 'Expiry Date', 'Price', 'Unit', 'Available Quantity', 'Units Sold'])
        for product in units_sold_data:
            csv_data.append([product[0], product[1], product[2], product[3], product[4], product[5], product[6], product[7]])

        # Create the email message
        msg = Message('CSV Export Completed', sender='21f2000931@ds.study.iitm.ac.in', recipients=[email])
        msg.body = 'Your CSV export is ready for download.'

        # Save CSV file
        csv_file_path = f'temp_exports/product_details_{datetime.now().strftime("%Y%m%d%H%M%S")}.csv'
        os.makedirs(os.path.dirname(csv_file_path), exist_ok=True)
        with open(csv_file_path, 'w', newline='') as csv_file:
            csv_writer = csv.writer(csv_file)
            csv_writer.writerows(csv_data)

        # Attach the CSV file to the email
        with open(csv_file_path, 'r', newline='') as csv_file:
            msg.attach('product_details.csv', 'text/csv', csv_file.read())

        # Send the email
        mail.send(msg)

        # Remove temporary CSV file
        os.remove(csv_file_path)



# API endpoint to trigger CSV export task
@app.route('/export_csv', methods=['POST'])
@jwt_required()
@store_manager_required
def export_csv_api():
    # Extract user_id from the request
    user_id = get_jwt_identity()

    # Trigger the Celery task asynchronously
    result = export_csv.apply_async(args=[user_id])

    return jsonify(message="CSV export task has been triggered successfully", task_id=result.id)


@app.route('/test_send_reminder', methods=['GET'])
def test_send_reminder():
    send_daily_reminders.apply_async()
    return jsonify(message='Test task triggered successfully.')


# Homepage
@app.route('/')
def home():
  return render_template('index.html')

# Manifest
@app.route('/manifest.json')
def send_manifest():
    return send_from_directory('', 'manifest.json')

# user signup page
@app.route('/user/signup', methods=['GET', 'POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    cursor = get_db().cursor()
    cursor.execute('''SELECT * FROM users WHERE email=?''', (email,))
    exist_user = cursor.fetchone()

    if exist_user:
        return jsonify(errorMessage="Email already exists. Please choose a different email."), 400

    cursor.execute('''INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)''',
                   (email, password, 'user'))
    get_db().commit()

    return jsonify(successMessage="User registered successfully!"), 201

# user login page
@app.route('/user/login', methods=['GET', 'POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    cursor = get_db().cursor()
    cursor.execute('''SELECT * FROM users WHERE email=? AND password=? AND user_type=?''',
                   (email, password, 'user'))
    user = cursor.fetchone()

    if user:
        user_type = user[3]
        access_token = generate_token(user[0])
        return jsonify(successMessage="User login successful", access_token=access_token, user_type=user_type), 200
    else:
        return jsonify(errorMessage="Invalid email or password")


# admin login page
@app.route('/admin/login', methods=['GET','POST'])
def admin_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    cursor = get_db().cursor()
    cursor.execute('''SELECT * FROM users WHERE email=? AND password=? AND user_type=?''',
                   (email, password, 'admin'))
    admin = cursor.fetchone()

    if admin:
        user_type = admin[3]
        access_token = generate_token(admin[0])
        return jsonify(successMessage="admin login successful", access_token=access_token, user_type=user_type), 200
    else:
        return jsonify(errorMessage="Invalid email or password")

# Store manager signup
@app.route('/store_manager/signup', methods=['GET', 'POST'])
def store_manager_signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    cursor = get_db().cursor()
    cursor.execute('''SELECT * FROM users WHERE email=?''', (email,))
    existing_user = cursor.fetchone()

    if existing_user:
        return jsonify(errorMessage="Email already exists. Please choose a different email."), 400

    cursor.execute('''INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)''',
                   (email, password, 'store_manager'))
    get_db().commit()

    return jsonify(successMessage="Store manager registration request sent for approval."), 200

# Store manager login
@app.route('/store_manager/login', methods=['POST'])
def store_manager_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    cursor = get_db().cursor()
    cursor.execute('''SELECT * FROM users WHERE email=? AND password=? AND user_type=? AND is_approved=?''',
                   (email, password, 'store_manager', 1))  # Only approved store managers can log in
    store_manager = cursor.fetchone()

    if store_manager:
        user_type = store_manager[3]
        access_token = generate_token(store_manager[0])
        return jsonify(successMessage="Store manager login successful", access_token=access_token, user_type=user_type), 200
    else:
        return jsonify(errorMessage="Store manager login failed. Request not approved yet or invalid credentials.")


# Admin Dashboard
@app.route('/admin/dashboard')
@jwt_required()
@admin_required
def admin_dashboard():
    cursor = get_db().cursor()
    sections = cursor.execute("SELECT id, name FROM sections").fetchall()

    sections_list = [{
        'id': section[0],
        'name': section[1]
    } for section in sections]

    return jsonify(sections=sections_list)


# the route for insights
@app.route('/admin/insights', methods=['GET'])
@jwt_required()
@admin_required
def admin_insights():
    cursor = get_db().cursor()

    # Fetch most sold products
    most_sold_query = '''
        SELECT p.name, SUM(sh.quantity) AS total_sold
        FROM products p
        JOIN shopping_history sh ON p.id = sh.product_id
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 5
    '''
    most_sold_products = cursor.execute(most_sold_query).fetchall()

    # Fetch registered users count
    registered_users_query = '''
        SELECT COUNT(*) FROM users WHERE user_type = 'user'
    '''
    registered_users_count = cursor.execute(registered_users_query).fetchone()[0]

    # Fetch low quantity products
    low_quantity_query = '''
        SELECT name, available_quantity
        FROM products
        WHERE available_quantity <= 10
    '''
    low_quantity_products = cursor.execute(low_quantity_query).fetchall()

    # Fetch products with expired expiration dates
    expired_products_query = '''
        SELECT name, expiry_date
        FROM products
        WHERE expiry_date <= date('now')
    '''
    expired_products = cursor.execute(expired_products_query).fetchall()

    cursor.close()  # Close the cursor

    # Generate the Most Sold Products Bar Chart
    plt.figure(figsize=(8, 6))
    products = [product[0] for product in most_sold_products]
    quantities = [product[1] for product in most_sold_products]
    plt.bar(products, quantities)
    plt.xlabel('Products')
    plt.ylabel('Quantity Sold')
    plt.title('Most Sold Products')
    most_sold_chart_path = os.path.join(app.config['UPLOAD_FOLDER'], 'most_sold_chart.png')
    plt.savefig(most_sold_chart_path)
    plt.clf()  # Clear the current figure

    # Format data as JSON
    insights_data = {
        "most_sold_chart_path": most_sold_chart_path,
        "registered_users_count": registered_users_count,
        "low_quantity_products": low_quantity_products,
        "expired_products": expired_products,
    }

    return jsonify(insights_data)




@app.route('/admin/add_category', methods=['POST'])
@jwt_required()
@admin_required
def add_category():
    # Get data from the form
    name = request.form.get('name')
    image_file = request.files.get('image')

    # Check if the name already exists
    cursor = get_db().cursor()
    cursor.execute("SELECT id FROM sections WHERE name=?", (name,))
    existing_category = cursor.fetchone()

    if existing_category:
        return jsonify(errorMessage=f"A category with the name '{name}' already exists.")

    # Check if the file has a valid extension
    if image_file and allowed_file(image_file.filename):
        filename = str(uuid.uuid4()) + os.path.splitext(image_file.filename)[1]
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Save the image to the server
        image_file.save(image_path)

        # Insert category into the database
        cursor.execute('''INSERT INTO sections (name, image) VALUES (?, ?)''', (name, filename))
        get_db().commit()

        return jsonify(message="Category added successfully")
    else:
        return jsonify(errorMessage="Image extension not allowed")


@app.route('/admin/edit_category/<int:category_id>', methods=['GET', 'PUT'])
@jwt_required()
@admin_required
def edit_category(category_id):
    cursor = get_db().cursor()

    if request.method == 'GET':
        # Handle GET request to retrieve category data
        cursor.execute("SELECT name, image FROM sections WHERE id=?", (category_id,))
        category = cursor.fetchone()

        if category is None:
            return jsonify(errorMessage="Category not found"), 404

        category_data = {
            "name": category[0],
            "image": category[1]
        }

        return jsonify(category_data)

    elif request.method == 'PUT':
        # Handle PUT request to update category data
        name = request.form.get('name')
        cursor.execute("SELECT name, image FROM sections WHERE id=?", (category_id,))
        cat = cursor.fetchone()
        filename = cat[1]
        # Check if a new image is provided
        image_file = request.files.get('image')

        if image_file:
            if not allowed_file(image_file.filename):
                error_message = "Image extension not allowed."
                return jsonify(errorMessage=error_message)

            # Remove the previous image if it exists
            cursor.execute("SELECT image FROM sections WHERE id=?", (category_id,))
            category = cursor.fetchone()
            previous_image = category[0]

            if previous_image:
                previous_image_path = os.path.join(app.config['UPLOAD_FOLDER'], previous_image)
                if os.path.exists(previous_image_path):
                    os.remove(previous_image_path)

            # Save the new image
            filename = str(uuid.uuid4()) + os.path.splitext(image_file.filename)[1]
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image_file.save(image_path)

        # Check if the new name is unique among categories
        cursor.execute("SELECT id FROM sections WHERE name=? AND id<>?", (name, category_id))
        existing_category = cursor.fetchone()

        if existing_category:
            error_message = "A category with the same name already exists."
            return jsonify(errorMessage=error_message)

        # Update category data in the database
        cursor.execute("UPDATE sections SET name=?, image=? WHERE id=?", (name, filename, category_id))
        get_db().commit()

        return jsonify(message="Category updated successfully")

    return jsonify(errorMessage="Method not allowed"), 405


@app.route('/admin/remove_category/<int:category_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def remove_category(category_id):
    cursor = get_db().cursor()
    cursor.execute("SELECT name, image FROM sections WHERE id=?", (category_id,))
    category = cursor.fetchone()

    cursor.execute("SELECT image FROM products WHERE section_id=?", (category_id,))
    product_images = cursor.fetchall()

    cursor.execute("DELETE FROM sections WHERE id=?", (category_id,))
    cursor.execute("DELETE FROM products WHERE section_id=?", (category_id,))
    get_db().commit()

    if category[1]:
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], category[1])
        if os.path.exists(image_path):
            os.remove(image_path)

    for product_image in product_images:
        if product_image[0]:
            product_image_path = os.path.join(app.config['UPLOAD_FOLDER'], product_image[0])
            if os.path.exists(product_image_path):
                os.remove(product_image_path)

    return jsonify(message="Category removed successfully")


@app.route('/admin/store-manager-requests', methods=['GET'])
@jwt_required()
@admin_required
def get_store_manager_requests():
    cursor = get_db().cursor()
    # Fetch store manager requests (users with user_type='store_manager' and is_approved=0)
    store_manager_requests = cursor.execute("SELECT id, email FROM users WHERE user_type='store_manager' AND is_approved=0").fetchall()
    store_manager_requests_list = [{
        'id': request[0],
        'email': request[1]
    } for request in store_manager_requests]
    return jsonify(storeManagerRequests=store_manager_requests_list)

@app.route('/admin/approve-store-manager/<int:manager_id>', methods=['POST'])
@jwt_required()
@admin_required
def approve_store_manager(manager_id):
    cursor = get_db().cursor()

    # Attempt to update the user's is_approved status to 1 (approved)
    rows_affected = cursor.execute("UPDATE users SET is_approved=1 WHERE id=?", (manager_id,))

    if rows_affected is not None:
        get_db().commit()
        return jsonify(message="Store manager request approved")
    else:
        get_db().rollback()
        return jsonify(errorMessage="Failed to approve store manager request"), 500

@app.route('/admin/decline-store-manager/<int:manager_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def decline_store_manager(manager_id):
    cursor = get_db().cursor()

    # Attempt to decline the store manager request by removing the user
    rows_affected = cursor.execute("DELETE FROM users WHERE id=?", (manager_id,))

    if rows_affected is not None:
        get_db().commit()
        return jsonify(message="Store manager request declined")
    else:
        get_db().rollback()
        return jsonify(errorMessage="Failed to decline store manager request"), 500

@app.route('/store_manager/add_category_request', methods=['POST'])
@jwt_required()
@store_manager_required
def add_category_request():
    # Get data from the form
    category_name = request.form.get('category_name')
    image_file = request.files.get('image')
    request_type = 'create'
    requester_id = get_jwt_identity()

    # Check if the name already exists
    cursor = get_db().cursor()
    cursor.execute("SELECT id FROM sections WHERE name=?", (category_name,))
    existing_category = cursor.fetchone()

    if existing_category:
        return jsonify(errorMessage=f"A category with the name '{category_name}' already exists.")

    # Check if the file has a valid extension
    if image_file and allowed_file(image_file.filename):
        filename = str(uuid.uuid4()) + os.path.splitext(image_file.filename)[1]
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Save the image to the server
        image_file.save(image_path)

        # Insert category into the database
        cursor.execute(
            "INSERT INTO category_requests (category_name, request_type, requester_id, category_id, image) VALUES (?, ?, ?, ?, ?)",
            (category_name, request_type, requester_id, None, filename)
        )
        get_db().commit()

        return jsonify(message="Category added successfully")
    else:
        return jsonify(errorMessage="Image extension not allowed")


@app.route('/store_manager/edit_category_request/<int:category_id>', methods=['GET', 'PUT'])
@jwt_required()
@store_manager_required
def edit_category_request(category_id):
    cursor = get_db().cursor()
    request_type = 'edit'
    requester_id = get_jwt_identity()

    if request.method == 'GET':
        # Handle GET request to retrieve category data
        cursor.execute("SELECT name, image FROM sections WHERE id=?", (category_id,))
        category = cursor.fetchone()

        if category is None:
            return jsonify(errorMessage="Category not found"), 404

        category_data = {
            "name": category[0],
            "image": category[1]
        }

        return jsonify(category_data)

    elif request.method == 'PUT':
        # Handle PUT request to update category data
        category_name = request.form.get('category_name')
        cursor.execute("SELECT name, image FROM sections WHERE id=?", (category_id,))
        cat = cursor.fetchone()
        filename = cat[1]

        # Check if a new image is provided
        image_file = request.files.get('image')

        if image_file:
            if not allowed_file(image_file.filename):
                error_message = "Image extension not allowed."
                return jsonify(errorMessage=error_message)

            # Save the new image
            filename = str(uuid.uuid4()) + os.path.splitext(image_file.filename)[1]
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image_file.save(image_path)

        # Check if the new name is unique among categories
        cursor.execute("SELECT id FROM sections WHERE name=? AND id<>?", (category_name, category_id))
        existing_category = cursor.fetchone()

        if existing_category:
            error_message = "A category with the same name already exists."
            return jsonify(errorMessage=error_message)

        # Update category data in the category_requests table
        try:
            cursor.execute(
                "INSERT INTO category_requests (category_name, request_type, requester_id, category_id, image) VALUES (?, ?, ?, ?, ?)",
                (category_name, request_type, requester_id, category_id, filename))
            get_db().commit()
            print("Category updated successfully")
            return jsonify(message="Category updated successfully")
        except Exception as e:
            print("Error updating category:", str(e))
            return jsonify(errorMessage="Error updating category")

    return jsonify(errorMessage="Method not allowed"), 405


@app.route('/store_manager/remove_category_request/<int:category_id>', methods=['POST'])
@jwt_required()
@store_manager_required
def remove_category_request(category_id):
    cursor = get_db().cursor()
    request_type = 'remove'
    requester_id = get_jwt_identity()

    if category_id:
        cursor.execute("SELECT name FROM sections WHERE id=?", (category_id,))
        category_name = cursor.fetchone()

        if not category_name:
            return jsonify(errorMessage="Category not found"), 404

        category_name = category_name[0]

        # Store the request in the 'category_requests' table for removal
        cursor.execute(
            "INSERT INTO category_requests (category_name, request_type, requester_id, category_id) VALUES (?, ?, ?, ?)",
            (category_name, request_type, requester_id, category_id)
        )
        get_db().commit()

        return jsonify(message="Category removal request submitted successfully")
    else:
        return jsonify(errorMessage="Category ID is missing")


# Admin retrieves pending category requests
@app.route('/admin/category_requests', methods=['GET'])
@jwt_required()
@admin_required
def admin_get_category_requests():
    cursor = get_db().cursor()

    # Retrieve pending category requests with requester and category details
    cursor.execute("""
        SELECT
            cr.id,
            cr.category_name,
            cr.request_type,
            u.email AS requester_email,
            s.name AS category_name
        FROM category_requests cr
        LEFT JOIN users u ON cr.requester_id = u.id
        LEFT JOIN sections s ON cr.category_id = s.id
    """)

    requests = cursor.fetchall()

    category_requests = [{
        'id': request[0],
        'category_name': request[1],
        'request_type': request[2],
        'requester_email': request[3]
    } for request in requests]

    return jsonify(category_requests=category_requests)

# Admin handles category request
@app.route('/admin/handle_category_request/<int:request_id>', methods=['PUT'])
@jwt_required()
@admin_required
def admin_handle_category_request(request_id):
    data = request.get_json()
    request_action = data.get('action')  # 'approve' or 'reject'

    cursor = get_db().cursor()

    # Retrieve the category request
    cursor.execute("SELECT category_name, request_type, requester_id, category_id, image FROM category_requests WHERE id=?", (request_id,))
    request_data = cursor.fetchone()

    if not request_data:
        return jsonify(errorMessage="Category request not found"), 404

    category_name = request_data[0]
    request_type = request_data[1]
    requester_id = request_data[2]
    category_id = request_data[3]
    image = request_data[4]

    if request_action == 'approve':
        if request_type == 'create' and category_id is None:  # Check request_type and category_id
            # Handle category creation request
            cursor.execute("INSERT INTO sections (name, image) VALUES (?, ?)", (category_name, image))
            get_db().commit()

        elif request_type == 'edit':
            if category_id is not None:
                # Fetch existing category data from sections table
                cursor.execute("SELECT name, image FROM sections WHERE id=?", (category_id,))
                existing_category = cursor.fetchone()

                if existing_category:
                    existing_image = existing_category[1]

                    # Check if a new image is provided
                    if image:
                        # Delete the existing image if it's different
                        if existing_image:
                            existing_image_path = os.path.join(app.config['UPLOAD_FOLDER'], existing_image)
                            if os.path.exists(existing_image_path):
                                os.remove(existing_image_path)

                        # Update the name in the sections table
                        cursor.execute("UPDATE sections SET name=?, image=? WHERE id=?", (category_name, image, category_id))

                        # Commit the changes
                        get_db().commit()

        elif request_type == 'remove':
            if category_id is not None:
                    cursor.execute("SELECT name, image FROM sections WHERE id=?", (category_id,))
                    category = cursor.fetchone()

                    cursor.execute("SELECT image FROM products WHERE section_id=?", (category_id,))
                    product_images = cursor.fetchall()

                    cursor.execute("DELETE FROM sections WHERE id=?", (category_id,))
                    cursor.execute("DELETE FROM products WHERE section_id=?", (category_id,))
                    get_db().commit()

                    if category[1]:
                        image_path = os.path.join(app.config['UPLOAD_FOLDER'], category[1])
                        if os.path.exists(image_path):
                            os.remove(image_path)

                    for product_image in product_images:
                        if product_image[0]:
                            product_image_path = os.path.join(app.config['UPLOAD_FOLDER'], product_image[0])
                            if os.path.exists(product_image_path):
                                os.remove(product_image_path)
                    get_db().commit()

        # Delete the handled request
        cursor.execute("DELETE FROM category_requests WHERE id = ?", (request_id,))
        get_db().commit()

        return jsonify(message="Category request handled successfully")

    elif request_action == 'reject':
        cursor.execute("SELECT category_name, image FROM category_requests WHERE id=?", (request_id,))
        category = cursor.fetchall()

        if category[1]:
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], category[1])
            if os.path.exists(image_path):
                os.remove(image_path)

        # Delete the rejected request
        cursor.execute("DELETE FROM category_requests WHERE id=?", (request_id,))
        get_db().commit()

        return jsonify(message="Category request rejected successfully")

    else:
        return jsonify(errorMessage="Invalid action"), 400


# store_manager Dashboard
@app.route('/store_manager/dashboard')
@jwt_required()
@store_manager_required
def sm_dashboard():
    user_id = get_jwt_identity()  # Get the user ID from JWT
    cursor = get_db().cursor()
    current_user = cursor.execute('''SELECT * FROM users WHERE id=?''',(user_id,)).fetchone()
    sections = cursor.execute("SELECT id, name FROM sections").fetchall()
    products = cursor.execute("SELECT id, name, price, unit, available_quantity, section_id FROM products").fetchall()
    categories = cursor.execute("SELECT id, name FROM sections").fetchall()

    sections_list = [{
        'id': section[0],
        'name': section[1]
    } for section in sections]
    products_list = [{
        'id': product[0],
        'name': product[1],
        'price': product[2],
        'unit': product[3],
        'available_quantity': product[4],
        'section_id': product[5]
    } for product in products]

    return jsonify(
        current_user=current_user,
        sections=sections_list,
        products=products_list,
        categories=categories
    )


# Add product
@app.route('/store_manager/add_product', methods=['POST'])
@jwt_required()
@store_manager_required
def add_product():
    # Get data from the form
    name = request.form.get('name')
    manufacture_date = request.form.get('manufacture_date')
    expiry_date = request.form.get('expiry_date')
    price = request.form.get('price')
    unit = request.form.get('unit')
    available_quantity = request.form.get('available_quantity')
    section_id = request.form.get('section_id')
    image_file = request.files.get('image')

    # Check if any required data is missing
    if not (name and manufacture_date and expiry_date and price and unit and
            available_quantity and section_id and image_file):
        return jsonify(errorMessage="Missing required data fields.")

    # Check if the name already exists
    cursor = get_db().cursor()
    cursor.execute("SELECT id FROM products WHERE name=?", (name,))
    existing_product = cursor.fetchone()

    if existing_product:
        return jsonify(errorMessage=f"A product with the name '{name}' already exists.")

    # Check if the file has a valid extension
    if image_file and allowed_file(image_file.filename):
        filename = str(uuid.uuid4()) + os.path.splitext(image_file.filename)[1]
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Save the image to the server
        image_file.save(image_path)

        # Insert product into the database
        cursor.execute('''INSERT INTO products (name, manufacture_date, expiry_date, price, unit,
                        available_quantity, section_id, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                       (name, manufacture_date, expiry_date, price, unit, available_quantity, section_id, filename))
        get_db().commit()

        return jsonify(message="Product added successfully")
    else:
        return jsonify(errorMessage="Image extension not allowed")


# Product Management - Edit a product
@app.route('/store_manager/edit_product/<int:product_id>', methods=['GET', 'PUT'])
@jwt_required()
@store_manager_required
def edit_product(product_id):
    cursor = get_db().cursor()

    if request.method == 'GET':
        # Handle GET request to retrieve product data
        cursor.execute("SELECT * FROM products WHERE id=?", (product_id,))
        product = cursor.fetchone()

        if product is None:
            return jsonify(errorMessage="Product not found"), 404

        product_data = {
            "id": product[0],
            "name": product[1],
            "manufacture_date": product[2],
            "expiry_date": product[3],
            "price": product[4],
            "unit": product[5],
            "available_quantity": product[6],
            "section_id": product[7],
            "image": product[8]
        }

        return jsonify(product_data)

    elif request.method == 'PUT':
        # Handle PUT request to update product data
        name = request.form.get('name')
        manufacture_date = request.form.get('manufacture_date')
        expiry_date = request.form.get('expiry_date')
        price = request.form.get('price')
        unit = request.form.get('unit')
        available_quantity = request.form.get('available_quantity')
        section_id = request.form.get('section_id')
        cursor.execute("SELECT name, image FROM products WHERE id=?", (product_id,))
        product = cursor.fetchone()
        filename = product[1]

        # Check if a new image is provided
        image_file = request.files.get('image')

        if image_file:
            if not allowed_file(image_file.filename):
                error_message = "Image extension not allowed."
                return jsonify(errorMessage=error_message)

            # Delete the previous image
            if product[1]:
                previous_image_path = os.path.join(app.config['UPLOAD_FOLDER'], product[1])
                if os.path.exists(previous_image_path):
                    os.remove(previous_image_path)

            # Save the new image
            filename = str(uuid.uuid4()) + os.path.splitext(image_file.filename)[1]
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image_file.save(image_path)

        # Checking if the new name is unique among products
        cursor.execute("SELECT id FROM products WHERE name=? AND id<>?", (name, product_id))
        existing_product = cursor.fetchone()

        if existing_product:
            error_message = "A product with the same name already exists."
            return jsonify(errorMessage=error_message)

        # Update product data in the database
        cursor.execute("UPDATE products SET name=?, manufacture_date=?, expiry_date=?, price=?, unit=?, available_quantity=?, section_id=?, image=? WHERE id=?", (name, manufacture_date, expiry_date, price, unit, available_quantity, section_id, filename, product_id))
        get_db().commit()

        return jsonify(message="Product updated successfully")

    return jsonify(errorMessage="Method not allowed"), 405



# Product Management - Remove a product
@app.route('/store_manager/remove_product/<int:product_id>', methods=['DELETE'])
@jwt_required()
@store_manager_required
def remove_product(product_id):
    cursor = get_db().cursor()
    cursor.execute('''SELECT name, image FROM products WHERE id=?''', (product_id, ))
    product = cursor.fetchone()

    if not product:
        return jsonify(errorMessage="Product not found"), 404

    cursor.execute('''DELETE FROM products WHERE id=?''', (product_id, ))
    get_db().commit()

    if product[1]:
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], product[1])
        if os.path.exists(image_path):
            os.remove(image_path)

    return jsonify(message="Product removed successfully")



# User dashboard
@app.route('/user/dashboard', methods=['GET'])
@jwt_required()  # Authentication using JWT
@user_required  # Authorization
def user_dashboard():
    user_id = get_jwt_identity()  # Get the user ID from JWT
    cursor = get_db().cursor()
    current_user = cursor.execute('''SELECT * FROM users WHERE id=?''',
                                  (user_id,)).fetchone()
    sections = cursor.execute("SELECT * FROM sections").fetchall()
    products = cursor.execute("SELECT * FROM products").fetchall()

    products_by_section = {}
    for section in sections:
        section_id = section[0]
        cursor.execute("SELECT * FROM products WHERE section_id=?",
                       (section_id,))
        products = cursor.fetchall()
        products_by_section[section_id] = products

    user_cartt = cursor.execute("SELECT * FROM user_cart WHERE user_id=?",
                                (user_id,)).fetchall()
    # Return JSON response with user dashboard data and cart-related info
    return jsonify(
        current_user=current_user,
        sections=sections,
        products_by_section=products_by_section,
        user_cartt=user_cartt
    )

# route for search page
@app.route('/user/search', methods=['POST'])
@jwt_required()  # Authentication using JWT
@user_required  # Authorization using custom decorator
@cache.cached(timeout=30)
def search():
    user_id = get_jwt_identity()  # Get the user ID from JWT


    if request.method == 'POST':
        data = request.get_json()
        search_query = data.get('search_query')
        section_results = []
        cursor = get_db().cursor()

        # Search by category name
        cursor.execute("SELECT * FROM sections WHERE name LIKE ?",
                       ('%' + search_query + '%', ))
        sections = cursor.fetchall()

        for section in sections:
            section_id, section_name, section_image = section
            cursor.execute("SELECT * FROM products WHERE section_id = ?",
                           (section_id, ))
            products_in_section = cursor.fetchall()
            if products_in_section:
                section_results.append((section_name, products_in_section))

        # Search by product name or price
        product_results = []
        try:
            min_price = float(search_query)
            cursor.execute("SELECT * FROM products WHERE price >= ?",
                           (min_price, ))
            product_results = cursor.fetchall()
        except ValueError:
            cursor.execute("SELECT * FROM products WHERE name LIKE ?",
                           ('%' + search_query + '%', ))
            product_results = cursor.fetchall()

        user_cartt = cursor.execute("SELECT * FROM user_cart WHERE user_id=?",
                                    (user_id, )).fetchall()

        if cache.get('search_cache_key'):
            app.logger.info('Cache hit for search!')
        else:
            app.logger.info('Cache miss for search!')
            # Simulate a heavy operation for testing purposes
            result = {'message': 'This is the result of the search operation'}
            # Store the result in the cache
            cache.set('search_cache_key', result)

        # Retrieve the result from the cache
        cached_result = cache.get('search_cache_key')

        # Return JSON response with search results and cart-related info
        return jsonify(
            section_results=section_results,
            product_results=product_results,
            user_cartt=user_cartt,
            search_query=search_query, cached_result=cached_result)

# User cart
@app.route('/user/cart', methods=['GET'])
@jwt_required()  # Authentication using JWT
@user_required  # Authorization using custom decorator
def user_cart():
    user_id = get_jwt_identity()  # Get the user ID from JWT
    cursor = get_db().cursor()

    # Retrieve cart items for the user from the database
    cart = '''
            SELECT products.*, user_cart.quantity
            FROM products
            JOIN user_cart ON products.id = user_cart.product_id
            WHERE user_cart.user_id = ?
        '''
    user_cart = cursor.execute(cart, (user_id, )).fetchall()
    product_total = sum(item[4] * item[9] for item in user_cart)
    # Calculate total price
    cart_total = sum(item[4] * item[9] for item in user_cart)

    user_cartt = cursor.execute("SELECT * FROM user_cart WHERE user_id=?",
                                (user_id, )).fetchall()

    # Return JSON response with user cart data
    return jsonify(
        user_cart=user_cart,
        product_total=product_total,
        cart_total=cart_total,
        user_cartt=user_cartt
    )

# Add/update product to the cart
@app.route('/user/add_to_cart', methods=['POST'])
@jwt_required()
@user_required
def add_to_cart():
    user_id = get_jwt_identity()
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity')

    cursor = get_db().cursor()

    # Check if the product is already in the cart
    cart_item = cursor.execute("SELECT * FROM user_cart WHERE user_id=? AND product_id=?", (user_id, product_id)).fetchone()

    if cart_item:
        # Product already exists in the cart, update the quantity
        cart_quantity = int(quantity)
        cursor.execute("UPDATE user_cart SET quantity=? WHERE user_id=? AND product_id=?", (cart_quantity, user_id, product_id))
    else:
        # Product is not in the cart, insert a new item
        cursor.execute("INSERT INTO user_cart (user_id, product_id, quantity) VALUES (?, ?, ?)", (user_id, product_id, quantity))

    get_db().commit()

    return jsonify(message="Product added to cart successfully")

# Remove product from the cart
@app.route('/user/remove_from_cart', methods=['DELETE'])
@jwt_required()  # Authentication using JWT
@user_required  # Authorization using custom decorator
def remove_from_cart():
    user_id = get_jwt_identity()  # Get the user ID from JWT
    data = request.get_json()
    product_id = data.get('product_id')
    cursor = get_db().cursor()

    # Remove the item from the user's cart in the database
    cursor.execute('DELETE FROM user_cart WHERE user_id=? AND product_id=?',
                   (user_id, product_id))
    get_db().commit()

    # Return a success JSON response
    return jsonify(message="Product removed from cart successfully")



@app.route('/user/checkout', methods=['POST'])
@jwt_required()
@user_required
def checkout():
    user_id = get_jwt_identity()
    cursor = get_db().cursor()

    # Fetch user's cart items
    cursor.execute('''SELECT p.id, p.name, p.price, p.unit, p.available_quantity, c.quantity
            FROM products AS p
            JOIN user_cart AS c ON p.id = c.product_id
            WHERE c.user_id=?''', (user_id, ))
    user_cart_items = cursor.fetchall()

    if not user_cart_items:
        return jsonify(error="Cart is empty")

    conn = get_db()
    cursor = conn.cursor()

    # Create a shopping history entry
    order_id = str(uuid.uuid4())
    purchase_date = datetime.now(pytz.timezone('Asia/Kolkata')).strftime('%d-%m-%Y %H:%M')

    for cart_item in user_cart_items:
        product_id, requested_quantity, available_quantity, product_name, price, unit = cart_item[0], cart_item[5], cart_item[4], cart_item[1], cart_item[2], cart_item[3]

        if requested_quantity > available_quantity:
            # Remove the item from the cart
            cursor.execute("DELETE FROM user_cart WHERE user_id=? AND product_id=?", (user_id, product_id))
        else:
            cursor.execute(
                "INSERT INTO shopping_history (order_id, user_id, product_id, product_name, price, unit, quantity, purchase_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (order_id, user_id, product_id, product_name, price, unit, requested_quantity, purchase_date))

            # Update product's available quantity
            new_available_quantity = available_quantity - requested_quantity
            cursor.execute("UPDATE products SET available_quantity=? WHERE id=?", (new_available_quantity, product_id))

    # Commit changes
    conn.commit()

    # Clear user's cart
    cursor.execute("DELETE FROM user_cart WHERE user_id=?", (user_id,))
    conn.commit()

    return jsonify(message="Checkout successful")


# Route for thanks page
@app.route('/user/thanks')
@jwt_required()
@user_required
def thanks():
    return jsonify(message="Welcome to the thanks page")

# Route to show user's history
@app.route('/user/history')
@jwt_required()
@user_required
def purchase_history():
    user_id = get_jwt_identity()
    cursor = get_db().cursor()
    history_query = '''
        SELECT shopping_history.order_id,
               shopping_history.purchase_date,
               shopping_history.product_name,
               shopping_history.quantity,
               shopping_history.price, shopping_history.unit
        FROM shopping_history
        WHERE shopping_history.user_id = ?
    '''
    user_history = cursor.execute(history_query, (user_id,)).fetchall()

    # Organize user_history by order_id
    order_history = {}
    for row in user_history:
        order_id = row[0]
        if order_id not in order_history:
            order_history[order_id] = []
        order_history[order_id].append(row)

    # Calculate order_total for each order
    for order_id, items in order_history.items():
        order_total = sum(item[3] * item[4] for item in items)
        order_history[order_id] = (order_history[order_id], order_total)

    return jsonify(order_history=order_history)


if __name__ == '__main__':
  app.run(debug=True)
  celery.worker_main(['worker', '--beat', '-l', 'info'])
