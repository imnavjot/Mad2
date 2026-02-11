// UserSignup.js
const SmSignup = Vue.component("smsignup", {
  template: `
    <div>
      <nav class="navbar navbar-light bg-light sticky-top">
        <div class="container">
          <a class="navbar-brand">Grocery Store</a>
          <router-link to="/" class="btn btn-secondary ml-auto">Home</router-link>
        </div>
      </nav>
      <div class="container d-flex justify-content-center align-items-center vh-100">
        <div class="card p-4">
          <h2 class="card-title mb-4">Store Manager Sign Up</h2>
          <form @submit.prevent="store_manager_signup">
            <div class="form-group">
              <label for="email">Email</label>
              <input v-model="email" type="email" class="form-control" id="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input v-model="password" type="password" class="form-control" id="password" required>
            </div>
            <button type="submit" class="mt-2 btn btn-primary">Sign Up</button>
          </form>
          <div v-if="successMessage" class="alert alert-success mt-2" role="alert">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="alert alert-danger mt-2" role="alert">
            {{ errorMessage }}
          </div>
          <p class="mt-3">Already have an account? <router-link to="/store_manager/login">Login</router-link></p>
          <p class="mb-0">Admin? <router-link to="/admin/login">Admin Login</router-link></p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      email: '',
      password: '',
      successMessage: '',
      errorMessage: '',
    };
  },
  methods: {
    store_manager_signup() {
      // fetch API request to register the user with this.email and this.password
      fetch('/store_manager/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: this.email, password: this.password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.successMessage) {
            this.successMessage = data.successMessage;
            this.errorMessage = '';
          } else {
            this.successMessage = '';
            this.errorMessage = data.errorMessage;
          }
        })
        .catch((error) => {
          this.successMessage = '';
          this.errorMessage = `Error: ${error.message}`;
        });
    },
  },
});

export default SmSignup;
