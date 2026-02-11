import store from '../main.js';
import { logout } from './logout.js';
import ProductCard from './productcard.js';

const UserDashboard = Vue.component("userdashboard", {
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
        <h2>Welcome, <span v-if="current_user[1]">{{ current_user[1].split('@')[0] }}</span></h2>
        <hr>
        <h3>All Categories</h3>
        <div class="horizontal-scroll-container">
          <div v-for="section in sections" :key="section[0]" v-if="products_by_section[section[0]] && products_by_section[section[0]].length > 0" class="card" style="width: 250px; display: inline-block; margin: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative;" @click="scrollToCategory(section[0])">
            <img :src="'static/images/' + section[2]" :alt="section[2]" class="card-img-top section-image" style="height: 300px;">
            <div class="card-body">
              <h4 class="card-title">{{ section[1] }}</h4>
            </div>
          </div>
        </div>
        <hr>

        <!-- Products by section -->
        <div v-for="section in sections" :key="section[0]" v-if="products_by_section[section[0]] && products_by_section[section[0]].length > 0">
          <a :id="'section-' + section[0]"></a>
          <h3>{{ section[1] }}</h3>
          <div class="horizontal-scroll-container">
            <div v-if="products_by_section[section[0]]">
              <product-card v-for="product in products_by_section[section[0]]" :key="product[0]" :product="product"></product-card>
            </div>
          </div>
          <hr>
        </div>
      </div>
    </div>
  `,
  components: {
    'product-card': ProductCard,
  },
  data() {
    return {
      current_user: {}, // Your user data
      sections: [], // Your list of sections
      products_by_section: {}, // Your products grouped by section
    };
  },
  methods: {
    logoutAndRedirect() {
      logout(this.$router); // Call the logout function
    },
    scrollToCategory(sectionId) {
      // Find the element to scroll to based on the sectionId
      const sectionElement = document.getElementById(`section-${sectionId}`);
      const scrollPosition = sectionElement.offsetTop - (sectionElement.innerHeight / 2);

      // Scroll to the section using smooth behavior
      if (sectionElement) {
        sectionElement.scrollIntoView({ top: scrollPosition, behavior: "smooth" });
      }
    },
  },
  created() {
    // Fetch user dashboard data when the component is created
    fetch('/user/dashboard', {
      headers: {
        'Authorization': `Bearer ${store.state.access_token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        this.current_user = data.current_user;
        this.sections = data.sections;
        this.products_by_section = data.products_by_section;
      })
      .catch(error => {
        console.error('Error fetching user dashboard data:', error);
      });
  },
});

export default UserDashboard;
