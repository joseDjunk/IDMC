function submitRow(rowId) {
  // Get the elements
  const amountElement = document.querySelector(`#amount-${rowId}`);
  const statusElement = document.querySelector(`#status-${rowId}`);

  // Check if the elements exist
  if (!amountElement || !statusElement) {
    console.error(
      `Elements with ID amount-${rowId} or status-${rowId} not found.`
    );
    return;
  }

  // Get the values
  const amount = amountElement.value;
  const status = statusElement.value;

  // Log the values (for debugging purposes)
  console.log(`Amount: ${amount}, Status: ${status},Id: ${rowId}`);
  var request = $.ajax({
    url: "updateLead",
    type: "POST",
    data: { lead_id: rowId, amount: amount, status: status },
    // dataType: "html",
  });

  request.done(function (response) {
    // $("#log").html(msg);
    if (response.status == 1) {
      location.reload();
    }
  });

  request.fail(function (jqXHR, textStatus) {
    console.log("Succesfully completed the ajax call" + textStatus);
  });
}
