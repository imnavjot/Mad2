// logout.js
import store from '../main.js';


export const logout = (router) => {
  // Clear the token from Vuex store
  store.commit('setAccessToken', '');
  store.commit('setUserType', '');

  // Clear the token from sessionStorage
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('user_type');

  // Navigate to the home page using the provided router instance
  router.push('/');
};
