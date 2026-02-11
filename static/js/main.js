import Home from './components/home.js'
import UserSignup from './components/usersignup.js';
import SmSignup from './components/smsignup.js';
import UserLogin from './components/userlogin.js';
import AdminLogin from './components/adminlogin.js';
import SmLogin from './components/smlogin.js';
import AdminDashboard from './components/admindashboard.js';
import AddCategory from './components/addcategory.js';
import EditCategory from './components/editcategory.js';
import AddCategoryRequest from './components/addcategory_request.js';
import EditCategoryRequest from './components/editcategory_request.js';
import StoreManagerDashboard from './components/smdashboard.js';
import AddProduct from './components/addproduct.js';
import EditProduct from './components/editproduct.js';
import UserDashboard from './components/userdashboard.js';
import SearchResults from './components/searchresults.js';
import Cart from './components/cart.js';
import Thanks from './components/thanks.js';
import History from './components/history.js';
import Insights from './components/insights.js';



const routes = [
  { path: '/', component: Home },
  { path: '/user/signup', component: UserSignup },
  { path: '/store_manager/signup', component: SmSignup },
  { path: '/user/login', component: UserLogin },
  { path: '/admin/login', component: AdminLogin },
  { path: '/store_manager/login', component: SmLogin },
  { path: '/admin/dashboard', component: AdminDashboard, meta: { requiresAuth: true, requiresRole: 'admin' } },
  { path: '/admin/insights', component: Insights, meta: { requiresAuth: true, requiresRole: 'admin' } },
  { path: '/admin/add_category', component: AddCategory, meta: { requiresAuth: true, requiresRole: 'admin' } },
  { path: '/admin/edit_category/:category_id', component: EditCategory, props: true, meta: { requiresAuth: true, requiresRole: 'admin' } },
  { path: '/store_manager/dashboard', component: StoreManagerDashboard, meta: { requiresAuth: true, requiresRole: 'store_manager' } },
  { path: '/store_manager/add_product', component: AddProduct, meta: { requiresAuth: true, requiresRole: 'store_manager' } },
  { path: '/store_manager/edit_product/:product_id', component: EditProduct, props: true, meta: { requiresAuth: true, requiresRole: 'store_manager' } },
  { path: '/store_manager/add_category_request', component: AddCategoryRequest, meta: { requiresAuth: true, requiresRole: 'store_manager' } },
  { path: '/store_manager/edit_category_request/:category_id', component: EditCategoryRequest, props: true, meta: { requiresAuth: true, requiresRole: 'store_manager' } },
  { path: '/user/dashboard', component: UserDashboard, meta: { requiresAuth: true, requiresRole: 'user' } },
  { path: '/user/search', component: SearchResults, meta: { requiresAuth: true, requiresRole: 'user' } },
  { path: '/user/cart', component: Cart, meta: { requiresAuth: true, requiresRole: 'user' } },
  { path: '/user/thanks', component: Thanks, meta: { requiresAuth: true, requiresRole: 'user' } },
  { path: '/user/history', component: History, meta: { requiresAuth: true, requiresRole: 'user' } },

];

const router = new VueRouter({
  routes,
});
// Create a Vuex store
const store = new Vuex.Store({
  state: {
    access_token: sessionStorage.getItem('access_token') || '', // Use sessionStorage
    user_type: sessionStorage.getItem('user_type') || '', // Use sessionStorage
  },
  mutations: {
    setAccessToken(state, token) {
      state.access_token = token;
      sessionStorage.setItem('access_token', token); // Use sessionStorage
    },
    setUserType(state, user_type) {
      state.user_type = user_type;
      sessionStorage.setItem('user_type', user_type); // Use sessionStorage
    },
  },
  actions: {
    setAccessToken({ commit }, token) {
      commit('setAccessToken', token);
    },
    setUserType({ commit }, user_type) {
      commit('setUserType', user_type);
    },
  },
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth;
  const userToken = store.state.access_token;

  if (requiresAuth) {
    if (!userToken) {
      // User is not authenticated, redirect to login page
      next('/');
      return;
    }

    // Check the user's role (user_type) for role-based authorization
    const user_type = store.state.user_type;

    if (to.meta.requiresRole && to.meta.requiresRole !== user_type) {
      // User does not have the required role for this route
      next('/');
      return;
    }
  }

  // If everything is okay, proceed to the route
  next();
});

export default store;


new Vue({
  el: '#app',
  router: router,
  store: store,
  methods: {},
});
