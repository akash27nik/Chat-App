import jwt from 'jsonwebtoken';

const genToken = async (userId) => {
  try {
    const token = await jwt.sign(
      {userId},
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token will expire in 7 days
    );
    return token;

  } catch (error) {
    console.log ("Error generating token:", error);
  }
}
export default genToken;

