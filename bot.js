const tmi = require('tmi.js');
const express = require('express');
const path = require('path');
const youtubeSearch = require('youtube-search');
const player = require('play-sound')({ player: 'ffplay' }); // Reproductor configurado
const axios = require('axios');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg'); // Importa fluent-ffmpeg

// Configura el bot
const config = {
    identity: {
        username: 'albotclutie',
        password: 'oauth:n5th586n08s4h5965u7q0mtcsqr7ze',
    },
    channels: ['alba_clouthier'],
};

const client = new tmi.Client(config);

// Conectar al chat con manejo de reconexión
function connectClient() {
    client.connect()
        .then(() => {
            console.log('Conectado al chat de Twitch');
        })
        .catch(err => {
            console.error(`Error al conectar: ${err.message}`);
            setTimeout(connectClient, 1000); // Intenta reconectar después de 1 segundo
        });
}

connectClient(); // Llama a la función para conectar

// Manejo global de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Manejo de desconexión
client.on('disconnected', (reason) => {
    console.log(`Desconectado: ${reason}`);
    setTimeout(connectClient, 10000); // Espera 10 segundos antes de intentar reconectar
});

let songList = [];
let blackList = [];
let currentSongIndex = -1;
let isPlaying = false;

const opts = {
    maxResults: 1,
    key: 'AIzaSyDBUutCiP7JB6JhxBkk7NAZDPohXZ8B5L4'
};

function searchAndAddSong(title, username) {
    youtubeSearch(title, opts, (err, results) => {
        if (err) {
            client.say(config.channels[0], `@${username}, error en la búsqueda.`);
            console.error(err);
            return;
        }
        if (results && results.length > 0) {
            const songTitle = results[0].title;
            const videoId = results[0].id;
            const songUrl = `https://www.youtube.com/watch?v=${videoId}`;

            axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${opts.key}&part=contentDetails`)
                .then(response => {
                    const duration = response.data.items[0].contentDetails.duration;
                    const durationInMinutes = convertDurationToMinutes(duration);
                    
                    if (durationInMinutes > 7) {
                        client.say(config.channels[0], `@${username}, la canción dura más de 7 minutos.`);
                    } else {
                        addSong(songTitle, songUrl, username);
                    }
                })
                .catch(err => {
                    client.say(config.channels[0], `@${username}, error al obtener duración.`);
                    console.error(err);
                });
        } else {
            client.say(config.channels[0], `@${username}, no se encontró la canción.`);
        }
    });
}

function convertDurationToMinutes(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    return hours * 60 + minutes + (seconds / 60);
}

function addSong(title, url, username) {
    if (blackList.includes(url)) {
        client.say(config.channels[0], `@${username}, no fue agregada, está vetada.`);
        return;
    }
    songList.push({ title, url }); // Almacena como objeto
    client.say(config.channels[0], `@${username} "${title}" agregada exitosamente.`);
    
    if (!isPlaying) {
        playNextSong();
    }
}

function playNextSong() {
    if (songList.length === 0) {
        isPlaying = false; 
        return;
    }

    currentSongIndex = (currentSongIndex + 1) % songList.length; 
    const currentSong = songList[currentSongIndex];
    isPlaying = true;

    client.say(config.channels[0], `Reproduciendo: "${currentSong.title}"`);

    // Reproduce el audio usando ytdl-core y fluent-ffmpeg
    const stream = ytdl(currentSong.url, { filter: 'audioonly' });
    
    ffmpeg(stream)
        .audioCodec('libmp3lame')
        .format('mp3')
        .on('error', (err) => {
            client.say(config.channels[0], `Error al reproducir: ${err.message}`);
            isPlaying = false; 
            playNextSong(); 
        })
        .on('end', () => {
            isPlaying = false; 
            playNextSong(); 
        })
        .pipe(player.play(), { end: true }); // Reproduce el audio
}

const app = express();
const PORT = 3002;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/add-song', (req, res) => {
    const songTitle = req.query.title;
    if (songTitle) {
        searchAndAddSong(songTitle, 'usuario'); // Cambia 'usuario' por el nombre real si es necesario
        res.send('Canción agregada');
    } else {
        res.status(400).send('Título de la canción requerido');
    }
});

app.get('/songs', (req, res) => {
    res.json(songList);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

client.on('message', (channel, tags, message, self) => {
    if (self) return;

    if (message.startsWith('!rola')) {
        const songTitle = message.slice(6).trim(); 
        searchAndAddSong(songTitle, tags.username);
    } else if (message.startsWith('!otra')) {
        if (isPlaying) {
            playNextSong();
            client.say(channel, `Canción saltada.`);
        } else {
            client.say(channel, `No hay canción en reproducción.`);
        }
    } else if (message.startsWith('!limpiar')) {
        songList = [];
        client.say(channel, `Lista de canciones limpiada.`);
    }
});