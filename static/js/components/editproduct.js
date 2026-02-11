import store from '../main.js';

const EditProduct = Vue.component("editproduct", {
  props: ["product_id"],
  template: `
    <div>
      <!-- Navigation Bar -->
      <nav class="navbar navbar-light bg-light sticky-top">
        <div class="container">
          <a class="navbar-brand">Admin Dashboard - Edit Product</a>
          <router-link to="/store_manager/dashboard" class="btn btn-secondary ml-auto">Home</router-link>
        </div>
      </nav>

      <!-- Edit Product Form -->
      <div class="container mt-2">
        <br>
        <h2>Edit Product</h2>
        <form @submit.prevent="editProduct" enctype="multipart/form-data">
          <div class="form-group">
            <label for="name">Product Name</label>
            <input v-model="productName" type="text" class="form-control" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="manufacture_date">Manufacture Date</label>
            <input v-model="manufactureDate" type="date" class="form-control" id="manufacture_date" name="manufacture_date" required>
          </div>
          <div class="form-group">
            <label for="expiry_date">Expiry Date</label>
            <input v-model="expiryDate" type="date" class="form-control" id="expiry_date" name="expiry_date" required>
          </div>
          <div class="form-group">
            <label for="price">Price</label>
            <input v-model="price" type="number" class="form-control" id="price" name="price" step="0.01" min="0" required>
          </div>
          <div class="form-group">
            <label for="unit">Unit (e.g., Rs/Kg, Rs/Litre, etc.)</label>
            <input v-model="unit" type="text" class="form-control" id="unit" name="unit" required>
          </div>
          <div class="form-group">
            <label for="available_quantity">Available Quantity</label>
            <input v-model="availableQuantity" type="number" class="form-control" id="available_quantity" name="available_quantity" min="0" required>
          </div>
          <div class="form-group">
            <label for="section_id">Category</label>
            <select v-model="sectionId" class="form-control" id="section_id" name="section_id" required>
              <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.name }}</option>
            </select>
          </div>
          <div class="form-group mt-3">
            <label>Existing Image:</label>
            <img v-if="productImage" :src="productImage" alt="Product Image" class="img-thumbnail" style="max-width: 200px;">
            <p v-else>No image available</p>
          </div>
          <div class="form-group mt-3">
            <label for="image">Product Image</label>
            <input type="file" class="form-control-file" id="image" ref="imageInput">
          </div>
          <div v-if="error_message" class="alert alert-danger mt-3" role="alert">
            {{ error_message }}
          </div>
          <button type="submit" class="btn btn-primary mt-3 mb-3">Save Changes</button>
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
      productImage: '', // To display the existing product image
      sections: [], // To populate the category list
      error_message: '',
    };
  },
  methods: {
    editProduct() {
      const name = this.productName;
      const manufacture_date = this.manufactureDate;
      const expiry_date = this.expiryDate;
      const price = this.price;
      const unit = this.unit;
      const available_quantity = this.availableQuantity;
      const section_id = this.sectionId;
      const imageFile = this.$refs.imageInput.files[0];

      const formData = new FormData();
      formData.append("name", name);
      formData.append("manufacture_date", manufacture_date);
      formData.append("expiry_date", expiry_date);
      formData.append("price", price);
      formData.append("unit", unit);
      formData.append("available_quantity", available_quantity);
      formData.append("section_id", section_id);
      formData.append("image", imageFile);

      fetch(`/store_manager/edit_product/${this.product_id}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
        },
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data.errorMessage) {
            this.error_message = data.errorMessage;
          } else {
            this.$router.push("/store_manager/dashboard");
          }
        })
        .catch((error) => {
          console.error("Error editing product:", error);
        });
    },
    fetchData() {
      // Fetch product data based on this.product_id
      fetch(`/store_manager/edit_product/${this.product_id}`, {
        method: "GET",
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
          // Populate the component's data properties with the fetched data
          this.productName = data.name;
          this.manufactureDate = data.manufacture_date;
          this.expiryDate = data.expiry_date;
          this.price = data.price;
          this.unit = data.unit;
          this.availableQuantity = data.available_quantity;
          this.sectionId = data.section_id;
          this.productImage = `/static/images/${data.image}`; // Display existing product image
        })
        .catch((error) => {
          console.error("Error fetching product data:", error);
        });
    },
    loadSections() {
      // Fetch the list of categories (sections) and populate the sections array
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
          this.sections = data.sections; // Populate "sections" with category data
        })
        .catch((error) => {
          console.error('Error loading sections:', error);
        });
    },
  },
  created() {
    // Fetch data when the component is created
    this.fetchData();
    // Load the list of categories (sections)
    this.loadSections();
  },
});

export default EditProduct;
