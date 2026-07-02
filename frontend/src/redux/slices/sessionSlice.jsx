import { createSlice } from "@reduxjs/toolkit";

const sessionSlice = createSlice({
    name : "currentSession",
    initialState : {
        sessions : [],
        loading : false,
        error : false
    },
    reducers : {
        makeCurrentSession : (state, action) => {
            state.sessions.push(action.payload)
        },
    }
})
export const {makeCurrentSession} = sessionSlice.actions;
export default sessionSlice.reducer;