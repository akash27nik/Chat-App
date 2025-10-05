import express from 'express';
import {signUp,Login,Logout} from '../controllers/auth.controllers.js';

const authRouter = express.Router();  

// Route for user signup
authRouter.post('/signup', signUp);
// Route for user login
authRouter.post('/login', Login); 
authRouter.get('/logout', Logout);


export default authRouter;