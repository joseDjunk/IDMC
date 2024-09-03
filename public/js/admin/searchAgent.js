$(document).ready(function () {
  // Handle button click
  $("#agentsTable").on("click", ".add-lead-btn", function () {
    var agentId = $(this).data("agent-id");
    window.location.href = `/admin/addLeadPage?agent_id=${agentId}`;
  });
});
