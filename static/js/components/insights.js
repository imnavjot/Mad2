import store from '../main.js';
import { logout } from './logout.js';

const Insights = Vue.component("insights", {
  template: `
  <div>
    <nav class="navbar navbar-light bg-light sticky-top">
      <div class="container">
        <a class="navbar-brand">Grocery Store - Admin Dashboard</a>
        <router-link to="/admin/dashboard" class="btn btn-secondary ml-auto">Home</router-link>
      </div>
    </nav>
    <div class="container mt-2">
      <br>
      <h2>Admin Insights</h2>
      <div class="row mt-4">
          <div class="col-md-6">
              <div class="card">
                  <div class="card-body">
                      <h4 class="card-title">Products with Low Quantity</h4>
                      <ul class="list-group">
                        <li v-for="product in lowQuantityProducts" :key="product[0]">
                          {{ product[0] }} (Available Quantity: {{ product[1] }})
                        </li>
                      </ul>
                      </div>
                  </div>
              </div>
              <div class="col-md-6">
                  <div class="card">
                      <div class="card-body">
                          <h4 class="card-title">Registered Users Count</h4>
                            <p>{{ registeredUsersCount }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h4 class="card-title">Most Sold Products</h4>
                                <img :src="mostSoldChart" alt="Most Sold Products Chart" class="img-fluid">
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h4 class="card-title">Expired Products</h4>
                                <ul class="list-group">
                                    <li v-for="product in expiredProducts" :key="product[0]">
                                        {{ product[0] }} (Expired: {{ product[1] }})
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <br><br>
                </div>
                </div>
  `,
  data() {
    return {
      lowQuantityProducts: [],
      expiredProducts: [],
      registeredUsersCount: 0,
      mostSoldChart: '',
    };
  },
  methods: {
    fetchInsightsData() {
      // Fetch data from the Flask API
      fetch('/admin/insights', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(data => {
          this.lowQuantityProducts = data.low_quantity_products;
          this.expiredProducts = data.expired_products;
          this.registeredUsersCount = data.registered_users_count;
          this.mostSoldChart = data.most_sold_chart_path; // Updated key
        })
        .catch(error => {
          console.error('Error fetching insights data:', error);
        });
    },
  },
  created() {
    this.fetchInsightsData();
  },
});

export default Insights;
