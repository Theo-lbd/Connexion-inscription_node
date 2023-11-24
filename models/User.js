const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

userSchema.pre('save', function(next) {
  if (this.isModified('password')) {
    const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET);
    this.password = hmac.update(this.password).digest('hex');
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
