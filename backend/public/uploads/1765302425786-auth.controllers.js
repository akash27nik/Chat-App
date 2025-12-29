import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import genToken from '../config/token.js';




// Sign Up Controller
export const signUp = async (req, res) => {
  try{
    // fetch user data from request body
    const {userName, email, password} = req.body;

    // validate user data
    const checkUser = await User.findOne({ userName });
    if(checkUser){
      return res.status(400).json({message: "User already exists"});
    }

    const checkEmail = await User.findOne({ email });
    if(checkEmail){
      return res.status(400).json({message: "Email already exists"});
    }

    // passwoed length validation
    if(password.length < 6){
      return res.status(400).json({message: "Password must be at least 6 characters long"});
    } 

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create a new user
    // and save it to the database
    const user = await User.create({
      userName,
      email,
      password: hashedPassword,
      
    });

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "Strict", // Prevent CSRF attacks
      secure: true // Use secure cookies in production
    });

    res.status(200).json(user)
 
 
  }catch(error){
    console.error("Error in signUp:", error);
    res.status(500).json({message: "Signup Error", error: error.message});
  }
}


// Login Controller

export const Login = async (req, res) => {
  try{
    // fetch user data from request body
    const {email, password} = req.body;

    // validate user data
    
    const user = await User.findOne({ email });
    if(!user){
      return res.status(400).json({message: "User does not exist"});
    }


    // passwoed length validation 
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if(!isPasswordValid){ 
      return res.status(400).json({message: "Invalid password"});
    }


    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "Strict", //Strict for better security
      secure: process.env.NODE_ENV === "production"// Use secure cookies in production
    });

    res.status(200).json(user)
 
 
  }catch(error){
    console.error("Error in Login:", error);
    res.status(500).json({message: "Login Error", error: error.message});
  }
}


// Logout Controller
export const Logout = async (req, res) => {
  try{
    res.clearCookie("token"); 
    res.status(200).json({message: "Logout successful"});
  }catch(error){
    console.error("Error in Logout:", error);
    res.status(500).json({message: "Logout Error", error: error.message});
  } 
  
}
