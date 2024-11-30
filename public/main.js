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
  const systemPrefersDark = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches

  if (savedTheme) {
    setTheme(savedTheme)
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

    data.urls.forEach((url, index) => {
      const img = document.createElement('img')
      img.src = url
      img.alt = `Photo ${index + 1}`
      img.className = 'photo'

      const photoDiv = document.createElement('div')
      photoDiv.className = 'photo-container'
      photoDiv.appendChild(img)

      photosContainer.appendChild(photoDiv)
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
})
