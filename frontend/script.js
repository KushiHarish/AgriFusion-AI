// Stage info content
const stageContent = {
  soil: "Soil Testing: Check pH, nutrients, and texture to prepare your land for optimal crop growth.",
  seed: "Seed Selection: Choose high-quality seeds that are suitable for your soil and climate.",
  irrigation: "Irrigation: Select the best irrigation method based on your crop and water availability.",
  fertilizer: "Fertilizers: Apply the right type and amount of fertilizer at each growth stage.",
  harvest: "Harvesting: Use proper harvesting techniques to maximize yield and minimize loss.",
  storage: "Storage: Store your produce in appropriate conditions to maintain quality.",
  next: "Next Crop: Plan crop rotation to maintain soil fertility and reduce pests."
};

// Function to position circles in a perfect circle
function positionCircles() {
  const circles = document.querySelectorAll('.circle');
  const container = document.querySelector('.circle-container');

  const centerX = container.offsetWidth / 2;
  const centerY = container.offsetHeight / 2;
  const radius = 150; // adjust radius as needed

  const total = circles.length;
  circles.forEach((circle, i) => {
    const angle = (i / total) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle) - circle.offsetWidth / 2;
    const y = centerY + radius * Math.sin(angle) - circle.offsetHeight / 2;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
  });
}

// Initial positioning
positionCircles();

// Reposition on window resize
window.addEventListener('resize', positionCircles);

// Add click event listeners to update info and active class
document.querySelectorAll('.circle').forEach(circle => {
  circle.addEventListener('click', (e) => {
    e.preventDefault();
    const stage = circle.dataset.stage;

    // Update stage info
    const infoBox = document.getElementById('stage-info');
    if (infoBox) {
      infoBox.innerHTML = `<p>${stageContent[stage]}</p>`;
    }

    // Update active class
    document.querySelectorAll('.circle').forEach(c => c.classList.remove('active'));
    circle.classList.add('active');
  });
});
