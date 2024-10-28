const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/User');  
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(bodyParser.json());


app.use(express.static(path.join(__dirname, 'public')));


mongoose.connect('mongodb+srv://ravitjangid456:d4LDRIF14ZHFLk5I@cluster0.lagbe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.log("Error connecting to MongoDB:", err);
});

app.post('/api/user', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const liveUsers = new Map();

app.post('/api/user', async (req, res) => {
    const newUser = req.body;

    try {
        const user = new User(newUser);
        await user.save();
        res.status(201).json({ message: 'User saved successfully' });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern.email) {
            // MongoDB duplicate key error for email
            res.status(409).json({ message: 'Email is already registered' });
        } else {
            // General server error
            res.status(500).json({ message: 'Error saving user' });
        }
    }
});



io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('joinRoom', (user) => {
        liveUsers.set(socket.id, { email: user.email, name: user.name, socketId: socket.id });
        console.log(`User ${user.name} joined the room. Socket ID: ${socket.id}`);
        io.to('live users').emit('userList', Array.from(liveUsers.values()));
    });

    socket.on('disconnect', () => {
        liveUsers.delete(socket.id);
        io.to('live users').emit('userList', Array.from(liveUsers.values()));
        console.log(`User disconnected: ${socket.id}`);
    });

 
    socket.join('live users');
});


const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});