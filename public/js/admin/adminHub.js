function disableOtherButtons(focusedEmpId) {
  // Get all buttons
  const buttons = document.querySelectorAll("button");

  // Disable all buttons except the one related to the focused input
  buttons.forEach((button) => {
    if (button.id !== "targetUpdateButton_" + focusedEmpId) {
      button.disabled = true;
    }
  });

  try {
    // Enable the button corresponding to the focused input field
    document.getElementById(
      "targetUpdateButton_" + focusedEmpId
    ).disabled = false;
  } catch (error) {}
}

function enableAllButtons() {
  // Enable all buttons after the input field loses focus
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = false;
  });
}

function UpdateFn(empId) {
  // Get the target amount based on the emp_id
  const targetAmount = document.getElementById("targetAmount_" + empId).value;

  disableOtherButtons(1);
  updateTargetAmount(empId, targetAmount);
}
function updateTargetAmount(empId, targetAmount) {
  const url = `updateTargetAmount?empId=${empId}&targetAmount=${targetAmount}`;

  fetch(url, {
    method: "POST",
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((err) => {
          throw new Error(err);
        });
      }
      return response.text();
    })
    .then((data) => {
      console.log("Updated ");
    })
    .catch((error) => {
      alert("Error in adding collection: " + error.message);
    });
}
