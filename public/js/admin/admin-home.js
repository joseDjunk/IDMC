// document.getElementById("alert").style.display = "none";
document.querySelectorAll(".add-lead-btn").forEach((button) => {
  button.addEventListener("click", function () {
    const leadId = this.getAttribute("data-lead-id");
    const dmcSelect = document.querySelector(
      `.dmc-select[data-lead-id='${leadId}']`
    );
    const dmcId = dmcSelect.value;

    fetch("/update-dmc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ leadId, dmcId }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("DMC updated successfully.");
        } else {
          alert("Failed to update DMC.");
        }
      })
      .catch((error) => console.error("Error:", error));
  });
});
function showModal() {
  document.getElementById("modal-header").innerHTML = "This is the header";
  document.getElementById("modal-content").innerHTML = "This is the Content";
}
function deleteLead() {
  if (confirm("Are you sure you want to save this thing into the database?")) {
    window.location.reload();
  } else {
    return false;
  }
}
