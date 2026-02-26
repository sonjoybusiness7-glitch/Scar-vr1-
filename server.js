const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // serve frontend

// In-memory database (replace with real DB in production)
let userData = {
    memory: [],
    goals: [],
    reminders: []
};

// Load from file if exists
const dataFile = path.join(__dirname, 'userdata.json');
if (fs.existsSync(dataFile)) {
    try {
        userData = JSON.parse(fs.readFileSync(dataFile));
    } catch (e) {
        console.error("Failed to load data file", e);
    }
}

// Save to file
function saveData() {
    fs.writeFileSync(dataFile, JSON.stringify(userData, null, 2));
}

// Sync endpoint
app.post('/api/sync', (req, res) => {
    const { memory, goals, reminders, userId } = req.body;
    // For this private app, we assume only one user (owner)
    // In a real app, you'd authenticate via face unlock token
    if (userId !== 'owner') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    // Merge data (simple overwrite for demo)
    if (memory) userData.memory = memory;
    if (goals) userData.goals = goals;
    if (reminders) userData.reminders = reminders;

    saveData();
    res.json({ status: 'synced', data: userData });
});

// AI endpoint placeholder
app.post('/api/ai', (req, res) => {
    const { text, language } = req.body;
    // Here you would call an actual AI service (e.g., OpenAI)
    // For demo, echo with simple logic
    let response = `You said: ${text}`;
    if (text.includes('time')) {
        response = `Current server time is ${new Date().toLocaleTimeString()}`;
    }
    res.json({ response });
});

// Start server
app.listen(PORT, () => {
    console.log(`SCAR backend running on http://localhost:${PORT}`);
});
