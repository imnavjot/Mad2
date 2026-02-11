import store from '../main.js';

const EditCategory = Vue.component("editcategory", {
  props: ["category_id"],
  template: `
    <div>
      <!-- Navigation Bar -->
      <nav class="navbar navbar-light bg-light sticky-top">
        <div class="container">
          <a class="navbar-brand">Grocery Store - Edit Category</a>
          <router-link to="/admin/dashboard" class="btn btn-secondary ml-auto">Home</router-link>
        </div>
      </nav>

      <!-- Edit Category Form -->
      <div class="container mt-2">
        <br>
        <h2>Edit Category</h2>
        <form @submit.prevent="editCategory" enctype="multipart/form-data">
          <div class="form-group">
            <label for="name">Category Name:</label>
            <input v-model="categoryName" type="text" class="form-control" id="name" name="name" required>
          </div>
          <div class="form-group mt-3">
            <label>Existing Image:</label>
            <img v-if="categoryImage" :src="categoryImage" alt="Category Image" class="img-thumbnail" style="max-width: 200px;">
            <p v-else>No image available</p>
          </div>
          <div class="form-group mt-3">
            <label for="image">Change Image:</label>
            <input type="file" class="form-control-file" id="image" ref="imageInput" accept="image/*">
          </div>
          <div v-if="error_message" class="alert alert-danger mt-3" role="alert">
            {{ error_message }}
          </div>
          <button type="submit" class="btn btn-primary mt-3">Save Changes</button>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      categoryName: '',
      categoryImage: '',
      error_message: '',
    };
  },
  methods: {
    editCategory() {
      console.log('Editing category with ID:', this.category_id);
      // Get the category name and image file
      const name = this.categoryName;
      const imageFile = this.$refs.imageInput.files[0];

      // Create a FormData object to send to the API
      const formData = new FormData();
      formData.append('name', name);
      formData.append('image', imageFile);

      // API request to edit the category
      fetch(`/admin/edit_category/${this.category_id}`, {
        method: 'PUT',
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
          console.error('Error editing category:', error);
        });
    },
  },
  created() {
    // Initialize category data by fetching it from the server
    console.log('EditCategory component created.');
    console.log('Category ID from route:', this.category_id);

    // Make an HTTP request to fetch category data based on this.category_id
    fetch(`/admin/edit_category/${this.category_id}`, {
      method: 'GET', // Use the GET method to fetch category data
      headers: {
        'Authorization': `Bearer ${store.state.access_token}`, // Include your authorization token
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
        console.log('Fetched data:', data);
        this.categoryName = data.name; // Pre-fill category name
        this.categoryImage = `/static/images/${data.image}`;
      })
      .catch((error) => {
        console.error('Error fetching category data:', error);
      });
  },
});

export default EditCategory;
