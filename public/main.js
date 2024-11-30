async function fetchPhotos() {
  try {
    const response = await fetch('/api/photos');
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    const photosContainer = document.getElementById('photos');
    photosContainer.innerHTML = '';

    data.urls.forEach((url, index) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Photo ${index + 1}`;
      img.className = 'photo';
      
      const photoDiv = document.createElement('div');
      photoDiv.className = 'photo-container';
      photoDiv.appendChild(img);
      
      photosContainer.appendChild(photoDiv);
    });
  } catch (error) {
    console.error('Error:', error);
    const photosContainer = document.getElementById('photos');
    photosContainer.innerHTML = `<div class="error">Error loading photos: ${error.message}</div>`;
  }
}

// Load photos when the page loads
document.addEventListener('DOMContentLoaded', fetchPhotos);
