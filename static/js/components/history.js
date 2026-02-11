import store from '../main.js';
import { logout } from './logout.js';

const History = Vue.component("history", {
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
        <h2>Purchase History</h2>
        <div class="table-responsive">
        <table class="table table-bordered">
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
            <tr v-for="(orderData, orderID) in orderHistory" :key="orderID">
              <td>{{ orderID }}</td>
              <td>{{ orderData[0][0][1] }}</td>
              <td>
                <span v-for="(item, itemIndex) in orderData[0]" :key="itemIndex">
                  {{ item[2] }} - {{ item[4] }} {{ item[5] }}
                  <br v-if="itemIndex < orderData[0].length - 1">
                </span>
              </td>
              <td>
                <span v-for="(item, itemIndex) in orderData[0]" :key="itemIndex">
                  {{ item[3] }}
                  <br v-if="itemIndex < orderData[0].length - 1">
                </span>
              </td>
              <td>{{ orderData[1] }}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      orderHistory: [],
    };
  },
  methods: {
    logoutAndRedirect() {
      logout(this.$router); // Call the logout function
    },
  },
  mounted() {
    // Make an HTTP request using fetch
    fetch('/user/history', {
      headers: {
        'Authorization': `Bearer ${store.state.access_token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        this.orderHistory = data.order_history;
      })
      .catch(error => {
        console.error('Error fetching purchase history: ', error);
      });
  },
});

export default History;
