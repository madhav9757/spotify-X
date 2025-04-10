const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static folders manually
app.use('/script', express.static(path.join(__dirname, 'script')));
app.use('/style', express.static(path.join(__dirname, 'style')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));
app.use('/songs', express.static(path.join(__dirname, 'songs')));

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});
app.get('/log-in', (req, res) => {
    res.sendFile(path.join(__dirname, 'log-in.html'));
});
app.get('/sign-up', (req, res) => {
    res.sendFile(path.join(__dirname, 'sign-up.html'));
});

// API route: Get folder names in /songs
app.get('/api/songs', (req, res) => {
    const songsDir = path.join(__dirname, 'songs');
    fs.readdir(songsDir, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to read songs directory' });
        const folders = files.filter(f => f.isDirectory()).map(f => f.name);
        res.json(folders);
    });
});

// API route: Get song files in a folder
app.get('/api/songs/:folder', (req, res) => {
    const folderName = req.params.folder;
    const folderPath = path.join(__dirname, 'songs', folderName);

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const songFiles = files.filter(file =>
            file.endsWith('.mp3') || file.endsWith('.flac')
        );

        res.json(songFiles);
    });
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});