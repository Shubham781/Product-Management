const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Rating must be between 1 and 5']
  },
  image: {
    type: String
  }
});

module.exports = mongoose.model('Product', productSchema);
