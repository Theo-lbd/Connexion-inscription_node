// Charge les variables d'environnement à partir du fichier .env
require('dotenv').config();

// Importe les modules nécessaires
const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const crypto = require('crypto');
const session = require('express-session');

// Crée une instance d'Express
const app = express();

// Configure le middleware session
app.use(session({
  secret: 'mySecretKey', // Utilisez une chaîne de caractères secrète pour signer le cookie de session
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // `true` si vous êtes sur une connexion HTTPS
}));

// Permet à Express de lire les corps de requête encodés en URL (ce qui vient des formulaires HTML)
app.use(express.urlencoded({ extended: true }));

// Connecte Mongoose à la base de données MongoDB
mongoose.connect(process.env.DB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Route GET pour la racine qui sert la page d'inscription
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
          return res.status(400).send('User already exists.');
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
        res.status(201).send('User registered successfully.');
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
            return res.status(401).send('Login failed: User not found.');
        }

        // Compare le mot de passe haché stocké avec celui soumis après l'avoir haché
        const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET);
        const submittedHashedPassword = hmac.update(req.body.password).digest('hex');
        if (user.password !== submittedHashedPassword) {
            return res.status(401).send('Login failed: Incorrect password.');
        }

        // Si la connexion est réussie, stockez les informations de l'utilisateur dans la session
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
            // Vous pouvez ajouter d'autres informations ici si nécessaire
        };

        // Redirigez l'utilisateur vers le tableau de bord
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error); // Imprime l'erreur dans la console
        res.status(500).send('An error occurred during the login process.');
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
    console.error(err.stack); // Imprime la pile d'erreur dans la console
    res.status(500).send('Something broke!');
});

// Définit le port d'écoute pour le serveur et lance le serveur
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
