import store from '../main.js';
import { logout } from './logout.js';

const Cart = Vue.component("cart", {
  template: `
  <div>
    <!-- Navigation bar -->
    <nav class="navbar navbar-expand-lg navbar-light bg-light sticky-top">
      <div class="container">
        <a class="navbar-brand">Grocery Store</a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
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
              <button @click="logoutAndRedirect" class="btn btn-secondary ml-auto">
                Log Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <div class="container mt-2">
      <br>
      <h2>Your Cart</h2>
      <hr>
      <div class="table-responsive">
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price per Unit</th>
            <th>Quantity</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in user_cart" :key="item[0]">
            <td>{{ item[1] }}</td>
            <td>{{ item[4] }} {{ item[5] }}</td>
            <td>
              <form @submit.prevent="addToCart(item)" class="d-flex">
                <input type="hidden" name="product_id" :value="item[0]">
                <input
                  type="number"
                  class="form-control"
                  v-model="item.quantity"
                  min="1"
                  :max="item[6]"
                  style="min-width: 60px; max-width: 100px; margin-right: 10px;"
                  required
                >
                <button
                  class="btn btn-primary"
                  type="submit"
                  :disabled="item[6] === 0 || new Date(item[3]) < new Date()"
                >
                  {{ item[6] === 0 || new Date(item[3]) < new Date() ? 'No Stock' : 'Add' }}
                </button>
              </form>
            </td>
            <td>{{ item[4] * item[9] }} Rs</td>
            <td>
              <form @submit.prevent="removeFromCart(item)">
                <input type="hidden" name="product_id" :value="item[0]">
                <button class="btn btn-danger">Remove</button>
              </form>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <h3>Total: {{ cartTotal }} Rs</h3>
      <form @submit.prevent="checkout">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="cartTotal === 0"
        >
          Checkout
        </button>
      </form>
    </div>
  </div>
  `,
  data() {
    return {
      user_cart: [],
      isCheckingOut: false,
    };
  },
  computed: {
    cartTotal() {
      // Ensure user_cart is defined and not null
      if (this.user_cart) {
        return this.user_cart.reduce(
          (total, item) => total + item[4] * item.quantity,
          0
        );
      }
      return 0;
    },
  },
  methods: {
    addToCart(item) {
      // Make a POST request to add the product to the cart
      const data = {
        product_id: item[0], // Use the correct product ID
        quantity: item.quantity, // Use the quantity from the component's data
      };
      console.log('Adding to cart with quantity:', item.quantity);
      fetch('/user/add_to_cart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
        .then(response => {
          if (response.ok) {
            // Product added successfully, you can update the UI or show a message
            this.fetchUserCart(); // Fetch the updated cart data
          } else {
            console.error('Error adding product to cart:', response.statusText);
          }
        })
        .catch(error => {
          console.error('Error adding product to cart:', error);
        });
    },
    fetchUserCart(item) {
      // Fetch the user's cart data
      fetch('/user/cart', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(data => {
          this.user_cart = data.user_cart;
          this.user_cart.forEach(item => { item.quantity = item[9]; });
          console.log('Fetched user cart data:', this.user_cart);
        })
        .catch(error => {
          console.error('Error fetching user cart:', error);
        });
    },
    removeFromCart(item) {
    // Make a DELETE request to remove the product from the cart
    const data = {
      product_id: item[0], // Use the correct product ID
    };
    fetch('/user/remove_from_cart', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${store.state.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then(response => {
        if (response.ok) {
          this.fetchUserCart(); // Fetch the updated cart data
        } else {
          console.error('Error removing product from cart:', response.statusText);
        }
      })
      .catch(error => {
        console.error('Error removing product from cart:', error);
      });
    },
    checkout() {
      if (this.isCheckingOut) {
        // Checkout process is already in progress, do nothing
        return;
      }

      // Start the checkout process
      this.isCheckingOut = true;

      // Make a POST request to the checkout route
      fetch('/user/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(data => {
          if (data.message === "Checkout successful") {
            // Checkout successful, you can handle it here
            this.fetchUserCart();
            this.$router.push('/user/thanks');
          } else {
            console.error('Error during checkout:', data.error);
          }
        })
        .catch(error => {
          console.error('Error during checkout:', error);
        })
        .finally(() => {
          // Reset the flag to enable the button
          this.isCheckingOut = false;
        });
    },
    logoutAndRedirect() {
      logout(this.$router);
    },
  },
  created() {
    this.fetchUserCart(); // Fetch the user's cart data when the component is created
  },
});

export default Cart;
