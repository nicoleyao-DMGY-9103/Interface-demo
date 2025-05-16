let playerImg;
let angle = 0;
let vinylImages = []; // Store multiple vinyl record images
let currentVinylIndex = 0; // Current displayed vinyl index
let vinylScale = 0.28; // Scale variable
let tonearmScale = 0.65;
let backgroundImages = []; // Store background images
let startImg; // Start image
let endImg; // End image
let voiceImg; // Voice image
let pauseImg; // Pause image
let listImg; // List image
let shareImg; // Share image

// Lyrics related variables
let lyrics = [];
let currentLyricIndex = 0;
let lyricChangeInterval = 3000; // Change lyrics every 3 seconds
let lastLyricChangeTime = 0;
let lyricFadeIn = 0; // For fade-in effect

// Create canvas element
let canvas;

function preload() {
  // Preload images
  playerImg = loadImage('../tonearm.png');
  startImg = loadImage('../start.svg');
  endImg = loadImage('../end.svg');
  voiceImg = loadImage('../Voice.svg');
  pauseImg = loadImage('../Pause.svg');
  listImg = loadImage('../List.svg');
  shareImg = loadImage('../Share.svg');

  // Load multiple vinyl images
  vinylImages.push(loadImage('../v1.png'));
  vinylImages.push(loadImage('../v2.png'));
  vinylImages.push(loadImage('../v3.png'));
  vinylImages.push(loadImage('../v4.png'));

  // Load background images
  backgroundImages.push(loadImage('../b1.png'));
  backgroundImages.push(loadImage('../b2.png'));
  backgroundImages.push(loadImage('../b3.png'));
  backgroundImages.push(loadImage('../b4.png'));

  // Load lyrics file
  loadStrings('../text.txt', function(result) {
    lyrics = result;
  });
}

function setup() {
  // Create canvas and add to the displayContainer
  const displayContainer = document.getElementById('displayContainer');
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent(displayContainer);
  
  imageMode(CENTER);
  
  // Initialize lyrics time
  lastLyricChangeTime = millis();
  
  // Set up category button click handlers
  setupCategoryButtons();
}

// Set up the category buttons
function setupCategoryButtons() {
  const categoryButtons = document.querySelectorAll('.category-button');
  
  categoryButtons.forEach((button, index) => {
    button.addEventListener('click', function() {
      // Update active state
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Change vinyl index
      currentVinylIndex = index;
      
      // Show toast message
      showToast(`Selected ${this.textContent} category stories`);
    });
  });
  
  // Set the first button as active by default
  if (categoryButtons.length > 0) {
    categoryButtons[0].classList.add('active');
  }
}

function draw() {
  background("#f6ecc9");
  drawShowMode();
}

// Display mode drawing
function drawShowMode() {
  // Draw background image based on current vinyl index
  if (backgroundImages[currentVinylIndex]) {
    let bgImg = backgroundImages[currentVinylIndex];
    let imgRatio = bgImg.width / bgImg.height;
    let canvasRatio = width / height;
    let drawWidth, drawHeight;
    
    if (imgRatio > canvasRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
    }
    
    // Draw centered background image
    imageMode(CENTER);
    image(bgImg, width/2, height/2, drawWidth, drawHeight);
  }
  
  // Display lyrics
  displayLyrics();
  
  // Draw bottom control icons
  if (voiceImg && pauseImg && listImg && shareImg) {
    let iconHeight = height * 0.04; // Set icon height to 4% of screen height
    let iconWidth = iconHeight; // Keep icons square
    let spacing = width * 0.05; // Set spacing between icons to 5% of screen width
    let startX = (width - (iconWidth * 4 + spacing * 3)) / 2; // Calculate starting x-coordinate to center icons
    
    // Draw voice icon
    imageMode(CENTER);
    image(voiceImg, startX + iconWidth/2, height - iconHeight/2 - 50, iconWidth, iconHeight);
    
    // Draw pause icon
    image(pauseImg, startX + iconWidth + spacing + iconWidth/2, height - iconHeight/2 - 50, iconWidth, iconHeight);
    
    // Draw list icon
    image(listImg, startX + (iconWidth + spacing) * 2 + iconWidth/2, height - iconHeight/2 - 50, iconWidth, iconHeight);
    
    // Draw share icon
    image(shareImg, startX + (iconWidth + spacing) * 3 + iconWidth/2, height - iconHeight/2 - 50, iconWidth, iconHeight);
  }
  
  // Draw start and end images
  if (startImg && endImg) {
    let sideImgHeight = height * 0.05; // Set side image height to 5% of screen height
    let sideImgWidth = sideImgHeight * (startImg.width / startImg.height); // Maintain aspect ratio
    
    // Draw left side start image
    imageMode(CENTER);
    image(startImg, sideImgWidth/2 + 300, height/2, sideImgWidth, sideImgHeight);
    
    // Draw right side end image
    image(endImg, width - sideImgWidth/2 - 300, height/2, sideImgWidth, sideImgHeight);
  }
  
  // Rotate vinyl record
  if (vinylImages[currentVinylIndex]) {
    push();
    translate(width/2, height/2); 
    rotate(angle);
    scale(vinylScale);
    image(vinylImages[currentVinylIndex], 0, 0);
    pop();
  }
  
  // Continuously increase angle
  angle += 0.01;

  // Draw tonearm
  if (playerImg) {
    push();
    scale(tonearmScale);
    image(playerImg, width/(tonearmScale*2), height/(tonearmScale*2));
    pop();
  }
}

// Display lyrics function
function displayLyrics() {
  if (lyrics.length === 0) return;
  
  // Check if we should switch to the next lyric
  let currentTime = millis();
  if (currentTime - lastLyricChangeTime > lyricChangeInterval) {
    currentLyricIndex = (currentLyricIndex + 1) % lyrics.length;
    lastLyricChangeTime = currentTime;
    lyricFadeIn = 0; 
  }
  
  // Calculate fade-in effect
  if (lyricFadeIn < 255) {
    lyricFadeIn += 5;
  }
  
  // Draw current lyric
  if (lyrics[currentLyricIndex]) {
    textAlign(CENTER, CENTER);
    textSize(28);
    
    // Set lyric position at the top of the screen
    let topMargin = 70; // 70 pixels from the top
    
    // Add text shadow effect
    fill(0, 0, 0, lyricFadeIn * 0.7);
    text(lyrics[currentLyricIndex], width/2 + 2, topMargin + 2);
    
    // Draw main text
    fill(255, 255, 255, lyricFadeIn);
    text(lyrics[currentLyricIndex], width/2, topMargin);
  }
}

// When window size changes, adjust canvas size
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Show temporary toast message
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Remove toast after 2 seconds
  setTimeout(() => {
    toast.classList.add('fadeOut');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 500);
  }, 2000);
}

// Initialize when page loads
window.addEventListener('load', function() {
  // The return button is now directly in the HTML
}); 