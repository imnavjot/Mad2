// UserLogin.js
const SmLogin = Vue.component("smlogin", {
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
          <h2 class="card-title mb-4">Strore Manager Login</h2>
          <form @submit.prevent="store_manager_login">
            <div class="form-group">
              <label for="email">Email</label>
              <input v-model="email" type="email" class="form-control" id="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input v-model="password" type="password" class="form-control" id="password" required>
            </div>
            <button type="submit" class="mt-2 btn btn-primary">Login</button>
          </form>
          <div v-if="errorMessage" class="alert alert-danger mt-2" role="alert">
            {{ errorMessage }}
          </div>
          <p class="mt-3">Don't have an account? <router-link to="/store_manager/signup">Sign Up</router-link></p>
          <p class="mb-0">Admin? <router-link to="/admin/login">Admin Login</router-link></p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      email: '',
      password: '',
      errorMessage: '',
    };
  },
  methods: {
    store_manager_login() {
      // Make a fetch API request to log in the user with this.email and this.password
      fetch('/store_manager/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: this.email, password: this.password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.successMessage) {
            // Redirect to /user/dashboard on successful login
            const access_token = data.access_token; // Extract the access token from the response
            const user_type = data.user_type;
            this.$store.dispatch('setAccessToken', access_token);
            this.$store.dispatch('setUserType', user_type);
            this.$router.push('/store_manager/dashboard');
          } else {
            this.errorMessage = data.errorMessage;
          }
        })
        .catch((error) => {
          this.errorMessage = `Error: ${error.message}`;
        });
    },
  },
});

export default SmLogin;
