import { configureStore } from '@reduxjs/toolkit';
import productReducer from './slices/productSlice';
import orderReducer from './slices/orderSlice';
import bomReducer from './slices/bomSlice';
import dashboardReducer from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    products: productReducer,
    orders: orderReducer,
    bom: bomReducer,
    dashboard: dashboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;