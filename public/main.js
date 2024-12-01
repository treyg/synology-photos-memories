// Theme toggle functionality
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

function toggleTheme() {
  const currentTheme = localStorage.getItem('theme')
  const systemPrefersDark = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches

  if (!currentTheme) {
    setTheme(systemPrefersDark ? 'light' : 'dark')
    return
  }

  setTheme(currentTheme === 'light' ? 'dark' : 'light')
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    setTheme(savedTheme)
  }
}

// Lightbox functionality
let currentPhotoIndex = 0;
let currentGroupPhotos = [];

function openLightbox(photo, groupPhotos) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  
  currentGroupPhotos = groupPhotos;
  currentPhotoIndex = groupPhotos.findIndex(p => p.thumbnailUrl === photo.thumbnailUrl);
  
  lightboxImg.src = photo.thumbnailUrl;
  lightboxImg.alt = `Photo from ${new Date(photo.time * 1000).toLocaleDateString()}`;
  lightbox.classList.add('active');
  
  // Prevent scrolling on the body when lightbox is open
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function showNextPhoto() {
  if (currentPhotoIndex < currentGroupPhotos.length - 1) {
    currentPhotoIndex++;
    const nextPhoto = currentGroupPhotos[currentPhotoIndex];
    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = nextPhoto.thumbnailUrl;
    lightboxImg.alt = `Photo from ${new Date(nextPhoto.time * 1000).toLocaleDateString()}`;
  }
}

function showPrevPhoto() {
  if (currentPhotoIndex > 0) {
    currentPhotoIndex--;
    const prevPhoto = currentGroupPhotos[currentPhotoIndex];
    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = prevPhoto.thumbnailUrl;
    lightboxImg.alt = `Photo from ${new Date(prevPhoto.time * 1000).toLocaleDateString()}`;
  }
}

// Handle keyboard navigation
function handleKeyPress(event) {
  if (!document.getElementById('lightbox').classList.contains('active')) return;
  
  switch (event.key) {
    case 'Escape':
      closeLightbox();
      break;
    case 'ArrowRight':
      showNextPhoto();
      break;
    case 'ArrowLeft':
      showPrevPhoto();
      break;
  }
}

async function fetchPhotos() {
  try {
    const response = await fetch('/api/photos')
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    const photosContainer = document.getElementById('photos')
    photosContainer.innerHTML = ''

    data.groups.forEach(group => {
      // Create group container
      const groupContainer = document.createElement('div')
      groupContainer.className = 'photo-group'

      // Add group title
      const groupTitle = document.createElement('h2')
      groupTitle.className = 'group-title'
      groupTitle.textContent = group.title
      groupContainer.appendChild(groupTitle)

      // Add photos grid
      const photosGrid = document.createElement('div')
      photosGrid.className = 'photos-grid'

      group.photos.forEach(photo => {
        const photoDiv = document.createElement('div')
        photoDiv.className = 'photo-container'

        const img = document.createElement('img')
        img.src = photo.thumbnailUrl
        img.alt = `Photo from ${new Date(photo.time * 1000).toLocaleDateString()}`
        img.className = 'photo'

        // Update click handler to use lightbox
        img.addEventListener('click', () => {
          openLightbox(photo, group.photos)
        })

        photoDiv.appendChild(img)
        photosGrid.appendChild(photoDiv)
      })

      groupContainer.appendChild(photosGrid)
      photosContainer.appendChild(groupContainer)
    })
  } catch (error) {
    console.error('Error:', error)
    const photosContainer = document.getElementById('photos')
    photosContainer.innerHTML = `<div class="error">Error loading photos: ${error.message}</div>`
  }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initTheme()
  fetchPhotos()

  // Add theme toggle listener
  const themeToggle = document.getElementById('theme-toggle')
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme)
  }

  // Add lightbox event listeners
  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  document.querySelector('.lightbox-next').addEventListener('click', showNextPhoto);
  document.querySelector('.lightbox-prev').addEventListener('click', showPrevPhoto);
  document.addEventListener('keydown', handleKeyPress);
  
  // Close lightbox when clicking outside the image
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') {
      closeLightbox();
    }
  });
})
