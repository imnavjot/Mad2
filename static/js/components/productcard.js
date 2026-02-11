import store from '../main.js';

const ProductCard = Vue.component("productcard", {
  props: {
    product: Array, // Pass the product data as a prop
  },
  template: `
  <div
    class="card"
    style="width: 250px; display: inline-block; margin: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative;"
    @mouseover="showDetails = true"
    @mouseout="showDetails = false"
  >
    <img
      v-if="!showDetails"
      :src="'static/images/' + product[8]"
      :alt="product[1]"
      class="card-img-top product-image"
      style="height: 250px;"
    />
    <div v-if="showDetails" class="details" style="height: 250px; padding: 10px; background-color: #f0f0f0;">
      <p><strong>Manufacturer Date:</strong> {{ product[2] }}</p>
      <p><strong>Expiry Date:</strong> {{ product[3] }}</p>
      <p><strong>Available Quantity:</strong> {{ product[6] }}</p>
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ product[1] }}</h3>
      <p class="card-text">Price: {{ product[4] }} {{ product[5] }}</p>
      <div class="d-flex align-items-center">
        <form @submit.prevent="addToCart" class="d-flex">
          <input type="hidden" :value="product[0]" name="product_id">
          <input type="number" class="form-control" v-model="quantity" :min="1" :max="product[6]" style="max-width: 60px; margin-right: 10px;" required>
          <button class="btn btn-primary" type="submit" style="margin-right: 10px;" :disabled="product[6] === 0 || quantity === 0 || new Date(product[3]) < new Date()">
            {{ product[6] === 0 || new Date(product[3]) < new Date() ? 'No Stock' : 'Add' }}
          </button>
        </form>
        <button class="btn btn-danger" @click="removeFromCart" v-if="isInCart">Remove</button>
      </div>
    </div>
  </div>
  `,
  data() {
    return {
      user_cartt: [],
      quantity: '', // Initialize quantity
      showDetails: false,
    };
  },
  computed: {
    isInCart() {
      return this.getCartQuantity(this.product[0]) > 0;
    },
  },
  methods: {
    addToCart() {
      // Make a POST request to add the product to the cart
      const data = {
        product_id: this.product[0], // Use the correct product ID
        quantity: this.quantity,
      };
      console.log('Adding to cart with quantity:', this.quantity);
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
    fetchUserCart() {
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
          this.user_cartt = data.user_cartt; // Update the user_cartt data
          this.$set(this, 'quantity', this.getCartQuantity(this.product[0]));
          console.log('Fetched user cart data:', this.user_cartt);
          console.log('Updated quantity:', this.quantity);
        })
        .catch(error => {
          console.error('Error fetching user cart:', error);
        });
    },

    removeFromCart() {
      // Make a DELETE request to remove the product from the cart
      const data = {
        product_id: this.product[0], // Use the correct product ID
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
    getCartQuantity(product_id) {
      // Find the cart item with the matching product ID and user ID
      const cartItem = this.user_cartt.find(item => item[1] === product_id);

      // Return the quantity if the item is found, or 0 if not found
      return cartItem ? cartItem[2] : 0;
    },
  },
  created() {
    this.fetchUserCart(); // Fetch the user's cart data when the component is created
  },
});

export default ProductCard;
