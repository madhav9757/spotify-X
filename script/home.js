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
                document.getElementById(`card-img-${e}`).src = bcd.img;
            } catch (error) {
                console.error(`Failed to load JSON for ${e}`, error);
            }
        });

    } catch (error) {
        console.log("error : " + error);
    }
}

FindFolder();

const playPauseBtn = document.getElementById("play");
const tracklistContainer = document.querySelector('.tracklist');

let audio = null;
let songList = [];
let currentTrack = null; // Track currently playing

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

        const durationPromises = songList.map(song => getAudioDuration(song.source));
        const durations = await Promise.all(durationPromises);

        let totalMinutes = 0;
        let html = songList.map((song, i) => {
            const formattedDuration = formatTime(durations[i]);
            totalMinutes += durations[i];
            return `<div class="track track-row" data-src="${song.source}" data-title="${song.title}">
                    <div>${i + 1}</div>
                    <div class="track-title-wrapper">
                        <strong>${song.title}</strong>
                        <span class="now-playing-badge" style="display:none;">Now Playing</span>
                    </div>
                    <div>${formattedDuration}</div>
                    <button class="track-play play-btn invert">
                        <img src="icons/play.png" alt="Play">
                    </button>
                </div>`;
        }).join('');

        document.getElementById('total-min').textContent = formatTime(totalMinutes);
        // Inject HTML into the tracklist section
        document.querySelector('.tracklist').innerHTML = html;


        document.querySelectorAll('.track-row').forEach(row => {
            row.addEventListener('click', async (e) => {
                const src = row.getAttribute('data-src');
                const title = row.getAttribute('data-title');

                document.querySelector('.music-footer').style.display = 'flex' ;
                // Remove 'active' from others
                document.querySelectorAll('.track-row').forEach(t => {
                    t.classList.remove('active');
                    const badge = t.querySelector('.now-playing-badge');
                    if (badge) badge.style.display = 'none';
                });

                // Set active and show badge
                row.classList.add('active');
                const badge = row.querySelector('.now-playing-badge');
                if (badge) badge.style.display = 'block';

                const button = row.querySelector('.play-btn');
                button.classList.add('loading');

                try {
                    playMusic(src, title, row);
                    // Instead of setting one combined duration, update current and total times separately
                    const total = formatTime(audio.duration);
                    document.getElementById('current-time').textContent = "00:00";
                    document.getElementById('total-time').textContent = total;
                    audio.addEventListener("timeupdate", updateTime);

                    // Change both player and row button to pause
                    playPauseBtn.src = 'icons/pause.svg';
                    button.src = "icons/pause.svg";
                    document.querySelector('.music-footer').style.display = 'flex';
                    document.querySelector('.music-footer').scrollIntoView({ behavior: 'smooth' });

                    await new Promise(res => setTimeout(res, 300));
                } catch (err) {
                    console.warn("Track load/play error:", err);
                } finally {
                    button.classList.remove('loading');
                }
            });
        });


    } catch (error) {
        console.error("Error fetching songs:", error);
    }
}

function updateNowPlayingBadge(row) {
    if (!row) return;

    // First remove all active states and badges
    document.querySelectorAll('.track-row').forEach(t => {
        t.classList.remove('active');
        const badge = t.querySelector('.now-playing-badge');
        if (badge) {
            badge.style.display = 'none';
            badge.style.opacity = '0';
        }
    });

    // Then add to current row
    row.classList.add('active');
    const badge = row.querySelector('.now-playing-badge');
    if (badge) {
        badge.style.display = 'inline-block';
        badge.style.opacity = '1';

        // Force reflow to ensure animation works
        void badge.offsetWidth;
    }
}

function playMusic(source, title, row) {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    // Reset progress bar and seek circle to the beginning
    const progressBar = document.querySelector('.progress-bar');
    const circle = document.querySelector('.seek-circle');
    if (progressBar) progressBar.style.width = "0%";
    if (circle) circle.style.left = "0%";

    playPauseBtn.src = 'icons/pause.svg';
    document.getElementById('track-title').textContent = title;

    audio = new Audio(source);

    // ✅ Real-time progress update
    audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        if (progressBar) progressBar.style.width = percent + "%";
        if (circle) circle.style.left = percent + "%";
    });

    // Optional: auto-update Now Playing badge
    if (row) {
        updateNowPlayingBadge(row);
    }

    // Check if audio is already playing
    // Check if audio is already playing
    if (audio.paused && !playing) { // Check the playing flag
        console.log("Audio state before play:", audio.paused);
        playing = true; // Set the flag
        audio.play().then(() => {
            playing = false; // Clear the flag when playback starts
        }).catch(err => {
            playing = false; // Clear the flag if play fails
        console.warn("Play interrupted:", err);
    });
    }
}



playPauseBtn.addEventListener('click', async () => {
    if (!audio) return;

    // Disable button briefly to avoid rapid clicks
    playPauseBtn.disabled = true;

    try {
        if (audio.paused) {
            await audio.play();
            playPauseBtn.src = '/icons/pause.svg';
        } else {
            audio.pause();
            playPauseBtn.src = "icons/play.svg";
        }
    } catch (err) {
        console.warn("Play/Pause error:", err);
    }

    // Re-enable after short delay
    setTimeout(() => {
        playPauseBtn.disabled = false;
    }, 300);
});

function updateTime() {
    if (!audio) return;
    const currentTime = formatTime(audio.currentTime);
    const totalDuration = formatTime(audio.duration);
    // Update the two separate time displays
    document.getElementById('current-time').textContent = currentTime;
    document.getElementById('total-time').textContent = totalDuration;
    // Use the new footer seekbar class for the circle
    const circle = document.querySelector('.seek-circle');
    if (circle) {
        circle.style.left = (audio.currentTime / audio.duration) * 100 + "%";
    }

    if (currentTime === totalDuration) {
        const currentSrc = audio.src.split('/').slice(-1)[0];
        const index = songList.findIndex(song =>
            song.source.endsWith(currentSrc)
        );

        if (index !== -1 && index + 1 < songList.length) {
            const row = document.querySelector(`.track-row[data-src="${songList[index + 1].source}"]`);
            playMusic(songList[index + 1].source, songList[index + 1].title, row);
        }
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// Update the seekbar listener to use the new footer-seekbar class
document.querySelector('.seekbar').addEventListener('click', (e) => {
    if (!audio || !audio.duration) return;

    const seekbar = e.currentTarget;
    const rect = seekbar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percent = (offsetX / rect.width) * 100;
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = percent + "%";
    }

    const circle = document.querySelector('.seek-circle');
    if (circle) {
        circle.style.left = percent + "%";  // Move the circle
    }

    // Update audio current time based on the clicked position
    audio.currentTime = (audio.duration * percent) / 100;

});


document.getElementById('prev').addEventListener('click', () => {
    const currentSrc = audio.src.split('/').slice(-1)[0];
    const index = songList.findIndex(song =>
        song.source.endsWith(currentSrc)
    );

    if (index - 1 >= 0) {
        const row = document.querySelector(`.track-row[data-src="${songList[index - 1].source}"]`);
        playMusic(songList[index - 1].source, songList[index - 1].title, row);
    }
});

document.getElementById('next').addEventListener('click', () => {
    const currentSrc = audio.src.split('/').slice(-1)[0];
    const index = songList.findIndex(song =>
        song.source.endsWith(currentSrc)
    );

    if (index !== -1 && index + 1 < songList.length) {
        const row = document.querySelector(`.track-row[data-src="${songList[index + 1].source}"]`);
        playMusic(songList[index + 1].source, songList[index + 1].title, row);
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
        volumeIcon.src = "icons/mute.svg"
        isMuted = true;
    } else {
        audio.volume = 0.51;  // Or any reasonable default like 50%
        volumeSlider.value = 51;
        volumeIcon.src = "icons/med-vol.svg"
        isMuted = false;
    }
    updateVolumeIcon(audio.volume);
});

function updateVolumeIcon(volume) {
    if (volume === 0) {
        volumeIcon.src = "icons/mute.svg";
    } else if (volume <= 0.3 && volume > 0) {
        volumeIcon.src = "icons/low-vol.svg";
    } else if (volume <= 0.6 && volume > 0.3) {
        volumeIcon.src = "icons/med-vol.svg";
    } else {
        volumeIcon.src = "icons/high-vol.svg";
    }
}


document.getElementById('close-btn-ye').addEventListener('click', () => {
    document.querySelector('.spotify-app').style.display = 'none';
});
