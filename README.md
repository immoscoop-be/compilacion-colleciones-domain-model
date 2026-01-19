# compilacion-colleciones-domain-model
domain models including compilations of compilacion

## Confluence exporter
The `Confluence` exporter publishes the domain model pages to Confluence Cloud.

### Environment variables
- `CONFLUENCE_ENABLED=true` to enable publishing.
- `CONFLUENCE_BASE_URL=https://immoscoop.atlassian.net`
- `CONFLUENCE_SPACE_KEY=DATA`
- `CONFLUENCE_PARENT_PAGE_ID=1102413825`
- `CONFLUENCE_EMAIL=you@example.com`
- `CONFLUENCE_API_TOKEN=your_api_token`

### Structure
Under the parent page, it creates one page per domain model. Under that:
- `Overview`
- `Entities` (with all entities as children)
- `Contexts` (with all contexts as children, if any)

Pages that are no longer in the export are deleted.
