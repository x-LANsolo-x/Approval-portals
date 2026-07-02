import { configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./slices/sessionSlice"

const myStore = configureStore({
reducer : {
    session : sessionReducer,
}
})

export default myStore;
