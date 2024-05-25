const express = require('express');
const router = express.Router();
const Product = require('../models/products');

router.get('/', async (req, res) => {
  const { search, category, sort } = req.query;
  let filter = {};
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (category) {
    filter.category = category;
  }
  let sortOption = {};
  if (sort) {
    sortOption[sort] = sort === 'price' ? 1 : -1;
  }

  try {
    const products = await Product.find(filter).sort(sortOption);
    res.render('index', { products });
  } catch (err) {
    res.status(500).send('Error retrieving products');
  }
});

module.exports = router;
