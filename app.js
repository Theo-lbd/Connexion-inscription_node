require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const crypto = require('crypto');
const session = require('express-session');

const app = express();

app.use(session({
  secret: 'mySecretKey',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }));

// Connecte Mongoose à la base de données MongoDB
mongoose.connect(process.env.DB_URI)
  .then(() => console.log('Connecté à MongoDB'))
  .catch(err => console.error('Impossible de se connecter à MongoDB', err));

// Route GET pour inscription
app.get('/', (req, res) => {
  res.sendFile('views/register.html', { root: __dirname });
});

app.get('/login', (req, res) => {
    res.sendFile('views/login.html', { root: __dirname });
});

// Route POST pour l'enregistrement d'un utilisateur
app.post('/register', async (req, res) => {
    try {
        // Vérifie si l'email existe déjà dans la base de données
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
          return res.status(400).send('L\'utilisateur existe déjà.');
        }
    
        // Crée un nouvel utilisateur avec les données reçues de la requête
        const newUser = new User({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          password: req.body.password // Le mot de passe sera haché avant d'être sauvegardé grâce au middleware dans le modèle User
        });
    
        // Sauvegarde le nouvel utilisateur dans la base de données
        await newUser.save();
    
        // Envoie une réponse indiquant le succès de l'opération
        res.status(201).send('L\'utilisateur s\'est enregistré avec succès.');
      } catch (error) {
        // Gère les erreurs et envoie une réponse d'erreur
        res.status(500).send(error.message);
      }
});

app.post('/login', async (req, res) => {
    try {
        // Recherche de l'utilisateur par email
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(401).send('utilisateur inconnu');
        }

        // Compare le mot de passe
        const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET);
        const submittedHashedPassword = hmac.update(req.body.password).digest('hex');
        if (user.password !== submittedHashedPassword) {
            return res.status(401).send('mot de passe incorrect.');
        }

        // Si la connexion est réussie, stockez les informations de l'utilisateur dans la session
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        };

        // Redirigez l'utilisateur vers le tableau de bord
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Une erreur s\'est produite lors du processus de connexion.');
    }
});


app.get('/dashboard', (req, res) => {
    if (req.session.user && req.session.user.id) {
      // Si l'utilisateur est connecté, affichez les informations
      res.send(`
        <h1>Tableau de bord</h1>
        <p>Bienvenue, ${req.session.user.firstName} ${req.session.user.lastName}!</p>
        <p>Email: ${req.session.user.email}</p>
        <p><a href="/logout">Se déconnecter</a></p>
      `);
    } else {
      // Redirige vers la page de connexion si l'utilisateur n'est pas connecté
      res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        res.status(500).send('Une erreur est survenue lors de la déconnexion');
      } else {
        res.redirect('/login');
      }
    });
  });
  

// Middleware pour la gestion des erreurs
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('quelque chose s\'est mal passé');
});

// Définit le port d'écoute pour le serveur et lance le serveur
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`${port}`));s
