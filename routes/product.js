const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Product = require('../models/products');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.get('/new', (req, res) => {
  res.render('create');
});

router.post('/',
  upload.single('image'),
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('create', { errors: errors.array() });
    }

    const { name, description, category, price, rating } = req.body;
    const newProduct = new Product({
      name,
      description,
      category,
      price,
      rating,
      image: req.file ? req.file.path.replace('public', '') : null
    });

    newProduct.save((err) => {
      if (err) {
        return res.status(500).send('Error saving product');
      }
      res.redirect('/');
    });
  }
);

router.get('/:id', (req, res) => {
  Product.findById(req.params.id, (err, product) => {
    if (err) {
      return res.status(500).send('Error retrieving product');
    }
    res.render('product', { product, session: req.session });
  });
});

router.get('/:id/edit', (req, res) => {
  Product.findById(req.params.id, (err, product) => {
    if (err) {
      return res.status(500).send('Error retrieving product');
    }
    res.render('edit', { product });
  });
});

router.put('/:id',
  upload.single('image'),
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return Product.findById(req.params.id, (err, product) => {
        if (err) {
          return res.status(500).send('Error retrieving product');
        }
        res.status(400).render('edit', { errors: errors.array(), product });
      });
    }
    const { name, description, category, price, rating } = req.body;
    const updateData = {
      name,
      description,
      category,
      price,
      rating
    };
    if (req.file) {
      updateData.image = req.file.path.replace('public', '');
    }
    Product.findByIdAndUpdate(req.params.id, updateData, { new: true }, (err, product) => {
      if (err) {
        return res.status(500).send('Error updating product');
      }
      res.redirect(`/products/${product._id}`);
    });
  }
);

router.delete('/:id', (req, res) => {
  Product.findByIdAndRemove(req.params.id, (err) => {
    if (err) {
      return res.status(500).send('Error deleting product');
    }
    res.redirect('/');
  });
});

// Add to favorites
router.post('/:id/favorite', (req, res) => {
  const productId = req.params.id;
  if (!req.session.favorites) {
    req.session.favorites = [];
  }
  if (!req.session.favorites.includes(productId)) {
    req.session.favorites.push(productId);
  }
  res.redirect(`/products/${productId}`);
});

// Remove from favorites
router.post('/:id/unfavorite', (req, res) => {
  const productId = req.params.id;
  if (req.session.favorites) {
    req.session.favorites = req.session.favorites.filter(id => id !== productId);
  }
  res.redirect(`/products/${productId}`);
});

// View favorites
router.get('/favorites', async (req, res) => {
  if (!req.session.favorites || req.session.favorites.length === 0) {
    return res.render('favorites', { favorites: [] });
  }
  try {
    const favoriteProducts = await Product.find({ '_id': { $in: req.session.favorites } });
    res.render('favorites', { favorites: favoriteProducts });
  } catch (err) {
    res.status(500).send('Error retrieving favorite products');
  }
});

module.exports = router;
