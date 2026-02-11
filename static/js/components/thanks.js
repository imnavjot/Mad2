import store from '../main.js';
import { logout } from './logout.js';

const Thanks = Vue.component("thanks", {
  template: `
    <div>
      <!-- Navigation bar -->
      <nav class="navbar navbar-expand-lg navbar-light bg-light sticky-top">
        <div class="container">
          <a class="navbar-brand">Grocery Store</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
            <ul class="navbar-nav ml-auto">
              <li class="nav-item">
                <router-link to="/user/dashboard" class="nav-link">Home</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/user/search" class="nav-link">🔍</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/user/history" class="nav-link">History</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/user/cart" class="nav-link">Cart</router-link>
              </li>
              <li class="nav-item">
                <button @click="logoutAndRedirect" class="btn btn-secondary ml-auto">Log Out</button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div class="container mt-2">
        <br>
          <div class="text-center">
              <h1>Thanks for Shopping!</h1>
              <p>Your purchase was successful.</p>
              <router-link to="/user/dashboard" class="btn btn-primary">Go to Home</router-link>
          </div>
      </div>
    </div>
  `,
  methods: {
    logoutAndRedirect() {
      logout(this.$router); // Call the logout function
    },
  },
});

export default Thanks;
