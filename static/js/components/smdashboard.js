import store from '../main.js';
import { logout } from './logout.js';

const StoreManagerDashboard = Vue.component("smdashboard", {
  template: `
    <div>
      <nav class="navbar navbar-light bg-light sticky-top">
        <div class="container">
          <a class="navbar-brand">Grocery Store - SM Dashboard</a>
          <button @click="logoutAndRedirect" class="btn btn-secondary ml-auto">Log Out</button>
        </div>
      </nav>
      <div class="container mt-2">
        <br>
        <h2>Welcome, <span v-if="current_user[1]">{{ current_user[1].split('@')[0] }}</span></h2>
        <hr>

        <h3>Product Management:</h3>
        <router-link to="/store_manager/add_product" class="btn btn-primary">Add New Product</router-link>
        <br><br>
        <div class="table-responsive">
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Price</th>
              <th>Unit</th>
              <th>Available Quantity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id">
              <td>{{ product.name }}</td>
              <td>{{ product.price }}</td>
              <td>{{ product.unit }}</td>
              <td>{{ product.available_quantity }}</td>
              <td>
                <router-link :to="'/store_manager/edit_product/' + product.id" class="btn btn-warning my-1">Edit</router-link>
                <button @click="removeProduct(product.id)" class="btn btn-danger my-1">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        <button @click="exportCSV" class="btn btn-primary">Export CSV</button>
        <p>{{ exportMessage }}</p>
        <hr>
        <!-- Category Request Section -->
        <div>
          <h3>Category Requests:</h3>
          <router-link to="/store_manager/add_category_request" class="btn btn-primary">Add New Category Request</router-link>
          <br><br>
          <table class="table table-bordered">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="category in categories" :key="category[0]">
                <td>{{ category[1] }}</td>
                <td>
                  <router-link :to="'/store_manager/edit_category_request/' + category[0]" class="btn btn-warning my-1">Edit Request</router-link>
                  <button @click="requestCategoryRemoval(category[0])" class="btn btn-danger">Remove Request</button>
                </td>
              </tr>
            </tbody>
          </table>
          <br>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      current_user: {},
      products: [],
      categoryName: '',
      categoryRequestType: '',
      selectedCategoryId: null,
      categories: [],
      selectedImage: null,
      formData: null,
      exportMessage: '',
    };
  },
  mounted() {
    this.loadProducts();
  },
  methods: {
    loadProducts() {
      // Make an API request to fetch products data using fetch
      fetch('/store_manager/dashboard', {
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          this.current_user = data.current_user;
          this.products = data.products;
          this.categories = data.categories;
        })
        .catch((error) => {
          console.error('Error loading products:', error);
        });
    },
    removeProduct(productId) {
      if (confirm('Are you sure you want to remove this product?')) {
        // Make an API request to remove the product by productId using fetch
        fetch(`/store_manager/remove_product/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${store.state.access_token}`,
            'Content-Type': 'application/json',
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Reload the products after successfully removing the product
            this.loadProducts();
          })
          .catch((error) => {
            console.error('Error removing product:', error);
          });
      }
    },

    // Add a method to request category removal
    requestCategoryRemoval(categoryId) {
      if (confirm('Are you sure you want to send request to remove this Category?')) {
        // Make an API request to request category removal
        fetch(`/store_manager/remove_category_request/${categoryId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${store.state.access_token}`,
            'Content-Type': 'application/json', // Set the content type
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Optionally, you can show a success message or handle the response.
            // Reload the categories after successfully requesting removal
            this.loadProducts();
          })
          .catch((error) => {
            console.error('Error requesting category removal:', error);
          });
      }
    },
    exportCSV() {
      this.exportMessage = 'Exporting CSV. Please wait...';

      // Make an API request to trigger the CSV export task
      fetch('/export_csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          // Optionally, you can show a success message or handle the response.
          this.exportMessage = 'CSV export request sent. You will receive an email when the export is ready.';
        })
        .catch((error) => {
          console.error('Error exporting CSV:', error);
        });
    },
    logoutAndRedirect() {
      logout(this.$router); // Call the logout function
    },
  },
});

export default StoreManagerDashboard;
