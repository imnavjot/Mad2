// AdminDashboard.js
import store from '../main.js';
import { logout } from './logout.js';

const AdminDashboard = Vue.component("admindashboard", {
  template: `
    <div>
      <nav class="navbar navbar-light bg-light sticky-top">
        <div class="container">
          <a class="navbar-brand">Grocery Store - Admin Dashboard</a>
          <button @click="logoutAndRedirect" class="btn btn-secondary ml-auto">Log Out</button>
        </div>
      </nav>
      <div class="container mt-2">
        <br>
        <h2>Welcome to Admin Dashboard</h2>
        <router-link to="/admin/insights" class="btn btn-secondary">Insights</router-link>
        <hr>
        <h3>Category Management:</h3>
        <router-link to="/admin/add_category" class="btn btn-primary">Add New Category</router-link>
        <br><br>
        <div class="table-responsive">
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="section in sections" :key="section.id">
              <td>{{ section.name }}</td>
              <td>
                <router-link :to="'/admin/edit_category/' + section.id" class="btn btn-warning my-1">Edit</router-link>
                <button @click="removeCategory(section.id)" class="btn btn-danger my-1">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        <hr>
        <h3>Store Managers Login Requests:</h3>
        <div class="table-responsive">
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="manager in storeManagerRequests" :key="manager.id">
              <td>{{ manager.email }}</td>
              <td>
                <button @click="approveRequest(manager.id)" class="btn btn-success my-1">Approve</button>
                <button @click="declineRequest(manager.id)" class="btn btn-danger my-1">Decline</button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        <!-- Category Request Handling -->
        <div>
          <h3>Category Requests:</h3>
          <table class="table table-bordered">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Store Manager</th>
                <th>Request Type</th>

                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="request in categoryRequests" :key="request.id">
                <td>{{ request.category_name }}</td>
                <td>{{ request.requester_email }}</td>
                <td>{{ request.request_type }}</td>
                <td>
                  <button @click="approveCategoryRequest(request.id)" class="btn btn-success my-1">Approve</button>
                  <button @click="rejectCategoryRequest(request.id)" class="btn btn-danger my-1">Reject</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      sections: [],
      storeManagerRequests: [],
      categoryRequests: [],
    };
  },
  methods: {
    loadSections() {
      // Make an API request to fetch sections data using fetch
      fetch('/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          this.sections = data.sections;
        })
        .catch((error) => {
          console.error('Error loading sections:', error);
        });
    },
    removeCategory(categoryId) {
      if (confirm('Are you sure you want to remove this category?')) {
        // Make an API request to remove the category by categoryId using fetch
        fetch(`/admin/remove_category/${categoryId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${store.state.access_token}`,
            'Content-Type': 'application/json',
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Reload the sections after successfully removing the category
            this.loadSections();
          })
          .catch((error) => {
            console.error('Error removing category:', error);
          });
      }
    },
    logoutAndRedirect() {
      logout(this.$router); // Call the logout function
    },

    loadStoreManagerRequests() {

      // Make an API request to fetch store manager requests
      fetch('/admin/store-manager-requests', {
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          this.storeManagerRequests = data.storeManagerRequests;
        })
        .catch((error) => {
          console.error('Error loading store manager requests:', error);
        });
    },

    approveRequest(managerId) {
      // Make an API request to approve the store manager request
      fetch(`/admin/approve-store-manager/${managerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          // Reload the store manager requests after approval
          this.loadStoreManagerRequests();
        })
        .catch((error) => {
          console.error('Error approving store manager request:', error);
        });
    },

    declineRequest(managerId) {

      if (confirm('Are you sure you want to decline this request?')) {
        // Make an API request to decline the store manager request
        fetch(`/admin/decline-store-manager/${managerId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${store.state.access_token}`,
            'Content-Type': 'application/json',
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Reload the store manager requests after decline
            this.loadStoreManagerRequests();
          })
          .catch((error) => {
            console.error('Error declining store manager request:', error);
          });
      }
    },

    loadCategoryRequests() {
      fetch('/admin/category_requests', {
        headers: {
          'Authorization': `Bearer ${store.state.access_token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // Update the property name to match the structure of the data you receive
          this.categoryRequests = data.category_requests.map((request) => ({
            id: request.id,
            category_name: request.category_name,
            request_type: request.request_type,
            requester_email: request.requester_email,
          }));
        })
        .catch((error) => {
          console.error('Error loading category requests:', error);
        });
    },
      // Add a method to approve category requests
    approveCategoryRequest(requestId) {
        fetch(`/admin/handle_category_request/${requestId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${store.state.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'approve' }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Reload the category requests after approval
            this.loadCategoryRequests();
            this.loadSections();
          })
          .catch((error) => {
            console.error('Error approving category request:', error);
          });
    },

      // Add a method to reject category requests
      rejectCategoryRequest(requestId) {
        if (confirm('Are you sure you want to reject this request?')) {
          // Make an API request to handle the category request with "reject" action
          fetch(`/admin/handle_category_request/${requestId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${store.state.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'reject' }), // Specify the action as "reject"
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
              // Reload the category requests after rejection
              this.loadCategoryRequests();
            })
            .catch((error) => {
              console.error('Error rejecting category request:', error);
            });
        }
      },
  },
  created() {
    // Load store manager requests when the component is created
    this.loadStoreManagerRequests();
    this.loadCategoryRequests();
    this.loadSections();
  },
});

export default AdminDashboard;
