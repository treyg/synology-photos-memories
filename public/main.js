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
        img.alt = `Photo from ${new Date(
          photo.time * 1000
        ).toLocaleDateString()}`
        img.className = 'photo'

        // Add click handler to open full-size photo
        img.addEventListener('click', () => {
          window.open(photo.thumbnailUrl, '_blank')
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
})
