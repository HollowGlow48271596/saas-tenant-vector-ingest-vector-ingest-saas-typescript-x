export {};

const response = await fetch("http://localhost:3000/tenant-documents/ingest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenantId: "acme-cloud",
    accountStatus: "active",
    operation: "tenant_onboarding",
    documents: [{
      documentId: "admin-handbook",
      title: "Workspace administration handbook",
      content: "Invite workspace members from Admin > People. Assign the least privileged role that fits their work.\n\nSuspend an account when access needs to pause while preserving its workspace history."
    }]
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
