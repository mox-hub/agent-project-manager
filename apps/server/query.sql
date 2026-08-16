SELECT p.id, p.name, p.externalProjectId, p.externalProvider, tpl.integrationId as "integrationId"
FROM "Project" p
LEFT JOIN "TaskProviderLink" tpl ON p.id = tpl."projectId"
WHERE p.name LIKE '%agent%';
