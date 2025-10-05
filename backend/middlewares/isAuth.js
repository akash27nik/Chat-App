import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const isAuth = async (req, res, next) => {
   try{
    let token = req.cookies.token
    if (!token){
        return res.status(400).json({message: "Token is not found"})
    }

    let verifyToken = jwt.verify(token, process.env.JWT_SECRET)
    

    req.userId = verifyToken.userId;
    next()


    }catch(error){
      return res.status(500).json({ message: `isAuth error: ${error.message}` });
   }
}


export default isAuth;