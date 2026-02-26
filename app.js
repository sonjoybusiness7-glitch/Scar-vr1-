// SCAR Main Application

class SCARAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.wakeWord = "scar";
        this.stopCommand = "stop";
        this.writeCommand = "write it";
        this.liveScreenActive = false;
        this.bluetoothActive = false;
        this.onlineActive = true; // default on
        this.userLanguage = 'en'; // detected from speech
        this.memory = [];
        this.goals = [];
        this.history = [];
        this.reminders = [];
        this.init();
    }

    // Initialize app
    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.setupVoice();
        this.checkAuth(); // face unlock simulation
    }

    // Load data from localStorage
    loadFromStorage() {
        try {
            this.memory = JSON.parse(localStorage.getItem('scar_memory')) || [];
            this.goals = JSON.parse(localStorage.getItem('scar_goals')) || [];
            this.history = JSON.parse(localStorage.getItem('scar_history')) || [];
            this.reminders = JSON.parse(localStorage.getItem('scar_reminders')) || [];
        } catch (e) {
            console.warn("Failed to load from storage", e);
        }
    }

    // Save data to localStorage
    saveToStorage() {
        localStorage.setItem('scar_memory', JSON.stringify(this.memory));
        localStorage.setItem('scar_goals', JSON.stringify(this.goals));
        localStorage.setItem('scar_history', JSON.stringify(this.history));
        localStorage.setItem('scar_reminders', JSON.stringify(this.reminders));
    }

    // Setup DOM event listeners
    setupEventListeners() {
        // Toggles
        document.getElementById('liveScreenToggle').addEventListener('change', (e) => {
            this.liveScreenActive = e.target.checked;
            if (this.liveScreenActive) {
                this.startLiveScreen();
            } else {
                this.stopLiveScreen();
            }
        });

        document.getElementById('bluetoothToggle').addEventListener('change', (e) => {
            this.bluetoothActive = e.target.checked;
            // In a real app, this would enable low-power mode or something
            console.log("Bluetooth mode:", this.bluetoothActive);
        });

        document.getElementById('onlineToggle').addEventListener('change', (e) => {
            this.onlineActive = e.target.checked;
            if (this.onlineActive) {
                this.syncWithCloud();
            }
        });

        // Menu
        const menuDots = document.getElementById('menuDots');
        const menuDropdown = document.getElementById('menuDropdown');
        menuDots.addEventListener('click', () => {
            menuDropdown.classList.toggle('show');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuDots.contains(e.target) && !menuDropdown.contains(e.target)) {
                menuDropdown.classList.remove('show');
            }
        });

        // Menu options
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const option = e.target.dataset.option;
                this.openMenuOption(option);
                menuDropdown.classList.remove('show');
            });
        });

        // Mic activation
        document.getElementById('activateMicBtn').addEventListener('click', () => {
            this.startListening();
            document.getElementById('micOverlay').style.display = 'none';
        });

        // Modal close buttons
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
            });
        });

        // Goals modal
        document.getElementById('addGoalBtn').addEventListener('click', () => {
            const input = document.getElementById('goalInput');
            if (input.value.trim()) {
                this.addGoal(input.value.trim());
                input.value = '';
                this.renderGoals();
            }
        });
    }

    // Open menu options
    openMenuOption(option) {
        switch(option) {
            case 'memory':
                this.showMemoryModal();
                break;
            case 'goals':
                this.showGoalsModal();
                break;
            case 'history':
                this.showHistory();
                break;
            case 'settings':
                alert("Settings - coming soon");
                break;
            case 'ecosystem':
                alert("Ecosystem Devices - coming soon");
                break;
        }
    }

    // Memory modal
    showMemoryModal() {
        const modal = document.getElementById('memoryModal');
        const list = document.getElementById('memoryList');
        list.innerHTML = this.memory.map(item => `<div>${item}</div>`).join('') || 'No memories yet.';
        modal.style.display = 'block';
    }

    // Goals modal
    showGoalsModal() {
        const modal = document.getElementById('goalsModal');
        this.renderGoals();
        modal.style.display = 'block';
    }

    renderGoals() {
        const list = document.getElementById('goalsList');
        list.innerHTML = this.goals.map((goal, index) => `
            <div style="display:flex; justify-content:space-between; margin:5px 0;">
                <span>${goal.text} - ${goal.completed ? '✅' : '⏳'}</span>
                <button onclick="app.toggleGoal(${index})">Toggle</button>
            </div>
        `).join('');
    }

    addGoal(text) {
        this.goals.push({ text, completed: false, createdAt: new Date() });
        this.saveToStorage();
        this.syncWithCloud();
    }

    toggleGoal(index) {
        this.goals[index].completed = !this.goals[index].completed;
        this.saveToStorage();
        this.renderGoals();
        this.syncWithCloud();
    }

    // Show history (simple)
    showHistory() {
        alert("History:\n" + this.history.slice(-5).join('\n'));
    }

    // Face unlock simulation (WebAuthn could be used, but for demo we use simple prompt)
    async checkAuth() {
        // For demo, we assume owner is recognized.
        // In a real app, use face detection API or WebAuthn.
        console.log("Face unlock simulated - owner recognized");
    }

    // Voice setup
    setupVoice() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Your browser does not support speech recognition. Please use Chrome.");
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'bn-BD, en-US, hi-IN'; // multiple languages

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.trim().toLowerCase();
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            document.getElementById('transcriptArea').innerText = interimTranscript || finalTranscript;
            if (finalTranscript) {
                this.processCommand(finalTranscript);
            }
        };

        this.recognition.onerror = (e) => {
            console.error("Recognition error", e);
            if (e.error === 'not-allowed') {
                alert("Microphone access denied. Please allow to use SCAR.");
            }
        };

        this.recognition.onend = () => {
            console.log("Recognition ended, restarting if listening...");
            if (this.isListening) {
                this.recognition.start();
            }
        };
    }

    // Start listening (called after mic permission)
    startListening() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.isListening = true;
                document.getElementById('statusIndicator').innerText = "SCAR is listening...";
            } catch (e) {
                console.warn("Recognition already started", e);
            }
        }
    }

    // Stop listening (on "stop" command)
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.isSpeaking = false;
            this.synthesis.cancel();
            document.getElementById('statusIndicator').innerText = "SCAR stopped.";
            document.getElementById('responseArea').innerText = "SCAR is idle.";
        }
    }

    // Process voice commands
    processCommand(text) {
        console.log("Command:", text);
        this.history.push(text);
        if (this.history.length > 100) this.history.shift();
        this.saveToStorage();

        // Check for stop command first
        if (text.includes(this.stopCommand)) {
            this.stopListening();
            return;
        }

        // Check for wake word (if not already triggered, we wait for it)
        // For simplicity, we assume the system is always listening and responds only after wake word.
        if (!text.includes(this.wakeWord) && !this.wakeWordDetected) {
            // Not for us
            return;
        }

        // If wake word detected, remove it from processing
        let command = text.replace(this.wakeWord, '').trim();
        this.wakeWordDetected = true; // stay active until stop or silence

        // Check if user wants text response
        if (command.includes(this.writeCommand)) {
            command = command.replace(this.writeCommand, '').trim();
            this.respondToCommand(command, false); // no voice
        } else {
            this.respondToCommand(command, true); // voice
        }
    }

    // Generate response and output
    async respondToCommand(command, useVoice = true) {
        // Detect language: simple check for Bengali script (Unicode range)
        const hasBengali = /[\u0980-\u09FF]/.test(command);
        const hasHindi = /[\u0900-\u097F]/.test(command);
        if (hasBengali) this.userLanguage = 'bn';
        else if (hasHindi) this.userLanguage = 'hi';
        else this.userLanguage = 'en';

        // Generate response (placeholder AI)
        let response = this.generateAIResponse(command);

        // For text response, mix Bengali and English if user language is Bengali
        if (this.userLanguage === 'bn' && !useVoice) {
            response = this.mixBengaliEnglish(response);
        }

        // Display response
        document.getElementById('responseArea').innerText = response;

        // Speak if voice enabled
        if (useVoice) {
            this.speak(response);
        }

        // If command is a reminder, save it
        if (command.includes('remind me')) {
            this.createReminder(command);
        }
    }

    // Placeholder AI response generator
    generateAIResponse(command) {
        // In a real app, this would call a cloud AI API.
        // For demo, use simple rules.
        if (command.includes('hello') || command.includes('hi')) {
            return "Hello! How can I assist you today?";
        }
        if (command.includes('time')) {
            return `The current time is ${new Date().toLocaleTimeString()}.`;
        }
        if (command.includes('goal')) {
            return "I can help you manage your goals. Open the Goals menu to see your list.";
        }
        if (command.includes('memory')) {
            return "I remember important things for you. Check the Memory menu.";
        }
        if (command.includes('thank')) {
            return "You're welcome!";
        }
        return "I understand you said: " + command + ". I'm still learning.";
    }

    // Mix Bengali and English (demo)
    mixBengaliEnglish(text) {
        // Simple replacement for demo
        const bengaliWords = {
            'hello': 'হ্যালো',
            'time': 'সময়',
            'goal': 'লক্ষ্য',
            'memory': 'স্মৃতি'
        };
        let mixed = text;
        for (let [en, bn] of Object.entries(bengaliWords)) {
            mixed = mixed.replace(new RegExp(en, 'gi'), bn);
        }
        return mixed;
    }

    // Speak using synthesis
    speak(text) {
        if (this.isSpeaking) {
            this.synthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        // Set voice to a male robotic voice if available
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Male'));
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.9;
        utterance.pitch = 0.8;
        utterance.onend = () => { this.isSpeaking = false; };
        utterance.onerror = () => { this.isSpeaking = false; };
        this.isSpeaking = true;
        this.synthesis.speak(utterance);
    }

    // Create reminder
    createReminder(command) {
        // Simple: extract time and message
        const reminder = {
            text: command,
            time: new Date(),
            id: Date.now()
        };
        this.reminders.push(reminder);
        this.saveToStorage();
        // In a real app, set a timeout for notification
        console.log("Reminder set:", reminder);
    }

    // Live Screen Mode
    startLiveScreen() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            alert("Screen capture not supported in this browser.");
            document.getElementById('liveScreenToggle').checked = false;
            return;
        }
        // Request screen capture
        navigator.mediaDevices.getDisplayMedia({ video: true })
            .then(stream => {
                this.screenStream = stream;
                // In a real app, you'd capture frames periodically using canvas
                // For demo, we just show a message
                document.getElementById('responseArea').innerText = "Live screen mode active. Analyzing...";
                // Stop after 5 seconds for demo
                setTimeout(() => {
                    this.stopLiveScreen();
                }, 5000);
            })
            .catch(err => {
                console.error("Screen capture error:", err);
                document.getElementById('liveScreenToggle').checked = false;
            });
    }

    stopLiveScreen() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        document.getElementById('liveScreenToggle').checked = false;
        document.getElementById('responseArea').innerText = "Live screen mode deactivated.";
    }

    // Cloud sync (placeholder)
    syncWithCloud() {
        if (!this.onlineActive) return;
        // In a real app, send data to Node.js backend
        console.log("Syncing with cloud...");
        fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                memory: this.memory,
                goals: this.goals,
                reminders: this.reminders,
                userId: 'owner' // In real app, use unique ID
            })
        })
        .then(res => res.json())
        .then(data => {
            console.log("Sync response:", data);
        })
        .catch(err => console.warn("Sync failed (offline?)", err));
    }
}

// Initialize app when DOM loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SCARAssistant();
    window.app = app; // for debugging
});
