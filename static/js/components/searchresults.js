import store from '../main.js';
import { logout } from './logout.js';
import ProductCard from './productcard.js';

const SearchResults = Vue.component("searchresults", {
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
        <h2>Search</h2>
        <hr>
        <form @submit.prevent="search" class="mb-3">
          <div class="input-group">
            <input type="text" class="form-control" v-model="searchQuery" placeholder="Search for categories, products, or price range" required>
            <div class="input-group-append">
              <button class="btn btn-primary" type="submit">Search</button>
            </div>
          </div>
        </form>
        <hr>
        <h3>Results for : {{ searchQuery }}</h3>
        <hr>
        <!-- Display section results -->
        <div v-if="sectionResults.length > 0">
          <h4>Categories</h4>
              <div v-for="section in sectionResults" :key="section[0]">
                <h5>{{ section[0] }}</h5>
                <div class="horizontal-scroll-container">
                    <div v-for="product in section[1]" :key="product[0]">
                      <product-card :product="product"></product-card>
                  </div>
                </div>
           </div>
        </div>
        <!-- Display product results -->
        <div v-if="productResults.length > 0">
          <h4>Products</h4>
          <div class="row">
            <div v-for="product in productResults" :key="product[0]" class="col-md-3">
              <product-card :product="product" class="mb-4"></product-card>
            </div>
          </div>
        </div>
        <p v-if="searchButtonClicked && sectionResults.length === 0 && productResults.length === 0">
          No results found
        </p>
        <p v-else-if="searchQuery.trim() === ''">
          Type to search
        </p>
      </div>
   </div>
 `,
 components: {
   'product-card': ProductCard,
 },
 data() {
   return {
     searchQuery: '',
     sectionResults: [],
     productResults: [],
     searchButtonClicked: false,
   };
 },
 methods: {
   logoutAndRedirect() {
     logout(this.$router); // Call the logout function
   },
   search() {
     this.searchButtonClicked = true;
     // Make an API request to the /user/search route
     fetch('/user/search', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${store.state.access_token}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({ search_query: this.searchQuery }),
     })
       .then(response => {
         if (response.ok) {
           return response.json();
         } else {
           throw new Error('Error fetching search results');
         }
       })
       .then(data => {
         // Handle the response data and update the sectionResults and productResults
         this.sectionResults = data.section_results;
         this.productResults = data.product_results;
       })
       .catch(error => {
         console.error(error);
       });
   },
 },
});

export default SearchResults;
