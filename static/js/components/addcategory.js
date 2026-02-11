import store from '../main.js';

const AddCategory = Vue.component("addcategory", {
  template: `
    <div>
      <!-- Navigation Bar -->
      <nav class="navbar navbar-light bg-light sticky-top">
        <div class="container">
          <a class="navbar-brand">Grocery Store - Add Category</a>
          <router-link to="/admin/dashboard" class="btn btn-secondary ml-auto">Home</router-link>
        </div>
      </nav>

      <!-- Add Category Form -->
      <div class="container mt-2">
        <br>
        <h2>Add New Category</h2>
        <form @submit.prevent="addCategory">
          <div class="form-group">
            <label for="name">Category Name:</label>
            <input v-model="categoryName" type="text" class="form-control" id="name" name="name" required>
          </div>
          <div v-if="error_message" class="alert alert-danger mt-2" role="alert">
            {{ error_message }}
          </div>
          <div class="form-group mt-4">
            <label for="image">Category Image</label>
            <input type="file" class="form-control-file" id="image" ref="imageInput" accept="image/*" required>
          </div>
          <button type="submit" class="btn btn-primary mt-4">Add Category</button>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      categoryName: '',
      error_message: '',
    };
  },
  methods: {
    addCategory() {
      // Get the category name and image file
      const name = this.categoryName;
      const imageFile = this.$refs.imageInput.files[0];

      // Create a FormData object to send to the API
      const formData = new FormData();
      formData.append('name', name);
      formData.append('image', imageFile);

      // API request to add the category
      fetch('/admin/add_category', {
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
            this.error_message = data.errorMessage;
          } else {
            this.$router.push('/admin/dashboard');
          }
        })
        .catch((error) => {
          console.error('Error adding category:', error);
     });
    },
  },
});

export default AddCategory;
