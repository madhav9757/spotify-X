const folderCart = document.querySelector('.cart-section');

async function FindFolder() {
    try {
        let response = await fetch('/api/songs');  // <-- Calls Express API
        let songs = await response.json();

        folderCart.innerHTML = songs.map(folder => `
            <div class="song-card" onClick="loadSongs('${folder}')">
                <div class="album-art">
                    <img src="" alt="Album Art" id="card-img-${folder}">
                    <button class="play-button">&#9654;</button>
                </div>
                <div class="song-info">
                    <p class="song-title">${folder}</p>
                </div>
            </div>
        `).join('');

        songs.forEach(async (e) => {
            try {
                let anc = await fetch(`/songs/${e}/${e}.json`);
                let bcd = await anc.json();
                playlistImage = bcd.img;
                document.getElementById(`card-img-${e}`).src = playlistImage;
            } catch (error) {
                console.error(`Failed to load JSON for ${e}`, error);
            }
        });

    } catch (error) {
        console.log("error : " + error);
    }
}
FindFolder();

const listSong = document.querySelector('.cart-song-list');
const playPauseBtn = document.getElementById("play");
const tracklistContainer = document.querySelector('.tracklist');

let audio = null;
let songList = [];

async function loadSongs(folder) {
    document.querySelector('.spotify-app').style.display = 'flex';

    try {
        const response = await fetch(`/api/songs/${folder}`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const files = await response.json();
        const { foldername } = files;

        const anc = await fetch(`/songs/${folder}/${folder}.json`);
        const songs = await anc.json();
        document.getElementById('playlist-img').src = songs.img;

        songList = files
            .filter(file => file.endsWith('.mp3') || file.endsWith('.m4a') || file.endsWith('.flac'))
            .map(file => ({
                title: decodeURIComponent(file.replace(/\.(mp3|flac|m4a)$/, '')),
                source: `/songs/${folder}/${encodeURIComponent(file)}`
            }));

        // Helper to get audio duration
        async function getAudioDuration(src) {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.src = src;
                audio.addEventListener('loadedmetadata', () => {
                    resolve(audio.duration);
                });
                audio.addEventListener('error', () => resolve(0));
            });
        }

        document.getElementById('total-songs').textContent = songList.length ;
        let html = '';
        let totalMinutes = 0;
        
        for (let i = 0; i < songList.length; i++) {
            const song = songList[i];
            const duration = await getAudioDuration(song.source);
            const formattedDuration = formatTime(duration);
            totalMinutes += duration ;
            
            html += `
            <div class="track">
            <div>${i + 1}</div>
            <div><strong>${song.title}</strong></div>
            <div>${formattedDuration}</div>
            <button class="track-play play-btn invert" data-src="${song.source}" data-title="${song.title}">
            <img src="icons/play.png" alt="Play">
            </button>
            </div>
            `;
        }
        
        document.getElementById('total-min').textContent = formatTime(totalMinutes) ;
        // Inject HTML into the tracklist section
        document.querySelector('.tracklist').innerHTML = html;

        // Set up button click listeners
        document.querySelectorAll('.play-btn').forEach(button => {
            button.addEventListener('click', () => {
                const src = button.getAttribute('data-src');
                const title = button.getAttribute('data-title');
                playMusic(src, title);
            });
        });

    } catch (error) {
        console.error("Error fetching songs:", error);
    }
}


function playMusic(source, title) {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    playPauseBtn.src = 'https://cdn-icons-png.flaticon.com/512/9513/9513367.png';
    document.getElementById('title-name').textContent = title;

    audio = new Audio(source);

    audio.addEventListener('loadedmetadata', () => {
        const total = formatDuration(audio.duration);
        document.getElementById('duration').textContent = `00:00 / ${total}`;
        audio.addEventListener("timeupdate", updateTime);
    });

    audio.play();

    document.querySelectorAll('.song-cart').forEach(cart => {
        cart.classList.remove('playing');
        if (cart.querySelector("h3").textContent.trim() === title) {
            cart.classList.add('playing');
        }
    });
}

playPauseBtn.addEventListener('click', () => {
    if (!audio) return;

    if (audio.paused) {
        audio.play();
        playPauseBtn.src = 'https://cdn-icons-png.flaticon.com/512/9513/9513367.png';
    } else {
        audio.pause();
        playPauseBtn.src = "https://cdn-icons-png.flaticon.com/512/18941/18941526.png";
    }
});

function updateTime() {
    if (!audio) return;
    const currentTime = formatTime(audio.currentTime);
    const totalDuration = formatTime(audio.duration);
    document.getElementById('duration').textContent = `${currentTime} / ${totalDuration}`;
    document.querySelector('.circle').style.left = (audio.currentTime / audio.duration) * 100 + "%";

    if (audio.ended) {
        let temp_2 = audio.src.split('/').slice(-2).join('/');
        const index = songList.findIndex(songList => songList.source.endsWith(temp_2));
        if (index !== -1 && index + 1 < songList.length) {
            playMusic(songList[index + 1].source, songList[index + 1].title);
        }
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

document.querySelector('.seekbar').addEventListener('click', (e) => {
    if (!audio) return;
    let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
    document.querySelector('.circle').style.left = percent + "%";
    audio.currentTime = ((audio.duration) * percent) / 100;
});

document.getElementById('previous').addEventListener('click', () => {
    let temp_2 = decodeURIComponent(audio.src.split('/').slice(-1).join('/').replace(/\.(mp3|flac)$/, ''));
    const index = songList.findIndex(songList => songList.title === temp_2);

    if (index - 1 >= 0) {
        playMusic(songList[index - 1].source, songList[index - 1].title);
    }
});

document.getElementById('next').addEventListener('click', () => {
    let temp_2 = decodeURIComponent(audio.src.split('/').slice(-1).join('/').replace(/\.(mp3|flac)$/, ''));
    const index = songList.findIndex(songList => songList.title === temp_2);

    if (index !== -1 && index + 1 < songList.length) {
        playMusic(songList[index + 1].source, songList[index + 1].title);
    }
});

const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volume');
let isMuted = false;

volumeSlider.addEventListener('input', (e) => {
    if (!audio) return;
    let volume = parseInt(e.target.value) / 100;
    audio.volume = volume;
    isMuted = (volume === 0);
    updateVolumeIcon(volume);
});

volumeIcon.addEventListener("click", () => {
    if (!audio) return;

    if (!isMuted) {
        audio.volume = 0;
        volumeSlider.value = 0;
        isMuted = true;
    } else {
        audio.volume = 0.51;
        volumeSlider.value = 51;
        isMuted = false;
    }
    updateVolumeIcon(audio.volume);
});

function updateVolumeIcon(volume) {
    if (volume === 0) {
        volumeIcon.src = "https://images.icon-icons.com/3106/PNG/512/sound_speaker_mute_sound_off_icon_191602.png";
    } else if (volume < 0.5) {
        volumeIcon.src = "https://images.icon-icons.com/3415/PNG/512/low_sound_icon_218201.png";
    } else {
        volumeIcon.src = "https://images.icon-icons.com/3691/PNG/512/music_loud_sound_audio_icon_229540.png";
    }
}

document.getElementById('close-btn-ye').addEventListener('click', () => {
    document.querySelector('.spotify-app').style.display = 'none';
})