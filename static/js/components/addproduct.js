import store from '../main.js';

const AddProduct = Vue.component("addproduct", {
  template: `
    <div>
      <!-- Navigation Bar -->
      <nav class="navbar navbar-light bg-light sticky-top">
        <div class="container">
          <a class="navbar-brand">Grocery Store - Add Product</a>
          <router-link to="/store_manager/dashboard" class="btn btn-secondary ml-auto">Home</router-link>
        </div>
      </nav>

      <!-- Add Product Form -->
      <div class="container mt-2">
        <br>
        <h2>Add New Product</h2>
        <form @submit.prevent="addProduct">
          <div class="form-group">
            <label for="name">Product Name:</label>
            <input v-model="productName" type="text" class="form-control" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="manufacture_date">Manufacture Date:</label>
            <input v-model="manufactureDate" type="date" class="form-control" id="manufacture_date" name="manufacture_date">
          </div>
          <div class="form-group">
            <label for="expiry_date">Expiry Date:</label>
            <input v-model="expiryDate" type="date" class="form-control" id="expiry_date" name="expiry_date">
          </div>
          <div class="form-group">
            <label for="price">Price:</label>
            <input v-model="price" type="number" class="form-control" id="price" name="price" step="0.01" required>
          </div>
          <div class="form-group">
            <label for="unit">Unit:</label>
            <input v-model="unit" type="text" class="form-control" id="unit" name="unit" required>
          </div>
          <div class="form-group">
            <label for="available_quantity">Available Quantity:</label>
            <input v-model="availableQuantity" type="number" class="form-control" id="available_quantity" name="available_quantity" required>
          </div>
          <div class="form-group">
            <label for="section_id">Category:</label>
            <select v-model="sectionId" class="form-control" id="section_id" name="section_id" required>
              <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.name }}</option>
            </select>
          </div>
          <div class="form-group mt-4">
            <label for="image">Product Image</label>
            <input type="file" class="form-control-file" id="image" ref="imageInput" accept="image/*" required>
          </div>
          <button type="submit" class="btn btn-primary mt-3 mb-3">Add Product</button>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      productName: '',
      manufactureDate: '',
      expiryDate: '',
      price: '',
      unit: '',
      availableQuantity: '',
      sectionId: '',
      sections: [],
    };
  },
  methods: {
    addProduct() {
      // Get product data and image file
      const name = this.productName;
      const manufactureDate = this.manufactureDate;
      const expiryDate = this.expiryDate;
      const price = this.price;
      const unit = this.unit;
      const availableQuantity = this.availableQuantity;
      const sectionId = this.sectionId;
      const imageFile = this.$refs.imageInput.files[0];

      // Create FormData to send to the API
      const formData = new FormData();
      formData.append('name', name);
      formData.append('manufacture_date', manufactureDate);
      formData.append('expiry_date', expiryDate);
      formData.append('price', price);
      formData.append('unit', unit);
      formData.append('available_quantity', availableQuantity);
      formData.append('section_id', sectionId);
      formData.append('image', imageFile);

      // API request to add the product
      fetch('/store_manager/add_product', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
        },
        body: formData, // Use FormData for file upload
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data.errorMessage) {
            // Handle error message
          } else {
            this.$router.push('/store_manager/dashboard');
          }
        })
        .catch((error) => {
          console.error('Error adding product:', error);
        });
    },
    // Fetch the list of categories (sections) when the component is mounted
    loadSections() {
      fetch('/store_manager/dashboard', {
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((data) => {
          this.sections = data.sections;
        })
        .catch((error) => {
          console.error('Error loading sections:', error);
        });
    },
  },
  mounted() {
    // Load the list of categories (sections)
    this.loadSections();
  },
});

export default AddProduct;
