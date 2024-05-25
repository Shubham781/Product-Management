const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const formidable = require('formidable');
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Product model
const Product = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  image: String,
}));

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
}));
app.set('view engine', 'ejs');

// Routes
app.get('/', async (req, res) => {
  const { category, sort, search } = req.query;
  let query = {};
  if (category) query.category = category;
  if (search) query.name = new RegExp(search, 'i');
  let products = await Product.find(query);
  if (sort) {
    products = products.sort((a, b) => (sort === 'price' ? a.price - b.price : a.rating - b.rating));
  }
  res.render('index', { products });
});

app.get('/products/new', (req, res) => {
  res.render('create', { errors: [] });
});

app.post('/products', [
  check('name').notEmpty().withMessage('Name is required'),
  check('description').notEmpty().withMessage('Description is required'),
  check('category').notEmpty().withMessage('Category is required'),
  check('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  check('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('create', { errors: errors.array() });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).send(err);
    }

    const product = new Product(fields);
    if (files.image && files.image.size > 0) {
      const oldPath = files.image.path;
      const newPath = path.join(__dirname, 'public', 'uploads', files.image.name);
      const rawData = fs.readFileSync(oldPath);
      fs.writeFileSync(newPath, rawData);
      product.image = '/uploads/' + files.image.name;
    }

    await product.save();
    res.redirect('/');
  });
});

app.get('/products/:id/edit', async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.render('edit', { product, errors: [] });
});

app.put('/products/:id', [
  check('name').notEmpty().withMessage('Name is required'),
  check('description').notEmpty().withMessage('Description is required'),
  check('category').notEmpty().withMessage('Category is required'),
  check('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  check('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('edit', { product: req.body, errors: errors.array() });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).send(err);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, fields, { new: true });
    if (files.image && files.image.size > 0) {
      const oldPath = files.image.path;
      const newPath = path.join(__dirname, 'public', 'uploads', files.image.name);
      const rawData = fs.readFileSync(oldPath);
      fs.writeFileSync(newPath, rawData);
      product.image = '/uploads/' + files.image.name;
    }

    await product.save();
    res.redirect('/');
  });
});

app.delete('/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

app.post('/products/:id/favorite', (req, res) => {
  if (!req.session.favorites) {
    req.session.favorites = [];
  }
  req.session.favorites.push(req.params.id);
  res.redirect('/products/favorites');
});

app.post('/products/:id/unfavorite', (req, res) => {
  req.session.favorites = req.session.favorites.filter(fav => fav !== req.params.id);
  res.redirect('/products/favorites');
});

app.get('/products/favorites', async (req, res) => {
  const favorites = await Product.find({ _id: { $in: req.session.favorites || [] } });
  res.render('favorites', { favorites });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
