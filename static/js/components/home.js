const Home = Vue.component("home", {
  template: `
    <div class="container mt-5">
      <h2>Welcome to Grocery Store</h2>
      <div class="row">
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">User Registration</h5>
              <p class="card-text">Sign up as a new user.</p>
              <router-link to="/user/signup" class="btn btn-primary">Register</router-link>
            </div>
          </div>
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">User Login</h5>
              <p class="card-text">Already have an account? Log in here.</p>
              <router-link to="/user/login" class="btn btn-primary">Login</router-link>
            </div>
          </div>
          <div class="mb-3">
              <router-link to="/admin/login" class="btn btn-info">Admin Login</router-link>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">Store Manager Registration</h5>
              <p class="card-text">Register as a store manager.</p>
              <router-link to="/store_manager/signup" class="btn btn-primary">Register</router-link>
            </div>
          </div>
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">Store Manager Login</h5>
              <p class="card-text">Already a store manager? Log in here.</p>
              <router-link to="/store_manager/login" class="btn btn-primary">Login</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
});

export default Home;
