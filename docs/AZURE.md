# Azure Notes (Blob SAS + CORS)

- Container permissions: Read, Write, List for SAS used by client upload.
- Public access: 'Blob' recommended to stream without SAS in the URL.
- CORS: allow your app origin; methods GET, PUT; headers x-ms-*, Content-Type.
