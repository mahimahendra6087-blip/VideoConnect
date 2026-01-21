const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET_KEY = process.env.JWT_SECRET || "colink_secret_key";

router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`Attempting signup for: ${username}`);

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            password: hashedPassword
        });

        await newUser.save();
        console.log(`User created: ${username}`);

        const token = jwt.sign({ id: newUser._id, username: newUser.username }, SECRET_KEY, { expiresIn: '1h' });
        res.status(201).json({ token, user: { id: newUser._id, username: newUser.username } });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: error.message || "Something went wrong" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`Attempting login for: ${username}`);

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: error.message || "Something went wrong" });
    }
});

module.exports = router;
