const songListElement = document.getElementById('song-list');

// Función para actualizar la lista de canciones
function updateSongList(songs) {
    songListElement.innerHTML = ''; // Limpia la lista actual
    songs.forEach(song => {
        const li = document.createElement('li');
        li.textContent = song.title; // Añade cada canción como un elemento de lista
        songListElement.appendChild(li);
    });
}

// Aquí puedes hacer una llamada a tu servidor para obtener la lista de canciones
async function fetchSongs() {
    try {
        const response = await fetch('/songs'); // Ruta para obtener las canciones
        if (response.ok) {
            const songs = await response.json();
            updateSongList(songs);
        } else {
            console.error('Error al obtener canciones:', response.statusText);
            alert('No se pudo obtener la lista de canciones. Intenta de nuevo más tarde.');
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('Hubo un problema al conectarse al servidor. Intenta de nuevo más tarde.');
    }
}

// Llama a la función al cargar la página
fetchSongs();

// Opcional: refrescar la lista cada ciertos segundos (por ejemplo, cada 10 segundos)
setInterval(fetchSongs, 10000);