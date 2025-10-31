// -------------------------------
// 🌿 Stage Info Content
// -------------------------------
const stageContent = {
  soil: "Soil Testing: Check pH, nutrients, and texture to prepare your land for optimal crop growth.",
  seed: "Seed Selection: Choose high-quality seeds that are suitable for your soil and climate.",
  irrigation: "Irrigation: Select the best irrigation method based on your crop and water availability.",
  disease: "Disease Prediction: Upload a leaf image to detect plant diseases using AI and get treatment suggestions.",
  fertilizer: "Fertilizers: Apply the right type and amount of fertilizer at each growth stage.",
  harvest: "Harvesting: Use proper harvesting techniques to maximize yield and minimize loss.",
  storage: "Storage: Store your produce in appropriate conditions to maintain quality.",
  next: "Next Crop: Plan crop rotation to maintain soil fertility and reduce pests."
};

// -------------------------------
// 🌾 Function to position circles in a perfect circle
// -------------------------------
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

// Reposition circles dynamically when window resizes
window.addEventListener('resize', positionCircles);

// -------------------------------
// 🌱 Add click behavior for each stage circle
// -------------------------------
document.querySelectorAll('.circle').forEach(circle => {
  circle.addEventListener('click', (e) => {
    e.preventDefault();
    const stage = circle.dataset.stage;

    // ✅ Update stage description box
    const infoBox = document.getElementById('stage-info');
    if (infoBox) {
      infoBox.innerHTML = `<p>${stageContent[stage]}</p>`;
    }

    // ✅ Highlight selected circle
    document.querySelectorAll('.circle').forEach(c => c.classList.remove('active'));
    circle.classList.add('active');

    // ✅ Redirect for specific stages
    if (stage === "seed") {
      window.location.href = "seed_selection.html";
    } 
    else if (stage === "irrigation") {
      window.location.href = "irrigation.html";
    }
    else if (stage === "disease") {
      window.location.href = "disease.html"; // 🌿 Disease prediction page
    }
    else if (stage === "storage") {
      window.location.href = "fertiliser.html"; // optional
    }
    else if (stage === "next") {
      window.location.href = "next_crop.html";
    }
  });
});
