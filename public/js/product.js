document.addEventListener("DOMContentLoaded", function domLoaded() {
  var creatorEl = document.getElementById("creator");
  var creatorDetailsEl = document.getElementById("creator-details");
  var closeCreatorDetailsBtn = document.getElementById(
    "close-creator-details-btn"
  );

  if (!creatorEl || !creatorDetailsEl) {
    console.warn("No creator/creator-details elements.");
    return;
  }

  creatorEl.addEventListener(
    "click",
    function creatorClick(e) {
      if (creatorDetailsEl.contains(e.target)) return;
      creatorDetailsEl.classList.toggle("hidden");
    },
    false
  );

  if (closeCreatorDetailsBtn) {
    closeCreatorDetailsBtn.addEventListener("click", function closeClick() {
      creatorDetailsEl.classList.add("hidden");
    });
  }
});
