document.getElementById("searchParams").style.display = "none";
function showModal() {
  setTimeout(hideModal, 1000);
}
function hideModal() {
  document.getElementById("searchParams").style.display = "block";
  document.getElementById("verify-button").style.display = "none";
  document.getElementById("verifyCustomer").style.display = "none";
}
