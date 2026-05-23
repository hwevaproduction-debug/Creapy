// Redux Toolkit Imports
import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
// Custom Imports
import authReducer, { getAuthUserId, setUser } from "./auth/authSlice";
import globalReducer from "./global/globalSlice";
import walletReducer, { setActiveWalletUser } from "./wallet/walletSlice";
import { apiSlice } from "./api/apiSlice";

const authListenerMiddleware = createListenerMiddleware();

authListenerMiddleware.startListening({
  actionCreator: setUser,
  effect: (action, listenerApi) => {
    listenerApi.dispatch(setActiveWalletUser(getAuthUserId(action.payload)));
  },
});

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,

    auth: authReducer,
    global: globalReducer,
    wallet: walletReducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }).prepend(authListenerMiddleware.middleware).concat(apiSlice.middleware),
});

store.dispatch(setActiveWalletUser(getAuthUserId(store.getState().auth.user)));

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
