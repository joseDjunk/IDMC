$(document).ready(function () {
  // Handle button click
  $("#agentsTable").on("click", ".add-lead-btn", function () {
    var agentId = $(this).data("agent-id");
    window.location.href = `/mm/addVisitPage?agent_id=${agentId}`;
  });
});
